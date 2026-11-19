import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isAdmin } from "@/lib/auth-admin";
import { unwrapData } from "@/lib/safe-validator";
import { checkUserEssayLimit } from "@/server/rate-limit";

const GradeInput = z.object({
  question: z.string().trim().min(8, "Paste the exam question.").max(2000),
  essayText: z.string().trim().min(10, "That answer is too short to mark.").max(40_000),
  // Ceiling of 20 - no IGCSE 0455 question part is worth more than 20 marks
  maxMark: z.number().int().min(1).max(20),
  isDiagramQuestion: z.boolean().optional(),
  essayId: z.string().uuid().nullable().optional(),
  auditPass: z.boolean().optional(),
  /**
   * A [DIAGRAM: ...] tag describing a diagram the student referenced for a
   * typed (non-handwritten) essay — either picked from the diagram library
   * or generated from a pasted image URL. Appended to the graded text so it
   * gets the same credit a scanned script's hand-drawn diagram would.
   */
  diagramReference: z.string().trim().max(4000).optional(),
  /**
   * Screenshot(s) of the relevant mark scheme page, pasted straight into the
   * grader. Sent to the examiner as an actual image (vision), not just text —
   * on top of, not instead of, the retrieval-grounded knowledge base context.
   */
  markSchemeImageDataUrls: z.array(z.string().trim().startsWith("data:image/")).max(4).optional(),
});

/**
 * Mark an essay and persist it as a new version of the same essay thread, so a
 * student can rewrite and watch the mark move rather than losing the history.
 */
export const gradeEssaySubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GradeInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fast pre-flight check: reject non-economics questions before consuming quota or incurring AI cost
    const { validateEconomicsSyllabus } = await import("./examiner/syllabus-guard.server");
    await validateEconomicsSyllabus(data.question, data.essayText);

    // Abuse guard against spam. Rate limit per hour, admins exempt.
    const userIsAdmin = isAdmin({
      userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    checkUserEssayLimit(userId, userIsAdmin);

    const { gradeEssay } = await import("./examiner/grade.server");
    const { defaultSplitForMaxMark } = await import("./examiner/config");

    const split = defaultSplitForMaxMark(data.maxMark, undefined, data.question);

    // A referenced diagram is appended after the student's own text, exactly
    // like a hand-drawn diagram tag from OCR, so the examiner prompt's
    // existing diagram-handling rules apply unchanged.
    const gradedText = data.diagramReference
      ? `${data.essayText}\n\n${data.diagramReference}`
      : data.essayText;

    let outcome;
    try {
      outcome = await gradeEssay(supabase, {
        question: data.question,
        essayText: gradedText,
        maxMark: data.maxMark,
        split,
        isDiagramQuestion: data.isDiagramQuestion,
        auditPass: data.auditPass,
        markSchemeImageDataUrls: data.markSchemeImageDataUrls,
        isBudgetTier: false,
        userId,
        skipSyllabusValidation: true,
      });
    } catch (error) {
      // The grading never happened, so it shouldn't use up today's allowance.
      try {
        await supabase.rpc("refund_essay_grading");
      } catch {
        /* best-effort */
      }
      try {
        await supabaseAdmin.from("ai_usage_log").insert({
          user_id: userId,
          feature: "grade_essay",
          model: "ministral-14b-2512",
          ok: false,
          error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch {}
      throw error;
    }

    const { grading } = outcome;

    // Persist to database (essay_submissions, with legacy fallback).
    // Database errors must NEVER prevent the student from receiving their grade.
    let essayId = data.essayId ?? null;
    let versionId: string | null = null;
    const versionNumber = 1;

    try {
      if (essayId) {
        await supabase
          .from("essay_submissions")
          .update({
            essay_text: gradedText,
            max_marks: data.maxMark,
            awarded_marks: grading.total_mark,
            band: grading.band,
            grading_result: grading as unknown as never,
          })
          .eq("id", essayId)
          .eq("user_id", userId);
        versionId = essayId;
      } else {
        const { data: saved, error: saveErr } = await supabase
          .from("essay_submissions")
          .insert({
            user_id: userId,
            question: data.question,
            essay_text: gradedText,
            max_marks: data.maxMark,
            awarded_marks: grading.total_mark,
            band: grading.band,
            grading_result: grading as unknown as never,
          })
          .select("id")
          .single();

        if (!saveErr && saved) {
          essayId = (saved as any).id;
          versionId = (saved as any).id;
        } else if (saveErr) {
          console.warn("Failed to persist to essay_submissions:", saveErr.message);
        }
      }
    } catch (persistErr) {
      console.warn("Non-fatal error persisting essay to essay_submissions:", persistErr);
    }

    // Best-effort write to legacy essays / essay_versions tables if present
    try {
      if (data.essayId) {
        await supabase
          .from("essays")
          .update({ latest_mark: grading.total_mark, updated_at: new Date().toISOString() })
          .eq("id", data.essayId)
          .eq("user_id", userId);
      } else {
        const { data: legacyEssay } = await supabase
          .from("essays")
          .insert({
            user_id: userId,
            question: data.question,
            max_mark: data.maxMark,
            latest_mark: grading.total_mark,
          })
          .select("id")
          .single();
        if (legacyEssay) {
          if (!essayId) essayId = legacyEssay.id;
          await supabase.from("essay_versions").insert({
            essay_id: legacyEssay.id,
            user_id: userId,
            version: 1,
            essay_text: gradedText,
            grading: grading as unknown as never,
            total_mark: grading.total_mark,
            confidence: grading.confidence,
            audited: grading.audited,
          });
        }
      }
    } catch {
      /* legacy table best-effort */
    }

    try {
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "grade_essay",
        model: outcome.model || "ministral-14b-2512",
        prompt_tokens: outcome.promptTokens,
        completion_tokens: outcome.completionTokens,
        latency_ms: outcome.latencyMs,
        ok: true,
      });
    } catch {}

    return {
      essayId,
      versionId: versionId ?? essayId,
      version: versionNumber,
      grading,
      latencyMs: outcome.latencyMs,
    };
  });

export const listMyEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await context.supabase
        .from("essay_submissions")
        .select("id, question, max_marks, awarded_marks, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          question: row.question,
          max_mark: row.max_marks ?? 8,
          latest_mark: row.awarded_marks,
          created_at: row.created_at,
          updated_at: row.created_at,
        }));
      }
    } catch {}

    try {
      const { data } = await context.supabase
        .from("essays")
        .select("id, question, max_mark, latest_mark, created_at, updated_at")
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (data) return data;
    } catch {}

    return [];
  });

