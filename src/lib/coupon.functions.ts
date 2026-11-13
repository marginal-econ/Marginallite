import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isMarginalAdmin } from "./auth-admin";
import { TIER_LIMITS, type PlanTier } from "./usage-limits";

export type CouponType = "percentage" | "fixed";
export type CouponAudience = "all" | "students" | "teachers" | "schools";

export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  foundation: "Foundation Scholar / Educator AI Pass",
  scholar_plus: "Scholar Plus / Senior Educator Pass",
  pro: "Pro Accelerator / Department Lead Pass",
  mastery: "A* Mastery Sprint / Mastery Department Pass",
  elite: "Cambridge Elite Pass / Institutional Pass",
  school_starter: "School Department Starter (50 seats)",
  school_campus: "School Campus Standard (150 seats)",
  school_institution: "School Institution Premium (400 seats)",
  school_enterprise: "Multi-Campus Enterprise (1,000+ seats)",
};

export interface CouponRecord {
  id: string;
  code: string;
  type: CouponType;
  value: number; // e.g. 20 for 20%, or 200 for ₹200
  targetAudience?: CouponAudience; // "all" | "students" | "teachers" | "schools"
  active: boolean;
  maxUses: number | null; // null = unlimited
  usedCount: number;
  expiresAt: string | null; // ISO string
  applicableTiers: string[] | null; // null/empty = all plans
  minAmount: number | null; // null = no minimum
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const ValidateCouponInput = z.object({
  code: z.string().min(1).max(50),
  tier: z.string().min(1).max(50),
  audience: z.enum(["all", "students", "teachers", "schools", "student", "teacher", "school"]).optional(),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  baseAmount: z.number().int().min(1),
});

const CreateCouponInput = z.object({
  code: z.string().min(2).max(30).regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens or underscores"),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(1),
  targetAudience: z.enum(["all", "students", "teachers", "schools"]).default("all").optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  applicableTiers: z.array(z.string()).nullable().optional(),
  minAmount: z.number().int().min(0).nullable().optional(),
  description: z.string().max(200).optional(),
  active: z.boolean().default(true),
});

const UpdateCouponInput = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  type: z.enum(["percentage", "fixed"]).optional(),
  value: z.number().min(1).optional(),
  targetAudience: z.enum(["all", "students", "teachers", "schools"]).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  applicableTiers: z.array(z.string()).nullable().optional(),
  minAmount: z.number().int().min(0).nullable().optional(),
  description: z.string().max(200).optional(),
});

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

/**
 * Public validator called from /payment checkout before a user completes payment.
 */
