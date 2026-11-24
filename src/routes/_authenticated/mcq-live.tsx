import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Calculator as CalculatorIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Flag,
  Gamepad2,
  History,
  Layers,
  LayoutGrid,
  Loader2,
  Pencil,
  Play,
  Search,
  Shield,
  Sparkles,
  Target,
  Timer as TimerIcon,
  Trash2,
  TrendingUp,
  Users,
  Landmark,
  Globe,
  ArrowRightLeft,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { McqQuizArenaTab } from "@/components/app/mcq-quiz-arena-tab";
import { McqQuizHostModal } from "@/components/app/mcq-quiz-host-modal";
import { normalizeQuizPin, type QuizSourceType } from "@/lib/mcq-quiz.types";
import { PageHeader } from "@/components/app/app-shell";
import { CompactProgressBar, type ProgressStage } from "@/components/app/grading-progress";
import { McqCalculator } from "@/components/app/mcq-calculator";
import {
  ExamLockdownPromptDialog,
  ExamViolationOverlay,
  ExamToolbarControl,
  ExamIntegrityReport,
  requestExamFullscreen,
  exitExamFullscreen,
  isExamFullscreenActive,
  type ExamViolation,
  type ExamViolationType,
} from "@/components/app/mcq-sat-lockdown";
import { getMe } from "@/lib/account.functions";
import {
  McqReviewPanel,
  McqQuestionReviewList,
  McqDomainBreakdown,
  McqMistakeLedger,
  SubmitGradingDialog,
  buildTopicStatsFromQuestions,
  type ExplanationState,
  type TopicStat,
  type GradedQuestion,
} from "@/components/app/mcq-review-panel";
import { McqTutorMode } from "@/components/app/mcq-tutor-mode";
import { type McqMistakeType } from "@/lib/mcq-mistakes";
import { Badge as UiBadge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  classifyMcqTopics,
  explainMcqAnswer,
  fetchPaperPdf,
  getMcqTopicPerformance,
  getMyPaperHistory,
  getPdfMcqAttempt,
  submitPdfMcqAttempt,
  type PaperHistoryEntry,
} from "@/lib/mcq-pdf.functions";
import { listMcqPapers, getMcqPaperAnswerKey } from "@/lib/mcq-papers.functions";
import {
  loadPdfjs,
  extractQuestionSpans,
  cropQuestionSliceCanvas,
  type PdfTextItem,
  type QuestionPageSpan,
  type StemBlob,
} from "@/lib/mcq-pdf-text";
import {
  aggregateMcqDomains,
  aggregateMcqDomainsFromTopicStats,
  classifyMcqQuestion,
  type DomainStat,
} from "@/lib/mcq-domain";
import {
  TOPICAL_MCQ_PAPERS,
  getTopicalPaperById,
  renderTopicalPaperPages,
  toMcqPaperSummaryFromTopical,
  type TopicalMcqPaper,
} from "@/lib/topical-mcq-papers";
import { cn } from "@/lib/utils";
import { generateInstantMcqDiagnostic } from "@/lib/mcq/mcq-feedback-format";

/** Fixed render scale for the plain page image — no positions are computed
 *  against it (there's no overlay anymore), it's purely how big/sharp the
 *  page looks on screen. */
const RENDER_SCALE = 1.6;

// Optional paperId prefill lets a paper-library link start a specific paper.
// Direct navigation still opens the library picker.
const mcqLiveSearchSchema = z
  .object({
    paperId: z.string().optional().catch(undefined),
    paper: z.string().optional().catch(undefined),
    topic: z.string().optional().catch(undefined),
    mode: z.enum(["full_paper", "question_by_question"]).optional().catch(undefined),
    quiz: z.string().optional().catch(undefined),
    pin: z.string().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/mcq-live")({
  validateSearch: (search: Record<string, unknown>) => mcqLiveSearchSchema.parse(search),
  component: McqLivePage,
});

/* -------------------------------------------------------------------- */
/* Types                                                                  */
/* -------------------------------------------------------------------- */

type Letter = "A" | "B" | "C" | "D";
type Level = "as" | "a2";
type PracticeMode = "full_paper" | "question_by_question";

/**
 * Real Cambridge IGCSE 0455 paper timings — Paper 1 (AS) is 1 hour, Paper 1
 * (IGCSE 0455) is 1 hour 15. Mirrors PAPER_DURATION_SECONDS in
 * src/lib/mcq/mcq.server.ts (kept local here rather than imported since
 * that file is server-side and only ever dynamically imported from
 * handlers elsewhere in this codebase — this constant must stay in sync
 * with it by hand).
 */
const PAPER_DURATION_SECONDS: Record<Level, number> = {
  as: 60 * 60,
  a2: 75 * 60,
};

const LOW_TIME_WARNING_SECONDS = 5 * 60;
const MCQ_DRAFT_VERSION = 1;
const MCQ_ACTIVE_VERSION = 1;
export const MCQ_DRAFT_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

type McqDraft = {
  version: number;
  paperId: string;
  paperTitle?: string;
  level?: Level;
  practiceMode?: PracticeMode;
  answers: Record<number, Letter>;
  flagged?: number[];
  checkedQuestions?: number[];
  mistakeTypes?: Record<number, McqMistakeType>;
  eliminatedOptions?: Record<number, Letter[]>;
  questionTimes?: Record<number, number>;
  activeQuestion?: number;
  gradeOnlyAttempted?: boolean;
  timeLeft: number | null;
  savedAt: number;
};

function mcqDraftKey(userId: string, paperId: string) {
  const safeUser = userId || "guest";
  return `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.${paperId}`;
}

function mcqActiveKey(userId: string) {
  const safeUser = userId || "guest";
  return `marginal.mcq-active.v${MCQ_ACTIVE_VERSION}.${safeUser}`;
}

function readActiveMcqPaper(userId: string): string | null {
  const safeUser = userId || "guest";
  try {
    const raw = window.localStorage.getItem(mcqActiveKey(safeUser));
    if (raw) {
      const value = JSON.parse(raw) as { version: number; paperId: string; savedAt?: number };
      if (value.version === MCQ_ACTIVE_VERSION && value.paperId) {
        const draft = readMcqDraft(safeUser, value.paperId);
        if (draft) return value.paperId;
      }
    }
  } catch {}

  // Fallback: search for any active, unexpired draft for this user
  try {
    const prefix = `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.`;
    let latestPaperId: string | null = null;
    let latestSavedAt = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const paperId = key.slice(prefix.length);
        const draft = readMcqDraft(safeUser, paperId);
        if (draft && draft.savedAt > latestSavedAt) {
          latestSavedAt = draft.savedAt;
          latestPaperId = paperId;
        }
      }
    }
    return latestPaperId;
  } catch {
    return null;
  }
}

