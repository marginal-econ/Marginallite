import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unwrapData } from "@/lib/safe-validator";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/backend/types";
import type { CustomDiagramRow } from "@/lib/diagrams/custom";
import type { DiagramSpec } from "@/lib/diagrams/spec";

const lines = z.array(z.string().trim().min(1)).max(30).default([]);

const DiagramInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Give the diagram a title.").max(140),
  section: z.enum(["Microeconomics", "Macroeconomics"]),
  topic: z.string().trim().min(2).max(90),
  level: z.enum(["Core", "Extended", "Core & Extended"]).default("Core & Extended"),
  represents: z.string().trim().max(1200).default(""),
  whyUsed: z.string().trim().max(1200).default(""),
  whenToDraw: z.string().trim().max(1200).default(""),
  howToRead: lines,
  labels: z
    .array(
      z.object({ symbol: z.string().trim().min(1).max(24), meaning: z.string().trim().max(300) }),
    )
    .max(40)
    .default([]),
  mistakes: lines,
  tips: lines,
  realWorld: lines,
  related: lines,
  examQuestions: lines,
  spec: z.record(z.string(), z.unknown()),
});

function mapRow(row: Database["public"]["Tables"]["custom_diagrams"]["Row"]): CustomDiagramRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    section: row.section,
    topic: row.topic,
    level: row.level,
    represents: row.represents ?? "",
    whyUsed: row.why_used ?? "",
    whenToDraw: row.when_to_draw ?? "",
    howToRead: row.how_to_read ?? [],
    labels: (row.labels ?? []) as { symbol: string; meaning: string }[],
    mistakes: row.mistakes ?? [],
    tips: row.tips ?? [],
    realWorld: row.real_world ?? [],
    related: row.related ?? [],
    examQuestions: row.exam_questions ?? [],
    spec: row.spec as unknown as DiagramSpec,
  };
}

/** Every signed-in student sees admin-added diagrams inside the library. */
export const listCustomDiagrams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("custom_diagrams")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  });

export const saveCustomDiagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiagramInput.parse(input))
  .handler(async ({ data, context }) => {
    const { slugify } = await import("@/lib/diagrams/custom");
    const payload = {
      slug: `${slugify(data.title)}-${Date.now().toString(36)}`,
      title: data.title,
      section: data.section,
      topic: data.topic,
      level: data.level,
      represents: data.represents,
      why_used: data.whyUsed,
      when_to_draw: data.whenToDraw,
      how_to_read: data.howToRead,
      labels: data.labels as unknown as never,
      mistakes: data.mistakes,
      tips: data.tips,
      real_world: data.realWorld,
      related: data.related,
      exam_questions: data.examQuestions,
      spec: data.spec as unknown as never,
      created_by: context.userId,
    };

    if (data.id) {
      const { slug: _slug, created_by: _by, ...update } = payload;
      const { error } = await context.supabase
        .from("custom_diagrams")
        .update(update)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("custom_diagrams")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

/** Light list (no geometry) for the "reference a diagram" picker on the grader. */
export const listDiagramLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { DIAGRAMS } = await import("@/lib/diagrams/catalog");
    return DIAGRAMS.map((entry) => ({
      id: entry.id,
      title: entry.title,
      section: entry.section,
      topic: entry.topic,
      xLabel: entry.spec.xLabel,
      yLabel: entry.spec.yLabel,
      curveLabels: entry.spec.curves.map((curve) => curve.label).filter(Boolean),
    }));
  });

const DiagramUrlInput = z.object({ url: z.string().trim().url("Paste a valid image URL.") });

/** Describes a diagram image (URL) into the same [DIAGRAM: ...] tag the handwriting OCR uses. */
export const describeDiagramUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiagramUrlInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { describeDiagramFromUrl } = await import("./diagrams/describe.server");
    try {
      const tag = await describeDiagramFromUrl(data.url);
      try {
        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "describe_diagram_url",
          model: "diagram-url-describe",
          ok: true,
        });
      } catch {}
      return { tag };
    } catch (error) {
      try {
        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "describe_diagram_url",
          model: "diagram-url-describe",
          ok: false,
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch {}
      throw error;
    }
  });

const DiagramImageInput = z.object({
  /** A photographed/scanned diagram as a data URL — same client-side capture path as handwriting pages. */
  image: z.string().startsWith("data:image/", "Add a photo of the diagram."),
});

/**
 * Describes an uploaded diagram photo (not a URL) into the same
 * [DIAGRAM: ...] tag format — used by Response Grader's "attach a diagram"
 * control, where a student photographs a hand-drawn diagram directly
 * rather than linking to one already hosted somewhere.
 */
