import { providerMeta } from "./providers";

export type ProviderConfig = {
  provider: string;
  apiKey: string;
  paidPrimaryKey?: string;
  paidSecondaryKey?: string;
  paidKeys?: string[];
  freeKeys?: string[];
  budgetPoolKeys?: string[];
  apiKeys?: string[];
  baseUrl: string;
  model: string;
  label: string;
};

export function isGeminiProvider(provider: string): boolean {
  const p = (provider || "").toLowerCase();
  return p === "google" || p === "gemini" || p === "lovable";
}

let chatCache: { value: ProviderConfig | null; at: number; backupOnly?: boolean } | null = null;
let chatChainCache: { value: ProviderConfig[]; at: number; backupOnly?: boolean } | null = null;
let embeddingCache: { value: ProviderConfig | null; at: number; backupOnly?: boolean } | null = null;
let visionCache: { value: ProviderConfig | null; at: number; backupOnly?: boolean } | null = null;
const TTL_MS = 20_000;

export function normaliseConfig(row: {
  provider: string;
  api_key: string;
  base_url: string | null;
  model: string;
  label: string;
}): ProviderConfig {
  const meta = providerMeta(row.provider);
  let paidPrimary = "";
  let paidSecondary = "";
  let explicitPaidKeys: string[] = [];
  let freeKeys: string[] = [];
  let allKeys: string[] = [];

  const raw = row.api_key ? row.api_key.trim() : "";
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      paidPrimary = typeof parsed.paidPrimary === "string" ? parsed.paidPrimary.trim() : "";
      paidSecondary = typeof parsed.paidSecondary === "string" ? parsed.paidSecondary.trim() : "";

      if (Array.isArray(parsed.paidKeys)) {
        explicitPaidKeys = parsed.paidKeys
          .map((k: unknown) => String(k).trim())
          .filter((k: string) => k.length > 5);
      } else if (typeof parsed.paidKeys === "string") {
        explicitPaidKeys = parsed.paidKeys
          .split(/[\n\r,;]+/)
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 5);
      }

      const allPaid = Array.from(new Set([paidPrimary, paidSecondary, ...explicitPaidKeys].filter(Boolean)));

      if (Array.isArray(parsed.freeKeys)) {
        freeKeys = parsed.freeKeys
          .map((k: unknown) => String(k).trim())
          .filter((k: string) => k.length > 5);
      } else if (typeof parsed.freeKeys === "string") {
        freeKeys = parsed.freeKeys
          .split(/[\n\r,;]+/)
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 5);
      } else if (Array.isArray(parsed.budgetPool)) {
        const sortedItems = [...parsed.budgetPool].sort((a: any, b: any) => {
          const pA =
            typeof a === "object" && a !== null && typeof a.priority === "number" ? a.priority : 99;
          const pB =
            typeof b === "object" && b !== null && typeof b.priority === "number" ? b.priority : 99;
          return pA - pB;
        });
        freeKeys = sortedItems
          .map((k: unknown) => {
            if (typeof k === "object" && k !== null && "key" in k) {
              return String((k as { key: string }).key).trim();
            }
            return String(k).trim();
          })
          .filter((k: string) => k.length > 5);
      } else if (typeof parsed.budgetPool === "string") {
        freeKeys = parsed.budgetPool
          .split(/[\n\r,;]+/)
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 5);
      }

      // Ensure paid keys are not accidentally treated as free keys
      freeKeys = freeKeys.filter((k) => !allPaid.includes(k));
      explicitPaidKeys = allPaid;
      allKeys = Array.from(new Set([...freeKeys, ...allPaid]));
    } catch {
      // fallback to plain text parsing
    }
  }

  if (allKeys.length === 0 && raw) {
    allKeys = raw
      .split(/[\n\r,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    freeKeys = allKeys;
  }

  const primaryKey = freeKeys[0] || explicitPaidKeys[0] || allKeys[0] || raw;

  return {
    provider: row.provider,
    apiKey: primaryKey,
    paidPrimaryKey: explicitPaidKeys[0] || undefined,
    paidSecondaryKey: explicitPaidKeys[1] || undefined,
    paidKeys: explicitPaidKeys,
    freeKeys,
    budgetPoolKeys: freeKeys,
    apiKeys: allKeys.length > 0 ? allKeys : [raw],
    baseUrl: (row.base_url?.trim() || meta.baseUrl).replace(/\/+$/, ""),
    model: row.model,
    label: row.label,
  };
}

/**
 * Assembles the key pool cleanly partitioned into free keys and emergency paid keys.
 * All free keys are tried first (in priority/rotation order).
 * Paid keys are strictly the last resort, only used if every single free key fails.
 */
export function buildOrderedKeyPool(config: ProviderConfig): {
  freeKeys: string[];
  paidKeys: string[];
  allOrderedKeys: string[];
} {
  const rawFree = [
    ...(config.freeKeys || []),
    ...(config.budgetPoolKeys || []),
  ].map((k) => (typeof k === "string" ? k.trim() : "")).filter((k) => k.length > 5);

  const rawPaid = [
    ...(config.paidKeys || []),
    config.paidPrimaryKey,
    config.paidSecondaryKey,
  ].map((k) => (typeof k === "string" ? k.trim() : "")).filter((k) => k.length > 5);

  const paidKeys = Array.from(new Set(rawPaid));
  const freeKeys = Array.from(new Set(rawFree)).filter((k) => !paidKeys.includes(k));

  if (freeKeys.length === 0 && paidKeys.length === 0) {
    const fallback = (config.apiKey || "").trim();
    if (fallback.length > 5) {
      freeKeys.push(fallback);
    }
  }

  // Strictly: all free keys first. Paid keys appended as last resort only.
  const allOrderedKeys = [...freeKeys, ...paidKeys];
  if (allOrderedKeys.length === 0 && config.apiKey) {
    allOrderedKeys.push(config.apiKey.trim());
  }

  return { freeKeys, paidKeys, allOrderedKeys };
}

let keyRotationIndex = 0;

/**
 * Returns keys sorted with healthy free keys first, cooled-down free keys second,
 * and emergency paid keys strictly last (healthy paid, then cooled paid).
 * If rotate=true, healthy free keys are round-robin rotated to distribute load.
 */
export function getPrioritizedKeyOrder(
  config: ProviderConfig,
  cooldowns?: Map<string, number>,
  rotate = false,
): string[] {
  const { freeKeys, paidKeys } = buildOrderedKeyPool(config);
  const now = Date.now();
  const isHealthy = (k: string) => !cooldowns || (cooldowns.get(k) ?? 0) <= now;

  let healthyFree = freeKeys.filter(isHealthy);
  if (rotate && healthyFree.length > 1) {
    const shift = (keyRotationIndex++) % healthyFree.length;
    healthyFree = [...healthyFree.slice(shift), ...healthyFree.slice(0, shift)];
  }
  const cooledFree = freeKeys.filter((k) => !isHealthy(k));
  const healthyPaid = paidKeys.filter(isHealthy);
  const cooledPaid = paidKeys.filter((k) => !isHealthy(k));

  const ordered = [...healthyFree, ...cooledFree, ...healthyPaid, ...cooledPaid];
  return ordered.length > 0 ? ordered : [config.apiKey];
}

/**
 * The admin-selected chat/marking provider override, or null to use built-in Lovable AI.
 * When forceBackupOnly is true (or if the site-wide ai_backup_only setting is active),
 * Google Gemini is strictly bypassed and requests run exclusively on backup provider(s).
 */
export async function getActiveProvider(forceBackupOnly?: boolean): Promise<ProviderConfig | null> {
  const isBackupOnly =
    forceBackupOnly !== undefined ? forceBackupOnly : (await getAiGatewaySettings()).backupOnly;

  if (
    chatCache &&
    Date.now() - chatCache.at < TTL_MS &&
    chatCache.value &&
    chatCache.backupOnly === isBackupOnly
  ) {
    return chatCache.value;
  }

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    if (isBackupOnly) {
      // 1. Look for an explicitly active non-Gemini backup provider
      const { data, error } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("is_active", true)
        .eq("purpose", "chat")
        .neq("provider", "google")
        .neq("provider", "gemini")
        .neq("provider", "lovable")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0]!.api_key) {
        value = normaliseConfig(data[0]!);
      } else {
        // 2. Fallback: Find ANY configured non-Gemini provider key
        const { data: fallbackData } = await supabaseAdmin
          .from("ai_provider_keys")
          .select("provider, api_key, base_url, model, label")
          .neq("provider", "google")
          .neq("provider", "gemini")
          .neq("provider", "lovable")
          .order("updated_at", { ascending: false });

        if (fallbackData && fallbackData.length > 0) {
          const validRow = fallbackData.find((r) => r.api_key && r.api_key.trim().length > 5);
          if (validRow) {
            value = normaliseConfig(validRow);
          }
        }
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("is_active", true)
        .eq("purpose", "chat")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0]!.provider !== "lovable" && data[0]!.api_key) {
        value = normaliseConfig(data[0]!);
      } else {
        // Fallback: If no key is explicitly marked is_active for chat, find ANY available provider key with a valid api_key
        const { data: fallbackData } = await supabaseAdmin
          .from("ai_provider_keys")
          .select("provider, api_key, base_url, model, label")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (fallbackData && fallbackData.length > 0 && fallbackData[0]!.api_key) {
          value = normaliseConfig(fallbackData[0]!);
        }
      }
    }
  } catch (err) {
    console.error("[getActiveProvider] Lookup error:", err);
    if (chatCache?.value && chatCache.backupOnly === isBackupOnly) return chatCache.value;
    value = null;
  }

  chatCache = { value, at: value ? Date.now() : Date.now() - (TTL_MS - 5_000), backupOnly: isBackupOnly };
  return value;
}

