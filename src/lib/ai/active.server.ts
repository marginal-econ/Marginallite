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

let chatCache: { value: ProviderConfig | null; at: number } | null = null;
let embeddingCache: { value: ProviderConfig | null; at: number } | null = null;
let visionCache: { value: ProviderConfig | null; at: number } | null = null;
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

/**
 * Returns keys sorted with healthy free keys first, cooled-down free keys second,
 * and emergency paid keys strictly last (healthy paid, then cooled paid).
 */
export function getPrioritizedKeyOrder(
  config: ProviderConfig,
  cooldowns?: Map<string, number>,
): string[] {
  const { freeKeys, paidKeys } = buildOrderedKeyPool(config);
  const now = Date.now();
  const isHealthy = (k: string) => !cooldowns || (cooldowns.get(k) ?? 0) <= now;

  const healthyFree = freeKeys.filter(isHealthy);
  const cooledFree = freeKeys.filter((k) => !isHealthy(k));
  const healthyPaid = paidKeys.filter(isHealthy);
  const cooledPaid = paidKeys.filter((k) => !isHealthy(k));

  const ordered = [...healthyFree, ...cooledFree, ...healthyPaid, ...cooledPaid];
  return ordered.length > 0 ? ordered : [config.apiKey];
}

/** The admin-selected chat/marking provider override, or null to use built-in Lovable AI. */
export async function getActiveProvider(): Promise<ProviderConfig | null> {
  if (chatCache && Date.now() - chatCache.at < TTL_MS) return chatCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "chat")
      .maybeSingle();
    if (data && data.provider !== "lovable" && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null; // Never block AI because the override lookup failed.
  }

  chatCache = { value, at: Date.now() };
  return value;
}

/**
 * The admin-selected embedding provider override, or null to use the
 * legacy saved-key priority fallback in ai.server.ts's embed(). Kept as a
 * fully separate cache/lookup from getActiveProvider() so switching the
 * chat model can never accidentally change what embeds the knowledge base,
 * or vice versa.
 */
export async function getActiveEmbeddingProvider(): Promise<ProviderConfig | null> {
  if (embeddingCache && Date.now() - embeddingCache.at < TTL_MS) return embeddingCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "embedding")
      .maybeSingle();
    if (data && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null;
  }

  embeddingCache = { value, at: Date.now() };
  return value;
}

/**
 * The admin-selected vision provider override, or null to fall back to
 * whatever visionChat()'s own fallback chain does (active chat provider,
 * then the built-in gateway). Fully separate cache/lookup from both
 * getActiveProvider() and getActiveEmbeddingProvider() — this is what
 * powers handwriting transcription and MCQ/essay past-paper extraction
 * (reading real diagrams/figures off the page), and an admin should be
 * able to point those at a stronger/cheaper vision model without touching
 * what marks essays or what embeds the knowledge base.
 */
export async function getActiveVisionProvider(): Promise<ProviderConfig | null> {
  if (visionCache && Date.now() - visionCache.at < TTL_MS) return visionCache.value;

  let value: ProviderConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("is_active", true)
      .eq("purpose", "vision")
      .maybeSingle();
    if (data && data.api_key) {
      value = normaliseConfig(data);
    }
  } catch {
    value = null; // Never block OCR/extraction because the override lookup failed.
  }

  visionCache = { value, at: Date.now() };
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
  embeddingCache = null;
  visionCache = null;
  aiGatewayCache = null;
}

export type AiGatewayMode = "max" | "balanced" | "economy";

export type AiGatewaySettings = {
  /** The admin's site-wide pause switch. false = every chat() call fails fast. */
  enabled: boolean;
  mode: AiGatewayMode;
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

  let value: AiGatewaySettings = { enabled: true, mode: "max" };
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("key, int_value")
      .in("key", ["ai_enabled", "ai_mode"]);
    const row = (data ?? []) as { key: string; int_value: number }[];
    const enabledRow = row.find((r) => r.key === "ai_enabled");
    const modeRow = row.find((r) => r.key === "ai_mode");
    value = {
      enabled: enabledRow ? enabledRow.int_value !== 0 : true,
      mode: modeRow ? (AI_MODE_BY_INT[modeRow.int_value] ?? "max") : "max",
    };
  } catch {
    value = { enabled: true, mode: "max" }; // Never block AI because the settings lookup failed.
  }

  aiGatewayCache = { value, at: Date.now() };
  return value;
}
