// Server-only admin client for the self-hosted backend. Bypasses RLS.
// Load it inside handlers: await import("@/integrations/backend/client.server")
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/backend/types";
import { readEnv } from "@/server/env";
import { BACKEND_URL, createBackendFetch } from "./config";

function attachResilientFrom(rawClient: SupabaseClient<Database>): SupabaseClient<Database> {
  const originalFrom = rawClient.from.bind(rawClient);

  rawClient.from = function (table: string): any {
    if (table !== "ai_usage_log" && table !== "site_settings" && table !== "app_settings") {
      return originalFrom(table as any);
    }

    if (table === "ai_usage_log") {
      let operation: "select" | "insert" | "update" | "delete" = "select";
      let insertValues: any = null;
      let updateValues: any = null;
      const filters: Array<{ type: string; col: string; val: any }> = [];
      let orderClause: { col: string; ascending: boolean } | null = null;
      let limitCount: number | null = null;
      let isSingle = false;
      let isMaybeSingle = false;

      const builder: any = {
        select(cols?: string) {
          operation = "select";
          return builder;
        },
        insert(values: any) {
          operation = "insert";
          insertValues = values;
          return builder;
        },
        update(values: any) {
          operation = "update";
          updateValues = values;
          return builder;
        },
        delete() {
          operation = "delete";
          return builder;
        },
        eq(col: string, val: any) {
          filters.push({ type: "eq", col, val });
          return builder;
        },
        in(col: string, vals: any[]) {
          filters.push({ type: "in", col, val: vals });
          return builder;
        },
        gte(col: string, val: any) {
          filters.push({ type: "gte", col, val });
          return builder;
        },
        lte(col: string, val: any) {
          filters.push({ type: "lte", col, val });
          return builder;
        },
        order(col: string, options?: { ascending?: boolean }) {
          orderClause = { col, ascending: options?.ascending ?? true };
          return builder;
        },
        limit(count: number) {
          limitCount = count;
          return builder;
        },
        single() {
          isSingle = true;
          return builder;
        },
        maybeSingle() {
          isMaybeSingle = true;
          return builder;
        },
        then(resolve: (val: any) => any, reject?: (err: any) => any) {
          return (async () => {
            // 1. Try real table first
            try {
              let nativeQuery: any = originalFrom("ai_usage_log" as any);
              if (operation === "insert") {
                nativeQuery = nativeQuery.insert(insertValues);
              } else if (operation === "update") {
                nativeQuery = nativeQuery.update(updateValues);
              } else if (operation === "delete") {
                nativeQuery = nativeQuery.delete();
              } else {
                nativeQuery = nativeQuery.select("*");
              }

              for (const f of filters) {
                if (f.type === "eq") nativeQuery = nativeQuery.eq(f.col, f.val);
                else if (f.type === "in") nativeQuery = nativeQuery.in(f.col, f.val);
                else if (f.type === "gte") nativeQuery = nativeQuery.gte(f.col, f.val);
                else if (f.type === "lte") nativeQuery = nativeQuery.lte(f.col, f.val);
              }
              if (orderClause) nativeQuery = nativeQuery.order(orderClause.col, { ascending: orderClause.ascending });
              if (limitCount !== null) nativeQuery = nativeQuery.limit(limitCount);
              if (isSingle) nativeQuery = nativeQuery.single();
              else if (isMaybeSingle) nativeQuery = nativeQuery.maybeSingle();

              const nativeRes = await nativeQuery;
              if (!nativeRes?.error || nativeRes.error.code !== "PGRST205") {
                return nativeRes;
              }
            } catch {}

            // 2. Resilient fallback to definitions table
            try {
              if (operation === "insert") {
                const items = Array.isArray(insertValues) ? insertValues : [insertValues];
                const insertedRows: any[] = [];
                for (const item of items) {
                  const id = item.id || crypto.randomUUID();
                  const createdAt = item.created_at || new Date().toISOString();
                  const payload = { ...item, id, created_at: createdAt };
                  const { error: insErr } = await originalFrom("definitions" as any).insert({
                    id,
                    term: `__AI_LOG_${createdAt}_${id}__`,
                    definition_text: JSON.stringify(payload),
                    category: "ai_usage_log",
                    source_label: String(item.feature || "chat"),
                    created_at: createdAt,
                  });
                  if (!insErr) insertedRows.push(payload);
                }
                const resultData = Array.isArray(insertValues) ? insertedRows : (insertedRows[0] || null);
                return { data: resultData, error: null };
              }

              if (operation === "delete") {
                const idFilter = filters.find((f) => f.col === "id" && f.type === "eq");
                if (idFilter) {
                  return await originalFrom("definitions" as any).delete().eq("id", idFilter.val);
                }
                return await originalFrom("definitions" as any).delete().eq("category", "ai_usage_log");
              }

              if (operation === "update") {
                const idFilter = filters.find((f) => f.col === "id" && f.type === "eq");
                if (idFilter) {
                  const { data: existing } = await originalFrom("definitions" as any)
                    .select("definition_text")
                    .eq("id", idFilter.val)
                    .maybeSingle();
                  if (existing) {
                    const parsed = JSON.parse(existing.definition_text || "{}");
                    const updated = { ...parsed, ...updateValues };
                    await originalFrom("definitions" as any)
                      .update({
                        definition_text: JSON.stringify(updated),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", idFilter.val);
                  }
                }
                return { data: null, error: null };
              }

              // Operation === "select"
              const defQuery = originalFrom("definitions" as any)
                .select("id, term, definition_text, created_at, source_label")
                .eq("category", "ai_usage_log")
                .order("created_at", { ascending: false })
                .limit(Math.max(limitCount || 500, 1000));

              const { data, error } = await defQuery;
              if (error) return { data: [], error: null };

              let rows: any[] = (data || [])
                .map((r: any) => {
                  try {
                    const parsed = JSON.parse(r.definition_text || "{}");
                    return {
                      id: r.id,
                      user_id: parsed.user_id ?? null,
                      feature: parsed.feature ?? r.source_label ?? "chat",
                      model: parsed.model ?? null,
                      prompt_tokens: parsed.prompt_tokens ?? null,
                      completion_tokens: parsed.completion_tokens ?? null,
                      latency_ms: parsed.latency_ms ?? null,
                      ok: parsed.ok !== false,
                      error_message: parsed.error_message ?? null,
                      created_at: parsed.created_at || r.created_at,
                    };
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean);

              // Apply in-memory filters
              for (const f of filters) {
                if (f.type === "eq") {
                  rows = rows.filter((r) => r[f.col] === f.val);
                } else if (f.type === "in") {
                  rows = rows.filter((r) => f.val.includes(r[f.col]));
                } else if (f.type === "gte") {
                  rows = rows.filter((r) => new Date(r[f.col]).getTime() >= new Date(f.val).getTime());
                } else if (f.type === "lte") {
                  rows = rows.filter((r) => new Date(r[f.col]).getTime() <= new Date(f.val).getTime());
                }
              }

              if (orderClause) {
                const col = orderClause.col;
                const asc = orderClause.ascending;
                rows.sort((a, b) => {
                  const valA = a[col] ?? "";
                  const valB = b[col] ?? "";
                  return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
                });
              }

              if (limitCount !== null) {
                rows = rows.slice(0, limitCount);
              }

              if (isSingle) {
                return { data: rows[0] || null, error: rows.length === 0 ? { message: "No rows found" } : null };
              }
              if (isMaybeSingle) {
                return { data: rows[0] || null, error: null };
              }

              return { data: rows, error: null };
            } catch (err: any) {
              return { data: [], error: null };
            }
          })().then(resolve, reject);
        },
      };

      return builder;
    }

    if (table === "site_settings") {
      let isUpsert = false;
      let upsertData: any = null;

      const builder: any = {
        select(cols?: string) {
          return builder;
        },
        eq(col: string, val: any) {
          return builder;
        },
        maybeSingle() {
          return builder;
        },
        single() {
          return builder;
        },
        upsert(data: any) {
          isUpsert = true;
          upsertData = data;
          return builder;
        },
        then(resolve: (val: any) => any, reject?: (err: any) => any) {
          return (async () => {
            try {
              if (isUpsert) {
                const nativeRes = await originalFrom("site_settings" as any).upsert(upsertData);
                if (!nativeRes?.error || nativeRes.error.code !== "PGRST205") return nativeRes;
              } else {
                const nativeRes = await originalFrom("site_settings" as any).select("value").eq("id", 1).maybeSingle();
                if (!nativeRes?.error || nativeRes.error.code !== "PGRST205") return nativeRes;
              }
            } catch {}

            // Fallback to definitions
            try {
              if (isUpsert) {
                await originalFrom("definitions" as any).upsert({
                  id: "00000000-0000-0000-0000-000000000001",
                  term: "__SITE_SETTINGS_1__",
                  category: "site_settings",
                  definition_text: JSON.stringify(upsertData?.value || {}),
                  updated_at: new Date().toISOString(),
                });
                return { data: null, error: null };
              }

              const { data } = await originalFrom("definitions" as any)
                .select("definition_text")
                .eq("category", "site_settings")
                .eq("term", "__SITE_SETTINGS_1__")
                .maybeSingle();

              if (data?.definition_text) {
                try {
                  return { data: { id: 1, value: JSON.parse(data.definition_text) }, error: null };
                } catch {}
              }
              return { data: null, error: null };
            } catch (err: any) {
              return { data: null, error: null };
            }
          })().then(resolve, reject);
        },
      };

      return builder;
    }

    if (table === "app_settings") {
      let isUpsert = false;
      let upsertData: any = null;
      const filters: Array<{ col: string; val: any }> = [];

      const builder: any = {
        select(cols?: string) {
          return builder;
        },
        eq(col: string, val: any) {
          filters.push({ col, val });
          return builder;
        },
        maybeSingle() {
          return builder;
        },
        single() {
          return builder;
        },
        upsert(data: any) {
          isUpsert = true;
          upsertData = data;
          return builder;
        },
        then(resolve: (val: any) => any, reject?: (err: any) => any) {
          return (async () => {
            try {
              if (isUpsert) {
                const nativeRes = await originalFrom("app_settings" as any).upsert(upsertData);
                if (!nativeRes?.error || nativeRes.error.code !== "PGRST205") return nativeRes;
              } else {
                let q = originalFrom("app_settings" as any).select("*");
                for (const f of filters) q = q.eq(f.col, f.val);
                const nativeRes = await q;
                if (!nativeRes?.error || nativeRes.error.code !== "PGRST205") return nativeRes;
              }
            } catch {}

            // Fallback to definitions
            try {
              if (isUpsert) {
                const rows = Array.isArray(upsertData) ? upsertData : [upsertData];
                for (const row of rows) {
                  const key = row.key || crypto.randomUUID();
                  await originalFrom("definitions" as any).upsert({
                    id: crypto.randomUUID(),
                    term: `__APP_SETTING_${key}__`,
                    category: "app_settings",
                    definition_text: JSON.stringify(row),
                    updated_at: new Date().toISOString(),
                  });
                }
                return { data: null, error: null };
              }

              const { data } = await originalFrom("definitions" as any)
                .select("term, definition_text")
                .eq("category", "app_settings");

              const rows = (data || []).map((r: any) => {
                try {
                  return JSON.parse(r.definition_text || "{}");
                } catch {
                  return null;
                }
              }).filter(Boolean);

              return { data: rows, error: null };
            } catch {
              return { data: [], error: null };
            }
          })().then(resolve, reject);
        },
      };

      return builder;
    }

    return originalFrom(table as any);
  };

  return rawClient;
}

function createAdminClient() {
  const url =
    readEnv("BACKEND_URL") ||
    readEnv("SUPABASE_URL") ||
    readEnv("VITE_BACKEND_URL") ||
    BACKEND_URL;

  const key =
    readEnv("BACKEND_SERVICE_ROLE_KEY") ||
    readEnv("SUPABASE_SECRET_KEY") ||
    (typeof process !== "undefined" ? process.env["BACKEND_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] : undefined);

  if (!url || !key) {
    throw new Error("Missing BACKEND_URL or BACKEND_SERVICE_ROLE_KEY for server admin client.");
  }

  const rawClient = createClient<Database>(url, key, {
    global: { fetch: createBackendFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  return attachResilientFrom(rawClient);
}

let _admin: ReturnType<typeof createAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = createAdminClient();
    return Reflect.get(_admin, prop, receiver);
  },
});
