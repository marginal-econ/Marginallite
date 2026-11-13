import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import {
  BACKEND_PUBLISHABLE_KEY,
  BACKEND_URL,
  createBackendFetch,
  requireBackendConfig,
} from "@/integrations/backend/config";
import { isMarginaliteAdmin } from "./auth-admin";
import { recordCouponUsageInDb } from "./coupon.functions";
import { assignUserSubscriptionTier, getUserSubscriptionDetails } from "./subscription.server";
import { TIER_LIMITS, type PlanTier } from "./usage-limits";

const ActivateInput = z.object({
  tier: z.string().min(1).max(50),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  signature: z.string().optional(),
  isSimulation: z.boolean().optional(),
  method: z.enum(["razorpay", "upi_direct", "sandbox"]).optional(),
  utrReference: z.string().optional(),
  couponCode: z.string().optional(),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  school: z.string().optional(),
});

const UpiSubmissionInput = z.object({
  tier: z.string().min(1).max(50),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  amount: z.number().int().min(1),
  utrReference: z.string().min(6).max(30),
  couponCode: z.string().optional(),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  school: z.string().optional(),
});

export async function getActiveMerchantUpiFromStore(): Promise<string> {
  // 1. Primary Store: definitions table (guaranteed active in Supabase)
  try {
    const { data: defRow } = await supabaseAdmin
      .from("definitions")
      .select("definition_text")
      .eq("term", "__SYS_MERCHANT_UPI__")
      .maybeSingle();

    if (defRow?.definition_text && defRow.definition_text.trim()) {
      return defRow.definition_text.trim();
    }
  } catch (err) {
    console.warn("Failed reading merchant UPI from definitions:", err);
  }

  // 2. Secondary Store: site_settings table (if table exists)
  try {
    const { data: settingsRow } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    if (
      settingsRow?.value &&
      typeof settingsRow.value === "object" &&
      (settingsRow.value as any).merchant_upi_id
    ) {
      return String((settingsRow.value as any).merchant_upi_id).trim();
    }
  } catch {
    /* fallback */
  }

  // 3. Fallback: Environment variable
  let envUpi: string | undefined;
  try {
    const { readEnv } = await import("@/server/env");
    envUpi = readEnv("MERCHANT_UPI_ID") || readEnv("VITE_MERCHANT_UPI_ID");
  } catch {
    /* server env not loaded yet */
  }
  if (!envUpi && typeof process !== "undefined") {
    envUpi = process.env?.MERCHANT_UPI_ID || process.env?.VITE_MERCHANT_UPI_ID;
  }

  if (envUpi && envUpi.trim()) {
    return envUpi.trim();
  }

  return "8754256082-2@ybl";
}

