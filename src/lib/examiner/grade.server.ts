/**
 * Examiner engine — ported from the original Python `agents/examiner.py`.
 *
 * Preserved exactly:
 *  - the fixed AO1/AO2/AO3 allocation, validated against max_mark (never
 *    silently redistributed into equal thirds)
 *  - human-verified calibration anchors injected as few-shot ground truth,
 *    grouped by band and capped per band
 *  - two-pass grading: examiner pass, then an independent audit pass that can
 *    correct the mark in EITHER direction, falling back to the unaudited
 *    result if the audit call fails rather than blocking grading
 *
 * Added: retrieval grounding, so marking references the real syllabus and
 * mark scheme material rather than the model's recollection of it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat, visionChat } from "../ai.server";
import { renderContext, retrieve } from "../retrieval.server";
import {
  arbitrateGrading,
  computeObjectiveConfidence,
  shouldTriggerArbitration,
} from "./arbitration.server";
import { AUDIT_PROMPT } from "./audit-prompt";
import { buildAnchorBlock, fetchCalibrationAnchors } from "./calibration.server";
import {
  formatStructureNote,
  getStructureGuidance,
  MODEL_EXAMINER,
  renderAoDefinitions,
  SYLLABUS_CODE,
  TEMPERATURE_EXAMINER,
  type AoSplit,
} from "./config";
import { EXAMINER_PROMPT } from "./examiner-prompt";
import { extractFirstJsonObject } from "./json";
import { normaliseGrading, type Grading, type GroundingSource } from "./types";

/** Fill `{placeholder}` tokens in the ported prompt templates. */
function loadPrompt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const RESPONSE_CONTRACT = `
Return ONLY a single JSON object with exactly this shape:
{
  "total_mark": number,
  "band": string,
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
"confidence" is your own 0-1 confidence that a real Cambridge examiner would award the same total mark.
For 4-mark and 6-mark point-marking, enumerate the specific points in "points", awarding identify and development marks separately.
Keep every comment specific to this candidate's actual text — never generic advice.
`.trim();

/**
 * Build a few-shot calibration section from human-provided anchor essays,
 * grouped by band and capped so the prompt does not grow unbounded.
 */

