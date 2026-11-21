import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { unwrapData } from "@/lib/safe-validator";
import { classifyMcqQuestion } from "./mcq-domain";
import { isMcqMistakeType, type McqMistakeType } from "./mcq-mistakes";

export type { PaperHistoryEntry, McqDiagnostic, McqExplanationResult } from "./mcq/mcq-pdf.server";

const LevelSchema = z.enum(["as", "a2"]);
const MistakeTypeSchema = z.enum([
  "concept_gap",
  "distractor_trap",
  "stem_misread",
  "calculation_rush",
]);

/** Tag each extracted question with a syllabus topic — classification only, no new questions. */
export const classifyMcqTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        level: LevelSchema,
        items: z.array(z.object({ number: z.number().int().min(0), text: z.string() })).max(120),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data }) => {
    const { classifyPdfMcqTopics } = await import("./mcq/mcq-pdf.server");
    const tags = await classifyPdfMcqTopics({ level: data.level, items: data.items });
    return { tags };
  });

// Answer buttons are a plain fixed side panel (one row per question,
// A/B/C/D) — no page-position placement of any kind, so there is
// deliberately no AI pathway here for locating, placing, or auditing
// button positions.

/**
 * On-demand explanation for one question in the post-attempt review
 * screen — typically opened for a question the student got wrong. Never
 * called before an attempt is marked, and never used to grade anything.
 */
export const explainMcqAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        level: LevelSchema,
        number: z.number().int().positive(),
        stemText: z.string().max(4000).default(""),
        correctAnswer: z.enum(["A", "B", "C", "D"]),
        userAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
        topic: z.string().max(300).optional(),
        subtopic: z.string().max(300).optional(),
        mistakeType: MistakeTypeSchema.nullable().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data }) => {
    const { explainPdfMcqAnswer } = await import("./mcq/mcq-pdf.server");
    const explanation = await explainPdfMcqAnswer(data);
    return { explanation };
  });

const SubmittedQuestion = z.object({
  number: z.number().int().positive(),
  topic: z.string().default("Untagged"),
  subtopic: z.string().optional(),
  stem_text: z.string().max(2000).optional(),
  skill: z.enum(["knowledge", "application", "analysis"]).default("knowledge"),
  correct_answer: z.enum(["A", "B", "C", "D"]).nullable(),
  user_answer: z.enum(["A", "B", "C", "D"]).nullable(),
  correct: z.boolean().nullable(),
  mistake_type: MistakeTypeSchema.nullable().optional(),
});

