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
  getAiGatewaySettings,
} from "./ai/active.server";
import { readEnv } from "../server/env";
import { EMBEDDING_DIMS } from "./examiner/config";

/** The cheap/fast model every call is swapped to in "max savings" mode. Kept
 *  as a literal here (matches MODEL_FAST in examiner/config.ts) rather than
 *  imported, so ai.server.ts's one central gateway function never depends on
 *  a feature-specific config module. */
const ECONOMY_MODEL = "google/gemini-3.8-flash";
/** Token ceilings applied by the non-"max" modes — a real lever on cost,
 *  independent of which model ends up handling the call. */
const BALANCED_TOKEN_CAP = 2000;
const ECONOMY_TOKEN_CAP = 1100;

/**
 * Applies the admin's global AI mode to one call's options, BEFORE it
 * reaches either the built-in gateway or a bring-your-own-key provider —
 * this is the single place credit-saving behaviour lives, so every feature
 * (essay grading, MCQ tagging, diagrams…) gets it for free
 * just by calling chat().
 *   max      — no change, full quality.
 *   balanced — same model, but replies are capped shorter.
 *   economy  — every call forced onto the cheap/fast model, replies capped
 *              hardest. Quality/accuracy trade-off is real and deliberate.
 */
function applyAiGatewayMode(options: ChatOptions, mode: AiGatewayMode): ChatOptions {
  if (mode === "max") return options;
  if (mode === "balanced") {
    return {
      ...options,
      maxCompletionTokens: options.maxCompletionTokens
        ? Math.min(options.maxCompletionTokens, BALANCED_TOKEN_CAP)
        : BALANCED_TOKEN_CAP,
    };
  }
  return {
    ...options,
    model: ECONOMY_MODEL,
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
  let providerMsg = "";
  try {
    const parsed = JSON.parse(body);
    if (parsed.message) {
      providerMsg = String(parsed.message);
    } else if (parsed.error?.message) {
      providerMsg = String(parsed.error.message);
    } else if (typeof parsed.error === "string") {
      providerMsg = parsed.error;
    }
  } catch {}

  if (status === 429) return providerMsg || "The AI is rate limited right now. Please try again in a moment.";
  if (status === 402)
    return (
      providerMsg ||
      "AI credits have run out. An admin can add credits, or plug in their own provider key (Mistral, Claude, Gemini, Grok, OpenAI…) under Admin → AI providers."
    );
  if (status === 401)
    return providerMsg || "The configured AI provider rejected the API key. An admin can update it under Admin → AI providers.";
  if (status === 403) {
    if (providerMsg) return `AI provider forbidden (403): ${providerMsg}`;
    if (body.toLowerCase().includes("workspace")) return "AI access is disabled for this workspace.";
    return `AI provider access forbidden (403). ${body.slice(0, 200)}`;
  }
  if (status === 504) return providerMsg || "The AI request timed out. Please try again in a moment.";
  if (status === 500 || status === 502 || status === 503) {
    return providerMsg || `The AI provider returned a server error (${status}). Please try again in a moment.`;
  }
  return providerMsg
    ? `AI provider error (${status}): ${providerMsg}`
    : body && body.trim()
      ? `The AI request failed (${status}). ${body.slice(0, 300)}`
      : `The AI request failed (${status}). Please try again.`;
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
  /** Optional feature name (e.g. 'grade_essay', 'coach', 'chat') */
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
 * tutor dialogue, etc). Previously ONLY the embeddings path
 * (`withRetry429` below) retried on 429 — `chat()` threw immediately, so a
 * momentary rate limit surfaced straight to the user as "the AI is rate
 * limited, try again". Fewer, faster retries than embeddings
 * (which run in large offline batches and can afford to wait): this path
 * is interactive, so it backs off quickly and gives up sooner.
 */
const CHAT_RETRY_OPTS = { maxRetries: 3, baseMs: 1200 };

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
    const options = applyAiGatewayMode(rawOptions, gateway.mode);

    const override =
      options.overrideProvider !== undefined ? options.overrideProvider : await getActiveProvider();

    if (override) {
      // chatViaProvider retries its own fetch internally (see below) — don't
      // wrap it again here, or a real rate limit waits through two nested
      // backoff sequences instead of one.
      const provResult = await chatViaProvider(override, options);
      result = { ...provResult, latencyMs: Date.now() - started };
      return result;
    }

    if (!readEnv("LOVABLE_API_KEY")) {
      throw new AiGatewayError(
        "No active AI provider is configured. Please configure and activate an AI provider key (e.g. Mistral or Google) under Admin → AI providers.",
        500,
      );
    }

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
      const model = result?.model || rawOptions.model || "google/gemini-3.8-flash";
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: rawOptions.userId ?? null,
        feature: rawOptions.feature ?? "chat",
        model,
        prompt_tokens: result?.promptTokens ?? null,
        completion_tokens: result?.completionTokens ?? null,
        latency_ms: latencyMs,
        ok: !callError,
        error_message: callError ? callError.message : null,
      });
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
  const isBudget = options.isBudgetTier === true;

  // Strict free-first, paid-last key hopping:
  // All healthy free keys are tried first, rotating every 15s or on rate limits (429/503).
  // Emergency paid key(s) are strictly the last resort if all free keys are exhausted.
  const { paidKeys } = buildOrderedKeyPool(config);
  const activeKeysToTry = getPrioritizedKeyOrder(config, keyCooldowns);

  if (config.provider === "anthropic") {
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    let successfulAnthropicKeyIdx = 0;
    const data = await withRetry429(async () => {
      let lastErrStatus = 500;
      let lastErrDetail = "";
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
              model: config.model,
              max_tokens: options.maxCompletionTokens ?? 8000,
              ...(system ? { system } : {}),
              ...(typeof options.temperature === "number" ? { temperature: options.temperature } : {}),
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
          if (response.status === 429 || response.status === 503 || response.status === 500) {
            markKeyRateLimited(currentKey, 60_000);
            console.warn(`[chatViaProvider:anthropic] Key ...${currentKey.slice(-4)} returned ${response.status}. Rotating key...`);
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              await supabaseAdmin.from("ai_usage_log").insert({
                user_id: options.userId ?? null,
                feature: (options.feature ?? "chat") + "_key_hop",
                model: config.model,
                latency_ms: Date.now() - keyStarted,
                ok: false,
                error_message: `Anthropic key ...${currentKey.slice(-4)} returned ${response.status}. Auto-hopped to next key.`,
              });
            } catch {}
            if (kIdx + 1 < activeKeysToTry.length) continue;
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
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              await supabaseAdmin.from("ai_usage_log").insert({
                user_id: options.userId ?? null,
                feature: (options.feature ?? "chat") + "_key_hop",
                model: config.model,
                latency_ms: 30_000,
                ok: false,
                error_message: `Anthropic key ...${currentKey.slice(-4)} exceeded 30s timeout. Auto-hopped to next key.`,
              });
            } catch {}
            if (kIdx + 1 < activeKeysToTry.length) continue;
          }
          throw fetchErr;
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
      model: config.model,
      promptTokens: data.usage?.input_tokens ?? null,
      completionTokens: data.usage?.output_tokens ?? null,
      keyRotated: isRotated,
      modelSwapped: false,
      activeKeyType,
    };
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
  };
  if (typeof options.temperature === "number" && !/^gpt-5/.test(config.model)) {
    body.temperature = options.temperature;
  }
  if (config.provider === "openrouter") {
    body.reasoning = { effort: "low" };
  }
  if (options.json) body.response_format = { type: "json_object" };
  if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

  function resolveGoogleModel(rawModel: string): string {
    return rawModel.replace(/^(google\/|models\/)/, "");
  }

  const candidateModels =
    config.provider === "mistral"
      ? Array.from(
          new Set(
            [
              config.model || "ministral-14b-2512",
              "ministral-14b-2512",
              "ministral-14b-latest",
              "open-mistral-nemo",
              "ministral-8b-latest",
              "ministral-3b-latest",
              "mistral-small-latest",
              "mistral-large-latest",
              "mistral-medium-latest",
            ].filter(Boolean),
          ),
        )
      : config.provider === "google"
        ? Array.from(
            new Set(
              [
                resolveGoogleModel(config.model),
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-3.8-flash",
              ].filter(Boolean),
            ),
          )
        : [config.model];

  let usedModel = candidateModels[0];
  let successfulKeyIdx = 0;
  const data = await withRetry429(async () => {
    let lastErrStatus = 500;
    let lastErrDetail = "";

    for (const m of candidateModels) {
      usedModel = m;
      const modelBody = { ...body, model: m };

      for (let kIdx = 0; kIdx < activeKeysToTry.length; kIdx++) {
        const currentKey = activeKeysToTry[kIdx]!;
        const keyStarted = Date.now();
        try {
          const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentKey}`,
            },
            body: JSON.stringify(modelBody),
            signal: AbortSignal.timeout(90_000), // 90-second timeout for full essay generation/marking
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

          // Rate limit, server error, or 404 deprecated model on Google: rotate key or try next candidate model
          if (response.status === 429 || response.status === 503 || response.status === 500) {
            const cooldownTime = activeKeysToTry.length > 1 ? 60_000 : 2_000;
            markKeyRateLimited(currentKey, cooldownTime);
            const isPaidKey = paidKeys.includes(currentKey);
            console.warn(
              `[chatViaProvider] Model ${m} (key ...${currentKey.slice(-4)}, ${isPaidKey ? "emergency paid fallback" : "free pool key"}) returned ${response.status}. Attempting key rotation / fallback...`,
            );
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              await supabaseAdmin.from("ai_usage_log").insert({
                user_id: options.userId ?? null,
                feature: (options.feature ?? "chat") + "_key_hop",
                model: m,
                latency_ms: Date.now() - keyStarted,
                ok: false,
                error_message: `Key ...${currentKey.slice(-4)} (${isPaidKey ? "emergency paid fallback" : "free pool key"}) returned ${response.status}. Auto-hopped to next key.`,
              });
            } catch {}

            if (kIdx + 1 < activeKeysToTry.length) {
              continue; // Try next key on this same model
            }
            if (activeKeysToTry.length <= 1 && response.status === 429) {
              // Wait briefly before trying next model on single free key to avoid immediate rate limit cascade
              await new Promise((r) => setTimeout(r, 1500));
            }
            break; // All keys exhausted on this model, step to next candidate model
          }

          const isModelUnavailable =
            response.status === 404 ||
            (response.status === 403 &&
              (text.toLowerCase().includes("tier") ||
                text.toLowerCase().includes("subscription") ||
                text.toLowerCase().includes("model") ||
                text.toLowerCase().includes("not allowed"))) ||
            (response.status === 400 &&
              (text.toLowerCase().includes("model") ||
                text.toLowerCase().includes("not found") ||
                text.toLowerCase().includes("unsupported") ||
                text.toLowerCase().includes("invalid")));

          if (isModelUnavailable) {
            lastErrStatus = response.status;
            lastErrDetail = text;
            console.warn(
              `[chatViaProvider] Provider ${config.provider} model ${m} returned ${response.status} (unavailable / tier restricted). Stepping to next candidate model...`,
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
            lastErrStatus = 504;
            lastErrDetail = JSON.stringify({ message: `Model ${m} timed out after 90s.` });
            const cooldownTime = activeKeysToTry.length > 1 ? 60_000 : 2_000;
            markKeyRateLimited(currentKey, cooldownTime);
            const isPaidKey = paidKeys.includes(currentKey);
            console.warn(
              `[chatViaProvider] Model ${m} (key ...${currentKey.slice(-4)}, ${isPaidKey ? "emergency paid fallback" : "free pool key"}) timed out (>90s). Auto-hopping to next key...`,
            );
            try {
              const { supabaseAdmin } = await import("@/integrations/backend/client.server");
              await supabaseAdmin.from("ai_usage_log").insert({
                user_id: options.userId ?? null,
                feature: (options.feature ?? "chat") + "_key_hop",
                model: m,
                latency_ms: 90_000,
                ok: false,
                error_message: `Key ...${currentKey.slice(-4)} (${isPaidKey ? "emergency paid fallback" : "free pool key"}) exceeded 90s timeout. Auto-hopped to next key.`,
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
  }, CHAT_RETRY_OPTS);

  const usedKey = activeKeysToTry[successfulKeyIdx] || "";
  const isUsedPaid = paidKeys.includes(usedKey);
  const isRotated = successfulKeyIdx > 0;
  const isModelSwapped = usedModel !== candidateModels[0];
  const activeKeyType: "primary" | "backup_pool" | "vip_fallback" = isUsedPaid
    ? "vip_fallback"
    : isRotated
      ? "backup_pool"
      : "primary";

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
 * concurrent load.
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

/** Direct call to Google's embeddings API with automatic key hopping across configured keys. */
async function embedViaGoogle(
  inputs: string[],
  config: ProviderConfig,
  outputDimensionality: number,
): Promise<number[][]> {
  const vectors: number[][] = new Array(inputs.length);
  const googleModel = config.model.startsWith("models/") ? config.model : GOOGLE_EMBED_MODEL;
  const { paidKeys } = buildOrderedKeyPool(config);
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns);

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
      vectors[offset + i] = item.values;
    });
  }

  return vectors;
}

function fitVectorDimensions(vec: number[], targetDims: number = EMBEDDING_DIMS): number[] {
  if (!vec) return new Array(targetDims).fill(0);
  if (vec.length === targetDims) return vec;
  if (vec.length < targetDims) {
    const padded = new Array(targetDims).fill(0);
    for (let i = 0; i < vec.length; i++) padded[i] = vec[i];
    return padded;
  }
  return vec.slice(0, targetDims);
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

  const modelToUse =
    config.provider === "mistral"
      ? config.model?.includes("embed")
        ? config.model
        : "mistral-embed"
      : config.model;

  for (let offset = 0; offset < inputs.length; offset += EMBED_BATCH_LIMIT) {
    const batch = inputs.slice(offset, offset + EMBED_BATCH_LIMIT);
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
            model: modelToUse,
            input: batch,
            ...(supportsDimensionsParam ? { dimensions: EMBEDDING_DIMS } : {}),
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          return (await response.json()) as { data?: { index: number; embedding: number[] }[] };
        }

        const detail = await response.text().catch(() => "");
        lastErrStatus = response.status;
        lastErrDetail = detail;

        if (response.status === 429 || response.status === 503) {
          const cooldownTime = candidateKeys.length > 1 ? 60_000 : 2_000;
          markKeyRateLimited(currentKey, cooldownTime);
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

    for (const item of data.data ?? []) {
      vectors[offset + item.index] = fitVectorDimensions(item.embedding, EMBEDDING_DIMS);
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

  try {
    let config =
      overrideProvider !== undefined ? overrideProvider : await getActiveEmbeddingProvider();

    if (!config) {
      const activeChat = await getActiveProvider();
      if (activeChat) {
        if (activeChat.provider === "google") {
          config = {
            ...activeChat,
            model: GOOGLE_EMBED_MODEL,
          };
        } else if (activeChat.provider === "mistral") {
          config = {
            ...activeChat,
            model: "mistral-embed",
          };
        } else if (activeChat.provider === "openai") {
          config = {
            ...activeChat,
            model: "text-embedding-3-small",
          };
        } else if (activeChat.provider === "openrouter") {
          config = {
            ...activeChat,
            model: "openai/text-embedding-3-large",
          };
        }
      }
    }

    if (config) {
      resVectors = await embedViaConfig(inputs, config);
      return resVectors;
    }

    if (!readEnv("LOVABLE_API_KEY")) {
      throw new AiGatewayError(
        "No active AI embedding provider configured. Add and activate a provider under Admin → Embeddings or Admin → AI Providers.",
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
        data?: { index: number; embedding: number[] }[];
      };
      for (const item of data.data ?? []) {
        vectors[offset + item.index] = item.embedding;
      }
    }

    resVectors = vectors;
    return resVectors;
  } catch (err: any) {
    callError = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      await supabaseAdmin.from("ai_usage_log").insert({
        feature: "embedding",
        model: model || "gemini-embedding-001",
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
  if (!vector) throw new AiGatewayError("The AI returned no embedding.", 500);
  return vector;
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
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns);

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
  const keysToTry = getPrioritizedKeyOrder(config, keyCooldowns);

  const candidateVisionModels =
    config.provider === "google"
      ? Array.from(
          new Set(
            [
              config.model?.replace(/^(google\/|models\/)/, ""),
              "gemini-2.5-flash",
              "gemini-2.0-flash",
              "gemini-1.5-flash",
              "gemini-3.8-flash",
            ].filter(Boolean),
          ),
        )
      : config.provider === "mistral"
        ? Array.from(
            new Set(
              (
                [
                  config.model?.startsWith("pixtral") ? config.model : "",
                  "pixtral-12b-2409",
                  "pixtral-large-latest",
                ] as string[]
              ).filter((m): m is string => Boolean(m)),
            ),
          )
        : [config.model];

  let usedVisionModel = candidateVisionModels[0] || config.model;

  for (const vm of candidateVisionModels) {
    usedVisionModel = vm;
    const body: Record<string, unknown> = {
      model: vm,
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
    if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

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
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          markKeyHealthy(currentKey);
          const data = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          return {
            text: data.choices?.[0]?.message?.content ?? "",
            model: usedVisionModel,
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
          break;
        }

        const isModelUnavailable =
          response.status === 404 ||
          (response.status === 400 &&
            (text.toLowerCase().includes("model") ||
              text.toLowerCase().includes("not found") ||
              text.toLowerCase().includes("unsupported")));

        if (isModelUnavailable) {
          console.warn(
            `[visionChatViaOpenAiCompatible] Provider ${config.provider} model ${vm} returned ${response.status}. Trying next candidate vision model...`,
          );
          break; // Step to next candidate model
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
            `[visionChatViaOpenAiCompatible] Key ...${currentKey.slice(-4)} timed out (>15s). Hopping to next key...`,
          );
          if (kIdx + 1 < keysToTry.length) continue;
          break;
        }
        throw fetchErr;
      }
    }
  }

  throw new AiGatewayError("All vision models/keys failed.", 500);
}

/**
 * Multimodal read of one or more page images (scans/photos of handwriting,
 * or photographed/scanned past-paper pages for MCQ/essay bank extraction).
 *
 * Provider resolution order (each step only runs if the previous one is
 * unset):
 *   1. `overrideProvider`, if the caller passed one explicitly (admin
 *      "test key" action, or a call that wants a specific saved key).
 *   2. The admin-configured active VISION provider (Admin → AI providers →
 *      Vision) — a key saved and activated specifically for image reads,
 *      independent of what marks essays or embeds the knowledge base.
 *   3. The admin-configured active CHAT provider, for back-compatibility
 *      with setups that only ever configured one BYOK key and expect it to
 *      cover everything (and because many chat-capable models are also
 *      vision-capable).
 *   4. The built-in Lovable AI gateway, if LOVABLE_API_KEY is present.
 * Otherwise this fails loudly with a clear, actionable message instead of
 * a silent 500.
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
    const override =
      options.overrideProvider !== undefined
        ? options.overrideProvider
        : ((await getActiveVisionProvider()) ?? (await getActiveProvider()));

    if (override) {
      const provResult =
        override.provider === "anthropic"
          ? await visionChatViaAnthropic(override, options)
          : await visionChatViaOpenAiCompatible(override, options);
      result = { ...provResult, latencyMs: Date.now() - started };
      return result;
    }

    if (!readEnv("LOVABLE_API_KEY")) {
      throw new AiGatewayError(
        "No AI provider is configured for handwriting/vision. Add a provider key that supports vision (Anthropic, OpenAI, or Google) under Admin → AI providers and mark it active.",
        500,
      );
    }

    const body: Record<string, unknown> = {
      model: options.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            // "detail: high" tells the underlying vision model to spend more
            // tokens on this image instead of a downsampled thumbnail — the
            // OpenAI-compatible lever for image fidelity, matters a lot for
            // reading small/faint handwriting.
            ...options.imageDataUrls.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "high" as const },
            })),
          ],
        },
      ],
    };
    if (options.maxCompletionTokens) body.max_completion_tokens = options.maxCompletionTokens;

    let response = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
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

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

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
      const model = result?.model || options.model || "google/gemini-3.8-flash";
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: options.userId ?? null,
        feature: options.feature ?? "vision_chat",
        model,
        prompt_tokens: result?.promptTokens ?? null,
        completion_tokens: result?.completionTokens ?? null,
        latency_ms: latencyMs,
        ok: !callError,
        error_message: callError ? callError.message : null,
      });
    } catch (logErr) {
      console.warn("Failed to write ai_usage_log in visionChat():", logErr);
    }
  }
}
