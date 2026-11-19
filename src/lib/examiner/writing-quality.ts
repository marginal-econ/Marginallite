/**
 * Cambridge IGCSE Economics (0455) Writing Quality, Structure & Depth Calibration Engine.
 *
 * Calibrated strictly to authentic Cambridge IGCSE 0455 Paper 2 expectations:
 * - 2-mark (Define/Identify/State/Calculate): 10–45 words (concise, no paragraph penalty).
 * - 4-mark (Explain): 40–120 words (2 developed points, no essay-length penalty).
 * - 6-mark (Analyse / Diagram 4+2 / Section A Discuss): 80–180 words (diagram tags exempt prose brevity).
 * - 8-mark (Section B Discuss — Table A Levels 1–3): 180–350 words across 2–4 distinct paragraphs.
 *   * Fragments (< 60 words) capped at Level 1 (max 2/8).
 *   * Undersized (< 115 words) capped at Level 2 (max 5/8).
 *   * Monolithic single-paragraph blocks (>= 140 words with 0 paragraph breaks) capped at Level 2 (max 5/8).
 * - Inverted mechanism & fatal misconception ceilings enforced ONLY when explicitly verified in the candidate text.
 * - AI-generated formatting artifacts (**bolding**, LaTeX) flagged constructively.
 */

import { cleanStars } from "@/lib/utils";
import type { AoSplit } from "./config";
import { applyMisconceptionGuardrail } from "./misconceptions";
import { bandFor, stripScoreFractionsFromText, type Grading } from "./types";

export type EssayQualityAnalysis = {
  wordCount: number;
  paragraphCount: number;
  boldingCount: number;
  latexCount: number;
  hasMarkdownBullets: boolean;
  hasAiArtifacts: boolean;
  hasDiagramTag: boolean;
  isUndersized: boolean;
  isSeverelyUndersized: boolean;
  isMonolithicBlock: boolean;
  targetRangeText: string;
  maxAllowableTotalMark: number;
  maxAllowableAo2: number;
  maxAllowableAo3: number;
  qualityIssues: string[];
};

