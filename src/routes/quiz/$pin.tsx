import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator as CalculatorIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Flag,
  Flame,
  Gamepad2,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  Sparkles,
  Square,
  Trophy,
  UserCheck,
  Users,
  X,
  XCircle,
  Zap,
  Shield,
  Scissors,
  Snowflake,
  RefreshCw,
  Target,
  TrendingDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

import { McqCalculator } from "@/components/app/mcq-calculator";
import {
  QuizLiveLeaderboard,
  QuizQuestionHeatmap,
  QuizWinnerPodium,
} from "@/components/app/mcq-quiz-podium";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/backend/client";
import type { McqExplanationResult } from "@/lib/mcq/mcq-pdf.server";
import { formatThreeLineMcqFeedback } from "@/lib/mcq/mcq-feedback-format";
import { renderQuizPdfPaper, type RenderedQuizPaper } from "@/lib/mcq-pdf-render";
import {
  endMcqQuiz,
  fetchQuizPaperPdf,
  finishQuizPlayer,
  getMcqQuizState,
  joinMcqQuiz,
  kickQuizPlayer,
  startMcqQuiz,
  submitQuizAnswer,
  useQuizPowerUp,
} from "@/lib/mcq-quiz.functions";
import { explainMcqAnswer } from "@/lib/mcq-pdf.functions";
import {
  formatQuizPin,
  normalizeQuizPin,
  POWER_UP_CATALOG,
  QUIZ_AVATARS,
  type McqQuizPublicState,
  type QuizGameEvent,
  type QuizLetter,
  type QuizPlayer,
  type QuizPowerUp,
  type QuizPowerUpType,
} from "@/lib/mcq-quiz.types";
import { cn, stripStars } from "@/lib/utils";

export const Route = createFileRoute("/quiz/$pin")({
  ssr: false,
  component: LiveQuizRoomPage,
});

const OPTION_STYLES: Record<
  QuizLetter,
  { idle: string; badge: string; label: string }
> = {
  A: {
    idle: "border-rose-500/35 bg-rose-500/[0.06] hover:bg-rose-500/[0.14] hover:border-rose-500",
    badge: "bg-rose-600 text-white",
    label: "Option A",
  },
  B: {
    idle: "border-sky-500/35 bg-sky-500/[0.06] hover:bg-sky-500/[0.14] hover:border-sky-500",
    badge: "bg-sky-600 text-white",
    label: "Option B",
  },
  C: {
    idle: "border-amber-500/35 bg-amber-500/[0.06] hover:bg-amber-500/[0.14] hover:border-amber-500",
    badge: "bg-amber-500 text-amber-950",
    label: "Option C",
  },
  D: {
    idle: "border-emerald-500/35 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.14] hover:border-emerald-500",
    badge: "bg-emerald-600 text-white",
    label: "Option D",
  },
};

