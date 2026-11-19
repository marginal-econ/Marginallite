// Server-only Lovable AI Gateway client. Gemini stays the primary LLM.
// LOVABLE_API_KEY must never reach the browser.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

import type { AiGatewayMode, ProviderConfig } from "./ai/active.server";
import {
  buildOrderedKeyPool,
  getPrioritizedKeyOrder,
  getActiveEmbeddingProvider,
  getActiveProvider,
  getActiveVisionProvider,
  getChatProviderChain,
  getAiGatewaySettings,
  isGeminiProvider,
  normaliseConfig,
} from "./ai/active.server";
import { getCandidateModels, getEconomyModelForProvider, providerMeta } from "./ai/providers";
import { readEnv } from "../server/env";
import { EMBEDDING_DIMS } from "./examiner/config";

/** The cheap/fast model every call is swapped to in "max savings" mode. Kept
 *  as a literal here (matches MODEL_FAST in examiner/config.ts) rather than
 *  imported, so ai.server.ts's one central gateway function never depends on
 *  a feature-specific config module. */
const ECONOMY_MODEL = "mistral-small-latest";
/** Token ceilings applied by the non-"max" modes — a real lever on cost,
 *  independent of which model ends up handling the call. */
const BALANCED_TOKEN_CAP = 2600;
const ECONOMY_TOKEN_CAP = 1400;

/**
 * Applies the admin's global AI mode to one call's options, BEFORE it
 * reaches either the built-in gateway or a bring-your-own-key provider —
 * this is the single place credit-saving behaviour lives, so every feature
 * (essay grading, Live Examiner, MCQ tagging, diagrams…) gets it for free
 * just by calling chat().
 *   max      — no change, full quality.
 *   balanced — same model, but replies are capped shorter.
 *   economy  — every call forced onto the cheap/fast model, replies capped
 *              hardest. Quality/accuracy trade-off is real and deliberate.
 */
function applyAiGatewayMode(
  options: ChatOptions,
  mode: AiGatewayMode,
  activeProvider?: ProviderConfig | null,
): ChatOptions {
  // Essay grading requires full-fledged examiner feedback; never cap its tokens shorter
  if (options.feature?.startsWith("grade_essay") || options.feature === "examiner_grade") {
    return {
      ...options,
      maxCompletionTokens: Math.max(options.maxCompletionTokens ?? 8192, 8192),
    };
  }
  if (mode === "max") return options;
  if (mode === "balanced") {
    return {
      ...options,
      maxCompletionTokens: options.maxCompletionTokens
        ? Math.min(options.maxCompletionTokens, BALANCED_TOKEN_CAP)
        : BALANCED_TOKEN_CAP,
    };
  }
  const economyModel = activeProvider
    ? getEconomyModelForProvider(activeProvider.provider, activeProvider.model)
    : ECONOMY_MODEL;
  return {
    ...options,
    model: economyModel,
    maxCompletionTokens: options.maxCompletionTokens
      ? Math.min(options.maxCompletionTokens, ECONOMY_TOKEN_CAP)
      : ECONOMY_TOKEN_CAP,
    reasoningEffort: "none",
  };
}

export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiGatewayError";
  }
}

function apiKey(): string {
  const key = readEnv("LOVABLE_API_KEY");
  if (!key) throw new AiGatewayError("AI is not configured on this server.", 500);
  return key;
}

/** Maps gateway failures onto messages that are safe and useful in the UI. */
function explain(status: number, body: string): string {
  const cleanBody = (body || "").trim();
  const lowerBody = cleanBody.toLowerCase();
  if (status === 429) return "The AI is rate limited right now. Please try again in a moment.";
  if (status === 402)
    return "AI credits have run out. An admin can add credits, or plug in their own provider key (Claude, Gemini, Grok, OpenAI…) under Admin → AI providers.";
  if (status === 401)
    return "The configured AI provider rejected the API key (401 Unauthorized). Please verify that the key is valid and active.";
  if (status === 403) {
    let detail = "";
    try {
      const parsed = JSON.parse(cleanBody);
      detail = parsed.detail || parsed.message || parsed.error?.message || "";
    } catch {}
    if (detail) {
      return `Provider access rejected (403 Forbidden): ${detail}. On your provider console, check that your workspace has active billing and permissions.`;
    }
    return `Provider access rejected (403 Forbidden). ${cleanBody ? cleanBody.slice(0, 250) : "Please check your provider console (e.g. console.mistral.ai) to ensure your workspace has active billing/credits enabled."}`;
  }
  if (status === 503 || lowerBody.includes("high demand") || lowerBody.includes("unavailable"))
    return "The AI model is currently experiencing temporary high demand at the provider (503). Spikes in demand are temporary.";
  if (
    status === 524 ||
    status === 504 ||
    status === 502 ||
    lowerBody.includes("524") ||
    lowerBody.includes("timed out") ||
    lowerBody.includes("timeout")
  )
    return "The AI request timed out waiting for the upstream provider (524/504). Fast auto-hopping is retrying on backup keys.";
  if (!cleanBody) return `The AI request failed (${status}). Upstream server returned no error details.`;
  return `The AI request failed (${status}). ${cleanBody.slice(0, 300)}`;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  json?: boolean;
  maxCompletionTokens?: number;
  /** GPT-5 family: must be sent explicitly, and "none" keeps marking fast. */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** Bypass the stored override (used by the admin "test key" action). */
  overrideProvider?: ProviderConfig | null;
  /**
   * When true (budget tiers <= 199: free, foundation, scholar_plus), enables
   * dynamic key rotation across the configured pool and graceful fallback to Flash models.
   * High-tier users (> 199, school, teacher, admin) retain dedicated keys and premium models without degradation.
   */
  isBudgetTier?: boolean;
  /** Optional user identifier for AI monitoring & usage tracking */
  userId?: string | null;
  /** Optional feature name (e.g. 'grade_essay', 'live_examiner', 'coach', 'chat') */
  feature?: string;
};

export type ChatResult = {
  text: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  /** True when a rate-limit or failover caused the request to jump to a backup/extra key */
  keyRotated?: boolean;
  /** True when all keys failed on the primary model and degraded to a fallback model */
  modelSwapped?: boolean;
  /** Specific type of key that successfully resolved the call */
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
};

/**
 * Retries specific to the interactive `chat()` path (full essay grading,
 * the live examiner check, etc). Previously ONLY the embeddings path
 * (`withRetry429` below) retried on 429 — `chat()` threw immediately, so a
 * momentary rate limit surfaced straight to the user as "the AI is rate
 * limited, try again" and, for the live examiner specifically, as a check
 * that silently stopped updating. Fewer, faster retries than embeddings
 * (which run in large offline batches and can afford to wait): this path
 * is interactive, so it backs off quickly and gives up sooner rather than
 * making a keystroke-triggered check hang.
 */
const CHAT_RETRY_OPTS = { maxRetries: 3, baseMs: 400 };

/**
 * Every path that reaches the AI (built-in gateway or a bring-your-own-key
 * provider) funnels through this one function — which is exactly what
 * makes the admin's site-wide pause switch and credit-saving mode work
 * everywhere at once instead of needing to be wired into each feature
 * separately. Order matters: the pause check happens before ANY network
 * call, so a paused admin console genuinely stops outbound AI traffic, not
 * just the UI that surfaces it.
 */
