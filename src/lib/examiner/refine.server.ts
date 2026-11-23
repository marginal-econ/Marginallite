/**
 * Cambridge IGCSE Economics (0455) Third-Stage Senior Report Refiner & Consistency Auditor.
 *
 * Mirrors Marginal's Pass 3 Report Refiner, adapted strictly to Cambridge IGCSE 0455:
 * 1. Verifies economic accuracy across IGCSE Units 1–6 and protects sound student answers.
 * 2. Purges any accidental A-Level / 9708 jargon or expectations.
 * 3. Eliminates internal contradictions between strengths, weaknesses, and missing_elements.
 * 4. Strips internal [S#] codes, markdown asterisks, and score fractions from prose.
 * 5. Ensures suggested_resources cites exact Cambridge IGCSE 0455 syllabus units/topics.
 */

import { cleanStars } from "@/lib/utils";
import { chat } from "../ai.server";
import { MODEL_EXAMINER, SYLLABUS_CODE, type AoSplit } from "./config";
import { extractFirstJsonObject } from "./json";
import {
  deduplicateAcrossSections,
  normaliseGrading,
  purgeContradictions,
  type Grading,
} from "./types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "./writing-quality.server";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge IGCSE Economics (syllabus ${SYLLABUS_CODE}).
You are performing the final quality audit of an assessment report before it is delivered to the student and teacher.
STRICT PLAIN TEXT DIRECTIVE: NEVER use markdown asterisks (*, **, or ***) anywhere in your output. Return clean plain text only.

Your mission:
1. AUDIT ECONOMIC ACCURACY & PROTECT SOUND ANSWERS (IGCSE 0455 UNITS 1–6):
   - Catch & correct false praise or inverted causal mechanisms:
     * Interest rates & Exchange rates: Higher domestic interest rates attract foreign hot-money inflows -> currency APPRECIATES (stronger exchange rate) -> exports become dearer, imports cheaper. Lower interest rates cause DEPRECIATION. NEVER claim higher interest rates depreciate a currency!
     * Net exports (X - M) affect the CURRENT account of the balance of payments.
     * Scarcity & Opportunity Cost: Standard IGCSE definitions (scarcity = finite resources vs unlimited wants; opportunity cost = next best alternative forgone) are foundational and correct; NEVER call them vague or tautological.
   - NEVER invent phantom errors or penalise valid IGCSE phrasing ("owtte").
   - Only flag a misconception if you verify an explicit economic falsehood in the student's text.
   - If the draft report hallucinated a false criticism, OVERTURN and REMOVE it.
   - STRICT IGCSE 0455 BOUNDARY: Purge any mention or expectation of A-Level-only topics (indifference curves, marginal utility, diminishing marginal returns, MRPL, kinked demand curve, Keynesian cross, multiplier formula k=1/MPW, Paper 3/4, AS/A Level).

2. ZERO REPETITION — DISTINCT NON-OVERLAPPING ROLES FOR EVERY SECTION:
   - Eliminate ALL duplicate or near-duplicate points inside "strengths", "weaknesses", "missing_elements.*", and "actionable_feedback".
   - Enforce STRICT NON-OVERLAPPING ROLES across sections so the student NEVER reads the same criticism three times:
     * "examiner_summary" (2–3 concise sentences): High-level verdict explaining why the essay sits in its band.
     * "ao_breakdown.*.comment" (1–2 sentences each): Concise justification specific to THAT AO only.
     * "strengths" (2–4 distinct bullets): Specific things done well with verified verbatim quotes.
     * "weaknesses" (2–4 distinct bullets): Diagnostic issues in what was written (each bullet = a DIFFERENT economic issue).
     * "missing_elements": Ultra-concise checklist phrases (8–18 words, MAX 2 items per category, [] if none) listing ONLY omitted concepts/steps NOT already explained in full in "weaknesses".
     * "actionable_feedback" (2–3 concrete bullets): Concrete HOW-TO rewrite instructions (specific paragraph, causal chain, or weighing criterion to write next), phrased distinctly from "weaknesses" and "missing_elements".

