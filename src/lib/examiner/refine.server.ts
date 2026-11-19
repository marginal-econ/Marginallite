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
import { normaliseGrading, purgeContradictions, type Grading } from "./types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "./writing-quality.server";

export const REPORT_REFINER_PROMPT = `You are a Senior Principal Examiner for Cambridge IGCSE Economics (syllabus ${SYLLABUS_CODE}).
You are performing the final quality audit of an assessment report before it is delivered to the student and teacher.
STRICT PLAIN TEXT DIRECTIVE: NEVER use markdown asterisks (*, **, or ***) anywhere in your output. Return clean plain text only.

Your mission:
1. AUDIT ECONOMIC ACCURACY & PROTECT SOUND ANSWERS (IGCSE 0455 UNITS 1–6):
   - NEVER invent phantom errors or penalise valid IGCSE phrasing ("owtte").
   - Only flag a misconception if you verify an explicit economic falsehood in the student's text.
   - If the draft report hallucinated a false criticism (e.g. calling standard scarcity or opportunity cost definitions wrong), OVERTURN and REMOVE it.
   - STRICT IGCSE 0455 BOUNDARY: Purge any mention or expectation of A-Level-only topics (indifference curves, marginal utility, diminishing marginal returns, MRPL, kinked demand curve, Keynesian cross, multiplier formula k=1/MPW, Paper 3/4, AS/A Level).
   - Keep the total_mark and AO breakdown consistent with the examiner's verified assessment — do NOT invent arbitrary mark changes unless fixing a clear contradiction or verified error.

2. ELIMINATE ALL INTERNAL CONTRADICTIONS:
   - Never allow strengths to praise an example, definition, or conclusion while weaknesses or missing_elements claim it is missing.
   - For non-evaluative questions (AO3 out_of = 0, e.g. 2m Define, 4m Explain, 6m Analyse), ensure weaknesses and missing_elements NEVER ask for evaluation or conclusions.

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
    refined = applyWritingQualityGuardrail(refined, quality, maxMark, split, essayText);

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
    if (!refined.suggested_resources.length && draftGrading.suggested_resources.length) {
      refined.suggested_resources = draftGrading.suggested_resources;
    }
    if (!refined.suggested_practice.length && draftGrading.suggested_practice.length) {
      refined.suggested_practice = draftGrading.suggested_practice;
    }

    return cleanStars(purgeContradictions(refined));
  } catch (err) {
    console.warn("[refine.server] Pass 3 refinement skipped, returning cleansed draft:", err);
    return cleanStars(purgeContradictions(draftGrading));
  }
}
