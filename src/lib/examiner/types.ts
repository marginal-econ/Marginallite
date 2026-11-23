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

// Generic stop words for semantic deduplication of feedback points
const FEEDBACK_STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "for", "are", "was", "were",
  "been", "being", "have", "has", "had", "does", "did", "doing", "would",
  "should", "could", "ought", "their", "they", "them", "which", "what",
  "when", "where", "also", "into", "onto", "then", "than", "more", "most",
  "some", "such", "only", "even", "student", "candidate", "essay", "response",
  "economic", "economics", "analysis", "evaluation", "explanation", "explain",
  "explaining", "your", "about", "while", "however", "although", "through",
  "between", "whether", "further", "clear", "clearly", "provide", "provides",
  "providing", "include", "including", "ensure", "strengthen", "elevate",
  "improve", "deepen", "develop", "developed", "developing", "specific",
]);

function extractFeedbackStems(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !FEEDBACK_STOP_WORDS.has(w))
      .map((w) => w.replace(/(ations|ation|ings|ing|tion|ment|ities|ity|ness|ally|ed|ly|es|s)$/, ""))
      .filter((w) => w.length >= 3),
  );
}

/**
 * Computes Jaccard similarity and Overlap Coefficient (intersection / min(|A|, |B|))
 * on stemmed content words so a longer bullet with a quote is still recognised as
 * duplicating a shorter bullet on the exact same point.
 */
export function feedbackSimilarity(a: string, b: string): { jaccard: number; overlap: number } {
  const aWords = extractFeedbackStems(a);
  const bWords = extractFeedbackStems(b);
  if (aWords.size === 0 || bWords.size === 0) return { jaccard: 0, overlap: 0 };
  let intersection = 0;
  for (const w of aWords) {
    if (bWords.has(w)) intersection++;
  }
  const union = aWords.size + bWords.size - intersection;
  const minSize = Math.min(aWords.size, bWords.size);
  return {
    jaccard: union > 0 ? intersection / union : 0,
    overlap: minSize > 0 ? intersection / minSize : 0,
  };
}

/**
 * Semantically deduplicates feedback bullet arrays using stemmed content-word Jaccard (>= 0.30)
 * or Overlap Coefficient (>= 0.48), preventing repetitive or near-duplicate feedback points.
 */
export function deduplicateFeedbackPoints(points: string[], maxCount = 5): string[] {
  const result: string[] = [];

  for (const raw of points) {
    const cleaned = sanitizeIgcseFeedbackText(raw).trim();
    if (!cleaned || cleaned.length < 4) continue;
    const exists = result.some((existing) => {
      const sim = feedbackSimilarity(existing, cleaned);
      return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
    });
    if (!exists) {
      result.push(cleaned);
      if (result.length >= maxCount) break;
    }
  }
  return result;
}

