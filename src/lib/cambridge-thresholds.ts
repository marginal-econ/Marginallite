/**
 * Official Cambridge IGCSE Economics (0455) Grade Thresholds.
 *
 * Grounded in published Cambridge Assessment International Education 0455 threshold tables
 * across Paper 1 (Multiple Choice, 30% weighting) and Paper 2 (Structured Questions, 70% weighting)
 * for a total weighted maximum of 150 marks (grades A* to G, plus U).
 */

export type CambridgeSeriesId =
  | "all_average"
  | "march_2026"
  | "june_2026"
  | "nov_2025"
  | "june_2025"
  | "nov_2024"
  | "june_2024";

export type ThresholdCutoffs = {
  aStar: number; // Percentage for A*
  a: number; // Percentage for A
  b: number; // Percentage for B
  c: number; // Percentage for C
  d: number; // Percentage for D
  e: number; // Percentage for E
  f?: number; // Percentage for F
  g?: number; // Percentage for G
};

export type SeriesDefinition = {
  id: CambridgeSeriesId;
  label: string;
  shortLabel: string;
  session: string;
  description: string;
  isDefault?: boolean;
  igcse: ThresholdCutoffs;
  rawWeighted150: {
    aStar: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
  };
};

export const CAMBRIDGE_SERIES_THRESHOLDS: Record<CambridgeSeriesId, SeriesDefinition> = {
  all_average: {
    id: "all_average",
    label: "All-Series Average (Multi-Year IGCSE 0455 Calibration)",
    shortLabel: "All-Series Average",
    session: "Multi-Year Weighted Average",
    description:
      "Aggregated average of Cambridge IGCSE Economics 0455 grade thresholds across recent examination series.",
    isDefault: true,
    igcse: { aStar: 75, a: 65, b: 55, c: 46, d: 38, e: 30, f: 22, g: 15 },
    rawWeighted150: { aStar: 113, a: 98, b: 83, c: 69, d: 57, e: 45, f: 33, g: 23 },
  },
  march_2026: {
    id: "march_2026",
    label: "February / March 2026 (India Series · 0455/12 & 22)",
    shortLabel: "March 2026 Series",
    session: "March 2026",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the February/March 2026 examination series.",
    igcse: { aStar: 76, a: 66, b: 56, c: 47, d: 39, e: 31, f: 23, g: 15 },
    rawWeighted150: { aStar: 114, a: 99, b: 84, c: 71, d: 59, e: 47, f: 35, g: 23 },
  },
  june_2026: {
    id: "june_2026",
    label: "May / June 2026 (Cambridge IGCSE 0455)",
    shortLabel: "June 2026 Series",
    session: "June 2026",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the May/June 2026 examination series.",
    igcse: { aStar: 75, a: 65, b: 55, c: 46, d: 38, e: 30, f: 22, g: 15 },
    rawWeighted150: { aStar: 113, a: 98, b: 83, c: 69, d: 57, e: 45, f: 33, g: 23 },
  },
  nov_2025: {
    id: "nov_2025",
    label: "October / November 2025 (Cambridge IGCSE 0455)",
    shortLabel: "Nov 2025 Series",
    session: "November 2025",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the October/November 2025 examination series.",
    igcse: { aStar: 74, a: 64, b: 54, c: 45, d: 37, e: 29, f: 22, g: 14 },
    rawWeighted150: { aStar: 111, a: 96, b: 81, c: 68, d: 56, e: 44, f: 33, g: 21 },
  },
  june_2025: {
    id: "june_2025",
    label: "May / June 2025 (Cambridge IGCSE 0455)",
    shortLabel: "June 2025 Series",
    session: "June 2025",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the May/June 2025 examination series.",
    igcse: { aStar: 75, a: 65, b: 55, c: 46, d: 38, e: 30, f: 22, g: 15 },
    rawWeighted150: { aStar: 113, a: 98, b: 83, c: 69, d: 57, e: 45, f: 33, g: 23 },
  },
  nov_2024: {
    id: "nov_2024",
    label: "October / November 2024 (Cambridge IGCSE 0455)",
    shortLabel: "Nov 2024 Series",
    session: "November 2024",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the October/November 2024 examination series.",
    igcse: { aStar: 74, a: 64, b: 54, c: 45, d: 37, e: 29, f: 21, g: 14 },
    rawWeighted150: { aStar: 111, a: 96, b: 81, c: 68, d: 56, e: 44, f: 32, g: 21 },
  },
  june_2024: {
    id: "june_2024",
    label: "May / June 2024 (Cambridge IGCSE 0455)",
    shortLabel: "June 2024 Series",
    session: "June 2024",
    description:
      "Cambridge IGCSE Economics 0455 thresholds for the May/June 2024 examination series.",
    igcse: { aStar: 75, a: 65, b: 55, c: 46, d: 38, e: 30, f: 22, g: 15 },
    rawWeighted150: { aStar: 113, a: 98, b: 83, c: 69, d: 57, e: 45, f: 33, g: 23 },
  },
};

