import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabase as clientSupabase } from "@/integrations/backend/client";

const LetterSchema = z.enum(["A", "B", "C", "D"]);
const LevelSchema = z.enum(["as", "a2"]);
const SourceTypeSchema = z.enum(["library_paper", "topical_paper", "custom_questions"]);
const GameModeSchema = z.enum(["live_race", "exam_sprint"]);

const CustomQuestionInputSchema = z.object({
  stem: z.string().trim().min(1, "Enter the question text.").max(2500),
  options: z.object({
    A: z.string().trim().min(1, "Option A is required.").max(600),
    B: z.string().trim().min(1, "Option B is required.").max(600),
    C: z.string().trim().min(1, "Option C is required.").max(600),
    D: z.string().trim().min(1, "Option D is required.").max(600),
  }),
  correctAnswer: LetterSchema,
  explanation: z.string().trim().max(2000).optional(),
  topic: z.string().trim().max(200).optional(),
});

/**
 * Optional auth middleware for /quiz/$pin so both signed-in users (including the host)
 * and unauthenticated classroom guests can join and play live quiz links smoothly.
 */
const optionalSupabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await clientSupabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      /* non-browser */
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  })
  .server(async ({ next }) => {
    let userId: string | null = null;
    let email: string | undefined;
    let claims: Record<string, unknown> | undefined;

    try {
      const request = getRequest();
      const authHeader = request?.headers?.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length);
        const parts = token.split(".");
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
          const payload = JSON.parse(atob(padded));
          if (payload?.sub && (!payload.exp || payload.exp * 1000 > Date.now())) {
            userId = payload.sub;
            claims = payload;
            email =
              (typeof payload.email === "string" ? payload.email : undefined) ||
              (typeof payload.user_metadata?.email === "string"
                ? payload.user_metadata.email
                : undefined);
          }
        }
      }
    } catch {
      /* guest viewer */
    }

    return next({
      context: { userId, email, claims },
    });
  });

/** Host creates a live multiplayer MCQ quiz room & gets a 6-digit PIN + shareable link. */
export const createMcqQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().max(160).optional(),
        sourceType: SourceTypeSchema,
        paperId: z.string().max(160).nullable().optional(),
        level: LevelSchema.optional(),
        questionStart: z.number().int().positive().max(80).optional(),
        questionEnd: z.number().int().positive().max(80).optional(),
        customQuestions: z.array(CustomQuestionInputSchema).max(60).optional(),
        gameMode: GameModeSchema.default("live_race"),
        timeLimitSeconds: z.number().int().positive().max(7200).nullable().optional(),
        showInstantFeedback: z.boolean().default(true),
        showLiveLeaderboard: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createMcqQuizServer } = await import("./mcq-quiz.server");
    const claims = (context.claims ?? {}) as Record<string, any>;
    const metaName =
      claims.user_metadata?.full_name ||
      claims.user_metadata?.name ||
      claims.user_metadata?.display_name ||
      (context.email ? context.email.split("@")[0] : "Teacher");

    return createMcqQuizServer(data, {
      userId: context.userId,
      hostName: String(metaName || "Teacher"),
    });
  });

/** Lists quizzes created by the signed-in host. */
export const listMyHostedQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMyHostedQuizzesServer } = await import("./mcq-quiz.server");
    const quizzes = await listMyHostedQuizzesServer(context.userId);
    return { quizzes };
  });

/** Host transitions a lobby into live play for all connected students. */
export const startMcqQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pin: z.string().min(4).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const { startMcqQuizServer } = await import("./mcq-quiz.server");
    return startMcqQuizServer(data.pin, {
      userId: context.userId,
      email: context.email ?? undefined,
      claims: context.claims as Record<string, unknown>,
    });
  });

/** Host ends the quiz and reveals final podium & full answer key. */
export const endMcqQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pin: z.string().min(4).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const { endMcqQuizServer } = await import("./mcq-quiz.server");
    return endMcqQuizServer(data.pin, {
      userId: context.userId,
      email: context.email ?? undefined,
      claims: context.claims as Record<string, unknown>,
    });
  });

/** Host removes a player from the lobby/game. */
export const kickQuizPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        playerId: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { kickQuizPlayerServer } = await import("./mcq-quiz.server");
    return kickQuizPlayerServer(
      data.pin,
      {
        userId: context.userId,
        email: context.email ?? undefined,
        claims: context.claims as Record<string, unknown>,
      },
      data.playerId,
    );
  });

/** Host deletes a quiz room and its player records. */
export const deleteMcqQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pin: z.string().min(4).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const { deleteMcqQuizServer } = await import("./mcq-quiz.server");
    return deleteMcqQuizServer(data.pin, {
      userId: context.userId,
      email: context.email ?? undefined,
      claims: context.claims as Record<string, unknown>,
    });
  });

/** Fetches live state (meta, sorted leaderboard, question heatmap) for a PIN. */
export const getMcqQuizState = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pin: z.string().min(1).max(16) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getMcqQuizStateServer } = await import("./mcq-quiz.server");
    const state = await getMcqQuizStateServer(data.pin, {
      userId: context.userId,
      email: context.email,
      claims: context.claims,
    });
    return { state };
  });

/** Student joins a live quiz room by PIN with nickname & avatar (Signup/Login strictly required). */
export const joinMcqQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        playerId: z.string().max(120).nullable().optional(),
        name: z.string().trim().min(1, "Enter a nickname.").max(32),
        avatar: z.string().min(1).max(16).default("🚀"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { joinMcqQuizServer } = await import("./mcq-quiz.server");
    return joinMcqQuizServer({
      pin: data.pin,
      playerId: data.playerId,
      userId: context.userId,
      name: data.name,
      avatar: data.avatar,
    });
  });

/** Student submits an answer to one question — server verifies, awards points/streak, returns rank. */
export const submitQuizAnswer = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        playerId: z.string().min(1).max(120),
        questionNumber: z.number().int().positive(),
        selectedLetter: LetterSchema,
        elapsedSeconds: z.number().min(0).max(3600).default(15),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { submitQuizAnswerServer } = await import("./mcq-quiz.server");
    return submitQuizAnswerServer(data);
  });

/** Student explicitly finishes their paper early (or upon completing the final question). */
export const finishQuizPlayer = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        playerId: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { finishQuizPlayerServer } = await import("./mcq-quiz.server");
    const player = await finishQuizPlayerServer(data.pin, data.playerId, context.userId);
    return { player };
  });

/** Proxies the official Cambridge PDF for quiz participants (validated against the quiz's paper). */
export const fetchQuizPaperPdf = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        qpUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchQuizPaperPdfServer } = await import("./mcq-quiz.server");
    return fetchQuizPaperPdfServer(data.pin, data.qpUrl);
  });

/** Student activates a power-up in Game Arena Mode (Steal, Swap, Tax, Shield, 2x, 50/50, Freeze). */
export const useQuizPowerUp = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: z.string().min(4).max(12),
        playerId: z.string().min(1).max(120),
        powerUpId: z.string().min(1).max(120),
        targetPlayerId: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { useQuizPowerUpServer } = await import("./mcq-quiz.server");
    return useQuizPowerUpServer(data);
  });

/** Marginal Platform Admin: fetch real-time surveillance of live quiz rooms and completed attempts. */
export const listAdminQuizSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAdminQuizSessionsServer } = await import("./mcq-quiz.server");
    return listAdminQuizSessionsServer({
      userId: context.userId,
      email: context.email ?? undefined,
      claims: context.claims as Record<string, unknown>,
    });
  });

