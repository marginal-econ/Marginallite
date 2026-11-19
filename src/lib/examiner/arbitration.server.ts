/**
 * Cambridge IGCSE Economics (0455) Principal Examiner Arbitration, Dual-Pass Synthesis
 * & Objective Confidence Engine.
 *
 * Reproduces Marginal's proven multi-pass examiner reconciliation:
 * 1. Detects material marking discrepancies (mark delta >= tolerance or grade band contradiction).
 * 2. Executes Principal Examiner arbitration grounded in verbatim student evidence when passes diverge.
 * 3. Synthesizes Pass 1 (temp 0.0 precision) and Pass 2 (temp 0.2 holistic judgment) when passes converge.
 * 4. Computes an objective, evidence-grounded confidence score in [0.35, 0.98].
 */

import { cleanStars } from "@/lib/utils";
import { chat } from "../ai.server";
import {
  formatStructureNote,
  getStructureGuidance,
  MODEL_ARBITRATION,
  SYLLABUS_CODE,
  TEMPERATURE_EXAMINER,
  type AoSplit,
} from "./config";
import { extractFirstJsonObject } from "./json";
import {
  bandFor,
  deduplicateFeedbackPoints,
  normaliseGrading,
  purgeContradictions,
  sanitizeIgcseFeedbackText,
  type Grading,
} from "./types";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
  type EssayQualityAnalysis,
} from "./writing-quality.server";

export type DisputeCheckResult = {
  shouldArbitrate: boolean;
  delta: number;
  reason: string;
};

/**
 * Checks whether a material discrepancy exists between Pass 1 (examiner) and Pass 2 (moderator)
 * that warrants Principal Examiner arbitration.
 */
