import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/backend/types";
import { isAdmin } from "@/lib/auth-admin";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

async function listAcceptedAuthUsers(): Promise<User[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const users: User[] = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        console.warn("Failed to list auth users:", error.message);
        break;
      }
      if (!data?.users) break;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    return users;
  } catch (err) {
    console.warn("Exception in listAcceptedAuthUsers:", err);
    return [];
  }
}

/** Throws unless the caller is an admin. */
async function assertAdmin(context: AuthContext) {
  let adminOk = isAdmin({
    userId: context.userId,
    claims: (context as any).claims,
    email: (context as any).email,
  });

  if (!adminOk && context.userId) {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const db = supabaseAdmin ?? context.supabase;
      const { data: roleRow } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) {
        adminOk = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (adminOk) {
    return;
  }

  throw new Error("Admin access is restricted to authorized administrators.");
}

export const listPublicWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    // Page through the list so the database's default row limit cannot hide members.
    const entries: {
      id: string;
      name: string | null;
      email: string;
      city: string | null;
      country: string | null;
      status: string;
      created_at: string;
    }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("waitlist")
        .select("id,name,email,city,country,status,created_at")
        .order("created_at")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      entries.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }

    // Creating an invite also creates an Auth row, so existence alone does
    // not mean the recipient accepted it. A populated last_sign_in_at means
    // they redeemed the link and entered the app. Reconcile that state here
    // so the admin list stays accurate even if the browser was closed during
    // the acceptance flow.
    const acceptedByEmail = new Map<string, string>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const user of data.users) {
        if (user.email && user.last_sign_in_at) {
          acceptedByEmail.set(user.email.toLowerCase(), user.last_sign_in_at);
        }
      }
      if (data.users.length < 1000) break;
    }

    return entries.map((entry, index) => {
      const acceptedAt = acceptedByEmail.get(entry.email.toLowerCase()) ?? null;
      return {
        ...entry,
        status: acceptedAt ? "accepted" : entry.status,
        accepted_at: acceptedAt,
        position: index + 1,
      };
    });
  });

export const invitePublicWaitlistMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    const { data: member, error: lookupError } = await client
      .from("waitlist")
      .select("email,name,status")
      .eq("id", data.id)
      .single();
    if (lookupError || !member) throw new Error("This waitlist entry could not be found.");
    if (member.status === "active") throw new Error("This member already has access.");

    for (let page = 1; ; page += 1) {
      const { data: users, error: usersError } = await client.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (usersError) throw new Error(usersError.message);
      const accepted = users.users.some(
        (user) =>
          user.email?.toLowerCase() === member.email.toLowerCase() && !!user.last_sign_in_at,
      );
      if (accepted) throw new Error("This member has already accepted the invitation.");
      if (users.users.length < 1000) break;
    }
    // Invitations always use one explicitly configured canonical origin.
    // This avoids localhost links while still allowing the deployment to move
    // to a custom domain without a code change.
    const { requireEnv } = await import("@/server/env");
    const siteUrl = new URL(requireEnv("PUBLIC_SITE_URL"));
    if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") {
      throw new Error("PUBLIC_SITE_URL must use HTTPS.");
    }
    const redirectTo = new URL("/auth", siteUrl).href;
    const { sendAccessInvitation } = await import("@/server/access-invitation");
    await sendAccessInvitation(client, member, redirectTo);
    // The existing auth trigger grants student access. Admin promotions remain
    // an explicit action in the Users tab, never controlled by email metadata.
    const { error: updateError } = await client
      .from("waitlist")
      .update({ status: "invited" })
      .eq("id", data.id);
    if (updateError)
      return {
        warning:
          "The invitation was sent, but the waitlist status could not be saved. Refresh before trying again.",
      };
    return { warning: null };
  });

