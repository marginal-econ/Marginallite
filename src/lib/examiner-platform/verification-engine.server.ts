import type { QuestionMarkRecord, VerificationFlag } from "./types";

export type ScriptVerificationResult = {
  isValid: boolean;
  totalComputedMark: number;
  totalMaxMark: number;
  criticalFlags: VerificationFlag[];
  overallQuality: "excellent" | "good" | "needs_teacher_review" | "high_uncertainty";
};

export function verifyScriptMarking(
  questions: Array<Omit<QuestionMarkRecord, "id" | "script_id" | "created_at" | "updated_at">>,
): ScriptVerificationResult {
  const flags: VerificationFlag[] = [];
  let totalComputed = 0;
  let totalMax = 0;

  for (const q of questions) {
    totalComputed += q.ai_awarded_mark;
    totalMax += q.max_mark;

    // Check 1: Exceeding question max mark
    if (q.ai_awarded_mark > q.max_mark) {
      flags.push({
        id: `overflow-${q.question_number}`,
        severity: "caution",
        category: "mark_cap",
        message: `Question ${q.question_number}: Awarded mark (${q.ai_awarded_mark}) exceeds question tariff (${q.max_mark}). Clamped to maximum.`,
      });
      q.ai_awarded_mark = q.max_mark;
    }

    // Check 2: Mathematical synchrony between AO components and question total
    const aoSum =
      q.ao_breakdown.knowledge.awarded +
      q.ao_breakdown.analysis.awarded +
      q.ao_breakdown.evaluation.awarded;

    if (aoSum !== q.ai_awarded_mark) {
      flags.push({
        id: `ao-mismatch-${q.question_number}`,
        severity: "warning",
        category: "mark_cap",
        message: `Question ${q.question_number}: Total mark (${q.ai_awarded_mark}) does not match AO component sum (${aoSum}). Synchronized.`,
      });
      q.ai_awarded_mark = aoSum;
    }

    // Check 3: Handwriting ambiguity / [?] flags
    if (q.transcription_snippet.includes("[?]")) {
      flags.push({
        id: `ambiguity-${q.question_number}`,
        severity: "info",
        category: "handwriting_ambiguity",
        message: `Question ${q.question_number}: Contains faint or ambiguous handwriting marked with [?]. Teacher inspection recommended.`,
      });
    }

    // Check 4: Diagram expectation vs detection
    if (q.diagram_detected && q.diagram_evaluation) {
      if (!q.diagram_evaluation.axes_labelled_correctly) {
        flags.push({
          id: `diag-axes-${q.question_number}`,
          severity: "info",
          category: "diagram_check",
          message: `Question ${q.question_number}: Diagram has unlabelled or mislabelled axes.`,
        });
      }
      if (!q.diagram_evaluation.shift_direction_correct && q.diagram_evaluation.name?.includes("shift")) {
        flags.push({
          id: `diag-shift-${q.question_number}`,
          severity: "warning",
          category: "diagram_check",
          message: `Question ${q.question_number}: Diagram curve shift appears backwards or reversed.`,
        });
      }
    }

    // Add existing question flags
    if (q.verification_flags && q.verification_flags.length > 0) {
      flags.push(...q.verification_flags);
    }
  }

  const cautionCount = flags.filter((f) => f.severity === "caution").length;
  const warningCount = flags.filter((f) => f.severity === "warning").length;

  let overallQuality: "excellent" | "good" | "needs_teacher_review" | "high_uncertainty" = "excellent";
  if (cautionCount > 0) {
    overallQuality = "high_uncertainty";
  } else if (warningCount >= 2) {
    overallQuality = "needs_teacher_review";
  } else if (warningCount === 1) {
    overallQuality = "good";
  }

  return {
    isValid: cautionCount === 0,
    totalComputedMark: totalComputed,
    totalMaxMark: totalMax,
    criticalFlags: flags,
    overallQuality,
  };
}