export type GradeOptions = {
  question: string;
  essayText: string;
  maxMark: number;
  split: AoSplit;
  isDiagramQuestion?: boolean;
  auditPass?: boolean;
  topicId?: string | null;
  /**
   * Screenshot(s) of the relevant mark scheme page, pasted in by the
   * student. When present, both the examiner pass and the audit pass read
   * these directly (vision) as well as the text retrieved from the
   * knowledge base — the screenshot is additional grounding, not a
   * replacement for it.
   */
  markSchemeImageDataUrls?: string[];
  isBudgetTier?: boolean;
  userId?: string;
  skipSyllabusValidation?: boolean;
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
  const { question, essayText, maxMark, split } = options;
  const { ao1_marks, ao2_marks, ao3_marks } = split;

  if (ao1_marks + ao2_marks + ao3_marks !== maxMark) {
    throw new Error(
      `The AO split (${ao1_marks}+${ao2_marks}+${ao3_marks}) does not sum to the ` +
        `total mark (${maxMark}). Set a matching split for questions that are not ` +
        `the standard 12-mark type.`,
    );
  }

  const isDiagram =
    Boolean(options.isDiagramQuestion) ||
    question.toLowerCase().includes("diagram") ||
    question.toLowerCase().includes("draw");

  const structureNote = formatStructureNote(getStructureGuidance(maxMark, split, isDiagram));

  const promptValues = {
    syllabus_code: SYLLABUS_CODE,
    max_mark: maxMark,
    ao1_marks,
    ao2_marks,
    ao3_marks,
    ao_definitions: renderAoDefinitions(),
    structure_note: structureNote,
  };

  let systemPrompt = loadPrompt(EXAMINER_PROMPT, promptValues);

  // --- syllabus pre-flight guardrail ----------------------------------------
  const { validateEconomicsSyllabus, OffSyllabusError } = await import("./syllabus-guard.server");
  if (!options.skipSyllabusValidation) {
    await validateEconomicsSyllabus(question, essayText);
  }

  // --- retrieval grounding ---------------------------------------------------
  let sources: GroundingSource[] = [];
  try {
    sources = await Promise.race([
      retrieve(supabase, {
        query: `${question}\n\nMark scheme, band descriptors and examiner report guidance for this question.`,
        matchCount: 8,
        docTypes: ["mark_scheme", "examiner_report", "syllabus", "coursebook", "notes"],
        topicId: options.topicId ?? null,
        enableHybridRrf: true,
      }),
      new Promise<GroundingSource[]>((_, reject) =>
        setTimeout(() => reject(new Error("Knowledge base lookup timed out (>5s)")), 5000),
      ),
    ]);
  } catch (error) {
    console.warn(
      `Knowledge base retrieval skipped or timed out, proceeding with Cambridge ${SYLLABUS_CODE} syllabus marking:`,
      error instanceof Error ? error.message : error,
    );
    sources = [];
  }
  if (sources.length > 0) {
    systemPrompt = `${systemPrompt}\n\n${renderContext(sources)}`;
  }

  // --- calibration anchors -----------------------------------------------
  const anchors = await fetchCalibrationAnchors(supabase);
  const anchorBlock = buildAnchorBlock(anchors);
  if (anchorBlock) systemPrompt = `${systemPrompt}\n\n${anchorBlock}`;

  systemPrompt = `${systemPrompt}\n\n${RESPONSE_CONTRACT}`;

  const markSchemeImages = options.markSchemeImageDataUrls?.slice(0, 4) ?? [];
  const imageNote = markSchemeImages.length
    ? `\n\nThe candidate has attached ${markSchemeImages.length === 1 ? "a screenshot" : `${markSchemeImages.length} screenshots`} ` +
      "of the mark scheme as image(s) above — read it directly and treat it as authoritative " +
      "alongside the knowledge-base context, especially for anything the retrieved text might " +
      "have missed or garbled."
    : "";

  const isGroundedInKnowledgeBase = sources.length > 0;
  const hasMarkSchemeImages = markSchemeImages.length > 0;
  const groundingStatus: "grounded" | "mark_scheme_image" | "unanchored" = hasMarkSchemeImages
    ? "mark_scheme_image"
    : isGroundedInKnowledgeBase
      ? "grounded"
      : "unanchored";

  if (groundingStatus === "unanchored") {
    systemPrompt = `${systemPrompt}\n\n` +
      `CRITICAL KNOWLEDGE BASE NOTICE — NO SPECIFIC MARK SCHEME OR SYLLABUS MATCH FOUND:\n` +
      `No specific Cambridge ${SYLLABUS_CODE} mark scheme, syllabus section, or examiner report was found in the institution's knowledge base for this question (${question}), and no mark scheme screenshot was attached.\n\n` +
      `MARKING INSTRUCTIONS FOR UNANCHORED RESPONSES:\n` +
      `1. You MUST notify the candidate in 'examiner_summary' with this exact prefix:\n` +
      `   "[UNANCHORED ASSESSMENT: No official mark scheme found in Knowledge Base — evaluated against generic Cambridge ${SYLLABUS_CODE} Assessment Objectives (AO1/AO2/AO3)]. "\n` +
      `2. Mark strictly against standard Cambridge IGCSE 0455 criteria without inventing question-specific requirements.\n` +
      `3. In 'actionable_feedback', advise the student to attach a screenshot of the official mark scheme or have an administrator upload it to the Knowledge Base to unlock question-specific mark scheme grounding.\n` +
      `4. Do NOT invent fake mark-scheme references or claim to have consulted specific unseen question mark schemes.`;
  }

  const userMessage =
    `Exam question (${maxMark} marks):\n\n${question}\n\n` +
    `Candidate response to mark:\n\n${essayText}${imageNote}`;

  const first = markSchemeImages.length
    ? await visionChat({
        model: MODEL_EXAMINER,
        systemPrompt,
        prompt: userMessage,
        imageDataUrls: markSchemeImages,
        maxCompletionTokens: 8000,
        userId: options.userId,
        feature: "grade_essay",
      })
    : await chat({
        model: MODEL_EXAMINER,
        temperature: TEMPERATURE_EXAMINER,
        json: true,
        isBudgetTier: options.isBudgetTier,
        userId: options.userId,
        feature: "grade_essay",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

  let grading = normaliseGrading(extractFirstJsonObject(first.text), maxMark, split);
  if (grading.off_syllabus) {
    throw new OffSyllabusError(
      grading.detected_subject || "another subject",
      grading.examiner_summary || `The examiner flagged this submission as outside the Cambridge ${SYLLABUS_CODE} Economics syllabus.`,
    );
  }
  let promptTokens = first.promptTokens;
  let completionTokens = first.completionTokens;
  let latencyMs = first.latencyMs;

  // --- audit pass ----------------------------------------------------------
  // To match Marginal's guaranteed 30-40s SLA:
  // we only run the audit pass if the primary examiner completed within 20s.
  // The audit pass itself is protected with a 12s timeout, guaranteeing total
  // response time stays strictly within 30-40s.
  if (options.auditPass !== false && first.latencyMs < 20_000) {
    const auditSystemPrompt = `${loadPrompt(AUDIT_PROMPT, promptValues)}\n\n${RESPONSE_CONTRACT}`;
    const auditUserMessage =
      `Exam question (${maxMark} marks):\n\n${question}\n\n` +
      `Student essay:\n\n${essayText}\n\n` +
      `Original examiner's grading JSON to audit:\n\n${JSON.stringify(grading, null, 2)}${imageNote}`;

    try {
      const secondPromise = markSchemeImages.length
        ? visionChat({
            model: MODEL_EXAMINER,
            systemPrompt: auditSystemPrompt,
            prompt: auditUserMessage,
            imageDataUrls: markSchemeImages,
            maxCompletionTokens: 8000,
            userId: options.userId,
            feature: "grade_essay_audit",
          })
        : chat({
            model: MODEL_EXAMINER,
            temperature: TEMPERATURE_EXAMINER,
            json: true,
            isBudgetTier: options.isBudgetTier,
            userId: options.userId,
            feature: "grade_essay_audit",
            messages: [
              { role: "system", content: auditSystemPrompt },
              { role: "user", content: auditUserMessage },
            ],
          });

      const second = await Promise.race([
        secondPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Audit pass exceeded 12s timeout")), 12_000),
        ),
      ]);

      const secondGrading = normaliseGrading(extractFirstJsonObject(second.text), maxMark, split);
      secondGrading.audited = true;
      promptTokens = (promptTokens ?? 0) + (second.promptTokens ?? 0);
      completionTokens = (completionTokens ?? 0) + (second.completionTokens ?? 0);
      latencyMs += second.latencyMs;

      // --- Stage 3: Selective Principal Examiner Arbitration ---
      // Triggered only when a material discrepancy or grade band contradiction
      // exists between the Primary Examiner and Independent Moderator.
      const disputeCheck = shouldTriggerArbitration(grading, secondGrading, maxMark);
      if (disputeCheck.shouldArbitrate && latencyMs < 28_000) {
        try {
          const arbitrated = await Promise.race([
            arbitrateGrading({
              question,
              essayText,
              maxMark,
              split,
              examinerGrading: grading,
              moderatorGrading: secondGrading,
              disputeReason: disputeCheck.reason,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Arbitration exceeded 8s timeout")), 8_000),
            ),
          ]);
          grading = arbitrated;
        } catch (arbitrationError) {
          console.warn(
            "Arbitration pass timed out or failed; falling back to moderated grade",
            arbitrationError,
          );
          grading = secondGrading;
          grading.confidence = computeObjectiveConfidence(grading, secondGrading, false);
        }
      } else {
        grading = secondGrading;
        grading.confidence = computeObjectiveConfidence(grading, secondGrading, false);
      }
    } catch (error) {
      // The audit is a correction pass, not a gate. A transient audit failure
      // returns the already-valid first-pass result instead of failing.
      console.warn("Audit pass skipped or timed out; returning authoritative first-pass grading", error);
    }
  }

  grading.sources = sources;
  grading.anchorsUsed = anchors.length;
  grading.grounding_status = groundingStatus;
  grading.model = first.model || MODEL_EXAMINER;
  grading.keyRotated = first.keyRotated;
  grading.modelSwapped = first.modelSwapped;
  grading.activeKeyType = first.activeKeyType;

  return {
    grading,
    model: first.model || MODEL_EXAMINER,
    promptTokens,
    completionTokens,
    latencyMs,
  };
}
