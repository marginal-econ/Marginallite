import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { FALLBACK_0455_MCQ_PAPERS, FALLBACK_0455_ESSAY_QUESTIONS } from "./fallback-archive";

export interface MatrixArchivePaper {
  id: string;
  title: string;
  era: "legacy" | "2027";
  examYear: number;
  examSeries: string;
  questionCount: number;
  qpUrl: string;
  msUrl: string | null;
}

export interface MatrixArchiveEssay {
  id: string;
  era: "legacy" | "2027";
  topic: string;
  maxMark: number;
  examSeries: string | null;
  questionText: string;
}

export interface MatrixArchiveData {
  mcqPapers: MatrixArchivePaper[];
  essayQuestions: MatrixArchiveEssay[];
  years: number[];
  totalMcq: number;
  totalEssays: number;
}

export const getPaperMatrixArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    let dbMcqPapers: MatrixArchivePaper[] = [];
    let dbEssayQuestions: MatrixArchiveEssay[] = [];

    // 1. Fetch all MCQ papers safely (catch schema differences or empty tables)
    try {
      const { data: mcqData, error: mcqErr } = await supabase
        .from("mcq_pdf_papers")
        .select("id, title, level, exam_year, exam_series, question_count, qp_url, ms_url")
        .order("exam_year", { ascending: false })
        .order("title", { ascending: true });

      if (!mcqErr && mcqData && mcqData.length > 0) {
        dbMcqPapers = mcqData.map((p: any) => ({
          id: p.id,
          title: p.title || "Cambridge 0455 Paper",
          era: (p.level === "2027" || (p.exam_year && p.exam_year >= 2027) ? "2027" : "legacy") as "legacy" | "2027",
          examYear: p.exam_year ?? 2024,
          examSeries: p.exam_series ?? "May/June",
          questionCount: p.question_count ?? 30,
          qpUrl: p.qp_url || "",
          msUrl: p.ms_url || null,
        }));
      }
    } catch (err) {
      console.warn("Could not query mcq_pdf_papers, falling back to curated archive:", err);
    }

    // 2. Fetch all Essay questions safely
    try {
      const { data: essayData, error: essayErr } = await supabase
        .from("bank_essay_questions")
        .select("id, topic, max_mark, series, question")
        .order("created_at", { ascending: false })
        .limit(600);

      if (!essayErr && essayData && essayData.length > 0) {
        dbEssayQuestions = essayData.map((e: any) => ({
          id: e.id,
          era: "legacy" as const,
          topic: e.topic || "General Economics",
          maxMark: e.max_mark || 8,
          examSeries: e.series || null,
          questionText: e.question || "",
        }));
      }
    } catch (err) {
      console.warn("Could not query bank_essay_questions, falling back to curated archive:", err);
    }

    // Merge DB results with authoritative fallback archive to ensure 100% complete archive coverage
    const mcqPapers = dbMcqPapers.length > 0 ? dbMcqPapers : FALLBACK_0455_MCQ_PAPERS;
    const essayQuestions = dbEssayQuestions.length > 0 ? dbEssayQuestions : FALLBACK_0455_ESSAY_QUESTIONS;

    const yearSet = new Set<number>();
    for (const p of mcqPapers) {
      if (p.examYear) yearSet.add(p.examYear);
    }
    // Also parse years from essay series string (e.g. "0455/22/F/M/26 Question 3(d)")
    for (const e of essayQuestions) {
      const match = e.examSeries?.match(/\b(20\d{2})\b/);
      if (match) yearSet.add(parseInt(match[1], 10));
      const yearFromCode = e.examSeries?.match(/\/(\d{2})\b/);
      if (yearFromCode) yearSet.add(2000 + parseInt(yearFromCode[1], 10));
    }

    // Always include modern Cambridge 0455 exam years
    [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].forEach((y) => yearSet.add(y));

    const years = Array.from(yearSet).sort((a, b) => b - a);

    return {
      mcqPapers,
      essayQuestions,
      years,
      totalMcq: mcqPapers.length,
      totalEssays: essayQuestions.length,
    } satisfies MatrixArchiveData;
  });
