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

    // Persist to database (essay_submissions).
    // Using supabaseAdmin bypasses RLS and guarantees candidate essays are always saved.
    let essayId = data.essayId ?? null;
    let versionId: string | null = null;
    const versionNumber = 1;

    try {
      if (essayId) {
        const { error: updateErr } = await supabaseAdmin
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

        if (!updateErr) {
          versionId = essayId;
        } else {
          console.warn("Failed to update essay_submissions:", updateErr.message);
        }
      } else {
        const { data: saved, error: saveErr } = await supabaseAdmin
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
          console.error("Failed to persist to essay_submissions:", saveErr.message);
        }
      }

      // Record candidate presence / activity timestamp on profile
      await supabaseAdmin
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (persistErr) {
      console.error("Error persisting essay to essay_submissions:", persistErr);
    }

    // Best-effort write to legacy essays / essay_versions tables if present
    try {
      if (data.essayId) {
        await supabaseAdmin
          .from("essays")
          .update({ latest_mark: grading.total_mark, updated_at: new Date().toISOString() })
          .eq("id", data.essayId)
          .eq("user_id", userId);
      } else {
        const { data: legacyEssay } = await supabaseAdmin
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
          const ao1Val = grading.ao_breakdown?.knowledge?.awarded ?? Math.min(2, Math.round(grading.total_mark * 0.25));
          const ao2Val = grading.ao_breakdown?.analysis?.awarded ?? Math.min(3, Math.round(grading.total_mark * 0.40));
          const ao3Val = grading.ao_breakdown?.evaluation?.awarded ?? (data.maxMark <= 6 ? 0 : Math.max(0, grading.total_mark - ao1Val - ao2Val));
          await supabaseAdmin.from("essay_versions").insert({
            essay_id: legacyEssay.id,
            user_id: userId,
            version: 1,
            essay_text: gradedText,
            grading: grading as unknown as never,
            total_mark: grading.total_mark,
            confidence: grading.confidence,
            audited: grading.audited,
            ao1_awarded: ao1Val,
            ao2_awarded: ao2Val,
            ao3_awarded: ao3Val,
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
      const { data, error } = await supabaseAdmin
        .from("essay_submissions")
        .select("id, question, max_marks, awarded_marks, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          question: row.question,
          max_mark: row.max_marks ?? 8,
          latest_mark: row.awarded_marks,
          created_at: row.created_at,
          updated_at: row.created_at,
        }));
      }
    } catch (err) {
      console.error("Error in listMyEssays:", err);
    }

    try {
      const { data } = await supabaseAdmin
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
    const { isAdmin: checkAdmin } = await import("@/lib/auth-admin");
    const isAdmin = Boolean(
      context.isAdmin ||
        checkAdmin({
          userId: context.userId,
          email: (context as any).email,
          claims: (context as any).claims,
        }),
    );

    try {
      const { data: sub, error: subError } = await supabaseAdmin
        .from("essay_submissions")
        .select("*")
        .eq("id", data.essayId)
        .maybeSingle();

      if (!subError && sub) {
        const s = sub as any;
        if (!isAdmin && s.user_id !== context.userId) {
          throw new Error("You do not have permission to view this essay.");
        }
        let gradingResult = s.grading_result || {};
        if (typeof gradingResult === "string") {
          try {
            gradingResult = JSON.parse(gradingResult);
          } catch {
            gradingResult = {};
          }
        }
        if (!gradingResult || typeof gradingResult !== "object") {
          gradingResult = {};
        }

        const maxMark = s.max_marks ?? gradingResult?.max_mark ?? 8;
        const totalMark = s.awarded_marks ?? gradingResult?.total_mark ?? 0;
        const ao1 = gradingResult?.ao_breakdown?.knowledge?.awarded ?? s.ao1_mark ?? null;
        const ao2 = gradingResult?.ao_breakdown?.analysis?.awarded ?? s.ao2_mark ?? null;
        const ao3 = gradingResult?.ao_breakdown?.evaluation?.awarded ?? s.ao3_mark ?? null;

        return {
          essay: {
            id: s.id,
            question: s.question,
            max_mark: maxMark,
            latest_mark: totalMark,
            created_at: s.created_at,
            user_id: s.user_id,
          },
          versions: [
            {
              id: s.id,
              version: 1,
              essay_text: s.essay_text,
              grading: gradingResult,
              total_mark: totalMark,
              ao1_awarded: ao1,
              ao2_awarded: ao2,
              ao3_awarded: ao3,
              confidence: gradingResult?.confidence ?? 0.95,
              audited: Boolean(gradingResult?.audited),
              created_at: s.created_at,
            },
          ],
        };
      }
    } catch (e: any) {
      if (e.message?.includes("permission")) throw e;
      console.error("Error fetching essay_submissions in getEssayThread:", e);
    }

    try {
      const { data: essay, error } = await supabaseAdmin
        .from("essays")
        .select("id, question, max_mark, latest_mark, created_at, user_id")
        .eq("id", data.essayId)
        .maybeSingle();

      if (!error && essay) {
        if (!isAdmin && essay.user_id !== context.userId) {
          throw new Error("You do not have permission to view this essay.");
        }
        const { data: versions } = await supabaseAdmin
          .from("essay_versions")
          .select("id, version, essay_text, grading, total_mark, confidence, audited, created_at")
          .eq("essay_id", data.essayId)
          .order("version", { ascending: true });

        const safeVersions = (versions ?? []).map((ver: any) => {
          let g = ver.grading;
          if (typeof g === "string") {
            try {
              g = JSON.parse(g);
            } catch {
              g = {};
            }
          }
          return { ...ver, grading: g ?? {} };
        });

        return { essay, versions: safeVersions };
      }
    } catch {}

    throw new Error("That essay could not be found.");
  });