export const getEssayThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ essayId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { isUserAdmin } = await import("@/lib/auth-admin");
    const isAdmin = isUserAdmin(context.userId);
    const client = isAdmin
      ? (await import("@/integrations/backend/client.server")).supabaseAdmin
      : context.supabase;

    try {
      const { data: sub, error: subError } = await client
        .from("essay_submissions")
        .select("*")
        .eq("id", data.essayId)
        .maybeSingle();

      if (!subError && sub) {
        const s = sub as any;
        const gradingResult = (s.grading_result || {}) as any;
        return {
          essay: {
            id: s.id,
            question: s.question,
            max_mark: s.max_marks ?? 8,
            latest_mark: s.awarded_marks,
            created_at: s.created_at,
            user_id: s.user_id,
          },
          versions: [
            {
              id: s.id,
              version: 1,
              essay_text: s.essay_text,
              grading: gradingResult,
              total_mark: s.awarded_marks,
              confidence: gradingResult?.confidence ?? 0.9,
              audited: gradingResult?.audited ?? false,
              created_at: s.created_at,
            },
          ],
        };
      }
    } catch {}

    const { data: essay, error } = await client
      .from("essays")
      .select("id, question, max_mark, latest_mark, created_at, user_id")
      .eq("id", data.essayId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!essay) throw new Error("That essay could not be found.");

    const { data: versions, error: versionError } = await client
      .from("essay_versions")
      .select("id, version, essay_text, grading, total_mark, confidence, audited, created_at")
      .eq("essay_id", data.essayId)
      .order("version", { ascending: true });
    if (versionError) throw new Error(versionError.message);

    return { essay, versions: versions ?? [] };
  });

/** Student progress figures for the dashboard. */
export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await context.supabase
        .from("essay_submissions")
        .select("max_marks, awarded_marks, grading_result, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data.map((row: any) => {
          const g = (row.grading_result || {}) as any;
          const maxM = row.max_marks ?? g?.max_mark ?? 8;
          return {
            total_mark: row.awarded_marks,
            max_mark: maxM,
            ao1_awarded: g?.ao_breakdown?.knowledge?.awarded ?? 0,
            ao2_awarded: g?.ao_breakdown?.analysis?.awarded ?? 0,
            ao3_awarded: g?.ao_breakdown?.evaluation?.awarded ?? 0,
            ao1_out_of: g?.ao_breakdown?.knowledge?.out_of ?? 2,
            ao2_out_of: g?.ao_breakdown?.analysis?.out_of ?? 3,
            ao3_out_of: g?.ao_breakdown?.evaluation?.out_of ?? 3,
            confidence: g?.confidence ?? 0.9,
            created_at: row.created_at,
          };
        });
      }
    } catch {}

    try {
      const { data } = await context.supabase
        .from("essay_versions")
        .select("total_mark, ao1_awarded, ao2_awarded, ao3_awarded, confidence, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) return data;
    } catch {}

    return [];
  });

/** Proactively check if a question matches verified Cambridge Knowledge Base materials */
export const checkQuestionGrounding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ question: z.string().trim().max(2000) }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    if (data.question.length < 15) return { checked: false, grounded: false, sourceCount: 0 };
    const { retrieve } = await import("./retrieval.server");
    try {
      const sources = await retrieve(context.supabase, {
        query: `${data.question}\n\nMark scheme, band descriptors and examiner report guidance for this question.`,
        matchCount: 4,
        minSimilarity: 0.5,
      });
      return {
        checked: true,
        grounded: sources.length > 0,
        sourceCount: sources.length,
        topMatchTitle: sources[0]?.documentTitle ?? null,
        topSimilarity: sources[0]?.similarity ?? null,
      };
    } catch {
      return { checked: false, grounded: false, sourceCount: 0 };
    }
  });