export function cleanProseForWordCount(text: string): string {
  return text
    .replace(/\[DIAGRAM:[^\]]*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeEssayQuality(
  rawText: string,
  maxMark: number,
  split: AoSplit,
): EssayQualityAnalysis {
  const hasDiagramTag = /\[DIAGRAM:[^\]]+\]/i.test(rawText);
  const cleanProse = cleanProseForWordCount(rawText);
  const words = cleanProse.length > 0 ? cleanProse.split(/\s+/).filter(Boolean).length : 0;

  const rawParagraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\[DIAGRAM:[^\]]*\]$/i.test(p));
  const paragraphCount = rawParagraphs.length;

  const boldingMatches = rawText.match(/\*\*[^*]+\*\*/g) || [];
  const boldingCount = boldingMatches.length;

  const latexMatches = rawText.match(/\$[^$]+\$/g) || [];
  const latexCount = latexMatches.length;

  const hasMarkdownBullets = /^\s*[-*•]\s+/m.test(rawText);
  const hasAiArtifacts =
    maxMark >= 6 &&
    (boldingCount >= 4 ||
      (boldingCount >= 2 && latexCount >= 1) ||
      (boldingCount >= 3 && words < 260));

  const qualityIssues: string[] = [];
  let targetRangeText = "180–350 words";
  let isUndersized = false;
  let isSeverelyUndersized = false;
  let maxAllowableTotalMark = maxMark;
  let maxAllowableAo2 = split.ao2_marks;
  let maxAllowableAo3 = split.ao3_marks;

  if (maxMark <= 2) {
    targetRangeText = "15–45 words (concise definition or identification)";
    // 2-mark questions are intentionally brief; never penalize brevity
  } else if (maxMark === 4) {
    targetRangeText = "45–110 words (2 developed explanation points)";
    if (words < 18 && !hasDiagramTag) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 2;
      maxAllowableAo2 = Math.min(split.ao2_marks, 1);
      qualityIssues.push(
        `Very brief response (${words} words). Cambridge IGCSE 0455 4-mark Explain questions require two distinct identified points each developed with a causal explanation.`,
      );
    }
  } else if (maxMark === 6) {
    targetRangeText = hasDiagramTag
      ? "40–100 words + labelled diagram (4m diagram + 2m written analysis)"
      : "90–180 words (3 developed points or 2 multi-link causal chains)";
    if (!hasDiagramTag) {
      if (words < 35) {
        isSeverelyUndersized = true;
        maxAllowableTotalMark = 2;
        maxAllowableAo2 = Math.min(split.ao2_marks, 2);
        maxAllowableAo3 = 0;
        qualityIssues.push(
          `Very brief response (${words} words). Cambridge 0455 6-mark questions require developed causal chains rather than isolated points.`,
        );
      } else if (words < 65) {
        isUndersized = true;
        maxAllowableTotalMark = 4;
        maxAllowableAo2 = Math.min(split.ao2_marks, 4);
        maxAllowableAo3 = Math.min(split.ao3_marks, 1);
        qualityIssues.push(
          `Concise outline (${words} words vs ${targetRangeText}). Expand each analytical chain with cause and economic consequence.`,
        );
      }
    }
  } else if (maxMark === 8) {
    targetRangeText = "180–350 words across 2–4 distinct paragraphs";
    if (words < 55) {
      isSeverelyUndersized = true;
      maxAllowableTotalMark = 2;
      maxAllowableAo2 = Math.min(split.ao2_marks, 1);
      maxAllowableAo3 = 0;
      qualityIssues.push(
        `Fragment / extreme brevity (${words} words). Cambridge IGCSE 0455 8-mark Discuss questions require two-sided analysis and reasoned evaluation (${targetRangeText}).`,
      );
    } else if (words < 110) {
      isUndersized = true;
      maxAllowableTotalMark = 5;
      maxAllowableAo2 = Math.min(split.ao2_marks, 2);
      maxAllowableAo3 = Math.min(split.ao3_marks, 1);
      qualityIssues.push(
        `Undersized (${words} words vs ${targetRangeText}). Lacks full two-sided analytical development needed for Level 3 (6–8 marks).`,
      );
    }
  } else if (maxMark > 8) {
    targetRangeText = `${maxMark * 25}–${maxMark * 45} words`;
    if (words < maxMark * 12) {
      isUndersized = true;
      maxAllowableTotalMark = Math.max(2, Math.round(maxMark * 0.6));
      maxAllowableAo2 = Math.max(1, Math.round(split.ao2_marks * 0.6));
      maxAllowableAo3 = Math.max(0, Math.round(split.ao3_marks * 0.5));
    }
  }

  // Monolithic single-paragraph block check applies ONLY to extended 8+ mark discuss essays
  const isMonolithicBlock = maxMark >= 8 && paragraphCount <= 1 && words >= 140;
  if (isMonolithicBlock) {
    qualityIssues.push(
      "Single unstructured block of text (no paragraph breaks). Cambridge 0455 8-mark Discuss essays should separate Side 1 analysis, Side 2 counter-arguments, and a reasoned conclusion into clear paragraphs.",
    );
    maxAllowableTotalMark = Math.min(maxAllowableTotalMark, maxMark === 8 ? 5 : Math.round(maxMark * 0.65));
    maxAllowableAo3 = Math.min(maxAllowableAo3, Math.max(1, split.ao3_marks - 1));
  }

  if (hasAiArtifacts) {
    qualityIssues.push(
      `Synthetic formatting detected (${boldingCount} bold markers / LaTeX tokens). Write Cambridge IGCSE 0455 responses in natural, continuous explanatory prose.`,
    );
    if (isUndersized || isMonolithicBlock) {
      maxAllowableTotalMark = Math.min(maxAllowableTotalMark, maxMark === 8 ? 5 : Math.max(2, maxMark - 2));
    }
  }

  return {
    wordCount: words,
    paragraphCount,
    boldingCount,
    latexCount,
    hasMarkdownBullets,
    hasAiArtifacts,
    hasDiagramTag,
    isUndersized,
    isSeverelyUndersized,
    isMonolithicBlock,
    targetRangeText,
    maxAllowableTotalMark,
    maxAllowableAo2,
    maxAllowableAo3,
    qualityIssues,
  };
}