/** Student progress figures for the dashboard. */
export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("essay_submissions")
        .select("id, max_marks, awarded_marks, grading_result, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data.map((row: any) => {
          const g = (row.grading_result || {}) as any;
          const maxM = row.max_marks ?? g?.max_mark ?? 8;
          const awarded = row.awarded_marks ?? g?.total_mark ?? 0;

          // Accurate AO breakdown according to Cambridge IGCSE 0455
          let ao1Awarded = g?.ao_breakdown?.knowledge?.awarded ?? g?.ao1_awarded ?? g?.ao1_mark;
          let ao2Awarded = g?.ao_breakdown?.analysis?.awarded ?? g?.ao2_awarded ?? g?.ao2_mark;
          let ao3Awarded = g?.ao_breakdown?.evaluation?.awarded ?? g?.ao3_awarded ?? g?.ao3_mark;

          const ao1OutOf = g?.ao_breakdown?.knowledge?.out_of ?? (maxM === 8 ? 2 : maxM === 6 ? 2 : 2);
          const ao2OutOf = g?.ao_breakdown?.analysis?.out_of ?? (maxM === 8 ? 3 : maxM === 6 ? 4 : 2);
          const ao3OutOf = g?.ao_breakdown?.evaluation?.out_of ?? (maxM === 8 ? 3 : 0);

          if (ao1Awarded === undefined && ao2Awarded === undefined && ao3Awarded === undefined && awarded > 0) {
            if (maxM === 8) {
              ao1Awarded = Math.min(2, Math.round(awarded * 0.25));
              ao2Awarded = Math.min(3, Math.round(awarded * 0.40));
              ao3Awarded = Math.max(0, awarded - (ao1Awarded ?? 0) - (ao2Awarded ?? 0));
            } else {
              ao1Awarded = Math.min(ao1OutOf, Math.round(awarded * 0.5));
              ao2Awarded = Math.max(0, awarded - (ao1Awarded ?? 0));
              ao3Awarded = 0;
            }
          }

          return {
            id: row.id,
            essay_id: row.id,
            total_mark: awarded,
            max_mark: maxM,
            ao1_awarded: ao1Awarded ?? 0,
            ao2_awarded: ao2Awarded ?? 0,
            ao3_awarded: ao3Awarded ?? 0,
            ao1_out_of: ao1OutOf,
            ao2_out_of: ao2OutOf,
            ao3_out_of: ao3OutOf,
            confidence: g?.confidence ?? 0.9,
            created_at: row.created_at,
          };
        });
      }
    } catch (err) {
      console.error("Error in getProgress:", err);
    }

    try {
      const { data } = await supabaseAdmin
        .from("essay_versions")
        .select("id, essay_id, total_mark, grading, ao1_awarded, ao2_awarded, ao3_awarded, confidence, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        return data.map((v: any) => {
          const g = (v.grading || {}) as any;
          const awarded = v.total_mark ?? g?.total_mark ?? 0;
          const rawMax = g?.max_mark ?? v.max_mark;
          const maxM = rawMax === 12 ? 8 : (rawMax ?? 8);
          let ao1 = v.ao1_awarded ?? g?.ao_breakdown?.knowledge?.awarded;
          let ao2 = v.ao2_awarded ?? g?.ao_breakdown?.analysis?.awarded;
          let ao3 = v.ao3_awarded ?? g?.ao_breakdown?.evaluation?.awarded;

          if (ao1 == null && ao2 == null && ao3 == null && awarded > 0) {
            ao1 = Math.min(2, Math.round(awarded * 0.25));
            ao2 = Math.min(3, Math.round(awarded * 0.40));
            ao3 = Math.max(0, awarded - ao1 - ao2);
          }

          return {
            ...v,
            total_mark: awarded,
            max_mark: maxM,
            ao1_awarded: ao1 ?? 0,
            ao2_awarded: ao2 ?? 0,
            ao3_awarded: ao3 ?? 0,
            ao1_out_of: 2,
            ao2_out_of: 3,
            ao3_out_of: 3,
          };
        });
      }
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