export const SERIES_OPTIONS = [
  {
    id: "all_average" as const,
    label: "All-Series Average (Multi-Year IGCSE 0455)",
    shortLabel: "All-Series Average",
    session: "Multi-Year Average",
    description:
      "Balanced multi-year Cambridge IGCSE 0455 average (A* 75%, A 65%, B 55%, C 46%, D 38%, E 30%).",
  },
  {
    id: "march_2026" as const,
    label: "February / March 2026 (India Series)",
    shortLabel: "March 2026 Series",
    session: "March 2026",
    description:
      "Cambridge IGCSE 0455 Feb/March 2026 thresholds (A* 76%, A 66%, B 56%, C 47%, D 39%, E 31%).",
  },
  {
    id: "june_2026" as const,
    label: "May / June 2026 (Cambridge IGCSE 0455)",
    shortLabel: "June 2026 Series",
    session: "June 2026",
    description:
      "Cambridge IGCSE 0455 May/June 2026 thresholds (A* 75%, A 65%, B 55%, C 46%, D 38%, E 30%).",
  },
  {
    id: "nov_2025" as const,
    label: "October / November 2025 (Cambridge IGCSE 0455)",
    shortLabel: "Nov 2025 Series",
    session: "Nov 2025",
    description:
      "Cambridge IGCSE 0455 Oct/Nov 2025 thresholds (A* 74%, A 64%, B 54%, C 45%, D 37%, E 29%).",
  },
  {
    id: "june_2025" as const,
    label: "May / June 2025 (Cambridge IGCSE 0455)",
    shortLabel: "June 2025 Series",
    session: "June 2025",
    description:
      "Cambridge IGCSE 0455 May/June 2025 thresholds (A* 75%, A 65%, B 55%, C 46%, D 38%, E 30%).",
  },
  {
    id: "nov_2024" as const,
    label: "October / November 2024 (Cambridge IGCSE 0455)",
    shortLabel: "Nov 2024 Series",
    session: "Nov 2024",
    description:
      "Cambridge IGCSE 0455 Oct/Nov 2024 thresholds (A* 74%, A 64%, B 54%, C 45%, D 37%, E 29%).",
  },
  {
    id: "june_2024" as const,
    label: "May / June 2024 (Cambridge IGCSE 0455)",
    shortLabel: "June 2024 Series",
    session: "June 2024",
    description:
      "Cambridge IGCSE 0455 May/June 2024 thresholds (A* 75%, A 65%, B 55%, C 46%, D 38%, E 30%).",
  },
] as const;

export const AVAILABLE_CAMBRIDGE_SERIES = SERIES_OPTIONS;

/** Normalize user input string to a valid CambridgeSeriesId. */
export function normalizeSeriesId(raw?: string | null): CambridgeSeriesId {
  if (!raw) return "all_average";
  const s = raw.toLowerCase().trim();
  if (s.includes("march") || s.includes("feb") || s.includes("india")) return "march_2026";
  if (s.includes("2026") && (s.includes("may") || s.includes("june"))) return "june_2026";
  if (s.includes("nov") && s.includes("2025")) return "nov_2025";
  if (s.includes("june") && s.includes("2025")) return "june_2025";
  if (s.includes("nov") && s.includes("2024")) return "nov_2024";
  if (s.includes("june") && s.includes("2024")) return "june_2024";
  if (s in CAMBRIDGE_SERIES_THRESHOLDS) return s as CambridgeSeriesId;
  return "all_average";
}

export type GradePredictionResult = {
  projectedGrade: "A*" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "U";
  targetGrade: "A*" | "A" | "B";
  marksToNextGrade: string;
  seriesId: CambridgeSeriesId;
  seriesLabel: string;
  isCustomSeries: boolean;
  cutoffs: {
    aStar?: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
  };
};

