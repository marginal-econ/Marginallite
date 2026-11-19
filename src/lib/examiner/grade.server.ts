/**
 * Examiner engine — calibrated for Cambridge IGCSE Economics (syllabus 0455).
 *
 * Reproduces Marginal's complete Multi-Pass Examiner Architecture on IGCSE 0455:
 *  - Pre-flight syllabus guardrail (validates Cambridge IGCSE 0455 economics scope)
 *  - 4-Tier Retrieval Grounding (dense + hybrid RRF + lexical fallback against Marginalite's 0455 KB)
 *  - 6-Unit IGCSE 0455 Gold Calibration Anchors (2m, 4m, 6m, 6m Diagram 4+2, 8m Table A)
 *  - Dual Examiner Passes executed concurrently:
 *      * Pass 1 (Temp 0.0): Rigorous analytical, mark-scheme & misconception precision check
 *      * Pass 2 (Temp 0.2): Holistic Cambridge 0455 assessment & constructive human feedback
 *  - Reconciliation:
 *      * Selective Principal Examiner Arbitration if passes diverge beyond tolerance
 *      * Dual-Pass Synthesis when passes converge closely
 *  - Pass 3 Senior Report Refiner (time-budgeted): purges contradictions, [S#] tags, A-Level leaks & asterisks
 *  - Writing Quality Guardrail + Indicative Cambridge IGCSE 0455 Grade Standard
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCambridgeGradeStandard } from "@/lib/cambridge-thresholds";
import { cleanStars } from "@/lib/utils";
import { chat, visionChat } from "../ai.server";
import { renderContext, retrieve } from "../retrieval.server";
import {
  arbitrateGrading,
  shouldTriggerArbitration,
  synthesizeDualPasses,
} from "./arbitration.server";
import { buildAnchorBlock, fetchCalibrationAnchors, selectBestAnchors } from "./calibration.server";
import {
  buildAoEvaluationDirective,
  formatStructureNote,
  getStructureGuidance,
  MODEL_EXAMINER,
  renderAo3Descriptors,
  renderAoDefinitions,
  SYLLABUS_CODE,
  TEMPERATURE_PASS1,
  TEMPERATURE_PASS2,
  type AoSplit,
} from "./config";
import {
  EXAMINER_PROMPT,
  PASS1_ERROR_CHECK_DIRECTIVE,
  PASS2_HOLISTIC_EVALUATION_DIRECTIVE,
} from "./examiner-prompt";
import { extractFirstJsonObject } from "./json";
import { refineExaminerReport } from "./refine.server";
import { normaliseGrading, purgeContradictions, type Grading, type GroundingSource } from "./types";
import {
  analyzeEssayQuality,
  applyWritingQualityGuardrail,
  buildQualityPromptDirective,
} from "./writing-quality.server";

function loadPrompt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const RESPONSE_CONTRACT = `
Return ONLY a single JSON object with exactly this shape:
{
  "mechanism_validation": {
    "core_mechanisms_sound": boolean,
    "fatal_misconceptions_found": boolean,
    "error_evidence_quotes": string[]
  },
  "total_mark": number,
  "band": string,
  "table_a_breakdown": {
    "level": "Level 3 | Level 2 | Level 1 | Level 0",
    "level_mark_range": string,
    "two_sided_balance": "balanced | one_sided | undeveloped",
    "one_sided_cap_applied": boolean,
    "evaluative_conclusion_audit": {
      "status": "substantiated | generic_summary | missing",
      "marks_withheld": number,
      "withhold_reason": string,
      "verdict_found": boolean,
      "criteria_used": string[]
    },
    "knowledge_setup_awarded": number,
    "discussion_awarded": number
  },
  "points": [
    {
      "quote": string,
      "matched_ms_point": string,
      "identify_awarded": number,
      "development_awarded": number,
      "reason": string
    }
  ],
  "missed_ms_points": string[],
  "command_word_check": {
    "command_word": string,
    "satisfied": boolean,
    "comment": string
  },
  "ao_breakdown": {
    "knowledge":  { "awarded": number, "out_of": number, "comment": string },
    "analysis":   { "awarded": number, "out_of": number, "comment": string },
    "evaluation": { "awarded": number, "out_of": number, "comment": string }
  },
  "examiner_summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "missing_elements": {
    "definitions": string[],
    "analysis": string[],
    "evaluation": string[],
    "examples": string[],
    "diagrams": string[]
  },
  "actionable_feedback": string[],
  "next_step_feedback": string[],
  "suggested_resources": string[],
  "suggested_practice": string[],
  "confidence": number
}
- For 2-mark, 4-mark, and 6-mark point-marked questions, enumerate each credited point in "points" with separate identify_awarded (0 or 1) and development_awarded (0 or 1) marks.
- "error_evidence_quotes": ONLY include exact verbatim quotes of proven economic falsehoods; leave [] if mechanisms are sound.
- Strictly NO asterisks (* or **), NO [S#] retrieval tags, and NO score fractions in written prose.
`.trim();

export type GradeOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  isDiagramQuestion?: boolean;
  essayType?: string;
  auditPass?: boolean;
  topicId?: string | null;
  markSchemeImageDataUrls?: string[];
  isBudgetTier?: boolean;
  userId?: string;
  skipSyllabusValidation?: boolean;
  skipSyllabusPreflight?: boolean;
};

export type GradeOutcome = {
  grading: Grading;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
};

export async function gradeEssay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: GradeOptions,
): Promise<GradeOutcome> {
  const startedAt = Date.now();
  const { question, essayText, maxMark, split } = options;
  const { ao1_marks, ao2_marks, ao3_marks } = split;

  if (ao1_marks + ao2_marks + ao3_marks !== maxMark) {
    throw new Error(
      `The AO split (${ao1_marks}+${ao2_marks}+${ao3_marks}) does not sum to the total mark (${maxMark}).`,
    );
  }

  const isDiagram =
    Boolean(options.isDiagramQuestion) ||
    /\b(diagram|draw\s+a|using\s+a\s+(?:demand|supply|ppc|production\s+possibility))\b/i.test(
      question,
    );

  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split, isDiagram));
  const qualityAnalysis = analyzeEssayQuality(essayText, maxMark, split);
  const qualityDirective = buildQualityPromptDirective(qualityAnalysis, maxMark);

  const promptValues = {
    syllabus_code: SYLLABUS_CODE,
    max_mark: maxMark,
    ao1_marks,
    ao2_marks,
    ao3_marks,
    ao_definitions: renderAoDefinitions(),
    ao_evaluation_directive: buildAoEvaluationDirective(maxMark, split, isDiagram),
    ao3_level_descriptors: renderAo3Descriptors(maxMark, ao3_marks),
    structure_note: structureNote,
    essay_quality_profile: qualityDirective,
  };

  let baseSystemPrompt = loadPrompt(EXAMINER_PROMPT, promptValues);

  // --- 1. Syllabus Pre-Flight Guardrail ---
  const { validateEconomicsSyllabus, OffSyllabusError } = await import("./syllabus-guard.server");
  if (!options.skipSyllabusValidation && !options.skipSyllabusPreflight) {
    await validateEconomicsSyllabus(question, essayText);
  }

  // --- 2. Multi-Tier IGCSE 0455 Knowledge Base Retrieval ---
  let sources: GroundingSource[] = [];
  const docTypes = ["mark_scheme", "examiner_report", "syllabus", "coursebook", "notes"] as const;

  const tryRetrieve = async (query: string, minSimilarity: number, timeoutMs = 4500) => {
    return Promise.race([
      retrieve(supabase, {
        query,
        matchCount: 8,
        minSimilarity,
        docTypes: [...docTypes],
        topicId: options.topicId ?? null,
        enableHybridRrf: true,
      }),
      new Promise<GroundingSource[]>((_, reject) =>
        setTimeout(() => reject(new Error("Knowledge base lookup timed out")), timeoutMs),
      ),
    ]);
  };

  try {
    sources = await tryRetrieve(question, 0.38, 4500);
  } catch (err) {
    console.warn("[grade.server] Tier 1 retrieval warning:", err instanceof Error ? err.message : err);
  }

  if (!sources.length) {
    try {
      sources = await tryRetrieve(
        `${question} Cambridge IGCSE 0455 mark scheme syllabus`,
        0.2,
        3500,
      );
    } catch (err) {
      console.warn("[grade.server] Tier 2 retrieval warning:", err instanceof Error ? err.message : err);
    }
  }

  if (sources.length > 0) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n${renderContext(sources)}`;
  }

  // --- 3. Calibration Anchors (6-Unit IGCSE 0455 Gold Set + DB) ---
  let anchors: Awaited<ReturnType<typeof fetchCalibrationAnchors>> = [];
  try {
    anchors = await fetchCalibrationAnchors(supabase);
  } catch (anchorErr) {
    console.warn("[grade.server] Calibration anchor fetch warning:", anchorErr);
  }
  // Match the 1 or 2 most relevant anchors by tariff and question syllabus topic
  const selectedAnchors = selectBestAnchors(anchors, question, maxMark, 2);
  const anchorBlock = buildAnchorBlock(anchors, question, maxMark);
  if (anchorBlock) {
    baseSystemPrompt = `${baseSystemPrompt}\n\n${anchorBlock}`;
  }

  baseSystemPrompt = `${baseSystemPrompt}\n\n${RESPONSE_CONTRACT}`;

  const markSchemeImages = options.markSchemeImageDataUrls?.slice(0, 4) ?? [];
  const imageNote = markSchemeImages.length
    ? `\n\nThe candidate has attached ${markSchemeImages.length === 1 ? "a screenshot" : `${markSchemeImages.length} screenshots`} of the official mark scheme — read it directly alongside the knowledge-base context.`
    : "";

  const isGroundedInKnowledgeBase = sources.length > 0;
  const hasMarkSchemeImages = markSchemeImages.length > 0;
  const groundingStatus: "grounded" | "mark_scheme_image" | "unanchored" = hasMarkSchemeImages
    ? "mark_scheme_image"
    : isGroundedInKnowledgeBase
      ? "grounded"
      : "unanchored";

  if (groundingStatus === "unanchored") {
    baseSystemPrompt = `${baseSystemPrompt}\n\n` +
      `KNOWLEDGE BASE NOTICE — NO SPECIFIC PAST-PAPER MARK SCHEME MATCH FOUND:\n` +
      `Evaluate strictly against official Cambridge IGCSE ${SYLLABUS_CODE} Assessment Objectives (AO1/AO2/AO3) and published generic marking principles without inventing unseen mark scheme points.`;
  }

  const tariffSpecBanner =
    split.ao3_marks > 0
      ? `[CAMBRIDGE IGCSE 0455 SPECIFICATION: ${maxMark} Marks · EVALUATIVE RESPONSE (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: ${ao3_marks})]`
      : `[CAMBRIDGE IGCSE 0455 SPECIFICATION: ${maxMark} Marks · POINT-MARKED NON-EVALUATIVE RESPONSE (AO1: ${ao1_marks}, AO2: ${ao2_marks}, AO3: 0)${isDiagram ? " · DIAGRAM REQUIRED (4m diagram + 2m written)" : ""}]`;

  const userMessage =
    `${tariffSpecBanner}\n\n` +
    `EXAM QUESTION (${maxMark} marks):\n"""\n${question}\n"""\n\n` +
    `CANDIDATE RESPONSE:\n"""\n${essayText}\n"""${imageNote}`;

  const pass1SystemPrompt = `${baseSystemPrompt}\n\n${PASS1_ERROR_CHECK_DIRECTIVE}`;
  const pass2SystemPrompt = `${baseSystemPrompt}\n\n${PASS2_HOLISTIC_EVALUATION_DIRECTIVE}`;

  const executeExaminerPass = async (systemPrompt: string, feature: string, temperature: number) => {
    if (markSchemeImages.length) {
      try {
        return await visionChat({
          model: MODEL_EXAMINER,
          systemPrompt,
          prompt: userMessage,
          imageDataUrls: markSchemeImages,
          maxCompletionTokens: 6144,
          userId: options.userId,
          feature,
        });
      } catch (visionErr) {
        console.warn(`[grade.server] visionChat fallback to text for ${feature}:`, visionErr);
      }
    }
    return chat({
      model: MODEL_EXAMINER,
      temperature,
      json: true,
      isBudgetTier: options.isBudgetTier,
      userId: options.userId,
      feature,
      reasoningEffort: "low",
      maxCompletionTokens: 6144,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
  };

  let finalGrading: Grading;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let activeModel = MODEL_EXAMINER;
  let keyRotated = false;
  let modelSwapped = false;
  let activeKeyType: "primary" | "backup_pool" | "vip_fallback" | undefined = undefined;

  const runSinglePass = options.auditPass === false;

  if (runSinglePass) {
    const res = await executeExaminerPass(pass2SystemPrompt, "grade_essay", TEMPERATURE_PASS2);
    finalGrading = normaliseGrading(extractFirstJsonObject(res.text), maxMark, split, essayText);
    finalGrading = applyWritingQualityGuardrail(finalGrading, qualityAnalysis, maxMark, split, essayText);
    if (finalGrading.off_syllabus) {
      throw new OffSyllabusError(
        finalGrading.detected_subject || "another subject",
        finalGrading.examiner_summary ||
          `The examiner flagged this submission as outside the Cambridge IGCSE ${SYLLABUS_CODE} Economics syllabus.`,
      );
    }
    promptTokens = res.promptTokens;
    completionTokens = res.completionTokens;
    activeModel = res.model || MODEL_EXAMINER;
    keyRotated = Boolean(res.keyRotated);
    modelSwapped = Boolean(res.modelSwapped);
    activeKeyType = res.activeKeyType;
  } else {
    // --- 4. Dual Examiner Passes (Concurrent: Pass 1 @ 0.0 + Pass 2 @ 0.2) ---
    const [firstResult, secondResult] = await Promise.allSettled([
      executeExaminerPass(pass1SystemPrompt, "grade_essay_pass1_error_audit", TEMPERATURE_PASS1),
      executeExaminerPass(pass2SystemPrompt, "grade_essay_pass2_holistic", TEMPERATURE_PASS2),
    ]);

    const first = firstResult.status === "fulfilled" ? firstResult.value : null;
    const second = secondResult.status === "fulfilled" ? secondResult.value : null;

    if (!first && !second) {
      throw firstResult.status === "rejected"
        ? firstResult.reason
        : new Error("Both examiner passes failed.");
    }

    if (first && second) {
      let grading1 = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split, essayText);
      grading1 = applyWritingQualityGuardrail(grading1, qualityAnalysis, maxMark, split, essayText);

      let grading2 = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split, essayText);
      grading2 = applyWritingQualityGuardrail(grading2, qualityAnalysis, maxMark, split, essayText);

      if (grading1.off_syllabus || grading2.off_syllabus) {
        const rejected = grading1.off_syllabus ? grading1 : grading2;
        throw new OffSyllabusError(
          rejected.detected_subject || "another subject",
          rejected.examiner_summary ||
            `The examiner flagged this submission as outside the Cambridge IGCSE ${SYLLABUS_CODE} Economics syllabus.`,
        );
      }

      promptTokens = (first.promptTokens ?? 0) + (second.promptTokens ?? 0);
      completionTokens = (first.completionTokens ?? 0) + (second.completionTokens ?? 0);
      activeModel = second.model || first.model || MODEL_EXAMINER;
      keyRotated = Boolean(first.keyRotated || second.keyRotated);
      modelSwapped = Boolean(first.modelSwapped || second.modelSwapped);
      activeKeyType = second.activeKeyType ?? first.activeKeyType;

      // --- 5. Reconciliation: Arbitration on dispute OR Dual-Pass Synthesis ---
      const disputeCheck = shouldTriggerArbitration(grading1, grading2, maxMark);
      const elapsedMs = Date.now() - startedAt;

      if (disputeCheck.shouldArbitrate && elapsedMs < 28_000) {
        try {
          finalGrading = await Promise.race([
            arbitrateGrading({
              question,
              essayText,
              maxMark,
              split,
              examinerGrading: grading1,
              moderatorGrading: grading2,
              disputeReason: disputeCheck.reason,
              userId: options.userId,
              qualityAnalysis,
              isDiagramQuestion: isDiagram,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Arbitration exceeded 12s budget")), 12_000),
            ),
          ]);
        } catch (arbErr) {
          console.warn("[grade.server] Arbitration fallback to synthesis:", arbErr);
          finalGrading = synthesizeDualPasses(
            grading1,
            grading2,
            maxMark,
            split,
            qualityAnalysis,
            essayText,
          );
        }
      } else {
        finalGrading = synthesizeDualPasses(
          grading1,
          grading2,
          maxMark,
          split,
          qualityAnalysis,
          essayText,
        );
      }
    } else {
      // Graceful resilience: one pass succeeded while the other hit transient rate limit
      const single = (first ?? second)!;
      finalGrading = normaliseGrading(extractFirstJsonObject(single.text), maxMark, split, essayText);
      finalGrading = applyWritingQualityGuardrail(
        finalGrading,
        qualityAnalysis,
        maxMark,
        split,
        essayText,
      );
      if (finalGrading.off_syllabus) {
        throw new OffSyllabusError(
          finalGrading.detected_subject || "another subject",
          finalGrading.examiner_summary ||
            `The examiner flagged this submission as outside the Cambridge IGCSE ${SYLLABUS_CODE} Economics syllabus.`,
        );
      }
      promptTokens = single.promptTokens;
      completionTokens = single.completionTokens;
      activeModel = single.model || MODEL_EXAMINER;
      keyRotated = Boolean(single.keyRotated);
      modelSwapped = Boolean(single.modelSwapped);
      activeKeyType = single.activeKeyType;
    }
  }

  // --- 6. Pass 3: Senior Report Refiner & Consistency Auditor (Time-budgeted) ---
  if (Date.now() - startedAt < 26_000 && maxMark >= 4) {
    try {
      finalGrading = await Promise.race([
        refineExaminerReport({
          question,
          essayText,
          maxMark,
          split,
          draftGrading: finalGrading,
          userId: options.userId,
        }),
        new Promise<Grading>((resolve) =>
          setTimeout(() => resolve(finalGrading), 10_000),
        ),
      ]);
    } catch (refineErr) {
      console.warn("[grade.server] Pass 3 refinement skipped:", refineErr);
    }
  }

  finalGrading.sources = sources;
  finalGrading.anchorsUsed = Math.min(selectedAnchors.length, 4);
  finalGrading.grounding_status = groundingStatus;
  finalGrading.model = activeModel;
  finalGrading.keyRotated = keyRotated;
  finalGrading.modelSwapped = modelSwapped;
  finalGrading.activeKeyType = activeKeyType;
  const totalLatencyMs = Date.now() - startedAt;
  finalGrading.latencyMs = totalLatencyMs;
  finalGrading = cleanStars(purgeContradictions(finalGrading));
  // Set indicative_grade AFTER cleanStars so "A*" keeps its asterisk!
  const gradeStd = getCambridgeGradeStandard(finalGrading.total_mark, maxMark);
  finalGrading.indicative_grade = gradeStd.letter;

  return {
    grading: finalGrading,
    model: activeModel,
    promptTokens,
    completionTokens,
    latencyMs: totalLatencyMs,
  };
}