export function canonicalizeCambridge0455Resource(res: string): string {
  const lower = res.toLowerCase();
  if (lower.includes("price control") || lower.includes("maximum price") || lower.includes("minimum price") || lower.includes("ceiling") || lower.includes("floor")) {
    return "Cambridge IGCSE 0455 Unit 2.11: Market failure and government intervention";
  }
  if (lower.includes("monetary policy") || lower.includes("interest rate") || lower.includes("money supply")) {
    return "Cambridge IGCSE 0455 Unit 4.4: Monetary policy";
  }
  if (lower.includes("fiscal policy") || lower.includes("taxation") || lower.includes("government spending")) {
    return "Cambridge IGCSE 0455 Unit 4.3: Fiscal policy";
  }
  if (lower.includes("ped") || lower.includes("price elasticity of demand")) {
    return "Cambridge IGCSE 0455 Unit 2.7: Price elasticity of demand (PED)";
  }
  if (lower.includes("pes") || lower.includes("price elasticity of supply")) {
    return "Cambridge IGCSE 0455 Unit 2.8: Price elasticity of supply (PES)";
  }
  if (lower.includes("supply-side") || lower.includes("supply side")) {
    return "Cambridge IGCSE 0455 Unit 4.5: Supply-side policy";
  }
  if (lower.includes("economic growth") || lower.includes("gdp")) {
    return "Cambridge IGCSE 0455 Unit 4.6: Economic growth";
  }
  if (lower.includes("unemployment") || lower.includes("employment")) {
    return "Cambridge IGCSE 0455 Unit 4.7: Employment and unemployment";
  }
  if (lower.includes("inflation") || lower.includes("deflation") || lower.includes("cpi")) {
    return "Cambridge IGCSE 0455 Unit 4.8: Inflation and deflation";
  }
  if (lower.includes("poverty") || lower.includes("living standards")) {
    return "Cambridge IGCSE 0455 Unit 5.2: Poverty";
  }
  if (lower.includes("exchange rate") || lower.includes("depreciation") || lower.includes("appreciation")) {
    return "Cambridge IGCSE 0455 Unit 6.3: Foreign exchange rates";
  }
  if (lower.includes("balance of payments") || lower.includes("current account") || lower.includes("trade balance")) {
    return "Cambridge IGCSE 0455 Unit 6.4: Current account of balance of payments";
  }
  if (lower.includes("trade union") || lower.includes("worker") || lower.includes("labour market") || lower.includes("wage")) {
    return "Cambridge IGCSE 0455 Unit 3.3: Workers";
  }
  if (lower.includes("specialisation") || lower.includes("specialization")) {
    return "Cambridge IGCSE 0455 Unit 6.1: International specialisation";
  }
  if (lower.includes("free trade") || lower.includes("protectionism") || lower.includes("tariff") || lower.includes("globalisation")) {
    return "Cambridge IGCSE 0455 Unit 6.2: Globalisation, free trade and protection";
  }
  if (lower.includes("macroeconomic aims")) {
    return "Cambridge IGCSE 0455 Unit 4.2: Macroeconomic aims of government";
  }
  if (lower.includes("economic problem") || lower.includes("scarcity") || lower.includes("opportunity cost")) {
    return "Cambridge IGCSE 0455 Unit 1.1: The nature of the economic problem";
  }
  return res;
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

  let weaknesses = evalFilter(cleanList(grading.weaknesses, 4));

  // Reclassify evaluation dimensions out of missing_elements.analysis
  const isEvaluationDimension = (item: string): boolean =>
    /\b(short[- ]run|long[- ]run|stakeholder|trade[- ]off|weigh|depends on|conditionality|elasticity condition)\b/i.test(
      item,
    );

  const rawAnalysis = (grading.missing_elements.analysis || []).filter((x) => !isALevelOnlyLeak(x)).filter(filterContradiction);
  const reclassifiedEval: string[] = [];
  const keptAnalysis: string[] = [];
  for (const item of rawAnalysis) {
    if (isEvaluationDimension(item)) {
      reclassifiedEval.push(item);
    } else {
      keptAnalysis.push(item);
    }
  }

  // Filter any missing_elements item that repeats an already-stated weakness or another missing item
  const seenMissing: string[] = [];
  const filterMissingList = (items: string[], max = 3): string[] => {
    const out: string[] = [];
    const validItems = (items || []).filter((x) => !isALevelOnlyLeak(x)).filter(filterContradiction);
    for (const raw of deduplicateFeedbackPoints(validItems, max)) {
      const cleaned = raw.trim();
      if (!cleaned) continue;
      const repeatsWeakness = weaknesses.some((w) => {
        const sim = feedbackSimilarity(w, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      const repeatsEarlierMissing = seenMissing.some((m) => {
        const sim = feedbackSimilarity(m, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      if (!repeatsWeakness && !repeatsEarlierMissing) {
        out.push(cleaned);
        seenMissing.push(cleaned);
      }
    }
    return out;
  };

  const rawEval = [
    ...(grading.missing_elements.evaluation || []),
    ...reclassifiedEval,
  ].filter((x) => !isALevelOnlyLeak(x)).filter(filterContradiction);

  const missingElements: MissingElements = {
    definitions: filterMissingList(grading.missing_elements.definitions, 3),
    analysis: filterMissingList(keptAnalysis, 3),
    evaluation: noEvalRequired ? [] : filterMissingList(rawEval, 3),
    examples: filterMissingList(grading.missing_elements.examples, 3),
    diagrams: filterMissingList(grading.missing_elements.diagrams, 3),
  };

  // Deduplicate actionable_feedback internally AND against weaknesses/missing_elements
  const dedupedRawActions: string[] = [];
  for (const item of evalFilter(cleanList(grading.actionable_feedback || [], 5))) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const isDup = dedupedRawActions.some((existing) => {
      const sim = feedbackSimilarity(existing, trimmed);
      return sim.jaccard >= 0.28 || sim.overlap >= 0.44;
    });
    if (!isDup) {
      dedupedRawActions.push(trimmed);
      if (dedupedRawActions.length >= 4) break;
    }
  }

  const distinctActions = dedupedRawActions.filter((action) => {
    const repeatsWeakness = weaknesses.some((w) => {
      const sim = feedbackSimilarity(w, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    const repeatsMissing = seenMissing.some((m) => {
      const sim = feedbackSimilarity(m, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    return !repeatsWeakness && !repeatsMissing;
  });

  let actionableFeedback = distinctActions.slice(0, 3);
  if (actionableFeedback.length === 0 && dedupedRawActions.length > 0) {
    actionableFeedback = [dedupedRawActions[0]];
  }

  const canonicalResources = deduplicateFeedbackPoints(
    grading.suggested_resources
      .filter((x) => !isALevelOnlyLeak(x))
      .map(canonicalizeCambridge0455Resource),
    4,
  );

  return {
    ...grading,
    examiner_summary: sanitizeIgcseFeedbackText(grading.examiner_summary),
    strengths: deduplicateFeedbackPoints(grading.strengths.filter((x) => !isALevelOnlyLeak(x)), 4),
    weaknesses,
    actionable_feedback: actionableFeedback,
    next_step_feedback: actionableFeedback,
    suggested_resources: canonicalResources,
    suggested_practice: deduplicateFeedbackPoints(
      grading.suggested_practice.filter((x) => !isALevelOnlyLeak(x)),
      4,
    ),
    missing_elements: missingElements,
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

function findVerbatimStudentQuote(quote: string, essayText?: string): string {
  if (!quote || !essayText) return quote;
  const qClean = quote.trim();
  if (essayText.includes(qClean)) return qClean;
  const lowerEssay = essayText.toLowerCase();
  const lowerQ = qClean.toLowerCase();
  const idx = lowerEssay.indexOf(lowerQ);
  if (idx !== -1) {
    return essayText.slice(idx, idx + qClean.length);
  }
  return qClean;
}

  // Parse points if present (point-marking for 2m/4m/6m & Table A evidence points for 8m)
  let points: CreditPoint[] | undefined;
  if (Array.isArray(raw.points)) {
    points = raw.points.map((p: any) => ({
      quote: cleanStars(findVerbatimStudentQuote(String(p.quote || ""), essayText)),
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

  // Reconcile and cap Credit Points against finalMark & eliminate unsound / duplicate points
  if (points && points.length > 0) {
    // 1. Detect erroneous or backward economics in points
    for (const pt of points) {
      const reasonLower = pt.reason.toLowerCase();
      const hasErrorInReason =
        /\b(misleading|incorrect|backwards?|confuses?|false\s+economics?|fatal\s+fallacy|error|unsound|not\s+credited)\b/i.test(
          reasonLower,
        );
      const matchesErrorEvidence = Boolean(
        mechanism_validation?.fatal_misconceptions_found &&
        mechanism_validation.error_evidence_quotes.some(
          (eq) =>
            pt.quote.toLowerCase().includes(eq.toLowerCase()) ||
            eq.toLowerCase().includes(pt.quote.toLowerCase()),
        ),
      );
      if (hasErrorInReason || matchesErrorEvidence) {
        pt.identify_awarded = 0;
        pt.development_awarded = 0;
      }
    }

    // 2. Detect duplicate mechanisms across points
    const seenPointMechanisms: Array<{ msPoint: string; quote: string }> = [];
    for (const pt of points) {
      if (pt.identify_awarded === 0 && pt.development_awarded === 0) continue;
      const isDup = seenPointMechanisms.some((prev) => {
        // Direct duplicate if matched mark scheme point is essentially identical
        const msSim = feedbackSimilarity(prev.msPoint, pt.matched_ms_point);
        if (msSim.jaccard >= 0.60 || (msSim.overlap >= 0.75 && pt.matched_ms_point.length > 10)) {
          return true;
        }
        // Or if the student quote is repeating the same explanation
        const quoteSim = feedbackSimilarity(prev.quote, pt.quote);
        if (quoteSim.jaccard >= 0.60 || (quoteSim.overlap >= 0.75 && pt.quote.length > 15)) {
          return true;
        }
        return false;
      });
      if (isDup) {
        pt.identify_awarded = 0;
        pt.development_awarded = 0;
        if (!pt.reason.includes("Duplicate")) {
          pt.reason = `${pt.reason} (Duplicate argument: credit already awarded in earlier point; Cambridge mark schemes award credit once only per mechanism).`;
        }
      } else {
        seenPointMechanisms.push({ msPoint: pt.matched_ms_point, quote: pt.quote });
      }
    }

    // 3. Mathematical reconciliation so point sum never exceeds finalMark or maxMark
    let runningPointSum = 0;
    for (const pt of points) {
      if (pt.identify_awarded === 0 && pt.development_awarded === 0) continue;
      const available = finalMark - runningPointSum;
      if (available <= 0) {
        pt.identify_awarded = 0;
        pt.development_awarded = 0;
        if (!pt.reason.includes("cap reached")) {
          pt.reason = `${pt.reason} (Cambridge mark cap reached: maximum ${finalMark}/${maxMark} marks awarded).`;
        }
      } else if (available === 1 && pt.identify_awarded + pt.development_awarded > 1) {
        pt.identify_awarded = 1;
        pt.development_awarded = 0;
        runningPointSum += 1;
      } else {
        const awarded = pt.identify_awarded + (pt.identify_awarded > 0 ? pt.development_awarded : 0);
        runningPointSum += awarded;
      }
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

/**
 * Cross-section deduplication for Cambridge IGCSE 0455 examiner reports:
 * 1. Enforces strict non-overlapping roles across Strengths, Weaknesses, Missing Elements, and Actionable Steps.
 * 2. Purges unrequested diagram critiques when the question did not ask for a diagram.
 * 3. Eliminates duplicate or near-duplicate advice so candidates never read the same criticism multiple times.
 */
export function deduplicateAcrossSections(grading: Grading, questionText?: string): Grading {
  const asksDiagram = questionText
    ? /\b(diagram|draw\s+a|using\s+a\s+(?:demand|supply|ppc|production\s+possibility))\b/i.test(questionText)
    : false;

  const isUnrequestedDiagramCritique = (text: string): boolean => {
    if (asksDiagram) return false;
    return (
      /\b(?:absence|lack|omission)\s+of\s+(?:a\s+|an\s+|any\s+)?(?:well-labeled\s+|labeled\s+|clear\s+)?diagrams?\b/i.test(text) ||
      /\b(?:include|add|draw|insert)\s+(?:a\s+|an\s+)?(?:well-labeled\s+|labeled\s+|clear\s+)?(?:demand\s+and\s+supply\s+|economic\s+|ppc\s+)?diagrams?\b/i.test(text) ||
      /\bwithout\s+(?:a\s+|any\s+)?diagrams?\b/i.test(text)
    );
  };

  const fixTopBandPhrasing = (text: string): string => {
    const isTopBand = grading.band?.includes("Level 3") || grading.band?.includes("Top Band");
    if (!isTopBand) return text;
    return text
      .replace(/\bto\s+(?:reach|achieve|enter|elevate\s+(?:the\s+)?(?:analysis|evaluation|essay|response)\s+to)\s+(?:the\s+)?(?:top\s+band|level\s+3)\b/gi, "to push toward full marks")
      .replace(/\bin\s+order\s+to\s+reach\s+(?:the\s+)?(?:top\s+band|level\s+3)\b/gi, "to push toward full marks");
  };

  const strengths = deduplicateFeedbackPoints(
    (grading.strengths || []).map(fixTopBandPhrasing),
    4,
  );

  let weaknesses = deduplicateFeedbackPoints(
    (grading.weaknesses || [])
      .filter((w) => !isUnrequestedDiagramCritique(w))
      .map(fixTopBandPhrasing),
    4,
  );

  // Filter any missing_elements item that repeats an already-stated weakness or another missing item
  const seenMissing: string[] = [];
  const filterMissingList = (items: string[]): string[] => {
    const out: string[] = [];
    for (const raw of deduplicateFeedbackPoints(items || [], 2)) {
      const cleaned = fixTopBandPhrasing(raw);
      if (!cleaned || isUnrequestedDiagramCritique(cleaned)) continue;
      const repeatsWeakness = weaknesses.some((w) => {
        const sim = feedbackSimilarity(w, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      const repeatsEarlierMissing = seenMissing.some((m) => {
        const sim = feedbackSimilarity(m, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      if (!repeatsWeakness && !repeatsEarlierMissing) {
        out.push(cleaned);
        seenMissing.push(cleaned);
      }
    }
    return out;
  };

  const missingElements: MissingElements = {
    definitions: filterMissingList(grading.missing_elements?.definitions || []),
    analysis: filterMissingList(grading.missing_elements?.analysis || []),
    evaluation:
      grading.ao_breakdown.evaluation.out_of === 0
        ? []
        : filterMissingList(grading.missing_elements?.evaluation || []),
    examples: filterMissingList(grading.missing_elements?.examples || []),
    diagrams: asksDiagram ? filterMissingList(grading.missing_elements?.diagrams || []) : [],
  };

  // Deduplicate actionable_feedback internally
  const dedupedRawActions: string[] = [];
  for (const item of (grading.actionable_feedback || []).filter((a) => !isUnrequestedDiagramCritique(a)).map(fixTopBandPhrasing)) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const isDup = dedupedRawActions.some((existing) => {
      const sim = feedbackSimilarity(existing, trimmed);
      if (sim.jaccard >= 0.28 || sim.overlap >= 0.44) return true;
      const bothRankEval =
        /\b(?:in\s+(?:the|your)\s+evaluation|conclusion).*\b(?:rank|prioriti[sz]e|most\s+decisive)\b/i.test(existing) &&
        /\b(?:in\s+(?:the|your)\s+evaluation|conclusion).*\b(?:rank|prioriti[sz]e|most\s+decisive)\b/i.test(trimmed);
      const bothCounterEval =
        /\bevaluation\b.*\bcounter[- ]?argument\b/i.test(existing) &&
        /\bevaluation\b.*\bcounter[- ]?argument\b/i.test(trimmed);
      return bothRankEval || bothCounterEval;
    });
    if (!isDup) {
      dedupedRawActions.push(trimmed);
      if (dedupedRawActions.length >= 4) break;
    }
  }

  const rawActions = dedupedRawActions;
  const distinctActions = rawActions.filter((action) => {
    const repeatsWeakness = weaknesses.some((w) => {
      const sim = feedbackSimilarity(w, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    const repeatsMissing = seenMissing.some((m) => {
      const sim = feedbackSimilarity(m, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    return !repeatsWeakness && !repeatsMissing;
  });

  // Always keep at least 1 actionable step
  let actionableFeedback = distinctActions.slice(0, 3);
  if (actionableFeedback.length === 0 && rawActions.length > 0) {
    const ranked = rawActions
      .map((a) => ({
        a,
        maxSim: Math.max(
          0,
          ...weaknesses.map((w) => feedbackSimilarity(w, a).overlap),
          ...seenMissing.map((m) => feedbackSimilarity(m, a).overlap),
        ),
      }))
      .sort((x, y) => x.maxSim - y.maxSim);
    actionableFeedback = [ranked[0].a];
  }

  if (weaknesses.length === 0 && grading.weaknesses?.length > 0) {
    weaknesses = [fixTopBandPhrasing(grading.weaknesses[0])];
  }

  // Final pass: strip any missing_elements checklist bullet that repeats an actionable_feedback step
  const stripActionDupes = (items: string[]): string[] =>
    items.filter(
      (m) =>
        !actionableFeedback.some((a) => {
          const sim = feedbackSimilarity(m, a);
          return sim.jaccard >= 0.34 || sim.overlap >= 0.50;
        }),
    );

  const finalMissingElements: MissingElements = {
    definitions: stripActionDupes(missingElements.definitions),
    analysis: stripActionDupes(missingElements.analysis),
    evaluation: stripActionDupes(missingElements.evaluation),
    examples: stripActionDupes(missingElements.examples),
    diagrams: stripActionDupes(missingElements.diagrams),
  };

  return {
    ...grading,
    strengths,
    weaknesses,
    missing_elements: finalMissingElements,
    actionable_feedback: actionableFeedback,
    next_step_feedback: actionableFeedback,
  };
}