export const validateCouponCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ValidateCouponInput.parse(input))
  .handler(async ({ data }) => {
    const cleanCode = normalizeCode(data.code);
    if (!cleanCode) {
      throw new Error("Please enter a valid coupon code.");
    }

    const term = `__COUPON_${cleanCode}`;
    const { data: row, error } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text, created_at, updated_at")
      .eq("term", term)
      .eq("category", "coupon_code")
      .maybeSingle();

    if (error || !row || !row.definition_text) {
      throw new Error(`Coupon code "${cleanCode}" is invalid or does not exist.`);
    }

    let coupon: CouponRecord;
    try {
      coupon = {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        ...JSON.parse(row.definition_text),
      };
    } catch {
      throw new Error("Failed to read coupon data. Please contact support.");
    }

    if (!coupon.active) {
      throw new Error(`Coupon code "${cleanCode}" is currently inactive or has been paused.`);
    }

    if (coupon.expiresAt) {
      const exp = new Date(coupon.expiresAt);
      if (exp.getTime() < Date.now()) {
        throw new Error(`Coupon code "${cleanCode}" expired on ${exp.toLocaleDateString()}.`);
      }
    }

    if (coupon.maxUses !== null && coupon.maxUses > 0) {
      if (coupon.usedCount >= coupon.maxUses) {
        throw new Error(`Coupon code "${cleanCode}" has reached its maximum redemption limit.`);
      }
    }

    // Check audience compatibility (e.g. teachers only, schools only, students only)
    if (coupon.targetAudience && coupon.targetAudience !== "all" && data.audience) {
      const incomingAudience = data.audience.toLowerCase().replace(/s$/, ""); // student, teacher, school
      const couponAudience = coupon.targetAudience.toLowerCase().replace(/s$/, "");
      if (incomingAudience !== couponAudience) {
        const audienceLabels: Record<string, string> = {
          student: "Student Revision Plans",
          teacher: "Teacher & Educator Passes",
          school: "School Department Licensing",
        };
        throw new Error(
          `Coupon code "${cleanCode}" is reserved exclusively for ${audienceLabels[couponAudience] || coupon.targetAudience}.`,
        );
      }
    }

    if (coupon.applicableTiers && coupon.applicableTiers.length > 0) {
      if (!coupon.applicableTiers.includes(data.tier)) {
        const allowedNames = coupon.applicableTiers
          .map((t) => PLAN_DISPLAY_NAMES[t] || TIER_LIMITS[t as PlanTier]?.name || t)
          .join(", ");
        throw new Error(`Coupon code "${cleanCode}" is only valid for: ${allowedNames}.`);
      }
    }

    if (coupon.minAmount !== null && coupon.minAmount > 0) {
      if (data.baseAmount < coupon.minAmount) {
        throw new Error(`Coupon code "${cleanCode}" requires a minimum cart value of ₹${coupon.minAmount}.`);
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === "percentage") {
      discountAmount = Math.round((data.baseAmount * coupon.value) / 100);
    } else {
      discountAmount = Math.round(coupon.value);
    }

    // Clamp discount so price cannot be negative
    discountAmount = Math.min(discountAmount, data.baseAmount);
    const finalAmount = Math.max(0, data.baseAmount - discountAmount);

    return {
      valid: true,
      code: cleanCode,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      finalAmount,
      description: coupon.description || undefined,
      message: `Coupon "${cleanCode}" applied! You save ₹${discountAmount.toLocaleString()}.`,
    };
  });

async function assertAdminAccess(context: {
  userId: string;
  email?: string | null;
  claims?: any;
  isAdmin?: boolean;
}): Promise<void> {
  const isAdmin =
    Boolean((context as any).isAdmin) ||
    isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    }) ||
    isMarginalAdmin(context.userId) ||
    Boolean(context.email && isMarginalAdmin(context.email));

  if (isAdmin) return;

  // Extra safety fallback: check database auth records for user's email
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (data?.user?.email && (isMarginalAdmin({ email: data.user.email }) || isMarginalAdmin(data.user.email))) {
      return;
    }
  } catch {
    // ignore
  }

  throw new Error("Unauthorized: Only platform administrators can manage coupon codes.");
}

/**
 * Lists all coupons for the Admin Panel.
 */