/** Persist one graded past-paper attempt, so it feeds the same topic feedback as generated papers. */
export const submitPdfMcqAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().max(200).default("Past paper practice"),
        filename: z.string().trim().max(200).optional(),
        level: LevelSchema,
        paperId: z.string().min(1).max(160),
        questions: z.array(SubmittedQuestion).max(80),
        gradeOnlyAttempted: z.boolean().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getTopicalPaperById } = await import("./topical-mcq-papers");
    const topicalPaper = getTopicalPaperById(data.paperId);

    let resolvedTitle = data.title;
    let resolvedDbPaperId: string | null = null;
    let answerKey: Record<string, "A" | "B" | "C" | "D"> = {};
    let questionCount = 0;

    if (topicalPaper) {
      if (topicalPaper.level !== data.level) {
        throw new Error("The paper level does not match this attempt.");
      }
      resolvedTitle = topicalPaper.title;
      resolvedDbPaperId = null;
      answerKey = topicalPaper.answerKey;
      questionCount = topicalPaper.questionCount;
    } else {
      const { data: paper, error: paperError } = await supabase
        .from("mcq_pdf_papers")
        .select("id,title,level,question_count,answer_key")
        .eq("id", data.paperId)
        .single();
      if (paperError || !paper) throw new Error("That published paper could not be found.");
      if (paper.level !== data.level) throw new Error("The paper level does not match this attempt.");

      resolvedTitle = paper.title;
      resolvedDbPaperId = paper.id;
      answerKey = (paper.answer_key ?? {}) as Record<string, "A" | "B" | "C" | "D">;
      questionCount = Number(paper.question_count);
    }

    for (let number = 1; number <= questionCount; number += 1) {
      if (!answerKey[String(number)]) {
        throw new Error(
          `This paper cannot be marked because question ${number} is missing from its mark scheme.`,
        );
      }
    }

    const submittedByNumber = new Map(
      data.questions.map((question) => [question.number, question]),
    );
    const levelUpper = data.level === "a2" ? "A2" : "AS";
    const graded = Array.from({ length: questionCount }, (_, index) => {
      const number = index + 1;
      const submitted = submittedByNumber.get(number);
      const topicalQuestion = topicalPaper?.questions.find((q) => q.number === number);
      const stemText =
        submitted?.stem_text?.trim() ||
        (topicalQuestion?.stemText ?? "");
      const classified = classifyMcqQuestion({
        level: levelUpper,
        number,
        text: stemText,
        existingTopic:
          submitted?.topic && submitted.topic !== "Untagged"
            ? submitted.topic
            : topicalPaper?.shortTitle,
        existingSubtopic: submitted?.subtopic || topicalQuestion?.subtopic,
        existingSkill: submitted?.skill || topicalQuestion?.skill,
      });
      const correctAnswer = answerKey[String(number)];
      const userAnswer = submitted?.user_answer ?? null;
      const isAttempted = userAnswer !== null && userAnswer !== undefined;
      const isCorrect = isAttempted
        ? userAnswer === correctAnswer
        : data.gradeOnlyAttempted
          ? null
          : false;
      return {
        number,
        topic: classified.topic,
        subtopic: topicalQuestion?.subtopic || classified.subtopic,
        unit: classified.unit,
        domain: classified.domain,
        skill: classified.skill,
        stem_text: stemText ? stemText.slice(0, 1400) : undefined,
        correct_answer: correctAnswer,
        user_answer: userAnswer,
        correct: isCorrect,
        mistake_type: isCorrect === false && isMcqMistakeType(submitted?.mistake_type)
          ? submitted!.mistake_type
          : null,
      };
    });
    const score = graded.filter((question) => question.correct === true).length;
    const attemptedCount = graded.filter((question) => question.correct !== null).length;
    const total = data.gradeOnlyAttempted
      ? Math.max(1, attemptedCount)
      : questionCount;

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("mcq_pdf_attempts")
      .insert({
        user_id: userId,
        title: resolvedTitle,
        level: data.level,
        paper_id: resolvedDbPaperId,
        score,
        total,
        answers: graded as unknown as never,
        completed_at: new Date().toISOString(),
      })
      .select("id, score, total")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not save that attempt.");

    // Update candidate presence timestamp
    await supabaseAdmin
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", userId);

    return { attemptId: row.id, score: row.score, total: row.total };
  });

/**
 * Weakest-first canonical Cambridge IGCSE 0455 topic breakdown across past-paper
 * and practice attempts. Automatically normalizes any legacy/freeform or
 * "Untagged" rows into canonical syllabus topics so the student always gets
 * accurate, actionable topic-wise diagnostics.
 */
