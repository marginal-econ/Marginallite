import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Flag,
  History,
  LayoutGrid,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Timer as TimerIcon,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { getMe } from "@/lib/account.functions";
import {
  McqReviewPanel,
  McqQuestionReviewList,
  McqDomainBreakdown,
  type ExplanationState,
  type TopicStat,
  type GradedQuestion,
} from "@/components/app/mcq-review-panel";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { listMcqPapers, startMcqAttempt, getServerTime } from "@/lib/mcq-papers.functions";
import {
  calculateClockOffset,
  calculateRemainingSeconds,
  shouldAutoSubmit,
  getTimerAnnouncement,
  formatTimer,
} from "@/lib/mcq-timer";
import { MCQ_PAPER_CONFIG, detectEraFromMetadata, type Era } from "@/lib/igcse/paper-config";
import {
  loadPdfjs,
  extractQuestionStems,
  type PdfTextItem,
  type StemBlob,
} from "@/lib/mcq-pdf-text";
import {
  aggregateMcqDomains,
  aggregateMcqDomainsFromTopicStats,
  type DomainStat,
} from "@/lib/mcq-domain";
import { cn } from "@/lib/utils";

/** Fixed render scale for the plain page image — no positions are computed
 *  against it (there's no overlay anymore), it's purely how big/sharp the
 *  page looks on screen. */
const RENDER_SCALE = 1.6;

