import { cleanStars } from "@/lib/utils";

export type AoKey = "knowledge" | "analysis" | "evaluation";

export type AoScore = {
  awarded: number;
  out_of: number;
  comment: string;
};

export type MissingElements = {
  definitions: string[];
  analysis: string[];
  evaluation: string[];
  examples: string[];
  diagrams: string[];
};

export type GroundingSource = {
  documentId: string;
  documentTitle: string;
  docType: string;
  heading: string | null;
  snippet: string;
  similarity: number;
};

export type CreditPoint = {
  quote: string;
  matched_ms_point: string;
  identify_awarded: number;
  development_awarded: number;
  reason: string;
};

export type CommandWordCheck = {
  command_word: string;
  satisfied: boolean;
  comment: string;
};

export type MechanismValidation = {
  core_mechanisms_sound: boolean;
  fatal_misconceptions_found: boolean;
  error_evidence_quotes: string[];
};

export type Grading = {
  total_mark: number;
  max_mark: number;
  band: string;
  mechanism_validation?: MechanismValidation;
  points?: CreditPoint[];
  missed_ms_points?: string[];
  command_word_check?: CommandWordCheck;
  next_step_feedback?: string[];
  ao_breakdown: Record<AoKey, AoScore>;
  examiner_summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_elements: MissingElements;
  actionable_feedback: string[];
  suggested_resources: string[];
  suggested_practice: string[];
  confidence: number;
  audited: boolean;
  arbitrated?: boolean;
  arbitrationNotes?: string;
  sources: GroundingSource[];
  anchorsUsed: number;
  off_syllabus?: boolean;
  detected_subject?: string;
  grounding_status?: "grounded" | "mark_scheme_image" | "unanchored";
  model?: string;
  keyRotated?: boolean;
  modelSwapped?: boolean;
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
  indicative_grade?: string;
  latencyMs?: number;
};

const EMPTY_MISSING: MissingElements = {
  definitions: [],
  analysis: [],
  evaluation: [],
  examples: [],
  diagrams: [],
};

/**
 * Strips raw score fractions and numerical mark-cap phrases from prose
 * so UI score badges remain the single source of truth for numbers.
 */
export function stripScoreFractionsFromText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\(\s*\d+\s*\/\s*\d+\s*(?:marks?)?\s*\)/gi, "")
    .replace(/\b(?:held|capped|restricted)\s+(?:at|to)\s+\d+(?:\s*\/\s*\d+)?\s*(?:marks?)?/gi, "limited in depth")
    .replace(/\binstead\s+of\s+\d+(?:\s*\/\s*\d+)?\s*(?:marks?)?/gi, "")
    .replace(/\bcost(?:s|ing)?\s+(?:you\s+)?\d*\s*marks?\b/gi, "weakens the response")
    .replace(/\b(?:lose|lost|losing)\s+\d*\s*marks?\b/gi, "reduces credit")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/**
 * Strips internal RAG snippet markers like [S1], (as per [S2]), (see [S1], [S3]) from student-facing prose.
 */
