import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { unwrapData } from "@/lib/safe-validator";

export const listAnchors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./auth-admin");
    assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const client = supabaseAdmin ?? context.supabase;

    const { data, error } = await client
      .from("calibration_anchors")
      .select("id, question, essay_text, mark, max_mark, band_label, notes, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AnchorInput = z.object({
  question: z.string().trim().min(10).max(2000),
  essayText: z.string().trim().min(40).max(20_000),
  // Ceiling of 20, not 30 — matches every other tariff validator; no 0455
  // question (and so no calibration anchor) is worth more than 20 marks.
  mark: z.number().int().min(0).max(20),
  maxMark: z.union([z.literal(8), z.literal(12), z.literal(20)]),
  bandLabel: z.enum(["top", "middle", "bottom"]),
  notes: z.string().trim().max(2000).optional(),
});

export const createAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnchorInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./auth-admin");
    assertAdmin(context);

    if (data.mark > data.maxMark) {
      throw new Error("The confirmed mark cannot be higher than the total available.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const client = supabaseAdmin ?? context.supabase;

    const { error } = await client.from("calibration_anchors").insert({
      question: data.question,
      essay_text: data.essayText,
      mark: data.mark,
      max_mark: data.maxMark,
      band_label: data.bandLabel,
      notes: data.notes ?? null,
      created_by: context.userId,
    });

    if (error) {
      throw new Error(
        error.message.includes("row-level security")
          ? "Only administrators can add calibration examples."
          : error.message,
      );
    }
    return { ok: true };
  });

export const setAnchorActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./auth-admin");
    assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const client = supabaseAdmin ?? context.supabase;

    const { error } = await client
      .from("calibration_anchors")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./auth-admin");
    assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const client = supabaseAdmin ?? context.supabase;

    const { error } = await client.from("calibration_anchors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addShowcaseToCalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(5),
        essayText: z.string().trim().min(20),
        mark: z.number().int().min(0),
        maxMark: z.number().int(),
        bandLabel: z.enum(["top", "middle", "bottom"]).optional(),
        notes: z.string().trim().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./auth-admin");
    assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // Normalize maxMark to Cambridge IGCSE 0455 tariffs (8, 12, or 20)
    let validMaxMark: 8 | 12 | 20 = 12;
    if (data.maxMark === 8 || data.maxMark === 12 || data.maxMark === 20) {
      validMaxMark = data.maxMark;
    } else if (data.maxMark <= 8) {
      validMaxMark = 8;
    } else if (data.maxMark <= 14) {
      validMaxMark = 12;
    } else {
      validMaxMark = 20;
    }

    const validMark = Math.min(Math.max(0, Math.round(data.mark)), validMaxMark);
    const bandLabel =
      data.bandLabel ??
      (validMark / validMaxMark >= 0.75
        ? "top"
        : validMark / validMaxMark >= 0.5
          ? "middle"
          : "bottom");

    // Check if an anchor with this exact question already exists
    const { data: existing } = await supabaseAdmin
      .from("calibration_anchors")
      .select("id")
      .eq("question", data.question.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from("calibration_anchors")
        .update({
          essay_text: data.essayText.trim(),
          mark: validMark,
          max_mark: validMaxMark,
          band_label: bandLabel,
          notes: data.notes?.trim() || "Exemplar essay imported from Showcase.",
          active: true,
        })
        .eq("id", existing[0].id);
      return { ok: true, updated: true, id: existing[0].id };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("calibration_anchors")
      .insert({
        question: data.question.trim(),
        essay_text: data.essayText.trim(),
        mark: validMark,
        max_mark: validMaxMark,
        band_label: bandLabel,
        notes: data.notes?.trim() || "Exemplar essay imported from Showcase.",
        created_by: context.userId,
        active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, created: true, id: inserted?.id };
  });

export const getCalibrationAnchorQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data } = await supabaseAdmin
      .from("calibration_anchors")
      .select("question")
      .eq("active", true);
    return (data ?? []).map((row) => row.question);
  });