// Optional paperId prefill lets a paper-library link start a specific paper.
// Direct navigation still opens the library picker.
const mcqLiveSearchSchema = z
  .object({
    paperId: z.string().uuid().optional().catch(undefined),
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
type EraType = "legacy" | "2027" | string;

/**
 * Cambridge IGCSE Economics (0455) Paper 1 timings:
 * - Legacy (through June 2026): 30 questions, 45 minutes (2700s)
 * - 2027-2029 syllabus: 40 questions, 1 hour (3600s)
 */
function getPaperDurationSeconds(paper: {
  questionCount?: number | null;
  examYear?: number | null;
  level?: string | null;
}): number {
  if (
    paper.questionCount === 40 ||
    (paper.examYear != null && paper.examYear >= 2027) ||
    paper.level === "2027"
  ) {
    return MCQ_PAPER_CONFIG["2027"].durationSeconds;
  }
  return MCQ_PAPER_CONFIG.legacy.durationSeconds;
}

const LOW_TIME_WARNING_SECONDS = 5 * 60;
const MCQ_DRAFT_VERSION = 1;
const MCQ_ACTIVE_VERSION = 1;

type McqDraft = {
  version: number;
  paperId: string;
  attemptId?: string | null;
  examEndsAtMs?: number | null;
  clockOffsetMs?: number;
  answers: Record<number, Letter>;
  flagged?: number[];
  timeLeft: number | null;
  savedAt: number;
};

function mcqDraftKey(userId: string, paperId: string) {
  return `marginalite.mcq-draft.v${MCQ_DRAFT_VERSION}.${userId}.${paperId}`;
}

function mcqActiveKey(userId: string) {
  return `marginalite.mcq-active.v${MCQ_ACTIVE_VERSION}.${userId}`;
}

function readActiveMcqPaper(userId: string): string | null {
  try {
    const raw = window.localStorage.getItem(mcqActiveKey(userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as { version: number; paperId: string };
    return value.version === MCQ_ACTIVE_VERSION ? value.paperId : null;
  } catch {
    return null;
  }
}

function readMcqDraft(userId: string, paperId: string): McqDraft | null {
  try {
    const raw = window.localStorage.getItem(mcqDraftKey(userId, paperId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as McqDraft;
    if (draft.version !== MCQ_DRAFT_VERSION || draft.paperId !== paperId) return null;
    return draft;
  } catch {
    return null;
  }
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
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const [stage, setStage] = useState<"library" | "practice">("library");
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [level, setLevel] = useState<EraType>("legacy");
  const [qCount, setQCount] = useState(30);
  const [paperTitle, setPaperTitle] = useState("Past paper practice");
  const [answerKey, setAnswerKey] = useState<Record<number, Letter>>({});
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const [pages, setPages] = useState<PageImage[]>([]);
  const [stemBlobs, setStemBlobs] = useState<StemBlob[]>([]);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  const toggleFlag = useCallback((number: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }, []);

  const [graded, setGraded] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [attemptTopics, setAttemptTopics] = useState<TopicStat[]>([]);
  // SAT-"Reading vs Writing" style micro/macro split for this one paper,
  // computed alongside attemptTopics from the same graded questions.
  const [attemptDomains, setAttemptDomains] = useState<DomainStat[]>([]);
  // Full per-question breakdown for the click-to-review list — populated
  // alongside `result`/`attemptTopics` once grading finishes.
  const [reviewQuestions, setReviewQuestions] = useState<GradedQuestion[]>([]);
  // On-demand explanation per question number, fetched only when the
  // student presses "Explain" in the post-attempt review list.
  const [explanations, setExplanations] = useState<Record<number, ExplanationState>>({});
  // Active question number currently selected / being viewed
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
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

      // 1. Scroll PDF paper directly to the page containing this question
      if (!options?.skipScrollPaper) {
        const targetPage =
          questionPages[number] ??
          Math.min(pages.length, Math.max(1, Math.ceil(number / 2) + 1));
        const pageEl = document.getElementById(`mcq-page-${targetPage}`);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      // 2. Scroll answer row in the desktop side panel
      const el = answerRowRefs.current.get(number);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      window.setTimeout(() => setHighlightNumber((cur) => (cur === number ? null : cur)), 2000);
    },
    [pages.length, questionPages],
  );

  // ---- Server-Authoritative Timer & Synchronization ----
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [examEndsAtMs, setExamEndsAtMs] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState<string>("");
  const announcedThresholds = useRef<Set<number>>(new Set());
  const autoSubmittedRef = useRef(false);

  const startMcqAttemptFn = useServerFn(startMcqAttempt);
  const getServerTimeFn = useServerFn(getServerTime);

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
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const listPapersFn = useServerFn(listMcqPapers);
  const papersQuery = useQuery({ queryKey: ["mcq-papers"], queryFn: () => listPapersFn() });

  const classifyTopicsFn = useServerFn(classifyMcqTopics);
  const submitAttemptFn = useServerFn(submitPdfMcqAttempt);
  const explainFn = useServerFn(explainMcqAnswer);
  const fetchPaperPdfFn = useServerFn(fetchPaperPdf);

  /** Fetches a short written explanation for one question, on demand — only
   *  ever called from the post-attempt review list, never during the attempt. */
  async function handleExplain(number: number) {
    if (explanations[number] === "loading") return;
    setExplanations((prev) => ({ ...prev, [number]: "loading" }));
    const q = reviewQuestions.find((r) => r.number === number);
    const correctAnswer = q?.correct_answer;
    if (!correctAnswer) {
      setExplanations((prev) => ({
        ...prev,
        [number]: { error: "No mark-scheme answer on record for this question." },
      }));
      return;
    }
    try {
      const stem = stemBlobs.find((s) => s.number === number)?.text ?? "";
      const { explanation } = await explainFn({
        data: {
          level,
          number,
          stemText: stem,
          correctAnswer,
          userAnswer: q?.user_answer ?? null,
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
          level: historyAttempt.data.level,
          number,
          stemText: "",
          correctAnswer,
          userAnswer: q?.user_answer ?? null,
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
 * captured by OCR text-layer parsing, guaranteeing every question maps to a real page.
 */
function fillMissingQuestionPages(
  map: Record<number, number>,
  totalQuestions: number,
  numPages: number,
): Record<number, number> {
  const result: Record<number, number> = { ...map };
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
      result[q] = Math.max(1, Math.min(numPages, estPage));
    } else if (prevQ !== -1) {
      const estPage = Math.min(numPages, result[prevQ] + Math.floor((q - prevQ) / 2));
      result[q] = estPage;
    } else if (nextQ !== -1) {
      const estPage = Math.max(1, result[nextQ] - Math.ceil((nextQ - q) / 2));
      result[q] = estPage;
    } else {
      result[q] = Math.min(numPages, Math.max(1, Math.ceil(q / 2) + 1));
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
  ) {
    setSelectedPaperId(paper.id);
    setPaperTitle(paper.title);
    setLevel(paper.level);
    setQCount(paper.questionCount);
    setAnswerKey(paper.answerKey as Record<number, Letter>);
    const draft =
      !completedAttempt && me.data?.userId ? readMcqDraft(me.data.userId, paper.id) : null;
    const completedAnswers = completedAttempt
      ? Object.fromEntries(
          completedAttempt.questions.flatMap((question) =>
            question.user_answer ? [[question.number, question.user_answer]] : [],
          ),
        )
      : null;
    setAnswers(completedAnswers ?? draft?.answers ?? {});
    setFlagged(new Set(draft?.flagged ?? []));
    setGraded(!!completedAttempt);
    setResult(
      completedAttempt && completedAttempt.score !== null
        ? { score: completedAttempt.score, total: completedAttempt.total }
        : null,
    );
    setReviewQuestions(completedAttempt?.questions ?? []);
    if (completedAttempt) {
      const byTopic = new Map<string, { attempted: number; correct: number }>();
      for (const question of completedAttempt.questions) {
        const entry = byTopic.get(question.topic) ?? { attempted: 0, correct: 0 };
        entry.attempted += 1;
        if (question.correct) entry.correct += 1;
        byTopic.set(question.topic, entry);
      }
      setAttemptTopics(
        [...byTopic.entries()].map(([savedTopic, value]) => ({
          topic: savedTopic,
          attempted: value.attempted,
          correct: value.correct,
          accuracyPct: Math.round((value.correct / value.attempted) * 100),
        })),
      );
      setAttemptDomains(
        aggregateMcqDomains(
          completedAttempt.questions.map((question) => ({
            topic: question.topic,
            correct: !!question.correct,
          })),
        ),
      );
    } else {
      setAttemptTopics([]);
      setAttemptDomains([]);
    }
    setExplanations({});

    // Server-authoritative timer setup
    setTimeUp(false);
    autoSubmittedRef.current = false;
    setAnnotateMode(false);
    annotationCanvases.current.clear();
    announcedThresholds.current.clear();

    if (completedAttempt) {
      setTimeLeft(null);
      setExamEndsAtMs(null);
      setCurrentAttemptId(null);
    } else if (draft?.examEndsAtMs) {
      const offset = draft.clockOffsetMs ?? 0;
      setClockOffsetMs(offset);
      setExamEndsAtMs(draft.examEndsAtMs);
      if (draft.attemptId) setCurrentAttemptId(draft.attemptId);
      const rem = calculateRemainingSeconds(draft.examEndsAtMs, Date.now(), offset);
      setTimeLeft(rem);
      if (shouldAutoSubmit(rem)) {
        setTimeUp(true);
      }
    } else {
      try {
        const attemptRes = await startMcqAttemptFn({ data: { paperId: paper.id } });
        const offset = calculateClockOffset(attemptRes.serverNow, Date.now());
        setCurrentAttemptId(attemptRes.attemptId);
        setExamEndsAtMs(attemptRes.examEndsAt);
        setClockOffsetMs(offset);
        const rem = calculateRemainingSeconds(attemptRes.examEndsAt, Date.now(), offset);
        setTimeLeft(rem);
      } catch (startErr) {
        console.warn("Could not start server-authoritative attempt session:", startErr);
        const dur = getPaperDurationSeconds(paper);
        const endsAt = Date.now() + dur * 1000;
        setExamEndsAtMs(endsAt);
        setTimeLeft(dur);
      }
    }

    setBusyLabel("Fetching the paper…");
    try {
      const pdfjs = await loadPdfjs();
      let buf: ArrayBuffer;
      try {
        const res = await fetch(paper.qpUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      } catch (directErr) {
        // Fallback to server-side proxy download (handles CORS, ISP/network blocks, missing headers)
        try {
          const { base64 } = await fetchPaperPdfFn({ data: { qpUrl: paper.qpUrl } });
          buf = base64ToArrayBuffer(base64);
        } catch (proxyErr) {
          throw new Error("Could not download the question paper file.");
        }
      }

      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buf),
      }).promise;

      const built: PageImage[] = [];
      const stems: StemBlob[] = [];
      const rawPageMap: Record<number, number> = {};
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await (page.render({ canvasContext: ctx, viewport, canvas } as any)).promise;
        built.push({ pageNumber: p, canvas });

        try {
          const content = await page.getTextContent();
          const pageStems = extractQuestionStems(content.items as PdfTextItem[]);
          stems.push(...pageStems);
          for (const s of pageStems) {
            if (s.number >= 1 && s.number <= paper.questionCount && !rawPageMap[s.number]) {
              rawPageMap[s.number] = p;
            }
          }
        } catch (textErr) {
          console.warn(`Text extraction skipped for page ${p}:`, textErr);
        }
      }

      const completedPageMap = fillMissingQuestionPages(
        rawPageMap,
        paper.questionCount,
        doc.numPages,
      );
      setQuestionPages(completedPageMap);
      setPages(built);
      setStemBlobs(stems);
      setActiveQuestion(1);
      setStage("practice");
      if (me.data?.userId && !completedAttempt) {
        window.localStorage.setItem(
          mcqActiveKey(me.data.userId),
          JSON.stringify({ version: MCQ_ACTIVE_VERSION, paperId: paper.id }),
        );
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
    if (stage !== "library" || !me.data?.userId) return;
    const paperId = search.paperId ?? readActiveMcqPaper(me.data.userId);
    if (!paperId) return;
    const paper = papersQuery.data?.papers.find((p) => p.id === paperId);
    if (!paper) return;
    autoStartedRef.current = true;
    beginPractice(paper);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.paperId, papersQuery.data, stage, me.data?.userId]);

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


  /* ---------------- Server-Authoritative Timer & Visibility Sync ----------------
   *
   * Recomputes remaining seconds from absolute deadline on every second
   * and instantly when tab visibility returns. Automatically announces 10m,
   * 5m, and 1m warnings to screen readers.
   */
  useEffect(() => {
    if (stage !== "practice" || graded || !timerEnabled || !examEndsAtMs) return;

    const checkAndSyncTimer = () => {
      const rem = calculateRemainingSeconds(examEndsAtMs, Date.now(), clockOffsetMs);
      setTimeLeft(rem);

      if (shouldAutoSubmit(rem)) {
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          setTimeUp(true);
          toast.warning("Time's up — submitting your answers automatically.");
          gradeAndSave();
        }
        return;
      }

      const announcement = getTimerAnnouncement(rem, announcedThresholds.current);
      if (announcement) {
        announcedThresholds.current.add(announcement.threshold);
        setScreenReaderAnnouncement(announcement.message);
      }
    };

    checkAndSyncTimer();
    const intervalId = window.setInterval(checkAndSyncTimer, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndSyncTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, graded, timerEnabled, examEndsAtMs, clockOffsetMs]);

  // Keep an account-scoped draft for the active paper. A refresh, closed tab,
  // or temporary connection loss no longer discards the student's choices.
  useEffect(() => {
    if (stage !== "practice" || graded || !selectedPaperId || !me.data?.userId) return;
    const id = window.setTimeout(() => {
      const draft: McqDraft = {
        version: MCQ_DRAFT_VERSION,
        paperId: selectedPaperId,
        attemptId: currentAttemptId,
        examEndsAtMs,
        clockOffsetMs,
        answers,
        flagged: Array.from(flagged),
        timeLeft,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(
        mcqDraftKey(me.data.userId, selectedPaperId),
        JSON.stringify(draft),
      );
      window.localStorage.setItem(
        mcqActiveKey(me.data.userId),
        JSON.stringify({ version: MCQ_ACTIVE_VERSION, paperId: selectedPaperId }),
      );
    }, 300);
    return () => window.clearTimeout(id);
  }, [answers, flagged, graded, me.data?.userId, selectedPaperId, stage, timeLeft, currentAttemptId, examEndsAtMs, clockOffsetMs]);

  /* ---------------- answering ---------------- */

  const pick = useCallback(
    (number: number, letter: Letter) => {
      if (timeUp || (timeLeft !== null && timeLeft <= 0)) return;
      setAnswers((prev) => ({ ...prev, [number]: letter }));
    },
    [timeUp, timeLeft],
  );

  /* ---------------- grading + feedback ---------------- */

  async function gradeAndSave() {
    if (Object.keys(answerKey).length === 0) {
      toast.error("No mark scheme loaded yet — upload one, or the answers can't be checked.");
      return;
    }
    setBusyLabel("Marking…");
    try {
      let tags: Record<number, { topic: string; skill: "knowledge" | "application" | "analysis" }> =
        {};
      if (stemBlobs.length > 0) {
        try {
          const { tags: rows } = await classifyTopicsFn({ data: { level, items: stemBlobs } });
          tags = Object.fromEntries(
            rows.map((t) => [t.number, { topic: t.topic, skill: t.skill }]),
          );
        } catch {
          // Grading still works without topic tags — feedback just won't be broken down.
        }
      }

      const allNumbers = new Set<number>([
        ...Object.keys(answerKey).map(Number),
        ...Object.keys(answers).map(Number),
      ]);
      const graded_ = [...allNumbers]
        .sort((a, b) => a - b)
        .map((number) => {
          const correctAnswer = answerKey[number] ?? null;
          const userAnswer = answers[number] ?? null;
          return {
            number,
            topic: tags[number]?.topic ?? "Untagged",
            skill: tags[number]?.skill ?? "knowledge",
            correct_answer: correctAnswer,
            user_answer: userAnswer,
            correct: correctAnswer ? correctAnswer === userAnswer : null,
          };
        });

      const scored = graded_.filter((q) => q.correct !== null);
      const score = scored.filter((q) => q.correct).length;
      setResult({ score, total: scored.length });
      setGraded(true);
      setReviewQuestions(
        graded_.map((q) => ({
          number: q.number,
          topic: q.topic,
          correct_answer: q.correct_answer,
          user_answer: q.user_answer,
          correct: q.correct,
        })),
      );

      const byTopic = new Map<string, { attempted: number; correct: number }>();
      for (const q of scored) {
        const entry = byTopic.get(q.topic) ?? { attempted: 0, correct: 0 };
        entry.attempted += 1;
        if (q.correct) entry.correct += 1;
        byTopic.set(q.topic, entry);
      }
      setAttemptTopics(
        [...byTopic.entries()].map(([topic, v]) => ({
          topic,
          attempted: v.attempted,
          correct: v.correct,
          accuracyPct: Math.round((v.correct / v.attempted) * 100),
        })),
      );
      setAttemptDomains(
        aggregateMcqDomains(scored.map((q) => ({ topic: q.topic, correct: !!q.correct }))),
      );

      await submitWithOfflineRetry({
        attemptId: currentAttemptId ?? undefined,
        title: paperTitle,
        filename: paperTitle,
        level,
        paperId: selectedPaperId!,
        questions: graded_,
      });
      if (me.data?.userId && selectedPaperId) {
        window.localStorage.removeItem(mcqDraftKey(me.data.userId, selectedPaperId));
        window.localStorage.removeItem(mcqActiveKey(me.data.userId));
      }
      topicPerformance.refetch();
      queryClient.invalidateQueries({ queryKey: ["mcq-paper-history"] });
      toast.success(`Marked — ${score}/${scored.length}.`);
    } catch (err) {
      toast.error("Marking failed — your answers are saved locally, try again.");
    } finally {
      setBusyLabel(null);
    }
  }

  async function submitWithOfflineRetry(payload: {
    attemptId?: string;
    paperId: string;
    title: string;
    filename?: string;
    level: string;
    questions: any[];
  }) {
    const pendingKey = payload.attemptId
      ? `marginalite.mcq.pending_submit.${payload.attemptId}`
      : `marginalite.mcq.pending_submit.paper_${payload.paperId}`;

    try {
      window.localStorage.setItem(pendingKey, JSON.stringify({ ...payload, savedAt: Date.now() }));
    } catch {}

    let retries = 0;
    const maxRetries = 3;
    let delayMs = 1000;

    while (retries < maxRetries) {
      try {
        const res = await submitAttemptFn({ data: payload });
        try {
          window.localStorage.removeItem(pendingKey);
        } catch {}
        return res;
      } catch (submitErr) {
        retries++;
        if (retries >= maxRetries) {
          throw submitErr;
        }
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  /* ---------------- render ---------------- */

  const answeredCount = Object.keys(answers).length;
  // Full ordered list of question numbers, straight off the mark scheme —
  // this is what the answer side panel renders, one row per question,
  // regardless of where (or how reliably) that question landed on the
  // page image.
  const questionNumbers = useMemo(
    () =>
      Object.keys(answerKey)
        .map(Number)
        .sort((a, b) => a - b),
    [answerKey],
  );

  function leavePractice() {
    setStage("library");
    if (me.data?.userId) window.localStorage.removeItem(mcqActiveKey(me.data.userId));
  }

  async function openFullPastPaper() {
    const attempt = historyAttempt.data;
    if (!attempt) return;
    const paper = papersQuery.data?.papers.find((entry) => entry.id === attempt.paperId);
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
      {/* Accessible screen-reader live announcement region for time warnings */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {screenReaderAnnouncement}
      </div>

      {stage === "library" ? (
        <PageHeader
          title="MCQ Live"
          description="Practice straight off an official Cambridge IGCSE Economics (0455) past paper — answer from the button panel beside it."
        />
      ) : null}

      {stage === "library" ? (
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Pick a paper to practice</p>
              </div>
              <a
                href="/mcq-papers-admin"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Admin? Manage the library
              </a>
            </div>

            {topicPerformance.data && topicPerformance.data.topics.length > 0 ? (
              <div className="mb-6 space-y-4">
                <McqDomainBreakdown
                  domains={aggregateMcqDomainsFromTopicStats(
                    topicPerformance.data.topics.map((t) => ({
                      topic: t.topic,
                      attempted: t.attempted,
                      correct: t.correct,
                    })),
                  )}
                  title="Overall Performance: micro vs macro"
                />
                <McqReviewPanel topics={topicPerformance.data.topics} />
              </div>
            ) : null}

            {papersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading the library…</p>
            ) : (papersQuery.data?.papers.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No papers are published in the library yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <PastPaperSelector
                  papers={papersQuery.data!.papers}
                  busy={!!busyLabel}
                  busyPaperId={selectedPaperId}
                  onStart={beginPractice}
                />
              </div>
            )}

            <p className="mt-5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              Read each question off the real paper, then answer from the button panel next to it —
              nothing is placed on a guess, and AI never writes, changes, or places any question.
            </p>
          </div>

          <div className="lg:sticky lg:top-10 lg:self-start">
            <PaperHistorySidebar
              entries={paperHistory.data?.papers ?? []}
              isLoading={paperHistory.isLoading}
              onReview={(attemptId) => setHistoryAttemptId(attemptId)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-hidden bg-background">
          <div className="shrink-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur md:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <Button size="sm" variant="ghost" onClick={leavePractice} className="h-8 px-2 text-xs gap-1 shrink-0">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Papers</span>
              </Button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold truncate text-foreground max-w-[130px] sm:max-w-xs md:max-w-md" title={paperTitle}>
                  {paperTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {timeLeft !== null ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={timerEnabled ? "default" : "outline"}
                    onClick={() => setTimerEnabled((v) => !v)}
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
                      title={`${level === "2027" ? "Paper 1 (2027 Syllabus · 1 Hour)" : "Paper 1 (Legacy Format · 45 Mins)"}`}
                    >
                      <TimerIcon className="h-3 w-3 sm:hidden" />
                      {formatTimer(timeLeft)}
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

              <div className="hidden md:flex items-center gap-2 min-w-[7rem]">
                <Progress value={(answeredCount / Math.max(qCount, 1)) * 100} className="h-2" />
                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {answeredCount}/{qCount}
                </span>
              </div>

              {flagged.size > 0 ? (
                <UiBadge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs px-2 py-0.5 hidden xs:inline-flex"
                >
                  <Flag className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{flagged.size}</span>
                </UiBadge>
              ) : null}

              <Button
                size="sm"
                onClick={gradeAndSave}
                disabled={!!busyLabel}
                className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-sm"
              >
                {busyLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Submit</span>
              </Button>
            </div>
          </div>

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

          {timeUp ? (
            <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-center text-xs text-destructive md:px-8">
              Time's up — this attempt has been submitted automatically.
            </div>
          ) : null}

          {result
            ? (() => {
                const pct = Math.round((result.score / Math.max(result.total, 1)) * 100);
                const tier = resultTier(pct);
                return (
                  <div
                    className={[
                      "shrink-0 animate-in fade-in slide-in-from-top-2 zoom-in-95 flex flex-col items-center justify-center gap-1.5 border-b px-5 py-5 text-center duration-300",
                      tier.className,
                    ].join(" ")}
                  >
                    <tier.Icon className="h-8 w-8" />
                    <span className="text-3xl font-bold tracking-tight">
                      {result.score} / {result.total}
                    </span>
                    <span className="text-base font-semibold">{tier.label}</span>
                    <span className="text-sm opacity-80">{pct}% correct</span>
                  </div>
                );
              })()
            : null}

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Paper Column: Independently scrollable, only the paper scrolls */}
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 h-full overflow-y-auto px-2 sm:px-4 py-4 scroll-smooth"
            >
              <div className="w-full max-w-[820px] mx-auto flex flex-col items-center gap-8 pb-36 lg:pb-16">
                {graded && attemptTopics.length > 0 ? (
                  <div className="w-full max-w-2xl space-y-4 pt-2 pb-6 border-b border-border/80">
                    <McqDomainBreakdown domains={attemptDomains} title="This paper: micro vs macro" />
                    <McqReviewPanel
                      topics={attemptTopics}
                      title="This paper, in short"
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
              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
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
                    disabled={timeUp || (timeLeft !== null && timeLeft <= 0) || graded}
                    onPick={pick}
                    flagged={flagged}
                    onToggleFlag={toggleFlag}
                    highlightNumber={highlightNumber}
                    rowRefs={answerRowRefs}
                    onJumpToQuestion={goToQuestion}
                    activeQuestion={activeQuestion}
                    questionPages={questionPages}
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
              <div className="py-4">
                <AnswerSidePanel
                  numbers={questionNumbers}
                  answers={answers}
                  answerKey={answerKey}
                  graded={graded}
                  disabled={timeUp || (timeLeft !== null && timeLeft <= 0) || graded}
                  onPick={pick}
                  flagged={flagged}
                  onToggleFlag={toggleFlag}
                  highlightNumber={highlightNumber}
                  rowRefs={answerRowRefs}
                  onJumpToQuestion={(q) => {
                    goToQuestion(q);
                    setMobileSheetOpen(false);
                  }}
                  activeQuestion={activeQuestion}
                  questionPages={questionPages}
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
                    <McqDomainBreakdown domains={attemptDomains} title="Micro vs Macro" />
                    <McqReviewPanel topics={attemptTopics} title="Topic Breakdown" />
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
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

  return (
    <Sheet open={!!attemptId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
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

              <McqQuestionReviewList
                questions={attempt.questions}
                onSelect={() => {}}
                onExplain={onExplain}
                explanations={explanations}
                title="Review & explain"
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
  disabled,
}: {
  numbers: number[];
  answers: Record<number, Letter>;
  answerKey: Record<number, Letter>;
  graded: boolean;
  disabled?: boolean;
  onPick: (number: number, letter: Letter) => void;
  flagged?: Set<number>;
  onToggleFlag?: (number: number) => void;
  /** Question number to visually pulse right now (from clicking a review-list row), or null. */
  highlightNumber?: number | null;
  rowRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onJumpToQuestion?: (number: number) => void;
  activeQuestion?: number;
  questionPages?: Record<number, number>;
}) {
  const [filter, setFilter] = useState<"all" | "flagged" | "unanswered">("all");
  const [showGrid, setShowGrid] = useState(false);

  if (numbers.length === 0) {
    return <p className="text-xs text-muted-foreground">No questions loaded.</p>;
  }

  const answeredCount = numbers.filter((n) => !!answers[n]).length;
  const flaggedCount = numbers.filter((n) => flagged.has(n)).length;
  const unansweredCount = numbers.length - answeredCount;

  const filteredNumbers = numbers.filter((n) => {
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
            Questions ({answeredCount}/{numbers.length})
          </span>
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
              {numbers.map((n) => {
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
            All ({numbers.length})
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
              <p>You have answered all {numbers.length} questions in this paper.</p>
            </div>
          ) : (
            <p>No questions found.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
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
                      disabled={disabled || graded}
                      onClick={() => {
                        onPick(number, l);
                        onJumpToQuestion?.(number);
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
  disabled,
  onClick,
}: {
  letter: Letter;
  picked: boolean;
  correct: boolean;
  wrong: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all duration-150 active:scale-95",
        "hover:scale-105 disabled:opacity-50 disabled:pointer-events-none",
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
  const syllabusVariant = paper.title.match(/\b0455[\s/_-]*(?:s|w|m)?[\s/_-]*(\d{2})\b/i)?.[1];
  const namedPaper = paper.title.match(/\bpaper\s*(\d{1,2})\b/i)?.[1];
  const compactVariant = paper.title.match(/\b(?:s|w|m)\d{2}[\s/_-]*(\d{2})\b/i)?.[1];
  const code = syllabusVariant ?? namedPaper ?? compactVariant;
  return code ? `Paper ${code.padStart(2, "0")}` : paper.title;
}

function hasCompleteAnswerKey(paper: McqPaperSummary): boolean {
  return Array.from(
    { length: paper.questionCount },
    (_, index) => paper.answerKey[String(index + 1)],
  ).every(Boolean);
}

function uniqueSorted<T>(values: T[], compare: (a: T, b: T) => number): T[] {
  return Array.from(new Set(values)).sort(compare);
}



function PastPaperSelector({
  papers,
  busy,
  busyPaperId,
  onStart,
}: {
  papers: McqPaperSummary[];
  busy: boolean;
  busyPaperId: string | null;
  onStart: (paper: McqPaperSummary) => void;
}) {
  const years = uniqueSorted(
    papers.map((paper) => (paper.examYear ? String(paper.examYear) : "Unsorted")),
    (a, b) => {
      if (a === "Unsorted") return 1;
      if (b === "Unsorted") return -1;
      return Number(b) - Number(a);
    },
  );
  const [year, setYear] = useState(years[0]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) {
      setYear(years[0]);
    }
  }, [years, year]);

  const yearPapers = papers.filter(
    (paper) => (paper.examYear ? String(paper.examYear) : "Unsorted") === year,
  );
  const seriesOptions = uniqueSorted(
    yearPapers.map((paper) => paper.examSeries ?? "Unsorted"),
    (a, b) => {
      if (a === "Unsorted") return 1;
      if (b === "Unsorted") return -1;
      const ai = SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]);
      const bi = SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    },
  );
  const [series, setSeries] = useState(seriesOptions[0]);

  useEffect(() => {
    if (seriesOptions.length > 0 && !seriesOptions.includes(series)) {
      setSeries(seriesOptions[0]);
    }
  }, [seriesOptions, series]);
  const seriesPapers = yearPapers.filter((paper) => (paper.examSeries ?? "Unsorted") === series);
  const levels = uniqueSorted(
    seriesPapers.map((paper) => paper.level),
    (a, b) => a.localeCompare(b),
  );
  const [selectedLevel, setSelectedLevel] = useState<string>(levels[0] ?? "legacy");
  const matchingPapers = seriesPapers.filter((paper) => paper.level === selectedLevel);
  const [paperId, setPaperId] = useState(matchingPapers[0]?.id ?? "");

  const selectedPaper =
    matchingPapers.find((paper) => paper.id === paperId) ?? matchingPapers[0] ?? null;

  function chooseYear(nextYear: string) {
    const nextYearPapers = papers.filter(
      (paper) => (paper.examYear ? String(paper.examYear) : "Unsorted") === nextYear,
    );
    const nextSeries = uniqueSorted(
      nextYearPapers.map((paper) => paper.examSeries ?? "Unsorted"),
      (a, b) =>
        SERIES_DISPLAY_ORDER.indexOf(a as (typeof SERIES_DISPLAY_ORDER)[number]) -
        SERIES_DISPLAY_ORDER.indexOf(b as (typeof SERIES_DISPLAY_ORDER)[number]),
    )[0];
    const nextPapers = nextYearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevel = nextPapers[0]?.level ?? "legacy";
    setYear(nextYear);
    setSeries(nextSeries);
    setSelectedLevel(nextLevel);
    setPaperId(nextPapers.find((paper) => paper.level === nextLevel)?.id ?? "");
  }

  function chooseSeries(nextSeries: string) {
    const nextPapers = yearPapers.filter(
      (paper) => (paper.examSeries ?? "Unsorted") === nextSeries,
    );
    const nextLevel = nextPapers[0]?.level ?? "legacy";
    setSeries(nextSeries);
    setSelectedLevel(nextLevel);
    setPaperId(nextPapers.find((paper) => paper.level === nextLevel)?.id ?? "");
  }

  function chooseLevel(nextLevel: string) {
    setSelectedLevel(nextLevel);
    setPaperId(seriesPapers.find((paper) => paper.level === nextLevel)?.id ?? "");
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
          <p className="mt-1 font-semibold">Cambridge IGCSE · Economics (0455)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PaperSelect label="Year" value={year} options={years} onChange={chooseYear} />
          <PaperSelect
            label="Exam session"
            value={series}
            options={seriesOptions}
            onChange={chooseSeries}
          />
          <PaperSelect
            label="Era / Format"
            value={selectedLevel}
            options={levels}
            format={(value) => (value === "2027" ? "2027 Syllabus (40 Qs)" : "Legacy Era (30 Qs)")}
            onChange={(value) => chooseLevel(value)}
          />
          <PaperSelect
            label="Paper code"
            value={selectedPaper?.id ?? ""}
            options={matchingPapers.map((paper) => paper.id)}
            format={(id) => {
              const paper = matchingPapers.find((entry) => entry.id === id);
              return paper ? paperCode(paper) : "Select a paper";
            }}
            onChange={setPaperId}
          />
        </div>

        {selectedPaper ? (
          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{selectedPaper.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPaper.questionCount} questions
                {hasCompleteAnswerKey(selectedPaper)
                  ? " · Complete mark scheme included"
                  : " · Incomplete mark scheme — ask an administrator to re-upload it"}
              </p>
            </div>
            <Button
              size="lg"
              disabled={busy || !hasCompleteAnswerKey(selectedPaper)}
              onClick={() => onStart(selectedPaper)}
              className="min-w-44"
            >
              {busy && busyPaperId === selectedPaper.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load question paper"
              )}
            </Button>
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
