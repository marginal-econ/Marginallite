/**
 * Question bank: real past-paper MCQ and essay questions, extracted from
 * teacher-uploaded QP(+MS) text and held in a review queue until a teacher
 * approves them. Entirely additive — separate tables, separate functions.
 *
 * MCQ practice itself is PDF-only (see mcq-live.tsx / mcq-pdf.functions.ts)
 * — this file no longer builds standalone MCQ "papers" from bank questions.
 * It only handles extraction/approval of real past-paper MCQ and essay
 * questions, plus the essay side of the bank (listApprovedEssayQuestions).
 *
 * Every write here relies on the bank_* RLS policies (staff-only) for
 * authorization, matching the pattern already used by knowledge.functions.ts
 * — the server functions themselves don't re-check roles because the
 * user's own Supabase session (not a service-role client) is what's making
 * the request, so an attempt by a non-staff user is rejected by RLS itself.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const EraEnum = z.enum(["legacy", "2027"]).default("legacy");

/* ---------------------------------------------------------------------- */
/*  Extraction (staff)                                                     */
/* ---------------------------------------------------------------------- */

const ExtractInput = z.object({
  kind: z.enum(["mcq", "essay"]),
  era: EraEnum.optional(),
  qpText: z.string().trim().min(200, "Paste or upload the question paper text first."),
  msText: z.string().trim().optional(),
  examSeries: z.string().trim().max(60).optional(),
  sourceDocumentId: z.string().uuid().optional(),
  /** Real scanned/photographed page images of the QP (data URLs) — enables vision extraction
   *  so diagrams and data tables are read directly off the page instead of trusting OCR text. */
  qpImages: z.array(z.string()).max(14).optional(),
});

/** Extract candidate questions from a pasted/uploaded QP(+MS) and stage them as pending_review. */
export const extractBankQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.kind === "mcq") {
      const { extractMcqQuestionsFromPaper } = await import("./bank/extract.server");
      const { candidates, meta } = await extractMcqQuestionsFromPaper({
        era: data.era,
        qpText: data.qpText,
        msText: data.msText,
        pageImages: data.qpImages,
      });

      if (candidates.length === 0) {
        throw new Error(
          "No multiple choice questions could be found in that text. Check it's the right paper, or paste more of it.",
        );
      }

      const rows = candidates.map((c) => ({
        topic: c.topic || "General",
        source_document_id: data.sourceDocumentId ?? null,
        exam_series: data.examSeries?.trim() || null,
        stem: c.stem,
        options: c.options,
        answer: c.answer,
        explanation: c.explanation,
        distractor_notes: c.distractorNotes,
        skill: c.skill,
        diagram_id: c.diagramId,
        status: "pending_review" as const,
        created_by: userId,
      }));

      const { data: inserted, error } = await supabase
        .from("bank_mcq_questions")
        .insert(rows)
        .select("*");
      if (error) throw new Error(error.message);

      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "bank_extract_mcq",
        model: meta.model,
        prompt_tokens: meta.promptTokens,
        completion_tokens: meta.completionTokens,
        latency_ms: meta.latencyMs,
        ok: true,
      });

      return { kind: "mcq" as const, inserted: inserted ?? [] };
    }

    const { extractEssayQuestionsFromPaper } = await import("./bank/extract.server");
    const { candidates, meta } = await extractEssayQuestionsFromPaper({
      era: data.era,
      qpText: data.qpText,
      pageImages: data.qpImages,
    });

    if (candidates.length === 0) {
      throw new Error(
        "No essay-style questions could be found in that text. Check it's the right paper, or paste more of it.",
      );
    }

    const rows = candidates.map((c) => ({
      topic: c.topic || "General",
      source_document_id: data.sourceDocumentId ?? null,
      exam_series: data.examSeries?.trim() || null,
      question_text: c.questionText,
      max_mark: c.maxMark,
      status: "pending_review" as const,
      created_by: userId,
    }));

    const { data: inserted, error } = await supabase
      .from("bank_essay_questions")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      feature: "bank_extract_essay",
      model: meta.model,
      prompt_tokens: meta.promptTokens,
      completion_tokens: meta.completionTokens,
      latency_ms: meta.latencyMs,
      ok: true,
    });

    return { kind: "essay" as const, inserted: inserted ?? [] };
  });

