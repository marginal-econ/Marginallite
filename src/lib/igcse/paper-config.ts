/**
 * Single source of truth for Cambridge IGCSE Economics 0455 Paper Configurations and Assessment Eras.
 * Derived from the official 2027–2029 Syllabus and Feb/March 2026 QPs (0455/12 and 0455/22).
 */

export type Era = "legacy" | "2027";

export const MCQ_PAPER_CONFIG = {
  legacy: {
    questions: 30,
    marks: 30,
    durationSeconds: 45 * 60, // 2700s
    secondsPerQuestion: 90,
    label: "Legacy Format (up to June 2026): 30 Questions, 45 Minutes",
  },
  "2027": {
    questions: 40,
    marks: 40,
    durationSeconds: 60 * 60, // 3600s
    secondsPerQuestion: 90,
    label: "2027–2029 Syllabus Format: 40 Questions, 1 Hour",
  },
} as const;

export const STRUCTURED_PAPER_CONFIG = {
  legacy: {
    marks: 90,
    durationSeconds: 135 * 60, // 8100s = 2h 15m
    sectionAQuestions: 1, // Q1 (parts a-h, 20 marks)
    sectionBAnswerCount: 3, // Answer 3 of 4 (Q2-Q5, 20 marks each)
    label: "Legacy Format (up to 2026): 90 Marks, 2 Hours 15 Minutes",
  },
  "2027": {
    marks: 80,
    durationSeconds: 120 * 60, // 7200s = 2h
    sectionAQuestions: 1, // Q1 (parts a-f, 20 marks)
    sectionBAnswerCount: 3, // Answer 3 of 4 (20 marks each)
    label: "2027–2029 Syllabus Format: 80 Marks, 2 Hours",
  },
} as const;

/**
 * Determine assessment era from paper series and year.
 */
export function detectEraFromMetadata(params: {
  year?: number | string | null;
  series?: string | null;
  questionCount?: number | null;
  durationSeconds?: number | null;
}): Era {
  if (params.questionCount === 40 || params.durationSeconds === 3600) {
    return "2027";
  }
  if (params.questionCount === 30 || params.durationSeconds === 2700) {
    return "legacy";
  }

  const numericYear = Number(params.year);
  if (!numericYear || isNaN(numericYear)) return "legacy";

  if (numericYear < 2026) return "legacy";
  if (numericYear > 2026) return "2027";

  // Year 2026: Feb/March ('m') and May/June ('s') are legacy
  const series = String(params.series || "").toLowerCase();
  if (
    series.startsWith("m") ||
    series.startsWith("s") ||
    series.includes("feb") ||
    series.includes("may") ||
    series.includes("june")
  ) {
    return "legacy";
  }
  return "2027";
}
