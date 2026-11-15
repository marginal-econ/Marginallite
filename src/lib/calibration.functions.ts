import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unwrapData } from "@/lib/safe-validator";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export const listAnchors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calibration_anchors")
      .select("id, question, essay_text, mark, max_mark, band_label, notes, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AnchorInput = z.object({
  question: z.string().trim().min(10).max(2000),
  essayText: z.string().trim().min(40).max(20_000),
  // Ceiling of 8 — matches Cambridge 0455 tariffs (2m, 4m, 6m, 8m)
  mark: z.number().int().min(0).max(8),
  maxMark: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]),
  bandLabel: z.enum(["top", "middle", "bottom"]),
  notes: z.string().trim().max(2000).optional(),
});

export const createAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnchorInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.mark > data.maxMark) {
      throw new Error("The confirmed mark cannot be higher than the total available.");
    }

    const { error } = await context.supabase.from("calibration_anchors").insert({
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
    const { error } = await context.supabase
      .from("calibration_anchors")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const id = typeof raw === "string" ? raw : (raw as any)?.id;
    return z.object({ id: z.string().uuid() }).parse({ id });
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calibration_anchors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