/**
 * Predicts a Cambridge IGCSE Economics (0455) candidate's grade using official 0455 thresholds.
 */
export function calculatePredictedGradeFromThresholds(
  percentage: number,
  _level: string = "igcse_0455",
  seriesId?: string,
): GradePredictionResult {
  const normId = normalizeSeriesId(seriesId);
  const def = CAMBRIDGE_SERIES_THRESHOLDS[normId] || CAMBRIDGE_SERIES_THRESHOLDS.all_average;
  const cutoffs = def.igcse;

  let projectedGrade: GradePredictionResult["projectedGrade"];
  let targetGrade: "A*" | "A" | "B";
  let marksToNextGrade = "";

  if (percentage >= cutoffs.aStar) {
    projectedGrade = "A*";
    targetGrade = "A*";
    marksToNextGrade = "Strong Cambridge IGCSE A* benchmark maintained";
  } else if (percentage >= cutoffs.a) {
    projectedGrade = "A";
    targetGrade = "A*";
    const gap = Math.max(1, cutoffs.aStar - percentage);
    marksToNextGrade = `+${Math.max(1, Math.ceil((gap / 100) * 8))} mark on 8-mark Discuss or +${Math.max(1, Math.ceil((gap / 100) * 30))} MCQs to reach A*`;
  } else if (percentage >= cutoffs.b) {
    projectedGrade = "B";
    targetGrade = "A";
    const gap = Math.max(1, cutoffs.a - percentage);
    marksToNextGrade = `+${Math.max(1, Math.ceil((gap / 100) * 8))} marks on two-sided evaluation to reach A`;
  } else if (percentage >= cutoffs.c) {
    projectedGrade = "C";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.b - percentage);
    marksToNextGrade = `+${Math.max(1, Math.ceil((gap / 100) * 8))} marks on developed analysis chains to reach B`;
  } else if (percentage >= cutoffs.d) {
    projectedGrade = "D";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.c - percentage);
    marksToNextGrade = `+${Math.max(1, Math.ceil((gap / 100) * 8))} marks on definitions & explanations to reach C`;
  } else if (percentage >= cutoffs.e) {
    projectedGrade = "E";
    targetGrade = "B";
    const gap = Math.max(1, cutoffs.d - percentage);
    marksToNextGrade = `+${Math.max(1, Math.ceil((gap / 100) * 8))} marks to reach Grade D`;
  } else if (percentage >= (cutoffs.f ?? 22)) {
    projectedGrade = "F";
    targetGrade = "B";
    marksToNextGrade = "Focus on accurate 2-mark definitions and 4-mark explain chains to reach E";
  } else if (percentage >= (cutoffs.g ?? 15)) {
    projectedGrade = "G";
    targetGrade = "B";
    marksToNextGrade = "Build core Unit 1–6 vocabulary and structured explanations to reach F";
  } else {
    projectedGrade = "U";
    targetGrade = "B";
    marksToNextGrade = "Practice foundational IGCSE 0455 definitions and Paper 1 MCQs";
  }

  return {
    projectedGrade,
    targetGrade,
    marksToNextGrade,
    seriesId: def.id,
    seriesLabel: def.label,
    isCustomSeries: def.id !== "all_average",
    cutoffs,
  };
}

export type CambridgeGradeStandard = {
  grade: string;
  letter: "A*" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "U";
  band: "Top Band" | "Upper Middle Band" | "Lower Middle Band" | "Bottom Band";
  percent: number;
  theme: {
    card: string;
    badge: string;
    progress: string;
  };
};

/**
 * Calibrates an IGCSE 0455 response mark (e.g. 7/8, 5/6, 4/4, 2/2) directly to
 * official Cambridge IGCSE Economics (0455) standards.
 */