export async function chat(rawOptions: ChatOptions): Promise<ChatResult> {
  const started = Date.now();
  let result: ChatResult | null = null;
  let callError: Error | null = null;

  try {
    const gateway = await getAiGatewaySettings();
    if (!gateway.enabled) {
      throw new AiGatewayError(
        "AI features are temporarily paused by an admin (to save credits). Please try again shortly, or check with your teacher/admin.",
        503,
      );
    }
    let providersToTry: ProviderConfig[] = [];
    if (rawOptions.overrideProvider !== undefined) {
      if (rawOptions.overrideProvider) {
        if (gateway.backupOnly && isGeminiProvider(rawOptions.overrideProvider.provider)) {
          const backup = await getActiveProvider(true);
          if (backup) providersToTry = [backup];
        } else {
          providersToTry = [rawOptions.overrideProvider];
        }
      }
    } else {
      providersToTry = await getChatProviderChain(gateway.backupOnly);
    }

    if (providersToTry.length > 0) {
      let lastErr: any = null;
      for (let pIdx = 0; pIdx < providersToTry.length; pIdx++) {
        const prov = providersToTry[pIdx]!;
        // Groq free-tier payload limit (<8k tokens) cannot accommodate Pass 1 and Pass 2 (~16k context).
        // Route directly to the next capable provider (e.g. Mistral) to eliminate 413 error latency.
        if (
          prov.provider === "groq" &&
          (rawOptions.feature === "grade_essay_pass1_error_audit" || rawOptions.feature === "grade_essay_pass2_holistic") &&
          pIdx + 1 < providersToTry.length
        ) {
          continue;
        }
        const provOptions = applyAiGatewayMode(rawOptions, gateway.mode, prov);
        try {
          const provResult = await chatViaProvider(prov, provOptions);
          result = { ...provResult, latencyMs: Date.now() - started };
          return result;
        } catch (err: any) {
          lastErr = err;
          const isLast = pIdx === providersToTry.length - 1;
          const status = err?.status || 500;
          const errMsg = err?.message || String(err);
          console.warn(
            `[chat] Provider ${prov.provider} encountered error (${status}: ${errMsg.slice(0, 100)}). ${
              !isLast ? `Auto-failing over to backup provider (${providersToTry[pIdx + 1]?.provider})...` : ""
            }`,
          );
          if (isLast) {
            throw err;
          }
          try {
            const { supabaseAdmin } = await import("@/integrations/backend/client.server");
            await supabaseAdmin.from("ai_usage_log").insert({
              user_id: rawOptions.userId ?? null,
              feature: (rawOptions.feature ?? "chat") + "_provider_failover",
              model: prov.model,
              latency_ms: Date.now() - started,
              ok: false,
              error_message: `Provider ${prov.provider} failed (${status}). Auto-failed over to ${providersToTry[pIdx + 1]?.provider}.`,
            });
          } catch {}
        }
      }
      if (lastErr) throw lastErr;
    }

    if (gateway.backupOnly) {
      throw new AiGatewayError(
        "Google Gemini is temporarily switched off (Backup-Only Mode is active), but no backup provider (Groq, OpenRouter, Mistral, xAI, OpenAI, Anthropic, etc.) has an active key configured. Please configure a provider key under Admin → Multi-Provider Hub.",
        503,
      );
    }

    if (!readEnv("LOVABLE_API_KEY")) {
      throw new AiGatewayError(
        "No active AI provider key is configured. Please navigate to Admin → AI Providers, verify your API key(s), and ensure your provider is activated.",
        503,
      );
    }

    const options = applyAiGatewayMode(rawOptions, gateway.mode);
    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
    };
    if (typeof options.temperature === "number") body.temperature = options.temperature;
    if (options.json) body.response_format = { type: "json_object" };
    if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;
    if (options.model.startsWith("openai/gpt-5")) {
      body.reasoning_effort = options.reasoningEffort ?? "none";
      // GPT-5 models reject a non-default temperature on chat completions.
      delete body.temperature;
    }

    const data = await withRetry429(async () => {
      let response = await fetch(`${GATEWAY}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey(),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (
        !response.ok &&
        (response.status === 400 || response.status === 404) &&
        body.model !== ECONOMY_MODEL
      ) {
        const errText = await response.text();
        if (
          errText.toLowerCase().includes("model") ||
          errText.toLowerCase().includes("not found") ||
          errText.toLowerCase().includes("invalid") ||
          errText.toLowerCase().includes("unsupported")
        ) {
          body.model = ECONOMY_MODEL;
          response = await fetch(`${GATEWAY}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey(),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
          });
        } else {
          throw new AiGatewayError(explain(response.status, errText), response.status);
        }
      }

      if (!response.ok) {
        throw new AiGatewayError(explain(response.status, await response.text()), response.status);
      }

      return (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
    }, CHAT_RETRY_OPTS);

    result = {
      text: data.choices?.[0]?.message?.content ?? "",
      model: options.model,
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - started,
    };
    return result;
  } catch (err: any) {
    callError = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const latencyMs = Date.now() - started;
      const model = result?.model || rawOptions.model || "mistral-small-latest";
      void supabaseAdmin
        .from("ai_usage_log")
        .insert({
          user_id: rawOptions.userId ?? null,
          feature: rawOptions.feature ?? "chat",
          model,
          prompt_tokens: result?.promptTokens ?? null,
          completion_tokens: result?.completionTokens ?? null,
          latency_ms: latencyMs,
          ok: !callError,
          error_message: callError ? callError.message : null,
        })
        .then(
          () => {},
          (logErr: unknown) => console.warn("Failed to write ai_usage_log in chat():", logErr),
        );
    } catch (logErr) {
      console.warn("Failed to write ai_usage_log in chat():", logErr);
    }
  }
}

/**
 * In-memory cooldown registry for provider keys in a rotation pool.
 * If a key returns 429 (rate limit) or 503 (model busy), it is temporarily
 * cooled down (default 60s) so subsequent requests immediately use an active key.
 */
export const keyCooldowns = new Map<string, number>();

export function getAvailableKey(keys: string[]): string {
  if (!keys || keys.length === 0) return "";
  const now = Date.now();
  for (const k of keys) {
    const cd = keyCooldowns.get(k) ?? 0;
    if (now >= cd) return k;
  }
  return keys.reduce((earliest, k) => {
    const cd = keyCooldowns.get(k) ?? 0;
    const earliestCd = keyCooldowns.get(earliest) ?? 0;
    return cd < earliestCd ? k : earliest;
  }, keys[0]!);
}

export function markKeyRateLimited(key: string, cooldownMs = 60_000) {
  keyCooldowns.set(key, Date.now() + cooldownMs);
}

export function markKeyHealthy(key: string) {
  keyCooldowns.delete(key);
}

/**
 * Bring-your-own-key path. Anthropic has its own request shape; every other
 * supported provider accepts the OpenAI chat-completions body.
 */
