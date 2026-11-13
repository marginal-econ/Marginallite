import type { SupabaseClient } from "@supabase/supabase-js";
import { isMarginaliteAdmin } from "@/lib/auth-admin";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import {
  FREE_TIER_ESSAY_LIMIT,
  FREE_TEACHER_ESSAY_LIMIT,
  MCQ_FREE_TRIAL_DAYS,
  TIER_LIMITS,
  type PlanTier,
  type UserSubscriptionDetails,
} from "./usage-limits";

/**
 * Resolves the full subscription, credit balance, and usage state for a given user.
 * Always utilizes authoritative server admin access to read definitions, avoiding RLS blocking.
 */
export async function getUserSubscriptionDetails(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  userEmail?: string | null,
  userClaims?: any,
): Promise<UserSubscriptionDetails> {
  const isAdminUser = isMarginaliteAdmin({ userId, email: userEmail, claims: userClaims });

  if (isAdminUser) {
    return {
      tier: "elite",
      tierName: "Cambridge Elite (Admin Pass)",
      isPaid: true,
      isAdmin: true,
      essaysGradedCount: 0,
      essaysLimit: 9999,
      essaysRemaining: 9999,
      canGradeEssay: true,
      liveExaminerCredits: 999,
      canUseLiveExaminer: true,
      mcqFreeDaysRemaining: 365,
      canUseMCQ: true,
    };
  }

  // Authoritative server-side database access (uses passed client, with admin fallback)
  const db: SupabaseClient<any, any, any> = supabase ?? supabaseAdmin;

  // 1. Resolve tier from persistent subscription store and claims
  let activeTier: PlanTier = "free";
  let isTeacher = false;

  // 1a. Check persistent subscription in definitions table (__USER_SUB_<userId>)
  let userQuotaResetAt: string | null = null;
  try {
    const { data: subRow } = await db
      .from("definitions")
      .select("definition_text")
      .eq("term", `__USER_SUB_${userId}`)
      .maybeSingle();

    if (subRow?.definition_text) {
      try {
        const parsed = JSON.parse(subRow.definition_text);
        if (parsed.tier && ["foundation", "scholar_plus", "pro", "mastery", "elite"].includes(parsed.tier)) {
          activeTier = parsed.tier as PlanTier;
        }
        if (parsed.quotaResetAt) {
          userQuotaResetAt = parsed.quotaResetAt;
        }
      } catch {}
    }
  } catch (err) {
    console.warn("Could not query definitions for user sub:", err);
  }

  // 1b. Check global quota baseline reset timestamp
  let globalResetAt: string | null = null;
  try {
    const { data: globalResetRow } = await db
      .from("definitions")
      .select("definition_text")
      .eq("term", "__GLOBAL_QUOTA_BASELINE_RESET")
      .maybeSingle();
    if (globalResetRow?.definition_text) {
      globalResetAt = globalResetRow.definition_text;
    }
  } catch {}

  let effectiveResetAt: string | null = null;
  if (userQuotaResetAt && globalResetAt) {
    try {
      effectiveResetAt =
        new Date(userQuotaResetAt) > new Date(globalResetAt)
          ? userQuotaResetAt
          : globalResetAt;
    } catch {
      effectiveResetAt = userQuotaResetAt || globalResetAt;
    }
  } else {
    effectiveResetAt = userQuotaResetAt || globalResetAt;
  }

  // 1c. Check approved UPI payment request if not yet set
  if (activeTier === "free") {
    try {
      const { data: upiLogs } = await db
        .from("definitions")
        .select("definition_text")
        .eq("category", "upi_payment_request")
        .ilike("definition_text", `%"userId":"${userId}"%`)
        .limit(10);

      if (upiLogs && upiLogs.length > 0) {
        for (const log of upiLogs) {
          if (log.definition_text) {
            try {
              const parsed = JSON.parse(log.definition_text);
              if (parsed.status === "approved" && parsed.tier && ["foundation", "scholar_plus", "pro", "mastery", "elite"].includes(parsed.tier)) {
                activeTier = parsed.tier as PlanTier;
                break;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 1d. Check claims app_metadata / user_metadata
  if (activeTier === "free") {
    const claimTier = userClaims?.app_metadata?.tier || userClaims?.user_metadata?.tier;
    if (claimTier && ["foundation", "scholar_plus", "pro", "mastery", "elite"].includes(claimTier)) {
      activeTier = claimTier as PlanTier;
    }
  }

  // 1e. Check roles in user_roles table
  try {
    const { data: roles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleNames = (roles ?? []).map((r: any) => r.role);
    if (roleNames.includes("admin") && isMarginaliteAdmin({ userId })) {
      activeTier = "elite";
    }

    if (roleNames.includes("teacher") || userClaims?.user_metadata?.role === "teacher") {
      isTeacher = true;
    }
  } catch (err) {
    console.warn("Could not query user_roles for subscription, defaulting to free:", err);
  }

  // 2. Count essays and evaluated versions within current cycle (prevents rewrite loophole)
  let essaysGradedCount = 0;
  try {
    let query = db
      .from("essays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (effectiveResetAt && typeof query.gte === "function") {
      query = query.gte("created_at", effectiveResetAt);
    }

    const { count, error } = await query;
    if (!error && typeof count === "number") {
      essaysGradedCount = count;
    }

    // Also count total essay versions evaluated to ensure rewrites are strictly counted
    let evQuery = db
      .from("essay_versions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (effectiveResetAt && typeof evQuery.gte === "function") {
      evQuery = evQuery.gte("created_at", effectiveResetAt);
    }

    const { count: evCount, error: evError } = await evQuery;
    if (!evError && typeof evCount === "number") {
      essaysGradedCount = Math.max(essaysGradedCount, evCount);
    }
  } catch (err) {
    console.warn("Could not query essays count for user:", err);
  }

  // 3. Count Live Examiner session credits used this cycle
  let liveCreditsUsed = 0;
  try {
    let query = db
      .from("live_examiner_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (effectiveResetAt && typeof query.gte === "function") {
      query = query.gte("created_at", effectiveResetAt);
    }

    const { count } = await query;
    liveCreditsUsed = count ?? 0;
  } catch {
    /* table might be empty */
  }

  const limits = TIER_LIMITS[activeTier];
  const isPaid = activeTier !== "free";

  let essaysLimit = limits.maxEssaysPerMonth;
  if (isTeacher) {
    // Teachers get 3 free trial essay evaluations; paid educator pass gets full tier limits.
    essaysLimit = isPaid ? limits.maxEssaysPerMonth : FREE_TEACHER_ESSAY_LIMIT;
  } else if (activeTier === "free") {
    essaysLimit = FREE_TIER_ESSAY_LIMIT;
  }

  const essaysRemaining = Math.max(0, essaysLimit - essaysGradedCount);
  const canGradeEssay = essaysRemaining > 0;

  const allocatedCredits = limits.liveExaminerCredits;
  const remainingCredits = Math.max(0, allocatedCredits - liveCreditsUsed);
  // Live examiner is strictly for paid accounts with remaining credits (both teachers and students must pay)
  const canUseLiveExaminer = limits.liveExaminerEnabled && remainingCredits > 0;

  let mcqFreeDaysRemaining: number = limits.mcqFreeDays;
  let canUseMCQ = true;

  if (activeTier === "free") {
    try {
      const { data: profile } = await db
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.created_at) {
        const createdDate = new Date(profile.created_at);
        const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        mcqFreeDaysRemaining = Math.max(0, MCQ_FREE_TRIAL_DAYS - daysSinceCreation);
      }
    } catch {
      /* fallback to default */
    }
    canUseMCQ = mcqFreeDaysRemaining > 0;
  }

  return {
    tier: activeTier,
    tierName: isTeacher
      ? isPaid
        ? `Educator AI Pass (${limits.name})`
        : "Educator Academic Staff"
      : limits.name,
    isPaid,
    isAdmin: false,
    isTeacher,
    essaysGradedCount,
    essaysLimit,
    essaysRemaining,
    canGradeEssay,
    liveExaminerCredits: remainingCredits,
    canUseLiveExaminer,
    mcqFreeDaysRemaining,
    canUseMCQ,
  };
}

/**
 * Assigns or upgrades a subscription tier for a user.
 */
export async function assignUserSubscriptionTier(
  client: SupabaseClient<any, any, any>,
  userId: string,
  tier: PlanTier,
): Promise<{ success: boolean; message: string }> {
  try {
    const db = supabaseAdmin ?? client;
    const termKey = `__USER_SUB_${userId}`;
    const payload = JSON.stringify({
      tier,
      updatedAt: new Date().toISOString(),
      quotaResetAt: new Date().toISOString(),
    });

    const { data: existing } = await db
      .from("definitions")
      .select("id")
      .eq("term", termKey)
      .maybeSingle();

    if (existing?.id) {
      await db
        .from("definitions")
        .update({
          definition_text: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await db.from("definitions").insert({
        term: termKey,
        definition_text: payload,
        category: "user_subscription",
        source_label: "subscription_manager",
      });
    }

    // Also attempt updating user auth app_metadata and user_metadata if accessible
    try {
      await db.auth.admin.updateUserById(userId, {
        app_metadata: { tier },
        user_metadata: { tier },
      });
    } catch {}

    return {
      success: true,
      message: `Successfully updated plan to ${TIER_LIMITS[tier].name}.`,
    };
  } catch (err: any) {
    console.error("Failed to assign subscription tier:", err);
    return {
      success: false,
      message: err?.message || "Failed to assign subscription tier.",
    };
  }
}

/**
 * Resets all user limits across the platform to baseline according to their account tier.
 */
export async function resetAllUserLimitsToBaseline(
  client?: SupabaseClient<any, any, any>,
): Promise<{ success: boolean; resetAt: string; message: string }> {
  try {
    const db = client ?? supabaseAdmin;
    const now = new Date().toISOString();

    // 1. Set global baseline reset timestamp in definitions
    const { data: existing } = await db
      .from("definitions")
      .select("id")
      .eq("term", "__GLOBAL_QUOTA_BASELINE_RESET")
      .maybeSingle();

    if (existing?.id) {
      await db
        .from("definitions")
        .update({ definition_text: now, updated_at: now })
        .eq("id", existing.id);
    } else {
      await db.from("definitions").insert({
        term: "__GLOBAL_QUOTA_BASELINE_RESET",
        definition_text: now,
        category: "system_quota",
        source_label: "admin_quota_manager",
      });
    }

    // 2. Clear all daily locks from daily_feature_usage
    try {
      await db.from("daily_feature_usage").delete().neq("uses", -9999);
    } catch (err) {
      console.warn("Could not clear daily_feature_usage:", err);
    }

    return {
      success: true,
      resetAt: now,
      message: "All user limits have been successfully reset to baseline according to their account tier.",
    };
  } catch (err: any) {
    console.error("Failed to reset user limits:", err);
    return {
      success: false,
      resetAt: new Date().toISOString(),
      message: err?.message || "Failed to reset limits.",
    };
  }
}