export const getMcqTopicPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const { data: pdfAttempts, error } = await supabaseAdmin
      .from("mcq_pdf_attempts")
      .select("id, paper_id, title, level, answers, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    if (error) throw new Error(error.message);

    const buckets = new Map<
      string,
      {
        topic: string;
        unit: string;
        domain: "micro" | "macro";
        revisionTip: string;
        attempted: number;
        correct: number;
      }
    >();

    const mistakeCounts: Record<McqMistakeType, number> = {
      concept_gap: 0,
      distractor_trap: 0,
      stem_misread: 0,
      calculation_rush: 0,
    };
    let totalWrongWithMistakeTracking = 0;

    // Deduplicate by paper key using the latest completed attempt per paper
    // so retaking a paper reflects current mastery without double-counting.
    const seenPaperKeys = new Set<string>();
    for (const row of pdfAttempts ?? []) {
      const key =
        row.paper_id ??
        (typeof row.title === "string" && row.title.startsWith("Topical Past Paper:")
          ? `topical:${row.title}`
          : `solo:${row.id}`);
      if (seenPaperKeys.has(key)) continue;
      seenPaperKeys.add(key);

      const levelUpper = row.level === "a2" ? "A2" : "AS";
      const questions = Array.isArray((row as any).answers)
        ? (row as any).answers
        : Array.isArray((row as any).questions)
          ? (row as any).questions
          : [];
      for (const rawQ of questions) {
        if (!rawQ || typeof rawQ !== "object") continue;
        const q = rawQ as Record<string, unknown>;
        const num = typeof q.number === "number" ? q.number : 1;
        const classified = classifyMcqQuestion({
          level: levelUpper,
          number: num,
          text: typeof q.stem_text === "string" ? q.stem_text : undefined,
          existingTopic: typeof q.topic === "string" ? q.topic : undefined,
          existingSubtopic: typeof q.subtopic === "string" ? q.subtopic : undefined,
        });
        const isCorrect = q.correct === true;
        if (!isCorrect && isMcqMistakeType(q.mistake_type)) {
          mistakeCounts[q.mistake_type] += 1;
          totalWrongWithMistakeTracking += 1;
        }
        const entry = buckets.get(classified.topic) ?? {
          topic: classified.topic,
          unit: classified.unit,
          domain: classified.domain,
          revisionTip: classified.revisionTip,
          attempted: 0,
          correct: 0,
        };
        entry.attempted += 1;
        if (isCorrect) entry.correct += 1;
        buckets.set(classified.topic, entry);
      }
    }

    const genResData: any[] = [];
    for (const row of genResData) {
      const levelUpper =
        typeof row.level === "string" && row.level.toUpperCase() === "A2" ? "A2" : "AS";
      const questions = Array.isArray(row.questions) ? row.questions : [];
      const answers =
        row.answers && typeof row.answers === "object"
          ? (row.answers as Record<string, unknown>)
          : {};
      questions.forEach((rawQ: any, idx: number) => {
        if (!rawQ || typeof rawQ !== "object") return;
        const q = rawQ as Record<string, unknown>;
        const num = typeof q.number === "number" ? q.number : idx + 1;
        const classified = classifyMcqQuestion({
          level: levelUpper,
          number: num,
          text: typeof q.stem === "string" ? q.stem : undefined,
          existingTopic: typeof q.topic === "string" ? q.topic : undefined,
        });
        const ansObj = answers[String(idx)] as Record<string, unknown> | undefined;
        const isCorrect = ansObj?.correct === true;
        const entry = buckets.get(classified.topic) ?? {
          topic: classified.topic,
          unit: classified.unit,
          domain: classified.domain,
          revisionTip: classified.revisionTip,
          attempted: 0,
          correct: 0,
        };
        entry.attempted += 1;
        if (isCorrect) entry.correct += 1;
        buckets.set(classified.topic, entry);
      });
    }

    const topics = [...buckets.values()]
      .filter((t) => t.attempted > 0)
      .map((t) => {
        const accuracyPct = Math.round((t.correct / t.attempted) * 1000) / 10;
        return {
          topic: t.topic,
          unit: t.unit,
          domain: t.domain,
          revisionTip: t.revisionTip,
          attempted: t.attempted,
          correct: t.correct,
          marksLost: t.attempted - t.correct,
          accuracyPct,
        };
      })
      .sort((a, b) => {
        if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
        return b.marksLost - a.marksLost;
      });

    return {
      topics,
      mistakeCounts,
      totalTaggedMistakes: totalWrongWithMistakeTracking,
    };
  });

/**
 * Every past paper the student has practiced, one row per paper (not per
 * attempt) — retakes collapse together. Only the first completed attempt
 * at a given paper counts toward its aggregate score; later retakes are
 * shown too (so a student can see they've since improved) but never
 * replace it. Feeds the "Your history" sidebar on the library page.
 */
export const getMyPaperHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data, error } = await supabaseAdmin
      .from("mcq_pdf_attempts")
      .select("id, title, level, paper_id, score, total, completed_at, created_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { groupPdfAttemptsByPaper } = await import("./mcq/mcq-pdf.server");
    return { papers: groupPdfAttemptsByPaper((data ?? []) as never) };
  });

export type McqAttemptItem = {
  id: string;
  title: string;
  level: "as" | "a2";
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
  kind: "past_paper" | "practice";
  paperId: string | null;
};

export type MyMcqSummary = {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyPct: number | null;
  bestPercentage: number | null;
  asAttempts: number;
  a2Attempts: number;
  recentAttempts: McqAttemptItem[];
};

/**
 * High-level consolidated MCQ performance summary for the student dashboard.
 * Unifies Cambridge past papers and practice attempts with overall accuracy metrics.
 */
