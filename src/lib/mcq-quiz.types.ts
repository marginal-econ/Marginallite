export type QuizLetter = "A" | "B" | "C" | "D";
export type QuizLevel = "igcse" | "as" | "a2" | "legacy" | "2027" | string;
export type QuizSourceType = "library_paper" | "topical_paper" | "custom_questions";
export type QuizGameStatus = "lobby" | "in_progress" | "ended";
export type QuizGameMode = "live_race" | "exam_sprint";

export type CustomQuizQuestion = {
  number: number;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: QuizLetter;
  explanation?: string;
  topic?: string;
};

/** Public version sent to students while a quiz is active (correct answers stripped). */
export type PublicCustomQuizQuestion = Omit<CustomQuizQuestion, "correctAnswer" | "explanation"> & {
  correctAnswer?: QuizLetter;
  explanation?: string;
};

export type QuizAnswerRecord = {
  selected: QuizLetter;
  correct: boolean;
  correctAnswer?: QuizLetter;
  points: number;
  elapsedSeconds: number;
  answeredAt: string;
  explanation?: any | null;
};

export type QuizPowerUpType =
  | "steal"
  | "swap"
  | "tax"
  | "shield"
  | "multiplier_2x"
  | "fifty_fifty"
  | "freeze";

export type QuizPowerUp = {
  id: string;
  type: QuizPowerUpType;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
};

export type QuizGameEvent = {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  type: QuizPowerUpType;
  description: string;
  targetId?: string;
  targetName?: string;
  targetAvatar?: string;
  pointsDelta?: number;
  blocked?: boolean;
};

export type QuizPlayer = {
  id: string;
  userId?: string | null;
  name: string;
  avatar: string;
  score: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  currentQuestion: number;
  answers: Record<number, QuizAnswerRecord>;
  finished: boolean;
  finishedAt?: string | null;
  joinedAt: string;
  lastAnsweredAt?: string | null;
  // Power-up game extensions:
  inventory?: QuizPowerUp[];
  activeShield?: boolean;
  activeMultiplier?: number;
  frozenUntil?: number | null;
  persistedAttemptId?: string | null;
};

export type McqQuizMeta = {
  pin: string;
  title: string;
  hostUserId: string;
  hostName: string;
  sourceType: QuizSourceType;
  paperId: string | null;
  paperTitle: string;
  level: QuizLevel;
  qpUrl?: string | null;
  questionNumbers: number[];
  customQuestions?: CustomQuizQuestion[];
  gameMode: QuizGameMode;
  timeLimitSeconds: number | null;
  showInstantFeedback: boolean;
  showLiveLeaderboard: boolean;
  status: QuizGameStatus;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  recentEvents?: QuizGameEvent[];
};

export type PublicMcqQuizMeta = Omit<McqQuizMeta, "customQuestions"> & {
  customQuestions?: PublicCustomQuizQuestion[];
};

export type QuestionStatEntry = {
  attempted: number;
  correct: number;
  optionCounts: Record<QuizLetter, number>;
};

export type McqQuizPublicState = {
  meta: PublicMcqQuizMeta;
  players: QuizPlayer[];
  questionStats: Record<number, QuestionStatEntry>;
  isHost: boolean;
};

export type QuizScoreBreakdown = {
  points: number;
  base: number;
  speedBonus: number;
  streakBonus: number;
};

export const QUIZ_AVATARS = [
  { emoji: "🚀", label: "Rocket" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "🦁", label: "Lion" },
  { emoji: "🐼", label: "Panda" },
  { emoji: "🦉", label: "Owl" },
  { emoji: "🐉", label: "Dragon" },
  { emoji: "🦄", label: "Unicorn" },
  { emoji: "🐸", label: "Frog" },
  { emoji: "⚡", label: "Bolt" },
  { emoji: "🎯", label: "Bullseye" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "🧠", label: "Brain" },
  { emoji: "🔥", label: "Flame" },
  { emoji: "🐧", label: "Penguin" },
  { emoji: "🐙", label: "Octopus" },
] as const;

export function normalizeQuizPin(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 6);
}

export function formatQuizPin(pin: string): string {
  const clean = normalizeQuizPin(pin);
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return clean;
}

