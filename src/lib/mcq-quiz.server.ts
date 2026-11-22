import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { getStoredPaperExplanationsServer, type McqExplanationResult } from "@/lib/mcq/mcq-pdf.server";
import { classifyMcqQuestion } from "./mcq-domain";
import { getTopicalPaperById } from "@/lib/topical-mcq-papers";
import {
  calculateQuizPoints,
  computeQuizQuestionStats,
  getRandomPowerUp,
  normalizeQuizPin,
  sortQuizLeaderboard,
  type CustomQuizQuestion,
  type McqQuizMeta,
  type McqQuizPublicState,
  type PublicCustomQuizQuestion,
  type PublicMcqQuizMeta,
  type QuizGameEvent,
  type QuizGameMode,
  type QuizLetter,
  type QuizLevel,
  type QuizPlayer,
  type QuizPowerUp,
  type QuizSourceType,
  type AdminQuizDashboardData,
  type AdminQuizRoomSummary,
  type AdminQuizAttemptSummary,
} from "./mcq-quiz.types";

const META_PREFIX = "__MCQ_QUIZ_META_";
const PLAYER_PREFIX = "__MCQ_QUIZ_PLAYER_";

function metaKey(pin: string) {
  return `${META_PREFIX}${pin}`;
}

function playerPrefix(pin: string) {
  return `${PLAYER_PREFIX}${pin}_`;
}

function playerKey(pin: string, playerId: string) {
  return `${PLAYER_PREFIX}${pin}_${playerId}`;
}

const QUIZ_STORE = {
  async get<T>(term: string): Promise<T | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .maybeSingle();
      if (error || !data?.definition_text) return null;
      return JSON.parse(data.definition_text) as T;
    } catch {
      return null;
    }
  },

  async list<T>(prefix: string): Promise<T[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .like("term", `${prefix}%`)
        .limit(500);
      if (error || !data) return [];
      const items: T[] = [];
      for (const row of data) {
        if (!row.definition_text) continue;
        try {
          items.push(JSON.parse(row.definition_text) as T);
        } catch {
          // ignore malformed row
        }
      }
      return items;
    } catch {
      return [];
    }
  },

  async set<T>(term: string, value: T): Promise<void> {
    const text = JSON.stringify(value);
    const { data: existing } = await supabaseAdmin
      .from("definitions")
      .select("id")
      .eq("term", term)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Quiz storage update failed: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin.from("definitions").insert({
        term,
        definition_text: text,
        category: "system_config",
      });
      if (error) throw new Error(`Quiz storage write failed: ${error.message}`);
    }
  },

  async remove(term: string): Promise<void> {
    await supabaseAdmin.from("definitions").delete().eq("term", term);
  },

  async removePrefix(prefix: string): Promise<void> {
    await supabaseAdmin.from("definitions").delete().like("term", `${prefix}%`);
  },
};

/** Generate a random 6-digit PIN without colliding with an existing live quiz. */
async function generateUniquePin(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
    if (!existing) return pin;
  }
  return String(Date.now()).slice(-6);
}

function sanitizeMetaForViewer(meta: McqQuizMeta, isHost: boolean): PublicMcqQuizMeta {
  if (!meta.customQuestions) {
    return meta;
  }
  const revealAnswers = isHost || meta.status === "ended";
  const safeQuestions: PublicCustomQuizQuestion[] = meta.customQuestions.map((q) =>
    revealAnswers
      ? q
      : {
          number: q.number,
          stem: q.stem,
          options: q.options,
          topic: q.topic,
        },
  );
  return {
    ...meta,
    customQuestions: safeQuestions,
  };
}

function isHostAuthorized(
  meta: McqQuizMeta,
  user: { userId: string; email?: string; claims?: Record<string, unknown> },
): boolean {
  if (meta.hostUserId === user.userId) return true;
  return isMarginalAdmin({ userId: user.userId, email: user.email, claims: user.claims });
}

export type CreateMcqQuizInput = {
  title?: string;
  sourceType: QuizSourceType;
  paperId?: string | null;
  level?: QuizLevel;
  questionStart?: number;
  questionEnd?: number;
  customQuestions?: Omit<CustomQuizQuestion, "number">[];
  gameMode: QuizGameMode;
  timeLimitSeconds?: number | null;
  showInstantFeedback?: boolean;
  showLiveLeaderboard?: boolean;
};