export const getMyMcqSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyMcqSummary> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const pdfRes = await supabaseAdmin
      .from("mcq_pdf_attempts")
      .select("id, title, level, paper_id, score, total, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20);

    const items: McqAttemptItem[] = [];

    for (const r of pdfRes.data ?? []) {
      if (r.score !== null && r.total && r.total > 0) {
        const pct = Math.round((r.score / r.total) * 100);
        items.push({
          id: r.id,
          title: r.title || "Cambridge Past Paper",
          level: (r.level?.toLowerCase() === "a2" ? "a2" : "as") as "as" | "a2",
          score: r.score,
          total: r.total,
          percentage: pct,
          completedAt: r.completed_at || new Date().toISOString(),
          kind: "past_paper",
          paperId: r.paper_id ?? null,
        });
      }
    }

    const genResData: any[] = [];
    for (const r of genResData) {
      if (r.score !== null && r.total && r.total > 0) {
        const pct = Math.round((r.score / r.total) * 100);
        items.push({
          id: r.id,
          title: r.title || "Topic Practice MCQ",
          level: (r.level?.toLowerCase() === "a2" ? "a2" : "as") as "as" | "a2",
          score: r.score,
          total: r.total,
          percentage: pct,
          completedAt: r.completed_at || new Date().toISOString(),
          kind: "practice",
          paperId: null,
        });
      }
    }

    items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    let totalCorrect = 0;
    let totalQuestions = 0;
    let bestPercentage: number | null = null;
    let asAttempts = 0;
    let a2Attempts = 0;

    for (const it of items) {
      totalCorrect += it.score;
      totalQuestions += it.total;
      if (bestPercentage === null || it.percentage > bestPercentage) {
        bestPercentage = it.percentage;
      }
      if (it.level === "a2") {
        a2Attempts++;
      } else {
        asAttempts++;
      }
    }

    const accuracyPct =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

    return {
      totalAttempts: items.length,
      totalQuestions,
      totalCorrect,
      accuracyPct,
      bestPercentage,
      asAttempts,
      a2Attempts,
      recentAttempts: items.slice(0, 8),
    };
  });

/**
 * Full per-question breakdown for one past attempt, owned by the caller —
 * lets a student reopen a paper they already finished and revise it (the
 * review list + on-demand explanations) without redownloading or
 * re-rendering the original PDF.
 */
export const getPdfMcqAttempt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attemptId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("mcq_pdf_attempts")
      .select("id, title, level, paper_id, score, total, completed_at, answers")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That attempt wasn't found.");

    const levelUpper = row.level === "a2" ? "A2" : "AS";
    const rawQuestions = Array.isArray((row as any).answers)
      ? (row as any).answers
      : Array.isArray((row as any).questions)
        ? (row as any).questions
        : [];
    const normalizedQuestions = rawQuestions.map((rawQ: any, idx: number) => {
      const q = (rawQ && typeof rawQ === "object" ? rawQ : {}) as Record<string, unknown>;
      const number = typeof q.number === "number" ? q.number : idx + 1;
      const stemText = typeof q.stem_text === "string" ? q.stem_text : "";
      const classified = classifyMcqQuestion({
        level: levelUpper,
        number,
        text: stemText,
        existingTopic: typeof q.topic === "string" ? q.topic : undefined,
        existingSubtopic: typeof q.subtopic === "string" ? q.subtopic : undefined,
        existingSkill: typeof q.skill === "string" ? q.skill : undefined,
      });
      return {
        number,
        topic: classified.topic,
        subtopic: classified.subtopic,
        unit: classified.unit,
        domain: classified.domain,
        skill: classified.skill,
        stem_text: stemText,
        correct_answer: (q.correct_answer ?? null) as "A" | "B" | "C" | "D" | null,
        user_answer: (q.user_answer ?? null) as "A" | "B" | "C" | "D" | null,
        correct: (q.correct ?? null) as boolean | null,
        mistake_type: isMcqMistakeType(q.mistake_type) ? q.mistake_type : null,
      };
    });

    return {
      id: row.id as string,
      title: row.title as string,
      level: row.level as "as" | "a2",
      paperId: row.paper_id as string,
      score: row.score as number | null,
      total: row.total as number,
      completedAt: row.completed_at as string | null,
      questions: normalizedQuestions,
    };
  });

/** Proxy paper PDF download on the server to prevent any client CORS or network filter blocks. */
export const fetchPaperPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        qpUrl: z.string().url(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data }) => {
    const res = await fetch(data.qpUrl);
    if (!res.ok) throw new Error(`Could not fetch PDF from storage (${res.status} ${res.statusText})`);
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return { base64 };
  });