function readMcqDraft(userId: string, paperId: string): McqDraft | null {
  const safeUser = userId || "guest";
  try {
    const key = mcqDraftKey(safeUser, paperId);
    let raw = window.localStorage.getItem(key);
    if (!raw && safeUser !== "guest") {
      const guestRaw = window.localStorage.getItem(mcqDraftKey("guest", paperId));
      if (guestRaw) {
        raw = guestRaw;
        try {
          window.localStorage.setItem(key, guestRaw);
          window.localStorage.removeItem(mcqDraftKey("guest", paperId));
        } catch {}
      }
    }
    if (!raw) return null;
    const draft = JSON.parse(raw) as McqDraft;
    if (draft.version !== MCQ_DRAFT_VERSION || draft.paperId !== paperId) return null;

    // Auto-expire after 12 hours
    const age = Date.now() - (draft.savedAt || 0);
    if (age > MCQ_DRAFT_EXPIRY_MS) {
      window.localStorage.removeItem(key);
      const activeRaw = window.localStorage.getItem(mcqActiveKey(safeUser));
      if (activeRaw) {
        try {
          const parsed = JSON.parse(activeRaw);
          if (parsed.paperId === paperId) {
            window.localStorage.removeItem(mcqActiveKey(safeUser));
          }
        } catch {}
      }
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function getActiveDraftSummary(userId: string, papers: McqPaperSummary[]): {
  paper: McqPaperSummary;
  draft: McqDraft;
  remainingMs: number;
} | null {
  const activePaperId = readActiveMcqPaper(userId);
  if (!activePaperId) return null;
  const draft = readMcqDraft(userId, activePaperId);
  if (!draft) return null;
  const paper = papers.find((p) => p.id === activePaperId);
  if (!paper) return null;
  const elapsed = Date.now() - (draft.savedAt || 0);
  const remainingMs = Math.max(0, MCQ_DRAFT_EXPIRY_MS - elapsed);
  if (remainingMs <= 0) return null;
  return { paper, draft, remainingMs };
}

export function cleanupExpiredMcqDrafts(userId: string): void {
  const safeUser = userId || "guest";
  try {
    const prefixes = [
      `marginal.mcq-draft.v${MCQ_DRAFT_VERSION}.${safeUser}.`,
      `marginalite_mcq_draft_${safeUser}_`,
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) {
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw);
            if (Date.now() - (draft.savedAt || 0) > MCQ_DRAFT_EXPIRY_MS) {
              toRemove.push(key);
            }
          }
        } catch {
          toRemove.push(key);
        }
      }
    }
    for (const key of toRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function formatRemainingTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(totalSeconds, 0);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Tiered result messaging — a real verdict on how the attempt went, not
 * just a bare score. Used to give the post-mark banner actual weight
 * instead of a subdued one-line readout.
 */
function resultTier(pct: number): {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
} {
  if (pct >= 90)
    return {
      label: "Outstanding!",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      Icon: Award,
    };
  if (pct >= 70)
    return {
      label: "Great work!",
      className: "border-primary/40 bg-primary/10 text-primary",
      Icon: TrendingUp,
    };
  if (pct >= 50)
    return {
      label: "Solid effort — keep going.",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      Icon: CheckCircle2,
    };
  return {
    label: "Tough one — let's review what went wrong.",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: XCircle,
  };
}

type AnnotateTool = "pen" | "eraser";
const ANNOTATE_COLORS = ["#e11d48", "#111827", "#2563eb", "#16a34a"] as const;

// Badge/pill placement is gone entirely — a page is just its rendered
// image. Stem text (for topic tagging + on-demand explanations) is pulled
// separately, straight from the PDF text layer.
type PageImage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/* -------------------------------------------------------------------- */
/* Component                                                             */
/* -------------------------------------------------------------------- */


function McqLivePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const routeContext = Route.useRouteContext() as { user?: { id?: string; email?: string } } | undefined;
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const effectiveUserId = routeContext?.user?.id || me.data?.userId || "guest";
  const [stage, setStage] = useState<"library" | "practice">("library");

  // Sync exam session state to AppShell and CSS to hide conflicting bottom navs
  useEffect(() => {
    if (stage === "practice") {
      document.body.dataset.inExamSession = "true";
    } else {
      delete document.body.dataset.inExamSession;
    }
    window.dispatchEvent(new Event("marginal-exam-state"));
    return () => {
      delete document.body.dataset.inExamSession;
      window.dispatchEvent(new Event("marginal-exam-state"));
    };
  }, [stage]);
  const [libraryTab, setLibraryTab] = useState<"past_papers" | "topical" | "live_quiz" | "analytics">("past_papers");
  const [hostQuizModalOpen, setHostQuizModalOpen] = useState(false);
  const [hostQuizSourceType, setHostQuizSourceType] = useState<QuizSourceType>("library_paper");
  const [hostQuizPaperId, setHostQuizPaperId] = useState<string | null>(null);

  const openHostLiveQuiz = useCallback(
    (sourceType: QuizSourceType = "library_paper", paperId: string | null = null) => {
      setHostQuizSourceType(sourceType);
      setHostQuizPaperId(paperId);
      setHostQuizModalOpen(true);
    },
    [],
  );

  // Support /mcq-live?quiz=849201 or /mcq-live?pin=849201 direct links
  useEffect(() => {
    const rawPin = search.quiz || search.pin;
    if (!rawPin) return;
    const clean = normalizeQuizPin(rawPin);
    if (clean.length === 6) {
      navigate({ to: "/quiz/$pin", params: { pin: clean }, replace: true });
    }
  }, [search.quiz, search.pin, navigate]);
  const [showAttemptDiagnostics, setShowAttemptDiagnostics] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("as");
  const [qCount, setQCount] = useState(30);
  const [paperTitle, setPaperTitle] = useState("Past paper practice");
  const [answerKey, setAnswerKey] = useState<Record<number, Letter>>({});
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const [pages, setPages] = useState<PageImage[]>([]);
  const [questionSlices, setQuestionSlices] = useState<Record<number, HTMLCanvasElement>>({});
  const [stemBlobs, setStemBlobs] = useState<StemBlob[]>([]);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  // ---- Question-by-Question (Tutor & Mistake Diagnostic) Mode state ----
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("full_paper");
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());
  const [mistakeTypes, setMistakeTypes] = useState<Record<number, McqMistakeType>>({});
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<number, Letter[]>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [annotationClearSeq, setAnnotationClearSeq] = useState(0);

  // Autosave status & immediate-persistence tracking
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimerRef = useRef<number | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const flaggedRef = useRef(flagged);
  flaggedRef.current = flagged;
  const practiceModeRef = useRef(practiceMode);
  practiceModeRef.current = practiceMode;
  const checkedQuestionsRef = useRef(checkedQuestions);
  checkedQuestionsRef.current = checkedQuestions;
  const mistakeTypesRef = useRef(mistakeTypes);
  mistakeTypesRef.current = mistakeTypes;
  const eliminatedOptionsRef = useRef(eliminatedOptions);
  eliminatedOptionsRef.current = eliminatedOptions;
  const questionTimesRef = useRef(questionTimes);
  questionTimesRef.current = questionTimes;
  const selectedPaperIdRef = useRef(selectedPaperId);
  selectedPaperIdRef.current = selectedPaperId;
  const paperTitleRef = useRef(paperTitle);
  paperTitleRef.current = paperTitle;
  const levelRef = useRef(level);
  levelRef.current = level;
  const answerKeyRef = useRef(answerKey);
  answerKeyRef.current = answerKey;

  const [graded, setGraded] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [gradeOnlyAttempted, setGradeOnlyAttempted] = useState<boolean>(false);
  const gradeOnlyAttemptedRef = useRef(gradeOnlyAttempted);
  gradeOnlyAttemptedRef.current = gradeOnlyAttempted;
  const [submitPromptOpen, setSubmitPromptOpen] = useState<boolean>(false);

  // ---- Full Screen Proctored Test Mode (Window & Tab Lockdown) ----
  const [examModeActive, setExamModeActive] = useState<boolean>(false);
  const [examPromptOpen, setExamPromptOpen] = useState<boolean>(false);
  const [examViolations, setExamViolations] = useState<ExamViolation[]>([]);
  const [activeViolation, setActiveViolation] = useState<ExamViolation | null>(null);
  const [startInExamMode, setStartInExamMode] = useState<boolean>(false);
  const isLeavingExamModeRef = useRef<boolean>(false);
  const hadExamModeRef = useRef<boolean>(false);

  const handleEnableExamMode = useCallback(async () => {
    isLeavingExamModeRef.current = true;
    const res = await requestExamFullscreen();
    if (res.success) {
      setExamModeActive(true);
      hadExamModeRef.current = true;
      setExamPromptOpen(false);
      setActiveViolation(null);
      toast.success("Full Screen Proctored Test Mode active. Fullscreen locked and window focus monitored.");
    } else {
      toast.error(res.error || "Could not enter full-screen mode. Please allow permissions in browser settings.");
    }
    setTimeout(() => {
      isLeavingExamModeRef.current = false;
    }, 500);
  }, []);

  const handleDisableExamMode = useCallback(async () => {
    isLeavingExamModeRef.current = true;
    setExamModeActive(false);
    setActiveViolation(null);
    await exitExamFullscreen();
    toast.info("Full Screen Test Mode turned off. Returned to standard view.");
    setTimeout(() => {
      isLeavingExamModeRef.current = false;
    }, 500);
  }, []);

  const handleResumeFullscreen = useCallback(async () => {
    isLeavingExamModeRef.current = true;
    const res = await requestExamFullscreen();
    if (res.success) {
      setActiveViolation(null);
      toast.success("Returned to Full Screen Test Mode.");
    } else {
      toast.error(res.error || "Please grant full-screen permission to resume.");
    }
    setTimeout(() => {
      isLeavingExamModeRef.current = false;
    }, 500);
  }, []);

  // Strict anti-cheat monitoring: fullscreen exits, tab switches, blur, contextmenu, clipboard
  useEffect(() => {
    if (!examModeActive || stage !== "practice" || graded) return;

    const triggerViolation = (
      type: ExamViolationType,
      title: string,
      description: string,
    ) => {
      if (isLeavingExamModeRef.current) return;
      setActiveViolation((current) => {
        if (current) return current;
        const newViolation: ExamViolation = {
          id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          timestamp: Date.now(),
          title,
          description,
        };
        setExamViolations((prev) => [...prev, newViolation]);
        return newViolation;
      });
    };

    const handleFullscreenChange = () => {
      if (!isExamFullscreenActive() && !isLeavingExamModeRef.current) {
        triggerViolation(
          "fullscreen_exit",
          "Exited full-screen view",
          "You exited full-screen mode. Please return to full screen to resume your exam.",
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !isLeavingExamModeRef.current) {
        triggerViolation(
          "tab_switch",
          "Switched browser tabs or minimized window",
          "You navigated away from the exam tab. Please return to full screen to resume.",
        );
      }
    };

    const handleWindowBlur = () => {
      if (!isLeavingExamModeRef.current) {
        triggerViolation(
          "window_blur",
          "Window minimized or lost focus",
          "You minimized the window, switched applications, or clicked outside the exam window.",
        );
      }
    };

    // Watchdog interval (100ms) for instantaneous minimize/blur/fullscreen-loss detection
    const watchdogInterval = window.setInterval(() => {
      if (isLeavingExamModeRef.current) return;
      if (!isExamFullscreenActive()) {
        triggerViolation(
          "fullscreen_exit",
          "Exited full-screen view",
          "You exited full-screen mode. Please return to full screen to resume your exam.",
        );
      } else if (document.hidden || document.visibilityState === "hidden") {
        triggerViolation(
          "tab_switch",
          "Window minimized or tab switched",
          "You minimized or navigated away from the exam tab. Please resume full screen.",
        );
      } else if (typeof document.hasFocus === "function" && !document.hasFocus()) {
        triggerViolation(
          "window_blur",
          "Window minimized or lost focus",
          "You switched applications, minimized the browser, or clicked outside the exam window.",
        );
      }
    }, 100);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-click is disabled in Proctored Exam Mode to maintain integrity.");
    };

    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Copy and paste are disabled in Proctored Exam Mode.");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (isModifier && ["c", "v", "x", "u", "C", "V", "X", "U"].includes(e.key)) {
        e.preventDefault();
        toast.error("Keyboard shortcuts are restricted in Proctored Exam Mode.");
      }
      if (e.key === "F12") {
        e.preventDefault();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("cut", handleClipboard);
    document.addEventListener("paste", handleClipboard);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearInterval(watchdogInterval);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [examModeActive, stage, graded]);

  // Clean up full screen if component unmounts while in exam mode
  useEffect(() => {
    return () => {
      if (isExamFullscreenActive()) {
        void exitExamFullscreen();
      }
    };
  }, []);

  // Global Alt+C shortcut to toggle Cambridge Economics Calculator
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setCalcOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [attemptTopics, setAttemptTopics] = useState<TopicStat[]>([]);
  // Sectional micro/macro domain split for this paper,
  // computed alongside attemptTopics from the same graded questions.
  const [attemptDomains, setAttemptDomains] = useState<DomainStat[]>([]);
  // Full per-question breakdown for the click-to-review list — populated
  // alongside `result`/`attemptTopics` once grading finishes.
  const [reviewQuestions, setReviewQuestions] = useState<GradedQuestion[]>([]);
  // On-demand explanation per question number, fetched only when the
  // student presses "Explain" in the post-attempt review list.
  const [explanations, setExplanations] = useState<Record<number, ExplanationState>>({});
  const explanationsRef = useRef(explanations);
  explanationsRef.current = explanations;
  // Active question number currently selected / being viewed
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const activeQuestionRef = useRef(activeQuestion);
  activeQuestionRef.current = activeQuestion;
  // Map of question number -> PDF page number (1-indexed)
  const [questionPages, setQuestionPages] = useState<Record<number, number>>({});
  // Mobile bottom sheets
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);
  // Currently visible PDF page during scrolling
  const [visiblePage, setVisiblePage] = useState<number>(1);

  // Which question number to visually pulse right now (set briefly when a
  // student clicks a row in the review list), so the matching row in the
  // answer side panel is easy to find among dozens of others.
  const [highlightNumber, setHighlightNumber] = useState<number | null>(null);
  const answerRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const goToQuestion = useCallback(
    (number: number, options?: { skipScrollPaper?: boolean }) => {
      setActiveQuestion(number);
      setHighlightNumber(number);

      // 1. Scroll PDF paper directly to the page containing this question.
      // Auto-scrolling the paper is designed for phone view where the viewport is narrow.
      // On laptop/desktop (screen width >= 1024px), NEVER scroll the paper if the target page
      // is already visible, or if skipScrollPaper is requested, preventing disruptive "scroll-up" jumps.
      if (!options?.skipScrollPaper) {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
        const targetPage =
          questionPages[number] ??
          Math.min(pages.length, Math.max(1, Math.ceil(number / 2) + 1));

        const shouldScrollPaper = !isDesktop || targetPage !== visiblePage;

        if (shouldScrollPaper) {
          const pageEl = document.getElementById(`mcq-page-${targetPage}`);
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }

      // 2. Scroll answer row in the desktop side panel
      const el = answerRowRefs.current.get(number);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      window.setTimeout(() => setHighlightNumber((cur) => (cur === number ? null : cur)), 2000);
    },
    [pages.length, questionPages, visiblePage],
  );

  // ---- timer ----
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const [timeUp, setTimeUp] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(() => {
    try {
      const saved = window.localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timedModeDefault === "boolean") return parsed.timedModeDefault;
      }
    } catch {
      // fallback
    }
    return true;
  });
  const autoSubmittedRef = useRef(false);

  // ---- annotate ----
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>("pen");
  const [annotateColor, setAnnotateColor] = useState<string>(ANNOTATE_COLORS[0]);
  const annotationCanvases = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const registerAnnotationCanvas = useCallback(
    (pageNumber: number, el: HTMLCanvasElement | null) => {
      if (el) annotationCanvases.current.set(pageNumber, el);
      else annotationCanvases.current.delete(pageNumber);
    },
    [],
  );

  const clearAllAnnotations = useCallback(() => {
    annotationCanvases.current.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    });
    setAnnotationClearSeq((n) => n + 1);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const listPapersFn = useServerFn(listMcqPapers);
  const papersQuery = useQuery({ queryKey: ["mcq-papers"], queryFn: () => listPapersFn() });

  const [draftRefreshKey, setDraftRefreshKey] = useState(0);

  // Proactively clean up any abandoned drafts older than 12 hours
  useEffect(() => {
    cleanupExpiredMcqDrafts(effectiveUserId);
  }, [effectiveUserId]);

  const activeDraftSummary = useMemo(() => {
    if (stage !== "library") return null;
    const allPapers = [
      ...TOPICAL_MCQ_PAPERS.map(toMcqPaperSummaryFromTopical),
      ...(papersQuery.data?.papers ?? []),
    ];
    return getActiveDraftSummary(effectiveUserId, allPapers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, effectiveUserId, papersQuery.data?.papers, draftRefreshKey]);

  // Tick every 15 seconds while on library stage to update time left and auto-purge if expired
  useEffect(() => {
    if (stage !== "library" || !activeDraftSummary) return;
    const interval = window.setInterval(() => {
      setDraftRefreshKey((k) => k + 1);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [stage, !activeDraftSummary]);

  const classifyTopicsFn = useServerFn(classifyMcqTopics);
  const submitAttemptFn = useServerFn(submitPdfMcqAttempt);
  const explainFn = useServerFn(explainMcqAnswer);
  const getStoredExplanationsFn = useServerFn(getStoredPaperExplanations);

  /** Encodes a rendered PDF question canvas as a crisp compact JPEG for Gemini Vision grounding. */
  function encodeCanvasForVision(canvas: HTMLCanvasElement | undefined | null): string | null {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    try {
      const MAX_WIDTH = 960;
      const QUALITY = 0.78;
      let dataUrl: string;
      if (canvas.width <= MAX_WIDTH) {
        dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
      } else {
        const ratio = MAX_WIDTH / canvas.width;
        const scaled = document.createElement("canvas");
        scaled.width = MAX_WIDTH;
        scaled.height = Math.max(1, Math.round(canvas.height * ratio));
        const ctx = scaled.getContext("2d");
        if (!ctx) {
          dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, scaled.width, scaled.height);
          ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
          dataUrl = scaled.toDataURL("image/jpeg", QUALITY);
        }
      }
      return dataUrl.length <= 900_000 ? dataUrl : null;
    } catch {
      return null;
    }
  }
  const fetchPaperPdfFn = useServerFn(fetchPaperPdf);
  const getAnswerKeyFn = useServerFn(getMcqPaperAnswerKey);

  /** Fetches a structured Cambridge IGCSE 0455 examiner explanation for one question,
   *  on demand — called in post-attempt review OR immediately after checking a
   *  question in Question-by-Question Tutor Mode. */
  async function handleExplain(
    number: number,
    overrideMistakeType?: McqMistakeType | null,
  ) {
    if (explanations[number] === "loading") return;
    const q = reviewQuestions.find((r) => r.number === number);
    const correctAnswer = q?.correct_answer ?? answerKey[number] ?? null;
    if (!correctAnswer) {
      setExplanations((prev) => ({
        ...prev,
        [number]: { error: "No mark-scheme answer on record for this question." },
      }));
      return;
    }
    try {
      const stem =
        stemBlobs.find((s) => s.number === number)?.text ??
        q?.stem_text ??
        "";
      const inferred = classifyMcqQuestion({
        level: "IGCSE",
        number,
        text: stem,
        existingTopic: q?.topic,
        existingSubtopic: q?.subtopic,
      });
      const resolvedMistakeType =
        overrideMistakeType !== undefined
          ? overrideMistakeType
          : (mistakeTypesRef.current[number] ?? q?.mistake_type ?? null);

      // Populate instant explanation synchronously so candidate NEVER waits with a blank loading card
      setExplanations((prev) => {
        if (prev[number] && prev[number] !== "loading") return prev;
        const instantDiag = generateInstantMcqDiagnostic({
          correctAnswer,
          userAnswer: q?.user_answer ?? answersRef.current?.[number] ?? null,
          isCorrect: (answersRef.current?.[number] ?? q?.user_answer) === correctAnswer,
          questionStem: stem,
          topic: inferred.topic,
          subtopic: inferred.subtopic,
          unit: inferred.unit,
          mistakeType: resolvedMistakeType,
        });
        return { ...prev, [number]: { text: "", diagnostic: instantDiag } };
      });

      const sliceCanvas = questionCanvasRefs.current[number] ?? null;
      const fallbackPageCanvas = pageCanvasRefs.current[1] ?? null;
      const questionImageDataUrl = encodeCanvasForVision(sliceCanvas ?? fallbackPageCanvas);

      const { explanation } = await explainFn({
        data: {
          paperId: selectedPaperId ?? undefined,
          level,
          number,
          stemText: stem,
          correctAnswer,
          userAnswer: q?.user_answer ?? answersRef.current[number] ?? null,
          topic: q?.topic ?? inferred.topic,
          subtopic: q?.subtopic ?? inferred.subtopic,
          mistakeType: resolvedMistakeType,
          questionImageDataUrl: questionImageDataUrl ?? undefined,
        },
      });
      setExplanations((prev) => ({
        ...prev,
        [number]:
          typeof explanation === "string"
            ? { text: explanation }
            : { text: explanation.text, diagnostic: explanation.diagnostic },
      }));
    } catch (error) {
      setExplanations((prev) => ({
        ...prev,
        [number]: {
          error:
            error instanceof Error
              ? error.message
              : "Couldn't get an explanation right now — try again.",
        },
      }));
    }
  }

  const fetchTopicPerformance = useServerFn(getMcqTopicPerformance);
  const topicPerformance = useQuery({
    queryKey: ["mcq-topic-performance"],
    queryFn: () => fetchTopicPerformance(),
  });

  // ---- paper history sidebar (student's own attempted papers + scores) ----
  const fetchPaperHistoryFn = useServerFn(getMyPaperHistory);
  const paperHistory = useQuery({
    queryKey: ["mcq-paper-history"],
    queryFn: () => fetchPaperHistoryFn(),
  });

  // Clicking a history entry opens the full past attempt (score + review +
  // on-demand explanations) in a side sheet, so a student can revise a
  // paper they've already finished without leaving the library page.
  const [historyAttemptId, setHistoryAttemptId] = useState<string | null>(null);
  const fetchAttemptFn = useServerFn(getPdfMcqAttempt);
  const historyAttempt = useQuery({
    queryKey: ["mcq-pdf-attempt", historyAttemptId],
    queryFn: () => fetchAttemptFn({ data: { attemptId: historyAttemptId! } }),
    enabled: !!historyAttemptId,
  });
  const [historyExplanations, setHistoryExplanations] = useState<Record<number, ExplanationState>>(
    {},
  );

  async function handleHistoryExplain(number: number) {
    if (!historyAttempt.data) return;
    if (historyExplanations[number] === "loading") return;
    setHistoryExplanations((prev) => ({ ...prev, [number]: "loading" }));
    const q = historyAttempt.data.questions.find((r) => r.number === number);
    const correctAnswer = q?.correct_answer;
    if (!correctAnswer) {
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]: { error: "No mark-scheme answer on record for this question." },
      }));
      return;
    }
    try {
      const { explanation } = await explainFn({
        data: {
          paperId: historyAttempt.data.paper_id ?? undefined,
          level: historyAttempt.data.level,
          number,
          stemText: q?.stem_text ?? "",
          correctAnswer,
          userAnswer: q?.user_answer ?? null,
          topic: q?.topic,
          subtopic: q?.subtopic,
        },
      });
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]:
          typeof explanation === "string"
            ? { text: explanation }
            : { text: explanation.text, diagnostic: explanation.diagnostic },
      }));
    } catch (error) {
      setHistoryExplanations((prev) => ({
        ...prev,
        [number]: {
          error:
            error instanceof Error
              ? error.message
              : "Couldn't get an explanation right now — try again.",
        },
      }));
    }
  }

/**
 * Interpolates or estimates PDF page locations for any questions not cleanly
 * captured by OCR text-layer parsing, guaranteeing every question maps to a real page
 * and questions follow a strictly non-decreasing page sequence (monotonic).
 */