export async function createMcqQuizServer(
  input: CreateMcqQuizInput,
  host: { userId: string; hostName: string },
): Promise<{ pin: string; meta: McqQuizMeta }> {
  let paperId: string | null = null;
  let paperTitle = input.title?.trim() || "Cambridge IGCSE 0455 Live Quiz";
  let level: QuizLevel = input.level ?? "igcse";
  let qpUrl: string | null = null;
  let questionNumbers: number[] = [];
  let customQuestions: CustomQuizQuestion[] | undefined;

  if (input.sourceType === "library_paper") {
    if (!input.paperId) throw new Error("Please select a past paper.");
    const { data: paper, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select("id, title, level, question_count, qp_url, answer_key")
      .eq("id", input.paperId)
      .maybeSingle();

    if (error || !paper) {
      throw new Error("That past paper could not be found in the library.");
    }
    paperId = paper.id;
    paperTitle = paper.title;
    level = (paper.level as QuizLevel) || "igcse";
    qpUrl = paper.qp_url;

    const total = Math.max(1, paper.question_count || 30);
    const start = Math.max(1, Math.min(total, input.questionStart ?? 1));
    const end = Math.max(start, Math.min(total, input.questionEnd ?? total));
    questionNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else if (input.sourceType === "topical_paper") {
    if (!input.paperId) throw new Error("Please select a topical past paper.");
    const topical = getTopicalPaperById(input.paperId);
    if (!topical) {
      throw new Error("That topical paper could not be found.");
    }
    paperId = topical.id;
    paperTitle = topical.title;
    level = topical.level;
    qpUrl = null;

    const total = Math.max(1, topical.questionCount || topical.questions.length);
    const start = Math.max(1, Math.min(total, input.questionStart ?? 1));
    const end = Math.max(start, Math.min(total, input.questionEnd ?? total));
    questionNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else {
    const rawQs = input.customQuestions ?? [];
    if (rawQs.length === 0) {
      throw new Error("Add at least 1 question to create a custom MCQ quiz.");
    }
    customQuestions = rawQs.map((q, idx) => ({
      number: idx + 1,
      stem: q.stem.trim(),
      options: {
        A: q.options.A.trim(),
        B: q.options.B.trim(),
        C: q.options.C.trim(),
        D: q.options.D.trim(),
      },
      correctAnswer: q.correctAnswer,
      explanation: q.explanation?.trim() || undefined,
      topic: q.topic?.trim() || undefined,
    }));
    questionNumbers = customQuestions.map((q) => q.number);
    paperTitle = input.title?.trim() || `Custom MCQ Paper (${customQuestions.length} Questions)`;
  }

  const pin = await generateUniquePin();
  const meta: McqQuizMeta = {
    pin,
    title: input.title?.trim() || paperTitle,
    hostUserId: host.userId,
    hostName: host.hostName || "Teacher",
    sourceType: input.sourceType,
    paperId,
    paperTitle,
    level,
    qpUrl,
    questionNumbers,
    customQuestions,
    gameMode: input.gameMode,
    timeLimitSeconds: input.timeLimitSeconds && input.timeLimitSeconds > 0 ? input.timeLimitSeconds : null,
    showInstantFeedback: input.showInstantFeedback ?? true,
    showLiveLeaderboard: input.showLiveLeaderboard ?? true,
    status: "lobby",
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
  };

  await QUIZ_STORE.set(metaKey(pin), meta);
  return { pin, meta };
}

export async function getMcqQuizStateServer(
  rawPin: string,
  viewer?: { userId?: string | null; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState | null> {
  const pin = normalizeQuizPin(rawPin);
  if (pin.length !== 6) return null;

  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) return null;

  const rawPlayers = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin));
  const players = sortQuizLeaderboard(rawPlayers);
  const questionStats = computeQuizQuestionStats(players, meta.questionNumbers);

  const isHost = Boolean(
    viewer?.userId &&
      isHostAuthorized(meta, {
        userId: viewer.userId,
        email: viewer.email,
        claims: viewer.claims,
      }),
  );

  return {
    meta: sanitizeMetaForViewer(meta, isHost),
    players,
    questionStats,
    isHost,
  };
}

export async function joinMcqQuizServer(input: {
  pin: string;
  playerId?: string | null;
  userId?: string | null;
  name: string;
  avatar: string;
}): Promise<{ player: QuizPlayer; state: McqQuizPublicState }> {
  const pin = normalizeQuizPin(input.pin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) {
    throw new Error("No live quiz found with that PIN. Double-check the 6-digit code.");
  }
  if (meta.status === "ended") {
    throw new Error("This live quiz has already ended.");
  }

  const cleanName = input.name.trim().slice(0, 32);
  if (!cleanName) {
    throw new Error("Enter a nickname to join the quiz.");
  }

  if (!input.userId) {
    throw new Error("You must sign in or create an account to join a live quiz.");
  }

  // Re-use playerId if reconnecting (or userId-based deterministic id when signed in)
  const resolvedPlayerId = input.playerId?.trim() || `u_${input.userId}`;

  const existing = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, resolvedPlayerId));
  const now = new Date().toISOString();

  const player: QuizPlayer = existing
    ? {
        ...existing,
        name: cleanName,
        avatar: input.avatar || existing.avatar,
        inventory: Array.isArray(existing.inventory) ? existing.inventory : [],
        activeShield: Boolean(existing.activeShield),
        activeMultiplier: existing.activeMultiplier || 1,
        frozenUntil: existing.frozenUntil ?? null,
      }
    : {
        id: resolvedPlayerId,
        userId: input.userId ?? null,
        name: cleanName,
        avatar: input.avatar || "🚀",
        score: 0,
        answeredCount: 0,
        correctCount: 0,
        currentStreak: 0,
        bestStreak: 0,
        currentQuestion: meta.questionNumbers[0] ?? 1,
        answers: {},
        finished: false,
        finishedAt: null,
        joinedAt: now,
        lastAnsweredAt: null,
        inventory: [],
        activeShield: false,
        activeMultiplier: 1,
        frozenUntil: null,
      };

  await QUIZ_STORE.set(playerKey(pin, resolvedPlayerId), player);

  const state = await getMcqQuizStateServer(pin, { userId: input.userId });
  if (!state) throw new Error("Failed to load live quiz session.");
  return { player, state };
}

