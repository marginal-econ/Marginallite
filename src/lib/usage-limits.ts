/**
 * Shared (client + server safe) constants and helpers for subscription tiers,
 * credits, and usage limits.
 *
 * Tier Rules:
 * - Free: Up to 2 graded essays alone. MCQ past papers free for 30 days. Live Examiner is PAID ONLY (0 credits).
 * - Foundation: 8 graded essays / month, 2 Live Examiner credits, full syllabus access.
 * - Scholar Plus: 15 graded essays / month, 4 Live Examiner credits, enhanced drills.
 * - Pro: 25 graded essays / month, 8 Live Examiner credits, arbitration & models.
 * - Mastery: 50 graded essays / month, 14 Live Examiner credits, OCR handwriting.
 * - Elite: 75 graded essays / month, 22 Live Examiner credits, priority queue.
 */

export const DAILY_LIMIT_PREFIX = "Daily limit reached";
export const TIER_LIMIT_PREFIX = "Plan limit reached";

export const FREE_TIER_ESSAY_LIMIT = 999999;
export const FREE_TEACHER_ESSAY_LIMIT = 999999;
export const MCQ_FREE_TRIAL_DAYS = 999999;

export const LIVE_EXAMINER_DAILY_LIMIT = 0;
export const LIMIT_RESET_NOTE = "Marginalite is currently in 100% Free Community Edition.";

export const TIER_LIMITS = {
  free: {
    name: "Free Community Edition",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 999999,
    liveExaminerCredits: 0,
    liveExaminerEnabled: false,
    mcqFreeDays: 999999,
  },
  foundation: {
    name: "Foundation Scholar",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 8,
    liveExaminerCredits: 2,
    liveExaminerEnabled: true,
    mcqFreeDays: 365,
  },
  scholar_plus: {
    name: "Scholar Plus",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 15,
    liveExaminerCredits: 4,
    liveExaminerEnabled: true,
    mcqFreeDays: 365,
  },
  pro: {
    name: "Pro Accelerator",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 25,
    liveExaminerCredits: 8,
    liveExaminerEnabled: true,
    mcqFreeDays: 365,
  },
  mastery: {
    name: "A* Mastery Sprint",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 50,
    liveExaminerCredits: 14,
    liveExaminerEnabled: true,
    mcqFreeDays: 365,
  },
  elite: {
    name: "Cambridge Elite Pass",
    maxEssaysTotal: Infinity,
    maxEssaysPerMonth: 75,
    liveExaminerCredits: 22,
    liveExaminerEnabled: true,
    mcqFreeDays: 365,
  },
} as const;

export type PlanTier = keyof typeof TIER_LIMITS;

export interface UserSubscriptionDetails {
  tier: PlanTier;
  tierName: string;
  isPaid: boolean;
  isAdmin: boolean;
  isTeacher?: boolean;
  essaysGradedCount: number;
  essaysLimit: number;
  essaysRemaining: number;
  canGradeEssay: boolean;
  liveExaminerCredits: number;
  canUseLiveExaminer: boolean;
  mcqFreeDaysRemaining: number;
  canUseMCQ: boolean;
}

export function essayLimitMessage(limit: number): string {
  return `${DAILY_LIMIT_PREFIX}: you can have up to ${limit} essay${
    limit === 1 ? "" : "s"
  } graded per day and today's ${limit === 1 ? "one is" : `${limit} are`} used up. ${LIMIT_RESET_NOTE}`;
}

export const FREE_ESSAY_LIMIT_MESSAGE =
  `${TIER_LIMIT_PREFIX}: You have used your 2 free Cambridge essay gradings on the Free Tier. ` +
  `Upgrade to Foundation Scholar (₹99/mo), Scholar Plus (₹199/mo), Pro (₹399/mo), or Mastery to continue grading essays with line-by-line mark scheme matching.`;

export const TEACHER_FREE_ESSAY_LIMIT_MESSAGE =
  `${TIER_LIMIT_PREFIX}: You have used your 3 free trial essay evaluations for educators. ` +
  `Upgrade to an Educator AI Pass (from ₹99/mo) or School Department License to continue grading personal essays. Student classroom submissions can still be reviewed anytime.`;

export const TEACHER_SCHOOL_LICENSE_REQUIRED_MESSAGE =
  "Teacher accounts require an active Educator AI Pass (from ₹99/mo) or School Department License to use the AI Essay Grader. Student submissions to your classrooms are covered under student quotas.";

export const TEACHER_LIVE_EXAMINER_REQUIRED_MESSAGE =
  "Teacher accounts require an active Educator AI Pass (from ₹99/mo) or School Department License to use the Live Examiner. To demonstrate or test Live Examiner, please activate an Educator Pass or School License.";

export const LIVE_EXAMINER_PAID_ONLY_MESSAGE =
  `Live Examiner is a premium feature available on paid plans. ` +
  `Upgrade your plan to unlock Live Examiner credits, real-time Cambridge keystroke coaching, and examiner next-move guidance.`;

export const LIVE_EXAMINER_NO_CREDITS_MESSAGE =
  `You have exhausted your Live Examiner credits for this cycle. ` +
  `Upgrade your plan or purchase an add-on pack to continue real-time AI coaching. In-browser economics terminology checks remain free.`;

export const LIVE_EXAMINER_LIMIT_MESSAGE = `${DAILY_LIMIT_PREFIX}: you can start 1 Live Examiner question session per day on your current plan, and today's session is already active for another question. You can continue typing on your active question with unlimited checks today, or upgrade for multi-session access. ${LIMIT_RESET_NOTE}`;

export function isDailyLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    message.startsWith(DAILY_LIMIT_PREFIX) ||
    message.startsWith(TIER_LIMIT_PREFIX) ||
    message.includes("Live Examiner is a premium feature") ||
    message.includes("exhausted your Live Examiner credits") ||
    message.includes("School Department License") ||
    message.includes("Educator AI Pass")
  );
}

/**
 * Session duration caps for deep AI Cambridge Examiner coaching (in minutes).
 */
export const LIVE_EXAMINER_DURATION_MINUTES = {
  free: 0,
  foundation: 25, // 25 min timed drill
  scholar_plus: 30, // 30 min timed drill
  pro: 35,        // 35 min timed drill
  mastery: 40,    // 40 min extended revision
  elite: 45,      // 45 min official Cambridge exam essay timing
} as const;

export type SubscriptionTier = keyof typeof LIVE_EXAMINER_DURATION_MINUTES;

export const DEFAULT_LIVE_EXAMINER_DURATION_MINUTES = LIVE_EXAMINER_DURATION_MINUTES.pro;
