/**
 * Cambridge IGCSE Economics (0455)
 * Data Response & Case Study Types (Section A)
 */

import type { DiagramSpec } from "@/lib/diagrams/spec";

export type QuestionCategory =
  | "definition"
  | "calculation"
  | "short_answer"
  | "short_explain"
  | "data_interpretation"
  | "analytical_diagram"
  | "essay_evaluative"; // 6+ marks questions requiring Level-based rubric evaluation

export type RubricLevelSpec = {
  level: number;
  marksRange: string;
  label: string;
  description: string;
  evaluativeRequirement?: string;
};

export type DataResponseQuestion = {
  id: string;
  number: string; // e.g. "1(a)(i)", "1(a)(ii)", "1(b)", "1(c)", "1(d)"
  title: string;
  maxMark: number;
  category: QuestionCategory;
  tariff: {
    ao1: number; // AO1: Knowledge & Understanding
    ao2: number; // AO2: Analysis (incorporating Application to case study/data)
    ao3: number; // AO3: Evaluation (for evaluative questions, 0 for non-evaluative)
    ao4?: number; // Deprecated legacy field
  };
  rubricLevels?: RubricLevelSpec[];
  indicativePoints?: string[];
  calculationGuidance?: {
    formula?: string;
    correctAnswer?: string;
    ofrApplies?: boolean;
    markingSteps?: string[];
    steps?: string[];
  };
  hasDiagramRequirement: boolean;
  diagramSpec?: DiagramSpec; // Authentic SVG Cambridge Economics Diagram specification
  diagramSpecRef?: string;
  diagramGuidance?: {
    diagramName?: string;
    axes?: string[];
    curves?: string[];
    shiftDescription?: string;
    equilibriumDescription?: string;
    marksAllocated?: number;
  };
  markingGuide: string; // Full official MS text
  extractLinkageExpected: boolean; // Must directly use facts, figures, or context from extract
  syllabusTopic?: string;
  referencedFigureId?: string; // e.g. "Fig. 1.1" or "Table 1.1"
  pdfPageNumber?: number;
};

export type DataResponseFigure = {
  id: string; // e.g. "Fig. 1.1"
  title: string;
  type: "chart" | "diagram" | "table" | "image";
  caption?: string;
  dataPoints?: Array<{ label: string; value: number | string }>;
  svgMarkup?: string;
  imageUrl?: string;
  notes?: string;
};

export type DataResponseExtract = {
  title: string;
  paragraphs: string[];
  sources?: string;
  tables?: Array<{
    title?: string;
    headers: string[];
    rows: (string | number)[][];
    notes?: string;
  }>;
  figures?: DataResponseFigure[];
  pdfUrl?: string; // Direct link or data reference to authentic Cambridge past paper insert PDF
  pdfInsertUrl?: string;
};

export type DataResponsePaper = {
  id: string;
  title: string;
  subjectCode: "0455";
  subjectTitle: string;
  qualificationLevel: "as" | "a2" | "igcse";
  paperNumber: string; // "22", "42", "21", "41"
  examSeries: string; // "2023_may_june", "2023_oct_nov", etc.
  seriesLabel: string; // "May/June 2023"
  totalMarks: number;
  durationMinutes: number;
  extract: DataResponseExtract;
  questions: DataResponseQuestion[];
  isOfficial: boolean;
  originalExamCode?: string; // e.g. "0455/22/M/J/23"
  pdfUrl?: string;
  createdAt?: string;
  sampleAnswers?: Record<string, string>; // Sub-question number -> exemplar answer for testing
};

export type DiagramEvaluationResult = {
  detected: boolean;
  name?: string;
  axesLabelledCorrectly: boolean;
  curvesDrawnCorrectly: boolean;
  shiftDirectionCorrect: boolean;
  equilibriumLabelled: boolean;
  examinerComment: string;
  marksAwarded: number;
};

export type SpecificCriterionMet = {
  criterion: string;
  candidateEvidence?: string;
};

export type QuestionEvaluationResult = {
  questionNumber: string;
  questionTitle: string;
  maxMark: number;
  awardedMark: number;
  category: QuestionCategory;
  extractContextCheck: {
    usedContext: boolean;
    contextQuality: "strong" | "adequate" | "limited" | "generic_or_missing";
    feedback: string;
  };
  aoBreakdown: {
    knowledge: { awarded: number; outOf: number; comment?: string };
    analysis: { awarded: number; outOf: number; comment?: string };
    evaluation?: { awarded: number; outOf: number; comment?: string };
    application?: { awarded: number; outOf: number; comment?: string }; // Legacy support (application comes under AO2 analysis)
  };
  rubricLevelAwarded?: {
    level: number;
    label: string;
    marksRange: string;
    evaluativeComment?: string;
  };
  diagramEvaluation?: DiagramEvaluationResult;
  specificCriteriaMet?: SpecificCriterionMet[];
  examinerRationale: string;
  evidenceQuotes: string[];
  creditedPoints: string[];
  missingMarkSchemePoints: string[];
  constructiveFeedback?: string[];
  modelAnswerSnippet: string;
  improvementTip: string;
};

export type DataResponseSubmissionResult = {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectCode: string;
  totalMarksAwarded: number;
  maxTotalMarks: number;
  percentage: number;
  overallBand: string;
  examinerExecutiveSummary: string;
  questionResults: Record<string, QuestionEvaluationResult>;
  submittedAt: string;
};