export const listAllCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context as any);

    const { data: rows, error } = await supabaseAdmin
      .from("definitions")
      .select("id, term, definition_text, created_at, updated_at")
      .eq("category", "coupon_code")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to query coupons: ${error.message}`);
    }

    const coupons: CouponRecord[] = [];
    for (const r of rows || []) {
      if (r.definition_text) {
        try {
          const parsed = JSON.parse(r.definition_text);
          coupons.push({
            id: r.id,
            createdAt: r.created_at,
            updatedAt: r.updated_at || r.created_at,
            ...parsed,
          });
        } catch {
          // ignore corrupted single entries
        }
      }
    }

    return { coupons };
  });

/**
 * Creates a new coupon in the database.
 */
export const createCouponCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCouponInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context as any);

    const cleanCode = normalizeCode(data.code);
    const term = `__COUPON_${cleanCode}`;

    // Validate percentage max
    if (data.type === "percentage" && data.value > 100) {
      throw new Error("Percentage discount cannot exceed 100%.");
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from("definitions")
      .select("id")
      .eq("term", term)
      .eq("category", "coupon_code")
      .maybeSingle();

    if (existing?.id) {
      throw new Error(`Coupon code "${cleanCode}" already exists. Please choose a different code or edit the existing one.`);
    }

    const now = new Date().toISOString();
    const payload = {
      code: cleanCode,
      type: data.type,
      value: data.value,
      targetAudience: data.targetAudience ?? "all",
      active: data.active ?? true,
      maxUses: data.maxUses ?? null,
      usedCount: 0,
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      applicableTiers: data.applicableTiers && data.applicableTiers.length > 0 ? data.applicableTiers : null,
      minAmount: data.minAmount ?? null,
      description: data.description?.trim() || null,
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
    };

    const { error: insertError } = await supabaseAdmin.from("definitions").insert({
      term,
      definition_text: JSON.stringify(payload),
      category: "coupon_code",
      source_label: cleanCode,
    });

    if (insertError) {
      throw new Error(`Database error creating coupon: ${insertError.message}`);
    }

    return {
      success: true,
      code: cleanCode,
      message: `Coupon code "${cleanCode}" created successfully!`,
    };
  });

/**
 * Updates an existing coupon (edit discount, toggle active, change max uses or expiry).
 */
export const updateCouponCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateCouponInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context as any);

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("definitions")
      .select("id, term, definition_text")
      .eq("id", data.id)
      .eq("category", "coupon_code")
      .maybeSingle();

    if (fetchErr || !row || !row.definition_text) {
      throw new Error("Coupon record not found.");
    }

    let existing: any = {};
    try {
      existing = JSON.parse(row.definition_text);
    } catch {
      existing = {};
    }

    if (data.type === "percentage" && (data.value ?? existing.value) > 100) {
      throw new Error("Percentage discount cannot exceed 100%.");
    }

    const updatedPayload = {
      ...existing,
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.targetAudience !== undefined ? { targetAudience: data.targetAudience } : {}),
      ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null } : {}),
      ...(data.applicableTiers !== undefined ? { applicableTiers: data.applicableTiers && data.applicableTiers.length > 0 ? data.applicableTiers : null } : {}),
      ...(data.minAmount !== undefined ? { minAmount: data.minAmount } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      updatedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await supabaseAdmin
      .from("definitions")
      .update({
        definition_text: JSON.stringify(updatedPayload),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateErr) {
      throw new Error(`Failed to update coupon: ${updateErr.message}`);
    }

    return {
      success: true,
      message: `Coupon "${existing.code}" updated successfully.`,
    };
  });

/**
 * Deletes a coupon completely from the database.
 */
export const deleteCouponCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context as any);

    const { error } = await supabaseAdmin
      .from("definitions")
      .delete()
      .eq("id", data.id)
      .eq("category", "coupon_code");

    if (error) {
      throw new Error(`Failed to delete coupon: ${error.message}`);
    }

    return {
      success: true,
      message: "Coupon code deleted successfully.",
    };
  });

/**
 * Emergency admin switch: Deactivates / cancels ALL active coupons in one click.
 */
export const cancelAllCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context as any);

    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text")
      .eq("category", "coupon_code");

    if (fetchErr) {
      throw new Error(`Failed to query coupons: ${fetchErr.message}`);
    }

    let modifiedCount = 0;
    for (const r of rows || []) {
      if (r.definition_text) {
        try {
          const parsed = JSON.parse(r.definition_text);
          if (parsed.active) {
            parsed.active = false;
            parsed.updatedAt = new Date().toISOString();
            await supabaseAdmin
              .from("definitions")
              .update({
                definition_text: JSON.stringify(parsed),
                updated_at: new Date().toISOString(),
              })
              .eq("id", r.id);
            modifiedCount++;
          }
        } catch {
          // ignore
        }
      }
    }

    return {
      success: true,
      modifiedCount,
      message: `Successfully deactivated ${modifiedCount} active coupon code${modifiedCount === 1 ? "" : "s"}.`,
    };
  });

/**
 * Helper to record coupon redemption upon completed payment.
 */
export async function recordCouponUsageInDb(code: string): Promise<void> {
  const cleanCode = normalizeCode(code);
  if (!cleanCode) return;

  const term = `__COUPON_${cleanCode}`;
  try {
    const { data: row } = await supabaseAdmin
      .from("definitions")
      .select("id, definition_text")
      .eq("term", term)
      .eq("category", "coupon_code")
      .maybeSingle();

    if (row?.id && row.definition_text) {
      const parsed = JSON.parse(row.definition_text);
      parsed.usedCount = (parsed.usedCount || 0) + 1;
      parsed.updatedAt = new Date().toISOString();

      await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: JSON.stringify(parsed),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  } catch (err) {
    console.warn("Could not record coupon usage count:", err);
  }
}