export async function setActiveMerchantUpiInStore(trimmedUpi: string): Promise<void> {
  // 1. Primary Store: definitions table
  try {
    const { data: existing } = await supabaseAdmin
      .from("definitions")
      .select("id")
      .eq("term", "__SYS_MERCHANT_UPI__")
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: trimmedUpi,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("definitions").insert({
        term: "__SYS_MERCHANT_UPI__",
        definition_text: trimmedUpi,
        category: "system_config",
        source_label: "admin_upi_setting",
      });
    }
  } catch (err) {
    console.error("Critical: Failed saving UPI to definitions table:", err);
    throw new Error(`Failed to persist UPI ID in database: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Secondary Store: site_settings table (for forward compatibility)
  try {
    const { data: row } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    const existing = (row?.value as Record<string, any>) || {};
    await supabaseAdmin
      .from("site_settings")
      .upsert({
        id: 1,
        value: {
          ...existing,
          merchant_upi_id: trimmedUpi,
        },
        updated_at: new Date().toISOString(),
      });
  } catch {
    /* non-fatal fallback */
  }
}

export const getPaymentConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    let keyId: string | undefined;
    try {
      const { readEnv } = await import("@/server/env");
      keyId = readEnv("RAZORPAY_KEY_ID") || readEnv("VITE_RAZORPAY_KEY_ID");
    } catch {
      /* ignore */
    }
    if (!keyId && typeof process !== "undefined") {
      keyId = process.env?.RAZORPAY_KEY_ID || process.env?.VITE_RAZORPAY_KEY_ID;
    }
    keyId = keyId || "rzp_test_marginal_placeholder";

    const merchantUpiId = await getActiveMerchantUpiFromStore();

    // 2. Optional Authentication: extract student details if session is active
    let currentTier: PlanTier = "free";
    let pendingRequest: {
      id: string;
      utr: string;
      tier: string;
      amount: number;
      submittedAt: string;
      status: string;
    } | null = null;

    try {
      const request = getRequest();
      const authHeader = request?.headers?.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length);
        if (token && token.split(".").length === 3) {
          requireBackendConfig();
          const supabase = createClient<any>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
            global: {
              fetch: createBackendFetch(BACKEND_PUBLISHABLE_KEY),
              headers: { Authorization: `Bearer ${token}` },
            },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data, error } = await supabase.auth.getClaims(token);
          if (!error && data?.claims?.sub) {
            const userId = data.claims.sub;
            const email =
              (typeof data.claims.email === "string" ? data.claims.email : null) ||
              (typeof (data.claims.user_metadata as any)?.email === "string"
                ? (data.claims.user_metadata as any).email
                : null);

            const currentSub = await getUserSubscriptionDetails(
              supabase,
              userId,
              email,
              data.claims,
            );
            currentTier = currentSub.tier;

            // Check if this student has an active pending UPI payment request in definitions
            const { data: userLogs } = await supabaseAdmin
              .from("definitions")
              .select("id, definition_text, created_at")
              .eq("category", "upi_payment_request")
              .ilike("definition_text", `%"userId":"${userId}"%`)
              .order("created_at", { ascending: false })
              .limit(5);

            if (userLogs && userLogs.length > 0) {
              for (const log of userLogs) {
                if (log.definition_text) {
                  try {
                    const parsed = JSON.parse(log.definition_text);
                    if (parsed.status === "pending") {
                      pendingRequest = {
                        id: log.id,
                        utr: parsed.utr,
                        tier: parsed.tier,
                        amount: parsed.amount,
                        submittedAt: parsed.submittedAt || log.created_at,
                        status: "pending",
                      };
                      break;
                    }
                  } catch {
                    /* ignore parse error */
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      /* non-authenticated visitor or SSR: safe public fallback */
    }

    return {
      keyId,
      merchantUpiId,
      isTestMode: keyId.startsWith("rzp_test_") || keyId.includes("placeholder"),
      currentTier,
      tierDetails: TIER_LIMITS,
      pendingRequest,
    };
  });

/**
 * Submits a direct UPI transaction UTR for administrator review and verification.
 * Enforces strictly 12-digit format and prevents duplicate submissions.
 */
export const submitUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpiSubmissionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const cleanUtr = data.utrReference.trim().replace(/\s+/g, "");

    // 1. Validate 12-digit numeric structure
    if (!/^\d{12}$/.test(cleanUtr)) {
      throw new Error(
        "Invalid UTR: Please enter the exact 12-digit numeric reference number from your GPay, PhonePe, or Paytm receipt.",
      );
    }

    // 2. Prevent duplicate UTR usage across all accounts
    const utrTerm = `__UPI_REQ_${cleanUtr}`;
    try {
      const { data: duplicate } = await supabaseAdmin
        .from("definitions")
        .select("id")
        .eq("term", utrTerm)
        .maybeSingle();

      if (duplicate?.id) {
        throw new Error(
          "This 12-digit UPI reference (UTR) has already been submitted for verification. If you have an inquiry, please contact administrator support.",
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes("already been submitted")) {
        throw err;
      }
    }

    // 3. Log the pending payment request in definitions
    const userEmail = (context as any).email || (context as any).claims?.email || "";
    const payload = {
      utr: cleanUtr,
      tier: data.tier,
      amount: data.amount,
      billingCycle: data.billingCycle,
      couponCode: data.couponCode ? data.couponCode.trim().toUpperCase() : null,
      userId,
      userEmail,
      fullName: data.fullName || null,
      phoneNumber: data.phoneNumber || null,
      location: data.location || null,
      school: data.school || null,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    try {
      if (data.fullName || data.school) {
        await supabaseAdmin
          .from("profiles")
          .update({
            ...(data.fullName ? { full_name: data.fullName } : {}),
            ...(data.school ? { school: data.school } : {}),
          })
          .eq("id", userId);
      }
    } catch {
      /* ignore profile sync errors */
    }

    await supabaseAdmin.from("definitions").insert({
      term: utrTerm,
      definition_text: JSON.stringify(payload),
      category: "upi_payment_request",
      source_label: cleanUtr,
    });

    const planName =
      data.tier === "school_starter"
        ? "Department Starter (50 seats)"
        : data.tier === "school_campus"
        ? "Campus Standard (150 seats)"
        : data.tier === "school_institution"
        ? "Institution Premium (400 seats)"
        : TIER_LIMITS[data.tier as PlanTier]?.name || data.tier;

    return {
      success: true,
      pending: true,
      utr: cleanUtr,
      tier: data.tier,
      tierName: planName,
      message: `Your payment reference (#${cleanUtr}) for the ${planName} plan has been submitted! It will be verified against our bank statement and activated shortly.`,
    };
  });

