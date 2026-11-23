import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { unwrapData } from "@/lib/safe-validator";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/backend/types";
import { isAdmin } from "@/lib/auth-admin";

const EraSchema = z.enum(["legacy", "2027"]).or(z.string());
const ExamSeriesSchema = z.enum(["Feb/March", "May/June", "Oct/Nov"]);

async function assertLibraryStaff(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const isUserAdmin = isAdmin({
    userId: context.userId,
    email: (context as any).email,
    claims: (context as any).claims,
  });
  if (isUserAdmin) return;

  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["teacher"]);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only an administrator or teacher can manage MCQ papers.");
}

/** Get current server epoch time for clock drift calibration. */
export const getServerTime = createServerFn({ method: "GET" })
  .handler(async () => {
    return { serverNow: Date.now() };
  });

/**
 * Server-authoritative attempt start. Records starting time and returns
 * absolute examEndsAt timestamp.
 */
export const startMcqAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const paperId = typeof raw === "string" ? raw : (raw as any)?.paperId || (raw as any)?.id;
    return z.object({ paperId: z.string().uuid() }).parse({ paperId });
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: paper, error } = await supabase
      .from("mcq_pdf_papers")
      .select("id, title, level, question_count, exam_year, exam_series")
      .eq("id", data.paperId)
      .single();

    if (error || !paper) throw new Error("Paper not found");

    const questionCount = Number(paper.question_count) || 30;
    const is2027 = questionCount === 40 || Number(paper.exam_year) >= 2027;
    const durationSeconds = is2027 ? 3600 : 2700;
    const serverNow = Date.now();
    const examEndsAt = serverNow + durationSeconds * 1000;

    const { data: attempt, error: attemptError } = await supabase
      .from("mcq_pdf_attempts")
      .insert({
        user_id: userId,
        paper_id: paper.id,
        title: paper.title,
        level: is2027 ? "2027" : "legacy",
        total: questionCount,
        created_at: new Date(serverNow).toISOString(),
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      throw new Error(attemptError?.message || "Failed to initialize MCQ attempt");
    }

    return {
      attemptId: attempt.id,
      serverNow,
      durationSeconds,
      examEndsAt,
    };
  });

/** Anyone signed in can browse the library — this is what /mcq-live's picker reads. */
export const listMcqPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select(
        "id, title, level, exam_year, exam_series, question_count, qp_url, ms_url, answer_key, created_at",
      )
      .order("exam_year", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      papers: (data ?? []).map((p) => {
        const keyObj = (p.answer_key ?? {}) as Record<string, "A" | "B" | "C" | "D">;
        const qCount = (p.question_count ?? 0) as number;
        const hasCompleteKey =
          qCount > 0 &&
          Array.from({ length: qCount }, (_, i) => keyObj[String(i + 1)]).every(Boolean);

        return {
          id: p.id as string,
          title: p.title as string,
          level: (p.level ?? "as") as "as" | "a2",
          examYear: (p.exam_year ?? null) as number | null,
          examSeries: (p.exam_series ?? null) as string | null,
          questionCount: qCount,
          qpUrl: p.qp_url as string,
          msUrl: (p.ms_url ?? null) as string | null,
          hasCompleteKey,
          answerKey: keyObj,
          createdAt: p.created_at as string,
        };
      }),
    };
  });

/** Reliable single-paper answer-key lookup for live practice & tutor mode. */
export const getMcqPaperAnswerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paperId: z.string().min(1) }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data: paper, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select("id, title, question_count, answer_key, qp_url, ms_url")
      .eq("id", data.paperId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!paper) return { answerKey: {} as Record<string, "A" | "B" | "C" | "D">, questionCount: 30 };
    return {
      answerKey: ((paper as any).answer_key ?? {}) as Record<string, "A" | "B" | "C" | "D">,
      questionCount: Number((paper as any).question_count) || 30,
      qpUrl: (paper as any).qp_url ?? null,
      msUrl: (paper as any).ms_url ?? null,
    };
  });

const PaperInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    level: EraSchema,
    examYear: z.number().int().min(1990).max(2100),
    examSeries: ExamSeriesSchema,
    questionCount: z.number().int().positive().max(40),
    qpPath: z.string().min(1),
    qpUrl: z.string().url(),
    msPath: z.string().optional(),
    msUrl: z.string().url().optional(),
    answerKey: z.record(z.string(), z.enum(["A", "B", "C", "D"])).default({}),
  })
  .superRefine((paper, context) => {
    for (let number = 1; number <= paper.questionCount; number += 1) {
      if (!paper.answerKey[String(number)]) {
        context.addIssue({
          code: "custom",
          path: ["answerKey", String(number)],
          message: `The mark scheme is missing an answer for question ${number}.`,
        });
        break;
      }
    }
  });

export const addMcqPapers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ papers: z.array(PaperInput).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const rows = data.papers.map((p) => ({
      title: p.title,
      level: p.level === "legacy" ? "as" : p.level,
      exam_year: p.examYear,
      exam_series: p.examSeries,
      question_count: p.questionCount,
      qp_path: p.qpPath,
      qp_url: p.qpUrl,
      ms_path: p.msPath ?? null,
      ms_url: p.msUrl ?? null,
      answer_key: p.answerKey,
      uploaded_by: context.userId,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .insert(rows)
      .select("id");

    if (error) {
      throw new Error(
        error.code === "42501" || /row-level security/i.test(error.message)
          ? "Only an administrator can add papers to the library."
          : error.message,
      );
    }
    return { added: inserted?.length ?? 0 };
  });

export const deleteMcqPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const id = typeof raw === "string" ? raw : (raw as any)?.id;
    return z.object({ id: z.string().uuid() }).parse({ id });
  })
  .handler(async ({ data, context }) => {
    await assertLibraryStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { error } = await supabaseAdmin.from("mcq_pdf_papers").delete().eq("id", data.id);
    if (error) {
      throw new Error(
        error.code === "42501" || /row-level security/i.test(error.message)
          ? "Only an administrator can remove a paper."
          : error.message,
      );
    }
    return { ok: true };
  });