export function stripInternalSnippetCitations(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\(\s*(?:as\s+per|see|per|from|ref\.?)\s*(?:\[?S\d+\]?(?:\s*,\s*\[?S\d+\]?)*)\s*\)/gi, "")
    .replace(/\[S\d+(?:\s*,\s*S?\d+)*\]/gi, "")
    .replace(/\(\s*S\d+(?:\s*,\s*S?\d+)*\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/**
 * Purges any accidental A-Level / 9708 jargon from Cambridge IGCSE 0455 student feedback.
 */
export function sanitizeIgcseFeedbackText(value: unknown): string {
  if (typeof value !== "string") return "";
  let s = stripInternalSnippetCitations(stripScoreFractionsFromText(value));
  s = s
    .replace(/\bCambridge\s+(?:International\s+)?(?:AS(?:\/A)?|A[\s-]?Level)\s+Economics\s*\(?9708\)?/gi, "Cambridge IGCSE Economics (0455)")
    .replace(/\b(?:AS|A2|A)[- ]?Level(?:\s+Economics)?\b/gi, "Cambridge IGCSE 0455")
    .replace(/\b9708\b/g, "0455")
    .replace(/\bPaper\s*4[123]?\b/gi, "Paper 2")
    .replace(/\bPaper\s*3[123]?\b/gi, "Paper 1")
    .replace(/\bAO4\b/gi, "AO3")
    .replace(/\b(?:Colin\s+)?Bamford\s*(?:&|and)?\s*(?:Susan\s+)?Grant\b/gi, "Cambridge 0455 Syllabus")
    .replace(/\bHodder\s+Education\b/gi, "Cambridge Assessment");
  return cleanStars(s);
}

/** Compatibility alias for callers expecting cleanMarkdownText. */
export function cleanMarkdownText(value: unknown): string {
  return sanitizeIgcseFeedbackText(value);
}

/**
 * Verifies quotation marks inside feedback against the candidate's actual submission.
 * If a quoted phrase (> 2 words) does not appear verbatim in the essay, strips the
 * quotation marks so the report never presents paraphrases as verbatim quotes.
 */
export function verifyVerbatimQuotes(feedbackText: string, essayText?: string): string {
  if (!feedbackText || !essayText || essayText.trim().length < 15) return feedbackText;
  const normEssay = essayText.toLowerCase().replace(/\s+/g, " ");
  return feedbackText.replace(/"([^"]{10,120})"/g, (full, inner: string) => {
    const normInner = inner.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normInner.split(" ");
    if (words.length < 3) return full;
    if (normEssay.includes(normInner)) return full;
    // Allow 4-word contiguous overlap check for minor punctuation differences
    const strippedEssay = normEssay.replace(/[^a-z0-9\s]/g, "");
    const strippedInner = normInner.replace(/[^a-z0-9\s]/g, "").trim();
    if (strippedInner.length >= 8 && strippedEssay.includes(strippedInner)) return full;
    return inner;
  });
}

/**
 * Semantically deduplicates feedback bullet arrays using normalized token overlap.
 */
