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

export type Grading = {
  total_mark: number;
  max_mark: number;
  band: string;
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
  /** How many active calibration anchors were injected for this grade */
  anchorsUsed: number;
  off_syllabus?: boolean;
  detected_subject?: string;
  grounding_status?: "grounded" | "mark_scheme_image" | "unanchored";
  model?: string;
  keyRotated?: boolean;
  modelSwapped?: boolean;
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
  indicative_grade?: string;
};

const EMPTY_MISSING: MissingElements = {
  definitions: [],
  analysis: [],
  evaluation: [],
  examples: [],
  diagrams: [],
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .filter((item) => item.trim().length > 0);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseAo(value: unknown, outOf: number): AoScore {
  const raw = (value ?? {}) as Record<string, unknown>;
  const declaredOutOf = toNumber(raw.out_of, outOf);
  return {
    awarded: Math.max(0, Math.min(declaredOutOf, Math.round(toNumber(raw.awarded, 0)))),
    out_of: declaredOutOf,
    comment: typeof raw.comment === "string" ? raw.comment : "",
  };
}

/**
 * Coerce raw model JSON into an IGCSE 0455 Grading.
 * Enforces the fixed AO allocation and point-marking validations.
 */
export function normaliseGrading(
  raw: Record<string, unknown>,
  maxMark: number,
  split: { ao1_marks: number; ao2_marks: number; ao3_marks: number },
): Grading {
  const rawAo = (raw.ao_breakdown ?? {}) as Record<string, unknown>;

  const knowledge = normaliseAo(rawAo.knowledge ?? rawAo.ao1, split.ao1_marks);
  const analysis = normaliseAo(rawAo.analysis ?? rawAo.ao2, split.ao2_marks);
  const evaluation = normaliseAo(rawAo.evaluation ?? rawAo.ao3, split.ao3_marks);

  // Mark scheme owns the ceiling
  knowledge.out_of = split.ao1_marks;
  analysis.out_of = split.ao2_marks;
  evaluation.out_of = split.ao3_marks;
  knowledge.awarded = Math.min(knowledge.awarded, split.ao1_marks);
  analysis.awarded = Math.min(analysis.awarded, split.ao2_marks);
  evaluation.awarded = Math.min(evaluation.awarded, split.ao3_marks);

  // Parse points if present
  let points: CreditPoint[] | undefined;
  if (Array.isArray(raw.points)) {
    points = raw.points.map((p: any) => ({
      quote: String(p.quote || ""),
      matched_ms_point: String(p.matched_ms_point || ""),
      identify_awarded: Math.min(1, Math.max(0, Number(p.identify_awarded) || 0)),
      development_awarded: Math.min(1, Math.max(0, Number(p.development_awarded) || 0)),
      reason: String(p.reason || ""),
    }));
  }

  // Calculate total: for point marked questions with points, verify sum
  let pointsTotal = 0;
  if (points && points.length > 0) {
    // Each point: identify + development (development only if identify or valid point)
    pointsTotal = points.reduce(
      (sum, p) => sum + p.identify_awarded + (p.identify_awarded > 0 ? p.development_awarded : 0),
      0,
    );
  }

  const aoTotal = knowledge.awarded + analysis.awarded + evaluation.awarded;
  const declaredTotal = Math.round(toNumber(raw.total_mark, aoTotal));

  // Determine authoritative mark
  let finalMark = aoTotal;
  if (pointsTotal > 0 && maxMark <= 6) {
    // For 4-marker: capped at 4 (2 points max); for 6-marker: capped at 6 (3 points max)
    const pointCap = maxMark === 4 ? 4 : maxMark === 6 ? 6 : maxMark;
    finalMark = Math.min(pointCap, pointsTotal);
  } else if (declaredTotal !== aoTotal && declaredTotal <= maxMark && declaredTotal >= 0) {
    finalMark = declaredTotal;
  }
  finalMark = Math.max(0, Math.min(maxMark, finalMark));

  const rawMissing = (raw.missing_elements ?? {}) as Record<string, unknown>;

  const commandCheck = raw.command_word_check as any;
  const command_word_check: CommandWordCheck | undefined = commandCheck
    ? {
        command_word: String(commandCheck.command_word || ""),
        satisfied: Boolean(commandCheck.satisfied),
        comment: String(commandCheck.comment || ""),
      }
    : undefined;

  return {
    total_mark: finalMark,
    max_mark: maxMark,
    band: typeof raw.band === "string" ? raw.band : bandFor(finalMark, maxMark),
    points,
    missed_ms_points: toStringArray(raw.missed_ms_points),
    command_word_check,
    next_step_feedback: toStringArray(raw.next_step_feedback || raw.actionable_feedback),
    ao_breakdown: { knowledge, analysis, evaluation },
    examiner_summary: typeof raw.examiner_summary === "string" ? raw.examiner_summary : "",
    strengths: toStringArray(raw.strengths),
    weaknesses: toStringArray(raw.weaknesses),
    missing_elements: {
      ...EMPTY_MISSING,
      definitions: toStringArray(rawMissing.definitions),
      analysis: toStringArray(rawMissing.analysis),
      evaluation: toStringArray(rawMissing.evaluation),
      examples: toStringArray(rawMissing.examples),
      diagrams: toStringArray(rawMissing.diagrams),
    },
    actionable_feedback: toStringArray(raw.actionable_feedback),
    suggested_resources: toStringArray(raw.suggested_resources),
    suggested_practice: toStringArray(raw.suggested_practice),
    confidence: Math.max(0, Math.min(1, toNumber(raw.confidence, 0.7))),
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