/**
 * Returns an ordered chain of chat providers:
 * 1. The active primary provider (or backup provider if Gemini is bypassed)
 * 2. Standby providers with configured keys (e.g. Groq, Mistral, OpenRouter, etc.)
 * If the primary provider experiences total exhaustion or outage, the engine hops to the next provider.
 */
export async function getChatProviderChain(forceBackupOnly?: boolean): Promise<ProviderConfig[]> {
  const isBackupOnly =
    forceBackupOnly !== undefined ? forceBackupOnly : (await getAiGatewaySettings()).backupOnly;

  if (
    chatChainCache &&
    Date.now() - chatChainCache.at < TTL_MS &&
    chatChainCache.value.length > 0 &&
    chatChainCache.backupOnly === isBackupOnly
  ) {
    return chatChainCache.value;
  }

  const chain: ProviderConfig[] = [];
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label, is_active")
      .eq("purpose", "chat")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });

    if (!error && data && data.length > 0) {
      let filteredRows = data.filter((row) => row.api_key && row.api_key.trim().length > 5 && row.provider !== "lovable");
      if (isBackupOnly) {
        filteredRows = filteredRows.filter((row) => !isGeminiProvider(row.provider));
      }

      const activeRows = filteredRows.filter((row) => row.is_active);
      const standbyRows = filteredRows.filter((row) => !row.is_active);

      for (const row of activeRows) {
        chain.push(normaliseConfig(row));
      }
      for (const row of standbyRows) {
        if (!chain.some((c) => c.provider === row.provider)) {
          chain.push(normaliseConfig(row));
        }
      }
    }

    if (chain.length === 0) {
      const active = await getActiveProvider(isBackupOnly);
      if (active) chain.push(active);
    }
  } catch (err) {
    console.error("[getChatProviderChain] Lookup error:", err);
    if (chatChainCache?.value && chatChainCache.backupOnly === isBackupOnly) return chatChainCache.value;
  }

  chatChainCache = { value: chain, at: Date.now(), backupOnly: isBackupOnly };
  return chain;
}