export function buildQualityPromptDirective(
  quality: EssayQualityAnalysis,
  maxMark: number,
): string {
  const parts: string[] = [
    `CANDIDATE SUBMISSION WRITING QUALITY & STRUCTURAL PROFILE (CAMBRIDGE IGCSE 0455):`,
    `- Word count: ${quality.wordCount} words (typical IGCSE 0455 expectation for ${maxMark} marks: ${quality.targetRangeText}).`,
    `- Paragraph structure: ${quality.paragraphCount} paragraph(s) detected.${quality.hasDiagramTag ? " [Student diagram tag present — assess technical accuracy positively.]" : ""}`,
  ];

  if (maxMark <= 4) {
    parts.push(
      `CONCISE POINT-MARKED TARIFF (${maxMark} marks): Do NOT penalise conciseness or single-paragraph layout. Award full marks immediately when the required economic points and explanations are accurately stated.`,
    );
    return parts.join("\n");
  }

  if (quality.isSeverelyUndersized) {
    parts.push(
      `CRITICAL EXAMINER DIRECTIVE — SEVERELY UNDERSIZED RESPONSE:`,
      `At ${quality.wordCount} words, essential analytical chains and balanced evaluation cannot be sustained. Maximum allowable total: ${quality.maxAllowableTotalMark}/${maxMark}.`,
    );
  } else if (quality.isUndersized) {
    parts.push(
      `EXAMINER DIRECTIVE — BRIEF RESPONSE:`,
      `At ${quality.wordCount} words, check carefully whether both sides and causal links are genuinely developed. Cap total at ${quality.maxAllowableTotalMark}/${maxMark} unless every causal step is fully explained.`,
    );
  }

  if (quality.isMonolithicBlock) {
    parts.push(
      `STRUCTURAL NOTE — SINGLE PARAGRAPH BLOCK:`,
      `The 8-mark Discuss response is written without paragraph breaks. Advise separating Side 1, Side 2, and conclusion into distinct paragraphs.`,
    );
  }

  if (quality.hasAiArtifacts) {
    parts.push(
      `FORMATTING NOTE — SYNTHETIC BULLET/BOLD SHORTHAND:`,
      `Do not mistake markdown bolding or buzzwords for developed IGCSE 0455 causal analysis.`,
    );
  }

  if (!quality.isUndersized && !quality.isSeverelyUndersized && !quality.isMonolithicBlock && !quality.hasAiArtifacts) {
    parts.push(
      `AUTHENTIC RESPONSE STRUCTURE CONFIRMED: Mark positively and strictly on IGCSE 0455 economic merits without artificial length barriers.`,
    );
  }

  return parts.join("\n");
}

/**
 * Checks for explicit inverted economic mechanisms or fatal misconceptions in candidate text.
 * Only triggers when the examiner itself verified `fatal_misconceptions_found: true` with verbatim quotes,
 * ensuring sound student essays are NEVER falsely penalized.
 */