export const POWER_UP_CATALOG: Record<QuizPowerUpType, Omit<QuizPowerUp, "id">> = {
  steal: {
    type: "steal",
    title: "Capital Steal",
    description: "Seize 15% points from any rival or the 1st place leader!",
    icon: "🎯",
    badgeColor: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40",
  },
  swap: {
    type: "swap",
    title: "Score Redistribution",
    description: "Swap your entire point balance with another player!",
    icon: "🔄",
    badgeColor: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40",
  },
  tax: {
    type: "tax",
    title: "Pigouvian Tax",
    description: "Levy a 10% tax on the top 3 leaderboard players and pocket the rebate!",
    icon: "📉",
    badgeColor: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  shield: {
    type: "shield",
    title: "Central Bank Shield",
    description: "Immunity! Automatically blocks the next incoming hostile attack.",
    icon: "🛡️",
    badgeColor: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40",
  },
  multiplier_2x: {
    type: "multiplier_2x",
    title: "Productivity Surge (2x)",
    description: "Your next correct answer awards double points!",
    icon: "⚡",
    badgeColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  },
  fifty_fifty: {
    type: "fifty_fifty",
    title: "50/50 Market Clear",
    description: "Eliminates 2 incorrect options on the current question.",
    icon: "✂️",
    badgeColor: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40",
  },
  freeze: {
    type: "freeze",
    title: "Policy Shock Freeze",
    description: "Freeze a rival player's screen with a liquidity freeze for 5s!",
    icon: "🧊",
    badgeColor: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40",
  },
};

export function getRandomPowerUp(): QuizPowerUp {
  const types: QuizPowerUpType[] = [
    "steal",
    "swap",
    "tax",
    "shield",
    "multiplier_2x",
    "fifty_fifty",
    "freeze",
  ];
  const picked = types[Math.floor(Math.random() * types.length)];
  const proto = POWER_UP_CATALOG[picked];
  return {
    ...proto,
    id: `pw_${picked}_${Math.random().toString(36).slice(2, 9)}`,
  };
}

/**
 * Gamified Blooket/Quizizz point calculation:
 * - Correct answer earns 100 base points.
 * - Live Race mode adds up to +50 speed bonus (decays smoothly over 60 seconds)
 *   plus +20 per active consecutive streak (capped at 10x = +200).
 * - Exam Sprint mode prioritizes accuracy (100 base + modest +10 streak bonus).
 * - Multiplier doubles base and streak points.
 */
export function calculateQuizPoints(input: {
  isCorrect: boolean;
  elapsedSeconds: number;
  currentStreak: number;
  gameMode: QuizGameMode;
  multiplier?: number;
}): QuizScoreBreakdown {
  if (!input.isCorrect) {
    return { points: 0, base: 0, speedBonus: 0, streakBonus: 0 };
  }

  const mult = input.multiplier && input.multiplier > 1 ? input.multiplier : 1;
  const base = 100 * mult;
  const clampedSeconds = Math.max(0, Math.min(120, Number.isFinite(input.elapsedSeconds) ? input.elapsedSeconds : 30));
  const nextStreak = Math.max(0, input.currentStreak) + 1;

  if (input.gameMode === "exam_sprint") {
    const streakBonus = Math.min(nextStreak - 1, 10) * 10 * mult;
    return {
      points: base + streakBonus,
      base,
      speedBonus: 0,
      streakBonus,
    };
  }

  // Live Race mode (Quizizz/Blooket style)
  const speedRatio = Math.max(0, 1 - clampedSeconds / 60);
  const speedBonus = Math.round(50 * speedRatio) * mult;
  const streakBonus = Math.min(nextStreak - 1, 10) * 20 * mult;

  return {
    points: base + speedBonus + streakBonus,
    base,
    speedBonus,
    streakBonus,
  };
}

/** Deterministic leaderboard ranking: score desc -> correctCount desc -> finished first -> joined first. */
export function sortQuizLeaderboard(players: QuizPlayer[]): QuizPlayer[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finishedAt && b.finishedAt && a.finishedAt !== b.finishedAt) {
      return a.finishedAt < b.finishedAt ? -1 : 1;
    }
    return a.joinedAt < b.joinedAt ? -1 : 1;
  });
}

/** Builds live per-question accuracy & option distribution heatmap for the Host Dashboard. */
export function computeQuizQuestionStats(
  players: QuizPlayer[],
  questionNumbers: number[],
): Record<number, QuestionStatEntry> {
  const stats: Record<number, QuestionStatEntry> = {};
  for (const num of questionNumbers) {
    stats[num] = {
      attempted: 0,
      correct: 0,
      optionCounts: { A: 0, B: 0, C: 0, D: 0 },
    };
  }

  for (const player of players) {
    for (const [numStr, rec] of Object.entries(player.answers ?? {})) {
      const qNum = Number(numStr);
      if (!stats[qNum]) {
        stats[qNum] = {
          attempted: 0,
          correct: 0,
          optionCounts: { A: 0, B: 0, C: 0, D: 0 },
        };
      }
      stats[qNum].attempted += 1;
      if (rec.correct) stats[qNum].correct += 1;
      if (rec.selected && stats[qNum].optionCounts[rec.selected] !== undefined) {
        stats[qNum].optionCounts[rec.selected] += 1;
      }
    }
  }

  return stats;
}

/** Exports finished class results as clean CSV for a teacher's gradebook. */
export function buildQuizResultsCsv(meta: PublicMcqQuizMeta, players: QuizPlayer[]): string {
  const sorted = sortQuizLeaderboard(players);
  const totalQ = Math.max(1, meta.questionNumbers.length);
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const headers = [
    "Rank",
    "Student Name",
    "Score (pts)",
    "Correct",
    "Attempted",
    "Total Questions",
    "Accuracy (%)",
    "Best Streak",
    "Status",
  ];
  const rows = sorted.map((p, idx) => {
    const acc = p.answeredCount > 0 ? Math.round((p.correctCount / totalQ) * 100) : 0;
    return [
      idx + 1,
      p.name,
      p.score,
      p.correctCount,
      p.answeredCount,
      totalQ,
      `${acc}%`,
      p.bestStreak,
      p.finished ? "Finished" : "In Progress",
    ]
      .map(escape)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export type AdminQuizPlayerSummary = {
  id: string;
  userId?: string | null;
  name: string;
  avatar: string;
  score: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  finished: boolean;
};

export type AdminQuizRoomSummary = {
  pin: string;
  title: string;
  paperTitle: string;
  sourceType: QuizSourceType;
  paperId: string | null;
  level: QuizLevel;
  gameMode: QuizGameMode;
  status: QuizGameStatus;
  hostUserId: string;
  hostName: string;
  questionCount: number;
  playerCount: number;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  topScore?: number;
  topScorer?: string;
  players: AdminQuizPlayerSummary[];
};

export type AdminQuizAttemptSummary = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail?: string;
  title: string;
  paperId?: string | null;
  level?: string | null;
  score: number;
  total: number;
  percentage: number;
  completedAt: string | null;
  createdAt: string;
};

export type AdminQuizDashboardData = {
  totalRooms: number;
  activeRooms: number;
  totalPlayersConnected: number;
  totalCompletedAttempts: number;
  rooms: AdminQuizRoomSummary[];
  recentAttempts: AdminQuizAttemptSummary[];
};
