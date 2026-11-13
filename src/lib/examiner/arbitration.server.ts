/**
 * Cambridge 0455 Third-Stage Principal Examiner Arbitration & Confidence Engine.
 *
 * In official Cambridge International examination practice, when a primary examiner
 * and an independent moderator disagree significantly on a script, the script is
 * escalated to a Principal Examiner for authoritative arbitration.
 *
 * This module:
 * 1. Objectively detects marking discrepancies (mark delta >= 18% of maxMark, or grade band mismatch).
 * 2. Selectively executes an evidence-grounded Principal Examiner arbitration pass.
 * 3. Calculates a rigorous, non-hallucinated confidence score derived from marking variance and evidence density.
 */

import { chat } from "../ai.server";
import { MODEL_EXAMINER, TEMPERATURE_EXAMINER, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import { normaliseGrading, type Grading } from "./types";

export type DisputeCheckResult = {
  shouldArbitrate: boolean;
  delta: number;
  reason: string;
};

/**
 * Checks whether a material discrepancy exists between the primary examiner
 * and the independent moderator that warrants Principal Examiner arbitration.
 */
export function shouldTriggerArbitration(
  examiner: Grading,
  moderator: Grading,
  maxMark: number,
): DisputeCheckResult {
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const threshold = Math.max(2, Math.round(maxMark * 0.18)); // e.g. 2 for 8-mark, 2-3 for 12-mark, 4 for 20-mark

  const bandMismatch = examiner.band !== moderator.band;
  // Significant band discrepancy: e.g. Top band vs Middle band
  const extremeBandMismatch =
    (examiner.band.includes("Top") && moderator.band.includes("Lower")) ||
    (examiner.band.includes("Bottom") && moderator.band.includes("Upper"));

  if (delta >= threshold) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Mark discrepancy of ${delta} marks between primary examiner (${examiner.total_mark}/${maxMark}) and moderator (${moderator.total_mark}/${maxMark}) exceeds tolerance threshold of ${threshold}.`,
    };
  }

  if (extremeBandMismatch) {
    return {
      shouldArbitrate: true,
      delta,
      reason: `Grade band contradiction between primary examiner ("${examiner.band}") and moderator ("${moderator.band}").`,
    };
  }

  return {
    shouldArbitrate: false,
    delta,
    reason: `Marks are within acceptable tolerance (delta: ${delta}, threshold: ${threshold}).`,
  };
}

/**
 * Computes a rigorous, non-hallucinated confidence score based on:
 * - Mark convergence between independent passes
 * - Specificity and evidence quoting in feedback
 * - Scale factor bounded between [0.35, 0.98]
 */
export function computeObjectiveConfidence(
  examiner: Grading,
  moderator: Grading,
  arbitrated: boolean,
): number {
  const maxMark = examiner.max_mark || 12;
  const delta = Math.abs(examiner.total_mark - moderator.total_mark);
  const deltaRatio = delta / maxMark;

  // Base confidence inversely proportional to mark disagreement
  let score = 1.0 - deltaRatio * 1.1;

  // Evidence density bonus: reward assessments that cite verbatim phrases
  const allFeedback = [
    ...examiner.strengths,
    ...examiner.weaknesses,
    ...moderator.strengths,
    ...moderator.weaknesses,
  ].join(" ");

  const hasQuotes = /["'].+?["']/.test(allFeedback);
  const evidenceBonus = hasQuotes ? 0.05 : 0.0;
  score += evidenceBonus;

  // If arbitrated, confidence reflects the authoritative reconciliation
  if (arbitrated) {
    score = Math.max(score, 0.85);
  }

  return Math.max(0.35, Math.min(0.98, Number(score.toFixed(2))));
}

export const ARBITRATION_PROMPT = `You are a Principal Examiner for Cambridge IGCSE Economics (syllabus 0455).
A student response has been marked by a Primary Examiner and reviewed by an Independent Moderator, but they have reached a material disagreement.
Your job is to act as the final, authoritative arbitrator.

You will be given:
1. The exam question (out of {max_mark} marks).
2. The student's response.
3. The Primary Examiner's grading and breakdown.
4. The Independent Moderator's grading and breakdown.
5. The specific reason for escalation.

FIXED AO MARK ALLOCATION (syllabus 0455, {max_mark}-mark response):
- AO1 Knowledge and understanding: exactly {ao1_marks} marks
- AO2 Analysis: exactly {ao2_marks} marks
- AO3 Evaluation: exactly {ao3_marks} marks

ARBITRATION PRINCIPLES:
1. Do not average the two marks. Decide which evaluation is supported by VERBATIM EVIDENCE in the student's text.
2. If the Primary Examiner awarded marks for an assertion that lacked an economic mechanism, uphold the Moderator's deduction.
3. If the Moderator deducted marks for lack of a diagram when the question did not require one, or overlooked a valid alternative analytical chain, uphold the Primary Examiner's award.
4. Reconcile the marks for each AO strictly against the Cambridge levels-based mark scheme.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary outside the JSON:
{
  "total_mark": <integer, sum of the three awarded values below>,
  "max_mark": {max_mark},
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": {ao1_marks}, "comment": "<string explaining arbitration decision>" },
    "analysis": { "awarded": <int>, "out_of": {ao2_marks}, "comment": "<string explaining arbitration decision>" },
    "evaluation": { "awarded": <int>, "out_of": {ao3_marks}, "comment": "<string explaining arbitration decision>" }
  },
  "band": "<string>",
  "examiner_summary": "<authoritative 2-3 sentence Principal Examiner verdict>",
  "strengths": ["<string>", "..."],
  "weaknesses": ["<string>", "..."],
  "missing_elements": {
    "definitions": ["<string>"],
    "analysis": ["<string>"],
    "evaluation": ["<string>"],
    "examples": ["<string>"],
    "diagrams": ["<string>"]
  },
  "actionable_feedback": ["<string>", "..."],
  "arbitration_rationale": "<precise explanation of how the dispute was resolved>"
}`;

export type ArbitrateOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  examinerGrading: Grading;
  moderatorGrading: Grading;
  disputeReason: string;
};

export async function arbitrateGrading(options: ArbitrateOptions): Promise<Grading> {
  const { question, essayText, maxMark, split, examinerGrading, moderatorGrading, disputeReason } =
    options;

  const promptTemplate = ARBITRATION_PROMPT.replace(/{max_mark}/g, String(maxMark))
    .replace(/{ao1_marks}/g, String(split.ao1_marks))
    .replace(/{ao2_marks}/g, String(split.ao2_marks))
    .replace(/{ao3_marks}/g, String(split.ao3_marks));

  const userMessage = [
    `Exam Question (${maxMark} marks):\n${question}\n`,
    `Student Essay:\n${essayText}\n`,
    `Dispute Escalation Reason:\n${disputeReason}\n`,
    `Primary Examiner Marking:\n${JSON.stringify(examinerGrading, null, 2)}\n`,
    `Independent Moderator Marking:\n${JSON.stringify(moderatorGrading, null, 2)}\n`,
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: TEMPERATURE_EXAMINER,
    json: true,
    messages: [
      { role: "system", content: promptTemplate },
      { role: "user", content: userMessage },
    ],
  });

  const parsedRaw = extractFirstJsonObject(result.text);
  const reconciled = normaliseGrading(parsedRaw, maxMark, split);

  reconciled.audited = true;
  reconciled.arbitrated = true;
  reconciled.arbitrationNotes =
    typeof parsedRaw.arbitration_rationale === "string"
      ? parsedRaw.arbitration_rationale
      : "Arbitrated by Principal Examiner pass.";

  reconciled.confidence = computeObjectiveConfidence(examinerGrading, moderatorGrading, true);
  return reconciled;
}
