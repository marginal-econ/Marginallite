/**
 * Cognitive Error Archetype ("What Type of Mistake?") taxonomy & analytics
 * for Cambridge IGCSE 0455 Economics MCQ Question-by-Question Tutor Mode.
 *
 * Pure isomorphic module — safe to import on both client and server.
 */

export type McqMistakeType =
  | "concept_gap"
  | "distractor_trap"
  | "stem_misread"
  | "calculation_rush";

export type McqMistakeMeta = {
  id: McqMistakeType;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  coachingAction: string;
  badgeClassName: string;
  cardActiveClassName: string;
  barClassName: string;
};

export const MCQ_MISTAKE_TYPES: McqMistakeMeta[] = [
  {
    id: "concept_gap",
    label: "Concept Gap",
    shortLabel: "Concept",
    tagline: "Didn't know the rule, formula, or definition",
    description:
      "You were unsure of the underlying syllabus theory, economic diagram relationship, or equation.",
    coachingAction:
      "Lock in the Golden Rule below before moving on, then review this syllabus unit's core definitions and diagrams.",
    badgeClassName:
      "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    cardActiveClassName:
      "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/25 text-violet-950 dark:text-violet-100",
    barClassName: "bg-violet-500",
  },
  {
    id: "distractor_trap",
    label: "Distractor Trap",
    shortLabel: "Trap",
    tagline: "Knew the topic, fell for an examiner trick",
    description:
      "You understood the concept but were pulled toward a plausible decoy (e.g., shift vs movement, short-run vs long-run).",
    coachingAction:
      "Study why your chosen option was an intentional Cambridge decoy. Next time, eliminate 2 wrong options before committing.",
    badgeClassName:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    cardActiveClassName:
      "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 text-amber-950 dark:text-amber-100",
    barClassName: "bg-amber-500",
  },
  {
    id: "stem_misread",
    label: "Stem Misread",
    shortLabel: "Misread",
    tagline: "Missed NOT, EXCEPT, ceteris paribus, or axis labels",
    description:
      "You misread a qualifier in the stem, inverted the X/Y axes on a graph, or skipped a key row in a data table.",
    coachingAction:
      "Use the Annotate pen to circle negative qualifiers (NOT/EXCEPT) and axis labels before looking at options A–D.",
    badgeClassName:
      "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    cardActiveClassName:
      "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/25 text-sky-950 dark:text-sky-100",
    barClassName: "bg-sky-500",
  },
  {
    id: "calculation_rush",
    label: "Calculation / Rush",
    shortLabel: "Calc / Rush",
    tagline: "Arithmetic slip, ratio inversion, or rushed guess",
    description:
      "You made a sign or percentage-change math slip, inverted a formula, or clicked quickly without double-checking.",
    coachingAction:
      "Press Alt+C to open the built-in Cambridge Calculator & elasticity solvers instead of doing mental percentages under pressure.",
    badgeClassName:
      "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    cardActiveClassName:
      "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/25 text-rose-950 dark:text-rose-100",
    barClassName: "bg-rose-500",
  },
];

export const MCQ_MISTAKE_META_MAP: Record<McqMistakeType, McqMistakeMeta> = {
  concept_gap: MCQ_MISTAKE_TYPES[0],
  distractor_trap: MCQ_MISTAKE_TYPES[1],
  stem_misread: MCQ_MISTAKE_TYPES[2],
  calculation_rush: MCQ_MISTAKE_TYPES[3],
};

export function isMcqMistakeType(value: unknown): value is McqMistakeType {
  return (
    value === "concept_gap" ||
    value === "distractor_trap" ||
    value === "stem_misread" ||
    value === "calculation_rush"
  );
}

export type MistakeBucket = {
  meta: McqMistakeMeta;
  count: number;
  pct: number;
  questionNumbers: number[];
};

export type MistakePathologySummary = {
  totalWrong: number;
  totalTagged: number;
  untaggedCount: number;
  buckets: MistakeBucket[];
  dominant: MistakeBucket | null;
  recommendation: string;
};

/**
 * Aggregates tagged mistake archetypes across wrong questions to produce
 * an actionable cognitive pathology summary and examiner recommendation.
 */
export function buildMistakePathologySummary(
  mistakeTypes: Record<number, McqMistakeType | null | undefined>,
  wrongNumbers: number[],
): MistakePathologySummary {
  const wrongSet = new Set(wrongNumbers);
  const grouped: Record<McqMistakeType, number[]> = {
    concept_gap: [],
    distractor_trap: [],
    stem_misread: [],
    calculation_rush: [],
  };

  let totalTagged = 0;
  for (const num of wrongSet) {
    const t = mistakeTypes[num];
    if (isMcqMistakeType(t)) {
      grouped[t].push(num);
      totalTagged += 1;
    }
  }

  // Also include any tagged entries if wrongNumbers wasn't passed explicitly
  if (wrongSet.size === 0) {
    for (const [k, t] of Object.entries(mistakeTypes)) {
      const num = Number(k);
      if (Number.isFinite(num) && isMcqMistakeType(t)) {
        grouped[t].push(num);
        totalTagged += 1;
      }
    }
  }

  const totalWrong = wrongSet.size > 0 ? wrongSet.size : totalTagged;
  const untaggedCount = Math.max(0, totalWrong - totalTagged);
  const denom = Math.max(1, totalTagged);

  const buckets: MistakeBucket[] = MCQ_MISTAKE_TYPES.map((meta) => {
    const nums = grouped[meta.id].sort((a, b) => a - b);
    return {
      meta,
      count: nums.length,
      pct: totalTagged > 0 ? Math.round((nums.length / denom) * 100) : 0,
      questionNumbers: nums,
    };
  }).sort((a, b) => b.count - a.count);

  const dominant = buckets[0] && buckets[0].count > 0 ? buckets[0] : null;

  let recommendation =
    "Tag what tripped you up on wrong questions to uncover your exact cognitive blind spots.";
  if (totalWrong === 0) {
    recommendation =
      "Zero mistakes recorded — outstanding precision across every question in this set.";
  } else if (dominant) {
    switch (dominant.meta.id) {
      case "concept_gap":
        recommendation = `Your primary mark leak is Concept Gaps (${dominant.pct}% of diagnosed errors). Focus on locking down the core definitions, curves, and formulas in your weakest syllabus units before grinding more timed papers.`;
        break;
      case "distractor_trap":
        recommendation = `Your economic knowledge is stronger than your raw score suggests — ${dominant.pct}% of your mistakes came from Cambridge Distractor Traps. Practice actively crossing out 2 wrong options before selecting your answer.`;
        break;
      case "stem_misread":
        recommendation = `${dominant.pct}% of your lost marks were preventable Stem Misreads (qualifiers, axes, or table units). Slow down for 5 seconds on every stem and underline words like NOT, EXCEPT, or short-run/long-run.`;
        break;
      case "calculation_rush":
        recommendation = `${dominant.pct}% of your errors came from Calculation Slips or Rushing. Use the built-in Cambridge Calculator (Alt+C) to double-check elasticity, multiplier, and percentage-change figures.`;
        break;
    }
  }

  return {
    totalWrong,
    totalTagged,
    untaggedCount,
    buckets,
    dominant,
    recommendation,
  };
}