export async function kickQuizPlayerServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
  playerId: string,
): Promise<{ ok: true }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can remove players.");
  }
  await QUIZ_STORE.remove(playerKey(pin, playerId));
  return { ok: true };
}

export async function startMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can start this quiz.");
  }

  const updated: McqQuizMeta = {
    ...meta,
    status: "in_progress",
    startedAt: meta.startedAt ?? new Date().toISOString(),
  };
  await QUIZ_STORE.set(metaKey(pin), updated);

  const state = await getMcqQuizStateServer(pin, host);
  if (!state) throw new Error("Failed to reload quiz state.");
  return state;
}

export async function endMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can end this quiz.");
  }

  const updated: McqQuizMeta = {
    ...meta,
    status: "ended",
    endedAt: new Date().toISOString(),
  };
  await QUIZ_STORE.set(metaKey(pin), updated);

  const state = await getMcqQuizStateServer(pin, host);
  if (!state) throw new Error("Failed to reload quiz state.");
  return state;
}

export async function resolveCorrectAnswerForQuestion(
  meta: McqQuizMeta,
  questionNumber: number,
): Promise<{
  correctAnswer: QuizLetter | null;
  storedExplanation?: McqExplanationResult | null;
}> {
  if (meta.sourceType === "custom_questions") {
    const q = meta.customQuestions?.find((item) => item.number === questionNumber);
    return {
      correctAnswer: q?.correctAnswer ?? null,
      storedExplanation: q?.explanation ? { text: q.explanation } : null,
    };
  }

  if (meta.sourceType === "topical_paper" && meta.paperId) {
    const topical = getTopicalPaperById(meta.paperId);
    const key = topical?.answerKey?.[String(questionNumber)] ?? null;
    let storedExplanation: McqExplanationResult | null = null;
    if (meta.showInstantFeedback) {
      try {
        const stored = await getStoredPaperExplanationsServer(meta.paperId);
        storedExplanation = stored[questionNumber] ?? null;
      } catch {
        // ignore optional lookup error
      }
    }
    return { correctAnswer: (key as QuizLetter) ?? null, storedExplanation };
  }

  if (meta.sourceType === "library_paper" && meta.paperId) {
    const { data: paper } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select("answer_key, overlay")
      .eq("id", meta.paperId)
      .maybeSingle();

    const answerKey = (paper?.answer_key ?? {}) as Record<string, QuizLetter>;
    const correctAnswer = answerKey[String(questionNumber)] ?? null;
    const overlayExplanations = (paper?.overlay as Record<string, any> | null)?.explanations;
    let storedExplanation =
      meta.showInstantFeedback && overlayExplanations?.[String(questionNumber)]
        ? (overlayExplanations[String(questionNumber)] as McqExplanationResult)
        : null;

    if (meta.showInstantFeedback && !storedExplanation) {
      try {
        const stored = await getStoredPaperExplanationsServer(meta.paperId);
        storedExplanation = stored[questionNumber] ?? null;
      } catch {
        // fallback
      }
    }
    return { correctAnswer, storedExplanation };
  }

  return { correctAnswer: null, storedExplanation: null };
}

