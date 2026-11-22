/**
 * Marginal Live Examiner — Semantic Colour-Coding System.
 *
 * Provides consistent, accessible, high-contrast visual tokens and utility
 * helpers for all examination elements across the Live Examiner.
 *
 * Supported Elements:
 * - Examiner questions
 * - Student responses
 * - Positive feedback / creditworthy AO hits
 * - Corrections (grammar, mechanics)
 * - Incorrect reasoning / economic misconceptions
 * - Key academic concepts & terminology
 * - Socratic hints & prompts
 * - Pedagogical explanations & evidence
 * - Assessment & progress indicators
 * - Critical warnings
 */

export type ExaminerSemanticElement =
  | "examiner_question"
  | "student_response"
  | "positive_feedback"
  | "correction"
  | "incorrect_reasoning"
  | "academic_concept"
  | "hint"
  | "explanation"
  | "assessment_indicator"
  | "warning";

export type SemanticThemeSpec = {
  key: ExaminerSemanticElement;
  label: string;
  shortLabel: string;
  description: string;
  cardClass: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
  borderClass: string;
  inlineMarkClass: string;
  ariaRole: string;
};

export const LIVE_EXAMINER_PALETTE: Record<ExaminerSemanticElement, SemanticThemeSpec> = {
  examiner_question: {
    key: "examiner_question",
    label: "Examiner Question & Prompt",
    shortLabel: "Question",
    description:
      "Syllabus-aligned essay prompt or adaptive follow-up question set by the examiner.",
    cardClass: "border-plum/30 bg-plum/5 dark:border-primary/40 dark:bg-primary/10",
    badgeClass:
      "border-plum/40 bg-plum/15 text-plum dark:text-primary-foreground dark:bg-primary/20",
    dotClass: "bg-plum dark:bg-primary",
    textClass: "text-plum dark:text-primary",
    borderClass: "border-plum/35 dark:border-primary/40",
    inlineMarkClass: "decoration-plum underline underline-offset-4 font-semibold",
    ariaRole: "region",
  },
  student_response: {
    key: "student_response",
    label: "Student Response",
    shortLabel: "Your Response",
    description: "Your written answer, structured into paragraphs and arguments.",
    cardClass: "border-border bg-card shadow-sm",
    badgeClass: "border-border bg-muted text-foreground",
    dotClass: "bg-foreground/70",
    textClass: "text-foreground",
    borderClass: "border-border",
    inlineMarkClass: "text-foreground",
    ariaRole: "article",
  },
  positive_feedback: {
    key: "positive_feedback",
    label: "Positive Feedback (Creditworthy)",
    shortLabel: "AO Credit",
    description:
      "Credit-earning phrasing that satisfies Cambridge AO1, AO2, or AO3 marking criteria.",
    cardClass:
      "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/40 dark:bg-emerald-500/10",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500/35 dark:border-emerald-400/40",
    inlineMarkClass:
      "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 decoration-emerald-500 underline decoration-2 underline-offset-2",
    ariaRole: "status",
  },
  correction: {
    key: "correction",
    label: "Mechanical Correction",
    shortLabel: "Correction",
    description:
      "Mechanical syntax, spelling, punctuation, or clarity issues requiring minor edit.",
    cardClass: "border-rose-500/30 bg-rose-500/5 dark:border-rose-400/40 dark:bg-rose-500/10",
    badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    dotClass: "bg-rose-500 dark:bg-rose-400",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-500/35 dark:border-rose-400/40",
    inlineMarkClass: "decoration-rose-500/80 decoration-wavy underline underline-offset-2",
    ariaRole: "alert",
  },
  incorrect_reasoning: {
    key: "incorrect_reasoning",
    label: "Economic Misconception",
    shortLabel: "Misconception",
    description:
      "Flawed economic theory, invalid causal chain, or contradiction of syllabus principles.",
    cardClass: "border-red-600/35 bg-red-500/10 dark:border-red-400/50 dark:bg-red-500/15",
    badgeClass: "border-red-600/50 bg-red-600/20 text-red-700 dark:text-red-300 font-semibold",
    dotClass: "bg-red-600 dark:bg-red-400",
    textClass: "text-red-700 dark:text-red-300 font-medium",
    borderClass: "border-red-600/40 dark:border-red-400/50",
    inlineMarkClass:
      "bg-red-500/20 text-red-950 dark:text-red-100 decoration-red-600 decoration-double underline decoration-2 underline-offset-2 font-medium",
    ariaRole: "alert",
  },
  academic_concept: {
    key: "academic_concept",
    label: "Key Academic Concept",
    shortLabel: "Concept / Term",
    description: "Accurate use of syllabus terms, theoretical models, or economics definitions.",
    cardClass: "border-blue-500/30 bg-blue-500/5 dark:border-blue-400/40 dark:bg-blue-500/10",
    badgeClass: "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/35 dark:border-blue-400/40",
    inlineMarkClass:
      "bg-blue-500/15 text-blue-950 dark:text-blue-100 decoration-blue-500 underline decoration-2 underline-offset-2",
    ariaRole: "status",
  },
  hint: {
    key: "hint",
    label: "Socratic Hint & Scaffold",
    shortLabel: "Examiner Hint",
    description:
      "Guided questioning or prompt to nudge analysis forward without giving away the answer.",
    cardClass: "border-cyan-500/30 bg-cyan-500/5 dark:border-cyan-400/40 dark:bg-cyan-500/10",
    badgeClass: "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    dotClass: "bg-cyan-500 dark:bg-cyan-400",
    textClass: "text-cyan-700 dark:text-cyan-300",
    borderClass: "border-cyan-500/35 dark:border-cyan-400/40",
    inlineMarkClass: "decoration-cyan-500/70 decoration-dotted underline underline-offset-2",
    ariaRole: "note",
  },
  explanation: {
    key: "explanation",
    label: "Pedagogical Explanation",
    shortLabel: "Explanation",
    description:
      "Deep explanation of the underlying Cambridge economic rationale and mark scheme evidence.",
    cardClass: "border-border bg-muted/40 dark:bg-muted/20",
    badgeClass: "border-border bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
    borderClass: "border-border",
    inlineMarkClass: "decoration-muted-foreground/60 underline underline-offset-2",
    ariaRole: "note",
  },
  assessment_indicator: {
    key: "assessment_indicator",
    label: "Assessment & Progress",
    shortLabel: "Indicator",
    description:
      "Estimated running mark, assessment objective weight, and examiner confidence score.",
    cardClass: "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10",
    badgeClass: "border-primary/40 bg-primary/15 text-primary",
    dotClass: "bg-primary",
    textClass: "text-primary font-medium",
    borderClass: "border-primary/35 dark:border-primary/40",
    inlineMarkClass: "font-semibold text-primary",
    ariaRole: "status",
  },
  warning: {
    key: "warning",
    label: "Examiner Warning",
    shortLabel: "Warning",
    description:
      "Missing required assessment objective, broken causal chain, or unbalanced evaluation.",
    cardClass: "border-amber-500/35 bg-amber-500/10 dark:border-amber-400/45 dark:bg-amber-500/15",
    badgeClass: "border-amber-500/45 bg-amber-500/20 text-amber-800 dark:text-amber-300",
    dotClass: "bg-amber-500 dark:bg-amber-400",
    textClass: "text-amber-800 dark:text-amber-300 font-medium",
    borderClass: "border-amber-500/40 dark:border-amber-400/45",
    inlineMarkClass:
      "bg-amber-500/15 text-amber-950 dark:text-amber-100 decoration-amber-500 underline decoration-2 underline-offset-2",
    ariaRole: "alert",
  },
};