async function chatViaProvider(
  config: ProviderConfig,
  options: ChatOptions,
): Promise<Omit<ChatResult, "latencyMs">> {
  const started = Date.now();
  const isBudget = options.isBudgetTier === true;

  // Strict free-first, paid-last key hopping:
  // All healthy free keys are tried first, rotating every 15s or on rate limits (429/503).
  // Emergency paid key(s) are strictly the last resort if all free keys are exhausted.
  const isLiveExaminer = Boolean(options.feature && options.feature.startsWith("live_examiner"));
  const isLiveExaminerRealtime =
    isLiveExaminer && options.feature !== "live_examiner_maximise";
  const { freeKeys, paidKeys } = buildOrderedKeyPool(config);
  const activeKeysToTry = getPrioritizedKeyOrder(config, keyCooldowns, isLiveExaminer);

  if (config.provider === "anthropic") {
    const candidateModels = getCandidateModels("anthropic", config.model);
    let usedModel = candidateModels[0];
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    let successfulAnthropicKeyIdx = 0;
    const data = await withRetry429(async () => {
      let lastErrStatus = 500;
      let lastErrDetail = "";
      for (const m of candidateModels) {
        usedModel = m;
        for (let kIdx = 0; kIdx < activeKeysToTry.length; kIdx++) {
          const currentKey = activeKeysToTry[kIdx]!;
          const keyStarted = Date.now();
          try {
            const response = await fetch(`${config.baseUrl}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": currentKey,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: m,
                max_tokens: options.maxCompletionTokens ?? 8000,
                ...(system ? { system } : {}),
                ...(typeof options.temperature === "number"
                  ? { temperature: Math.min(options.temperature, 0.45) }
                  : { temperature: 0.25 }),
                messages: options.messages
                  .filter((m) => m.role !== "system")
                  .map((m) => ({ role: m.role, content: m.content })),
              }),
              signal: AbortSignal.timeout(15_000),
            });

            if (response.ok) {
              markKeyHealthy(currentKey);
              successfulAnthropicKeyIdx = kIdx;
              return (await response.json()) as {
                content?: { type: string; text?: string }[];
                usage?: { input_tokens?: number; output_tokens?: number };
              };
            }

            const text = await response.text();
            lastErrStatus = response.status;
            lastErrDetail = text;
            if (
              response.status === 429 ||
              response.status === 500 ||
              response.status === 502 ||
              response.status === 503 ||
              response.status === 504 ||
              response.status === 524
            ) {
              markKeyRateLimited(currentKey, 60_000);
              console.warn(`[chatViaProvider:anthropic] Key ...${currentKey.slice(-4)} returned ${response.status}. Rotating key...`);
              try {
                const { supabaseAdmin } = await import("@/integrations/backend/client.server");
                await supabaseAdmin.from("ai_usage_log").insert({
                  user_id: options.userId ?? null,
                  feature: (options.feature ?? "chat") + "_key_hop",
                  model: m,
                  latency_ms: Date.now() - keyStarted,
                  ok: false,
                  error_message: `Anthropic key ...${currentKey.slice(-4)} returned ${response.status}. Auto-hopped to next key.`,
                });
              } catch {}
              if (kIdx + 1 < activeKeysToTry.length) continue;
              break;
            }

            const isModelUnavailable =
              response.status === 404 ||
              (response.status === 400 &&
                (text.toLowerCase().includes("model") ||
                  text.toLowerCase().includes("not found") ||
                  text.toLowerCase().includes("unsupported") ||
                  text.toLowerCase().includes("does not exist") ||
                  text.toLowerCase().includes("access")));

            if (isModelUnavailable) {
              console.warn(
                `[chatViaProvider:anthropic] Model ${m} returned ${response.status}. Auto-falling back...`,
              );
              break;
            }

            throw new AiGatewayError(explain(response.status, text), response.status);
          } catch (fetchErr: any) {
            const isTimeout =
              fetchErr?.name === "AbortError" ||
              fetchErr?.name === "TimeoutError" ||
              fetchErr?.message?.includes("timed out") ||
              fetchErr?.message?.includes("aborted");
            if (isTimeout) {
              markKeyRateLimited(currentKey, 60_000);
              console.warn(`[chatViaProvider:anthropic] Key ...${currentKey.slice(-4)} timed out (>30s). Rotating key...`);
              if (kIdx + 1 < activeKeysToTry.length) continue;
            }
            throw fetchErr;
          }
        }
      }
      throw new AiGatewayError(explain(lastErrStatus, lastErrDetail), lastErrStatus);
    }, CHAT_RETRY_OPTS);

    const isRotated = successfulAnthropicKeyIdx > 0;
    const activeKeyType: "primary" | "backup_pool" | "vip_fallback" = isRotated
      ? "backup_pool"
      : "primary";

    return {
      text: (data.content ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join(""),
      model: usedModel,
      promptTokens: data.usage?.input_tokens ?? null,
      completionTokens: data.usage?.output_tokens ?? null,
      keyRotated: isRotated,
      modelSwapped: usedModel !== candidateModels[0],
      activeKeyType,
    };
  }

  const isReasoningModel = /^(gpt-5|o1|o3|o4)/i.test(config.model);
  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
  };
  // Balanced default temperature for deep analytical rigor and expressive, complete feedback
  const defaultTemp = 0.35;
  const effectiveTemp =
    typeof options.temperature === "number"
      ? Math.min(options.temperature, 0.5)
      : defaultTemp;

  // Do not send temperature to reasoning models that explicitly reject custom temperatures
  if (!isReasoningModel) {
    body.temperature = effectiveTemp;
  }
  if (options.reasoningEffort) {
    if (config.provider === "openrouter") {
      body.reasoning = { effort: options.reasoningEffort };
    } else if (config.provider === "openai" || isReasoningModel) {
      body.reasoning_effort = options.reasoningEffort;
    }
  }
  if (options.json) body.response_format = { type: "json_object" };

  const isEssayGrade = Boolean(options.feature?.startsWith("grade_essay") || options.feature === "examiner_grade");
  const effectiveMaxTokens =
    options.maxCompletionTokens ?? (isEssayGrade ? 8192 : config.provider === "mistral" ? 4000 : 3000);
  if (config.provider === "openai" || isReasoningModel) {
    body.max_completion_tokens = effectiveMaxTokens;
  } else if (config.provider === "groq") {
    // Groq models have a strict max_tokens ceiling (8192 for Llama 3.1 8B, 32768 for 70B)
    body.max_tokens = Math.min(effectiveMaxTokens, 8192);
  } else if (config.provider === "openrouter") {
    // OpenRouter routes to diverse backends. Sending both max_tokens and max_completion_tokens
    // causes 400 Bad Request on providers like Groq/Anthropic/Mistral via OpenRouter.
    if (isReasoningModel) {
      body.max_completion_tokens = effectiveMaxTokens;
    } else {
      body.max_tokens = effectiveMaxTokens;
    }
  } else {
    // Mistral, DeepSeek, xAI, and custom endpoints expect max_tokens
    body.max_tokens = effectiveMaxTokens;
  }

  const baseCandidateModels = getCandidateModels(config.provider, config.model);
  const candidateModels =
    isLiveExaminerRealtime && config.provider === "mistral"
      ? Array.from(new Set(["mistral-small-latest", ...baseCandidateModels]))
      : baseCandidateModels;

  let usedModel = candidateModels[0];
  let successfulKeyIdx = 0;
  const freeKeyAttempts: { suffix: string; status: number; message: string; latencyMs: number }[] = [];
  const data = await withRetry429(async () => {
    let lastErrStatus = 500;
    let lastErrDetail = "";

    for (const m of candidateModels) {
      usedModel = m;
      const modelBody: Record<string, any> = { ...body, model: m };
      let had429OnFreePool = false;

      for (let kIdx = 0; kIdx < activeKeysToTry.length; kIdx++) {
        const currentKey = activeKeysToTry[kIdx]!;
        const keyStarted = Date.now();
        // Fast 8s timeout for real-time Live Examiner so slow/stalled keys rotate immediately; 300s otherwise
        const timeoutMs = isLiveExaminerRealtime ? 8_000 : isLiveExaminer ? 25_000 : 300_000;
        try {
          const reqHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentKey}`,
          };
          if (config.provider === "openrouter") {
            reqHeaders["HTTP-Referer"] = "https://marginaleconomics.com";
            reqHeaders["X-Title"] = "Marginal Economics";
          }

          const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(modelBody),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (response.ok) {
            markKeyHealthy(currentKey);
            successfulKeyIdx = kIdx;
            return (await response.json()) as {
              choices?: { message?: { content?: string } }[];
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
          }

          const text = await response.text();
          lastErrStatus = response.status;
          lastErrDetail = text;

          // Rate limit or server error: rotate key or try next candidate model
          if (
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504 ||
            response.status === 524
          ) {
            const isPaidKey = paidKeys.includes(currentKey);
            if (!isPaidKey) {
              had429OnFreePool = true;
              freeKeyAttempts.push({
                suffix: currentKey.slice(-4),
                status: response.status,
                message: text.includes("limit: 20")
                  ? "Free Tier 20 RPD per-project quota exceeded"
                  : explain(response.status, text).slice(0, 60),
                latencyMs: Date.now() - keyStarted,
              });
            }
            markKeyRateLimited(currentKey, 45_000);
            console.warn(
              `[chatViaProvider] Model ${m} (key ...${currentKey.slice(-4)}, ${isPaidKey ? "emergency paid fallback" : "free pool key"}) returned ${response.status}. Attempting key rotation / fallback...`,
            );
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              void supabaseAdmin
                .from("ai_usage_log")
                .insert({
                  user_id: options.userId ?? null,
                  feature: (options.feature ?? "chat") + "_key_hop",
                  model: m,
                  latency_ms: Date.now() - keyStarted,
                  ok: false,
                  error_message: `Key ...${currentKey.slice(-4)} (${isPaidKey ? "emergency paid fallback" : "free pool key"}) returned ${response.status}. Auto-hopped to next key.`,
                })
                .then(
                  () => {},
                  () => {},
                );
            } catch {}

            // If we are about to hop from the free pool into the emergency paid key,
            // check if free keys were hit by 429 burst rate limits.
            // Pause 2.5s and retry free keys once before consuming paid credits! (Skipped for real-time Live Examiner)
            const nextKey = activeKeysToTry[kIdx + 1];
            if (
              !isLiveExaminerRealtime &&
              nextKey &&
              !isPaidKey &&
              paidKeys.includes(nextKey) &&
              had429OnFreePool &&
              freeKeys.length > 0
            ) {
              console.warn(
                `[chatViaProvider] Free pool encountered rate limits; pausing 2.5s to retry free keys before resorting to emergency paid key...`,
              );
              await new Promise((resolve) => setTimeout(resolve, 2500));
              for (const fk of freeKeys) {
                try {
                  const retryRes = await fetch(`${config.baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: reqHeaders,
                    body: JSON.stringify(modelBody),
                    signal: AbortSignal.timeout(timeoutMs),
                  });
                  if (retryRes.ok) {
                    markKeyHealthy(fk);
                    successfulKeyIdx = activeKeysToTry.indexOf(fk);
                    if (successfulKeyIdx < 0) successfulKeyIdx = 0;
                    return (await retryRes.json()) as {
                      choices?: { message?: { content?: string } }[];
                      usage?: { prompt_tokens?: number; completion_tokens?: number };
                    };
                  }
                } catch {
                  // Retry didn't succeed, proceed to next option
                }
              }
            }

            if (kIdx + 1 < activeKeysToTry.length) {
              continue; // Try next key on this same model
            }
            break; // All keys exhausted on this model, step to next candidate model
          }

          // Auto-recovery for provider parameter quirks (e.g. temperature, response_format, max_tokens)
          if (response.status === 400) {
            const lowerText = text.toLowerCase();
            let recovered = false;

            if (modelBody.response_format && (lowerText.includes("response_format") || lowerText.includes("json_object") || lowerText.includes("json schema"))) {
              delete modelBody.response_format;
              recovered = true;
            }
            if (modelBody.temperature !== undefined && (lowerText.includes("temperature") || lowerText.includes("sampling parameter"))) {
              delete modelBody.temperature;
              recovered = true;
            }
            if (modelBody.max_completion_tokens !== undefined && (lowerText.includes("max_completion_tokens") || lowerText.includes("unknown parameter"))) {
              modelBody.max_tokens = modelBody.max_completion_tokens;
              delete modelBody.max_completion_tokens;
              recovered = true;
            }
            if (lowerText.includes("system") && lowerText.includes("role") && Array.isArray(modelBody.messages)) {
              // Convert system message into user message prefix
              const sysMsgs = (modelBody.messages as ChatMessage[]).filter((msg) => msg.role === "system");
              const nonSysMsgs = (modelBody.messages as ChatMessage[]).filter((msg) => msg.role !== "system");
              if (sysMsgs.length > 0 && nonSysMsgs.length > 0) {
                const combinedSys = sysMsgs.map((m) => m.content).join("\n\n");
                modelBody.messages = [
                  {
                    role: "user",
                    content: `${combinedSys}\n\n---\n\n${nonSysMsgs[0]?.content || ""}`,
                  },
                  ...nonSysMsgs.slice(1),
                ];
                recovered = true;
              }
            }

            if (recovered) {
              console.warn(`[chatViaProvider] Retrying with sanitized parameters for model ${m}...`);
              const retryRes = await fetch(`${config.baseUrl}/chat/completions`, {
                method: "POST",
                headers: reqHeaders,
                body: JSON.stringify(modelBody),
                signal: AbortSignal.timeout(timeoutMs),
              });
              if (retryRes.ok) {
                markKeyHealthy(currentKey);
                successfulKeyIdx = kIdx;
                return (await retryRes.json()) as {
                  choices?: { message?: { content?: string } }[];
                  usage?: { prompt_tokens?: number; completion_tokens?: number };
                };
              }
            }
          }

          const isModelUnavailable =
            response.status === 404 ||
            (response.status === 400 &&
              (text.toLowerCase().includes("model") ||
                text.toLowerCase().includes("not found") ||
                text.toLowerCase().includes("unsupported") ||
                text.toLowerCase().includes("does not exist") ||
                text.toLowerCase().includes("access")));

          if (isModelUnavailable) {
            console.warn(
              `[chatViaProvider] Provider ${config.provider} Model ${m} returned ${response.status} (unavailable: ${text.slice(0, 100)}). Auto-falling back to next candidate model...`,
            );
            break; // Step to next candidate model immediately
          }

          // Any other client error (e.g. 401 unauthorized, 400 bad request) fails immediately
          throw new AiGatewayError(explain(response.status, text), response.status);
        } catch (fetchErr: any) {
          const isTimeout =
            fetchErr?.name === "AbortError" ||
            fetchErr?.name === "TimeoutError" ||
            fetchErr?.message?.includes("timed out") ||
            fetchErr?.message?.includes("aborted");

          if (isTimeout) {
            markKeyRateLimited(currentKey, 30_000); // 30s temporary backoff on timeout
            const isPaidKey = paidKeys.includes(currentKey);
            if (!isPaidKey) {
              freeKeyAttempts.push({
                suffix: currentKey.slice(-4),
                status: 504,
                message: `Timed out (>${timeoutMs / 1000}s)`,
                latencyMs: timeoutMs,
              });
            }
            lastErrStatus = 504;
            lastErrDetail = `Key ...${currentKey.slice(-4)} (${isPaidKey ? "emergency paid fallback" : "free pool key"}) timed out waiting for upstream provider.`;
            console.warn(
              `[chatViaProvider] Model ${m} (key ...${currentKey.slice(-4)}, ${isPaidKey ? "emergency paid fallback" : "free pool key"}) timed out (>${timeoutMs / 1000}s). Auto-hopping to next key...`,
            );
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              await supabaseAdmin.from("ai_usage_log").insert({
                user_id: options.userId ?? null,
                feature: (options.feature ?? "chat") + "_key_hop",
                model: m,
                latency_ms: timeoutMs,
                ok: false,
                error_message: `Key ...${currentKey.slice(-4)} (${isPaidKey ? "emergency paid fallback" : "free pool key"}) exceeded ${timeoutMs / 1000}s timeout. Auto-hopped to next key.`,
              });
            } catch {}

            if (kIdx + 1 < activeKeysToTry.length) {
              continue; // Try next key
            }
            break;
          }
          throw fetchErr;
        }
      }
    }

    // If all models and keys failed with 429/503/500, throw so withRetry429 can backoff
    throw new AiGatewayError(explain(lastErrStatus, lastErrDetail), lastErrStatus);
  }, { maxRetries: 1, baseMs: 150 });

  const usedKey = activeKeysToTry[successfulKeyIdx] || "";
  const isUsedPaid = paidKeys.includes(usedKey);
  const isRotated = successfulKeyIdx > 0;
  const isModelSwapped = usedModel !== candidateModels[0];
  const activeKeyType: "primary" | "backup_pool" | "vip_fallback" = isUsedPaid
    ? "vip_fallback"
    : isRotated
      ? "backup_pool"
      : "primary";

  // Separate alert system: ping administrator when rotation hops to an emergency paid key
  if (isUsedPaid) {
    try {
      const { triggerPaidKeyAlert } = await import("./alerts.server");
      void triggerPaidKeyAlert({
        keySuffix: usedKey.slice(-4),
        model: usedModel,
        feature: options.feature || "chat",
        userId: options.userId ?? null,
        latencyMs: Date.now() - started,
        freeKeyAttempts,
      });
    } catch (alertErr) {
      console.warn("[ai.server] Failed to dispatch paid key alert:", alertErr);
    }
  }

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: usedModel,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
    keyRotated: isRotated,
    modelSwapped: isModelSwapped,
    activeKeyType,
  };
}

/** Streaming chat used by the AI tutor. Yields text deltas. */
export async function streamChat(options: ChatOptions): Promise<Response> {
  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new AiGatewayError(explain(response.status, await response.text()), response.status);
  }
  return response;
}

const EMBED_BATCH_LIMIT = 100; // Google/OpenRouter embedding endpoints reject larger batches.
const EMBED_MAX_RETRIES = 6;
const EMBED_RETRY_BASE_MS = 1000;

const GOOGLE_EMBED_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_EMBED_MODEL = "models/gemini-embedding-001";

/**
 * Runs `attempt`, retrying with exponential backoff + jitter only on 429s —
 * embedding providers' free/shared tiers throttle per-minute during a big
 * upload, and the interactive chat gateway throttles per-second under
 * concurrent load (e.g. several live examiner checks in flight at once).
 * Any other error (bad key, quota fully exhausted, network failure)
 * surfaces immediately rather than burning retries on something backoff
 * can't fix. `opts` lets a fast, interactive caller (chat) use fewer,
 * shorter retries than a background batch job (embeddings) — see
 * `CHAT_RETRY_OPTS` above.
 */
async function withRetry429<T>(
  attempt: () => Promise<T>,
  opts: { maxRetries: number; baseMs: number } = {
    maxRetries: EMBED_MAX_RETRIES,
    baseMs: EMBED_RETRY_BASE_MS,
  },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= opts.maxRetries; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const status = error instanceof AiGatewayError ? error.status : null;
      if ((status !== 429 && status !== 503) || i === opts.maxRetries) throw error;
      const delay = opts.baseMs * 2 ** i + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Enforces strict vector dimensionality matching EMBEDDING_DIMS (2048).
 * Ensures full bidirectional compatibility between Mistral (native 1024),
 * Gemini (768/3072/2048), OpenAI, and Supabase pgvector column vector(2048).
 */
export function normalizeVectorTo2048(vec?: number[] | null): number[] {
  if (!Array.isArray(vec)) return new Array(EMBEDDING_DIMS).fill(0);
  if (vec.length === EMBEDDING_DIMS) return vec;
  if (vec.length < EMBEDDING_DIMS) {
    return [...vec, ...new Array(EMBEDDING_DIMS - vec.length).fill(0)];
  }
  return vec.slice(0, EMBEDDING_DIMS);
}

/** Direct call to Google's embeddings API with automatic key hopping across configured keys. */
async function embedViaGoogle(
  inputs: string[],
  config: ProviderConfig,
  outputDimensionality: number,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const googleModel = config.model.startsWith("models/") ? config.model : GOOGLE_EMBED_MODEL;
  const { paidKeys } = buildOrderedKeyPool(config);
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns, false);

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    const data = await withRetry429(async () => {
      let lastErrStatus = 500;
      let lastErrDetail = "";

      for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
        const currentKey = keysToTry[kIdx]!;
        const isPaid = paidKeys.includes(currentKey);
        let response: Response;
        try {
          response = await fetch(`${GOOGLE_EMBED_ENDPOINT}/${googleModel}:batchEmbedContents`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": currentKey },
            body: JSON.stringify({
              requests: batch.map((text) => ({
                model: googleModel,
                content: { parts: [{ text }] },
                outputDimensionality,
              })),
            }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch (fetchErr: any) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[embedViaGoogle] Key ...${currentKey.slice(-4)} (${isPaid ? "emergency paid fallback" : "free pool key"}) timed out (>10s). Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
          throw fetchErr;
        }

        if (response.ok) {
          markKeyHealthy(currentKey);
          return (await response.json()) as { embeddings?: { values: number[] }[] };
        }

        const detail = await response.text().catch(() => "");
        lastErrStatus = response.status;
        lastErrDetail = detail;

        // If rate limit or server error, mark cooldown and hop to next key
        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[embedViaGoogle] Key ...${currentKey.slice(-4)} (${isPaid ? "emergency paid fallback" : "free pool key"}) returned ${response.status}. Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
        }

        // If Google Generative Language REST endpoint returns location error (e.g. from Cloudflare worker edge IPs),
        // try Google's OpenAI-compatible endpoint /v1beta/openai/embeddings as an alternative
        if (
          detail.includes("User location is not supported") ||
          detail.includes("FAILED_PRECONDITION") ||
          response.status === 400
        ) {
          try {
            const cleanModel = googleModel.replace(/^models\//, "");
            const altRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${currentKey}`,
              },
              body: JSON.stringify({
                model: cleanModel,
                input: batch,
                dimensions: outputDimensionality,
              }),
              signal: AbortSignal.timeout(10_000),
            });
            if (altRes.ok) {
              markKeyHealthy(currentKey);
              const altJson = (await altRes.json()) as {
                data?: { index: number; embedding: number[] }[];
              };
              if (altJson.data && altJson.data.length > 0) {
                return { embeddings: altJson.data.map((d) => ({ values: d.embedding })) };
              }
            } else if (altRes.status === 429 || altRes.status === 503) {
              markKeyRateLimited(currentKey, 60_000);
              console.warn(
                `[embedViaGoogle alt] Key ...${currentKey.slice(-4)} returned ${altRes.status}. Hopping to next key...`,
              );
              if (kIdx + 1 < keysToTry.length) continue;
            }
          } catch (altErr) {
            console.warn("Google embeddings OpenAI-compatible endpoint fallback failed:", altErr);
          }
        }

        if (response.status !== 429 && response.status !== 503) {
          throw new AiGatewayError(
            `Google embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
            response.status,
          );
        }
      }

      throw new AiGatewayError(
        `Google embeddings returned ${lastErrStatus}. ${lastErrDetail.slice(0, 300)}`,
        lastErrStatus,
      );
    });

    (data.embeddings ?? []).forEach((item, i) => {
      vectors[offset + i] = normalizeVectorTo2048(item.values);
    });
  }

  return vectors;
}

/**
 * Direct call to any OpenAI-compatible /embeddings endpoint — covers
 * OpenAI, OpenRouter, Mistral, DeepSeek, and custom self-hosted endpoints
 * with automatic key hopping across configured keys.
 */
async function embedViaOpenAiCompatible(
  inputs: string[],
  config: ProviderConfig,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const candidateKeys =
    config.apiKeys && config.apiKeys.length > 0 ? config.apiKeys : [config.apiKey];

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
    // Mistral has a strict 8192-token ceiling (~24k chars); ensure batches never exceed model input bounds
    const safeBatch =
      config.provider === "mistral"
        ? batch.map((t) => (t && t.length > 24000 ? t.slice(0, 24000) : t || ""))
        : batch;
    const data = await withRetry429(async () => {
      const supportsDimensionsParam =
        config.provider === "openai" || config.provider === "openrouter";
      const bestKey = getAvailableKey(candidateKeys);
      const keysToTry =
        candidateKeys.length > 1
          ? [bestKey, ...candidateKeys.filter((k) => k !== bestKey)]
          : candidateKeys;

      let lastErrStatus = 500;
      let lastErrDetail = "";

      for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
        const currentKey = keysToTry[kIdx]!;
        const response = await fetch(`${config.baseUrl}/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            input: safeBatch,
            ...(supportsDimensionsParam ? { dimensions: EMBEDDING_DIMS } : {}),
          }),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          return (await response.json()) as { data?: { index?: number; embedding: number[] }[] };
        }

        const detail = await response.text().catch(() => "");
        lastErrStatus = response.status;
        lastErrDetail = detail;

        if (response.status === 429 || response.status === 503) {
          markKeyRateLimited(currentKey, 60_000);
          console.warn(
            `[embedViaOpenAiCompatible] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
        }

        throw new AiGatewayError(
          `${config.label || config.provider} embeddings returned ${response.status}. ${detail.slice(0, 300)}`,
          response.status,
        );
      }

      throw new AiGatewayError(
        `${config.label || config.provider} embeddings returned ${lastErrStatus}. ${lastErrDetail.slice(0, 300)}`,
        lastErrStatus,
      );
    });

    const items = data.data ?? [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const itemIdx = typeof item.index === "number" ? item.index : i;
      vectors[offset + itemIdx] = normalizeVectorTo2048(item.embedding);
    }
  }

  return vectors;
}

async function embedViaConfig(inputs: string[], config: ProviderConfig): Promise<number[][]> {
  if (config.provider === "google") {
    return embedViaGoogle(inputs, config, EMBEDDING_DIMS);
  }
  return embedViaOpenAiCompatible(inputs, config);
}

/**
 * Embed a list of texts. Splits into provider-safe batches and reassembles
 * by index so every input gets a vector — nothing is silently dropped.
 *
 * Resolution order:
 * 1. `overrideProvider`, if passed explicitly — this is what lets a single
 *    ingestion/grading call pick a specific saved embedding key rather than
 *    always using whichever one is flagged active (Admin → Embeddings).
 * 2. The admin-flagged active embedding-purpose provider.
 * 3. The Lovable gateway, only if a LOVABLE_API_KEY is actually present.
 *
 * Note switching providers is a same-size, not same-space, change — a chunk
 * embedded via Google and one via OpenRouter aren't in the same embedding
 * space, so a mixed-provider knowledge base should be re-embedded under one
 * provider before it's trusted for retrieval.
 */
export async function embed(
  inputs: string[],
  model: string,
  overrideProvider?: ProviderConfig | null,
): Promise<number[][]> {
  const started = Date.now();
  let callError: Error | null = null;
  let resVectors: number[][] = [];
  let resolvedModel = model;

  try {
    let config =
      overrideProvider !== undefined ? overrideProvider : await getActiveEmbeddingProvider();
    if (config?.model) resolvedModel = config.model;

    if (!config) {
      const activeChat = await getActiveProvider();
      if (activeChat && (activeChat.provider === "google" || activeChat.provider === "gemini")) {
        config = {
          ...activeChat,
          model: GOOGLE_EMBED_MODEL,
        };
      }
    }

    // Safety fallback: fetch any active Google key directly from database
    if (!config) {
      try {
        const { supabaseAdmin } = await import("@/integrations/backend/client.server");
        const { data: directKey } = await supabaseAdmin
          .from("ai_provider_keys")
          .select("provider, api_key, base_url, model, label")
          .or("purpose.eq.embedding,provider.eq.google")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (directKey && directKey.length > 0 && directKey[0]!.api_key) {
          config = {
            provider: directKey[0]!.provider,
            apiKey: directKey[0]!.api_key,
            model: directKey[0]!.model?.includes("embedding") ? String(directKey[0]!.model) : GOOGLE_EMBED_MODEL,
            baseUrl: directKey[0]!.base_url ?? undefined,
            label: directKey[0]!.label ?? undefined,
          };
        }
      } catch {}
    }

    if (config) {
      try {
        const rawVectors = await embedViaConfig(inputs, config);
        resVectors = rawVectors.map((v) => normalizeVectorTo2048(v));
        return resVectors;
      } catch (configErr: any) {
        // If Google embeddings fail due to regional/location restriction ("User location is not supported"),
        // try to automatically fallback to an alternate configured embedding provider (e.g. Mistral, OpenAI, OpenRouter)
        const errMsg = configErr?.message || String(configErr);
        if (config.provider === "google" && (errMsg.includes("User location") || errMsg.includes("FAILED_PRECONDITION") || configErr?.status === 400)) {
          try {
            const { supabaseAdmin } = await import("@/integrations/backend/client.server");
            const { data: altKeys } = await supabaseAdmin
              .from("ai_provider_keys")
              .select("provider, api_key, base_url, model, label")
              .neq("provider", "google")
              .eq("purpose", "embedding")
              .order("is_active", { ascending: false })
              .order("updated_at", { ascending: false })
              .limit(1);

            if (altKeys && altKeys.length > 0 && altKeys[0]!.api_key) {
              const altConfig: ProviderConfig = {
                provider: altKeys[0]!.provider,
                apiKey: altKeys[0]!.api_key,
                model: String(altKeys[0]!.model || "mistral-embed-2312"),
                baseUrl: altKeys[0]!.base_url ?? undefined,
                label: altKeys[0]!.label ?? undefined,
              };
              console.warn(
                `[embed] Google embedding failed due to regional restrictions. Falling back to configured ${altConfig.provider} (${altConfig.model})...`,
              );
              const altRaw = await embedViaConfig(inputs, altConfig);
              resVectors = altRaw.map((v) => normalizeVectorTo2048(v));
              return resVectors;
            }
          } catch (fallbackErr) {
            console.warn("[embed] Alternate embedding provider fallback failed:", fallbackErr);
          }
        }
        throw configErr;
      }
    }

    if (!readEnv("LOVABLE_API_KEY")) {
      throw new AiGatewayError(
        "No embedding provider is configured. Add one under Admin → Embeddings and mark it active.",
        500,
      );
    }

    const vectors: number[][] = new Array(inputs.length);

    for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
      const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
      const response = await fetch(`${GATEWAY}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey(),
        },
        body: JSON.stringify({ model, input: batch }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new AiGatewayError(explain(response.status, await response.text()), response.status);
      }

      const data = (await response.json()) as {
        data?: { index?: number; embedding: number[] }[];
      };
      const items = data.data ?? [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const itemIdx = typeof item.index === "number" ? item.index : i;
        vectors[offset + itemIdx] = normalizeVectorTo2048(item.embedding);
      }
    }

    resVectors = vectors.map((v) => normalizeVectorTo2048(v));
    return resVectors;
  } catch (err: any) {
    callError = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      await supabaseAdmin.from("ai_usage_log").insert({
        feature: "embedding",
        model: resolvedModel || "mistral-embed-2312",
        latency_ms: Date.now() - started,
        ok: !callError,
        error_message: callError ? callError.message : null,
      });
    } catch {}
  }
}

export async function embedOne(
  input: string,
  model: string,
  overrideProvider?: ProviderConfig | null,
): Promise<number[]> {
  const [vector] = await embed([input], model, overrideProvider);
  if (!vector || !Array.isArray(vector)) throw new AiGatewayError("The AI returned no embedding.", 500);
  return normalizeVectorTo2048(vector);
}

function splitImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AiGatewayError("A page image was not a valid base64 image.", 400);
  return { mimeType: match[1]!, data: match[2]! };
}

/** Anthropic's image-block shape differs from the OpenAI image_url shape. Supports automatic key hopping across configured keys. */
async function visionChatViaAnthropic(
  config: ProviderConfig,
  options: {
    model: string;
    systemPrompt: string;
    prompt: string;
    imageDataUrls: string[];
    maxCompletionTokens?: number;
  },
): Promise<Omit<ChatResult, "latencyMs">> {
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns, false);

  let lastStatus = 500;
  let lastText = "";

  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx]!;
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": currentKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: options.maxCompletionTokens ?? 8000,
        system: options.systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: options.prompt },
              ...options.imageDataUrls.map((url) => {
                const { mimeType, data } = splitImageDataUrl(url);
                return {
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: mimeType, data },
                };
              }),
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      markKeyHealthy(currentKey);
      const data = (await response.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        text: (data.content ?? [])
          .filter((part) => part.type === "text")
          .map((part) => part.text ?? "")
          .join(""),
        model: config.model,
        promptTokens: data.usage?.input_tokens ?? null,
        completionTokens: data.usage?.output_tokens ?? null,
      };
    }

    const text = await response.text();
    lastStatus = response.status;
    lastText = text;

    if (response.status === 429 || response.status === 503) {
      markKeyRateLimited(currentKey, 60_000);
      console.warn(
        `[visionChatViaAnthropic] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
      );
      if (kIdx + 1 < keysToTry.length) continue;
    }

    throw new AiGatewayError(explain(response.status, text), response.status);
  }

  throw new AiGatewayError(explain(lastStatus, lastText), lastStatus);
}

/** Every non-Anthropic provider in AI_PROVIDERS speaks the OpenAI image_url shape. Supports automatic key hopping across configured keys. */
async function visionChatViaOpenAiCompatible(
  config: ProviderConfig,
  options: {
    model: string;
    systemPrompt: string;
    prompt: string;
    imageDataUrls: string[];
    maxCompletionTokens?: number;
  },
): Promise<Omit<ChatResult, "latencyMs">> {
  const { paidKeys } = buildOrderedKeyPool(config);
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns, false);

  const meta = providerMeta(config.provider);
  let effectiveVisionModel = config.model;
  if (config.provider === "google") {
    effectiveVisionModel = "gemini-3.8-flash";
  } else if (meta && meta.visionModels && meta.visionModels.length > 0) {
    if (!(meta.visionModels as readonly string[]).includes(config.model)) {
      effectiveVisionModel = meta.visionModels[0]!;
    }
  }

  const body: Record<string, unknown> = {
    model: effectiveVisionModel,
    messages: [
      { role: "system", content: options.systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          ...options.imageDataUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url, detail: "high" as const },
          })),
        ],
      },
    ],
  };
  if (options.maxCompletionTokens) {
    if (config.provider === "openai" || /^(gpt-5|o1|o3|o4)/i.test(effectiveVisionModel)) {
      body.max_completion_tokens = options.maxCompletionTokens;
    } else {
      body.max_tokens = options.maxCompletionTokens;
    }
  }

  let lastStatus = 500;
  let lastText = "";

  for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
    const currentKey = keysToTry[kIdx]!;
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });

      if (response.ok) {
        markKeyHealthy(currentKey);
        const isPaid = paidKeys.includes(currentKey);
        if (isPaid) {
          try {
            const { triggerPaidKeyAlert } = await import("./alerts.server");
            void triggerPaidKeyAlert({
              keySuffix: currentKey.slice(-4),
              model: config.model,
              feature: "vision_chat",
            });
          } catch {}
        }
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        return {
          text: data.choices?.[0]?.message?.content ?? "",
          model: config.model,
          promptTokens: data.usage?.prompt_tokens ?? null,
          completionTokens: data.usage?.completion_tokens ?? null,
        };
      }

      const text = await response.text();
      lastStatus = response.status;
      lastText = text;

      if (response.status === 429 || response.status === 503 || response.status === 500) {
        markKeyRateLimited(currentKey, 60_000);
        console.warn(
          `[visionChatViaOpenAiCompatible] Key ...${currentKey.slice(-4)} returned ${response.status}. Hopping to next key...`,
        );
        if (kIdx + 1 < keysToTry.length) continue;
      }

      throw new AiGatewayError(explain(response.status, text), response.status);
    } catch (fetchErr: any) {
      const isTimeout =
        fetchErr?.name === "AbortError" ||
        fetchErr?.name === "TimeoutError" ||
        fetchErr?.message?.includes("timed out") ||
        fetchErr?.message?.includes("aborted");

      if (isTimeout) {
        markKeyRateLimited(currentKey, 60_000);
        console.warn(
          `[visionChatViaOpenAiCompatible] Key ...${currentKey.slice(-4)} timed out (>30s). Hopping to next key...`,
        );
        if (kIdx + 1 < keysToTry.length) continue;
      }
      throw fetchErr;
    }
  }

  throw new AiGatewayError(explain(lastStatus, lastText), lastStatus);
}

async function prepareVisionImageData(input: string): Promise<{ mimeType: string; data: string }> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const res = await fetch(input, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const buf = Buffer.from(await res.arrayBuffer());
        return { mimeType: contentType, data: buf.toString("base64") };
      }
    } catch (e) {
      console.warn("Could not fetch remote vision image URL:", e);
    }
  }

  const trimmed = input.trim();
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/s.exec(trimmed);
  if (match) {
    return { mimeType: match[1]!, data: match[2]!.replace(/\s+/g, "") };
  }
  throw new Error("Vision input was not a valid data URL or accessible image URL.");
}

async function visionChatViaGoogle(
  keysToTry: string[],
  options: {
    model: string;
    systemPrompt: string;
    prompt: string;
    imageDataUrls: string[];
    maxCompletionTokens?: number;
  },
): Promise<Omit<ChatResult, "latencyMs">> {
  const imageParts = await Promise.all(options.imageDataUrls.map(prepareVisionImageData));
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [
    ...imageParts.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    { text: options.prompt },
  ];

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      mediaResolution: "MEDIA_RESOLUTION_HIGH",
      maxOutputTokens: options.maxCompletionTokens ?? 4096,
    },
  };
  if (options.systemPrompt) {
    body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
  }

  const modelsToTry = [
    "models/gemini-3.8-flash",
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
  ];
  let lastErr: unknown = null;

  for (const model of modelsToTry) {
    for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
      const currentKey = keysToTry[kIdx]!;
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(currentKey)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(45_000),
          },
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          lastErr = new Error(`Google Gemini Vision returned ${response.status}: ${detail.slice(0, 300)}`);
          if (response.status === 429 || response.status === 503) {
            markKeyRateLimited(currentKey, 60_000);
            if (kIdx + 1 < keysToTry.length) continue;
          }
          if (response.status === 404) {
            break;
          }
          continue;
        }

        markKeyHealthy(currentKey);
        const payload = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        };

        const text = (payload.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();

        return {
          text,
          model: "google/gemini-3.8-flash",
          promptTokens: payload.usageMetadata?.promptTokenCount ?? null,
          completionTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
        };
      } catch (fetchErr: any) {
        lastErr = fetchErr;
        const isTimeout =
          fetchErr?.name === "AbortError" ||
          fetchErr?.name === "TimeoutError" ||
          fetchErr?.message?.includes("timed out") ||
          fetchErr?.message?.includes("aborted");
        if (isTimeout) {
          markKeyRateLimited(currentKey, 60_000);
          if (kIdx + 1 < keysToTry.length) continue;
        }
      }
    }
  }

  throw lastErr || new Error("Google Gemini Vision failed to process the image.");
}

/**
 * Multimodal read of one or more page images (scans/photos of handwriting,
 * or photographed/scanned past-paper pages for MCQ/essay bank extraction).
 * Vision is strictly routed through Google Gemini.
 */
export async function visionChat(options: {
  model: string;
  systemPrompt: string;
  prompt: string;
  imageDataUrls: string[];
  maxCompletionTokens?: number;
  /** Bypass the stored override, same convention as chat(). */
  overrideProvider?: ProviderConfig | null;
  userId?: string | null;
  feature?: string;
}): Promise<ChatResult> {
  const started = Date.now();
  let result: ChatResult | null = null;
  let callError: Error | null = null;

  try {
    // Collect all available Google Gemini vision keys
    const googleKeys: string[] = [];

    // 1. Explicit override if Google provider
    if (options.overrideProvider && isGeminiProvider(options.overrideProvider.provider)) {
      const { allOrderedKeys } = buildOrderedKeyPool(options.overrideProvider);
      googleKeys.push(...allOrderedKeys);
    }

    // 2. Active Vision Provider
    try {
      const visionProv = await getActiveVisionProvider();
      if (visionProv && isGeminiProvider(visionProv.provider)) {
        const { allOrderedKeys } = buildOrderedKeyPool(visionProv);
        googleKeys.push(...allOrderedKeys);
      }
    } catch {
      // Continue
    }

    // 3. Database: look for any saved Google keys
    try {
      const { supabaseAdmin } = await import("../integrations/backend/client.server");
      const { data: dbKeys } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("api_key, purpose, is_active")
        .eq("provider", "google");
      if (dbKeys && dbKeys.length > 0) {
        const sorted = [...dbKeys].sort((a, b) => {
          if (a.purpose === "vision" && b.purpose !== "vision") return -1;
          if (b.purpose === "vision" && a.purpose !== "vision") return 1;
          if (a.is_active && !b.is_active) return -1;
          if (b.is_active && !a.is_active) return 1;
          return 0;
        });
        for (const row of sorted) {
          const cfg = normaliseConfig({
            provider: "google",
            api_key: row.api_key,
            base_url: null,
            model: "gemini-3.8-flash",
            label: "Google",
          });
          const { allOrderedKeys } = buildOrderedKeyPool(cfg);
          googleKeys.push(...allOrderedKeys);
        }
      }
    } catch {
      // Continue
    }

    // 4. Environment variables
    const envKey = readEnv("GOOGLE_AI_API_KEY") || readEnv("GEMINI_API_KEY") || readEnv("GOOGLE_API_KEY");
    if (envKey) googleKeys.push(envKey.trim());

    const uniqueGoogleKeys = Array.from(new Set(googleKeys.filter((k) => k && k.length > 5)));
    if (uniqueGoogleKeys.length > 0) {
      const provResult = await visionChatViaGoogle(uniqueGoogleKeys, options);
      result = { ...provResult, latencyMs: Date.now() - started };
      return result;
    }

    throw new AiGatewayError(
      "No Google Gemini API key is configured for vision/handwriting. Add a Google Gemini key under Admin → AI Providers with purpose 'Vision' and mark it active.",
      500,
    );
  } catch (err: any) {
    callError = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    try {
      const { supabaseAdmin } = await import("../integrations/backend/client.server");
      const latencyMs = Date.now() - started;
      const model = result?.model || options.model || "google/gemini-3.8-flash";
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: options.userId ?? null,
        feature: options.feature ?? "vision_chat",
        model,
        prompt_tokens: result?.promptTokens ?? null,
        completionTokens: result?.completionTokens ?? null,
        latency_ms: latencyMs,
        ok: !callError,
        error_message: callError ? callError.message : null,
      });
    } catch (logErr) {
      console.warn("Failed to write ai_usage_log in visionChat():", logErr);
    }
  }
}