function fillMissingQuestionPages(
  map: Record<number, number>,
  totalQuestions: number,
  numPages: number,
): Record<number, number> {
  const result: Record<number, number> = { ...map };

  // Step 1: Discard any impossible outliers that violate non-decreasing order
  // (e.g. false positives where variant codes like 12 or 30 matched on page 1).
  let runningMax = 1;
  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q] !== undefined) {
      if (result[q] < runningMax) {
        delete result[q];
      } else {
        runningMax = result[q];
      }
    }
  }

  // Step 2: Interpolate missing questions between known surrounding questions
  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q]) continue;
    let prevQ = -1;
    for (let k = q - 1; k >= 1; k--) {
      if (result[k]) {
        prevQ = k;
        break;
      }
    }
    let nextQ = -1;
    for (let k = q + 1; k <= totalQuestions; k++) {
      if (result[k]) {
        nextQ = k;
        break;
      }
    }

    if (prevQ !== -1 && nextQ !== -1) {
      const fraction = (q - prevQ) / (nextQ - prevQ);
      const estPage = Math.round(result[prevQ] + fraction * (result[nextQ] - result[prevQ]));
      result[q] = Math.max(result[prevQ], Math.min(result[nextQ], estPage));
    } else if (prevQ !== -1) {
      const estPage = Math.min(numPages, result[prevQ] + Math.floor((q - prevQ) / 2));
      result[q] = Math.max(result[prevQ], estPage);
    } else if (nextQ !== -1) {
      const estPage = Math.max(1, result[nextQ] - Math.ceil((nextQ - q) / 2));
      result[q] = Math.min(result[nextQ], estPage);
    } else {
      result[q] = Math.min(numPages, Math.max(1, Math.ceil(q / 2) + 1));
    }
  }

  // Step 3: Absolute final guarantee: result[q] >= result[q - 1]
  for (let q = 2; q <= totalQuestions; q++) {
    if (result[q] < result[q - 1]) {
      result[q] = result[q - 1];
    }
  }

  return result;
}

  /* ---------------- start practice: fetch the picked library paper + its cached overlay ----------------
   *
   * Renders every page of the PDF plainly and pulls a rough stem-text
   * blob per question straight from the text layer — nothing is
   * positioned against the page. Answering happens from the fixed
   * A/B/C/D side panel instead.
   */

  async function beginPractice(
    paper: NonNullable<typeof papersQuery.data>["papers"][number],
    completedAttempt?: {
      score: number | null;
      total: number;
      questions: GradedQuestion[];
    },
    overrideMode?: PracticeMode,
  ) {
    const draft =
      !completedAttempt ? readMcqDraft(effectiveUserId, paper.id) : null;
    const resolvedMode: PracticeMode =
      overrideMode ?? draft?.practiceMode ?? practiceModeRef.current ?? "full_paper";
    setPracticeMode(resolvedMode);
    practiceModeRef.current = resolvedMode;

    if (startInExamMode && !completedAttempt && resolvedMode === "full_paper") {
      void handleEnableExamMode();
    }
    setExamViolations([]);
    setActiveViolation(null);
    if (!completedAttempt && (!startInExamMode || resolvedMode !== "full_paper")) {
      hadExamModeRef.current = false;
    }
    setSelectedPaperId(paper.id);
    selectedPaperIdRef.current = paper.id;

    // Pre-warm stored explanations for instant 1-by-1 tutor derivations
    void getStoredExplanationsFn({ data: { paperId: paper.id } })
      .then((res) => {
        if (res?.explanations && Object.keys(res.explanations).length > 0) {
          setExplanations((prev) => ({ ...res.explanations, ...prev }));
        }
      })
      .catch(() => {});
    setPaperTitle(paper.title);
    paperTitleRef.current = paper.title;
    setLevel((paper.level === "a2" ? "a2" : "as") as Level);
    levelRef.current = (paper.level === "a2" ? "a2" : "as") as Level;
    setQCount(paper.questionCount || 30);
    const resolvedInitialKey =
      paper.answerKey && Object.keys(paper.answerKey).length > 0
        ? paper.answerKey
        : (paper as any).answer_key && Object.keys((paper as any).answer_key).length > 0
          ? (paper as any).answer_key
          : papersQuery.data?.papers?.find((p) => p.id === paper.id)?.answerKey ??
            getTopicalPaperById(paper.id)?.answerKey ??
            {};
    setAnswerKey(resolvedInitialKey as Record<number, Letter>);

    // If answer key is still empty, fetch it immediately in the background
    if (Object.keys(resolvedInitialKey).length === 0 && paper.id) {
      void getAnswerKeyFn({ data: { paperId: paper.id } })
        .then((res) => {
          if (res?.answerKey && Object.keys(res.answerKey).length > 0) {
            setAnswerKey(res.answerKey as Record<number, Letter>);
            if (res.questionCount) setQCount(res.questionCount);
          }
        })
        .catch((err) => {
          console.warn("Async answer key lookup failed:", err);
        });
    }
    const completedAnswers = completedAttempt
      ? Object.fromEntries(
          completedAttempt.questions.flatMap((question) =>
            question.user_answer ? [[question.number, question.user_answer]] : [],
          ),
        )
      : null;
    const completedMistakes = completedAttempt
      ? Object.fromEntries(
          completedAttempt.questions.flatMap((question) =>
            question.mistake_type ? [[question.number, question.mistake_type]] : [],
          ),
        )
      : null;
    const initialAnswers = completedAnswers ?? draft?.answers ?? {};
    const initialFlagged = new Set(draft?.flagged ?? []);
    const initialChecked = completedAttempt
      ? new Set(completedAttempt.questions.map((q) => q.number))
      : new Set(draft?.checkedQuestions ?? []);
    const initialMistakes: Record<number, McqMistakeType> =
      (completedMistakes as Record<number, McqMistakeType> | null) ?? draft?.mistakeTypes ?? {};
    const initialEliminated: Record<number, Letter[]> = draft?.eliminatedOptions ?? {};
    const initialTimes: Record<number, number> = draft?.questionTimes ?? {};

    const initialGradeOnly = Boolean(draft?.gradeOnlyAttempted);
    setGradeOnlyAttempted(initialGradeOnly);
    gradeOnlyAttemptedRef.current = initialGradeOnly;

    setAnswers(initialAnswers);
    answersRef.current = initialAnswers;
    setFlagged(initialFlagged);
    flaggedRef.current = initialFlagged;
    setCheckedQuestions(initialChecked);
    checkedQuestionsRef.current = initialChecked;
    setMistakeTypes(initialMistakes);
    mistakeTypesRef.current = initialMistakes;
    setEliminatedOptions(initialEliminated);
    eliminatedOptionsRef.current = initialEliminated;
    setQuestionTimes(initialTimes);
    questionTimesRef.current = initialTimes;
    setGraded(!!completedAttempt);
    setResult(
      completedAttempt && completedAttempt.score !== null
        ? { score: completedAttempt.score, total: completedAttempt.total }
        : null,
    );
    if (completedAttempt) {
      const levelUpper = paper.level === "a2" ? "A2" : "AS";
      const normalizedCompleted = completedAttempt.questions.map((question) => {
        const c = classifyMcqQuestion({
          level: levelUpper,
          number: question.number,
          text: question.stem_text,
          existingTopic: question.topic,
          existingSubtopic: question.subtopic,
          existingSkill: question.skill,
        });
        return {
          ...question,
          topic: c.topic,
          subtopic: question.subtopic || c.subtopic,
          unit: c.unit,
          domain: c.domain,
          skill: c.skill,
        };
      });
      setReviewQuestions(normalizedCompleted);
      setAttemptTopics(buildTopicStatsFromQuestions(normalizedCompleted, levelUpper));
      setAttemptDomains(
        aggregateMcqDomains(
          normalizedCompleted.map((question) => ({
            topic: question.topic,
            correct: !!question.correct,
            number: question.number,
            level: levelUpper,
          })),
        ),
      );
    } else {
      setReviewQuestions([]);
      setAttemptTopics([]);
      setAttemptDomains([]);
    }
    setExplanations({});

    // Reset the clock and scratch marks for this fresh attempt — real
    // Cambridge IGCSE 0455 timings: Paper 1 (AS) is 1 hour, Paper 1 (IGCSE 0455) is
    // 1 hour 15, and Topical Papers use their configured duration (2 min/question).
    const matchedTopical = getTopicalPaperById(paper.id);
    const fullDurationSeconds = matchedTopical
      ? matchedTopical.durationSeconds
      : (PAPER_DURATION_SECONDS[paper.level as Level] ?? 45 * 60);
    const initialTimeLeft = completedAttempt
      ? null
      : draft?.timeLeft == null
        ? fullDurationSeconds
        : Math.min(draft.timeLeft, fullDurationSeconds);
    setTimeLeft(initialTimeLeft);
    timeLeftRef.current = initialTimeLeft;
    setTimeUp(false);
    autoSubmittedRef.current = false;
    setAnnotateMode(false);
    annotationCanvases.current.clear();

    const downloadPdfBuffer = async (targetUrl: string): Promise<ArrayBuffer> => {
      try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.arrayBuffer();
      } catch {
        try {
          const { base64 } = await fetchPaperPdfFn({ data: { qpUrl: targetUrl } });
          return base64ToArrayBuffer(base64);
        } catch {
          throw new Error("Could not download the question paper file.");
        }
      }
    };

    setBusyLabel(
      matchedTopical ? "Slicing real Cambridge exam diagrams & tables…" : "Fetching the paper…",
    );
    try {
      if (matchedTopical) {
        const topicalBuilt = await renderTopicalPaperPages({
          topicalPaper: matchedTopical,
          scale: RENDER_SCALE,
          fetchPdfBuffer: downloadPdfBuffer,
          onProgress: (label) => setBusyLabel(label),
        });
        setQuestionPages(topicalBuilt.questionPages);
        setQuestionSlices(topicalBuilt.questionSlices);
        setPages(topicalBuilt.pages);
        setStemBlobs(topicalBuilt.stems);
      } else {
        const pdfjs = await loadPdfjs();
        const buf = await downloadPdfBuffer(paper.qpUrl);

        const doc = await pdfjs.getDocument({
          data: new Uint8Array(buf),
        }).promise;

        const built: PageImage[] = [];
        const stems: StemBlob[] = [];
        const candidatePageMap: Record<number, number[]> = {};
        const pageMetaByNum = new Map<
          number,
          { canvas: HTMLCanvasElement; heightPt: number; spans: QuestionPageSpan[] }
        >();
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
          built.push({ pageNumber: p, canvas });

          let pageSpans: QuestionPageSpan[] = [];
          try {
            const content = await page.getTextContent();
            pageSpans = extractQuestionSpans(
              content.items as PdfTextItem[],
              unscaledViewport.height,
            );
            stems.push(...pageSpans.map(({ number, text }) => ({ number, text })));
            for (const s of pageSpans) {
              if (s.number >= 1 && s.number <= paper.questionCount) {
                if (!candidatePageMap[s.number]) {
                  candidatePageMap[s.number] = [];
                }
                candidatePageMap[s.number].push(p);
              }
            }
          } catch (textErr) {
            console.warn(`Text extraction skipped for page ${p}:`, textErr);
          }

          pageMetaByNum.set(p, {
            canvas,
            heightPt: unscaledViewport.height,
            spans: pageSpans,
          });
        }

        // Resolve candidate sightings into a strictly monotonic question -> page map.
        // An exam paper is always sequentially ordered: page(q) >= page(q - 1).
        const rawPageMap: Record<number, number> = {};
        let lastPage = 1;
        for (let q = 1; q <= paper.questionCount; q++) {
          const sightings = candidatePageMap[q];
          if (!sightings || sightings.length === 0) continue;

          // Discard page 1 if total pages > 1 and q > 1 (multi-page exam cover page false positive)
          const validSightings = sightings.filter((p) => doc.numPages <= 1 || q === 1 || p > 1);
          if (validSightings.length === 0) continue;

          // Pick candidate page that respects monotonicity (p >= lastPage)
          const monotonicMatch = validSightings.find((p) => p >= lastPage);
          if (monotonicMatch !== undefined) {
            rawPageMap[q] = monotonicMatch;
            lastPage = monotonicMatch;
          } else {
            const highest = validSightings[validSightings.length - 1];
            if (highest >= lastPage) {
              rawPageMap[q] = highest;
              lastPage = highest;
            }
          }
        }

        // Crop isolated single-question PDF slices for Question-by-Question Mode
        const builtSlices: Record<number, HTMLCanvasElement> = {};
        for (let q = 1; q <= paper.questionCount; q++) {
          const resolvedPage = rawPageMap[q];
          if (!resolvedPage) continue;
          const pageMeta = pageMetaByNum.get(resolvedPage);
          const span = pageMeta?.spans.find((s) => s.number === q);
          if (pageMeta && span) {
            builtSlices[q] = cropQuestionSliceCanvas({
              pageCanvas: pageMeta.canvas,
              pageHeightPt: pageMeta.heightPt,
              yTop: span.yTop,
              yBottom: span.yBottom,
              scale: RENDER_SCALE,
            });
          }
        }

        const completedPageMap = fillMissingQuestionPages(
          rawPageMap,
          paper.questionCount,
          doc.numPages,
        );
        // Deduplicate stems by question number (1..questionCount), preferring the longest extracted stem
        const bestStemByNum = new Map<number, string>();
        for (const s of stems) {
          if (s.number >= 1 && s.number <= paper.questionCount) {
            const prev = bestStemByNum.get(s.number) ?? "";
            if (s.text.length >= prev.length) {
              bestStemByNum.set(s.number, s.text);
            }
          }
        }
        const dedupedStems: StemBlob[] = [...bestStemByNum.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([number, text]) => ({ number, text }));

        setQuestionPages(completedPageMap);
        setQuestionSlices(builtSlices);
        setPages(built);
        setStemBlobs(dedupedStems);
      }
      const restoredActive =
        draft?.activeQuestion && draft.activeQuestion >= 1 && draft.activeQuestion <= (paper.questionCount || 30)
          ? draft.activeQuestion
          : 1;
      setActiveQuestion(restoredActive);
      activeQuestionRef.current = restoredActive;
      setStage("practice");
      if (!completedAttempt) {
        saveDraftToStorage(
          initialAnswers,
          initialFlagged,
          initialTimeLeft,
          paper.id,
        );
        navigate({
          search: (prev) => ({ ...prev, paperId: paper.id }),
          replace: true,
        });
      }
      if (draft && Object.keys(draft.answers).length > 0) {
        toast.success(
          `Restored ${Object.keys(draft.answers).length} saved answer${Object.keys(draft.answers).length === 1 ? "" : "s"}.`,
        );
      }
    } catch (err) {
      console.error("MCQ PDF practice load error:", err);
      toast.error(
        err instanceof Error
          ? `Could not load PDF: ${err.message}`
          : "Couldn't process that PDF.",
      );
    } finally {
      setBusyLabel(null);
    }
  }

  // A link supplied a specific paper, so start it automatically instead of
  // making the student pick it again. Only fires once when the library loads.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (stage !== "library") return;
    if (!search.paperId) return; // Only auto-start on explicit link search parameter
    const matchedTopical = getTopicalPaperById(search.paperId);
    if (matchedTopical) {
      autoStartedRef.current = true;
      beginPractice(toMcqPaperSummaryFromTopical(matchedTopical));
      return;
    }
    const paper = papersQuery.data?.papers?.find((p) => p.id === search.paperId);
    if (!paper) return;
    autoStartedRef.current = true;
    beginPractice(paper);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.paperId, papersQuery.data, stage]);

  // Synchronize answerKey and questionCount if papersQuery finishes loading or updates while in practice mode
  useEffect(() => {
    if (stage !== "practice" || !selectedPaperId) return;
    if (Object.keys(answerKey).length > 0) return;
    const dbMatch = papersQuery.data?.papers?.find((p) => p.id === selectedPaperId);
    if (dbMatch?.answerKey && Object.keys(dbMatch.answerKey).length > 0) {
      setAnswerKey(dbMatch.answerKey as Record<number, Letter>);
      if (dbMatch.questionCount && dbMatch.questionCount > 0) {
        setQCount(dbMatch.questionCount);
      }
    } else {
      const topMatch = getTopicalPaperById(selectedPaperId);
      if (topMatch?.answerKey && Object.keys(topMatch.answerKey).length > 0) {
        setAnswerKey(topMatch.answerKey as Record<number, Letter>);
        if (topMatch.questionCount && topMatch.questionCount > 0) {
          setQCount(topMatch.questionCount);
        }
      } else {
        void getAnswerKeyFn({ data: { paperId: selectedPaperId } }).then((res) => {
          if (res?.answerKey && Object.keys(res.answerKey).length > 0) {
            setAnswerKey(res.answerKey as Record<number, Letter>);
            if (res.questionCount) setQCount(res.questionCount);
          }
        });
      }
    }
  }, [stage, selectedPaperId, answerKey, papersQuery.data, getAnswerKeyFn]);

  // Track currently visible page during scrolling so questions on the viewed page are known
  useEffect(() => {
    if (stage !== "practice" || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.id.replace("mcq-page-", ""), 10);
            if (!isNaN(pageNum)) {
              setVisiblePage(pageNum);
            }
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: "-10% 0px -55% 0px",
        threshold: 0,
      },
    );

    for (let p = 1; p <= pages.length; p++) {
      const el = document.getElementById(`mcq-page-${p}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stage, pages.length]);

  // When visible page updates as student scrolls the paper, gently scroll the side panel to keep those questions in view
  useEffect(() => {
    if (stage !== "practice" || !visiblePage) return;
    const pageQuestions = Object.entries(questionPages)
      .filter(([, p]) => p === visiblePage)
      .map(([q]) => Number(q))
      .sort((a, b) => a - b);
    if (pageQuestions.length > 0) {
      const firstQ = pageQuestions[0];
      const el = answerRowRefs.current.get(firstQ);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [visiblePage, questionPages, stage]);


  /* ---------------- countdown timer ----------------
   *
   * One interval per practice attempt (restarted only when `stage` or
   * `graded` changes, not on every tick) counting down from the paper's
   * real exam duration. Auto-submits once, exactly like a real exam
   * running out of time, via the effect below.
   */
  useEffect(() => {
    if (
      stage !== "practice" ||
      graded ||
      !timerEnabled ||
      practiceMode === "question_by_question"
    )
      return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage, graded, timerEnabled, practiceMode]);

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      stage !== "practice" ||
      graded ||
      !timerEnabled ||
      practiceMode === "question_by_question" ||
      autoSubmittedRef.current
    )
      return;
    autoSubmittedRef.current = true;
    setTimeUp(true);
    toast.warning("Time's up — submitting your answers automatically.");
    gradeAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, stage, graded, timerEnabled, practiceMode]);

  /* ---------------- resilient autosave engine ---------------- */

  const saveDraftToStorage = useCallback(
    (
      currentAnswers: Record<number, Letter>,
      currentFlagged: Set<number>,
      currentTimeLeft: number | null,
      overridePaperId?: string,
    ) => {
      const targetPaperId = overridePaperId || selectedPaperIdRef.current;
      if (!targetPaperId || graded) return;
      try {
        const draft: McqDraft = {
          version: MCQ_DRAFT_VERSION,
          paperId: targetPaperId,
          paperTitle: paperTitleRef.current,
          level: levelRef.current,
          practiceMode: practiceModeRef.current,
          answers: currentAnswers,
          flagged: Array.from(currentFlagged),
          checkedQuestions: Array.from(checkedQuestionsRef.current),
          mistakeTypes: mistakeTypesRef.current,
          eliminatedOptions: eliminatedOptionsRef.current,
          questionTimes: questionTimesRef.current,
          activeQuestion: activeQuestionRef.current,
          gradeOnlyAttempted: gradeOnlyAttemptedRef.current,
          timeLeft: currentTimeLeft,
          savedAt: Date.now(),
        };
        window.localStorage.setItem(
          mcqDraftKey(effectiveUserId, targetPaperId),
          JSON.stringify(draft),
        );
        window.localStorage.setItem(
          mcqActiveKey(effectiveUserId),
          JSON.stringify({ version: MCQ_ACTIVE_VERSION, paperId: targetPaperId, savedAt: Date.now() }),
        );
        setSaveStatus("saved");
      } catch (err) {
        console.warn("MCQ autosave error:", err);
      }
    },
    [effectiveUserId, graded],
  );

  const toggleFlag = useCallback(
    (number: number) => {
      setSaveStatus("saving");
      setFlagged((prev) => {
        const next = new Set(prev);
        if (next.has(number)) next.delete(number);
        else next.add(number);
        saveDraftToStorage(answersRef.current, next, timeLeftRef.current);
        return next;
      });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [saveDraftToStorage],
  );

  const pick = useCallback(
    (number: number, letter: Letter) => {
      if (timeUp) return;
      setSaveStatus("saving");
      setAnswers((prev) => {
        const next = { ...prev, [number]: letter };
        saveDraftToStorage(next, flaggedRef.current, timeLeftRef.current);
        return next;
      });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [timeUp, saveDraftToStorage],
  );

  const handleTutorCheckAnswer = useCallback(
    (number: number, elapsedSeconds: number) => {
      setSaveStatus("saving");
      setCheckedQuestions((prev) => {
        const next = new Set(prev);
        next.add(number);
        checkedQuestionsRef.current = next;
        return next;
      });
      setQuestionTimes((prev) => {
        const next = { ...prev, [number]: elapsedSeconds };
        questionTimesRef.current = next;
        return next;
      });
      const correctAns = answerKeyRef.current?.[number];
      const curAns = answersRef.current?.[number];
      if (
        correctAns &&
        (!explanationsRef.current?.[number] || explanationsRef.current?.[number] === "loading")
      ) {
        const stem = stemBlobs.find((s) => s.number === number)?.text ?? "";
        const inferred = classifyMcqQuestion({
          level: "IGCSE",
          number,
          text: stem,
        });
        const instantDiag = generateInstantMcqDiagnostic({
          correctAnswer: correctAns,
          userAnswer: curAns ?? null,
          isCorrect: curAns === correctAns,
          questionStem: stem,
          topic: inferred.topic,
          subtopic: inferred.subtopic,
          unit: inferred.unit,
        });
        setExplanations((prev) => ({
          ...prev,
          [number]: { text: "", diagnostic: instantDiag },
        }));
      }
      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [saveDraftToStorage, stemBlobs],
  );

  const handleSetMistakeType = useCallback(
    (number: number, type: McqMistakeType) => {
      setSaveStatus("saving");
      setMistakeTypes((prev) => {
        const next = { ...prev, [number]: type };
        mistakeTypesRef.current = next;
        return next;
      });
      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => setSaveStatus("saved"), 400);
    },
    [saveDraftToStorage],
  );

  const handleToggleEliminate = useCallback(
    (number: number, letter: Letter) => {
      setEliminatedOptions((prev) => {
        const cur = prev[number] ?? [];
        const exists = cur.includes(letter);
        const nextArr = exists ? cur.filter((l) => l !== letter) : [...cur, letter];
        const next = { ...prev, [number]: nextArr };
        eliminatedOptionsRef.current = next;
        return next;
      });
    },
    [],
  );

  // Periodic background draft sync (saves timer countdown progress every 5 seconds)
  useEffect(() => {
    if (stage !== "practice" || graded || !selectedPaperId) return;
    const interval = window.setInterval(() => {
      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [stage, graded, selectedPaperId, saveDraftToStorage]);

  // Immediately flush draft state on tab close, page refresh, or navigation
  useEffect(() => {
    const handleFlush = () => {
      if (stage === "practice" && !graded && selectedPaperIdRef.current) {
        saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
      }
    };
    window.addEventListener("beforeunload", handleFlush);
    window.addEventListener("pagehide", handleFlush);
    return () => {
      window.removeEventListener("beforeunload", handleFlush);
      window.removeEventListener("pagehide", handleFlush);
    };
  }, [stage, graded, saveDraftToStorage]);

  /* ---------------- grading + feedback ---------------- */

  async function gradeAndSave(options?: { gradeOnlyAttempted?: boolean }) {
    const onlyAttempted = options?.gradeOnlyAttempted ?? gradeOnlyAttempted;
    let effectiveKey = answerKey;
    if (Object.keys(effectiveKey).length === 0 && selectedPaperId) {
      const dbMatch = papersQuery.data?.papers?.find((p) => p.id === selectedPaperId);
      if (dbMatch?.answerKey && Object.keys(dbMatch.answerKey).length > 0) {
        effectiveKey = dbMatch.answerKey as Record<number, Letter>;
        setAnswerKey(effectiveKey);
      } else {
        const topMatch = getTopicalPaperById(selectedPaperId);
        if (topMatch?.answerKey && Object.keys(topMatch.answerKey).length > 0) {
          effectiveKey = topMatch.answerKey as Record<number, Letter>;
          setAnswerKey(effectiveKey);
        } else {
          try {
            const res = await getAnswerKeyFn({ data: { paperId: selectedPaperId } });
            if (res?.answerKey && Object.keys(res.answerKey).length > 0) {
              effectiveKey = res.answerKey as Record<number, Letter>;
              setAnswerKey(effectiveKey);
            }
          } catch (err) {
            console.warn("Failed to fetch answer key before grading:", err);
          }
        }
      }
    }

    if (Object.keys(effectiveKey).length === 0) {
      toast.error("No mark scheme loaded yet — please wait or reload the paper.");
      return;
    }
    setBusyLabel("Marking…");
    try {
      const matchedTopical = getTopicalPaperById(selectedPaperId);
      const stemByNumber = new Map<number, string>(
        stemBlobs.map((s) => [s.number, s.text]),
      );
      const levelUpper = level === "a2" ? "A2" : "AS";

      const allNumbers = new Set<number>([
        ...Object.keys(effectiveKey).map(Number),
        ...Object.keys(answers).map(Number),
        ...Array.from({ length: qCount || 30 }, (_, i) => i + 1),
      ]);
      const graded_ = [...allNumbers]
        .filter((n) => n >= 1)
        .sort((a, b) => a - b)
        .map((number) => {
          const correctAnswer = effectiveKey[number] ?? null;
          const userAnswer = answers[number] ?? null;
          const topicalQ = matchedTopical?.questions.find((q) => q.number === number);
          const stemText =
            stemByNumber.get(number) ??
            (topicalQ?.stemText ?? "");
          const classified = classifyMcqQuestion({
            level: levelUpper,
            number,
            text: stemText,
            existingTopic: matchedTopical?.shortTitle,
            existingSubtopic: topicalQ?.subtopic,
            existingSkill: topicalQ?.skill,
          });
          const isAttempted = userAnswer !== null && userAnswer !== undefined;
          const isCorrect = isAttempted
            ? (correctAnswer ? correctAnswer === userAnswer : null)
            : (onlyAttempted ? null : false);
          return {
            number,
            topic: classified.topic,
            subtopic: topicalQ?.subtopic || classified.subtopic,
            unit: classified.unit,
            domain: classified.domain,
            skill: classified.skill,
            stem_text: stemText ? stemText.slice(0, 1400) : undefined,
            correct_answer: correctAnswer,
            user_answer: userAnswer,
            correct: isCorrect,
            mistake_type: isCorrect === false ? (mistakeTypesRef.current[number] ?? null) : null,
          };
        });

      const scored = graded_.filter((q) => q.correct !== null);
      const score = scored.filter((q) => q.correct).length;
      setResult({ score, total: scored.length });
      setGraded(true);
      setReviewQuestions(graded_);
      setAttemptTopics(buildTopicStatsFromQuestions(scored, levelUpper));
      setAttemptDomains(
        aggregateMcqDomains(
          scored.map((q) => ({
            topic: q.topic,
            correct: !!q.correct,
            number: q.number,
            level: levelUpper,
          })),
        ),
      );

      await submitAttemptFn({
        data: {
          title: paperTitle,
          filename: paperTitle,
          level,
          paperId: selectedPaperId!,
          gradeOnlyAttempted: onlyAttempted,
          questions: graded_.map((q) => ({
            number: q.number,
            topic: q.topic,
            subtopic: q.subtopic,
            stem_text: q.stem_text,
            skill: q.skill,
            correct_answer: q.correct_answer,
            user_answer: q.user_answer,
            correct: q.correct,
            mistake_type: q.mistake_type,
          })),
        },
      });
      if (selectedPaperId) {
        window.localStorage.removeItem(mcqDraftKey(effectiveUserId, selectedPaperId));
        window.localStorage.removeItem(mcqActiveKey(effectiveUserId));
        window.localStorage.removeItem(mcqDraftKey("guest", selectedPaperId));
        window.localStorage.removeItem(mcqActiveKey("guest"));
      }
      setDraftRefreshKey((k) => k + 1);
      navigate({
        search: (prev) => {
          const next = { ...prev };
          delete next.paperId;
          return next;
        },
        replace: true,
      });
      topicPerformance.refetch();
      queryClient.invalidateQueries({ queryKey: ["mcq-paper-history"] });
      queryClient.invalidateQueries({ queryKey: ["review-mcq-history"] });
      queryClient.invalidateQueries({ queryKey: ["review-mcq-topics"] });
      queryClient.invalidateQueries({ queryKey: ["review-panel"] });
      toast.success(`Marked — ${score}/${scored.length}.`);
    } catch (err) {
      toast.error("Marking failed — your answers are still on screen, try again.");
    } finally {
      setBusyLabel(null);
    }
  }

  /* ---------------- render ---------------- */

  const answeredCount = Object.keys(answers).length;
  // Full ordered list of question numbers — renders one row per question.
  // Guaranteed fallback ensures questions 1..qCount (default 30) ALWAYS render, so students can
  // answer questions immediately even if the mark scheme is still resolving.
  const questionNumbers = useMemo(() => {
    const fromAnswerKey = Object.keys(answerKey)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 1)
      .sort((a, b) => a - b);
    if (fromAnswerKey.length > 0) return fromAnswerKey;

    const fromAnswers = Object.keys(answers)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 1)
      .sort((a, b) => a - b);

    const fromStems = stemBlobs
      .map((s) => s.number)
      .filter((n) => Number.isFinite(n) && n >= 1)
      .sort((a, b) => a - b);

    const fromPages = Object.keys(questionPages)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 1)
      .sort((a, b) => a - b);

    const count = Math.max(
      qCount,
      fromAnswers.length > 0 ? Math.max(...fromAnswers) : 0,
      fromStems.length > 0 ? Math.max(...fromStems) : 0,
      fromPages.length > 0 ? Math.max(...fromPages) : 0,
      30,
    );

    return Array.from({ length: count }, (_, i) => i + 1);
  }, [answerKey, answers, stemBlobs, questionPages, qCount]);

  const topicalTopicMap = useMemo(() => {
    const matched = getTopicalPaperById(selectedPaperId);
    if (!matched) return undefined;
    const map: Record<number, { topic: string; subtopic: string }> = {};
    for (const q of matched.questions) {
      map[q.number] = { topic: matched.shortTitle, subtopic: q.subtopic };
    }
    return map;
  }, [selectedPaperId]);

  function leavePractice() {
    if (isExamFullscreenActive() || examModeActive) {
      isLeavingExamModeRef.current = true;
      setExamModeActive(false);
      setActiveViolation(null);
      void exitExamFullscreen();
      setTimeout(() => {
        isLeavingExamModeRef.current = false;
      }, 500);
    }
    setStage("library");
    setDraftRefreshKey((k) => k + 1);
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.paperId;
        return next;
      },
      replace: true,
    });
  }

  async function openFullPastPaper() {
    const attempt = historyAttempt.data;
    if (!attempt) return;
    const matchedTopical =
      getTopicalPaperById(attempt.paperId) ??
      TOPICAL_MCQ_PAPERS.find((t) => t.title === attempt.title) ??
      null;
    const paper = matchedTopical
      ? toMcqPaperSummaryFromTopical(matchedTopical)
      : papersQuery.data?.papers?.find((entry) => entry.id === attempt.paperId);
    if (!paper) {
      toast.error("That paper is no longer available in the library.");
      return;
    }
    setHistoryAttemptId(null);
    setHistoryExplanations({});
    await beginPractice(paper, attempt);
  }

  return (
    <div>
      {stage === "library" ? (
        <PageHeader
          title="MCQ Live"
          description="Practice straight off a real past paper — answer from the button panel beside it."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => openHostLiveQuiz("library_paper")}
                className="h-9 gap-1.5 rounded-xl font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Create a Blooket / Quizizz style live quiz link for your class"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Host Live Quiz</span>
              </Button>
              <Button
                size="sm"
                variant={calcOpen ? "default" : "outline"}
                onClick={() => setCalcOpen((v) => !v)}
                className="h-9 gap-1.5 rounded-xl border-border font-medium shadow-2xs hover:bg-muted"
                title="Open Cambridge Economics Calculator & Solvers (Alt+C)"
              >
                <CalculatorIcon className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Cambridge Calculator</span>
                <span className="sm:hidden">Calc</span>
              </Button>
            </div>
          }
        />
      ) : null}

      {stage === "library" ? (
        <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
          {/* Top-level Mode Switcher: separates Full Past Papers, Topical Past Papers, and Analytics */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setLibraryTab("past_papers")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all",
                  libraryTab === "past_papers"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Full Past Papers</span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab("topical")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all",
                  libraryTab === "topical"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Topical Past Papers</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                    libraryTab === "topical"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  Coming Soon
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab("live_quiz")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all",
                  libraryTab === "live_quiz"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Live Quiz Arena</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase",
                    libraryTab === "live_quiz"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  LIVE
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab("analytics")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all",
                  libraryTab === "analytics"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Topic Feedback &amp; History</span>
              </button>
            </div>

            <a
              href="/mcq-papers-admin"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Admin? Manage library
            </a>
          </div>

          <CompactProgressBar
            active={!!busyLabel}
            stages={[
              { label: "Loading past-paper document & pages", weight: 3 },
              { label: "Preparing interactive MCQ answer workspace", weight: 4 },
            ] satisfies ProgressStage[]}
            totalMs={12_000}
            title={busyLabel || "Loading MCQ paper…"}
            statusBadge="Preparing"
            className="mb-6"
          />

          {/* Active Draft Banner (shown compactly at top if an exam is in progress) */}
          {activeDraftSummary ? (
            <div className="mb-6 rounded-xl border border-primary/40 bg-primary/[0.04] px-4 py-3.5 shadow-2xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                      {activeDraftSummary.draft.practiceMode === "question_by_question"
                        ? "In-Progress 1-by-1 Tutor"
                        : "In-Progress Exam"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Expires in {formatRemainingTime(activeDraftSummary.remainingMs)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {activeDraftSummary.paper.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">
                      {Object.keys(activeDraftSummary.draft.answers).length}
                    </strong>{" "}
                    of {activeDraftSummary.paper.questionCount} answered
                    {activeDraftSummary.draft.timeLeft !== null ? (
                      <>
                        {" "}
                        ·{" "}
                        <strong className="text-foreground">
                          {formatTime(activeDraftSummary.draft.timeLeft)}
                        </strong>{" "}
                        left
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Discard your in-progress exam? All unsaved answers will be deleted.",
                        )
                      ) {
                        window.localStorage.removeItem(
                          mcqDraftKey(effectiveUserId, activeDraftSummary.paper.id),
                        );
                        window.localStorage.removeItem(mcqActiveKey(effectiveUserId));
                        window.localStorage.removeItem(
                          mcqDraftKey("guest", activeDraftSummary.paper.id),
                        );
                        window.localStorage.removeItem(mcqActiveKey("guest"));
                        setDraftRefreshKey((k) => k + 1);
                        toast.success("Exam draft discarded.");
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    onClick={() => beginPractice(activeDraftSummary.paper)}
                  >
                    <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                    Resume
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* TAB 1: FULL PAST PAPERS */}
          {libraryTab === "past_papers" ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
              <div className="min-w-0">
                {papersQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading the library…</p>
                ) : (papersQuery.data?.papers?.length ?? 0) === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      No papers are published in the library yet.
                    </CardContent>
                  </Card>
                ) : (
                  <PastPaperSelector
                    papers={papersQuery.data?.papers ?? []}
                    busy={!!busyLabel}
                    busyPaperId={selectedPaperId}
                    onStart={(paper) => beginPractice(paper, undefined, practiceMode)}
                    onHostLiveQuiz={(paper) => openHostLiveQuiz("library_paper", paper.id)}
                    activeDraftPaperId={activeDraftSummary?.paper.id}
                    activeDraftAnswersCount={
                      activeDraftSummary ? Object.keys(activeDraftSummary.draft.answers).length : 0
                    }
                    startInExamMode={startInExamMode}
                    onToggleExamMode={setStartInExamMode}
                    practiceMode={practiceMode}
                    onChangePracticeMode={setPracticeMode}
                  />
                )}
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <PaperHistorySidebar
                  entries={paperHistory.data?.papers ?? []}
                  isLoading={paperHistory.isLoading}
                  onReview={(attemptId) => setHistoryAttemptId(attemptId)}
                />
              </div>
            </div>
          ) : null}

          {/* TAB 2: TOPICAL PAST PAPERS (ALL 16 SYLLABUS TOPICS) */}
          {libraryTab === "topical" ? (
            <TopicalPaperShowcase
              topicalPapers={TOPICAL_MCQ_PAPERS}
              busy={!!busyLabel}
              busyPaperId={selectedPaperId}
              onStart={(topical) =>
                beginPractice(toMcqPaperSummaryFromTopical(topical), undefined, practiceMode)
              }
              onHostLiveQuiz={(topical) => openHostLiveQuiz("topical_paper", topical.id)}
              activeDraftPaperId={activeDraftSummary?.paper.id}
              activeDraftAnswersCount={
                activeDraftSummary ? Object.keys(activeDraftSummary.draft.answers).length : 0
              }
              startInExamMode={startInExamMode}
              onToggleExamMode={setStartInExamMode}
              practiceMode={practiceMode}
              onChangePracticeMode={setPracticeMode}
              onSwitchToPastPapers={() => setLibraryTab("past_papers")}
            />
          ) : null}

          {/* TAB 3: LIVE QUIZ ARENA (BLOOKET / QUIZIZZ STYLE MULTIPLAYER) */}
          {libraryTab === "live_quiz" ? (
            <McqQuizArenaTab onOpenHostModal={(src) => openHostLiveQuiz(src ?? "library_paper")} />
          ) : null}

          {/* TAB 4: PERFORMANCE & ANALYTICS */}
          {libraryTab === "analytics" ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
              <div className="min-w-0 space-y-4">
                {topicPerformance.data?.topics && topicPerformance.data.topics.length > 0 ? (
                  <>
                    {topicPerformance.data.totalTaggedMistakes &&
                    topicPerformance.data.totalTaggedMistakes > 0 &&
                    topicPerformance.data.mistakeCounts ? (
                      <McqMistakeLedger
                        countsOverride={topicPerformance.data.mistakeCounts}
                        title="Lifetime Mistake Pathology — Why You Lose Marks"
                      />
                    ) : null}
                    <McqDomainBreakdown
                      domains={aggregateMcqDomainsFromTopicStats(
                        (topicPerformance.data?.topics ?? []).map((t) => ({
                          topic: t.topic,
                          attempted: t.attempted,
                          correct: t.correct,
                        })),
                      )}
                      title="Overall Performance: Microeconomics vs Macroeconomics"
                    />
                    <McqReviewPanel topics={topicPerformance.data?.topics ?? []} />
                  </>
                ) : (
                  <Card className="border-border/80">
                    <CardContent className="py-10 text-center space-y-2">
                      <TrendingUp className="h-7 w-7 text-muted-foreground mx-auto" />
                      <p className="text-sm font-semibold text-foreground">
                        No completed MCQ analytics yet
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Complete a Full Past Paper or Topical Past Paper to unlock your
                        Microeconomics vs Macroeconomics split and topic-by-topic diagnostic report.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <PaperHistorySidebar
                  entries={paperHistory.data?.papers ?? []}
                  isLoading={paperHistory.isLoading}
                  onReview={(attemptId) => setHistoryAttemptId(attemptId)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[100dvh] overflow-hidden bg-background",
            examModeActive && "fixed inset-0 z-[100] h-screen w-screen",
          )}
        >
          <div className="shrink-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur md:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <Button size="sm" variant="ghost" onClick={leavePractice} className="h-8 px-2 text-xs gap-1 shrink-0">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Papers</span>
              </Button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold truncate text-foreground max-w-[100px] min-[380px]:max-w-[140px] sm:max-w-xs md:max-w-md" title={paperTitle}>
                  {paperTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {!examModeActive ? (
                <div
                  className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-[11px]"
                  role="group"
                  aria-label="Practice mode"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeMode("full_paper");
                      practiceModeRef.current = "full_paper";
                      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-all",
                      practiceMode === "full_paper"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="View the full scrollable PDF paper with side answer sheet"
                  >
                    <BookOpen className="h-3 w-3" />
                    <span className="hidden md:inline">Full Paper</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeMode("question_by_question");
                      practiceModeRef.current = "question_by_question";
                      saveDraftToStorage(answersRef.current, flaggedRef.current, timeLeftRef.current);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-all",
                      practiceMode === "question_by_question"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="One real PDF question at a time with instant correction & mistake diagnosis"
                  >
                    <Target className="h-3 w-3" />
                    <span className="hidden sm:inline">1-by-1</span>
                  </button>
                </div>
              ) : null}

              {timeLeft !== null && practiceMode === "full_paper" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={timerEnabled ? "default" : "outline"}
                    onClick={() => setTimerEnabled((v: boolean) => !v)}
                    className="h-8 px-2 text-xs gap-1 hidden sm:inline-flex"
                    title={
                      timerEnabled
                        ? "Turn the timer off — it pauses, nothing is submitted early."
                        : "Turn the timer back on — it resumes from where it paused."
                    }
                  >
                    <TimerIcon className="h-3.5 w-3.5" />
                    <span>Timer</span>
                  </Button>

                  {timerEnabled ? (
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap tabular-nums",
                        timeLeft === 0
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : timeLeft <= LOW_TIME_WARNING_SECONDS
                            ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted/60 text-foreground"
                      )}
                      title={`${level === "a2" ? "Paper 1 (IGCSE 0455)" : "Paper 1 (AS)"} — ${
                        PAPER_DURATION_SECONDS[level] / 60
                      } minutes`}
                    >
                      <TimerIcon className="h-3 w-3 sm:hidden" />
                      {formatTime(timeLeft)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Button
                size="sm"
                variant={annotateMode ? "default" : "outline"}
                onClick={() => setAnnotateMode((v) => !v)}
                className="h-8 px-2 text-xs gap-1"
                title="Toggle freehand pen markup"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Annotate</span>
              </Button>

              <Button
                size="sm"
                variant={calcOpen ? "default" : "outline"}
                onClick={() => setCalcOpen((v) => !v)}
                className={cn(
                  "h-8 px-2 text-xs gap-1.5 transition-all",
                  calcOpen && "bg-primary text-primary-foreground shadow-xs font-semibold"
                )}
                title="Cambridge Economics Calculator & Formula Solvers (Alt+C)"
              >
                <CalculatorIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calculator</span>
              </Button>

              {practiceMode === "full_paper" ? (
                <ExamToolbarControl
                  isActive={examModeActive}
                  onOpenPrompt={() => setExamPromptOpen(true)}
                  onExitExamMode={handleDisableExamMode}
                />
              ) : null}

              <ThemeToggle className="size-8" />

              {practiceMode === "full_paper" ? (
                <div className="hidden md:flex items-center gap-2 min-w-[7rem]">
                  <Progress value={(answeredCount / Math.max(qCount, 1)) * 100} className="h-2" />
                  <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {answeredCount}/{qCount}
                  </span>
                </div>
              ) : null}

              {flagged.size > 0 && practiceMode === "full_paper" ? (
                <UiBadge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs px-2 py-0.5 hidden xs:inline-flex"
                >
                  <Flag className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{flagged.size}</span>
                </UiBadge>
              ) : null}

              {!graded ? (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 font-mono text-[11px] text-muted-foreground select-none"
                  title="Autosave is active — all answers and progress are saved locally in your browser."
                >
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                      <span className="hidden xs:inline">Saving…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="hidden xs:inline">Saved</span>
                    </>
                  )}
                </div>
              ) : null}

              {practiceMode === "full_paper" ? (
                <div className="inline-flex rounded-md shadow-sm">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (gradeOnlyAttempted) {
                        gradeAndSave({ gradeOnlyAttempted: true });
                      } else if (answeredCount === qCount) {
                        gradeAndSave({ gradeOnlyAttempted: false });
                      } else if (answeredCount === 0) {
                        toast.error("Please answer at least one question before submitting.");
                      } else {
                        setSubmitPromptOpen(true);
                      }
                    }}
                    disabled={!!busyLabel}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-sm rounded-r-none"
                  >
                    {busyLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    <span>{gradeOnlyAttempted ? `Submit (${answeredCount}/${qCount})` : "Submit"}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!!busyLabel}
                        className="h-8 px-1.5 border-l border-primary-foreground/20 rounded-l-none shadow-sm"
                        title="Submission options"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          if (answeredCount === 0) {
                            toast.error("Please answer at least one question first.");
                            return;
                          }
                          gradeAndSave({ gradeOnlyAttempted: true });
                        }}
                        className="gap-2 cursor-pointer py-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-foreground">Grade Attempted Only</span>
                          <span className="text-[10px] text-muted-foreground">{answeredCount} of {qCount} answered</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => gradeAndSave({ gradeOnlyAttempted: false })}
                        className="gap-2 cursor-pointer py-2"
                      >
                        <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-foreground">Grade Entire Paper</span>
                          <span className="text-[10px] text-muted-foreground">Score out of {qCount} (unattempted = 0)</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </div>
          </div>

          {busyLabel ? (
            <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-2.5 md:px-6">
              <CompactProgressBar
                active={!!busyLabel}
                stages={[
                  { label: "Checking all selected answers against mark scheme", weight: 3 },
                  { label: "Saving score & updating topic diagnostics", weight: 3 },
                ] satisfies ProgressStage[]}
                totalMs={8_000}
                title={busyLabel}
                statusBadge="MCQ Engine"
              />
            </div>
          ) : null}

          {annotateMode ? (
            <div className="shrink-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-3 py-2 backdrop-blur md:px-6">
              <span className="text-xs text-muted-foreground">Mark up the page:</span>
              <div className="flex items-center gap-1.5">
                {ANNOTATE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setAnnotateTool("pen");
                      setAnnotateColor(c);
                    }}
                    className={[
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      annotateTool === "pen" && annotateColor === c
                        ? "scale-110 border-foreground"
                        : "border-transparent",
                    ].join(" ")}
                    style={{ backgroundColor: c }}
                    title="Pen"
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant={annotateTool === "eraser" ? "default" : "outline"}
                onClick={() => setAnnotateTool("eraser")}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Eraser className="h-3.5 w-3.5" />
                Eraser
              </Button>
              <Button size="sm" variant="outline" onClick={clearAllAnnotations} className="h-7 px-2 text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Marks are personal scratchpad notes — not saved or graded.
              </span>
            </div>
          ) : null}

          {timeUp && practiceMode === "full_paper" ? (
            <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-center text-xs text-destructive md:px-8">
              Time's up — this attempt has been submitted automatically.
            </div>
          ) : null}

          {practiceMode === "question_by_question" ? (
            <McqTutorMode
              paperTitle={paperTitle}
              level={level}
              questionNumbers={questionNumbers}
              pages={pages}
              questionPages={questionPages}
              questionSlices={questionSlices}
              stemBlobs={stemBlobs}
              topicalTopicMap={topicalTopicMap}
              answerKey={answerKey}
              answers={answers}
              checkedQuestions={checkedQuestions}
              mistakeTypes={mistakeTypes}
              eliminatedOptions={eliminatedOptions}
              questionTimes={questionTimes}
              flagged={flagged}
              activeQuestion={activeQuestion}
              explanations={explanations}
              graded={graded}
              busyLabel={busyLabel}
              result={result}
              attemptTopics={attemptTopics}
              attemptDomains={attemptDomains}
              reviewQuestions={reviewQuestions}
              annotateMode={annotateMode}
              annotateTool={annotateTool}
              annotateColor={annotateColor}
              annotationClearSeq={annotationClearSeq}
              calcOpen={calcOpen}
              onSelectActiveQuestion={(num) => {
                setActiveQuestion(num);
                activeQuestionRef.current = num;
              }}
              onPickAnswer={pick}
              onCheckAnswer={handleTutorCheckAnswer}
              onSetMistakeType={handleSetMistakeType}
              onToggleEliminate={handleToggleEliminate}
              onToggleFlag={toggleFlag}
              onExplainQuestion={handleExplain}
              onFinishSession={gradeAndSave}
            />
          ) : (
            <>
              {result
                ? (() => {
                    const pct = Math.round((result.score / Math.max(result.total, 1)) * 100);
                    const tier = resultTier(pct);
                    return (
                      <div
                        className={cn(
                          "shrink-0 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 md:px-6",
                          tier.className,
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <tier.Icon className="h-5 w-5 shrink-0" />
                          <span className="text-lg font-extrabold tracking-tight tabular-nums">
                            {result.score} / {result.total}
                          </span>
                          <span className="rounded-full border border-current/25 bg-background/50 px-2 py-0.5 font-mono text-xs font-bold">
                            {pct}%
                          </span>
                          <span className="text-xs sm:text-sm font-semibold">{tier.label}</span>
                          <ExamIntegrityReport
                            wasExamModeActive={hadExamModeRef.current || examModeActive}
                            violations={examViolations}
                          />
                        </div>

                        {attemptTopics.length > 0 ? (
                          <Button
                            size="sm"
                            variant={showAttemptDiagnostics ? "default" : "outline"}
                            onClick={() => setShowAttemptDiagnostics((v) => !v)}
                            className="h-7 gap-1.5 px-2.5 text-xs font-semibold bg-background/90 text-foreground hover:bg-background"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {showAttemptDiagnostics
                                ? "Hide Topic Breakdown"
                                : "View Topic Breakdown"}
                            </span>
                          </Button>
                        ) : null}
                      </div>
                    );
                  })()
                : null}

              <div
                className={cn(
                  "flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative transition-all duration-150",
                  activeViolation && "blur-xl opacity-0 pointer-events-none select-none",
                )}
              >
                {/* Paper Column: Independently scrollable, only the paper scrolls */}
                <div
                  ref={scrollRef}
                  className="flex-1 min-w-0 h-full overflow-y-auto px-2 sm:px-4 py-4 scroll-smooth"
                >
                  <div className="w-full max-w-[820px] mx-auto flex flex-col items-center gap-8 pb-36 lg:pb-16">
                    {graded && showAttemptDiagnostics && attemptTopics.length > 0 ? (
                      <div className="w-full max-w-2xl space-y-3 pt-1 pb-4 border-b border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
                        {Object.keys(mistakeTypes).length > 0 ? (
                          <McqMistakeLedger
                            mistakeTypes={mistakeTypes}
                            wrongNumbers={reviewQuestions
                              .filter((q) => q.correct === false)
                              .map((q) => q.number)}
                            onSelectQuestion={goToQuestion}
                          />
                        ) : null}
                        <McqDomainBreakdown
                          domains={attemptDomains}
                          title="This Paper: Microeconomics vs Macroeconomics"
                        />
                        <McqReviewPanel
                          topics={attemptTopics}
                          questions={reviewQuestions}
                          onSelectQuestion={goToQuestion}
                          title="Topic Diagnostic (This Paper)"
                          emptyLabel="No topics tagged."
                        />
                      </div>
                    ) : null}

                    {pages.map((page) => (
                      <PageCanvas
                        key={page.pageNumber}
                        page={page}
                        totalPages={pages.length}
                        pageQuestions={Object.entries(questionPages)
                          .filter(([, p]) => p === page.pageNumber)
                          .map(([q]) => Number(q))
                          .sort((a, b) => a - b)}
                        answers={answers}
                        activeQuestion={activeQuestion}
                        onSelectQuestion={goToQuestion}
                        annotateMode={annotateMode}
                        annotateTool={annotateTool}
                        annotateColor={annotateColor}
                        onRegisterAnnotationCanvas={registerAnnotationCanvas}
                      />
                    ))}
                  </div>
                </div>

                {/* Desktop Side Panel: Permanently FIXED right beside the paper, NEVER disappears */}
                <aside
                  className={cn(
                    "hidden lg:flex flex-col shrink-0 h-full border-l border-border/80 bg-card/40 backdrop-blur-xs z-10",
                    graded ? "w-80 xl:w-96" : "w-72 xl:w-84"
                  )}
                >
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-28">
                    {graded ? (
                      <McqQuestionReviewList
                        questions={reviewQuestions}
                        onSelect={goToQuestion}
                        onExplain={handleExplain}
                        explanations={explanations}
                        title="Review & explain"
                      />
                    ) : (
                      <AnswerSidePanel
                        numbers={questionNumbers}
                        answers={answers}
                        answerKey={answerKey}
                        graded={graded}
                        onPick={pick}
                        flagged={flagged}
                        onToggleFlag={toggleFlag}
                        highlightNumber={highlightNumber}
                        rowRefs={answerRowRefs}
                        onJumpToQuestion={goToQuestion}
                        activeQuestion={activeQuestion}
                        questionPages={questionPages}
                        saveStatus={saveStatus}
                        gradeOnlyAttempted={gradeOnlyAttempted}
                        onToggleGradeOnlyAttempted={(val) => {
                          setGradeOnlyAttempted(val);
                          gradeOnlyAttemptedRef.current = val;
                        }}
                      />
                    )}
                  </div>
                </aside>
              </div>

              {/* Mobile floating bottom answering dock */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {graded ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    Score: {result?.score ?? 0} / {result?.total ?? qCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(((result?.score ?? 0) / Math.max(result?.total ?? qCount, 1)) * 100)}%)
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setMobileReviewOpen(true)}
                  className="gap-1.5 h-9"
                >
                  <BookOpen className="size-3.5" />
                  Review &amp; Explain
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Top navigation row: Prev, Active Question info & flag, Sheet toggle, Next */}
                <div className="flex items-center justify-between gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activeQuestion <= 1}
                    onClick={() => goToQuestion(Math.max(1, activeQuestion - 1))}
                    className="h-8 px-2 text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Prev</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFlag(activeQuestion)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                        flagged.has(activeQuestion)
                          ? "border-amber-500 bg-amber-500/15 text-amber-500"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      title={flagged.has(activeQuestion) ? "Unflag" : "Flag"}
                    >
                      <Flag className={cn("h-3.5 w-3.5", flagged.has(activeQuestion) && "fill-amber-500")} />
                    </button>

                    <span className="font-mono font-bold text-sm text-foreground">
                      Q{activeQuestion}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {qCount}
                    </span>

                    {answers[activeQuestion] ? (
                      <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                        {answers[activeQuestion]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setMobileSheetOpen(true)}
                      className="h-8 px-2.5 text-xs gap-1 font-mono"
                      title="Open full question sheet"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>{answeredCount}/{qCount}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeQuestion >= qCount}
                      onClick={() => goToQuestion(Math.min(qCount, activeQuestion + 1))}
                      className="h-8 px-2 text-xs gap-1"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Bottom row: Four large touch buttons for A, B, C, D */}
                <div className="grid grid-cols-4 gap-2">
                  {(["A", "B", "C", "D"] as Letter[]).map((l) => {
                    const isPicked = answers[activeQuestion] === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          pick(activeQuestion, l);
                          if (activeQuestion < qCount) {
                            window.setTimeout(() => {
                              goToQuestion(activeQuestion + 1);
                            }, 250);
                          }
                        }}
                        className={cn(
                          "h-11 rounded-xl font-bold text-base transition-all flex items-center justify-center border shadow-sm active:scale-95",
                          isPicked
                            ? "bg-primary text-primary-foreground border-primary shadow-md font-extrabold ring-2 ring-primary/40"
                            : "bg-background border-border/80 text-foreground hover:bg-muted"
                        )}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Question Grid Sheet */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-t-2xl">
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span>Answer Sheet Matrix</span>
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {answeredCount} / {qCount} answered
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 pb-24">
                <AnswerSidePanel
                  numbers={questionNumbers}
                  answers={answers}
                  answerKey={answerKey}
                  graded={graded}
                  onPick={pick}
                  flagged={flagged}
                  onToggleFlag={toggleFlag}
                  highlightNumber={highlightNumber}
                  rowRefs={answerRowRefs}
                  onJumpToQuestion={(q, opts) => {
                    goToQuestion(q, opts);
                    if (!opts?.skipScrollPaper) {
                      setMobileSheetOpen(false);
                    }
                  }}
                  activeQuestion={activeQuestion}
                  questionPages={questionPages}
                  gradeOnlyAttempted={gradeOnlyAttempted}
                  onToggleGradeOnlyAttempted={(val) => {
                    setGradeOnlyAttempted(val);
                    gradeOnlyAttemptedRef.current = val;
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Review Sheet */}
          <Sheet open={mobileReviewOpen} onOpenChange={setMobileReviewOpen}>
            <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-t-2xl">
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span>Question Review &amp; Explanations</span>
                  {result ? (
                    <span className="font-mono text-xs font-bold text-primary">
                      {result.score} / {result.total} ({Math.round((result.score / Math.max(result.total, 1)) * 100)}%)
                    </span>
                  ) : null}
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <McqQuestionReviewList
                  questions={reviewQuestions}
                  onSelect={(q) => {
                    goToQuestion(q);
                    setMobileReviewOpen(false);
                  }}
                  onExplain={handleExplain}
                  explanations={explanations}
                  title="Review & explain"
                />
                {attemptTopics.length > 0 ? (
                  <div className="space-y-4 pt-4 border-t">
                    <McqDomainBreakdown domains={attemptDomains} title="Microeconomics vs Macroeconomics" />
                    <McqReviewPanel
                      topics={attemptTopics}
                      questions={reviewQuestions}
                      onSelectQuestion={(q) => {
                        goToQuestion(q);
                        setMobileReviewOpen(false);
                      }}
                      title="Topic-Wise Diagnostic & Lagging Areas"
                    />
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
            </>
          )}
        </div>
      )}

      <PastAttemptSheet
        attemptId={historyAttemptId}
        attempt={historyAttempt.data ?? null}
        isLoading={historyAttempt.isLoading}
        explanations={historyExplanations}
        onExplain={handleHistoryExplain}
        onOpenFullPaper={openFullPastPaper}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryAttemptId(null);
            setHistoryExplanations({});
          }
        }}
      />
      <McqCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} />

      <McqQuizHostModal
        open={hostQuizModalOpen}
        onOpenChange={setHostQuizModalOpen}
        libraryPapers={papersQuery.data?.papers ?? []}
        initialSourceType={hostQuizSourceType}
        initialPaperId={hostQuizPaperId}
      />

      <ExamLockdownPromptDialog
        open={examPromptOpen}
        onOpenChange={setExamPromptOpen}
        onConfirm={handleEnableExamMode}
      />

      <ExamViolationOverlay
        violation={activeViolation}
        totalViolations={examViolations}
        onResume={handleResumeFullscreen}
        onDisableExamMode={handleDisableExamMode}
      />

      <SubmitGradingDialog
        open={submitPromptOpen}
        onOpenChange={setSubmitPromptOpen}
        attemptedCount={answeredCount}
        totalCount={qCount}
        busy={!!busyLabel}
        onConfirm={(onlyAttempted) => {
          setSubmitPromptOpen(false);
          gradeAndSave({ gradeOnlyAttempted: onlyAttempted });
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Paper history sidebar + past-attempt review sheet                     */
/* -------------------------------------------------------------------- */

/** Formats a score as "X/Y (Z%)", or a dash when there's nothing to show. */
function formatScore(score: number | null, total: number): string {
  if (score === null || total === 0) return "—";
  return `${score}/${total}`;
}

function scorePct(score: number | null, total: number): number | null {
  if (score === null || total === 0) return null;
  return Math.round((score / total) * 100);
}

/**
 * Sidebar list of every paper the student has attempted, one row per
 * paper — retakes collapse together. Shows the aggregate (first-attempt,
 * counts-toward-progress) score plus the latest attempt's score when it
 * differs, and how many times the paper's been retaken. Clicking a row
 * opens that paper's most recent attempt for revision.
 */
function PaperHistorySidebar({
  entries,
  isLoading,
  onReview,
}: {
  entries: PaperHistoryEntry[];
  isLoading: boolean;
  onReview: (attemptId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Your history</p>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Papers you finish will show up here with your score, so you can come back and revise
            them any time.
          </p>
        ) : (
          <ul className="-mx-1 max-h-[70vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
            {entries.map((entry) => {
              const key = entry.paperId ?? entry.aggregateAttemptId;
              const aggregatePct = scorePct(entry.aggregateScore, entry.aggregateTotal);
              const latestDiffers = entry.latestAttemptId !== entry.aggregateAttemptId;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onReview(entry.latestAttemptId)}
                    className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="truncate font-medium text-foreground">{entry.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                      <span
                        className={
                          aggregatePct !== null
                            ? aggregatePct >= 70
                              ? "font-semibold text-emerald-600 dark:text-emerald-400"
                              : aggregatePct >= 50
                                ? "font-semibold text-amber-600 dark:text-amber-400"
                                : "font-semibold text-destructive"
                            : "font-semibold"
                        }
                      >
                        {formatScore(entry.aggregateScore, entry.aggregateTotal)}
                      </span>
                      {aggregatePct !== null ? <span>({aggregatePct}%)</span> : null}
                      {entry.attemptsCount > 1 ? (
                        <span>· {entry.attemptsCount} attempts</span>
                      ) : null}
                    </span>
                    {latestDiffers ? (
                      <span className="text-muted-foreground/80">
                        Latest retake: {formatScore(entry.latestScore, entry.latestTotal)}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground/80">
          Only your first attempt at a paper counts toward your score — retake freely to revise, it
          just won't change the number above.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Side sheet for revisiting a finished attempt: score banner plus the same
 * click-to-review, explain-on-demand list used right after marking — just
 * fed from a saved attempt instead of the one just completed. Deliberately
 * skips re-fetching or re-rendering the original PDF pages; the review
 * list already carries everything needed to revise.
 */
function PastAttemptSheet({
  attemptId,
  attempt,
  isLoading,
  explanations,
  onExplain,
  onOpenFullPaper,
  onOpenChange,
}: {
  attemptId: string | null;
  attempt: {
    title: string;
    level?: "as" | "a2";
    paperId: string;
    score: number | null;
    total: number;
    questions: GradedQuestion[];
  } | null;
  isLoading: boolean;
  explanations: Record<number, ExplanationState>;
  onExplain: (number: number) => void;
  onOpenFullPaper: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const pct = attempt ? scorePct(attempt.score, attempt.total) : null;
  const tier = pct !== null ? resultTier(pct) : null;
  const levelUpper = attempt?.level === "a2" ? "A2" : "AS";
  const sheetTopics = useMemo(
    () => (attempt ? buildTopicStatsFromQuestions(attempt.questions, levelUpper) : []),
    [attempt, levelUpper],
  );
  const sheetDomains = useMemo(
    () =>
      attempt
        ? aggregateMcqDomains(
            attempt.questions.map((q) => ({
              topic: q.topic,
              correct: !!q.correct,
              number: q.number,
              level: levelUpper,
            })),
          )
        : [],
    [attempt, levelUpper],
  );

  return (
    <Sheet open={!!attemptId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{attempt?.title ?? "Past attempt"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !attempt ? (
            <p className="text-sm text-destructive">Couldn't load that attempt.</p>
          ) : (
            <>
              {tier ? (
                <div
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg border px-4 py-4 text-center",
                    tier.className,
                  ].join(" ")}
                >
                  <tier.Icon className="h-6 w-6" />
                  <span className="text-2xl font-bold tracking-tight">
                    {attempt.score} / {attempt.total}
                  </span>
                  <span className="text-sm font-medium">{tier.label}</span>
                </div>
              ) : null}

              <Button type="button" className="w-full" onClick={onOpenFullPaper}>
                <BookOpen className="size-4" /> Open full paper and questions
              </Button>

              {attempt.questions.some((q) => !!q.mistake_type) ? (
                <McqMistakeLedger
                  mistakeTypes={Object.fromEntries(
                    attempt.questions.flatMap((q) =>
                      q.mistake_type ? [[q.number, q.mistake_type]] : [],
                    ),
                  )}
                  wrongNumbers={attempt.questions
                    .filter((q) => q.correct === false)
                    .map((q) => q.number)}
                />
              ) : null}

              {sheetTopics.length > 0 ? (
                <>
                  <McqDomainBreakdown
                    domains={sheetDomains}
                    title="Microeconomics vs Macroeconomics"
                  />
                  <McqReviewPanel
                    topics={sheetTopics}
                    questions={attempt.questions}
                    title="Topic-Wise Diagnostic & Lagging Areas"
                  />
                </>
              ) : null}

              <McqQuestionReviewList
                questions={attempt.questions}
                onSelect={() => {}}
                onExplain={onExplain}
                explanations={explanations}
                title="Question-by-Question Review & Explanations"
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- */
/* Page canvas                                                            */
/* -------------------------------------------------------------------- */

function PageCanvas({
  page,
  totalPages,
  pageQuestions,
  answers,
  activeQuestion,
  onSelectQuestion,
  annotateMode,
  annotateTool,
  annotateColor,
  onRegisterAnnotationCanvas,
}: {
  page: PageImage;
  totalPages: number;
  pageQuestions: number[];
  answers: Record<number, Letter>;
  activeQuestion: number;
  onSelectQuestion: (number: number) => void;
  annotateMode: boolean;
  annotateTool: AnnotateTool;
  annotateColor: string;
  onRegisterAnnotationCanvas: (pageNumber: number, el: HTMLCanvasElement | null) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dataUrl = useMemo(() => page.canvas.toDataURL("image/png"), [page.canvas]);

  return (
    <div
      id={`mcq-page-${page.pageNumber}`}
      className="w-full max-w-[820px] scroll-mt-20 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="font-semibold text-foreground">Page {page.pageNumber}</span>
          <span className="opacity-60">/ {totalPages}</span>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-md shadow-xl border border-border/80 bg-white dark:bg-card select-none"
        style={{ aspectRatio: `${page.canvas.width} / ${page.canvas.height}` }}
      >
        <img
          ref={imgRef}
          src={dataUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-full object-contain pointer-events-none block"
        />

        <AnnotationLayer
          width={page.canvas.width}
          height={page.canvas.height}
          enabled={annotateMode}
          tool={annotateTool}
          color={annotateColor}
          registerCanvas={(el) => onRegisterAnnotationCanvas(page.pageNumber, el)}
        />
      </div>
    </div>
  );
}

/**
 * A transparent freehand-drawing canvas layered above the page image.
 * Purely a client-side scratchpad — nothing here is persisted or graded,
 * it just lets a student circle a distractor, cross out an option, or
 * mark up a diagram the way they would on paper.
 *
 * Pointer events only land on this layer while `enabled` — otherwise
 * `pointer-events: none` lets clicks pass straight through to the page
 * underneath, so toggling "Annotate" off instantly restores normal
 * behaviour with nothing else to change.
 */
function AnnotationLayer({
  width,
  height,
  enabled,
  tool,
  color,
  registerCanvas,
}: {
  width: number;
  height: number;
  enabled: boolean;
  tool: AnnotateTool;
  color: string;
  registerCanvas: (el: HTMLCanvasElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    registerCanvas(canvasRef.current);
    return () => registerCanvas(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;
    const pos = getPos(e);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    }
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    lastPointRef.current = pos;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-20"
      style={{
        touchAction: "none",
        pointerEvents: enabled ? "auto" : "none",
        cursor: enabled ? (tool === "eraser" ? "cell" : "crosshair") : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}

/**
 * The answer panel itself: one plain row per question, each with normal
 * A/B/C/D buttons — no positioning against the page, no overlay, just a
 * list a student clicks down. Grading/highlighting logic is identical to
 * before; only where the buttons live has changed.
 */
function AnswerSidePanel({
  numbers,
  answers,
  answerKey,
  graded,
  onPick,
  flagged = new Set(),
  onToggleFlag,
  highlightNumber,
  rowRefs,
  onJumpToQuestion,
  activeQuestion,
  questionPages,
  saveStatus,
  gradeOnlyAttempted,
  onToggleGradeOnlyAttempted,
}: {
  numbers: number[];
  answers: Record<number, Letter>;
  answerKey: Record<number, Letter>;
  graded: boolean;
  onPick: (number: number, letter: Letter) => void;
  flagged?: Set<number>;
  onToggleFlag?: (number: number) => void;
  /** Question number to visually pulse right now (from clicking a review-list row), or null. */
  highlightNumber?: number | null;
  rowRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onJumpToQuestion?: (number: number, options?: { skipScrollPaper?: boolean }) => void;
  activeQuestion?: number;
  questionPages?: Record<number, number>;
  saveStatus?: "saved" | "saving";
  gradeOnlyAttempted?: boolean;
  onToggleGradeOnlyAttempted?: (val: boolean) => void;
}) {
  const [filter, setFilter] = useState<"all" | "flagged" | "unanswered">("all");
  const [showGrid, setShowGrid] = useState(false);

  const effectiveNumbers = useMemo(() => {
    if (numbers && numbers.length > 0) return numbers;
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, [numbers]);

  const answeredCount = effectiveNumbers.filter((n) => !!answers[n]).length;
  const flaggedCount = effectiveNumbers.filter((n) => flagged.has(n)).length;
  const unansweredCount = effectiveNumbers.length - answeredCount;

  const filteredNumbers = effectiveNumbers.filter((n) => {
    if (filter === "flagged") return flagged.has(n);
    if (filter === "unanswered") return !answers[n];
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header controls & status */}
      <div className="space-y-2 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Questions ({answeredCount}/{effectiveNumbers.length})
          </span>
          <div className="flex items-center gap-1.5">
            {!graded && saveStatus ? (
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground select-none"
                title="Autosave is active — all answers and timer progress are saved locally in your browser."
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-500" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                    <span>Saved</span>
                  </>
                )}
              </span>
            ) : null}
            <Button
              type="button"
              variant={showGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowGrid((v) => !v)}
              className="h-7 px-2 text-xs gap-1"
              title={showGrid ? "Hide question matrix" : "Show quick jump matrix"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Matrix</span>
            </Button>
          </div>
        </div>

        {/* Quick jump matrix */}
        {showGrid ? (
          <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>Quick jump:</span>
              <span className="flex items-center gap-1.5 text-[10px]">
                <span className="inline-block w-2 h-2 rounded-full bg-primary/70" /> Answered
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Flagged
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {effectiveNumbers.map((n) => {
                const isAnswered = !!answers[n];
                const isFlagged = flagged.has(n);
                const isCurrent = activeQuestion === n || highlightNumber === n;
                const pageNum = questionPages?.[n];
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (filter !== "all" && !filteredNumbers.includes(n)) {
                        setFilter("all");
                      }
                      onJumpToQuestion?.(n);
                    }}
                    className={cn(
                      "relative h-7 text-[11px] font-mono rounded border flex items-center justify-center transition-all",
                      isCurrent
                        ? "ring-2 ring-primary border-primary font-bold bg-primary/15 text-primary"
                        : isAnswered
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          : "bg-background border-border/60 text-muted-foreground hover:bg-muted",
                      isFlagged && "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                    title={`Question ${n}${pageNum ? ` (Page ${pageNum})` : ""}${isFlagged ? " (Flagged)" : ""}${isAnswered ? ` (Answer: ${answers[n]})` : " (Unanswered)"}`}
                  >
                    {n}
                    {isFlagged ? (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Filter pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "flex-1 text-center py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All ({effectiveNumbers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("flagged")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "flagged"
                ? "bg-amber-500 text-white shadow-sm"
                : flaggedCount > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Flag className={cn("h-3 w-3", filter === "flagged" || flaggedCount > 0 ? "fill-current" : "")} />
            Flagged ({flaggedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unanswered")}
            className={cn(
              "flex-1 text-center py-1 px-1.5 rounded text-[11px] font-medium transition-colors",
              filter === "unanswered"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Left ({unansweredCount})
          </button>
        </div>

        {/* Grade only attempted option */}
        {!graded && onToggleGradeOnlyAttempted ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/40 border border-border/60">
            <label
              htmlFor="grade-only-attempted-checkbox"
              className="flex items-center gap-2 text-[11px] font-medium cursor-pointer select-none text-foreground"
            >
              <Checkbox
                id="grade-only-attempted-checkbox"
                checked={!!gradeOnlyAttempted}
                onCheckedChange={(checked) => onToggleGradeOnlyAttempted(Boolean(checked))}
                className="h-3.5 w-3.5"
              />
              <span>Grade only attempted</span>
            </label>
            <span className="text-[10px] font-mono text-muted-foreground">
              {gradeOnlyAttempted ? `${answeredCount} Qs` : `All ${effectiveNumbers.length}`}
            </span>
          </div>
        ) : null}
      </div>

      {/* Question list */}
      {filteredNumbers.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {filter === "flagged" ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">No flagged questions</p>
              <p>Click the flag icon next to any question to mark it for review.</p>
            </div>
          ) : filter === "unanswered" ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">All answered!</p>
              <p>You have answered all {effectiveNumbers.length} questions in this paper.</p>
            </div>
          ) : (
            <p>No questions found.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 pb-24">
          {filteredNumbers.map((number) => {
            const isFlagged = flagged.has(number);
            const isCurrent = activeQuestion === number || highlightNumber === number;
            const pageNum = questionPages?.[number];
            return (
              <div
                key={number}
                ref={(el) => {
                  if (el) rowRefs.current.set(number, el);
                  else rowRefs.current.delete(number);
                }}
                className={cn(
                  "flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 transition-all",
                  isCurrent
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40 font-medium"
                    : isFlagged
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-transparent hover:border-border/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {onToggleFlag ? (
                    <button
                      type="button"
                      onClick={() => onToggleFlag(number)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded transition-transform hover:scale-110",
                        isFlagged
                          ? "text-amber-500"
                          : "text-muted-foreground/30 hover:text-amber-500/70"
                      )}
                      title={isFlagged ? `Question ${number} flagged — click to unflag` : `Flag question ${number} for review`}
                    >
                      <Flag className={cn("h-3.5 w-3.5", isFlagged && "fill-amber-500")} />
                      <span className="sr-only">Flag Q{number}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onJumpToQuestion?.(number)}
                    className="flex items-baseline gap-1 text-left group/btn"
                    title={`Jump paper to Question ${number}${pageNum ? ` (Page ${pageNum})` : ""}`}
                  >
                    <span className={cn(
                      "font-mono text-xs font-semibold group-hover/btn:text-primary transition-colors",
                      isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {number}
                    </span>
                    {pageNum ? (
                      <span className="text-[10px] text-muted-foreground/60 font-mono group-hover/btn:text-primary">
                        p.{pageNum}
                      </span>
                    ) : null}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {(["A", "B", "C", "D"] as Letter[]).map((l) => (
                    <AnswerOptionButton
                      key={l}
                      letter={l}
                      picked={answers[number] === l}
                      correct={graded && answerKey[number] === l}
                      wrong={graded && answers[number] === l && answerKey[number] !== l}
                      onClick={() => {
                        onPick(number, l);
                        // On laptop/desktop side panel, picking an answer should NOT auto-scroll the paper!
                        onJumpToQuestion?.(number, { skipScrollPaper: true });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnswerOptionButton({
  letter,
  picked,
  correct,
  wrong,
  onClick,
}: {
  letter: Letter;
  picked: boolean;
  correct: boolean;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all duration-150 active:scale-95",
        "hover:scale-105",
        picked
          ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40 font-extrabold"
          : "border-border/80 bg-background/90 text-foreground hover:bg-muted",
        correct
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
          : "",
        wrong ? "badge-shake border-destructive bg-destructive text-white" : ""
      )}
    >
      {letter}
    </button>
  );
}

/* -------------------------------------------------------------------- */
/* Mark scheme parsing                                                   */
/* -------------------------------------------------------------------- */

type McqPaperSummary = Awaited<ReturnType<typeof listMcqPapers>>["papers"][number];

/** Oldest-defined-first because we want most-recent series shown first within a year. */
const SERIES_DISPLAY_ORDER = ["Oct/Nov", "May/June", "Feb/March"] as const;

function paperCode(paper: McqPaperSummary): string {
  if (!paper || !paper.title) return "Paper";
  // 1. Look for explicit "Paper XX"
  const namedPaper = paper.title.match(/\bpaper\s*(\d{1,2})\b/i)?.[1];
  if (namedPaper) return `Paper ${namedPaper.padStart(2, "0")}`;

  // 2. Look for Cambridge code e.g. 9708_w24_qp_13 or 0455-m23-12
  const codeMatch =
    paper.title.match(/0455[_\s-]+[msw]\d{2}[_\s-]+(?:qp|ms|paper)?[_\s-]*(\d{2})/i)?.[1] ??
    paper.title.match(/(?:qp|ms)[_\s-]*(\d{2})\b/i)?.[1] ??
    paper.title.match(/\b9708[\s/_-]+(\d{2})\b/i)?.[1];
  if (codeMatch) return `Paper ${codeMatch.padStart(2, "0")}`;

  // 3. Fallback: match any two-digit paper code like 11, 12, 13, 31, 32, 33
  const variantMatch = paper.title.match(/\b([13][1-3])\b/)?.[1];
  if (variantMatch) return `Paper ${variantMatch}`;

  return paper.title;
}

function hasCompleteAnswerKey(paper: McqPaperSummary): boolean {
  if (!paper) return false;
  if (typeof (paper as any).hasCompleteKey === "boolean") {
    return (paper as any).hasCompleteKey;
  }
  const key = (paper as any).answerKey;
  if (!key) return false;
  return Array.from(
    { length: paper.questionCount || 0 },
    (_, index) => Boolean(key[String(index + 1)]),
  ).every(Boolean);
}

function uniqueSorted<T>(values: T[], compare: (a: T, b: T) => number): T[] {
  return Array.from(new Set(values)).sort(compare);
}

function PracticeModePicker({
  value,
  onChange,
  onHostQuiz,
  compact = false,
}: {
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
  onHostQuiz?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Practice Mode
        </span>
        {value === "question_by_question" ? (
          <span className="text-[10px] font-semibold text-primary">
            Instant correction + mistake diagnosis
          </span>
        ) : null}
      </div>
      <div className={cn("grid gap-2", onHostQuiz ? (compact ? "grid-cols-3" : "sm:grid-cols-3") : (compact ? "grid-cols-2" : "sm:grid-cols-2"))}>
        <button
          type="button"
          onClick={() => onChange("full_paper")}
          className={cn(
            "flex flex-col gap-0.5 rounded-xl border p-2.5 text-left transition-all",
            value === "full_paper"
              ? "border-2 border-primary bg-primary/[0.06] shadow-2xs"
              : "border-border/80 bg-background hover:border-foreground/40",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Full Exam Paper</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Whole PDF scrollable paper, exam timer, marked at the end.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange("question_by_question")}
          className={cn(
            "flex flex-col gap-0.5 rounded-xl border p-2.5 text-left transition-all",
            value === "question_by_question"
              ? "border-2 border-primary bg-primary/[0.06] shadow-2xs"
              : "border-border/80 bg-background hover:border-foreground/40",
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Target className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Question-by-Question</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            1 real PDF question at a time · corrects mistakes immediately.
          </p>
        </button>

        {onHostQuiz ? (
          <button
            type="button"
            onClick={onHostQuiz}
            className="flex flex-col gap-0.5 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 p-2.5 text-left transition-all group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Gamepad2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span>Live Quiz Arena</span>
              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300">PIN</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Host multiplayer arena with PIN, power-ups &amp; live podium.
            </p>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PastPaperSelector({
  papers,
  busy,
  busyPaperId,
  onStart,
  onHostLiveQuiz,
  activeDraftPaperId,
  activeDraftAnswersCount = 0,
  startInExamMode = false,
  onToggleExamMode,
  practiceMode = "full_paper",
  onChangePracticeMode,
}: {
  papers: McqPaperSummary[];
  busy: boolean;
  busyPaperId: string | null;
  onStart: (paper: McqPaperSummary) => void;
  onHostLiveQuiz?: (paper: McqPaperSummary) => void;
  activeDraftPaperId?: string | null;
  activeDraftAnswersCount?: number;
  startInExamMode?: boolean;
  onToggleExamMode?: (enabled: boolean) => void;
  practiceMode?: PracticeMode;
  onChangePracticeMode?: (mode: PracticeMode) => void;
}) {
  const years = useMemo(() => {
    return uniqueSorted(
      (papers || []).map((paper) => (paper?.examYear ? String(paper.examYear) : "Unsorted")),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        return Number(b) - Number(a);
      },
    );
  }, [papers]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const activeYear = years.includes(selectedYear) ? selectedYear : (years[0] ?? "");

  const yearPapers = useMemo(() => {
    return (papers || []).filter(
      (paper) => (paper?.examYear ? String(paper.examYear) : "Unsorted") === activeYear,
    );
  }, [papers, activeYear]);

  const seriesOptions = useMemo(() => {
    return uniqueSorted(
      yearPapers.map((paper) => paper?.examSeries ?? "Unsorted"),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
        const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      },
    );
  }, [yearPapers]);

  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const activeSeries = seriesOptions.includes(selectedSeries)
    ? selectedSeries
    : (seriesOptions[0] ?? "");

  const seriesPapers = useMemo(() => {
    return yearPapers.filter((paper) => (paper.examSeries ?? "Unsorted") === activeSeries);
  }, [yearPapers, activeSeries]);

  const levels = useMemo(() => {
    return uniqueSorted(
      seriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
  }, [seriesPapers]);

  const [preferredLevel, setPreferredLevel] = useState<Level>(() => {
    try {
      const saved = window.localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetLevel === "a2_level") return "a2";
        if (parsed.targetLevel === "as_level") return "as";
      }
    } catch {
      // fallback
    }
    return "as";
  });

  const activeLevel = levels.includes(preferredLevel) ? preferredLevel : (levels[0] ?? "as");

  const matchingPapers = useMemo(() => {
    return seriesPapers
      .filter((paper) => paper.level === activeLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
  }, [seriesPapers, activeLevel]);

  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const selectedPaper = useMemo(() => {
    return matchingPapers.find((paper) => paper.id === selectedPaperId) ?? matchingPapers[0] ?? null;
  }, [matchingPapers, selectedPaperId]);

  function chooseYear(nextYear: string) {
    setSelectedYear(nextYear);
    const nextYearPapers = papers.filter(
      (paper) => (paper.examYear ? String(paper.examYear) : "Unsorted") === nextYear,
    );
    const nextSeriesOptions = uniqueSorted(
      nextYearPapers.map((paper) => paper.examSeries ?? "Unsorted"),
      (a, b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
        const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      },
    );
    const nextSeries = nextSeriesOptions.includes(activeSeries)
      ? activeSeries
      : (nextSeriesOptions[0] ?? "");
    setSelectedSeries(nextSeries);

    const nextSeriesPapers = nextYearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevels = uniqueSorted(
      nextSeriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
    const nextLevel = (nextLevels.includes(activeLevel) ? activeLevel : (nextLevels[0] ?? "as")) as Level;
    setPreferredLevel(nextLevel);

    const nextMatching = nextSeriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function chooseSeries(nextSeries: string) {
    setSelectedSeries(nextSeries);
    const nextSeriesPapers = yearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevels = uniqueSorted(
      nextSeriesPapers.map((paper) => paper.level),
      (a, b) => a.localeCompare(b),
    );
    const nextLevel = (nextLevels.includes(activeLevel) ? activeLevel : (nextLevels[0] ?? "as")) as Level;
    setPreferredLevel(nextLevel);

    const nextMatching = nextSeriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function chooseLevel(nextLevel: Level) {
    setPreferredLevel(nextLevel);
    const nextMatching = seriesPapers
      .filter((paper) => paper.level === nextLevel)
      .sort((a, b) => paperCode(a).localeCompare(paperCode(b)));
    setSelectedPaperId(nextMatching[0]?.id ?? "");
  }

  function choosePaperId(nextId: string) {
    setSelectedPaperId(nextId);
  }

  return (
    <Card className="overflow-hidden border-2 border-foreground/80 shadow-[6px_6px_0_hsl(var(--foreground))]">
      <CardContent className="space-y-6 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
            Paper selection
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-xl border bg-muted/25 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Board and subject</p>
          <p className="mt-1 font-semibold">Cambridge International · Economics (0455)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PaperSelect label="Year" value={activeYear} options={years} onChange={chooseYear} />
          <PaperSelect
            label="Exam session"
            value={activeSeries}
            options={seriesOptions}
            onChange={chooseSeries}
          />
          <PaperSelect
            label="Level"
            value={activeLevel}
            options={levels}
            format={(value) => (value === "as" ? "IGCSE 0455" : "IGCSE 0455")}
            onChange={(value) => chooseLevel(value as Level)}
          />
          <PaperSelect
            label="Paper code"
            value={selectedPaper?.id ?? ""}
            options={matchingPapers.map((paper) => paper.id)}
            format={(id) => {
              const paper = matchingPapers.find((entry) => entry.id === id);
              return paper ? paperCode(paper) : "Select a paper";
            }}
            onChange={choosePaperId}
          />
        </div>

        {selectedPaper ? (
          <div className="space-y-4 border-t pt-5">
            {onChangePracticeMode ? (
              <PracticeModePicker
                value={practiceMode}
                onChange={onChangePracticeMode}
                onHostQuiz={onHostLiveQuiz ? () => onHostLiveQuiz(selectedPaper) : undefined}
              />
            ) : null}

            {onToggleExamMode && practiceMode === "full_paper" ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Full Screen Proctored Test Mode</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Launches in full-screen exam mode with instant window minimize and tab switch detection.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={startInExamMode}
                  onCheckedChange={onToggleExamMode}
                  aria-label="Toggle Full Screen Proctored Test Mode on start"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{selectedPaper.title}</p>
                  {activeDraftPaperId === selectedPaper.id ? (
                    <UiBadge variant="secondary" className="border-primary/40 text-primary text-[10px] uppercase font-bold tracking-wider">
                      In-Progress ({activeDraftAnswersCount} answered)
                    </UiBadge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedPaper.questionCount} questions
                  {hasCompleteAnswerKey(selectedPaper)
                    ? " · Complete mark scheme included"
                    : " · Incomplete mark scheme — ask an administrator to re-upload it"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 sm:ml-auto">
                {onHostLiveQuiz ? (
                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    disabled={busy || !hasCompleteAnswerKey(selectedPaper)}
                    onClick={() => onHostLiveQuiz(selectedPaper)}
                    className="h-10 gap-1.5 whitespace-nowrap font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    title="Generate a live Blooket / Quizizz link for students to play this paper together"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    Host Live Quiz
                  </Button>
                ) : null}
                <Button
                  size="default"
                  disabled={busy || !hasCompleteAnswerKey(selectedPaper)}
                  onClick={() => onStart(selectedPaper)}
                  className="h-10 whitespace-nowrap font-semibold"
                >
                  {busy && busyPaperId === selectedPaper.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : activeDraftPaperId === selectedPaper.id ? (
                    <>
                      <Play className="mr-1.5 h-4 w-4 fill-current" />
                      Resume in-progress exam
                    </>
                  ) : practiceMode === "question_by_question" ? (
                    <>
                      <Target className="mr-1.5 h-4 w-4" />
                      Start 1-by-1 Tutor
                    </>
                  ) : (
                    "Load question paper"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No paper is available for this combination. Choose another session or level.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PaperSelect<T extends string>({
  label,
  value,
  options,
  format = (option) => option,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  format?: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="h-12 w-full rounded-xl border-2 border-foreground/80 bg-background font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {format(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Groups the flat paper list into Year → Series buckets for the student
 * picker. Papers uploaded before the exam_year/exam_series columns existed
 * have neither set — those fall into an "Unsorted" bucket at the end
 * rather than being hidden, so nothing an administrator already uploaded
 * disappears.
 */
function groupPapersByYearAndSeries(papers: McqPaperSummary[]) {
  const byYear = new Map<string, McqPaperSummary[]>();
  for (const paper of papers) {
    const key = paper.examYear ? String(paper.examYear) : "Unsorted";
    const list = byYear.get(key);
    if (list) list.push(paper);
    else byYear.set(key, [paper]);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => {
    if (a === "Unsorted") return 1;
    if (b === "Unsorted") return -1;
    return Number(b) - Number(a);
  });

  return years.map((year) => {
    const papersForYear = byYear.get(year)!;
    const bySeries = new Map<string, McqPaperSummary[]>();
    for (const paper of papersForYear) {
      const key = paper.examSeries ?? "Unsorted";
      const list = bySeries.get(key);
      if (list) list.push(paper);
      else bySeries.set(key, [paper]);
    }

    const seriesKeys = Array.from(bySeries.keys()).sort((a, b) => {
      if (a === "Unsorted") return 1;
      if (b === "Unsorted") return -1;
      const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
      const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return {
      year,
      seriesGroups: seriesKeys.map((series) => ({
        series,
        papers: bySeries.get(series)!,
      })),
    };
  });
}

function parseAnswerKeyFromText(text: string): Record<number, Letter> {
  const re = /(\d{1,3})\s+([ABCD])\s+\d+/g;
  let m: RegExpExecArray | null;
  let expected = 1;
  const out: Record<number, Letter> = {};
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n === expected) {
      out[n] = m[2] as Letter;
      expected++;
    }
  }
  return out;
}

function TopicalPaperShowcase({
  topicalPapers,
  busy,
  busyPaperId,
  onStart,
  onHostLiveQuiz,
  activeDraftPaperId,
  activeDraftAnswersCount = 0,
  startInExamMode = false,
  onToggleExamMode,
  practiceMode = "full_paper",
  onChangePracticeMode,
  onSwitchToPastPapers,
}: {
  topicalPapers: TopicalMcqPaper[];
  busy: boolean;
  busyPaperId: string | null;
  onStart: (paper: TopicalMcqPaper) => void;
  onHostLiveQuiz?: (paper: TopicalMcqPaper) => void;
  activeDraftPaperId?: string | null;
  activeDraftAnswersCount?: number;
  startInExamMode?: boolean;
  onToggleExamMode?: (enabled: boolean) => void;
  practiceMode?: PracticeMode;
  onChangePracticeMode?: (mode: PracticeMode) => void;
  onSwitchToPastPapers?: () => void;
}) {
  const [selectedLevel, setSelectedLevel] = useState<"as" | "a2">("as");
  const [selectedDomain, setSelectedDomain] = useState<"all" | "micro" | "macro">("all");
  const [selectedId, setSelectedId] = useState<string>(
    topicalPapers[0]?.id ?? "topical-0455-as-price-system-micro",
  );

  const filteredPapers = useMemo(() => {
    return topicalPapers.filter((p) => {
      if (p.level !== selectedLevel) return false;
      if (selectedDomain !== "all" && p.domain !== selectedDomain) return false;
      return true;
    });
  }, [topicalPapers, selectedLevel, selectedDomain]);

  const activeTopic = useMemo(() => {
    return (
      filteredPapers.find((p) => p.id === selectedId) ??
      filteredPapers[0] ??
      topicalPapers[0] ??
      null
    );
  }, [filteredPapers, selectedId, topicalPapers]);

  if (topicalPapers.length === 0 || !activeTopic) {
    const UNITS = [
      {
        unit: "Unit 1",
        title: "The Basic Economic Problem",
        topics: "Scarcity, Factors of Production, Opportunity Cost, Production Possibility Curves (PPC)",
        icon: Target,
      },
      {
        unit: "Unit 2",
        title: "The Allocation of Resources",
        topics: "Microeconomics, Demand & Supply, Price Elasticity (PED/PES), Market Failure & Externalities",
        icon: TrendingUp,
      },
      {
        unit: "Unit 3",
        title: "Microeconomic Decision Makers",
        topics: "Money & Banking, Households, Workers & Wages, Trade Unions, Production & Cost Theory",
        icon: Users,
      },
      {
        unit: "Unit 4",
        title: "Government & Macroeconomy",
        topics: "Macro Objectives, Fiscal Policy, Monetary Policy, Supply-Side Policy, Inflation & Unemployment",
        icon: Landmark,
      },
      {
        unit: "Unit 5",
        title: "Economic Development",
        topics: "Living Standards, Human Development Index (HDI), Poverty Traps, Population Demographics",
        icon: Globe,
      },
      {
        unit: "Unit 6",
        title: "Trade & Globalisation",
        topics: "International Specialisation, Free Trade & Tariffs, Fixed vs Floating Exchange Rates, Current Account BOP",
        icon: ArrowRightLeft,
      },
    ];

    return (
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 sm:p-10 shadow-xs space-y-8 animate-in fade-in duration-200">
        <div className="max-w-2xl space-y-3 text-center sm:text-left">
          <UiBadge className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-3 py-1">
            <Sparkles className="size-3.5 mr-1.5" /> Cambridge IGCSE Economics (0455)
          </UiBadge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Topical MCQ Practice Coming Soon
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We are currently curating and verifying 600+ authentic Cambridge 0455 multiple-choice questions with vector diagram slices, step-by-step examiner explanations, and subtopic mastery tracking across all 6 syllabus units.
          </p>
          {onSwitchToPastPapers && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onSwitchToPastPapers}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
              >
                <BookOpen className="size-3.5" />
                Practice Full Past Papers (2018–2026)
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UNITS.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.unit}
                className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2 hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-primary uppercase">
                    {u.unit}
                  </span>
                  <UiBadge variant="outline" className="text-[9px] font-mono py-0 px-1.5 border-primary/30 text-primary bg-primary/5">
                    Curating
                  </UiBadge>
                </div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icon className="size-4 text-primary shrink-0" />
                  <span>{u.title}</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {u.topics}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const isBusyActive = busy && busyPaperId === activeTopic.id;
  const isDraftActive = activeDraftPaperId === activeTopic.id;
  const uniqueSourcePapers = Array.from(
    new Set(activeTopic.questions.map((q) => q.sourcePaperCode)),
  );

  return (
    <div className="space-y-5">
      {/* Top Filter Bar: AS vs A2 Level + Micro vs Macro */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedLevel("as");
              const firstAs = topicalPapers.find(
                (p) =>
                  p.level === "as" && (selectedDomain === "all" || p.domain === selectedDomain),
              );
              if (firstAs) setSelectedId(firstAs.id);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              selectedLevel === "as"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            IGCSE 0455 (Units 1–6 · 8 Topics)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLevel("a2");
              const firstA2 = topicalPapers.find(
                (p) =>
                  p.level === "a2" && (selectedDomain === "all" || p.domain === selectedDomain),
              );
              if (firstA2) setSelectedId(firstA2.id);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              selectedLevel === "a2"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            IGCSE 0455 / A2 (Units 7–11 · 8 Topics)
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5 text-xs">
          {(
            [
              { id: "all", label: "All Units" },
              { id: "micro", label: "Microeconomics" },
              { id: "macro", label: "Macroeconomics" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDomain(d.id)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                selectedDomain === d.id
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Workspace: Topic Grid on Left, Selected Topic Details & Launch Card on Right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left: Compact Scannable Topic Selector Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2 content-start">
          {filteredPapers.map((paper) => {
            const isSelected = paper.id === activeTopic.id;
            const isDraft = activeDraftPaperId === paper.id;
            return (
              <button
                key={paper.id}
                type="button"
                onClick={() => setSelectedId(paper.id)}
                className={cn(
                  "group relative flex flex-col justify-between gap-2 rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-2 border-primary bg-primary/[0.05] shadow-xs"
                    : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                      {paper.topicNumber} · {paper.domain === "micro" ? "Micro" : "Macro"}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {paper.questionCount} Qs
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2">
                    {paper.shortTitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{paper.visualSummaryLabel}</span>
                  {isDraft ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      In Progress ({activeDraftAnswersCount}/{paper.questionCount})
                    </span>
                  ) : (
                    <span>{Math.round(paper.durationSeconds / 60)} min</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Sticky Selected Topic Launch Card */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden border-2 border-foreground/80 shadow-[5px_5px_0_hsl(var(--foreground))]">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  <Layers className="h-3 w-3" />
                  {activeTopic.topicNumber}
                </span>
                <UiBadge variant="outline" className="text-[10px] font-semibold uppercase">
                  {activeTopic.level === "as" ? "IGCSE 0455 (Paper 1)" : "IGCSE 0455 (Paper 1)"}
                </UiBadge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold leading-snug text-foreground">
                  {activeTopic.shortTitle}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeTopic.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/25 p-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Questions &amp; Time
                  </span>
                  <p className="font-bold text-foreground">
                    {activeTopic.questionCount} Qs · {Math.round(activeTopic.durationSeconds / 60)}{" "}
                    min
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Real Visuals
                  </span>
                  <p className="font-bold text-primary">{activeTopic.visualSummaryLabel}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sliced From Official Papers
                </span>
                <div className="flex flex-wrap gap-1">
                  {uniqueSourcePapers.map((code) => (
                    <span
                      key={code}
                      className="rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {onChangePracticeMode ? (
                <PracticeModePicker
                  value={practiceMode}
                  onChange={onChangePracticeMode}
                  onHostQuiz={onHostLiveQuiz ? () => onHostLiveQuiz(activeTopic) : undefined}
                  compact
                />
              ) : null}

              {onToggleExamMode && practiceMode === "full_paper" ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground text-[11px]">
                      Full Screen Proctored Mode
                    </span>
                  </div>
                  <Switch
                    checked={startInExamMode}
                    onCheckedChange={onToggleExamMode}
                    aria-label="Toggle Full Screen Proctored Test Mode"
                  />
                </div>
              ) : null}

              <Button
                size="lg"
                disabled={busy}
                onClick={() => onStart(activeTopic)}
                className="w-full font-semibold shadow-sm"
              >
                {isBusyActive ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Building exam slices…
                  </>
                ) : isDraftActive ? (
                  <>
                    <Play className="mr-1.5 h-4 w-4 fill-current" />
                    Resume Topic ({activeDraftAnswersCount}/{activeTopic.questionCount})
                  </>
                ) : practiceMode === "question_by_question" ? (
                  <>
                    <Target className="mr-1.5 h-4 w-4" />
                    Start 1-by-1 Topical Tutor
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-4 w-4 fill-current" />
                    Start Topical Paper
                  </>
                )}
              </Button>
              {onHostLiveQuiz ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onHostLiveQuiz(activeTopic)}
                  className="w-full gap-1.5 font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Host Live Class Quiz Link
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