/**
 * Standard gateway or sandbox activation.
 */
export const activateSubscriptionTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const isSchoolTier = data.tier.startsWith("school_");
    const mappedTier: PlanTier = isSchoolTier ? "elite" : (data.tier as PlanTier);

    // Sync profile details if provided
    try {
      if (data.fullName || data.school) {
        await supabaseAdmin
          .from("profiles")
          .update({
            ...(data.fullName ? { full_name: data.fullName } : {}),
            ...(data.school ? { school: data.school } : {}),
          })
          .eq("id", userId);
      }
    } catch {
      /* ignore profile sync errors */
    }

    // Log the transaction attempt
    try {
      const contactInfo = `[Cust: ${data.fullName || "N/A"} | Ph: ${data.phoneNumber || "N/A"} | Loc: ${data.location || "N/A"} | Sch: ${data.school || "N/A"}]`;
      const errorMsg = data.utrReference
        ? `Direct UPI UTR: ${data.utrReference} ${contactInfo}`
        : data.isSimulation
          ? `Activated via sandbox instant verification${data.couponCode ? ` (Coupon: ${data.couponCode})` : ""} ${contactInfo}`
          : `Razorpay payment ID: ${data.paymentId ?? "direct"}${data.couponCode ? ` (Coupon: ${data.couponCode})` : ""} ${contactInfo}`;

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "payment_activation",
        model: `tier_${data.tier}`,
        ok: true,
        error_message: errorMsg,
      });
    } catch {
      /* logging failure is non-fatal */
    }

    const result = await assignUserSubscriptionTier(supabaseAdmin, userId, mappedTier);
    if (!result.success) {
      throw new Error(result.message);
    }

    if (data.couponCode) {
      await recordCouponUsageInDb(data.couponCode);
    }

    const limits = TIER_LIMITS[mappedTier];
    const planName =
      data.tier === "school_starter"
        ? "School Department Starter (50 seats)"
        : data.tier === "school_campus"
        ? "School Campus Standard (150 seats)"
        : data.tier === "school_institution"
        ? "School Institution Premium (400 seats)"
        : limits.name;

    return {
      success: true,
      tier: data.tier,
      tierName: planName,
      liveExaminerCredits: limits.liveExaminerCredits,
      maxEssays: limits.maxEssaysPerMonth,
      message: `Congratulations! Your ${planName} is now active with ${limits.liveExaminerCredits} Live Examiner credits.`,
    };
  });

/* ── Admin Management Functions ────────────────────────────────────────── */

/**
 * Lists all incoming UPI payment verification requests for Admin review.
 */