export async function submitQuizAnswerServer(input: {
  pin: string;
  playerId: string;
  questionNumber: number;
  selectedLetter: QuizLetter;
  elapsedSeconds: number;
}): Promise<{
  isCorrect: boolean;
  correctAnswer: QuizLetter | null;
  pointsEarned: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  player: QuizPlayer;
  rank: number;
  totalPlayers: number;
  explanation?: McqExplanationResult | null;
}> {
  const pin = normalizeQuizPin(input.pin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (meta.status === "lobby") {
    throw new Error("Wait for the host to start the quiz before submitting answers.");
  }
  if (meta.status === "ended") {
    throw new Error("This quiz has already ended.");
  }
  if (!meta.questionNumbers.includes(input.questionNumber)) {
    throw new Error("That question is not part of this quiz.");
  }

  const player = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, input.playerId));
  if (!player) {
    throw new Error("You are not registered in this quiz. Please rejoin.");
  }

  // Freeze check
  if (player.frozenUntil && player.frozenUntil > Date.now()) {
    const rem = Math.ceil((player.frozenUntil - Date.now()) / 1000);
    throw new Error(`You are currently frozen by a rival's Policy Shock! Thawing in ${rem}s.`);
  }

  // Prevent double-scoring the same question
  if (player.answers[input.questionNumber]) {
    const existing = player.answers[input.questionNumber];
    const allPlayers = sortQuizLeaderboard(await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin)));
    const rank = Math.max(1, allPlayers.findIndex((p) => p.id === player.id) + 1);
    return {
      isCorrect: existing.correct,
      correctAnswer: meta.showInstantFeedback ? (existing.correctAnswer ?? null) : null,
      pointsEarned: existing.points,
      basePoints: existing.correct ? 100 : 0,
      speedBonus: 0,
      streakBonus: 0,
      multiplier: 1,
      earnedPowerUp: null,
      player,
      rank,
      totalPlayers: allPlayers.length,
      explanation: null,
    };
  }

  const { correctAnswer, storedExplanation } = await resolveCorrectAnswerForQuestion(
    meta,
    input.questionNumber,
  );
  const isCorrect = correctAnswer !== null && input.selectedLetter === correctAnswer;

  const mult = player.activeMultiplier && player.activeMultiplier > 1 ? player.activeMultiplier : 1;

  const breakdown = calculateQuizPoints({
    isCorrect,
    elapsedSeconds: input.elapsedSeconds,
    currentStreak: player.currentStreak,
    gameMode: meta.gameMode,
    multiplier: mult,
  });

  const nextStreak = isCorrect ? player.currentStreak + 1 : 0;
  const bestStreak = Math.max(player.bestStreak, nextStreak);
  const now = new Date().toISOString();

  // Earn power-up in Game Arena Mode (live_race) on correct answers
  let earnedPowerUp: QuizPowerUp | null = null;
  const currentInventory = Array.isArray(player.inventory) ? [...player.inventory] : [];
  if (isCorrect && meta.gameMode === "live_race" && currentInventory.length < 3) {
    earnedPowerUp = getRandomPowerUp();
    currentInventory.push(earnedPowerUp);
  }

  const updatedAnswers = {
    ...player.answers,
    [input.questionNumber]: {
      selected: input.selectedLetter,
      correct: isCorrect,
      correctAnswer: correctAnswer ?? undefined,
      points: breakdown.points,
      elapsedSeconds: Math.max(0, Math.round(input.elapsedSeconds)),
      answeredAt: now,
      explanation: meta.showInstantFeedback ? (storedExplanation ?? null) : null,
    },
  };

  const answeredCount = Object.keys(updatedAnswers).length;
  const correctCount = Object.values(updatedAnswers).filter((a) => a.correct).length;
  const finished = answeredCount >= meta.questionNumbers.length;

  // Next unanswered question number for progress tracking
  const nextUnanswered =
    meta.questionNumbers.find((n) => !updatedAnswers[n]) ??
    meta.questionNumbers[meta.questionNumbers.length - 1] ??
    input.questionNumber;

  const updatedPlayer: QuizPlayer = {
    ...player,
    score: player.score + breakdown.points,
    answeredCount,
    correctCount,
    currentStreak: nextStreak,
    bestStreak,
    currentQuestion: nextUnanswered,
    answers: updatedAnswers,
    finished,
    finishedAt: finished ? (player.finishedAt ?? now) : null,
    lastAnsweredAt: now,
    inventory: currentInventory,
    activeMultiplier: 1, // consumed
  };

  let persistedAttemptId = player.persistedAttemptId ?? null;
  if (finished && (player.userId || updatedPlayer.userId)) {
    const attemptId = await syncStudentQuizAttemptToDatabase(meta, updatedPlayer);
    if (attemptId) persistedAttemptId = attemptId;
  }

  const finalPlayer: QuizPlayer = {
    ...updatedPlayer,
    persistedAttemptId,
  };

  await QUIZ_STORE.set(playerKey(pin, input.playerId), finalPlayer);

  const allPlayers = sortQuizLeaderboard(await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin)));
  const rank = Math.max(1, allPlayers.findIndex((p) => p.id === finalPlayer.id) + 1);

  return {
    isCorrect,
    correctAnswer: meta.showInstantFeedback ? correctAnswer : null,
    pointsEarned: breakdown.points,
    basePoints: breakdown.base,
    speedBonus: breakdown.speedBonus,
    streakBonus: breakdown.streakBonus,
    multiplier: mult,
    earnedPowerUp,
    player: finalPlayer,
    rank,
    totalPlayers: allPlayers.length,
    explanation: meta.showInstantFeedback ? storedExplanation : null,
  };
}