/**
 * The admin-selected embedding provider override.
 * Retrieves the active embedding provider (e.g. Google gemini-embedding-001)
 * to ground essays and questions against the 259+ Knowledge Base documents.
 * 
 * CRITICAL: The entire 259+ Knowledge Base in Supabase PostgreSQL is vectorized
 * in Google's gemini-embedding-001 2048-dimensional space.
 * Regardless of which chat LLM provider is active (Groq, OpenRouter, Mistral, OpenAI, Anthropic),
 * embeddings for retrieval must ALWAYS use the matching gemini-embedding-001 vector space.
 */
export async function getActiveEmbeddingProvider(): Promise<ProviderConfig | null> {
  if (
    embeddingCache &&
    Date.now() - embeddingCache.at < TTL_MS &&
    embeddingCache.value
  ) {
    return embeddingCache.value;
  }

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // 1. Active embedding key in ai_provider_keys (matches database vector space)
    const { data, error } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "embedding")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0]!.api_key) {
      value = normaliseConfig(data[0]!);
    }

    // 2. Fallback: Any key marked for embedding
    if (!value) {
      const { data: anyEmbed } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("purpose", "embedding")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (anyEmbed && anyEmbed.length > 0 && anyEmbed[0]!.api_key) {
        value = normaliseConfig(anyEmbed[0]!);
      }
    }

    // 3. Fallback: Any active Google key (Google keys can call gemini-embedding-001)
    if (!value) {
      const { data: anyGoogle } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("provider", "google")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (anyGoogle && anyGoogle.length > 0 && anyGoogle[0]!.api_key) {
        value = {
          ...normaliseConfig(anyGoogle[0]!),
          model: "models/gemini-embedding-001",
        };
      }
    }

    // 4. Fallback: Any Google key at all
    if (!value) {
      const { data: googleAll } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("provider", "google")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (googleAll && googleAll.length > 0 && googleAll[0]!.api_key) {
        value = {
          ...normaliseConfig(googleAll[0]!),
          model: "models/gemini-embedding-001",
        };
      }
    }
  } catch (err) {
    console.error("[getActiveEmbeddingProvider] Lookup error:", err);
    if (embeddingCache?.value) return embeddingCache.value;
    value = null;
  }

  embeddingCache = { value, at: value ? Date.now() : Date.now() - (TTL_MS - 5_000) };
  return value;
}