export function getCambridgeGradeStandard(
  totalMark: number,
  maxMark: number,
  _seriesId?: string,
): CambridgeGradeStandard {
  const percent = maxMark > 0 ? (totalMark / maxMark) * 100 : 0;
  const roundedPercent = Math.round(percent);
  const ratio = maxMark > 0 ? totalMark / maxMark : 0;

  let band: CambridgeGradeStandard["band"];
  if (ratio >= 0.75) {
    band = "Top Band";
  } else if (ratio >= 0.5) {
    band = "Upper Middle Band";
  } else if (ratio >= 0.25) {
    band = "Lower Middle Band";
  } else {
    band = "Bottom Band";
  }

  if (totalMark <= 0) {
    return {
      grade: "Ungraded (0 Marks)",
      letter: "U",
      band: "Bottom Band",
      percent: roundedPercent,
      theme: {
        card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
        badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
        progress: "from-rose-500 via-red-400 to-rose-500",
      },
    };
  }

  // Grade A* Standard: >= 75% (e.g. 6-8/8, 5-6/6, 3-4/4, 2/2)
  if (percent >= 75) {
    return {
      grade: "Grade A* Standard",
      letter: "A*",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-background shadow-emerald-500/5",
        badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-semibold",
        progress: "from-emerald-500 via-teal-400 to-emerald-500",
      },
    };
  }

  // Grade A Standard: >= 65% (e.g. 5/8, 4/6)
  if (percent >= 65) {
    return {
      grade: "Grade A Standard",
      letter: "A",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-teal-900/10 to-background shadow-teal-500/5",
        badge: "border-teal-500/30 bg-teal-500/15 text-teal-400 font-semibold",
        progress: "from-teal-500 via-emerald-400 to-teal-500",
      },
    };
  }

  // Grade B Standard: >= 55%
  if (percent >= 55) {
    return {
      grade: "Grade B Standard",
      letter: "B",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-sky-900/10 to-background shadow-blue-500/5",
        badge: "border-blue-500/30 bg-blue-500/15 text-blue-400 font-semibold",
        progress: "from-blue-500 via-indigo-400 to-blue-500",
      },
    };
  }

  // Grade C Standard: >= 46% (e.g. 4/8, 3/6, 2/4, 1/2)
  if (percent >= 46) {
    return {
      grade: "Grade C Standard",
      letter: "C",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-sky-900/10 to-background shadow-cyan-500/5",
        badge: "border-cyan-500/30 bg-cyan-500/15 text-cyan-400 font-semibold",
        progress: "from-cyan-500 via-sky-400 to-cyan-500",
      },
    };
  }

  // Grade D Standard: >= 38% (e.g. 3/8)
  if (percent >= 38) {
    return {
      grade: "Grade D Standard",
      letter: "D",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-amber-900/10 to-background shadow-amber-500/5",
        badge: "border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold",
        progress: "from-amber-500 via-orange-400 to-amber-500",
      },
    };
  }

  // Grade E Standard: >= 30% (e.g. 2/6)
  if (percent >= 30) {
    return {
      grade: "Grade E Standard",
      letter: "E",
      band,
      percent: roundedPercent,
      theme: {
        card: "border-orange-500/40 bg-gradient-to-br from-orange-950/40 via-amber-900/10 to-background shadow-orange-500/5",
        badge: "border-orange-500/30 bg-orange-500/15 text-orange-400 font-semibold",
        progress: "from-orange-500 via-amber-400 to-orange-500",
      },
    };
  }

  return {
    grade: "Working Towards Standard",
    letter: percent >= 15 ? "F" : "U",
    band: "Bottom Band",
    percent: roundedPercent,
    theme: {
      card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
      badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
      progress: "from-rose-500 via-red-400 to-rose-500",
    },
  };
}

/** Formats the threshold guidance string for injecting into LLM system prompts. */
export function buildThresholdPromptInstruction(seriesId?: string): string {
  const normId = normalizeSeriesId(seriesId);
  const def = CAMBRIDGE_SERIES_THRESHOLDS[normId] || CAMBRIDGE_SERIES_THRESHOLDS.all_average;
  const t = def.igcse;

  return [
    `Calibrate according to official Cambridge IGCSE Economics (0455) grade thresholds (${def.label}):`,
    `- Full IGCSE 0455 (Paper 1 30% + Paper 2 70%): A* >= ${t.aStar}%, A >= ${t.a}%, B >= ${t.b}%, C >= ${t.c}%, D >= ${t.d}%, E >= ${t.e}%, U < ${t.g ?? 15}%.`,
    `Grade strictly against Cambridge IGCSE 0455 mark schemes (point marking for 2m/4m/6m and Table A Levels 1–3 for 8m Discuss).`,
  ].join("\n");
}