export function deduplicateFeedbackPoints(points: string[], maxCount = 5): string[] {
  const result: string[] = [];
  const tokenSets: Set<string>[] = [];

  for (const raw of points) {
    const cleaned = sanitizeIgcseFeedbackText(raw);
    if (!cleaned || cleaned.length < 4) continue;
    const tokens = new Set(
      cleaned
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    );
    let isDup = false;
    for (const prev of tokenSets) {
      if (tokens.size === 0 || prev.size === 0) continue;
      let overlap = 0;
      for (const t of tokens) if (prev.has(t)) overlap++;
      const jaccard = overlap / Math.min(tokens.size, prev.size);
      if (jaccard >= 0.72) {
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      result.push(cleaned);
      tokenSets.push(tokens);
      if (result.length >= maxCount) break;
    }
  }
  return result;
}

/**
 * Eliminates internal contradictions between strengths and weaknesses/missing_elements.
 * Example: if an example or definition is praised in strengths, removes generic claims
 * in weaknesses/missing_elements claiming examples or definitions were completely omitted.
 */
export function purgeContradictions(grading: Grading): Grading {
  const strengthsLower = grading.strengths.join(" ").toLowerCase();
  const praisesExamples =
    /\b(real[- ]world\s+example|strong\s+example|good\s+example|effective\s+example|applied\s+example|uses?\s+examples?)\b/i.test(
      strengthsLower,
    );
  const praisesDefinitions =
    /\b(accurate\s+definition|clear\s+definition|precise\s+definition|defines?\s+\w+\s+accurately|correctly\s+defines?)\b/i.test(
      strengthsLower,
    );
  const praisesConclusion =
    /\b(reasoned\s+conclusion|balanced\s+conclusion|clear\s+conclusion|justified\s+judgement|substantiated\s+verdict)\b/i.test(
      strengthsLower,
    );

  const filterContradiction = (item: string): boolean => {
    const l = item.toLowerCase();
    if (praisesExamples && /\b(no\s+examples?|lacks?\s+examples?|missing\s+examples?|without\s+examples?)\b/i.test(l)) {
      return false;
    }
    if (praisesDefinitions && /\b(no\s+definitions?|lacks?\s+definitions?|missing\s+definitions?|fails?\s+to\s+define)\b/i.test(l)) {
      return false;
    }
    if (praisesConclusion && /\b(no\s+conclusion|lacks?\s+a?\s*conclusion|missing\s+a?\s*conclusion)\b/i.test(l)) {
      return false;
    }
    return true;
  };

  // Strip A-Level-only recommendations from IGCSE 0455 missing_elements / weaknesses
  const isALevelOnlyLeak = (item: string): boolean =>
    /\b(indifference\s+curve|marginal\s+utility|diminishing\s+marginal\s+returns|mrpl|marginal\s+revenue\s+product|kinked\s+demand|keynesian\s+cross|is-lm|pareto\s+efficien|monopolistic\s+competition\s+tangency|game\s+theory|lorenz\s+curve|gini\s+coefficient|expectations[- ]augmented\s+phillips)\b/i.test(
      item,
    );

  const cleanList = (arr: string[], max = 5) =>
    deduplicateFeedbackPoints(
      arr.filter((x) => !isALevelOnlyLeak(x)).filter(filterContradiction),
      max,
    );

  const noEvalRequired = grading.ao_breakdown.evaluation.out_of === 0;
  const evalFilter = (arr: string[]) =>
    noEvalRequired
      ? arr.filter((x) => !/\b(evaluation|evaluative|counter-argument|weighing|conclusion)\b/i.test(x))
      : arr;

  return {
    ...grading,
    examiner_summary: sanitizeIgcseFeedbackText(grading.examiner_summary),
    strengths: deduplicateFeedbackPoints(grading.strengths.filter((x) => !isALevelOnlyLeak(x)), 5),
    weaknesses: evalFilter(cleanList(grading.weaknesses, 5)),
    actionable_feedback: evalFilter(cleanList(grading.actionable_feedback, 5)),
    next_step_feedback: grading.next_step_feedback
      ? evalFilter(cleanList(grading.next_step_feedback, 4))
      : undefined,
    suggested_resources: deduplicateFeedbackPoints(
      grading.suggested_resources.filter((x) => !isALevelOnlyLeak(x)),
      4,
    ),
    suggested_practice: deduplicateFeedbackPoints(
      grading.suggested_practice.filter((x) => !isALevelOnlyLeak(x)),
      4,
    ),
    missing_elements: {
      definitions: cleanList(grading.missing_elements.definitions, 4),
      analysis: cleanList(grading.missing_elements.analysis, 4),
      evaluation: noEvalRequired ? [] : cleanList(grading.missing_elements.evaluation, 4),
      examples: cleanList(grading.missing_elements.examples, 4),
      diagrams: cleanList(grading.missing_elements.diagrams, 3),
    },
    ao_breakdown: {
      knowledge: {
        ...grading.ao_breakdown.knowledge,
        comment: sanitizeIgcseFeedbackText(grading.ao_breakdown.knowledge.comment),
      },
      analysis: {
        ...grading.ao_breakdown.analysis,
        comment: sanitizeIgcseFeedbackText(grading.ao_breakdown.analysis.comment),
      },
      evaluation: {
        ...grading.ao_breakdown.evaluation,
        comment: noEvalRequired
          ? "Evaluation is not required for this question. No marks are lost for its omission."
          : sanitizeIgcseFeedbackText(grading.ao_breakdown.evaluation.comment),
      },
    },
  };
}

function toStringArray(value: unknown, essayText?: string): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .map((item) => verifyVerbatimQuotes(sanitizeIgcseFeedbackText(item), essayText))
    .filter((item) => item.trim().length > 0);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseAo(value: unknown, outOf: number, essayText?: string): AoScore {
  const raw = (value ?? {}) as Record<string, unknown>;
  const declaredOutOf = toNumber(raw.out_of, outOf);
  return {
    awarded: Math.max(0, Math.min(declaredOutOf, Math.round(toNumber(raw.awarded, 0)))),
    out_of: declaredOutOf,
    comment:
      typeof raw.comment === "string"
        ? verifyVerbatimQuotes(sanitizeIgcseFeedbackText(raw.comment), essayText)
        : "",
  };
}

/**
 * Coerce raw model JSON into an IGCSE 0455 Grading.
 * Enforces the fixed AO allocation, point-marking validations, anti-hallucination hygiene,
 * and contradiction purging.
 */
export function normaliseGrading(
  raw: Record<string, unknown>,
  maxMark: number,
  split: { ao1_marks: number; ao2_marks: number; ao3_marks: number },
  essayText?: string,
): Grading {
  const rawAo = (raw.ao_breakdown ?? {}) as Record<string, unknown>;

  const knowledge = normaliseAo(rawAo.knowledge ?? rawAo.ao1, split.ao1_marks, essayText);
  const analysis = normaliseAo(rawAo.analysis ?? rawAo.ao2, split.ao2_marks, essayText);
  const evaluation = normaliseAo(rawAo.evaluation ?? rawAo.ao3, split.ao3_marks, essayText);

  // Mark scheme owns the ceiling
  knowledge.out_of = split.ao1_marks;
  analysis.out_of = split.ao2_marks;
  evaluation.out_of = split.ao3_marks;
  knowledge.awarded = Math.min(knowledge.awarded, split.ao1_marks);
  analysis.awarded = Math.min(analysis.awarded, split.ao2_marks);
  evaluation.awarded = Math.min(evaluation.awarded, split.ao3_marks);

  // Parse mechanism_validation if present
  const rawMv = raw.mechanism_validation as Record<string, unknown> | undefined;
  const mechanism_validation: MechanismValidation | undefined = rawMv
    ? {
        core_mechanisms_sound: rawMv.core_mechanisms_sound !== false,
        fatal_misconceptions_found: Boolean(rawMv.fatal_misconceptions_found),
        error_evidence_quotes: toStringArray(rawMv.error_evidence_quotes, essayText),
      }
    : undefined;

  // Parse points if present (point-marking for 2m/4m/6m)
  let points: CreditPoint[] | undefined;
  if (Array.isArray(raw.points)) {
    points = raw.points.map((p: any) => ({
      quote: cleanStars(String(p.quote || "")),
      matched_ms_point: cleanStars(String(p.matched_ms_point || "")),
      identify_awarded: Math.min(1, Math.max(0, Number(p.identify_awarded) || 0)),
      development_awarded: Math.min(1, Math.max(0, Number(p.development_awarded) || 0)),
      reason: sanitizeIgcseFeedbackText(String(p.reason || "")),
    }));
  }

  let pointsTotal = 0;
  if (points && points.length > 0) {
    pointsTotal = points.reduce(
      (sum, p) => sum + p.identify_awarded + (p.identify_awarded > 0 ? p.development_awarded : 0),
      0,
    );
  }

  const aoTotal = knowledge.awarded + analysis.awarded + evaluation.awarded;
  const declaredTotal = Math.round(toNumber(raw.total_mark, aoTotal));

  let finalMark = aoTotal;
  if (pointsTotal > 0 && maxMark <= 6) {
    const pointCap = maxMark === 4 ? 4 : maxMark === 6 ? 6 : maxMark;
    finalMark = Math.min(pointCap, pointsTotal);
    // Reconcile AO breakdown to match authoritative point total
    if (finalMark !== aoTotal) {
      if (split.ao1_marks === 0 && split.ao3_marks === 0) {
        analysis.awarded = Math.min(split.ao2_marks, finalMark);
      } else if (split.ao3_marks === 0) {
        knowledge.awarded = Math.min(split.ao1_marks, Math.ceil(finalMark / 2));
        analysis.awarded = Math.min(split.ao2_marks, Math.max(0, finalMark - knowledge.awarded));
      }
    }
  } else if (declaredTotal !== aoTotal && declaredTotal <= maxMark && declaredTotal >= 0) {
    finalMark = aoTotal;
  }
  finalMark = Math.max(0, Math.min(maxMark, finalMark));

  // Deterministic Cambridge IGCSE 0455 Level & Table Caps:
  // 1. On 8-mark Discuss questions: Cambridge Table A strictly caps one-sided responses in Level 2 (max 5/8).
  if (maxMark === 8 && split.ao3_marks > 0) {
    const diagText = `${raw.examiner_summary || ""} ${analysis.comment || ""} ${evaluation.comment || ""} ${(Array.isArray(raw.weaknesses) ? raw.weaknesses : []).join(" ")}`;
    const isOneSided = /\b(one[- ]sided\b|only\s+(?:discusses|considers|analyses|looks\s+at)\s+(?:one\s+side|why|benefits|drawbacks)|lacks?\s+(?:a\s+)?counter[- ]argument|no\s+counter[- ]argument|fails?\s+to\s+(?:discuss|analyse|examine)\s+(?:the\s+other\s+side|both\s+sides|drawbacks|why\s+not))\b/i.test(diagText);
    if (isOneSided && finalMark > 5) {
      finalMark = 5;
      if (evaluation.awarded > 1) evaluation.awarded = 1;
      if (knowledge.awarded + analysis.awarded + evaluation.awarded > 5) {
        analysis.awarded = Math.max(0, 5 - knowledge.awarded - evaluation.awarded);
      }
    }
    const evalIsAbsent = /\b(evaluation\s+is\s+(?:absent|missing|non[- ]?existent)|no\s+creditable\s+evaluation|wholly\s+absent\s+evaluation)\b/i.test(diagText);
    if (evalIsAbsent && evaluation.awarded > 0) {
      evaluation.awarded = 0;
      finalMark = Math.min(finalMark, knowledge.awarded + analysis.awarded);
    }
  }

  // 2. On 6-mark Analyse questions: Cambridge mark schemes strictly enforce a maximum of 3 marks for listing points without causal analysis.
  if (maxMark === 6 && split.ao2_marks === 6) {
    const diagText = `${raw.examiner_summary || ""} ${analysis.comment || ""} ${(Array.isArray(raw.weaknesses) ? raw.weaknesses : []).join(" ")}`;
    const isListingOnly = /\b(listing\s+(?:any\s+)?(?:methods|points|factors|policies)\s+(?:max\s+3|capped)|list[- ]only\b|lists?\s+(?:points|methods|policies)\s+without\s+(?:causal\s+development|analysis|explaining))\b/i.test(diagText);
    if (isListingOnly && finalMark > 3) {
      finalMark = 3;
      analysis.awarded = 3;
    }
  }

  const rawMissing = (raw.missing_elements ?? {}) as Record<string, unknown>;

  const commandCheck = raw.command_word_check as any;
  const command_word_check: CommandWordCheck | undefined = commandCheck
    ? {
        command_word: String(commandCheck.command_word || ""),
        satisfied: Boolean(commandCheck.satisfied),
        comment: sanitizeIgcseFeedbackText(String(commandCheck.comment || "")),
      }
    : undefined;

  const normalised: Grading = {
    total_mark: finalMark,
    max_mark: maxMark,
    band: bandFor(finalMark, maxMark),
    mechanism_validation,
    points,
    missed_ms_points: toStringArray(raw.missed_ms_points, essayText),
    command_word_check,
    next_step_feedback: toStringArray(raw.next_step_feedback || raw.actionable_feedback, essayText),
    ao_breakdown: { knowledge, analysis, evaluation },
    examiner_summary:
      typeof raw.examiner_summary === "string"
        ? verifyVerbatimQuotes(sanitizeIgcseFeedbackText(raw.examiner_summary), essayText)
        : "",
    strengths: toStringArray(raw.strengths, essayText),
    weaknesses: toStringArray(raw.weaknesses, essayText),
    missing_elements: {
      ...EMPTY_MISSING,
      definitions: toStringArray(rawMissing.definitions, essayText),
      analysis: toStringArray(rawMissing.analysis, essayText),
      evaluation: toStringArray(rawMissing.evaluation, essayText),
      examples: toStringArray(rawMissing.examples, essayText),
      diagrams: toStringArray(rawMissing.diagrams, essayText),
    },
    actionable_feedback: toStringArray(raw.actionable_feedback, essayText),
    suggested_resources: toStringArray(raw.suggested_resources, essayText),
    suggested_practice: toStringArray(raw.suggested_practice, essayText),
    confidence: Math.max(0, Math.min(1, toNumber(raw.confidence, 0.78))),
    audited: false,
    sources: [],
    anchorsUsed: 0,
    off_syllabus: Boolean(raw.off_syllabus),
    detected_subject: typeof raw.detected_subject === "string" ? raw.detected_subject : undefined,
    grounding_status:
      raw.grounding_status === "mark_scheme_image" || raw.grounding_status === "unanchored"
        ? raw.grounding_status
        : "grounded",
  };

  return purgeContradictions(normalised);
}

/**
 * Cambridge IGCSE 0455 Level & Band Descriptor.
 */
export function bandFor(total: number, maxMark: number): string {
  if (total === 0) return "Level 0 (No creditable content)";

  if (maxMark === 8) {
    if (total >= 6) return "Level 3 (Reasoned Two-Sided Discussion & Evaluation)";
    if (total >= 3) return "Level 2 (Reasoned Discussion / One-Sided Analysis)";
    return "Level 1 (Simple Attempt / Definitions)";
  }

  if (maxMark <= 6) {
    return `Point Marked (${total}/${maxMark})`;
  }

  const ratio = maxMark > 0 ? total / maxMark : 0;
  if (ratio >= 0.75) return "Level 3 (High-scoring evaluative discussion)";
  if (ratio >= 0.4) return "Level 2 (Sound economic analysis)";
  return "Level 1 (Basic knowledge attempt)";
}