export const describeDiagramImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiagramImageInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { checkUserVisionLimit } = await import("@/server/rate-limit");
    await checkUserVisionLimit(context.userId);

    const { describeDiagramFromDataUrl } = await import("./diagrams/describe.server");
    try {
      const tag = await describeDiagramFromDataUrl(data.image);
      try {
        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "describe_diagram_image",
          model: "diagram-image-describe",
          ok: true,
        });
      } catch {}
      return { tag };
    } catch (error) {
      try {
        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "describe_diagram_image",
          model: "diagram-image-describe",
          ok: false,
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch {}
      throw error;
    }
  });

const AutofillInput = z.object({
  /** A photographed/scanned diagram as a data URL — same client-side capture path as handwriting pages. */
  image: z.string().startsWith("data:image/", "Add a photo of the diagram."),
});

const AutofillResult = z.object({
  title: z.string(),
  section: z.enum(["Microeconomics", "Macroeconomics"]),
  level: z.enum(["Core", "Extended", "Core & Extended"]),
  topic: z.string(),
  templateId: z.string(),
  represents: z.string(),
  whyUsed: z.string(),
  whenToDraw: z.string(),
  howToRead: z.array(z.string()),
  labels: z.array(z.string()),
  mistakes: z.array(z.string()),
  tips: z.array(z.string()),
});

/**
 * Quick diagram ingestion: a teacher photographs any Cambridge-style diagram
 * (from a coursebook, a whiteboard, a printed past paper) and instead of
 * typing out title/represents/whyUsed/whenToDraw/howToRead/labels/mistakes/tips
 * plus picking the closest geometry template by hand, a vision call drafts
 * every field at once. The admin still reviews and edits before saving —
 * this fills the form, it never saves directly.
 */
export const autofillDiagramFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AutofillInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { visionChat } = await import("./ai.server");
    const { extractFirstJsonObject } = await import("./examiner/json");
    const { SPEC_TEMPLATES } = await import("./diagrams/custom");

    const templateList = SPEC_TEMPLATES.map((item) => `${item.id} — ${item.title}`).join("\n");
    const systemPrompt = [
      "You are cataloguing an economics diagram for a Cambridge IGCSE Economics 0455 teaching library.",
      "You will be shown a photo of a diagram (textbook page, whiteboard, or past paper). Describe ONLY what is",
      "actually drawn or clearly implied by a standard version of that diagram type — never invent specifics not visible.",
      "",
      "Pick the closest matching templateId from this exact list (use the id before the dash, verbatim):",
      templateList,
      "",
      "Respond with ONLY a single JSON object, no markdown fences, matching exactly this shape:",
      '{"title": string, "section": "Microeconomics" | "Macroeconomics", "level": "Core" | "Extended" | "Core & Extended",',
      ' "topic": string, "templateId": string, "represents": string, "whyUsed": string, "whenToDraw": string,',
      ' "howToRead": string[], "labels": string[] (each "SYMBOL = meaning"), "mistakes": string[], "tips": string[]}',
      "Keep represents/whyUsed/whenToDraw to one short paragraph each. howToRead/mistakes/tips: 2-5 short items each.",
    ].join("\n");

    const GATEWAY_MODELS = [
      "google/gemini-3.8-flash",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
    ];
    let lastError: unknown = null;
    for (const model of GATEWAY_MODELS) {
      try {
        const result = await visionChat({
          model,
          systemPrompt,
          prompt: "Catalogue this diagram. Output only the JSON object.",
          imageDataUrls: [data.image],
          maxCompletionTokens: 1200,
        });
        const parsed = AutofillResult.parse(extractFirstJsonObject(result.text));
        await context.supabase.from("ai_usage_log").insert({
          user_id: context.userId,
          feature: "autofill_diagram_image",
          model,
          ok: true,
        });
        return parsed;
      } catch (error) {
        lastError = error;
      }
    }

    await context.supabase.from("ai_usage_log").insert({
      user_id: context.userId,
      feature: "autofill_diagram_image",
      model: "autofill-diagram",
      ok: false,
      error_message: lastError instanceof Error ? lastError.message : "Unknown error",
    });
    throw new Error(
      "Couldn't read that diagram clearly enough to catalogue it — try a closer, brighter photo.",
    );
  });

export const deleteCustomDiagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const id = typeof raw === "string" ? raw : (raw as any)?.id;
    return z.object({ id: z.string().uuid() }).parse({ id });
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("custom_diagrams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