3. CLEAN HUMAN CAMBRIDGE VOICE:
   - Purge all internal retrieval codes ([S1], [S2], etc.) and score fractions in prose (e.g. "(3/4)", "held at 5", "cost you marks").
   - Ensure any quoted text ("...") appears verbatim in the candidate's response.

4. TOPIC-ALIGNED IGCSE 0455 RESOURCES & PRACTICE:
   - "suggested_resources": Cite exact Cambridge IGCSE 0455 syllabus units/topics (Units 1–6, e.g. "Cambridge IGCSE 0455 Unit 2.6: Price Elasticity of Demand", "Cambridge IGCSE 0455 Unit 4.3: Fiscal Policy").
   - "suggested_practice": Keep every task strictly on the question's specific IGCSE topic.

Respond ONLY with a single valid JSON object matching the draft grading schema (preserving "points", "missed_ms_points", and "command_word_check" if present).`;

export type RefineReportOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  draftGrading: Grading;
  userId?: string;
};

export async function refineExaminerReport(options: RefineReportOptions): Promise<Grading> {
  const { question, essayText, maxMark, split, draftGrading, userId } = options;

  const userMessage = [
    `CAMBRIDGE IGCSE 0455 EXAM QUESTION (${maxMark} marks | AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):`,
    question,
    "",
    `CANDIDATE RESPONSE:`,
    essayText,
    "",
    `DRAFT EXAMINER REPORT TO AUDIT & REFINE:`,
    JSON.stringify(draftGrading, null, 2),
  ].join("\n");

  try {
    const result = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      userId,
      feature: "grade_essay_pass3_refiner",
      maxCompletionTokens: 4096,
      messages: [
        { role: "system", content: REPORT_REFINER_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const parsed = extractFirstJsonObject(result.text);
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) {
      return cleanStars(purgeContradictions(draftGrading));
    }

    let refined = normaliseGrading(parsed, maxMark, split, essayText);

    // Keep refiner anchored to the examiner's adjudicated mark (within ±1 mark tolerance only if fixing an error)
    if (Math.abs(refined.total_mark - draftGrading.total_mark) > 1) {
      refined.total_mark = draftGrading.total_mark;
      refined.ao_breakdown.knowledge.awarded = draftGrading.ao_breakdown.knowledge.awarded;
      refined.ao_breakdown.analysis.awarded = draftGrading.ao_breakdown.analysis.awarded;
      refined.ao_breakdown.evaluation.awarded = draftGrading.ao_breakdown.evaluation.awarded;
      refined.band = draftGrading.band;
    }

    const quality = analyzeEssayQuality(essayText, maxMark, split);
    refined = applyWritingQualityGuardrail(refined, quality, maxMark, split, essayText, question);

    // Preserve structured metadata from examiner passes
    refined.sources = draftGrading.sources;
    refined.anchorsUsed = draftGrading.anchorsUsed;
    refined.grounding_status = draftGrading.grounding_status;
    refined.confidence = Math.max(draftGrading.confidence, refined.confidence || 0.88);
    refined.audited = true;
    refined.arbitrated = draftGrading.arbitrated;
    refined.arbitrationNotes = draftGrading.arbitrationNotes;
    if (!refined.points?.length && draftGrading.points?.length) {
      refined.points = draftGrading.points;
    }
    if (!refined.command_word_check && draftGrading.command_word_check) {
      refined.command_word_check = draftGrading.command_word_check;
    }
    if (!refined.suggested_resources?.length && draftGrading.suggested_resources?.length) {
      refined.suggested_resources = draftGrading.suggested_resources;
    }
    if (!refined.suggested_practice?.length && draftGrading.suggested_practice?.length) {
      refined.suggested_practice = draftGrading.suggested_practice;
    }

    return cleanStars(deduplicateAcrossSections(purgeContradictions(refined), question));
  } catch (err) {
    console.warn("[refine.server] Pass 3 refinement skipped, returning cleansed draft:", err);
    return cleanStars(deduplicateAcrossSections(purgeContradictions(draftGrading), question));
  }
}
