import { getSupabaseAdmin } from "./supabase";
import type { WaitlistRow } from "./waitlist";
export const STATUSES = ["waiting", "invited", "active", "archived"] as const;
export function parseFilters(url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length > 100 || /[,()%"\\]/.test(q))
    throw new Error(
      "Search with a name, email, or referral code (up to 100 characters; no commas, quotes, parentheses, % or backslashes).",
    );
  const status = url.searchParams.get("status") ?? "";
  if (status && !(STATUSES as readonly string[]).includes(status))
    throw new Error("Unknown status filter.");
  const referral = url.searchParams.get("referral") ?? "";
  if (referral && !["yes", "no"].includes(referral)) throw new Error("Unknown referral filter.");
  const dates = ["from", "to"].map((key) => {
    const value = url.searchParams.get(key) ?? "";
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new Error("Use valid dates.");
    return value;
  });
  if (dates[0] && dates[1] && dates[0] > dates[1])
    throw new Error("The start date must come before the end date.");
  const sort = url.searchParams.get("sort") ?? "newest";
  if (!["newest", "oldest", "email", "name"].includes(sort)) throw new Error("Unknown sort order.");
  const page = Number(url.searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new Error("Invalid page.");
  return { q, status, referral, from: dates[0], to: dates[1], sort, page };
}
export async function querySignups(filters: ReturnType<typeof parseFilters>, csv = false) {
  const db = getSupabaseAdmin();
  let query = db
    .from("waitlist")
    .select("id,name,email,city,country,referral_code,referred_by,source,status,created_at", {
      count: "exact",
    });
  if (filters.q) {
    const term = filters.q.replace(/_/g, "\\_").replace(/\*/g, "");
    query = query.or(
      `email.ilike.*${term}*,name.ilike.*${term}*,city.ilike.*${term}*,country.ilike.*${term}*,referral_code.ilike.*${term}*`,
    );
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.referral === "yes") query = query.not("referred_by", "is", null);
  if (filters.referral === "no") query = query.is("referred_by", null);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to)
    query = query.lt("created_at", new Date(Date.parse(filters.to) + 86400000).toISOString());
  query = query
    .order(["email", "name"].includes(filters.sort) ? filters.sort : "created_at", {
      ascending: filters.sort !== "newest",
    })
    .order("id", { ascending: true });
  const start = csv ? 0 : (filters.page - 1) * 50;
  const { data, error, count } = await query.range(start, start + (csv ? 499 : 49));
  if (error) throw error;
  const rows = (data ?? []) as WaitlistRow[];
  if (csv) {
    for (let offset = rows.length; offset < Math.min(count ?? 0, 5000);) {
      const batch = await query.range(offset, Math.min(offset + 499, 4999));
      if (batch.error) throw batch.error;
      if (!batch.data?.length) break;
      rows.push(...(batch.data as WaitlistRow[]));
      offset += batch.data.length;
    }
  }
  return { rows, total: count ?? 0, page: filters.page, pageSize: 50 };
}
export async function getAdminSummary() {
  const db = getSupabaseAdmin();
  const results = await Promise.all([
    db.from("waitlist").select("id", { count: "exact", head: true }),
    db
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${new Date().toISOString().slice(0, 10)}T00:00:00Z`),
    db.from("waitlist").select("id", { count: "exact", head: true }).not("referred_by", "is", null),
    db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "waiting"),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return {
    total: results[0].count ?? 0,
    today: results[1].count ?? 0,
    referred: results[2].count ?? 0,
    waiting: results[3].count ?? 0,
  };
}
export async function bulkSignups(body: unknown): Promise<number> {
  if (!body || typeof body !== "object") throw new TypeError("Send an action and selected IDs.");
  const { ids, action, status } = body as Record<string, unknown>;
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 100 ||
    ids.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    )
  )
    throw new TypeError("Select between 1 and 100 valid entries.");
  if (action !== "delete" && action !== "status") throw new TypeError("Unknown action.");
  if (action === "status" && !(STATUSES as readonly unknown[]).includes(status))
    throw new TypeError("Choose a valid status.");
  const db = getSupabaseAdmin();
  const query =
    action === "delete" ? db.from("waitlist").delete() : db.from("waitlist").update({ status });
  const { data, error } = await query.in("id", [...new Set(ids)]).select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