/**
 * Persists the student's completed quiz attempt to mcq_pdf_attempts.
 * This guarantees that:
 * 1. The student's Review & Analytics profile immediately records the score, title, and topic accuracy.
 * 2. mcq_topic_performance view recalculates their syllabus accuracy radar.
 * 3. The teacher classroom diagnostic dashboard and individual student insight report reflect their performance.
 */
async function syncStudentQuizAttemptToDatabase(
  meta: McqQuizMeta,
  player: QuizPlayer,
): Promise<string | null> {
  const userId = player.userId;
  if (!userId) return null;

  try {
    const levelUpper = meta.level === "a2" ? "A2" : "AS";
    const total = meta.questionNumbers.length;

    const gradedQuestions = meta.questionNumbers.map((num) => {
      const answerRec = player.answers[num];
      const userAnswer = answerRec?.selected ?? null;
      const isCorrect = answerRec ? Boolean(answerRec.correct) : false;
      const isAttempted = userAnswer !== null && userAnswer !== undefined;

      let stemText = "";
      let existingTopic = meta.paperTitle || meta.title;
      if (meta.sourceType === "custom_questions") {
        const cq = meta.customQuestions?.find((q) => q.number === num);
        stemText = cq?.stem || "";
        if (cq?.topic) existingTopic = cq.topic;
      }

      const classified = classifyMcqQuestion({
        level: levelUpper,
        number: num,
        text: stemText,
        existingTopic,
      });

      return {
        number: num,
        topic: classified.topic,
        subtopic: classified.subtopic,
        unit: classified.unit,
        domain: classified.domain,
        skill: classified.skill,
        stem_text: stemText ? stemText.slice(0, 1400) : undefined,
        correct_answer: answerRec?.correctAnswer ?? null,
        user_answer: userAnswer,
        correct: isAttempted ? isCorrect : false,
      };
    });

    const score = gradedQuestions.filter((q) => q.correct).length;
    const resolvedTitle = `[Live Quiz] ${meta.title || meta.paperTitle}`;

    if (player.persistedAttemptId) {
      const { error } = await supabaseAdmin
        .from("mcq_pdf_attempts")
        .update({
          score,
          total,
          questions: gradedQuestions,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.persistedAttemptId);

      if (!error) return player.persistedAttemptId;
    }

    const { data: newRow, error: insertError } = await supabaseAdmin
      .from("mcq_pdf_attempts")
      .insert({
        user_id: userId,
        title: resolvedTitle,
        paper_id: meta.paperId ?? null,
        level: meta.level || "igcse",
        answers: gradedQuestions,
        score,
        total,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (!insertError && newRow?.id) {
      return newRow.id;
    }
  } catch (err) {
    console.warn("Could not sync quiz attempt to mcq_pdf_attempts:", err);
  }
  return null;
}

export async function finishQuizPlayerServer(
  rawPin: string,
  playerId: string,
  callingUserId?: string | null,
): Promise<QuizPlayer> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  const player = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, playerId));
  if (!player) throw new Error("Player session not found.");

  const effectiveUserId = player.userId || callingUserId || null;
  let persistedAttemptId = player.persistedAttemptId ?? null;

  const candidatePlayer: QuizPlayer = {
    ...player,
    userId: effectiveUserId,
    finished: true,
    finishedAt: player.finishedAt ?? new Date().toISOString(),
  };

  if (effectiveUserId && meta) {
    const attemptId = await syncStudentQuizAttemptToDatabase(meta, candidatePlayer);
    if (attemptId) persistedAttemptId = attemptId;
  }

  const updated: QuizPlayer = {
    ...candidatePlayer,
    persistedAttemptId,
  };
  await QUIZ_STORE.set(playerKey(pin, playerId), updated);
  return updated;
}