export function shouldTriggerArbitration(
  examiner: Grading,
  moderator: Grading,
  maxMark: number,
): DisputeCheckResult {
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const threshold = Math.max(2, Math.round(maxMark * 0.18));

  const zeroDiscrepancy =
    (examiner.total_mark === 0 && moderator.total_mark > 0) ||
    (moderator.total_mark === 0 && examiner.total_mark > 0);

  if (zeroDiscrepancy) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Relevance discrepancy: one examiner awarded 0 marks while the other pass awarded positive marks (${Math.max(examiner.total_mark, moderator.total_mark)}/${maxMark}).`,
    };
  }

  const normEx = (examiner.band || "").toLowerCase();
  const normMod = (moderator.band || "").toLowerCase();
  const extremeBandMismatch =
    (normEx.includes("top") && normMod.includes("lower")) ||
    (normMod.includes("top") && normEx.includes("lower")) ||
    (normEx.includes("bottom") && normMod.includes("upper")) ||
    (normMod.includes("bottom") && normEx.includes("upper")) ||
    (normEx.includes("level 3") && normMod.includes("level 1")) ||
    (normMod.includes("level 3") && normEx.includes("level 1"));

  if (delta >= threshold) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Mark discrepancy of ${delta} marks between primary pass (${examiner.total_mark}/${maxMark}) and second pass (${moderator.total_mark}/${maxMark}) exceeds tolerance threshold of ${threshold}.`,
    };
  }

  if (extremeBandMismatch) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Grade band contradiction between primary pass ("${examiner.band}") and second pass ("${moderator.band}").`,
    };
  }

  return {
    shouldArbitrate: false,
    delta,
    reason: `Marks are within acceptable tolerance (delta: ${delta}, threshold: ${threshold}).`,
  };
}

/**
 * Computes an objective confidence score derived from inter-pass convergence and verbatim evidence density.
 */
export function computeObjectiveConfidence(
  examiner: Grading,
  moderator: Grading,
  arbitrated: boolean,
): number {
  const maxMark = examiner.max_mark || 8;
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const deltaRatio = delta / maxMark;

  let score = 1.0 - deltaRatio * 1.1;

  const allFeedback = [
    ...examiner.strengths,
    ...examiner.weaknesses,
    ...moderator.strengths,
    ...moderator.weaknesses,
  ].join(" ");

  const hasQuotes = /["'].+?["']/.test(allFeedback);
  score += hasQuotes ? 0.05 : 0.0;

  if (arbitrated) {
    score = Math.max(score, 0.88);
  }

  return Math.max(0.35, Math.min(0.98, Number(score.toFixed(2))));
}

/**
 * Synthesizes Pass 1 (analytical rigor at temp 0.0) and Pass 2 (holistic judgment at temp 0.2)
 * when both passes converge within tolerance (no arbitration needed).
 * Embeds Pass 1's error precision with Pass 2's constructive holistic narrative.
 */
export function synthesizeDualPasses(
  pass1: Grading,
  pass2: Grading,
  maxMark: number,
  split: AoSplit,
  qualityAnalysis?: EssayQualityAnalysis,
  essayText?: string,
): Grading {
  // Prefer Pass 1 if it proved an explicit fatal misconception with verbatim quotes
  const pass1FoundFatal = Boolean(
    pass1.mechanism_validation?.fatal_misconceptions_found &&
      (pass1.mechanism_validation?.error_evidence_quotes?.length ?? 0) > 0,
  );

  const pickMark = (a: number, b: number, cap: number) => {
    if (pass1FoundFatal) return Math.min(cap, Math.min(a, b));
    return Math.min(cap, Math.round((a + b) / 2));
  };

  const ao1 = pickMark(pass1.ao_breakdown.knowledge.awarded, pass2.ao_breakdown.knowledge.awarded, split.ao1_marks);
  const ao2 = pickMark(pass1.ao_breakdown.analysis.awarded, pass2.ao_breakdown.analysis.awarded, split.ao2_marks);
  const ao3 = pickMark(pass1.ao_breakdown.evaluation.awarded, pass2.ao_breakdown.evaluation.awarded, split.ao3_marks);
  const total = Math.max(0, Math.min(maxMark, ao1 + ao2 + ao3));

  const pickBetterComment = (c1: string, c2: string) =>
    (c2?.trim().length ?? 0) >= (c1?.trim().length ?? 0) ? c2 : c1;

  const merged: Grading = {
    ...pass2,
    total_mark: total,
    max_mark: maxMark,
    band: bandFor(total, maxMark),
    mechanism_validation: pass1.mechanism_validation ?? pass2.mechanism_validation,
    points: pass1.points?.length ? pass1.points : pass2.points,
    missed_ms_points: deduplicateFeedbackPoints(
      [...(pass1.missed_ms_points ?? []), ...(pass2.missed_ms_points ?? [])],
      5,
    ),
    command_word_check: pass1.command_word_check ?? pass2.command_word_check,
    ao_breakdown: {
      knowledge: {
        awarded: ao1,
        out_of: split.ao1_marks,
        comment: sanitizeIgcseFeedbackText(
          pickBetterComment(pass1.ao_breakdown.knowledge.comment, pass2.ao_breakdown.knowledge.comment),
        ),
      },
      analysis: {
        awarded: ao2,
        out_of: split.ao2_marks,
        comment: sanitizeIgcseFeedbackText(
          pickBetterComment(pass1.ao_breakdown.analysis.comment, pass2.ao_breakdown.analysis.comment),
        ),
      },
      evaluation: {
        awarded: ao3,
        out_of: split.ao3_marks,
        comment:
          split.ao3_marks === 0
            ? "Evaluation is not required for this question. No marks are lost for its omission."
            : sanitizeIgcseFeedbackText(
                pickBetterComment(pass1.ao_breakdown.evaluation.comment, pass2.ao_breakdown.evaluation.comment),
              ),
      },
    },
    examiner_summary: sanitizeIgcseFeedbackText(
      pass2.examiner_summary || pass1.examiner_summary,
    ),
    strengths: deduplicateFeedbackPoints([...pass2.strengths, ...pass1.strengths], 5),
    weaknesses: deduplicateFeedbackPoints([...pass1.weaknesses, ...pass2.weaknesses], 5),
    missing_elements: {
      definitions: deduplicateFeedbackPoints(
        [...pass1.missing_elements.definitions, ...pass2.missing_elements.definitions],
        4,
      ),
      analysis: deduplicateFeedbackPoints(
        [...pass1.missing_elements.analysis, ...pass2.missing_elements.analysis],
        4,
      ),
      evaluation:
        split.ao3_marks === 0
          ? []
          : deduplicateFeedbackPoints(
              [...pass1.missing_elements.evaluation, ...pass2.missing_elements.evaluation],
              4,
            ),
      examples: deduplicateFeedbackPoints(
        [...pass1.missing_elements.examples, ...pass2.missing_elements.examples],
        4,
      ),
      diagrams: deduplicateFeedbackPoints(
        [...pass1.missing_elements.diagrams, ...pass2.missing_elements.diagrams],
        3,
      ),
    },
    actionable_feedback: deduplicateFeedbackPoints(
      [...pass2.actionable_feedback, ...pass1.actionable_feedback],
      5,
    ),
    next_step_feedback: deduplicateFeedbackPoints(
      [...(pass2.next_step_feedback ?? []), ...(pass1.next_step_feedback ?? [])],
      4,
    ),
    suggested_resources: deduplicateFeedbackPoints(
      [...pass2.suggested_resources, ...pass1.suggested_resources],
      4,
    ),
    suggested_practice: deduplicateFeedbackPoints(
      [...pass2.suggested_practice, ...pass1.suggested_practice],
      4,
    ),
    confidence: computeObjectiveConfidence(pass1, pass2, false),
    audited: true,
    arbitrated: false,
  };

  const purged = purgeContradictions(merged);
  const finalResult = qualityAnalysis
    ? applyWritingQualityGuardrail(purged, qualityAnalysis, maxMark, split, essayText)
    : purged;

  return cleanStars(finalResult);
}

const ARBITRATION_PROMPT = `You are a Principal Examiner for Cambridge IGCSE Economics (syllabus {syllabus_code}).
A candidate response has been marked independently by two Senior Examiners:
- Pass 1 focused on theoretical error checking and mark-scheme precision (temperature 0.0).
- Pass 2 focused on holistic Cambridge IGCSE 0455 marking and constructive evaluation (temperature 0.2).
They reached a material disagreement. Your role is to act as the final authoritative Principal Examiner arbitrator.

