import { useLiveExaminer } from "./use-live-examiner";

export { useLiveExaminer as useLiveExaminerCheck };

export type IssueCategory =
  | "grammar"
  | "clarity"
  | "economics_accuracy"
  | "analysis"
  | "application"
  | "evaluation"
  | "reasoning_chain"
  | "terminology"
  | "misconception"
  | "spelling"
  | "punctuation";

export type IssueSeverity = "low" | "medium" | "high";

export type LiveExaminerIssue = {
  original: string;
  suggestion: string;
  category: IssueCategory;
  severity: IssueSeverity;
  explanation: string;
  context: string;
  evidence?: string;
  aoImpact?: string;
};

export type ActiveIssue = LiveExaminerIssue & {
  id: string;
  from?: number;
  to?: number;
  sentenceId?: string;
  status?: "active" | "accepted" | "dismissed";
};
export type ActiveAoClassification = {
  id: string;
  ao: "AO1" | "AO2" | "AO3";
  original: string;
  context: string;
  explanation: string;
};

export type HistoryEntry = LiveExaminerIssue & {
  id: string;
  status: "active" | "accepted" | "dismissed";
  firstSeenAt: number;
  resolvedAt: number | null;
};

export type { PredictedMark } from "./use-live-examiner";