export async function listMyHostedQuizzesServer(
  hostUserId: string,
): Promise<Array<PublicMcqQuizMeta & { playerCount: number }>> {
  const allMetas = await QUIZ_STORE.list<McqQuizMeta>(META_PREFIX);
  const mine = allMetas
    .filter((m) => m && m.hostUserId === hostUserId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);

  const enriched = await Promise.all(
    mine.map(async (m) => {
      const players = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(m.pin));
      return {
        ...sanitizeMetaForViewer(m, true),
        playerCount: players.length,
      };
    }),
  );

  return enriched;
}

export async function deleteMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<{ ok: true }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) return { ok: true };
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can delete this quiz.");
  }
  await QUIZ_STORE.remove(metaKey(pin));
  await QUIZ_STORE.removePrefix(playerPrefix(pin));
  return { ok: true };
}

/**
 * Safely proxies a Cambridge PDF for guest/student participants of an active quiz,
 * strictly validating that the requested URL belongs to that quiz's paper.
 */
export async function fetchQuizPaperPdfServer(rawPin: string, targetUrl: string): Promise<{ base64: string }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) {
    throw new Error("Quiz not found.");
  }

  const allowedUrls = new Set<string>();
  if (meta.qpUrl) allowedUrls.add(meta.qpUrl);
  if (meta.sourceType === "topical_paper" && meta.paperId) {
    const topical = getTopicalPaperById(meta.paperId);
    for (const q of topical?.questions ?? []) {
      if (q.qpUrl) allowedUrls.add(q.qpUrl);
    }
  }

  if (!allowedUrls.has(targetUrl)) {
    throw new Error("That PDF URL does not belong to this quiz paper.");
  }

  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch quiz paper PDF (HTTP ${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { base64: btoa(binary) };
}

export async function useQuizPowerUpServer(input: {
  pin: string;
  playerId: string;
  powerUpId: string;
  targetPlayerId?: string;
}): Promise<{
  ok: true;
  event: QuizGameEvent;
  state: McqQuizPublicState;
}> {
  const pin = normalizeQuizPin(input.pin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (meta.status !== "in_progress") {
    throw new Error("Power-ups can only be used during an active quiz.");
  }
  if (meta.gameMode !== "live_race") {
    throw new Error("Power-ups are only enabled in Game Arena Mode.");
  }

  const actor = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, input.playerId));
  if (!actor) throw new Error("Player not found.");

  if (actor.frozenUntil && actor.frozenUntil > Date.now()) {
    const rem = Math.ceil((actor.frozenUntil - Date.now()) / 1000);
    throw new Error(`You are currently frozen! Thawing in ${rem}s.`);
  }

  const inventory = Array.isArray(actor.inventory) ? [...actor.inventory] : [];
  const powerUpIndex = inventory.findIndex((p) => p.id === input.powerUpId);
  if (powerUpIndex === -1) {
    throw new Error("That power-up is no longer in your inventory.");
  }
  const powerUp = inventory[powerUpIndex];
  inventory.splice(powerUpIndex, 1);
  actor.inventory = inventory;

  const allPlayers = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin));
  const sortedPlayers = sortQuizLeaderboard(allPlayers);
  const now = new Date().toISOString();

  let event: QuizGameEvent;

  if (powerUp.type === "shield") {
    actor.activeShield = true;
    await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
    event = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      type: "shield",
      description: `${actor.avatar} ${actor.name} activated Central Bank Shield! 🛡️`,
    };
  } else if (powerUp.type === "multiplier_2x") {
    actor.activeMultiplier = 2;
    await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
    event = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      type: "multiplier_2x",
      description: `${actor.avatar} ${actor.name} activated 2x Productivity Surge for their next question! ⚡`,
    };
  } else if (powerUp.type === "fifty_fifty") {
    await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
    event = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      type: "fifty_fifty",
      description: `${actor.avatar} ${actor.name} executed a 50/50 Market Clear! ✂️`,
    };
  } else if (powerUp.type === "steal") {
    let targetId = input.targetPlayerId;
    if (!targetId) {
      const rival = sortedPlayers.find((p) => p.id !== actor.id);
      targetId = rival?.id;
    }
    if (!targetId || targetId === actor.id) {
      throw new Error("No rival player available to steal points from.");
    }
    const target = allPlayers.find((p) => p.id === targetId);
    if (!target) throw new Error("Target player not found.");

    if (target.activeShield) {
      target.activeShield = false;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "steal",
        blocked: true,
        description: `🛡️ BLOCKED! ${actor.avatar} ${actor.name} tried to steal points from ${target.avatar} ${target.name}, but their Central Bank Shield absorbed it!`,
      };
    } else {
      const stolen = Math.max(50, Math.min(300, Math.round(target.score * 0.15)));
      target.score = Math.max(0, target.score - stolen);
      actor.score += stolen;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "steal",
        pointsDelta: stolen,
        description: `🎯 CAPITAL STEAL! ${actor.avatar} ${actor.name} seized ${stolen} points from ${target.avatar} ${target.name}!`,
      };
    }
  } else if (powerUp.type === "swap") {
    let targetId = input.targetPlayerId;
    if (!targetId) {
      const rival = sortedPlayers.find((p) => p.id !== actor.id);
      targetId = rival?.id;
    }
    if (!targetId || targetId === actor.id) {
      throw new Error("Pick a rival player to swap score with.");
    }
    const target = allPlayers.find((p) => p.id === targetId);
    if (!target) throw new Error("Target player not found.");

    if (target.activeShield) {
      target.activeShield = false;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "swap",
        blocked: true,
        description: `🛡️ BLOCKED! ${actor.avatar} ${actor.name} tried to Swap Scores with ${target.avatar} ${target.name}, but their Shield blocked it!`,
      };
    } else {
      const prevActor = actor.score;
      const prevTarget = target.score;
      actor.score = prevTarget;
      target.score = prevActor;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "swap",
        description: `🔄 SCORE SWAP! ${actor.avatar} ${actor.name} swapped point balances with ${target.avatar} ${target.name} (${actor.score} pts ↔ ${target.score} pts)!`,
      };
    }
  } else if (powerUp.type === "tax") {
    const rivals = sortedPlayers.filter((p) => p.id !== actor.id).slice(0, 3);
    if (rivals.length === 0) {
      throw new Error("No rivals available to tax.");
    }
    let totalTaxCollected = 0;
    const taxedNames: string[] = [];
    for (const rival of rivals) {
      if (rival.activeShield) {
        rival.activeShield = false;
        await QUIZ_STORE.set(playerKey(pin, rival.id), rival);
      } else {
        const tax = Math.max(30, Math.min(200, Math.round(rival.score * 0.1)));
        rival.score = Math.max(0, rival.score - tax);
        totalTaxCollected += tax;
        taxedNames.push(`${rival.avatar} ${rival.name}`);
        await QUIZ_STORE.set(playerKey(pin, rival.id), rival);
      }
    }
    actor.score += totalTaxCollected;
    await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
    event = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      type: "tax",
      pointsDelta: totalTaxCollected,
      description: `📉 PIGOUVIAN TAX! ${actor.avatar} ${actor.name} collected a ${totalTaxCollected} pts dividend from ${taxedNames.join(", ") || "rivals"}!`,
    };
  } else if (powerUp.type === "freeze") {
    let targetId = input.targetPlayerId;
    if (!targetId) {
      const rival = sortedPlayers.find((p) => p.id !== actor.id);
      targetId = rival?.id;
    }
    if (!targetId || targetId === actor.id) {
      throw new Error("Pick a rival player to freeze.");
    }
    const target = allPlayers.find((p) => p.id === targetId);
    if (!target) throw new Error("Target player not found.");

    if (target.activeShield) {
      target.activeShield = false;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "freeze",
        blocked: true,
        description: `🛡️ BLOCKED! ${actor.avatar} ${actor.name} tried to Freeze ${target.avatar} ${target.name}, but their Shield deflected it!`,
      };
    } else {
      target.frozenUntil = Date.now() + 5000;
      await QUIZ_STORE.set(playerKey(pin, target.id), target);
      await QUIZ_STORE.set(playerKey(pin, actor.id), actor);
      event = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatar,
        targetId: target.id,
        targetName: target.name,
        targetAvatar: target.avatar,
        type: "freeze",
        description: `🧊 POLICY SHOCK! ${actor.avatar} ${actor.name} froze ${target.avatar} ${target.name} for 5 seconds!`,
      };
    }
  } else {
    throw new Error("Unsupported power-up type.");
  }

  // Update meta with recent event
  const events = Array.isArray(meta.recentEvents) ? [event, ...meta.recentEvents].slice(0, 20) : [event];
  const updatedMeta: McqQuizMeta = {
    ...meta,
    recentEvents: events,
  };
  await QUIZ_STORE.set(metaKey(pin), updatedMeta);

  const state = await getMcqQuizStateServer(pin, { userId: actor.userId });
  if (!state) throw new Error("Failed to load updated state.");
  return { ok: true, event, state };
}

