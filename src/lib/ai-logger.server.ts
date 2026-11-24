import { supabaseAdmin } from "@/integrations/backend/client.server";

export interface LogAiUsageParams {
  userId?: string | null;
  feature: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  ok?: boolean;
  errorMessage?: string | null;
}

/**
 * Resiliently persists an AI call record.
 * 1. Tries `ai_usage_log` table if available.
 * 2. Persists to `definitions` table under `category = 'ai_usage_log'`.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const payload = {
    id,
    user_id: params.userId || null,
    feature: params.feature,
    model: params.model,
    prompt_tokens: params.promptTokens ?? 0,
    completion_tokens: params.completionTokens ?? 0,
    latency_ms: params.latencyMs ?? 0,
    ok: params.ok ?? true,
    error_message: params.errorMessage || null,
    created_at: now,
  };

  // 1. Try ai_usage_log (legacy or direct table)
  try {
    await supabaseAdmin.from("ai_usage_log" as any).insert(payload as any);
  } catch {
    /* fallback to definitions below */
  }

  // 2. Guaranteed persistence in definitions table
  try {
    await supabaseAdmin.from("definitions").insert({
      id,
      term: `__AI_LOG_${now}_${id}__`,
      definition_text: JSON.stringify(payload),
      category: "ai_usage_log",
      source_label: params.feature,
      extraction_model: params.model,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.warn("Failed to persist AI call in definitions table:", err);
  }
}