FIXED AO MARK ALLOCATION (Cambridge IGCSE {syllabus_code}, {max_mark} marks):
- AO1 Knowledge and understanding: exactly {ao1_marks} marks
- AO2 Analysis: exactly {ao2_marks} marks
- AO3 Evaluation: exactly {ao3_marks} marks

AUTHORITATIVE CAMBRIDGE IGCSE 0455 RULES:
1. Base your decision strictly on verbatim evidence from the candidate's response.
2. Positive marking: reward accurate IGCSE economics ("owtte"). Never demand A-Level / 9708-only concepts.
3. Respect the exact tariff:
   - 2m: concise definition / calculation / dual identification.
   - 4m: 2 developed points × 2 marks (no evaluation required).
   - 6m Analyse: pure AO2 analysis (3×2m or 2×3m chains; listing capped at max 3/6). For 6m Diagram: 4m diagram + 2m written cause/outcome.
   - 6m Section A Discuss: up to 4m per side, max 6 total.
   - 8m Section B Discuss: Table A Levels 1–3 (one-sided capped in Level 2, max 5/8; Level 3 = 6–8 marks with balanced two-sided analysis + reasoned conclusion).
4. Strictly plain text: ZERO asterisks (* or **), ZERO [S#] codes, ZERO score fractions in prose, ZERO contradictions.

OFFICIAL STRUCTURE GUIDANCE:
{structure_note}

SUBMISSION QUALITY PROFILE:
{essay_quality_profile}

Respond ONLY with a single valid JSON object matching the standard grading schema with an extra "arbitration_notes" string explaining how you resolved the discrepancy.`;

export type ArbitrateOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  examinerGrading: Grading;
  moderatorGrading: Grading;
  disputeReason: string;
  userId?: string;
  qualityAnalysis?: EssayQualityAnalysis;
  isDiagramQuestion?: boolean;
};

export async function arbitrateGrading(options: ArbitrateOptions): Promise<Grading> {
  const {
    question,
    essayText,
    maxMark,
    split,
    examinerGrading,
    moderatorGrading,
    disputeReason,
    userId,
    isDiagramQuestion,
  } = options;

  const quality = options.qualityAnalysis ?? analyzeEssayQuality(essayText, maxMark, split);
  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split, isDiagramQuestion));
  const qualityDirective = buildQualityPromptDirective(quality, maxMark);

  const systemPrompt = ARBITRATION_PROMPT.replace(/{syllabus_code}/g, SYLLABUS_CODE)
    .replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks))
    .replace(/{structure_note}/g, structureNote)
    .replace(/{essay_quality_profile}/g, qualityDirective);

  const userMessage = [
    `EXAM QUESTION (${maxMark} marks):`,
    question,
    "",
    `CANDIDATE RESPONSE:`,
    essayText,
    "",
    `ESCALATION REASON: ${disputeReason}`,
    "",
    `PASS 1 (ERROR AUDIT, TEMP 0.0):`,
    JSON.stringify({
      total_mark: examinerGrading.total_mark,
      band: examinerGrading.band,
      ao_breakdown: examinerGrading.ao_breakdown,
      mechanism_validation: examinerGrading.mechanism_validation,
      weaknesses: examinerGrading.weaknesses,
    }),
    "",
    `PASS 2 (HOLISTIC ASSESSMENT, TEMP 0.2):`,
    JSON.stringify({
      total_mark: moderatorGrading.total_mark,
      band: moderatorGrading.band,
      ao_breakdown: moderatorGrading.ao_breakdown,
      strengths: moderatorGrading.strengths,
      weaknesses: moderatorGrading.weaknesses,
    }),
  ].join("\n");

  const res = await chat({
    model: MODEL_ARBITRATION,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    userId,
    feature: "grade_essay_arbitration",
    maxCompletionTokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = extractFirstJsonObject(res.text);
  let arbitrated = normaliseGrading(parsed, maxMark, split, essayText);
  arbitrated = applyWritingQualityGuardrail(arbitrated, quality, maxMark, split, essayText);
  arbitrated.audited = true;
  arbitrated.arbitrated = true;
  arbitrated.arbitrationNotes =
    typeof parsed.arbitration_notes === "string"
      ? sanitizeIgcseFeedbackText(parsed.arbitration_notes)
      : disputeReason;
  arbitrated.confidence = computeObjectiveConfidence(examinerGrading, moderatorGrading, true);

  return cleanStars(purgeContradictions(arbitrated));
}
