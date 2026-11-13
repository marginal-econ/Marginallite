import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { DEFAULT_PRICING_PLANS, type PlatformPricingPlans } from "./pricing-plans";
import { assignUserSubscriptionTier } from "./subscription.server";
import type { PlanTier } from "./usage-limits";

/**
 * Public server function: retrieves the current active platform pricing plans.
 * Dynamic: reads custom prices set by Admin from site_settings (or defaults).
 */
export const getPlatformPricing = createServerFn({ method: "GET" }).handler(async () => {
  // 1. Primary: definitions table
  try {
    const { data: defRow } = await supabaseAdmin
      .from("definitions")
      .select("definition_text")
      .eq("term", "__SYS_PRICING_PLANS__")
      .maybeSingle();

    if (defRow?.definition_text) {
      const customPlans = JSON.parse(defRow.definition_text);
      return {
        plans: {
          foundation: { ...DEFAULT_PRICING_PLANS.foundation, ...customPlans.foundation },
          pro: { ...DEFAULT_PRICING_PLANS.pro, ...customPlans.pro },
          mastery: { ...DEFAULT_PRICING_PLANS.mastery, ...customPlans.mastery },
          elite: { ...DEFAULT_PRICING_PLANS.elite, ...customPlans.elite },
        } as PlatformPricingPlans,
        isCustom: true,
      };
    }
  } catch (err) {
    console.warn("Exception reading custom pricing from definitions:", err);
  }

  // 2. Secondary: site_settings table
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && "pricing_plans" in data.value) {
      const customPlans = (data.value as any).pricing_plans;
      return {
        plans: {
          foundation: { ...DEFAULT_PRICING_PLANS.foundation, ...customPlans.foundation },
          scholar_plus: { ...DEFAULT_PRICING_PLANS.scholar_plus, ...customPlans.scholar_plus },
          pro: { ...DEFAULT_PRICING_PLANS.pro, ...customPlans.pro },
          mastery: { ...DEFAULT_PRICING_PLANS.mastery, ...customPlans.mastery },
          elite: { ...DEFAULT_PRICING_PLANS.elite, ...customPlans.elite },
        } as PlatformPricingPlans,
        isCustom: true,
      };
    }
  } catch (err) {
    console.warn("Exception in getPlatformPricing, using defaults:", err);
  }

  return { plans: DEFAULT_PRICING_PLANS, isCustom: false };
});

const TierUpdateSchema = z.object({
  tier: z.enum(["foundation", "scholar_plus", "pro", "mastery", "elite"]),
  monthlyPrice: z.number().int().min(0).max(100000),
  annualPrice: z.number().int().min(0).max(1000000),
  essaysPerMonth: z.number().int().min(1).max(99999),
  liveCredits: z.number().int().min(0).max(99999),
  hasExperimentalLabs: z.boolean().optional(),
});

/**
 * Admin-only server function: updates prices, quotas, and credit allowances for any tier.
 * Immediately persists to site_settings and reflects across the entire platform.
 */
export const updatePlatformPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TierUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can modify pricing plans.");
    }

    // Retrieve existing site_settings
    let existingValue: Record<string, any> = {};
    try {
      const { data: row } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("id", 1)
        .maybeSingle();
      if (row?.value && typeof row.value === "object") {
        existingValue = row.value;
      }
    } catch {
      existingValue = {};
    }

    const currentPricing = existingValue.pricing_plans || DEFAULT_PRICING_PLANS;
    const tierKey = data.tier as keyof PlatformPricingPlans;

    const baseTier = currentPricing[tierKey] || DEFAULT_PRICING_PLANS[tierKey];
    const savePct =
      data.annualPrice > 0 && data.monthlyPrice > 0
        ? Math.max(0, Math.round((1 - data.annualPrice / (data.monthlyPrice * 12)) * 100))
        : baseTier.savePct;
    const annualEquivalentMonthly =
      data.annualPrice > 0 ? Math.round(data.annualPrice / 12) : data.monthlyPrice;

    const updatedTier = {
      ...baseTier,
      monthlyPrice: data.monthlyPrice,
      annualPrice: data.annualPrice,
      annualEquivalentMonthly,
      savePct,
      essaysPerMonth: data.essaysPerMonth,
      liveCredits: data.liveCredits,
      hasExperimentalLabs:
        data.hasExperimentalLabs !== undefined
          ? data.hasExperimentalLabs
          : baseTier.hasExperimentalLabs,
    };

    const nextPricing = {
      ...currentPricing,
      [tierKey]: updatedTier,
    };

    // 1. Primary: Save to definitions table (persistent, reliable)
    try {
      const { data: existing } = await supabaseAdmin
        .from("definitions")
        .select("id")
        .eq("term", "__SYS_PRICING_PLANS__")
        .maybeSingle();

      if (existing?.id) {
        await supabaseAdmin
          .from("definitions")
          .update({
            definition_text: JSON.stringify(nextPricing),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("definitions").insert({
          term: "__SYS_PRICING_PLANS__",
          definition_text: JSON.stringify(nextPricing),
          category: "system_config",
          source_label: "admin_pricing_plans",
        });
      }
    } catch (err) {
      console.warn("Failed saving pricing plans to definitions table:", err);
    }

    // 2. Secondary: site_settings table (if available)
    try {
      await supabaseAdmin.from("site_settings").upsert({
        id: 1,
        value: {
          ...existingValue,
          pricing_plans: nextPricing,
        },
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* non-fatal fallback */
    }

    return {
      success: true,
      tier: tierKey,
      updatedTier,
      message: `Successfully updated pricing for ${updatedTier.name}. Changes are now live.`,
    };
  });

const AdminManageCreditsSchema = z.object({
  targetUserId: z.string().uuid(),
  tier: z.enum(["free", "foundation", "scholar_plus", "pro", "mastery", "elite"]).optional(),
  additionalCredits: z.number().int().optional(),
});

/**
 * Admin-only server function: manages user credits, promotes tiers, or grants bonus Live Examiner credits.
 */
export const adminManageUserCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AdminManageCreditsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const isAdmin =
      Boolean((context as any).isAdmin) ||
      isMarginalAdmin({
        userId: context.userId,
        claims: (context as any).claims,
        email: (context as any).email,
      });

    if (!isAdmin) {
      throw new Error("Unauthorized: Only the platform administrator can manage user credits.");
    }

    if (data.tier) {
      await assignUserSubscriptionTier(supabaseAdmin, data.targetUserId, data.tier as PlanTier);
    }

    if (data.additionalCredits && data.additionalCredits !== 0) {
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: data.targetUserId,
        feature: "admin_credit_grant",
        model: `credits_${data.additionalCredits > 0 ? "added" : "deducted"}`,
        prompt_tokens: Math.abs(data.additionalCredits),
        ok: true,
        error_message: `Admin granted ${data.additionalCredits} Live Examiner credits`,
      });
    }

    return {
      success: true,
      message: `User ${data.targetUserId.slice(0, 8)} updated successfully.`,
    };
  });