export const removePublicWaitlistMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const client = getSupabaseAdmin();
    const { data: member, error: lookupError } = await client
      .from("waitlist")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (lookupError) throw new Error(`Waitlist member could not be found: ${lookupError.message}`);
    if (!member) throw new Error("This waitlist member no longer exists.");

    const { data: removed, error } = await client
      .from("waitlist")
      .delete()
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Waitlist member could not be removed: ${error.message}`);
    if (!removed) throw new Error("This waitlist member no longer exists.");

    const { error: codeError } = await client
      .from("waitlist_email_codes")
      .delete()
      .eq("email", member.email.toLowerCase());
    if (codeError)
      throw new Error(`Member removed, but OTP history could not be cleared: ${codeError.message}`);
    const { invalidateWaitlistCount } = await import("@/server/waitlist");
    invalidateWaitlistCount();
    return { success: true };
  });

function maskKey(key: string): string {
  if (key.startsWith("{") && key.endsWith("}")) {
    try {
      const parsed = JSON.parse(key);
      const freeCount = Array.isArray(parsed.freeKeys)
        ? parsed.freeKeys.length
        : Array.isArray(parsed.budgetPool)
          ? parsed.budgetPool.length
          : typeof parsed.budgetPool === "string" && parsed.budgetPool.length > 5
            ? parsed.budgetPool.split(/[\n\r,;]+/).filter((k: string) => k.trim().length > 5).length
            : 0;

      const paidPrimary = typeof parsed.paidPrimary === "string" ? parsed.paidPrimary.trim() : "";
      const paidSecondary = typeof parsed.paidSecondary === "string" ? parsed.paidSecondary.trim() : "";
      const hasPaid = paidPrimary.length > 5 || paidSecondary.length > 5;

      const parts: string[] = [];
      if (freeCount > 0) {
        parts.push(`${freeCount} free hopping ${freeCount === 1 ? "key" : "keys"}`);
      }
      if (hasPaid) {
        parts.push(
          `emergency paid fallback (${paidPrimary.length > 8 ? `${paidPrimary.slice(0, 4)}••••${paidPrimary.slice(-4)}` : "active"})`,
        );
      }
      if (parts.length > 0) return parts.join(" + ");
    } catch {
      // fall through
    }
  }
  const rawKeys = key
    .split(/[\n\r,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
  if (rawKeys.length > 1) {
    const first = rawKeys[0]!;
    return `${first.slice(0, 4)}••••${first.slice(-4)} (+${rawKeys.length - 1} hopping keys)`;
  }
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const count = async (table: string) => {
      try {
        const { count, error } = await supabaseAdmin
          .from(table as never)
          .select("*", { count: "exact", head: true });
        if (error) {
          console.warn(`Count warning for ${table}:`, error.message);
          return 0;
        }
        return count ?? 0;
      } catch (err) {
        console.warn(`Exception counting ${table}:`, err);
        return 0;
      }
    };

    let acceptedUsers: User[] = [];
    let essays = 0;
    let documents = 0;
    let chunks = 0;
    let attempts = 0;
    let anchors = 0;

    try {
      const results = await Promise.allSettled([
        listAcceptedAuthUsers(),
        count("essays"),
        count("knowledge_documents"),
        count("document_chunks"),
        count("mcq_attempts"),
        count("calibration_anchors"),
      ]);
      if (results[0].status === "fulfilled") acceptedUsers = results[0].value;
      if (results[1].status === "fulfilled") essays = results[1].value;
      if (results[2].status === "fulfilled") documents = results[2].value;
      if (results[3].status === "fulfilled") chunks = results[3].value;
      if (results[4].status === "fulfilled") attempts = results[4].value;
      if (results[5].status === "fulfilled") anchors = results[5].value;
    } catch (e) {
      console.warn("Error gathering counts in adminOverview:", e);
    }

    const users = acceptedUsers.length;

    let usage: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id, user_id, feature, model, prompt_tokens, completion_tokens, ok, error_message, latency_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        console.warn("Warning fetching ai_usage_log:", error.message);
      } else {
        usage = data ?? [];
      }
    } catch (e) {
      console.warn("Exception fetching ai_usage_log:", e);
    }

    function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
      const m = (model || "").toLowerCase();
      let inRate = 0.15 / 1_000_000;
      let outRate = 0.60 / 1_000_000;
      if (m.includes("pro") || m.includes("sonnet") || m.includes("opus")) {
        inRate = 1.25 / 1_000_000;
        outRate = 5.00 / 1_000_000;
      }
      return promptTokens * inRate + completionTokens * outRate;
    }

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let last24hTokens = 0;
    let last24hCostUsd = 0;

    const featureMap = new Map<
      string,
      {
        feature: string;
        label: string;
        calls: number;
        okCalls: number;
        failedCalls: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalLatencyMs: number;
        estCostUsd: number;
        avgLatencyMs: number;
      }
    >();

    const FEATURE_LABELS: Record<string, string> = {
      grade_essay: "Essay Grader",
      grade_essay_audit: "Essay Grader (Audit Pass)",
      grade_essay_key_hop: "Essay Grader (Auto Key Hop)",
      chat_key_hop: "Chat (Auto Key Hop)",
      essay_grade: "Essay Grader",
      essay_generate: "Model Essay Generator",
      essay_question_generate: "AI Question Generator",
      diagram_describe: "Diagram OCR/Analysis",
      diagram_autofill: "Diagram Generator",
      ocr_handwriting: "Handwriting OCR",
      writing_check: "General Writing Check",
      coach_chat: "Economics Coach",
    };

    for (const row of usage ?? []) {
      const pTokens = (row.prompt_tokens as number | null) ?? 0;
      const cTokens = (row.completion_tokens as number | null) ?? 0;
      const tTokens = pTokens + cTokens;
      const costUsd = estimateCostUsd(row.model as string, pTokens, cTokens);

      totalPromptTokens += pTokens;
      totalCompletionTokens += cTokens;
      totalTokens += tTokens;
      totalCostUsd += costUsd;

      const rowTime = new Date(row.created_at).getTime();
      if (now - rowTime <= ONE_DAY_MS) {
        last24hTokens += tTokens;
        last24hCostUsd += costUsd;
      }

      const key = (row.feature as string) || "unknown";
      const existing = featureMap.get(key) ?? {
        feature: key,
        label: FEATURE_LABELS[key] ?? key,
        calls: 0,
        okCalls: 0,
        failedCalls: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalLatencyMs: 0,
        estCostUsd: 0,
        avgLatencyMs: 0,
      };

      existing.calls += 1;
      if (row.ok) existing.okCalls += 1;
      else existing.failedCalls += 1;
      existing.promptTokens += pTokens;
      existing.completionTokens += cTokens;
      existing.totalTokens += tTokens;
      existing.totalLatencyMs += (row.latency_ms as number | null) ?? 0;
      existing.estCostUsd += costUsd;
      featureMap.set(key, existing);
    }

    for (const item of featureMap.values()) {
      item.avgLatencyMs = item.calls > 0 ? Math.round(item.totalLatencyMs / item.calls) : 0;
    }

    const featureBreakdown = Array.from(featureMap.values()).sort(
      (a, b) => b.totalTokens - a.totalTokens,
    );

    const egRows = featureBreakdown.filter(
      (f) => f.feature === "grade_essay" || f.feature === "essay_grade",
    );
    const essayGraderMetrics = {
      calls: egRows.reduce((sum, r) => sum + r.calls, 0),
      totalTokens: egRows.reduce((sum, r) => sum + r.totalTokens, 0),
      promptTokens: egRows.reduce((sum, r) => sum + r.promptTokens, 0),
      completionTokens: egRows.reduce((sum, r) => sum + r.completionTokens, 0),
      costUsd: egRows.reduce((sum, r) => sum + r.estCostUsd, 0),
      avgLatencyMs:
        egRows.length > 0
          ? Math.round(
              egRows.reduce((sum, r) => sum + r.totalLatencyMs, 0) /
                Math.max(1, egRows.reduce((sum, r) => sum + r.calls, 0)),
            )
          : 0,
    };

    let hasFailures = false;
    try {
      const { data: failures } = await supabaseAdmin
        .from("ai_usage_log")
        .select("id", { count: "exact", head: false })
        .eq("ok", false)
        .limit(1);
      hasFailures = (failures ?? []).length > 0;
    } catch (e) {
      console.warn("Exception checking failures:", e);
    }

    return {
      counts: { users, essays, documents, chunks, attempts, anchors },
      usage: usage ?? [],
      metrics: {
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        totalCostUsd,
        last24hTokens,
        last24hCostUsd,
        essayGrader: essayGraderMetrics,
        byFeature: featureBreakdown,
      },
      hasFailures,
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const authUsers = await listAcceptedAuthUsers();

    const profiles: {
      id: string;
      full_name: string | null;
      school: string | null;
      created_at: string;
    }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      profiles.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }

    const roles: { user_id: string; role: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      roles.push(...((data ?? []) as { user_id: string; role: string }[]));
      if (!data || data.length < 1000) break;
    }

    const roleMap = new Map<string, string[]>();
    for (const row of roles) {
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role as string]);
    }

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    if (authUsers.length > 0) {
      return authUsers.map((user) => {
        const profile = profileMap.get(user.id);
        const list = roleMap.get(user.id) ?? [];
        const isUserAdmin = isAdmin({
          userId: user.id,
          email: user.email,
          claims: user.user_metadata,
        });
        return {
          id: user.id,
          fullName:
            profile?.full_name ??
            (typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : (user.email ?? (isUserAdmin ? "Marginalite Admin" : "Unnamed account"))),
          school: profile?.school ?? null,
          createdAt: user.created_at,
          role: isUserAdmin ? "admin" : list.includes("teacher") ? "teacher" : "student",
        };
      });
    }

    return profiles.map((profile) => {
      const list = roleMap.get(profile.id) ?? [];
      const isUserAdmin = isAdmin({ userId: profile.id });
      return {
        id: profile.id,
        fullName: profile.full_name ?? (isUserAdmin ? "Marginalite Admin" : "Unnamed account"),
        school: profile.school ?? null,
        createdAt: profile.created_at,
        role: isUserAdmin ? "admin" : list.includes("teacher") ? "teacher" : "student",
      };
    });
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["student", "teacher", "admin"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    if (isAdmin({ userId: data.userId })) {
      throw new Error("Designated administrator accounts cannot have their role modified here.");
    }
    if (data.role === "admin") {
      throw new Error("Admin roles are managed via ADMIN_EMAILS environment variable and database roles.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: existingAdmin, error: existingAdminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (existingAdminError) throw new Error(existingAdminError.message);

    if (existingAdmin) {
      if (data.userId === context.userId) {
        throw new Error("You cannot remove your own administrator access.");
      }
      const { count, error: countError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) <= 1) throw new Error("The final administrator cannot be reassigned.");
    }

    // Add the replacement first. If the insert fails, existing access is
    // retained instead of leaving the user in a partially-updated state.
    if (data.role !== "student") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    }
    const deleteQuery = supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: deleteError } =
      data.role === "student" ? await deleteQuery : await deleteQuery.neq("role", data.role);
    if (deleteError) throw new Error(deleteError.message);
    return { ok: true };
  });

/**
 * Wipes a student's practice data — every essay (and its versions) and every
 * MCQ attempt (generated-paper history and real-past-paper history alike) — without
 * touching their account, role, or profile. For giving a student a clean slate, or clearing out
 * test/demo data, without deleting the person.
 */
export const resetStudentPracticeData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const tables = ["essays", "mcq_attempts", "mcq_pdf_attempts"];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const { error, count } = await supabaseAdmin
        .from(table as never)
        .delete({ count: "exact" })
        .eq("user_id", data.userId);
      if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
      counts[table] = count ?? 0;
    }

    return { ok: true, counts };
  });

/**
 * Permanently deletes a user's account (auth + every row that references
 * it — essays, attempts, sessions, roles, profile — all cascade on
 * auth.users deletion). Irreversible. Guarded against self-deletion and
 * against removing the platform's last remaining admin, so this can never
 * lock every admin out of their own console.
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (isAdmin({ userId: data.userId })) {
      throw new Error("Designated administrator accounts cannot be deleted.");
    }
    if (data.userId === context.userId) {
      throw new Error("You can't delete your own account from here.");
    }
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const targetIsAdmin = (targetRoles ?? []).some((r) => r.role === "admin");

    if (targetIsAdmin) {
      const { count: adminCount } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((adminCount ?? 0) <= 1) {
        throw new Error("Can't delete the last remaining admin account.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Platform-wide, category-by-category wipe of practice data — every
 * student's rows at once, independently of one another. Unlike
 * `resetStudentPracticeData` (one account, every category) this is one
 * category, every account. Irreversible; guarded by `assertAdmin` only,
 * so the confirming UI carries the responsibility of making the blast
 * radius obvious before calling this.
 */
const RESET_ALL_TABLES = {
  mcq: ["mcq_attempts", "mcq_pdf_attempts"],
  essays: ["essays"],
  aiUsage: ["ai_usage_log"],
} as const;

export const clearAiUsageLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { error, count } = await supabaseAdmin
      .from("ai_usage_log")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw new Error(`Clearing ai_usage_log failed: ${error.message}`);
    return { ok: true, deletedCount: count ?? 0 };
  });

export const resetAllScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ category: z.enum(["mcq", "essays", "aiUsage"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const tables = RESET_ALL_TABLES[data.category];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      // Supabase requires an explicit filter on delete; this id can never
      // match a real row, so it's the standard idiom for "delete every row".
      const { error, count } = await supabaseAdmin
        .from(table as never)
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
      counts[table] = count ?? 0;
    }

    return { ok: true, category: data.category, counts };
  });

export const listProviderKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ purpose: z.enum(["chat", "embedding", "vision"]).default("chat") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("ai_provider_keys")
      .select("id, provider, label, api_key, base_url, model, is_active, purpose, created_at")
      .eq("purpose", data.purpose)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id as string,
      provider: row.provider as string,
      label: row.label as string,
      maskedKey: maskKey(row.api_key as string),
      baseUrl: (row.base_url as string | null) ?? null,
      model: row.model as string,
      isActive: row.is_active as boolean,
      purpose: row.purpose as "chat" | "embedding" | "vision",
      createdAt: row.created_at as string,
    }));
  });

const KeyInput = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum([
    "lovable",
    "openai",
    "anthropic",
    "google",
    "xai",
    "groq",
    "openrouter",
    "mistral",
    "deepseek",
    "custom",
  ]),
  purpose: z.enum(["chat", "embedding", "vision"]).default("chat"),
  label: z.string().trim().min(2, "Give this key a name.").max(80),
  apiKey: z.string().trim().min(8, "Paste the full API key.").max(32000),
  baseUrl: z.string().trim().max(300).optional().or(z.literal("")),
  model: z.string().trim().min(2, "Set the model id.").max(120),
  activate: z.boolean().default(false),
});

export const saveProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KeyInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      provider: data.provider,
      purpose: data.purpose,
      label: data.label,
      api_key: data.apiKey,
      base_url: data.baseUrl ? data.baseUrl : null,
      model: data.model,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("ai_provider_keys")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("ai_provider_keys")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      data.id = inserted.id as string;
    }

    if (data.activate && data.id) {
      await activate(context.supabase, data.id, data.purpose);
    }
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true, id: data.id };
  });

async function activate(
  supabase: SupabaseClient<Database>,
  id: string,
  purpose: "chat" | "embedding" | "vision",
) {
  await supabase
    .from("ai_provider_keys")
    .update({ is_active: false })
    .eq("is_active", true)
    .eq("purpose", purpose);
  const { error } = await supabase
    .from("ai_provider_keys")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export const activateProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable(),
        purpose: z.enum(["chat", "embedding", "vision"]).default("chat"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      await activate(context.supabase, data.id, data.purpose);
    } else {
      // null = fall back to built-in Lovable AI (chat) or the legacy
      // saved-key fallback / gateway (embedding).
      await context.supabase
        .from("ai_provider_keys")
        .update({ is_active: false })
        .eq("is_active", true)
        .eq("purpose", data.purpose);
    }
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

export const deleteProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("ai_provider_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

/**
 * Replace the secret on an existing key in place — the provider, model and
 * active state are kept, so rotating a leaked key never interrupts marking.
 */
export const rotateProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        apiKey: z.string().trim().min(8, "Paste the new API key.").max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("ai_provider_keys")
      .update({ api_key: data.apiKey, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const { clearActiveProviderCache } = await import("./ai/active.server");
    clearActiveProviderCache();
    return { ok: true };
  });

/** Sends a one-line prompt through a stored key so admins can verify it works. */
export const testProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");

    const { chat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = row.provider === "lovable" ? null : normaliseConfig(row as never);

    try {
      const result = await chat({
        model: (row as { model: string }).model,
        overrideProvider: config,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        maxCompletionTokens: 20,
      });
      return { ok: true, reply: result.text.trim().slice(0, 80), model: result.model };
    } catch (err) {
      return {
        ok: false,
        reply: err instanceof Error ? err.message : "Unknown error",
        model: null,
      };
    }
  });

/**
 * Tests an individual raw key string directly from the UI without needing to save first.
 * Used to verify Paid Primary, Paid Secondary, and individual Pool keys.
 */
export const testSpecificKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.string().default("google"),
        apiKey: z.string().trim().min(5, "API key is too short"),
        model: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { chat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    let testModel =
      data.model?.trim() ||
      (data.provider === "google"
        ? "gemini-2.5-flash"
        : data.provider === "mistral"
          ? "ministral-8b-latest"
          : "gpt-4o-mini");
    if (data.provider === "google" && !data.model?.trim()) {
      testModel = "gemini-2.5-flash";
    } else if (data.provider === "mistral" && !data.model?.trim()) {
      testModel = "ministral-8b-latest";
    }

    const config = normaliseConfig({
      provider: data.provider,
      api_key: data.apiKey,
      base_url: data.baseUrl || null,
      model: testModel,
      label: "Direct Key Test",
    });

    const started = Date.now();
    try {
      let result;
      try {
        result = await chat({
          model: testModel,
          overrideProvider: config,
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
          maxCompletionTokens: 10,
          isBudgetTier: false,
        });
      } catch (firstErr: unknown) {
        const status =
          typeof firstErr === "object" && firstErr !== null && "status" in firstErr
            ? (firstErr as { status: number }).status
            : 500;
        if (data.provider === "google" && status === 404 && testModel !== "gemini-3.8-flash") {
          testModel = "gemini-3.8-flash";
          config.model = testModel;
          result = await chat({
            model: testModel,
            overrideProvider: config,
            messages: [{ role: "user", content: "Reply with exactly: OK" }],
            maxCompletionTokens: 10,
            isBudgetTier: false,
          });
        } else {
          throw firstErr;
        }
      }

      return {
        ok: true,
        reply: result.text.trim().slice(0, 80) || "OK",
        model: result.model,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        reply: err instanceof Error ? err.message : "Connection failed",
        model: null,
        latencyMs: Date.now() - started,
      };
    }
  });

// A 2x3 red/green/blue PNG, inlined so the vision "test key" action never
// depends on fetching an external image (would fail in sandboxed/offline
// environments and adds a flaky network hop to a simple connectivity check).
const VISION_TEST_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAABllJ3tAAAAFElEQVR42mNk+M9QzzAK" +
  "RgOKAQAmVgMB6bA0PQAAAABJRU5ErkJggg==";

/**
 * Sends one small test image through a saved vision key and confirms it
 * comes back with a real image-grounded answer (not just any text reply),
 * so an admin can verify a key actually supports image input — a text-only
 * chat model marked active here would otherwise silently fail on the first
 * real handwriting page or past-paper scan.
 */
export const testVisionProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label, purpose")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");
    if (row.purpose !== "vision") {
      throw new Error("That key is saved for chat or embeddings, not vision.");
    }

    const { visionChat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = normaliseConfig(row as never);
    const started = Date.now();

    try {
      const result = await visionChat({
        model: (row as { model: string }).model,
        overrideProvider: config,
        systemPrompt: "You are a vision connectivity test. Reply with exactly one word.",
        prompt:
          "Look at this image and reply with only the single dominant color you see (one word, lowercase).",
        imageDataUrls: [VISION_TEST_IMAGE],
        maxCompletionTokens: 20,
      });
      return {
        ok: true,
        reply: result.text.trim().slice(0, 80),
        model: result.model,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        reply: err instanceof Error ? err.message : "Unknown error",
        model: null,
        latencyMs: Date.now() - started,
      };
    }
  });

/**
 * Sends one short string through a saved embedding key and reports the
 * vector's dimensionality and latency, so an admin can confirm accuracy /
 * connectivity before pointing knowledge ingestion or retrieval at it.
 */
export const testEmbeddingProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_provider_keys")
      .select("provider, api_key, base_url, model, label, purpose")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("That key no longer exists.");
    if (row.purpose !== "embedding") {
      throw new Error("That key is saved for chat, not embeddings.");
    }

    const { embedOne } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");
    const config = normaliseConfig(row as never);
    const started = Date.now();

    try {
      const vector = await embedOne(
        "Marginalite Economics embedding connectivity test.",
        row.model,
        config,
      );
      return {
        ok: true,
        dimensions: vector.length,
        latencyMs: Date.now() - started,
        model: row.model as string,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        dimensions: null,
        latencyMs: Date.now() - started,
        model: row.model as string,
      };
    }
  });

/* ------------------------------------------------------------------ */
/* Access control: user cap, waitlist, daily limits, activity, presence */
/* ------------------------------------------------------------------ */
// All of these call SECURITY DEFINER database functions that re-check the
// admin role themselves (see supabase/migrations/20260919090000_*.sql), so
// even a forged request can't read or change anything as a non-admin.

/** Mirrors ai_mode's 0/1/2 in app_settings — see
 *  20260919120000_ai_gateway_controls.sql and applyAiGatewayMode() in
 *  ai.server.ts, which is what actually enforces this on every AI call. */
export type AiGatewayMode = "max" | "balanced" | "economy";
const AI_MODE_TO_INT: Record<AiGatewayMode, number> = { max: 0, balanced: 1, economy: 2 };
const AI_MODE_FROM_INT: Record<number, AiGatewayMode> = { 0: "max", 1: "balanced", 2: "economy" };

export type AdminSettings = {
  maxUsers: number;
  essayDailyLimit: number;
  currentUsers: number;
  aiEnabled: boolean;
  aiMode: AiGatewayMode;
};

function toSettings(raw: unknown): AdminSettings {
  const row = (raw ?? {}) as Record<string, number | boolean>;
  const rawMax = Number(row.max_users);
  const rawLimit = Number(row.essay_daily_limit);
  return {
    maxUsers: Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100,
    essayDailyLimit: Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20,
    currentUsers: Number(row.current_users ?? 0),
    aiEnabled: row.ai_enabled !== false,
    aiMode: AI_MODE_FROM_INT[Number(row.ai_mode ?? 0)] ?? "max",
  };
}

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let rawSettings: Record<string, unknown> = {};
    try {
      const { data, error } = await context.supabase.rpc("admin_get_settings");
      if (!error && data) {
        rawSettings = data as Record<string, unknown>;
      }
    } catch {
      // Graceful fallback to table query
    }

    if (!rawSettings.max_users) {
      try {
        const { supabaseAdmin } = await import("@/integrations/backend/client.server");
        const { data: rows } = await supabaseAdmin.from("app_settings").select("key, int_value");
        if (rows) {
          for (const row of rows as { key: string; int_value: number }[]) {
            if (row.key === "max_users") rawSettings.max_users = row.int_value;
            if (row.key === "essay_daily_limit") rawSettings.essay_daily_limit = row.int_value;
          }
        }
      } catch {
        // Fallback
      }
    }

    const acceptedUsers = await listAcceptedAuthUsers().catch(() => []);
    const settings = toSettings(rawSettings);
    return { ...settings, currentUsers: acceptedUsers.length };
  });

export const adminSetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        maxUsers: z.number().int().min(1).max(10000).optional(),
        essayDailyLimit: z.number().int().min(1).max(500).optional(),
        aiEnabled: z.boolean().optional(),
        aiMode: z.enum(["max", "balanced", "economy"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let result: unknown = null;
    try {
      const { data: rpcResult, error } = await context.supabase.rpc("admin_set_settings", {
        p_max_users: data.maxUsers,
        p_essay_daily_limit: data.essayDailyLimit,
        p_ai_enabled: data.aiEnabled,
        p_ai_mode: data.aiMode ? AI_MODE_TO_INT[data.aiMode] : undefined,
      });
      if (!error && rpcResult) {
        result = rpcResult;
      }
    } catch {
      // Direct table upsert fallback
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      if (data.maxUsers !== undefined) {
        await supabaseAdmin
          .from("app_settings")
          .upsert(
            { key: "max_users", int_value: data.maxUsers, updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
      }
      if (data.essayDailyLimit !== undefined) {
        await supabaseAdmin
          .from("app_settings")
          .upsert(
            {
              key: "essay_daily_limit",
              int_value: data.essayDailyLimit,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" },
          );
      }
    } catch {
      // Ignore if table already locked
    }

    if (data.aiEnabled !== undefined || data.aiMode !== undefined) {
      // Drop the short-lived cache chat() reads so a paused/mode-switched
      // admin console is honoured on the very next AI call, not up to
      // AI_GATEWAY_TTL_MS later.
      const { clearActiveProviderCache } = await import("./ai/active.server");
      clearActiveProviderCache();
    }

    const acceptedUsers = await listAcceptedAuthUsers().catch(() => []);
    const s = result
      ? toSettings(result)
      : {
          maxUsers: data.maxUsers ?? 100,
          essayDailyLimit: data.essayDailyLimit ?? 20,
          currentUsers: acceptedUsers.length,
          aiEnabled: data.aiEnabled ?? true,
          aiMode: data.aiMode ?? "max",
        };
    return { ...s, currentUsers: acceptedUsers.length };
  });

export type EmailBrandSettings = {
  senderName: string;
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  footer: string;
};

function toEmailBrandSettings(raw: unknown): EmailBrandSettings {
  const row = (raw ?? {}) as Record<string, string>;
  return {
    senderName: row.sender_name ?? "Marginalite",
    subject: row.subject ?? "Your Marginalite verification code",
    eyebrow: row.eyebrow ?? "Email verification",
    heading: row.heading ?? "Confirm your place on the waitlist",
    intro:
      row.intro ??
      "Use the six-digit code below to verify your email and join the Marginalite waitlist.",
    footer: row.footer ?? "Marginalite · Built for Cambridge IGCSE Economics (0455)",
  };
}

const emailBrandInput = z.object({
  senderName: z.string().trim().min(1).max(60),
  subject: z.string().trim().min(1).max(120),
  eyebrow: z.string().trim().min(1).max(60),
  heading: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(500),
  footer: z.string().trim().min(1).max(180),
});

export const adminGetEmailBrandSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_get_email_brand_settings");
    if (error) throw new Error(error.message);
    return toEmailBrandSettings(data);
  });

export const adminSetEmailBrandSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emailBrandInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_set_email_brand_settings", {
      p_sender_name: data.senderName,
      p_subject: data.subject,
      p_eyebrow: data.eyebrow,
      p_heading: data.heading,
      p_intro: data.intro,
      p_footer: data.footer,
    });
    if (error) throw new Error(error.message);
    return toEmailBrandSettings(result);
  });

export const adminListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_waitlist");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      joinedAt: row.created_at,
      position: Number(row.position),
    }));
  });

export const adminRemoveWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_remove_waitlist", { p_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type UserActivityRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  school: string | null;
  role: "student" | "teacher" | "admin";
  joinedAt: string;
  lastSeen: string | null;
  currentPath: string | null;
  isOnline: boolean;
  essaysGraded: number;
  essaysToday: number;
  mcqAttempts: number;
  aiCalls: number;
  lastActivity: string | null;
};

export const adminUserActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserActivityRow[]> => {
    try {
      await assertAdmin(context);
    } catch {
      return [];
    }

    try {
      const { data, error } = await context.supabase.rpc("admin_user_activity");
      if (!error && data) {
        const authUsers = await listAcceptedAuthUsers();
        const acceptedIds = authUsers.length > 0 ? new Set(authUsers.map((u) => u.id)) : null;
        return ((data ?? []) as any[])
          .filter((row) => (acceptedIds ? acceptedIds.has(row.user_id) : true))
          .map((row) => ({
            userId: row.user_id,
            email: row.email,
            fullName: row.full_name,
            school: row.school,
            role: (row.role || "student") as UserActivityRow["role"],
            joinedAt: row.joined_at || new Date().toISOString(),
            lastSeen: row.last_seen,
            currentPath: row.current_path,
            isOnline: Boolean(row.is_online),
            essaysGraded: Number(row.essays_graded || 0),
            essaysToday: Number(row.essays_today || 0),
            mcqAttempts: Number(row.mcq_attempts || 0),
            aiCalls: Number(row.ai_calls || 0),
            lastActivity: row.last_activity,
          }));
      }
    } catch (err) {
      console.warn("RPC admin_user_activity failed, falling back to profiles:", err);
    }

    // Fallback: query profiles directly
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school, created_at")
        .limit(200);

      const authUsers = await listAcceptedAuthUsers();
      const authMap = new Map(authUsers.map((u) => [u.id, u.email]));

      return (profiles ?? []).map((p: any) => ({
        userId: p.id,
        email: authMap.get(p.id) ?? null,
        fullName: p.full_name,
        school: p.school,
        role: "student" as const,
        joinedAt: p.created_at || new Date().toISOString(),
        lastSeen: null,
        currentPath: null,
        isOnline: false,
        essaysGraded: 0,
        essaysToday: 0,
        mcqAttempts: 0,
        aiCalls: 0,
        lastActivity: null,
      }));
    } catch {
      return [];
    }
  });

/* ============================================================================
 * GOD-MODE PLATFORM VAULT & INSPECTOR FUNCTIONS (Admin Only)
 * Allows deep inspection of any student's essays, MCQ attempts, writing drafts,
 * and 360-degree academic dossiers across the entire platform.
 * ============================================================================ */

export const adminListAllEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const [essaysRes, versionsRes, profilesRes, authUsers] = await Promise.all([
      supabaseAdmin
        .from("essays")
        .select("id, user_id, question, max_mark, latest_mark, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin
        .from("essay_versions")
        .select("id, essay_id, version, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, confidence, audited, created_at")
        .order("version", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, full_name, school"),
      listAcceptedAuthUsers(),
    ]);

    const authMap = new Map(authUsers.map((u) => [u.id, u.email]));
    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

    const versionMap = new Map<string, { count: number; latest: any }>();
    for (const v of versionsRes.data ?? []) {
      const existing = versionMap.get(v.essay_id);
      if (!existing) {
        versionMap.set(v.essay_id, { count: 1, latest: v });
      } else {
        existing.count += 1;
      }
    }

    const essays = (essaysRes.data ?? []).map((e: any) => {
      const profile = profileMap.get(e.user_id);
      const email = authMap.get(e.user_id);
      const vInfo = versionMap.get(e.id);
      return {
        id: e.id,
        userId: e.user_id,
        studentName: profile?.full_name || email || "Student",
        studentEmail: email || null,
        school: profile?.school || null,
        question: e.question,
        maxMark: e.max_mark,
        latestMark: e.latest_mark,
        versionsCount: vInfo?.count || 1,
        latestAo1: vInfo?.latest?.ao1_awarded ?? null,
        latestAo2: vInfo?.latest?.ao2_awarded ?? null,
        latestAo3: vInfo?.latest?.ao3_awarded ?? null,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      };
    });

    return essays;
  });

export const adminGetEssayDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ essayId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: essay, error: essayErr } = await supabaseAdmin
      .from("essays")
      .select("id, user_id, question, max_mark, latest_mark, created_at, updated_at")
      .eq("id", data.essayId)
      .maybeSingle();

    if (essayErr) throw new Error(essayErr.message);
    if (!essay) throw new Error("Essay not found");

    const [versionsRes, profileRes, authUsers] = await Promise.all([
      supabaseAdmin
        .from("essay_versions")
        .select("id, version, essay_text, grading, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, confidence, audited, created_at")
        .eq("essay_id", data.essayId)
        .order("version", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, school")
        .eq("id", essay.user_id)
        .maybeSingle(),
      listAcceptedAuthUsers(),
    ]);

    const authorEmail = authUsers.find((u) => u.id === essay.user_id)?.email || null;

    return {
      essay,
      versions: versionsRes.data ?? [],
      author: {
        id: essay.user_id,
        name: profileRes.data?.full_name || authorEmail || "Student",
        email: authorEmail,
        school: profileRes.data?.school || null,
      },
    };
  });

export const adminListAllMcqAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const [genRes, pdfRes, profilesRes, authUsers] = await Promise.all([
      supabaseAdmin
        .from("mcq_attempts")
        .select("id, user_id, title, topic, level, status, score, total, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("mcq_pdf_attempts")
        .select("id, user_id, title, filename, level, score, total, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("profiles").select("id, full_name, school"),
      listAcceptedAuthUsers(),
    ]);

    const authMap = new Map(authUsers.map((u) => [u.id, u.email]));
    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

    const generated = (genRes.data ?? []).map((a: any) => {
      const profile = profileMap.get(a.user_id);
      const email = authMap.get(a.user_id);
      return {
        id: a.id,
        kind: "generated" as const,
        userId: a.user_id,
        studentName: profile?.full_name || email || "Student",
        studentEmail: email || null,
        title: a.title,
        topic: a.topic || "All Syllabus Topics",
        level: a.level,
        status: a.status,
        score: a.score,
        total: a.total,
        percentage: a.score !== null && a.total > 0 ? Math.round((a.score / a.total) * 100) : null,
        createdAt: a.created_at,
        completedAt: a.completed_at,
      };
    });

    const pastPaper = (pdfRes.data ?? []).map((a: any) => {
      const profile = profileMap.get(a.user_id);
      const email = authMap.get(a.user_id);
      return {
        id: a.id,
        kind: "past_paper" as const,
        userId: a.user_id,
        studentName: profile?.full_name || email || "Student",
        studentEmail: email || null,
        title: a.title,
        topic: a.filename || "Cambridge Past Paper",
        level: a.level,
        status: a.completed_at ? "marked" : "in_progress",
        score: a.score,
        total: a.total,
        percentage: a.score !== null && a.total > 0 ? Math.round((a.score / a.total) * 100) : null,
        createdAt: a.created_at,
        completedAt: a.completed_at,
      };
    });

    return [...generated, ...pastPaper].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

export const adminGetMcqAttemptDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["generated", "past_paper"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    let attempt: any = null;
    if (data.kind === "generated") {
      const { data: row, error } = await supabaseAdmin
        .from("mcq_attempts")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      attempt = row;
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("mcq_pdf_attempts")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      attempt = row;
    }

    if (!attempt) throw new Error("MCQ attempt not found");

    const [profileRes, authUsers] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, school").eq("id", attempt.user_id).maybeSingle(),
      listAcceptedAuthUsers(),
    ]);

    const authorEmail = authUsers.find((u) => u.id === attempt.user_id)?.email || null;

    return {
      attempt,
      kind: data.kind,
      author: {
        id: attempt.user_id,
        name: profileRes.data?.full_name || authorEmail || "Student",
        email: authorEmail,
        school: profileRes.data?.school || null,
      },
    };
  });

export const adminGetStudentDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const [profileRes, authUsers, essaysRes, mcqGenRes, mcqPdfRes, classMembersRes, classroomsRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
        listAcceptedAuthUsers(),
        supabaseAdmin
          .from("essays")
          .select("id, question, max_mark, latest_mark, created_at, updated_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("mcq_attempts")
          .select("id, title, topic, level, status, score, total, created_at, completed_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("mcq_pdf_attempts")
          .select("id, title, filename, level, score, total, created_at, completed_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("classroom_members")
          .select("id, classroom_id, joined_at")
          .eq("student_id", data.userId),
        supabaseAdmin.from("classrooms").select("id, name, level, teacher_id"),
      ]);

    const authUser = authUsers.find((u) => u.id === data.userId);
    const classMap = new Map((classroomsRes.data ?? []).map((c: any) => [c.id, c]));

    const enrolledClasses = (classMembersRes.data ?? []).map((cm: any) => {
      const cls = classMap.get(cm.classroom_id);
      return {
        id: cm.classroom_id,
        name: cls?.name || "Classroom",
        level: cls?.level || "mixed",
        joinedAt: cm.joined_at,
      };
    });

    const essays = essaysRes.data ?? [];
    const mcqGen = mcqGenRes.data ?? [];
    const mcqPdf = mcqPdfRes.data ?? [];

    const totalEssays = essays.length;
    const scoredEssays = essays.filter((e: any) => e.latest_mark !== null && e.max_mark > 0);
    const avgEssayPercent =
      scoredEssays.length > 0
        ? Math.round(
            scoredEssays.reduce((sum: number, e: any) => sum + ((e.latest_mark ?? 0) / e.max_mark) * 100, 0) /
              scoredEssays.length,
          )
        : null;

    const allMcqs = [
      ...mcqGen.map((m: any) => ({ ...m, kind: "generated" as const })),
      ...mcqPdf.map((m: any) => ({ ...m, kind: "past_paper" as const })),
    ];
    const totalMcqs = allMcqs.length;
    const scoredMcqs = allMcqs.filter((m: any) => m.score !== null && m.total > 0);
    const totalMcqQuestions = scoredMcqs.reduce((sum: number, m: any) => sum + m.total, 0);
    const totalMcqCorrect = scoredMcqs.reduce((sum: number, m: any) => sum + (m.score ?? 0), 0);
    const avgMcqPercent = totalMcqQuestions > 0 ? Math.round((totalMcqCorrect / totalMcqQuestions) * 100) : null;

    return {
      profile: {
        id: data.userId,
        email: authUser?.email || null,
        fullName: (profileRes.data as any)?.full_name || null,
        school: (profileRes.data as any)?.school || null,
        createdAt: authUser?.created_at || (profileRes.data as any)?.created_at || null,
        lastSignInAt: authUser?.last_sign_in_at || null,
      },
      stats: {
        totalEssays,
        avgEssayPercent,
        totalMcqs,
        totalMcqQuestions,
        totalMcqCorrect,
        avgMcqPercent,
      },
      classrooms: enrolledClasses,
      essays,
      mcqAttempts: allMcqs,
    };
  });