/**
 * Maps an issue category to its semantic element spec.
 */
export function mapCategoryToSemanticElement(
  category: string,
  severity?: "low" | "medium" | "high",
): SemanticThemeSpec {
  switch (category) {
    case "grammar":
    case "clarity":
      return LIVE_EXAMINER_PALETTE.correction;
    case "misconception":
    case "reasoning_chain":
      return severity === "high"
        ? LIVE_EXAMINER_PALETTE.incorrect_reasoning
        : LIVE_EXAMINER_PALETTE.warning;
    case "economics_accuracy":
      return LIVE_EXAMINER_PALETTE.incorrect_reasoning;
    case "terminology":
      return LIVE_EXAMINER_PALETTE.academic_concept;
    case "analysis":
    case "application":
      return severity === "high" ? LIVE_EXAMINER_PALETTE.warning : LIVE_EXAMINER_PALETTE.hint;
    case "evaluation":
      return LIVE_EXAMINER_PALETTE.warning;
    default:
      return LIVE_EXAMINER_PALETTE.explanation;
  }
}

/**
 * Returns the assessment objective spec for AO1, AO2, AO3.
 */
export const AO_COLOUR_SYSTEM = {
  AO1: {
    code: "AO1",
    label: "Knowledge & Understanding",
    short: "Knowledge",
    dot: "bg-ao1",
    text: "text-ao1",
    badge: "border-ao1/40 bg-ao1/10 text-ao1",
    mark: "bg-ao1/15 decoration-ao1 underline decoration-2 underline-offset-2",
  },
  AO2: {
    code: "AO2",
    label: "Analysis & Application",
    short: "Analysis",
    dot: "bg-ao2",
    text: "text-ao2",
    badge: "border-ao2/40 bg-ao2/10 text-ao2",
    mark: "bg-ao2/15 decoration-ao2 underline decoration-2 underline-offset-2",
  },
  AO3: {
    code: "AO3",
    label: "Evaluation & Judgement",
    short: "Evaluation",
    dot: "bg-ao3",
    text: "text-ao3",
    badge: "border-ao3/40 bg-ao3/10 text-ao3",
    mark: "bg-ao3/15 decoration-ao3 underline decoration-2 underline-offset-2",
  },
} as const;