export const listUpiPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = isMarginaliteAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can review payment approvals.");
    }

    const { data: rows, error } = await supabaseAdmin
      .from("definitions")
      .select("id, term, definition_text, created_at, updated_at")
      .eq("category", "upi_payment_request")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    // Map rows to clean typed request objects
    const requests = (rows || []).map((row) => {
      let parsed: any = {};
      try {
        if (row.definition_text) {
          parsed = JSON.parse(row.definition_text);
        }
      } catch {
        parsed = { utr: row.term.replace("__UPI_REQ_", ""), status: "pending" };
      }

      return {
        id: row.id,
        userId: parsed.userId || "",
        userEmail: parsed.userEmail || "Student (" + (parsed.userId?.slice(0, 8) || "") + ")",
        tier: (parsed.tier || "foundation") as PlanTier,
        amount: parsed.amount || (parsed.tier === "foundation" ? 99 : parsed.tier === "scholar_plus" ? 199 : parsed.tier === "pro" ? 399 : parsed.tier === "mastery" ? 699 : 999),
        utr: parsed.utr || row.term.replace("__UPI_REQ_", ""),
        status: (parsed.status || "pending") as "pending" | "approved" | "rejected",
        submittedAt: parsed.submittedAt || row.created_at,
        reviewedAt: parsed.reviewedAt,
        reviewedBy: parsed.reviewedBy,
        rejectionReason: parsed.rejectionReason,
        couponCode: parsed.couponCode || null,
      };
    });

    return { requests };
  });

/**
 * Admin action: approves a student's UPI payment, unlocks their tier, and grants credits.
 */
export const approveUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        userId: z.string(),
        tier: z.string().min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginaliteAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can approve payments.");
    }

    // 1. Upgrade user tier and assign credits
    const isSchoolTier = data.tier.startsWith("school_");
    const mappedTier: PlanTier = isSchoolTier ? "elite" : (data.tier as PlanTier);
    const result = await assignUserSubscriptionTier(supabaseAdmin, data.userId, mappedTier);
    if (!result.success) {
      throw new Error(result.message);
    }

    // 2. Update log record in definitions with approved state
    const { data: row } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (row?.definition_text) parsed = JSON.parse(row.definition_text);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: "Marginalite Admin",
    };

    if (row?.id) {
      await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: JSON.stringify(updatedPayload),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }

    if (parsed.couponCode) {
      await recordCouponUsageInDb(parsed.couponCode);
    }

    const limits = (TIER_LIMITS as any)[data.tier] || { name: data.tier, liveExaminerCredits: 0 };
    return {
      success: true,
      message: `Payment verified! User upgraded to ${limits.name} (${limits.liveExaminerCredits} Live Examiner credits unlocked).`,
    };
  });

/**
 * Admin action: rejects a fraudulent or invalid UPI submission.
 */
export const rejectUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        reason: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginaliteAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can reject payments.");
    }

    const { data: row } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (row?.definition_text) parsed = JSON.parse(row.definition_text);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: "Marginalite Admin",
      rejectionReason: data.reason || "UTR reference not found in bank statement.",
    };

    if (row?.id) {
      await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: JSON.stringify(updatedPayload),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }

    return {
      success: true,
      message: "Payment submission rejected and logged.",
    };
  });

/**
 * Admin action: revokes an approved subscription if a dispute occurs or bank payment bounced.
 */
export const revokeUpiPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string(),
        userId: z.string(),
        reason: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginaliteAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can revoke payments.");
    }

    // Reset user to free tier
    await assignUserSubscriptionTier(supabaseAdmin, data.userId, "free");

    const { data: row } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text")
      .eq("id", data.logId)
      .maybeSingle();

    let parsed: any = {};
    try {
      if (row?.definition_text) parsed = JSON.parse(row.definition_text);
    } catch {}

    const updatedPayload = {
      ...parsed,
      status: "rejected",
      revokedAt: new Date().toISOString(),
      rejectionReason: data.reason || "Subscription access revoked by administrator.",
    };

    if (row?.id) {
      await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: JSON.stringify(updatedPayload),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }

    return {
      success: true,
      message: "User plan revoked and reset to Free tier.",
    };
  });

/**
 * Admin action: updates the active Merchant UPI ID dynamically.
 * Persists immediately and reflects across all pages in real time.
 */
export const updateMerchantUpiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ upiId: z.string().min(3).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = isMarginaliteAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can update merchant UPI.");
    }

    const trimmedUpi = data.upiId.trim();

    // Persist to database definitions and site_settings
    await setActiveMerchantUpiInStore(trimmedUpi);

    return {
      success: true,
      merchantUpiId: trimmedUpi,
      message: `Merchant UPI handle updated to ${trimmedUpi}! Reflecting live across the platform.`,
    };
  });