/* ---------------------------------------------------------------------- */
/*  Review queue (staff)                                                   */
/* ---------------------------------------------------------------------- */

const ListForReviewInput = z.object({
  kind: z.enum(["mcq", "essay"]),
  status: z.enum(["pending_review", "approved", "rejected"]).optional(),
});

export const listBankQuestionsForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListForReviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.kind === "mcq" ? "bank_mcq_questions" : "bank_essay_questions";
    let query = context.supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const SetStatusInput = z.object({
  kind: z.enum(["mcq", "essay"]),
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending_review"]),
});

export const setBankQuestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.kind === "mcq" ? "bank_mcq_questions" : "bank_essay_questions";
    const { error } = await context.supabase
      .from(table)
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateMcqInput = z.object({
  id: z.string().uuid(),
  stem: z.string().trim().min(8).optional(),
  options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }).optional(),
  answer: z.enum(["A", "B", "C", "D"]).optional(),
  explanation: z.string().optional(),
  topic: z.string().trim().max(200).optional(),
  // Deliberately nullable (not just optional): a teacher clearing a wrongly
  // matched diagram must be able to send an explicit null, not just omit
  // the field (omitting would leave the old id in place).
  diagramId: z.string().trim().max(120).nullable().optional(),
  // The real cropped exam figure (a storage URL), same nullable-vs-omitted
  // reasoning as diagramId above — clearing it must be explicit.
  diagramImageUrl: z.string().trim().url().nullable().optional(),
});

/** Inline edit of a bank MCQ question before/while reviewing it. */
export const updateBankMcqQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateMcqInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, diagramId, diagramImageUrl, ...patch } = data;
    const { error } = await context.supabase
      .from("bank_mcq_questions")
      .update({
        ...patch,
        ...(diagramId !== undefined ? { diagram_id: diagramId || null } : {}),
        ...(diagramImageUrl !== undefined ? { diagram_image_url: diagramImageUrl || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateEssayInput = z.object({
  id: z.string().uuid(),
  questionText: z.string().trim().min(10).optional(),
  topic: z.string().trim().max(200).optional(),
  maxMark: z.coerce.number().int().min(4).max(20).optional(),
});

export const updateBankEssayQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateEssayInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bank_essay_questions")
      .update({
        ...(data.questionText ? { question_text: data.questionText } : {}),
        ...(data.topic ? { topic: data.topic } : {}),
        ...(data.maxMark ? { max_mark: data.maxMark } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteBankInput = z.object({ kind: z.enum(["mcq", "essay"]), id: z.string().uuid() });

export const deleteBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteBankInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.kind === "mcq" ? "bank_mcq_questions" : "bank_essay_questions";
    const { error } = await context.supabase.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------------- */
/*  Student-facing browse (everyone, RLS limits to approved rows)          */
/* ---------------------------------------------------------------------- */

const ListTopicsInput = z.object({ kind: z.enum(["mcq", "essay"]), era: EraEnum.optional() });

/** Distinct topics with at least one approved question, for the browse UI. */
export const listBankTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListTopicsInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.kind === "mcq" ? "bank_mcq_questions" : "bank_essay_questions";
    const { data: rows, error } = await context.supabase
      .from(table)
      .select("topic")
      .eq("status", "approved");
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      const topic = (row as { topic: string }).topic || "General";
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  });

const ListApprovedEssaysInput = z.object({
  era: EraEnum.optional(),
  topic: z.string().trim().max(200).optional(),
});

export const listApprovedEssayQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListApprovedEssaysInput.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("bank_essay_questions")
      .select("id, question_text, topic, max_mark, exam_series")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.topic) query = query.eq("topic", data.topic);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// MCQ practice is PDF-only — there is deliberately no "start a paper from
// bank questions" flow here anymore. A teacher-approved bank_mcq_questions
// row feeds the question bank listing and future paper curation, not a
// standalone generated attempt.