/**
 * The admin-selected vision provider override.
 * Ensures only vision-capable models (e.g. Gemini 2.5/3.8 Flash, GPT-4o, Claude 3.5 Sonnet, Pixtral)
 * are selected for mark-scheme image interpretation.
 */
export async function getActiveVisionProvider(): Promise<ProviderConfig | null> {
  if (
    visionCache &&
    Date.now() - visionCache.at < TTL_MS &&
    visionCache.value
  ) {
    return visionCache.value;
  }

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // 1. Google key explicitly designated for vision (Vision must always go through Google Gemini)
    const { data: visionGoogle } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("provider", "google")
      .eq("purpose", "vision")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (visionGoogle && visionGoogle.length > 0 && visionGoogle[0]!.api_key) {
      value = normaliseConfig(visionGoogle[0]!);
    }

    // 2. Any active Google key (all Google keys can call Gemini 3.8 Flash Vision)
    if (!value) {
      const { data: anyGoogle } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("provider", "google")
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1);

      if (anyGoogle && anyGoogle.length > 0 && anyGoogle[0]!.api_key) {
        value = normaliseConfig(anyGoogle[0]!);
      }
    }
  } catch (err) {
    console.error("[getActiveVisionProvider] Lookup error:", err);
    if (visionCache?.value) return visionCache.value;
    value = null;
  }

  visionCache = { value, at: value ? Date.now() : Date.now() - (TTL_MS - 5_000) };
  return value;
}

/** Look up one saved provider key by id, for per-call embedding overrides. */
export async function getProviderConfigById(id: string): Promise<ProviderConfig | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("id", id)
      .maybeSingle();
    if (!data || !data.api_key) return null;
    return normaliseConfig(data);
  } catch {
    return null;
  }
}

export function clearActiveProviderCache() {
  chatCache = null;
  chatChainCache = null;
  embeddingCache = null;
  visionCache = null;
  aiGatewayCache = null;
}

export type AiGatewayMode = "max" | "balanced" | "economy";

export type AiGatewaySettings = {
  /** The admin's site-wide pause switch. false = every chat() call fails fast. */
  enabled: boolean;
  mode: AiGatewayMode;
  /** When true, Google Gemini is strictly bypassed and all AI requests run exclusively on backup providers. */
  backupOnly: boolean;
};

const AI_MODE_BY_INT: Record<number, AiGatewayMode> = { 0: "max", 1: "balanced", 2: "economy" };

let aiGatewayCache: { value: AiGatewaySettings; at: number } | null = null;
/** Short TTL: an admin flipping the pause switch during a credits emergency
 *  should take effect in seconds, not the 20s used for provider overrides. */
const AI_GATEWAY_TTL_MS = 5_000;

/**
 * The admin's global AI controls, read straight off app_settings (service
 * role, bypasses RLS — see 20260919120000_ai_gateway_controls.sql). Cached
 * briefly so every single chat() call doesn't cost its own round trip; on
 * any lookup failure this defaults to fully enabled/max quality so a
 * transient DB hiccup can never itself take AI offline.
 */
export async function getAiGatewaySettings(): Promise<AiGatewaySettings> {
  if (aiGatewayCache && Date.now() - aiGatewayCache.at < AI_GATEWAY_TTL_MS) {
    return aiGatewayCache.value;
  }

  let value: AiGatewaySettings = { enabled: true, mode: "max", backupOnly: false };
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("key, int_value")
      .in("key", ["ai_enabled", "ai_mode", "ai_backup_only"]);
    const row = (data ?? []) as { key: string; int_value: number }[];
    const enabledRow = row.find((r) => r.key === "ai_enabled");
    const modeRow = row.find((r) => r.key === "ai_mode");
    const backupOnlyRow = row.find((r) => r.key === "ai_backup_only");
    value = {
      enabled: enabledRow ? enabledRow.int_value !== 0 : true,
      mode: modeRow ? (AI_MODE_BY_INT[modeRow.int_value] ?? "max") : "max",
      backupOnly: backupOnlyRow ? backupOnlyRow.int_value === 1 : false,
    };
  } catch {
    value = { enabled: true, mode: "max", backupOnly: false }; // Never block AI because the settings lookup failed.
  }

  aiGatewayCache = { value, at: Date.now() };
  return value;
}