export function applyMisconceptionCeilingGuardrail(
  grading: Grading,
  maxMark: number,
  split: AoSplit,
): Grading {
  const mv = grading.mechanism_validation;
  if (!mv || !mv.fatal_misconceptions_found || mv.error_evidence_quotes.length === 0) {
    return grading;
  }

  // Only enforce Level 1 / Lower Middle ceiling on extended 6m/8m+ essays with proven fatal errors
  if (maxMark < 6) return grading;

  const maxTotal = maxMark === 6 ? 3 : maxMark === 8 ? 4 : Math.round(maxMark * 0.45);
  if (grading.total_mark <= maxTotal) return grading;

  const ao1 = Math.min(grading.ao_breakdown.knowledge.awarded, Math.max(0, split.ao1_marks - 1));
  const ao2 = Math.min(grading.ao_breakdown.analysis.awarded, Math.max(1, Math.floor(split.ao2_marks * 0.4)));
  const ao3 = Math.min(grading.ao_breakdown.evaluation.awarded, Math.min(1, split.ao3_marks));
  const newTotal = Math.min(maxTotal, ao1 + ao2 + ao3);

  return {
    ...grading,
    total_mark: newTotal,
    band: bandFor(newTotal, maxMark),
    ao_breakdown: {
      knowledge: { ...grading.ao_breakdown.knowledge, awarded: ao1 },
      analysis: { ...grading.ao_breakdown.analysis, awarded: ao2 },
      evaluation: { ...grading.ao_breakdown.evaluation, awarded: ao3 },
    },
  };
}

/**
 * Deterministic calibration failsafe for Cambridge IGCSE 0455 responses.
 */
export function applyWritingQualityGuardrail(
  grading: Grading,
  quality: EssayQualityAnalysis,
  maxMark: number,
  split: AoSplit,
  essayText?: string,
): Grading {
  // 1. Scrutinise text for verified fatal economic misconceptions and inverted mechanisms
  let updated = applyMisconceptionGuardrail(grading, maxMark, split, essayText || "");

  // Never artificially penalize concise 2-mark / 4-mark answers that aren't severely undersized
  if (maxMark <= 4 && !quality.isSeverelyUndersized) {
    return cleanStars(updated);
  }

  let ao1 = updated.ao_breakdown.knowledge.awarded;
  let ao2 = updated.ao_breakdown.analysis.awarded;
  let ao3 = updated.ao_breakdown.evaluation.awarded;
  let modified = false;

  if (ao2 > quality.maxAllowableAo2) {
    ao2 = quality.maxAllowableAo2;
    modified = true;
  }
  if (ao3 > quality.maxAllowableAo3) {
    ao3 = quality.maxAllowableAo3;
    modified = true;
  }

  let total = ao1 + ao2 + ao3;
  if (total > quality.maxAllowableTotalMark) {
    const excess = total - quality.maxAllowableTotalMark;
    if (ao3 > 0 && excess > 0) {
      const cut = Math.min(ao3, excess);
      ao3 -= cut;
    }
    const rem = ao1 + ao2 + ao3 - quality.maxAllowableTotalMark;
    if (rem > 0 && ao2 > 0) {
      ao2 = Math.max(0, ao2 - rem);
    }
    total = Math.min(quality.maxAllowableTotalMark, ao1 + ao2 + ao3);
    modified = true;
  }

  if (!modified && quality.qualityIssues.length === 0) {
    return cleanStars(updated);
  }

  const weaknesses = [...updated.weaknesses];
  if (quality.isUndersized || quality.isSeverelyUndersized) {
    const msg = `At ${quality.wordCount} words, expand each economic chain step-by-step (cause, intermediate mechanism, and outcome) to reach full Cambridge IGCSE 0455 credit.`;
    if (!weaknesses.some((w) => /word|brief|undersized|expand/i.test(w))) {
      weaknesses.push(msg);
    }
  }
  if (quality.isMonolithicBlock) {
    const msg =
      "Organise your 8-mark Discuss answer into distinct paragraphs separating Side 1 analysis, Side 2 counter-arguments, and a reasoned concluding judgement.";
    if (!weaknesses.some((w) => /paragraph/i.test(w))) {
      weaknesses.push(msg);
    }
  }

  updated = {
    ...updated,
    total_mark: total,
    band: bandFor(total, maxMark),
    ao_breakdown: {
      knowledge: { ...updated.ao_breakdown.knowledge, awarded: ao1 },
      analysis: { ...updated.ao_breakdown.analysis, awarded: ao2 },
      evaluation: { ...updated.ao_breakdown.evaluation, awarded: ao3 },
    },
    weaknesses: weaknesses.map((w) => stripScoreFractionsFromText(w)).slice(0, 5),
  };

  return cleanStars(updated);
}
