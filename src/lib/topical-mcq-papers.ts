import type { McqDomain, McqSkill } from "@/lib/mcq-domain";
import type { StemBlob } from "@/lib/mcq-pdf-text";

export type TopicalVisualType = "diagram" | "table" | "calculation" | "text";

export type TopicalQuestionSlice = {
  index: number;
  number: number;
  sourcePaperCode: string;
  sourceYear: number;
  sourceSeries: string;
  sourceQuestionNumber: number;
  correctOption: "A" | "B" | "C" | "D";
  topicTag: string;
  subtopic?: string;
  skill?: McqSkill;
  stemText?: string;
  visualType?: TopicalVisualType;
  pdfUrl?: string;
  pageNumber?: number;
  stem?: StemBlob;
};

export type TopicalMcqPaper = {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  level: "as" | "a2";
  domain: Exclude<McqDomain, "unclassified">;
  topicNumber: string;
  unitNumber: number;
  unitName: string;
  topicCode: string;
  questionCount: number;
  durationMinutes: number;
  durationSeconds: number;
  visualSummaryLabel: string;
  description: string;
  answerKey: Record<string, "A" | "B" | "C" | "D">;
  questions: TopicalQuestionSlice[];
};

export const TOPICAL_MCQ_PAPERS: TopicalMcqPaper[] = [];

export function isTopicalPaperId(paperId: string | null | undefined): boolean {
  if (!paperId) return false;
  return paperId.startsWith("topical-");
}

export function getTopicalPaperById(paperId: string | null | undefined): TopicalMcqPaper | null {
  if (!paperId) return null;
  return TOPICAL_MCQ_PAPERS.find((p) => p.id === paperId) ?? null;
}

export function toMcqPaperSummaryFromTopical(topical: TopicalMcqPaper) {
  return {
    id: topical.id,
    title: topical.title,
    level: topical.level,
    examYear: 2026,
    examSeries: "Topical",
    questionCount: topical.questionCount,
    qpUrl: "",
    msUrl: null,
    answerKey: topical.answerKey,
    createdAt: new Date().toISOString(),
  };
}

export async function renderTopicalPaperPages(
  _params: {
    topicalPaper: TopicalMcqPaper;
    scale?: number;
    fetchPdfBytes?: (url: string) => Promise<Uint8Array>;
    fetchPdfBuffer?: (url: string) => Promise<ArrayBuffer>;
    onProgress?: (label: string) => void;
  },
): Promise<{
  pages: Array<{ pageNumber: number; dataUrl: string; width: number; height: number; canvas: HTMLCanvasElement }>;
  stems: StemBlob[];
  questionPages: Record<number, number>;
  questionSlices: Record<number, HTMLCanvasElement>;
}> {
  return { pages: [], stems: [], questionPages: {}, questionSlices: {} };
}