function playerStorageKey(pin: string) {
  return `marginal_mcq_quiz_player_${pin}`;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

type LastAnswerFeedback = {
  questionNumber: number;
  selected: QuizLetter;
  isCorrect: boolean;
  correctAnswer: QuizLetter | null;
  pointsEarned: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  rank: number;
  totalPlayers: number;
  explanation?: McqExplanationResult | null;
};

// Cross-browser clipboard helper with fallback for Safari iOS, Firefox, and insecure/in-app webviews
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback to execCommand below */
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

function LiveQuizRoomPage() {
  const { pin: rawPin } = Route.useParams();
  const cleanPin = normalizeQuizPin(rawPin);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const getQuizStateFn = useServerFn(getMcqQuizState);
  const joinQuizFn = useServerFn(joinMcqQuiz);
  const startQuizFn = useServerFn(startMcqQuiz);
  const endQuizFn = useServerFn(endMcqQuiz);
  const kickPlayerFn = useServerFn(kickQuizPlayer);
  const submitAnswerFn = useServerFn(submitQuizAnswer);
  const finishPlayerFn = useServerFn(finishQuizPlayer);
  const fetchPdfFn = useServerFn(fetchQuizPaperPdf);
  const usePowerUpFn = useServerFn(useQuizPowerUp);

  // Authenticated user session state (must be signed in to join)
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Persisted player session for this PIN so refreshing restores seat + score
  const [savedPlayer, setSavedPlayer] = useState<{
    id: string;
    name: string;
    avatar: string;
  } | null>(() => {
    if (typeof window === "undefined" || !cleanPin) return null;
    try {
      const raw = localStorage.getItem(playerStorageKey(cleanPin));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.name) return parsed;
    } catch {
      /* ignore */
    }
    return null;
  });

  // Host can toggle "Join & Play Too" / "Player View" if they want to test or play alongside class
  const [hostPlayingAsStudent, setHostPlayingAsStudent] = useState<boolean>(() => {
    if (typeof window === "undefined" || !cleanPin) return false;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const mode = searchParams.get("mode");
      const play = searchParams.get("play");
      if (mode === "host") return false;
      if (mode === "player" || play === "1" || play === "true") return true;

      const cachedView = sessionStorage.getItem(`quiz_view_${cleanPin}`);
      if (cachedView === "player") return true;
      if (cachedView === "host") return false;

      const raw = localStorage.getItem(playerStorageKey(cleanPin));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  const switchToPlayerView = useCallback(() => {
    try {
      sessionStorage.setItem(`quiz_view_${cleanPin}`, "player");
    } catch {
      /* ignore */
    }
    setHostPlayingAsStudent(true);
  }, [cleanPin]);

  const switchToHostView = useCallback(() => {
    try {
      sessionStorage.setItem(`quiz_view_${cleanPin}`, "host");
    } catch {
      /* ignore */
    }
    setHostPlayingAsStudent(false);
  }, [cleanPin]);

  // Student join form state
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<string>(QUIZ_AVATARS[0].emoji);
  const [joining, setJoining] = useState(false);

  // Host controls state
  const [hostTab, setHostTab] = useState<"leaderboard" | "heatmap">("leaderboard");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Live query with adaptive polling fallback (2.5s lobby, 3.5s active, 8s ended)
  const quizQuery = useQuery({
    queryKey: ["mcq-live-quiz", cleanPin],
    queryFn: async () => {
      const res = await getQuizStateFn({ data: { pin: cleanPin } });
      return res.state;
    },
    enabled: cleanPin.length === 6,
    refetchInterval: (query) => {
      const status = query.state.data?.meta?.status;
      if (status === "lobby") return 2500;
      if (status === "in_progress") return 3500;
      return 8000;
    },
  });

  const state: McqQuizPublicState | null = quizQuery.data ?? null;
  const meta = state?.meta ?? null;
  const players = state?.players ?? [];
  const isHost = Boolean(state?.isHost);

  // Track signed-in Supabase user session (required to join)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setCurrentUser(user);
      setAuthLoaded(true);
      if (user && !nickname) {
        const suggested =
          (user.user_metadata as any)?.full_name ||
          (user.user_metadata as any)?.name ||
          (user.email ? user.email.split("@")[0] : "");
        if (suggested) {
          setNickname(String(suggested).slice(0, 28));
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      setAuthLoaded(true);
      if (user && !nickname) {
        const suggested =
          (user.user_metadata as any)?.full_name ||
          (user.user_metadata as any)?.name ||
          (user.email ? user.email.split("@")[0] : "");
        if (suggested) {
          setNickname(String(suggested).slice(0, 28));
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [nickname]);

  // Supabase Realtime Broadcast Channel for instant <50ms cross-device sync
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refetchRef = useRef(quizQuery.refetch);
  refetchRef.current = quizQuery.refetch;

  useEffect(() => {
    if (cleanPin.length !== 6) return;
    const channel = supabase.channel(`mcq_quiz_${cleanPin}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "sync" }, () => {
        void refetchRef.current();
      })
      .on("broadcast", { event: "powerup" }, ({ payload }) => {
        if (payload?.description) {
          toast(payload.description, {
            icon: payload.blocked ? "🛡️" : "⚡",
          });
        }
        void refetchRef.current();
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [cleanPin]);

  const broadcastSync = useCallback(() => {
    try {
      void channelRef.current?.send({
        type: "broadcast",
        event: "sync",
        payload: { ts: Date.now() },
      });
    } catch {
      /* polling fallback covers sync */
    }
  }, []);

  const broadcastPowerUp = useCallback((event: QuizGameEvent) => {
    try {
      void channelRef.current?.send({
        type: "broadcast",
        event: "powerup",
        payload: event,
      });
    } catch {
      /* polling fallback covers sync */
    }
  }, []);

  // Countdown animation when status flips from lobby -> in_progress for a student
  const [countdown, setCountdown] = useState<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const currentStatus = meta?.status ?? null;
    if (prevStatusRef.current === "lobby" && currentStatus === "in_progress") {
      setCountdown(3);
    }
    prevStatusRef.current = currentStatus;
  }, [meta?.status]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const t = setTimeout(() => setCountdown(null), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 750);
    return () => clearTimeout(t);
  }, [countdown]);

  // Remaining time clock (when host configured a whole-paper timer)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (meta?.status !== "in_progress") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [meta?.status]);

  const remainingSeconds = useMemo(() => {
    if (!meta?.timeLimitSeconds || !meta.startedAt) return null;
    const startedMs = Date.parse(meta.startedAt);
    if (isNaN(startedMs)) return null;
    const elapsed = Math.floor((nowMs - startedMs) / 1000);
    return Math.max(0, meta.timeLimitSeconds - elapsed);
  }, [meta?.timeLimitSeconds, meta?.startedAt, nowMs]);

  const elapsedGameSeconds = useMemo(() => {
    if (!meta?.startedAt) return 0;
    const startedMs = Date.parse(meta.startedAt);
    if (isNaN(startedMs)) return 0;
    return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  }, [meta?.startedAt, nowMs]);

  // Identify current player object on server leaderboard (by saved seat or signed-in user id)
  const mePlayer: QuizPlayer | null = useMemo(() => {
    if (savedPlayer) {
      const match = players.find((p) => p.id === savedPlayer.id);
      if (match) return match;
    }
    if (currentUser?.id) {
      const matchByUser = players.find((p) => p.userId && p.userId === currentUser.id);
      if (matchByUser) return matchByUser;
    }
    return null;
  }, [players, savedPlayer, currentUser?.id]);

  // Sync persisted seat if player was identified via account ID
  useEffect(() => {
    if (!savedPlayer && mePlayer) {
      const stored = {
        id: mePlayer.id,
        name: mePlayer.name,
        avatar: mePlayer.avatar,
      };
      try {
        localStorage.setItem(playerStorageKey(cleanPin), JSON.stringify(stored));
      } catch {
        /* ignore */
      }
      setSavedPlayer(stored);
    }
  }, [savedPlayer, mePlayer, cleanPin]);

  const myRank = useMemo(() => {
    if (!mePlayer) return null;
    const idx = players.findIndex((p) => p.id === mePlayer.id);
    return idx >= 0 ? idx + 1 : null;
  }, [players, mePlayer]);

  // Detect if host actually kicked this player (only after we have previously observed
  // their player id in server state, never on the immediate render right after joining).
  const seenPlayerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!savedPlayer || !state || meta?.status === "ended") {
      if (!savedPlayer) seenPlayerIdRef.current = null;
      return;
    }
    const isPresent = players.some((p) => p.id === savedPlayer.id);
    if (isPresent) {
      seenPlayerIdRef.current = savedPlayer.id;
      return;
    }
    if (seenPlayerIdRef.current === savedPlayer.id && !quizQuery.isFetching) {
      seenPlayerIdRef.current = null;
      try {
        localStorage.removeItem(playerStorageKey(cleanPin));
      } catch {
        /* ignore */
      }
      setSavedPlayer(null);
      toast.info("You were removed from the quiz lobby.");
    }
  }, [savedPlayer, state, players, meta?.status, quizQuery.isFetching, cleanPin]);

  // Copy helpers with multi-browser clipboard fallback
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/quiz/${cleanPin}` : `/quiz/${cleanPin}`;

  async function copyShareLink() {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      toast.success("Quiz invite link copied! Paste it in class chat.");
    } else {
      toast.info(shareUrl);
    }
  }

  async function copyPinCode() {
    const ok = await copyTextToClipboard(cleanPin);
    if (ok) {
      toast.success(`Game PIN ${formatQuizPin(cleanPin)} copied!`);
    } else {
      toast.info(`PIN: ${formatQuizPin(cleanPin)}`);
    }
  }

  // Host actions
  async function handleStartQuiz() {
    if (starting) return;
    setStarting(true);
    try {
      const updated = await startQuizFn({ data: { pin: cleanPin } });
      queryClient.setQueryData(["mcq-live-quiz", cleanPin], updated);
      broadcastSync();
      void quizQuery.refetch();
      toast.success("Quiz started! All students are now live.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start quiz.");
    } finally {
      setStarting(false);
    }
  }

  async function handleEndQuiz() {
    if (ending) return;
    setEnding(true);
    try {
      const updated = await endQuizFn({ data: { pin: cleanPin } });
      queryClient.setQueryData(["mcq-live-quiz", cleanPin], updated);
      broadcastSync();
      void quizQuery.refetch();
      toast.success("Quiz ended! Final podium revealed to everyone.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not end quiz.");
    } finally {
      setEnding(false);
    }
  }

  async function handleKickPlayer(playerId: string, name: string) {
    try {
      await kickPlayerFn({ data: { pin: cleanPin, playerId } });
      broadcastSync();
      await quizQuery.refetch();
      toast.success(`Removed ${name} from lobby.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove player.");
    }
  }

  // Student join action
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joining) return;
    if (!currentUser) {
      toast.info("Please sign in or create an account to join the live quiz.");
      navigate({ to: "/auth", search: { redirect: `/quiz/${cleanPin}` } as any });
      return;
    }
    if (!nickname.trim()) {
      toast.error("Enter a nickname to join the quiz!");
      return;
    }
    setJoining(true);
    try {
      const res = await joinQuizFn({
        data: {
          pin: cleanPin,
          playerId: savedPlayer?.id ?? null,
          name: nickname.trim(),
          avatar,
        },
      });
      const stored = {
        id: res.player.id,
        name: res.player.name,
        avatar: res.player.avatar,
      };
      // Seed React Query cache with the authoritative server state BEFORE setting savedPlayer
      // so the student transitions instantly into the lobby/gameplay with zero race condition.
      seenPlayerIdRef.current = stored.id;
      queryClient.setQueryData(["mcq-live-quiz", cleanPin], res.state);
      try {
        localStorage.setItem(playerStorageKey(cleanPin), JSON.stringify(stored));
      } catch {
        /* ignore */
      }
      setSavedPlayer(stored);
      broadcastSync();
      toast.success(`Joined as ${res.player.avatar} ${res.player.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join quiz.");
    } finally {
      setJoining(false);
    }
  }

  /* ---------------- Loading & Not-Found States ---------------- */
  if (cleanPin.length !== 6) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Gamepad2 className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-black">Invalid Quiz PIN</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Quiz PINs are 6 digits long (for example: 849 201).
        </p>
        <Link to="/quiz">
          <Button className="gap-2 font-bold">
            <ArrowLeft className="h-4 w-4" />
            Enter a Valid PIN
          </Button>
        </Link>
      </div>
    );
  }

  if (quizQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          Connecting to Live Quiz {formatQuizPin(cleanPin)}…
        </p>
      </div>
    );
  }

  if (quizQuery.isError && !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <XCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Connection Hiccup</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Could not reach the quiz room right now. Check your connection and retry.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => void quizQuery.refetch()}>Retry Connection</Button>
          <Link to="/quiz">
            <Button variant="outline">Back to Join</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <XCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Quiz Room Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          No live quiz exists for PIN <span className="font-mono font-bold">{formatQuizPin(cleanPin)}</span>. Check with your teacher for the latest link.
        </p>
        <div className="flex items-center gap-2">
          <Link to="/quiz">
            <Button variant="outline">Try Another PIN</Button>
          </Link>
          <Link to="/mcq-live">
            <Button>Back to MCQ Live</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- Host Dashboard View ---------------- */
  if (isHost && !hostPlayingAsStudent) {
    const totalAnswers = players.reduce((acc, p) => acc + p.answeredCount, 0);
    const totalCorrect = players.reduce((acc, p) => acc + p.correctCount, 0);
    const classAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    const finishedCount = players.filter((p) => p.finished).length;

    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-background via-primary/[0.02] to-muted/20 touch-manipulation">
        {/* Top Host Bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/mcq-live">
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">MCQ Live</span>
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                    Host Control
                  </Badge>
                  <span className="font-mono text-xs font-black tracking-widest text-foreground">
                    PIN {formatQuizPin(cleanPin)}
                  </span>
                  {meta.status === "in_progress" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </Badge>
                  ) : null}
                </div>
                <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                  {meta.title}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyShareLink}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Copy Student Link
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mePlayer ? "default" : "outline"}
                onClick={switchToPlayerView}
                className="h-8 gap-1.5 text-xs font-bold"
                title={mePlayer ? "Switch to your active player seat" : "Join this quiz as a participant to play"}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>{mePlayer ? `Player Seat (${mePlayer.avatar} ${mePlayer.name})` : "Play Quiz"}</span>
              </Button>
              {meta.status === "in_progress" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={ending}
                  onClick={handleEndQuiz}
                  className="h-8 gap-1.5 text-xs font-bold"
                >
                  {ending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3 fill-current" />
                  )}
                  End Quiz &amp; Show Podium
                </Button>
              ) : null}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 space-y-6">
          {/* HOST LOBBY (Projector Ready) */}
          {meta.status === "lobby" ? (
            <div className="space-y-6">
              <Card className="overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-background to-amber-500/[0.06] shadow-lg">
                <CardContent className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-center">
                    <div className="min-w-0 space-y-4 text-center lg:text-left">
                      <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <Badge variant="outline" className="uppercase font-bold text-[11px]">
                          {meta.level} Level
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {meta.questionNumbers.length} Questions
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {meta.gameMode === "live_race" ? "🔥 Live Race Mode" : "🏆 Exam Sprint"}
                        </Badge>
                        {meta.timeLimitSeconds ? (
                          <Badge variant="outline" className="text-[11px] gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(meta.timeLimitSeconds / 60)} min
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Students join at{" "}
                          <span className="text-foreground underline decoration-primary/50">
                            {typeof window !== "undefined" ? `${window.location.host}/quiz` : "/quiz"}
                          </span>
                        </p>
                        <div className="mt-2 inline-flex items-center gap-3 rounded-2xl border-2 border-foreground/80 bg-background px-6 py-3 shadow-[5px_5px_0_hsl(var(--foreground))]">
                          <span className="font-mono text-4xl sm:text-6xl font-black tracking-[0.2em] text-foreground">
                            {formatQuizPin(cleanPin)}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={copyPinCode}
                            className="h-10 w-10"
                            title="Copy PIN"
                          >
                            <Copy className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={copyShareLink}
                          className="gap-2 font-semibold"
                        >
                          <Link2 className="h-4 w-4 text-primary" />
                          Copy Direct Join Link
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          disabled={starting}
                          onClick={handleStartQuiz}
                          className="gap-2 px-7 font-extrabold text-base shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {starting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Play className="h-5 w-5 fill-current" />
                          )}
                          Start Quiz ({players.length} {players.length === 1 ? "Player" : "Players"})
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/90 p-4 space-y-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Direct Share Link
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Input
                          readOnly
                          value={shareUrl}
                          onFocus={(e) => e.target.select()}
                          className="h-9 font-mono text-xs bg-muted/40"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={copyShareLink}
                          className="h-9 shrink-0 gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Students can click this link directly from Google Classroom, WhatsApp, or Teams — no signup required! Even late joiners can enter after you hit Start.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Joined Players Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Players in Lobby ({players.length})</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Hover any card to remove a player
                  </span>
                </div>

                {players.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center space-y-2">
                      <div className="text-4xl animate-bounce">🎮</div>
                      <p className="text-sm font-bold text-foreground">
                        Waiting for students to join…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Share the link or project PIN{" "}
                        <span className="font-mono font-bold text-foreground">
                          {formatQuizPin(cleanPin)}
                        </span>{" "}
                        on the screen!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {players.map((p) => (
                      <div
                        key={p.id}
                        className="group relative flex items-center gap-2.5 rounded-xl border-2 border-border bg-card px-3.5 py-3 shadow-xs hover:border-primary/50 transition-all animate-in fade-in zoom-in-95 duration-200"
                      >
                        <span className="text-2xl shrink-0">{p.avatar}</span>
                        <span className="text-sm font-extrabold text-foreground truncate">
                          {p.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id, p.name)}
                          className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                          title={`Kick ${p.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* HOST LIVE GAME DASHBOARD */}
          {meta.status === "in_progress" ? (
            <div className="space-y-5">
              {/* Live KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Active Players</p>
                      <p className="text-2xl font-black text-foreground">{players.length}</p>
                    </div>
                    <Users className="h-5 w-5 text-primary/70" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Class Accuracy</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {classAccuracy}%
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500/70" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Finished Paper</p>
                      <p className="text-2xl font-black text-foreground">
                        {finishedCount}
                        <span className="text-sm font-semibold text-muted-foreground">
                          /{players.length}
                        </span>
                      </p>
                    </div>
                    <UserCheck className="h-5 w-5 text-sky-500/70" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {remainingSeconds !== null ? "Time Remaining" : "Elapsed Time"}
                      </p>
                      <p className="font-mono text-2xl font-black text-foreground">
                        {remainingSeconds !== null
                          ? formatClock(remainingSeconds)
                          : formatClock(elapsedGameSeconds)}
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-amber-500/70" />
                  </CardContent>
                </Card>
              </div>

              {/* Tab Switcher: Leaderboard vs Heatmap */}
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setHostTab("leaderboard")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                    hostTab === "leaderboard"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  Live Leaderboard
                </button>
                <button
                  type="button"
                  onClick={() => setHostTab("heatmap")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                    hostTab === "heatmap"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Question Heatmap ({totalAnswers} answers)
                </button>
              </div>

              {hostTab === "leaderboard" ? (
                <QuizLiveLeaderboard meta={meta} players={players} showExportCsv />
              ) : (
                <QuizQuestionHeatmap
                  questionNumbers={meta.questionNumbers}
                  questionStats={state?.questionStats ?? {}}
                />
              )}
            </div>
          ) : null}

          {/* HOST FINAL PODIUM & REPORT */}
          {meta.status === "ended" ? (
            <div className="space-y-6">
              <QuizWinnerPodium
                players={players}
                totalQuestions={meta.questionNumbers.length}
              />
              <QuizLiveLeaderboard meta={meta} players={players} showExportCsv />
              <div className="space-y-3">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Question-by-Question Class Breakdown
                </h3>
                <QuizQuestionHeatmap
                  questionNumbers={meta.questionNumbers}
                  questionStats={state?.questionStats ?? {}}
                />
              </div>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  /* ---------------- Student / Player Experience ---------------- */
  // 1. Not joined yet (and quiz is ended -> show public podium)
  if (!mePlayer && meta.status === "ended") {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background touch-manipulation">
        <header className="border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <span>{meta.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/quiz">
              <Button size="sm" variant="outline">Join Another Quiz</Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
          <div className="text-center space-y-1">
            <Badge variant="secondary">Quiz Ended</Badge>
            <h1 className="text-2xl font-black">{meta.title} — Final Standings</h1>
          </div>
          <QuizWinnerPodium players={players} totalQuestions={meta.questionNumbers.length} />
          <QuizLiveLeaderboard meta={meta} players={players} />
        </main>
      </div>
    );
  }

  // 2. Student Join Screen (Nickname + Avatar Picker)
  if (!mePlayer) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-background via-primary/[0.04] to-amber-500/[0.05] touch-manipulation">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Link to="/quiz">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Change PIN
              </Button>
            </Link>
            {isHost ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={switchToHostView}
                className="h-8 text-xs font-semibold"
              >
                Back to Host Board
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs font-bold">
              PIN {formatQuizPin(cleanPin)}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-lg border-2 border-foreground/15 shadow-xl">
            <CardHeader className="text-center pb-3 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                  {meta.level} Level
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {meta.questionNumbers.length} Questions
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Users className="h-3 w-3" />
                  {players.length} joined
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight">{meta.title}</CardTitle>
              <CardDescription className="text-xs">
                Hosted by <strong className="text-foreground">{meta.hostName}</strong> ·{" "}
                {meta.status === "in_progress"
                  ? "Quiz is already live — join now to jump straight in!"
                  : "Pick your nickname & character to enter the lobby."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authLoaded && !currentUser ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Lock className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-foreground">Sign In or Sign Up to Compete</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      You must be signed in with an account to join live quizzes. Your Cambridge MCQ scores, streak bonuses, and diagnostic feedback will be recorded in your student profile.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    <Button asChild size="lg" className="h-11 font-extrabold gap-2 bg-primary text-primary-foreground">
                      <Link to="/auth" search={{ redirect: `/quiz/${cleanPin}` } as any}>
                        <span>Sign In / Create Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="quiz-nickname" className="text-xs font-bold text-foreground">
                    Your Nickname
                  </label>
                  <Input
                    id="quiz-nickname"
                    autoFocus
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Keynes_99 or Sarah"
                    maxLength={32}
                    className="h-11 text-base font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground block">
                    Choose Your Character
                  </span>
                  <div className="grid grid-cols-8 gap-1.5">
                    {QUIZ_AVATARS.map((item) => {
                      const selected = avatar === item.emoji;
                      return (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => setAvatar(item.emoji)}
                          title={item.label}
                          className={cn(
                            "flex h-10 items-center justify-center rounded-xl border-2 text-xl transition-all active:scale-95",
                            selected
                              ? "border-primary bg-primary/15 scale-105 shadow-xs"
                              : "border-border/70 bg-muted/20 hover:border-foreground/40",
                          )}
                        >
                          {item.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={joining || !nickname.trim()}
                  className="w-full h-12 text-base font-extrabold gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Joining Room…
                    </>
                  ) : (
                    <>
                      <span>{avatar}</span>
                      <span>
                        {meta.status === "in_progress" ? "Jump Into Live Quiz" : "Join Waiting Lobby"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 3. Student Waiting Lobby
  if (meta.status === "lobby") {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-background via-emerald-500/[0.04] to-primary/[0.05] touch-manipulation">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-bold gap-1">
              <Check className="h-3 w-3" />
              You&apos;re In!
            </Badge>
            <span className="font-mono text-xs font-bold text-muted-foreground">
              PIN {formatQuizPin(cleanPin)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isHost ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={switchToHostView}
                className="h-8 text-xs font-semibold"
              >
                Host Control Board
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-3xl px-5 py-10 flex flex-col items-center justify-center text-center space-y-8">
          <div className="space-y-3">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-primary bg-primary/10 text-5xl shadow-lg animate-bounce">
              {mePlayer.avatar}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Welcome, {mePlayer.name}!
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Waiting for <strong className="text-foreground">{meta.hostName}</strong> to start{" "}
              <strong className="text-foreground">{meta.title}</strong> ({meta.questionNumbers.length}{" "}
              questions). Look up at the screen — the paper starts automatically!
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Waiting for teacher to press Start…</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Classmates in Lobby ({players.length})
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-2xs",
                    p.id === mePlayer.id
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  <span className="text-lg">{p.avatar}</span>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 4. Countdown overlay (3 - 2 - 1 - GO!)
  if (countdown !== null) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-background to-emerald-500/15 p-6 text-center touch-manipulation">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Get Ready — {meta.title}
        </p>
        <div className="text-8xl sm:text-9xl font-black text-primary animate-in zoom-in-75 duration-200">
          {countdown > 0 ? countdown : "GO!"}
        </div>
      </div>
    );
  }

  // 5. Student Finished Paper OR Quiz Ended -> Live Results & Podium
  if (meta.status === "ended" || mePlayer.finished) {
    const totalQ = Math.max(1, meta.questionNumbers.length);
    const accuracy = Math.round((mePlayer.correctCount / totalQ) * 100);

    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-background via-amber-500/[0.03] to-muted/20 touch-manipulation">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm px-5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{mePlayer.avatar}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{meta.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {meta.status === "ended" ? "Final Results" : "Paper Complete — Live Standings"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={switchToHostView}
                className="h-8 text-xs font-semibold"
              >
                Host Board
              </Button>
            ) : null}
            <Link to="/mcq-live">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                MCQ Live
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-6">
          {/* Personal Summary Banner */}
          <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/[0.07] via-background to-emerald-500/[0.07]">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/40 bg-background text-3xl shadow-xs">
                  {mePlayer.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-black text-foreground">
                      {mePlayer.name}
                    </h1>
                    {myRank ? (
                      <Badge className="bg-amber-500 text-amber-950 font-black text-xs">
                        Rank #{myRank} / {players.length}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {meta.status === "in_progress"
                      ? "Leaderboard updates automatically as your classmates finish!"
                      : "Quiz completed! Great work."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-center">
                <div>
                  <p className="font-mono text-2xl font-black text-primary">
                    {mePlayer.score.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Score</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {mePlayer.correctCount}/{totalQ}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    {accuracy}% Right
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                    <Flame className="h-5 w-5" />
                    {mePlayer.bestStreak}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <QuizWinnerPodium
            players={players}
            totalQuestions={totalQ}
            highlightPlayerId={mePlayer.id}
          />

          <QuizLiveLeaderboard
            meta={meta}
            players={players}
            highlightPlayerId={mePlayer.id}
          />

          {/* Quick Question-by-Question Review Strip */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border/70">
              <CardTitle className="text-sm font-bold">Your Question Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-wrap gap-2">
              {meta.questionNumbers.map((qNum) => {
                const ans = mePlayer.answers?.[qNum];
                return (
                  <div
                    key={qNum}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono font-bold",
                      !ans
                        ? "border-border bg-muted/40 text-muted-foreground"
                        : ans.correct
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                    )}
                  >
                    <span>Q{qNum}</span>
                    {ans ? (
                      <>
                        <span>{ans.selected}</span>
                        {ans.correct ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[10px]">
                            &rarr; {ans.correctAnswer ?? "?"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 6. Active Whole-Paper Live Quiz Gameplay!
  return (
    <StudentLiveGameplayView
      cleanPin={cleanPin}
      meta={meta}
      players={players}
      mePlayer={mePlayer}
      myRank={myRank}
      remainingSeconds={remainingSeconds}
      isHost={isHost}
      onBackToHostBoard={switchToHostView}
      submitAnswerFn={submitAnswerFn}
      finishPlayerFn={finishPlayerFn}
      fetchPdfFn={fetchPdfFn}
      usePowerUpFn={usePowerUpFn}
      broadcastPowerUp={broadcastPowerUp}
      onStateMutated={async () => {
        broadcastSync();
        await quizQuery.refetch();
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                     Student Whole-Paper Live Gameplay                      */
/* -------------------------------------------------------------------------- */

function StudentLiveGameplayView({
  cleanPin,
  meta,
  players,
  mePlayer,
  myRank,
  remainingSeconds,
  isHost,
  onBackToHostBoard,
  submitAnswerFn,
  finishPlayerFn,
  fetchPdfFn,
  usePowerUpFn,
  broadcastPowerUp,
  onStateMutated,
}: {
  cleanPin: string;
  meta: McqQuizPublicState["meta"];
  players: QuizPlayer[];
  mePlayer: QuizPlayer;
  myRank: number | null;
  remainingSeconds: number | null;
  isHost: boolean;
  onBackToHostBoard: () => void;
  submitAnswerFn: ReturnType<typeof useServerFn<typeof submitQuizAnswer>>;
  finishPlayerFn: ReturnType<typeof useServerFn<typeof finishQuizPlayer>>;
  fetchPdfFn: ReturnType<typeof useServerFn<typeof fetchQuizPaperPdf>>;
  usePowerUpFn: ReturnType<typeof useServerFn<typeof useQuizPowerUp>>;
  broadcastPowerUp: (event: QuizGameEvent) => void;
  onStateMutated: () => Promise<void>;
}) {
  const isGameMode = meta.gameMode === "live_race";
  const questionNumbers = meta.questionNumbers;
  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    const firstUnansweredIdx = questionNumbers.findIndex((n) => !mePlayer.answers?.[n]);
    return firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0;
  });

  const currentNumber = questionNumbers[currentIdx] ?? questionNumbers[0] ?? 1;
  const [showFullPage, setShowFullPage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [calcOpen, setCalcOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const explainAnswerFn = useServerFn(explainMcqAnswer);
  const [explainingQuestion, setExplainingQuestion] = useState(false);

  // Power-up game mechanics
  const [usingPowerUpId, setUsingPowerUpId] = useState<string | null>(null);
  const [targetPickerPowerUp, setTargetPickerPowerUp] = useState<QuizPowerUp | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<number, Set<QuizLetter>>>({});

  // Clock for freeze check & answer timing
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const isFrozen = Boolean(mePlayer.frozenUntil && mePlayer.frozenUntil > nowMs);
  const freezeRemaining = isFrozen ? Math.ceil((mePlayer.frozenUntil! - nowMs) / 1000) : 0;

  // Per-question stopwatch for speed bonus calculation
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<
    Record<number, LastAnswerFeedback>
  >({});

  // Render real Cambridge PDF slices ONCE for library_paper / topical_paper
  const [renderedPdf, setRenderedPdf] = useState<RenderedQuizPaper | null>(null);
  const [pdfProgress, setPdfProgress] = useState<string | null>(
    meta.sourceType === "custom_questions" ? null : "Loading Cambridge question paper…",
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfReloadSeq, setPdfReloadSeq] = useState(0);

  const fetchPdfFnRef = useRef(fetchPdfFn);
  fetchPdfFnRef.current = fetchPdfFn;

  const questionNumbersKey = meta.questionNumbers.join(",");
  const maxPdfQuestion = useMemo(
    () => Math.max(...meta.questionNumbers, 30),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionNumbersKey],
  );

  useEffect(() => {
    if (meta.sourceType === "custom_questions") return;
    let cancelled = false;
    setPdfProgress("Loading official Cambridge paper…");
    setPdfError(null);

    void renderQuizPdfPaper({
      sourceType: meta.sourceType,
      paperId: meta.paperId,
      qpUrl: meta.qpUrl,
      maxQuestionNumber: maxPdfQuestion,
      proxyFetchBase64: async (url) => {
        const res = await fetchPdfFnRef.current({ data: { pin: cleanPin, qpUrl: url } });
        return res.base64;
      },
      onProgress: (label) => {
        if (!cancelled) setPdfProgress(label);
      },
    })
      .then((built) => {
        if (!cancelled) {
          setRenderedPdf(built);
          setPdfProgress(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPdfError(err instanceof Error ? err.message : "Could not load the PDF paper.");
          setPdfProgress(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [meta.sourceType, meta.paperId, meta.qpUrl, maxPdfQuestion, cleanPin, pdfReloadSeq]);

  // Reset per-question timer whenever active question changes
  const existingAnswer = mePlayer.answers?.[currentNumber];
  const localFeedback = feedbackByQuestion[currentNumber];
  const isAnswered = Boolean(existingAnswer || localFeedback);

  useEffect(() => {
    setShowFullPage(false);
    setZoomLevel(100);
    setQuestionElapsed(0);
  }, [currentNumber]);

  useEffect(() => {
    if (isAnswered || isFrozen) return;
    const id = window.setInterval(() => {
      setQuestionElapsed((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isAnswered, isFrozen]);

  // Resolve current PDF slice or full page image
  const sliceCanvas = renderedPdf?.questionSlices?.[currentNumber] ?? null;
  const pageNum = renderedPdf?.questionPages?.[currentNumber] ?? 1;
  const fullPageCanvas = useMemo(() => {
    if (!renderedPdf) return null;
    return (
      renderedPdf.pages.find((p) => p.pageNumber === pageNum)?.canvas ??
      renderedPdf.pages[0]?.canvas ??
      null
    );
  }, [renderedPdf, pageNum]);

  const displayedCanvas = !showFullPage && sliceCanvas ? sliceCanvas : fullPageCanvas;
  const displayedDataUrl = useMemo(() => {
    if (!displayedCanvas) return null;
    try {
      return displayedCanvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [displayedCanvas]);

  const customQuestion =
    meta.sourceType === "custom_questions"
      ? meta.customQuestions?.find((q) => q.number === currentNumber) ?? null
      : null;

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < questionNumbers.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIdx((i) => Math.min(questionNumbers.length - 1, i + 1));
    } else {
      const anyUnanswered = questionNumbers.findIndex(
        (n) => !mePlayer.answers?.[n] && !feedbackByQuestion[n],
      );
      if (anyUnanswered >= 0) {
        setCurrentIdx(anyUnanswered);
      }
    }
  }, [hasNext, questionNumbers, mePlayer.answers, feedbackByQuestion]);

  const activeQuestionBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeQuestionBtnRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentIdx]);

  const handleAnswer = useCallback(
    async (letter: QuizLetter) => {
      if (submitting || isAnswered || isFrozen) return;
      setSubmitting(true);
      try {
        const res = await submitAnswerFn({
          data: {
            pin: cleanPin,
            playerId: mePlayer.id,
            questionNumber: currentNumber,
            selectedLetter: letter,
            elapsedSeconds: questionElapsed,
          },
        });
        setFeedbackByQuestion((prev) => ({
          ...prev,
          [currentNumber]: {
            questionNumber: currentNumber,
            selected: letter,
            isCorrect: res.isCorrect,
            correctAnswer: res.correctAnswer,
            pointsEarned: res.pointsEarned,
            basePoints: res.basePoints,
            speedBonus: res.speedBonus,
            streakBonus: res.streakBonus,
            rank: res.rank,
            totalPlayers: res.totalPlayers,
            explanation: res.explanation,
          },
        }));

        if (meta.showInstantFeedback) {
          if (res.isCorrect) {
            const multTag = (res as any).multiplier > 1 ? " ⚡ 2X MULTIPLIER!" : "";
            toast.success(
              `+${res.pointsEarned} pts!${multTag}${res.player.currentStreak >= 2 ? ` 🔥 ${res.player.currentStreak} streak!` : ""}`,
            );
          }
        }

        if ((res as any).earnedPowerUp) {
          const pw = (res as any).earnedPowerUp as QuizPowerUp;
          toast.success(`🎁 Earned ${pw.icon} ${pw.title}! Check your Power-Up rack.`, {
            duration: 4000,
          });
        }

        await onStateMutated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not submit answer.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      isAnswered,
      isFrozen,
      submitAnswerFn,
      cleanPin,
      mePlayer.id,
      currentNumber,
      questionElapsed,
      meta.showInstantFeedback,
      onStateMutated,
    ],
  );

  async function handleFinishPaper() {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishPlayerFn({ data: { pin: cleanPin, playerId: mePlayer.id } });
      await onStateMutated();
      toast.success("Paper submitted! Check the live podium.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish quiz.");
    } finally {
      setFinishing(false);
    }
  }

  // On-demand explanation fetch if pre-cached explanation was missing
  async function handleRequestExplanation(
    qNum: number,
    correctAns: QuizLetter,
    userAnswer: QuizLetter | null,
  ) {
    if (explainingQuestion) return;
    setExplainingQuestion(true);
    try {
      const res = await explainAnswerFn({
        data: {
          paperId: meta.paperId ?? undefined,
          level: meta.level,
          number: qNum,
          correctAnswer: correctAns,
          userAnswer,
          stemText: customQuestion?.stem || "",
        },
      });
      if (res?.explanation) {
        setFeedbackByQuestion((prev) => ({
          ...prev,
          [qNum]: {
            ...(prev[qNum] ?? {
              questionNumber: qNum,
              selected: userAnswer ?? ("A" as QuizLetter),
              isCorrect: userAnswer === correctAns,
              correctAnswer: correctAns,
              pointsEarned: 0,
              basePoints: 0,
              speedBonus: 0,
              streakBonus: 0,
              rank: 1,
              totalPlayers: players.length,
            }),
            explanation: res.explanation,
          },
        }));
        toast.success("Examiner explanation loaded!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate explanation.");
    } finally {
      setExplainingQuestion(false);
    }
  }

  // Handle Power-Up Activation
  async function handleActivatePowerUp(powerUp: QuizPowerUp, targetPlayerId?: string) {
    if (usingPowerUpId || isFrozen) return;

    setUsingPowerUpId(powerUp.id);
    try {
      const res = await usePowerUpFn({
        data: {
          pin: cleanPin,
          playerId: mePlayer.id,
          powerUpId: powerUp.id,
          targetPlayerId,
          questionNumber: currentNumber,
        },
      });

      if (res.eliminatedOptions && Array.isArray(res.eliminatedOptions) && res.eliminatedOptions.length > 0) {
        const qNum = res.questionNumber ?? currentNumber;
        setEliminatedOptions((prev) => ({
          ...prev,
          [qNum]: new Set(res.eliminatedOptions as QuizLetter[]),
        }));
      }

      broadcastPowerUp(res.event);
      if (res.event.blocked) {
        toast.warning(res.event.description);
      } else {
        toast.success(res.event.description);
      }
      setTargetPickerPowerUp(null);
      await onStateMutated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not activate power-up.");
    } finally {
      setUsingPowerUpId(null);
    }
  }

  function handlePowerUpClick(powerUp: QuizPowerUp) {
    if (powerUp.type === "steal" || powerUp.type === "swap" || powerUp.type === "freeze") {
      setTargetPickerPowerUp(powerUp);
    } else {
      void handleActivatePowerUp(powerUp);
    }
  }

  // Keyboard shortcuts: A/B/C/D or 1-4 to pick answer, Enter/RightArrow for Next
  useEffect(() => {
    if (calcOpen || leaderboardOpen || targetPickerPowerUp !== null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (!isAnswered && !isFrozen) {
        const eliminated = eliminatedOptions[currentNumber] ?? new Set();
        if ((key === "A" || key === "1") && !eliminated.has("A")) void handleAnswer("A");
        else if ((key === "B" || key === "2") && !eliminated.has("B")) void handleAnswer("B");
        else if ((key === "C" || key === "3") && !eliminated.has("C")) void handleAnswer("C");
        else if ((key === "D" || key === "4") && !eliminated.has("D")) void handleAnswer("D");
      } else if (e.key === "Enter" && hasNext) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowRight" && hasNext) setCurrentIdx((i) => i + 1);
      if (e.key === "ArrowLeft" && hasPrev) setCurrentIdx((i) => i - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    calcOpen,
    leaderboardOpen,
    targetPickerPowerUp,
    isAnswered,
    isFrozen,
    eliminatedOptions,
    currentNumber,
    handleAnswer,
    hasNext,
    hasPrev,
    goNext,
  ]);

  const answeredCount = Math.max(
    mePlayer.answeredCount,
    Object.keys({ ...mePlayer.answers, ...feedbackByQuestion }).length,
  );
  const progressPct = Math.round((answeredCount / Math.max(1, questionNumbers.length)) * 100);
  const inventory = Array.isArray(mePlayer.inventory) ? mePlayer.inventory : [];
  const currentEliminated = eliminatedOptions[currentNumber] ?? new Set<QuizLetter>();

  // Filter rivals for target attacks
  const rivals = useMemo(
    () => players.filter((p) => p.id !== mePlayer.id),
    [players, mePlayer.id],
  );

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-background via-muted/15 to-background overflow-x-hidden w-full select-none touch-manipulation">
      {/* Top HUD (Responsive across iPhone, iPad, Desktop) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-5 py-2.5 shadow-2xs">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
          {/* Left Player Seat */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">{mePlayer.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                  {mePlayer.name}
                </span>
                {myRank ? (
                  <Badge className="bg-amber-500 text-amber-950 font-black text-[10px] py-0 px-1.5 shrink-0">
                    #{myRank} / {players.length}
                  </Badge>
                ) : null}
                {isGameMode ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-extrabold uppercase py-0 px-1 hidden md:inline-flex">
                    Arena
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 hidden md:inline-flex">
                    Exam
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                {meta.title}
              </p>
            </div>
          </div>

          {/* Center Badges (Score + Streak + Buffs + Timer) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            <div className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs font-black text-primary shadow-2xs">
              <Trophy className="h-3.5 w-3.5" />
              <span>{mePlayer.score.toLocaleString()} pts</span>
            </div>

            {mePlayer.currentStreak >= 1 ? (
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 font-mono text-xs font-black text-amber-700 dark:text-amber-300">
                <Flame className="h-3.5 w-3.5" />
                <span>{mePlayer.currentStreak}</span>
              </div>
            ) : null}

            {mePlayer.activeShield ? (
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-black text-sky-700 dark:text-sky-300 animate-pulse"
                title="Central Bank Shield protects against next attack"
              >
                <Shield className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Shielded</span>
              </div>
            ) : null}

            {mePlayer.activeMultiplier === 2 ? (
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 animate-pulse"
                title="Next correct answer yields 2x double points"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>2x Boost</span>
              </div>
            ) : null}

            {remainingSeconds !== null ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-xs font-bold",
                  remainingSeconds <= 60
                    ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
                    : "border-border bg-muted/40 text-foreground",
                )}
              >
                <Clock className="h-3 w-3" />
                {formatClock(remainingSeconds)}
              </div>
            ) : null}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {meta.showLiveLeaderboard ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLeaderboardOpen(true)}
                className="h-8 gap-1 text-xs font-bold px-2 sm:px-2.5"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Live Rank</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={calcOpen ? "default" : "outline"}
              onClick={() => setCalcOpen((v) => !v)}
              className="h-8 px-2 text-xs gap-1"
              title="Cambridge Economics Calculator"
            >
              <CalculatorIcon className="h-3.5 w-3.5" />
            </Button>
            {isHost ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onBackToHostBoard}
                className="h-8 text-xs font-semibold px-2"
              >
                Host
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={finishing}
              onClick={handleFinishPaper}
              className="h-8 text-xs font-bold gap-1 px-2.5"
            >
              <Flag className="h-3 w-3" />
              <span className="hidden sm:inline">Finish</span>
            </Button>
          </div>
        </div>

        {/* Paper Progress Strip */}
        <div className="mx-auto max-w-6xl mt-2 flex items-center gap-2">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0">
            {answeredCount}/{questionNumbers.length} ({progressPct}%)
          </span>
        </div>
      </header>

      {/* Live Action Ticker for Game Arena Mode */}
      {isGameMode && meta.recentEvents && meta.recentEvents.length > 0 ? (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.07] px-3 py-1.5">
          <div className="mx-auto max-w-6xl flex items-center gap-2 overflow-x-auto text-[11px] font-semibold text-foreground/90">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Zap className="h-3 w-3 fill-current" />
              Arena Feed:
            </span>
            <div className="flex items-center gap-3 min-w-max">
              {meta.recentEvents.slice(0, 3).map((ev) => (
                <span
                  key={ev.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                    ev.blocked
                      ? "bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30"
                      : "bg-background/80 border border-border/60",
                  )}
                >
                  <span>{ev.description}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Workspace (Optimized for iPad Portrait, Landscape & Mobile) */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Question Navigator Number Bar & Quick Stepper (Clean, No Scrollbar, Compact) */}
        <div className="flex items-center gap-1.5 w-full">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasPrev}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="h-7 w-7 p-0 shrink-0 touch-manipulation rounded-md"
            title="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
            <div className="flex items-center gap-1 min-w-max">
              {questionNumbers.map((qNum, idx) => {
                const rec = mePlayer.answers?.[qNum] ?? feedbackByQuestion[qNum];
                const isCurrent = idx === currentIdx;
                const recCorrect = rec
                  ? "isCorrect" in rec
                    ? rec.isCorrect
                    : rec.correct
                  : null;

                return (
                  <button
                    key={qNum}
                    ref={isCurrent ? activeQuestionBtnRef : undefined}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "h-7 min-w-[1.75rem] px-1 rounded-md font-mono text-[11px] font-bold border transition-all shrink-0 active:scale-95 touch-manipulation",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
                        : recCorrect === true && meta.showInstantFeedback
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : recCorrect === false && meta.showInstantFeedback
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : rec
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>

          {hasNext ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={goNext}
              className="h-7 px-2.5 text-xs font-bold shrink-0 gap-1 touch-manipulation shadow-xs rounded-md"
              title="Next question"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={finishing}
              onClick={handleFinishPaper}
              className="h-7 px-2.5 text-xs font-bold shrink-0 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-md touch-manipulation"
              title="Finish paper"
            >
              <span>Finish</span>
              <Trophy className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* POWER-UP INVENTORY RACK (Game Arena Mode Only) */}
        {isGameMode ? (
          <div className="rounded-xl border-2 border-amber-500/35 bg-gradient-to-r from-amber-500/[0.08] via-background to-amber-500/[0.05] p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-foreground flex items-center gap-1">
                  ⚡ Power-Up Arsenal ({inventory.length}/3)
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Answer correctly to earn game-changing power-ups!
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-700 dark:text-amber-300">
                Steal · Swap · Tax · Shield · 2x · Freeze
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[0, 1, 2].map((slotIdx) => {
                const item = inventory[slotIdx];
                if (!item) {
                  return (
                    <div
                      key={slotIdx}
                      className="flex items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground"
                    >
                      <span className="text-[11px] font-medium opacity-70">
                        Slot {slotIdx + 1}: Empty (Earn on correct answer)
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border-2 border-amber-500/50 bg-background/95 p-2.5 shadow-2xs transition-all hover:border-amber-500"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={usingPowerUpId === item.id || isFrozen}
                      onClick={() => handlePowerUpClick(item)}
                      className="h-7 px-3 text-[11px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-amber-950 shrink-0 shadow-2xs"
                    >
                      {usingPowerUpId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "USE"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 2-Column Responsive Layout (iPad Landscape: Side-by-Side | iPad Portrait: Stacked 2x2) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,410px)] gap-4 sm:gap-5 items-start">
          {/* LEFT: Cambridge Question Display (with iPad zoom controls) */}
          <div className="min-w-0 space-y-3">
            <Card className="overflow-hidden border-2 border-border shadow-sm">
              <CardHeader className="py-2 px-3 sm:px-4 border-b border-border/70 bg-muted/25 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="font-mono font-black text-xs">
                    Question {currentNumber}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    ({currentIdx + 1} of {questionNumbers.length})
                  </span>
                </div>

                {/* Question Toolbar (Direct Stepper + Fullpage Toggle) */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-1 border-r border-border/60 pr-1 sm:pr-1.5 mr-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!hasPrev}
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                      className="h-7 px-1.5 sm:px-2 text-xs gap-1"
                      title="Previous question"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </Button>
                    {hasNext ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={goNext}
                        className="h-7 px-2 sm:px-2.5 text-xs font-bold gap-1 shadow-xs"
                        title="Next question"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={finishing}
                        onClick={handleFinishPaper}
                        className="h-7 px-2 sm:px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        title="Finish paper"
                      >
                        <span>Finish</span>
                        <Trophy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {meta.sourceType !== "custom_questions" && sliceCanvas ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFullPage((v) => !v)}
                      className="h-7 px-2 text-[11px] gap-1"
                    >
                      {showFullPage ? (
                        <>
                          <Minimize2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Crop</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Full Page</span>
                        </>
                      )}
                    </Button>
                  ) : null}

                  {/* Diagram Zoom Controls */}
                  {displayedDataUrl ? (
                    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(100, z - 25))}
                        disabled={zoomLevel <= 100}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-mono text-[10px] font-bold text-muted-foreground">
                        {zoomLevel}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                        disabled={zoomLevel >= 200}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </button>
                      {zoomLevel !== 100 ? (
                        <button
                          type="button"
                          onClick={() => setZoomLevel(100)}
                          className="rounded p-1 text-primary hover:text-primary/80"
                          title="Reset Zoom"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <Badge variant="outline" className="font-mono text-[10px] gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatClock(questionElapsed)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3 sm:p-5">
                {meta.sourceType === "custom_questions" ? (
                  customQuestion ? (
                    <div className="space-y-4">
                      {customQuestion.topic ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {customQuestion.topic}
                        </Badge>
                      ) : null}
                      <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground whitespace-pre-line">
                        {customQuestion.stem}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Question not found.</p>
                  )
                ) : pdfProgress ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground">{pdfProgress}</p>
                  </div>
                ) : pdfError ? (
                  <div className="py-12 text-center space-y-3 text-destructive text-xs">
                    <XCircle className="h-6 w-6 mx-auto" />
                    <p>{pdfError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPdfReloadSeq((s) => s + 1)}
                    >
                      Retry Loading Paper
                    </Button>
                  </div>
                ) : displayedDataUrl ? (
                  <div className="rounded-lg border border-border/60 bg-white p-2 overflow-auto max-h-[55vh] sm:max-h-[62vh]">
                    <img
                      src={displayedDataUrl}
                      alt={`Question ${currentNumber}`}
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: "top left",
                      }}
                      className="w-full h-auto block select-none transition-transform duration-150"
                    />
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-60" />
                    Rendering Question {currentNumber}…
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Answer Dock with Frost Freeze Overlay and iPad 2x2 Grid */}
          <div className="relative min-w-0 space-y-3 sm:space-y-4 lg:sticky lg:top-20">
            {/* FROST OVERLAY (When hit with Liquidity Shock Freeze) */}
            {isFrozen ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-cyan-950/80 backdrop-blur-md border-2 border-cyan-400 p-6 text-center animate-in fade-in zoom-in-95 duration-200 shadow-xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 text-3xl mb-2 animate-bounce">
                  🧊
                </div>
                <h3 className="text-lg font-black text-white tracking-wide">
                  POLICY SHOCK FREEZE!
                </h3>
                <p className="text-xs text-cyan-200 max-w-xs mt-1">
                  A rival player hit you with a liquidity freeze. All inputs are temporarily locked!
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/30 px-5 py-2 text-sm font-mono font-black text-cyan-100 shadow-md">
                  <Snowflake className="h-4 w-4 animate-spin text-cyan-300" />
                  <span>Thawing in {freezeRemaining}s…</span>
                </div>
              </div>
            ) : null}

            {/* Answer Options Card */}
            <Card className="border-2 border-border shadow-sm">
              <CardHeader className="py-2 px-3 sm:px-4 border-b border-border/70 bg-muted/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
                  <span>Select Answer</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-normal whitespace-nowrap hidden sm:inline">
                      Keys: A / B / C / D
                    </span>
                    {hasNext ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer touch-manipulation"
                      >
                        <span>Next Question →</span>
                      </button>
                    ) : null}
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Options Grid: Responsive 2x2 compact grid on all devices */}
              <CardContent className="p-2 sm:p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B", "C", "D"] as QuizLetter[]).map((letter) => {
                    const style = OPTION_STYLES[letter];
                    const pickedLetter = localFeedback?.selected ?? existingAnswer?.selected;
                    const officialLetter =
                      localFeedback?.correctAnswer ?? existingAnswer?.correctAnswer;
                    const isPicked = pickedLetter === letter;
                    const isEliminated = currentEliminated.has(letter);
                    const revealCorrect =
                      isAnswered && meta.showInstantFeedback && officialLetter === letter;
                    const revealWrong =
                      isAnswered &&
                      meta.showInstantFeedback &&
                      isPicked &&
                      officialLetter &&
                      officialLetter !== letter;

                    const optionText = customQuestion?.options?.[letter];

                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={submitting || isAnswered || isFrozen || isEliminated}
                        onClick={() => void handleAnswer(letter)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-all min-h-[42px] sm:min-h-[46px] touch-manipulation select-none active:scale-[0.98]",
                          isEliminated
                            ? "border-border/30 bg-muted/10 opacity-30 line-through cursor-not-allowed"
                            : !isAnswered
                              ? style.idle
                              : revealCorrect
                                ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                                : revealWrong
                                  ? "border-rose-500 bg-rose-500/15"
                                  : isPicked
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 bg-muted/20 opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-black shadow-xs",
                            isEliminated
                              ? "bg-muted text-muted-foreground"
                              : revealCorrect
                                ? "bg-emerald-600 text-white"
                                : revealWrong
                                  ? "bg-rose-600 text-white"
                                  : style.badge,
                          )}
                        >
                          {letter}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                            {optionText || `Option ${letter}`}
                          </p>
                          {isEliminated ? (
                            <span className="text-[9px] font-bold text-destructive block">
                              50/50 Eliminated
                            </span>
                          ) : null}
                        </div>

                        {revealCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : revealWrong ? (
                          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        ) : isPicked ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Instant Feedback, Direct Next Action Bar & Examiner Explanation */}
            {isAnswered ? (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {meta.showInstantFeedback ? (
                  (() => {
                    const isCorrect =
                      localFeedback?.isCorrect ?? existingAnswer?.correct ?? false;
                    const pts = localFeedback?.pointsEarned ?? existingAnswer?.points ?? 0;
                    const correctAns =
                      localFeedback?.correctAnswer ?? existingAnswer?.correctAnswer ?? null;
                    return (
                      <>
                        {/* Result Score Banner */}
                        <div
                          className={cn(
                            "rounded-xl border-2 p-3 sm:p-3.5 space-y-2 shadow-xs",
                            isCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-rose-500/50 bg-rose-500/10",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isCorrect ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                              )}
                              <span className="text-sm sm:text-base font-black text-foreground leading-tight truncate">
                                {isCorrect
                                  ? `Correct! +${pts} pts`
                                  : `Not quite — Mark Scheme is Option ${correctAns ?? "recorded"}`}
                              </span>
                            </div>
                            {localFeedback && isCorrect ? (
                              <Badge className="bg-emerald-600 text-white font-mono text-[10px] sm:text-xs whitespace-nowrap shrink-0">
                                #{localFeedback.rank} / {localFeedback.totalPlayers}
                              </Badge>
                            ) : null}
                          </div>

                          {localFeedback && isCorrect ? (
                            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                              <span className="rounded bg-background/80 px-2 py-0.5 border border-border">
                                +{localFeedback.basePoints} base
                              </span>
                              {localFeedback.speedBonus > 0 ? (
                                <span className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2 py-0.5 inline-flex items-center gap-0.5">
                                  <Zap className="h-3 w-3" />+{localFeedback.speedBonus} speed
                                </span>
                              ) : null}
                              {localFeedback.streakBonus > 0 ? (
                                <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 inline-flex items-center gap-0.5">
                                  <Flame className="h-3 w-3" />+{localFeedback.streakBonus} streak
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {localFeedback?.explanation ? (
                            <QuizThreeLineFeedback
                              explanation={localFeedback.explanation}
                              correctAnswer={correctAns}
                              userAnswer={existingAnswer?.selected ?? localFeedback?.selected}
                              isCorrect={isCorrect}
                            />
                          ) : null}
                        </div>

                        {/* Direct Next Action Bar */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!hasPrev}
                            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                            className="h-11 px-3 touch-manipulation"
                            title="Previous question"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {hasNext ? (
                            <Button
                              type="button"
                              onClick={goNext}
                              className="flex-1 h-11 text-sm font-black gap-2 shadow-sm touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <span>Next Question</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={finishing}
                              onClick={handleFinishPaper}
                              className="flex-1 h-11 text-sm font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm touch-manipulation"
                            >
                              {finishing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trophy className="h-4 w-4" />
                              )}
                              <span>Finish Paper &amp; See Podium</span>
                            </Button>
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <Card className="border-primary/40 bg-primary/5">
                      <CardContent className="p-3 text-xs font-semibold text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Answer locked in! Full results reveal when you finish.
                      </CardContent>
                    </Card>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!hasPrev}
                        onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                        className="h-10 px-3 touch-manipulation"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {hasNext ? (
                        <Button
                          type="button"
                          onClick={goNext}
                          className="flex-1 h-10 text-sm font-extrabold gap-2 shadow-sm touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={finishing}
                          onClick={handleFinishPaper}
                          className="flex-1 h-10 text-sm font-extrabold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm touch-manipulation"
                        >
                          Finish Paper &amp; See Podium
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!hasPrev}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="gap-1 text-xs touch-manipulation h-9"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!hasNext}
                  onClick={goNext}
                  className="gap-1 text-xs font-bold text-foreground touch-manipulation h-9"
                >
                  <span>Skip to Next Question</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky Floating Action Bar for Mobile & iPad - Guarantees Next Question is ALWAYS visible */}
      <div className="lg:hidden sticky bottom-3 z-30 px-3 max-w-lg mx-auto w-full pointer-events-none mt-2">
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border-2 border-border/80 bg-background/95 backdrop-blur-md p-2 shadow-xl ring-1 ring-black/5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasPrev}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="h-9 px-3 text-xs gap-1 font-bold touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </Button>

          <span className="font-mono text-xs font-black text-foreground whitespace-nowrap">
            Q{currentNumber} ({currentIdx + 1}/{questionNumbers.length})
          </span>

          {hasNext ? (
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              className="h-9 px-4 text-xs font-extrabold gap-1.5 shadow-md touch-manipulation"
            >
              <span>Next Question</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={finishing}
              onClick={handleFinishPaper}
              className="h-9 px-4 text-xs font-extrabold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md touch-manipulation"
            >
              {finishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trophy className="h-3.5 w-3.5" />
              )}
              <span>Finish Paper</span>
            </Button>
          )}
        </div>
      </div>

      {/* Target Rival Picker Dialog (For Steal, Swap, and Freeze) */}
      <Dialog
        open={targetPickerPowerUp !== null}
        onOpenChange={(open) => {
          if (!open) setTargetPickerPowerUp(null);
        }}
      >
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{targetPickerPowerUp?.icon}</span>
              <div>
                <DialogTitle className="text-base font-black">
                  Deploy {targetPickerPowerUp?.title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Choose which rival to target with this power-up:
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
            {rivals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No rivals in the room yet! Wait for other classmates to join.
              </p>
            ) : (
              rivals.map((rival, idx) => (
                <button
                  key={rival.id}
                  type="button"
                  disabled={Boolean(usingPowerUpId)}
                  onClick={() => handleActivatePowerUp(targetPickerPowerUp!, rival.id)}
                  className="w-full flex items-center justify-between rounded-xl border-2 border-border/80 bg-card p-3 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98] touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{rival.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-foreground truncate">
                          {rival.name}
                        </span>
                        {rival.activeShield ? (
                          <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[9px] py-0 px-1 border-sky-500/30 gap-0.5">
                            <Shield className="h-2.5 w-2.5" />
                            Shielded
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        #{idx + 1} on board
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-black text-primary block">
                      {rival.score.toLocaleString()} pts
                    </span>
                    <span className="text-[10px] font-semibold text-primary underline">
                      Attack &rarr;
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Slide-over Live Leaderboard Sheet for Students */}
      <Sheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-base font-black">
              <Trophy className="h-5 w-5 text-amber-500" />
              Live Class Race
            </SheetTitle>
          </SheetHeader>
          <QuizLiveLeaderboard
            meta={meta}
            players={players}
            highlightPlayerId={mePlayer.id}
            compact
          />
        </SheetContent>
      </Sheet>

      <McqCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}

function QuizThreeLineFeedback({
  explanation,
  correctAnswer,
  userAnswer,
  isCorrect,
}: {
  explanation: McqExplanationResult;
  correctAnswer: string | null;
  userAnswer?: string | null;
  isCorrect: boolean;
}) {
  const formatted = useMemo(
    () =>
      formatThreeLineMcqFeedback({
        explanation,
        correctAnswer,
        userAnswer,
        isCorrect,
      }),
    [explanation, correctAnswer, userAnswer, isCorrect],
  );

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-border/70 bg-background/85 p-2.5 text-left text-xs">
      <div className="flex items-start gap-1.5">
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold py-0 px-1 shrink-0"
        >
          {formatted.line1.badge}
        </Badge>
        <p className="text-[11px] text-foreground/90 font-medium leading-snug">
          {formatted.line1.text}
        </p>
      </div>

      {formatted.line2.text ? (
        <div className="flex items-start gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] font-bold py-0 px-1 shrink-0",
              isCorrect
                ? "bg-muted text-muted-foreground border-border/70"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
            )}
          >
            {formatted.line2.badge}
          </Badge>
          <p className="text-[11px] text-foreground/85 leading-snug">
            {formatted.line2.text}
          </p>
        </div>
      ) : null}

      {formatted.line3.text ? (
        <div className="flex items-start gap-1.5">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-bold py-0 px-1 shrink-0"
          >
            {formatted.line3.badge}
          </Badge>
          <p className="text-[11px] text-foreground/85 leading-snug">
            {formatted.line3.text}
          </p>
        </div>
      ) : null}
    </div>
  );
}