/**
 * Surveillance & analytics telemetry for Marginal Admins:
 * Aggregates all live/recent MCQ quiz rooms, host teachers, connected students,
 * real-time leaderboard scores, and completed exam attempts.
 */
export async function listAdminQuizSessionsServer(actor: {
  userId: string;
  email?: string;
  claims?: Record<string, unknown>;
}): Promise<AdminQuizDashboardData> {
  if (!isMarginalAdmin({ userId: actor.userId, email: actor.email, claims: actor.claims })) {
    throw new Error("Unauthorized: Marginal Platform Admin privileges required.");
  }

  // 1. Fetch all live/recent quiz rooms from QUIZ_STORE
  const rawRooms = await QUIZ_STORE.list<McqQuizMeta>(META_PREFIX);
  rawRooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 2. Fetch players for each room
  const rooms: AdminQuizRoomSummary[] = await Promise.all(
    rawRooms.slice(0, 100).map(async (meta) => {
      const players = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(meta.pin));
      const sorted = sortQuizLeaderboard(players);
      const topScorer = sorted[0];

      return {
        pin: meta.pin,
        title: meta.title,
        paperTitle: meta.paperTitle,
        sourceType: meta.sourceType,
        paperId: meta.paperId,
        level: meta.level,
        gameMode: meta.gameMode,
        status: meta.status,
        hostUserId: meta.hostUserId,
        hostName: meta.hostName,
        questionCount: meta.questionNumbers?.length ?? 0,
        playerCount: players.length,
        createdAt: meta.createdAt,
        startedAt: meta.startedAt ?? null,
        endedAt: meta.endedAt ?? null,
        topScore: topScorer?.score ?? 0,
        topScorer: topScorer ? `${topScorer.avatar} ${topScorer.name}` : undefined,
        players: sorted.map((p) => ({
          id: p.id,
          userId: p.userId ?? null,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          answeredCount: p.answeredCount,
          correctCount: p.correctCount,
          currentStreak: p.currentStreak,
          finished: Boolean(p.finished),
        })),
      };
    }),
  );

  // 3. Query recently completed quiz attempts from mcq_pdf_attempts
  const { data: rawAttempts } = await supabaseAdmin
    .from("mcq_pdf_attempts")
    .select("id, user_id, title, paper_id, level, score, total, completed_at, created_at")
    .ilike("title", "%[Live Quiz]%")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(60);

  const attemptsList = rawAttempts || [];
  const userIds = Array.from(new Set(attemptsList.map((a: any) => a.user_id).filter(Boolean)));

  const profileMap = new Map<string, { full_name?: string; email?: string }>();
  if (userIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    if (profs) {
      for (const p of profs) {
        profileMap.set(p.id, { full_name: p.full_name, email: p.email });
      }
    }
  }

  const recentAttempts: AdminQuizAttemptSummary[] = attemptsList.map((a: any) => {
    const prof = a.user_id ? profileMap.get(a.user_id) : undefined;
    const total = Number(a.total) || 1;
    const score = Number(a.score) || 0;
    const percentage = Math.round((score / total) * 100);

    return {
      id: a.id,
      userId: a.user_id,
      studentName: prof?.full_name || "Student",
      studentEmail: prof?.email || undefined,
      title: a.title,
      paperId: a.paperId ?? a.paper_id ?? null,
      level: a.level ?? null,
      score,
      total,
      percentage,
      completedAt: a.completed_at || a.created_at || null,
      createdAt: a.created_at,
    };
  });

  const activeRooms = rooms.filter(
    (r) => r.status === "lobby" || r.status === "in_progress",
  ).length;

  const totalPlayersConnected = rooms.reduce((acc, r) => acc + r.playerCount, 0);

  return {
    totalRooms: rooms.length,
    activeRooms,
    totalPlayersConnected,
    totalCompletedAttempts: recentAttempts.length,
    rooms,
    recentAttempts,
  };
}

