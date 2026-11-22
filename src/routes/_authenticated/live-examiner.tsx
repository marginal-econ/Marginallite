import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Construction,
  Copy,
  GraduationCap,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MapPin,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { ChainedChamber } from "@/components/app/chained-chamber";
import { LiveExaminerEditor } from "@/components/app/live-examiner-editor";
import { AoLegend } from "@/components/app/live-examiner/ao-legend";
import { ScoreWidget } from "@/components/app/live-examiner/score-widget";
import { NextMarks } from "@/components/app/live-examiner/next-marks";
import type { LiveExaminerEditorHandle } from "@/components/app/live-examiner/editor";
import {
  LiveExaminerHistoryPanel,
  type LiveExaminerSessionSummary,
} from "@/components/app/live-examiner-history";
import { LiveExaminerPanel, type AutosaveState } from "@/components/app/live-examiner-panel";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { DiagramCheckDialog } from "@/components/app/diagram-check-dialog";
import {
  MarkSchemeScreenshots,
  type MarkSchemeImage,
} from "@/components/app/mark-scheme-screenshot";
import { CompactProgressBar, GradingProgress, type ProgressStage } from "@/components/app/grading-progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLiveExaminerCheck } from "@/hooks/use-live-examiner-check";
import { listApprovedEssayQuestions, listBankTopics } from "@/lib/bank.functions";
import { generateEssayQuestionAI, generateModelEssay } from "@/lib/essay.functions";
import type { GeneratedEssay } from "@/lib/essay/generator.server";
import { describeDiagramImage, listDiagramLibrary } from "@/lib/diagrams.functions";
import { gradeEssaySubmission } from "@/lib/grading.functions";
import {
  getLiveExaminerSession,
  getMaxOutSuggestions,
  prepareLiveExaminerContext,
  saveLiveExaminerSession,
  type MaxOutSuggestion,
  type MaxOutResponse,
} from "@/lib/live-examiner.functions";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { getMe } from "@/lib/account.functions";
import { topicsFor } from "@/lib/diagrams/catalog";
import { isDailyLimitError } from "@/lib/usage-limits";
import type { Grading } from "@/lib/examiner/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/live-examiner")({
  beforeLoad: async ({ context }) => {
    const user = (context as any)?.user;
    const isMarginal = isMarginalAdmin({
      userId: user?.id,
      email: user?.email,
      claims: user?.user_metadata,
    });
    if (!isMarginal) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Live Examiner — Cambridge 0455 Economics" },
      {
        name: "description",
        content:
          "Write your Cambridge 0455 Economics answer and get instant, syllabus-grounded feedback as you type — grammar, clarity, accuracy, analysis, application, evaluation, and terminology, with inline highlights and clear explanations.",
      },
      { property: "og:title", content: "Live Examiner — Cambridge 0455 Economics" },
      {
        property: "og:description",
        content:
          "Grammarly-style live feedback for Cambridge Economics essays, grounded in the syllabus.",
      },
    ],
  }),
  component: LiveExaminerPage,
});

const MARKS = [8, 12, 20];
const AUTOSAVE_DEBOUNCE_MS = 4000;

type AttachedDiagram = { id: string; label: string; tag: string };
const DIAGRAM_TAG_RE = /\[DIAGRAM:[^\]]*\]/g;
const DIAGRAM_TITLE_RE = /\[DIAGRAM:\s*([^|]+?)\s*\|/;

/** Splits a saved (possibly multi-tag) diagram_tag string back into
 *  individual attached-diagram entries when resuming a session, so each one
 *  gets its own removable badge instead of one opaque blob. */
function parseDiagramTags(raw: string): AttachedDiagram[] {
  const matches = raw.match(DIAGRAM_TAG_RE) ?? [];
  return matches.map((tag) => {
    const titleMatch = tag.match(DIAGRAM_TITLE_RE);
    return {
      id: crypto.randomUUID(),
      label: titleMatch ? titleMatch[1].trim() : "Attached diagram (resumed)",
      tag,
    };
  });
}

function combineDiagramTags(diagrams: AttachedDiagram[]): string | undefined {
  return diagrams.length > 0 ? diagrams.map((d) => d.tag).join("\n\n") : undefined;
}

function LiveExaminerPage() {
  const routeContext = Route.useRouteContext() as { user?: { id?: string; email?: string } } | undefined;
  const routeUser = routeContext?.user;
  const isRouteUserAdmin = isMarginalAdmin({ userId: routeUser?.id, email: routeUser?.email });
  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 60_000,
    retry: 1,
  });

  const isAdmin = Boolean(
    isRouteUserAdmin ||
      meQuery.data?.role === "admin" ||
      meQuery.data?.isAdmin ||
      meQuery.data?.subscription?.isAdmin ||
      (meQuery.data?.userId && isMarginalAdmin({ userId: meQuery.data.userId }))
  );

  const [level, setLevel] = useState<"as" | "a2">("as");
  const [topic, setTopic] = useState("Government microeconomic intervention");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState(12);
  const [questionSource, setQuestionSource] = useState<"type" | "ai" | "bank">("type");
  const [essayText, setEssayText] = useState("");
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [started, setStarted] = useState(false);
  // Set when the one-session-per-day limit blocks a start; shown on the setup screen.
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  // --- Diagram attach: a photo or a library pick becomes a [DIAGRAM: ...]
  // tag, same format the full grader and handwriting OCR already use. A
  // student can attach more than one (e.g. a supply/demand diagram AND a
  // PPC diagram) — every attached tag is appended to what gets sent for
  // live feedback and for grading, but never shown inside the essay text
  // box itself. ---------------------------------------------------------
  const [diagrams, setDiagrams] = useState<AttachedDiagram[]>([]);
  const [diagramDialogOpen, setDiagramDialogOpen] = useState(false);
  const diagramFileRef = useRef<HTMLInputElement>(null);

  // --- Mark scheme screenshot: pasted straight in, sent to the examiner
  // as an image (vision) alongside the retrieved text context, for both
  // the live "Grade now" pass and the full /grade page. Ephemeral —
  // not persisted with the autosaved session, only used for the next grade.
  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);

  const describeDiagram = useServerFn(describeDiagramImage);
  const describeDiagramMutation = useMutation({
    mutationFn: (image: string) => describeDiagram({ data: { image } }),
    onSuccess: (result) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: "Attached photo", tag: result.tag },
      ]);
      toast.success("Diagram read and ready — it'll be considered in your feedback.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchDiagramLibrary = useServerFn(listDiagramLibrary);
  const diagramLibraryQuery = useQuery({
    queryKey: ["live-examiner-diagram-library"],
    queryFn: () => fetchDiagramLibrary(),
    enabled: diagramDialogOpen,
    staleTime: 10 * 60_000,
  });

  function handleDiagramFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      describeDiagramMutation.mutate(dataUrl);
    };
    reader.onerror = () => toast.error("Couldn't read that photo — try again.");
    reader.readAsDataURL(file);
  }

  function applyLibraryDiagram(id: string) {
    const entry = diagramLibraryQuery.data?.find((item) => item.id === id);
    if (!entry) return;
    const curves = entry.curveLabels.filter(Boolean).join(", ") || "not specified";
    const tag =
      `[DIAGRAM: ${entry.title} | axes: ${entry.yLabel} (y) / ${entry.xLabel} (x) | ` +
      `curves: ${curves} | labels: as per the standard ${entry.title} diagram | ` +
      `accuracy: reference diagram selected from the diagram library by the student — verify it is correctly applied to their written argument]`;
    setDiagrams((current) => [...current, { id: crypto.randomUUID(), label: entry.title, tag }]);
  }

  function removeDiagram(id: string) {
    setDiagrams((current) => current.filter((d) => d.id !== id));
  }

  function clearDiagrams() {
    setDiagrams([]);
  }

  // --- Restart exam: wipes the current draft for this question and gives
  // the student a blank sheet to write the full answer again, without
  // leaving the question/level/mark setup behind. ---------------------
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // --- Grade now: the same full examiner pipeline the /grade page uses,
  // called right from here so a student never has to leave the editor to
  // get a real mark. --------------------------------------------------
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [diagramPromptOpen, setDiagramPromptOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [modelAnswerOpen, setModelAnswerOpen] = useState(false);
  const gradeNow = useServerFn(gradeEssaySubmission);
  const gradeMutation = useMutation({
    mutationFn: () =>
      gradeNow({
        data: {
          question,
          essayText,
          maxMark,
          diagramReference: combineDiagramTags(diagrams),
          markSchemeImageDataUrls:
            markSchemeImages.length > 0 ? markSchemeImages.map((img) => img.dataUrl) : undefined,
        },
      }),
    onSuccess: (data) => {
      setRevealedHints(0);
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleGradeNow(options?: { skipDiagramCheck?: boolean }) {
    const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
    if (words < 20) {
      toast.error("Write at least a short paragraph before grading.");
      return;
    }

    if (!options?.skipDiagramCheck && diagrams.length === 0) {
      setDiagramPromptOpen(true);
      return;
    }

    setGradeDialogOpen(true);
    gradeMutation.mutate();
    maxOutMutation.reset();
  }

  // --- Score Maximizer & Perfection Blueprint: on-demand or post-grade
  // guidance showing students exactly how to structure, write, and select
  // arguments to reach a perfect score (full marks). -----------------
  const [scoreMaximizerOpen, setScoreMaximizerOpen] = useState(false);
  const maxOutFn = useServerFn(getMaxOutSuggestions);
  const maxOutMutation = useMutation({
    mutationFn: (overrideInput?: {
      question: string;
      level: "as" | "a2";
      maxMark: number;
      essayText: string;
      contextBlock: string;
      totalMark: number;
      band: string;
      weaknesses: string[];
      missingElements: { knowledge?: string[]; analysis?: string[]; evaluation?: string[]; examples?: string[] };
      actionableFeedback: string[];
    }) => {
      const grading = gradeMutation.data?.grading;
      const payload = overrideInput ?? {
        question,
        level,
        maxMark,
        essayText,
        contextBlock: contextBlock || "",
        totalMark: grading?.total_mark ?? (predictedMark?.total_mark ?? Math.round(maxMark * 0.5)),
        band: grading?.band ?? (predictedMark ? `Est. ${predictedMark.total_mark}/${maxMark}` : "Draft Attempt"),
        weaknesses: grading?.weaknesses ?? [],
        missingElements: grading?.missing_elements ?? {},
        actionableFeedback: grading?.actionable_feedback ?? [],
      };
      return maxOutFn({ data: payload });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleOpenScoreMaximizer() {
    setScoreMaximizerOpen(true);
    const grading = gradeMutation.data?.grading;
    maxOutMutation.mutate({
      question,
      level,
      maxMark,
      essayText,
      contextBlock: contextBlock || "",
      totalMark: grading?.total_mark ?? (predictedMark?.total_mark ?? Math.round(maxMark * 0.5)),
      band: grading?.band ?? (predictedMark ? `Est. ${predictedMark.total_mark}/${maxMark}` : "Draft Attempt"),
      weaknesses: grading?.weaknesses ?? [],
      missingElements: grading?.missing_elements ?? {},
      actionableFeedback: grading?.actionable_feedback ?? [],
    });
  }

  function handleInsertSentence(
    text: string,
    targetAo?: "ao1" | "ao2" | "ao3" | "structure",
    placementLabel?: string,
    forceEnd = false,
  ) {
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    if (!cleanText) return;
    setEssayText((current) => {
      const trimmed = current.trim();
      if (!trimmed) return cleanText;
      if (forceEnd || !targetAo || targetAo === "ao3" || targetAo === "structure") {
        return `${trimmed}\n\n${cleanText}`;
      }
      const paragraphs = trimmed.split(/\n\s*\n/);
      if (targetAo === "ao1") {
        paragraphs[0] = `${paragraphs[0].trim()} ${cleanText}`;
        return paragraphs.join("\n\n");
      }
      if (targetAo === "ao2") {
        const bodyIdx = paragraphs.length >= 2 ? 1 : 0;
        paragraphs[bodyIdx] = `${paragraphs[bodyIdx].trim()} ${cleanText}`;
        return paragraphs.join("\n\n");
      }
      return `${trimmed}\n\n${cleanText}`;
    });
    toast.success(
      placementLabel
        ? `Inserted into ${placementLabel}.`
        : "Inserted into your essay draft.",
    );
  }

  const generateFullAnswer = useServerFn(generateModelEssay);
  const fullAnswerMutation = useMutation({
    mutationFn: () => generateFullAnswer({ data: { level, topic, question, maxMark } }),
    onSuccess: () => setModelAnswerOpen(true),
    onError: (error: Error) => toast.error(error.message),
  });

  const topics = topicsFor("Microeconomics").concat(topicsFor("Macroeconomics"));

  // --- Question source: type / AI-generated / question bank (same pattern
  // as the essay generator's question picker) --------------------------
  const generateQuestion = useServerFn(generateEssayQuestionAI);
  const aiQuestionMutation = useMutation({
    mutationFn: () => generateQuestion({ data: { level, topic } }),
    onSuccess: (result) => {
      setQuestion(result.question);
      setTopic(result.topic);
      setMaxMark(result.maxMark);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchBankTopics = useServerFn(listBankTopics);
  const bankTopics = useQuery({
    queryKey: ["live-examiner-bank-topics", level],
    queryFn: () => fetchBankTopics({ data: { kind: "essay", level } }),
    enabled: questionSource === "bank",
  });

  const [bankTopicFilter, setBankTopicFilter] = useState<string>("__any__");
  const fetchBankQuestions = useServerFn(listApprovedEssayQuestions);
  const bankQuestions = useQuery({
    queryKey: ["live-examiner-bank-questions", level, bankTopicFilter],
    queryFn: () =>
      fetchBankQuestions({
        data: { level, topic: bankTopicFilter === "__any__" ? undefined : bankTopicFilter },
      }),
    enabled: questionSource === "bank",
  });

  // --- Syllabus grounding — fetched ONCE per question, reused by every
  // subsequent live check call so nothing re-embeds on every keystroke ---
  const prepareContext = useServerFn(prepareLiveExaminerContext);
  const contextMutation = useMutation({
    mutationFn: (override?: { level: "as" | "a2"; topic: string; question: string }) =>
      prepareContext({ data: override ?? { level, topic, question } }),
    onError: (error: Error) => {
      // Only surface daily limit errors; never block the editor on background context sync issues
      if (isDailyLimitError(error)) {
        toast.error(error.message);
        setStarted(false);
        setLimitNotice(error.message);
      }
    },
  });

  // --- Resume an existing draft for this question, if one exists --------
  const fetchSession = useServerFn(getLiveExaminerSession);
  const sessionQuery = useQuery({
    queryKey: ["live-examiner-session", question],
    queryFn: () => fetchSession({ data: { question } }),
    enabled: started && question.length > 0,
  });

  useEffect(() => {
    const session = sessionQuery.data?.session;
    if (session && session.essay_text) setEssayText(session.essay_text);
    if (session && session.diagram_tag) {
      setDiagrams(parseDiagramTags(session.diagram_tag));
    }
  }, [sessionQuery.data]);

  function handleStart() {
    if (question.trim().length < 5) {
      toast.error("Enter or pick a question first.");
      return;
    }
    setLimitNotice(null);
    setStarted(true);
    contextMutation.mutate({ level, topic, question });
  }

  /** Resume a past essay from the history panel — same as picking that
   *  question and starting, and the existing session-resume effect below
   *  fills in the saved draft text/diagram once the question matches. */
  function resumeSession(entry: LiveExaminerSessionSummary) {
    setLevel(entry.level);
    setTopic(entry.topic);
    setQuestion(entry.question);
    setMaxMark(entry.maxMark);
    setLimitNotice(null);
    setStarted(true);
    contextMutation.mutate({
      level: entry.level,
      topic: entry.topic,
      question: entry.question,
    });
  }

  const contextBlock = contextMutation.data?.contextBlock ?? "";
  const sourceCount = contextMutation.data?.sourceCount ?? 0;
  const anchorsUsed = contextMutation.data?.anchorsUsed ?? 0;

  // The attached diagram tags ride along with the essay text for every
  // live check, exactly like they do for full grading — so a referenced
  // diagram gets credited/checked instead of the checker only ever seeing
  // the written prose.
  const combinedDiagramTag = combineDiagramTags(diagrams);
  const textForCheck = combinedDiagramTag ? `${essayText}\n\n${combinedDiagramTag}` : essayText;

  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [showAo, setShowAo] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [activeAoFilter, setActiveAoFilter] = useState<any>(null);
  const editorRef = useRef<LiveExaminerEditorHandle>(null);

  const {
    issues,
    classifications,
    sentences,
    history,
    checking,
    pending,
    error: checkError,
    predictedMark,
    scoreEstimate,
    lastUpdatedAt,
    acceptIssue,
    acceptAllIssues,
    acceptAllMechanical,
    dismissIssue,
    rescan,
    clearAll,
    cache,
    rubric,
    ledger,
    opportunities,
    strengths,
    areasForImprovement,
    assessmentStatus,
    markRange,
  } = useLiveExaminerCheck({
    text: textForCheck,
    question,
    level,
    maxMark,
    contextBlock,
    enabled: started,
    initialCache: sessionQuery.data?.session
      ? { sentences: (sessionQuery.data.session as any).sentence_cache }
      : undefined,
  });

  // --- Autosave, debounced, independent of the AI check debounce --------
  const saveSession = useServerFn(saveLiveExaminerSession);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTextRef = useRef("");
  const retryCountRef = useRef(0);
  const essayTextRef = useRef(essayText);
  const savingRef = useRef(false);
  essayTextRef.current = essayText;

  const doSave = useCallback(
    (textToSave: string) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setAutosave("saving");
      const boundedHistory = [...history]
        .sort((a, b) => (b.resolvedAt ?? b.firstSeenAt) - (a.resolvedAt ?? a.firstSeenAt))
        .slice(0, 400);
      saveSession({
        data: {
          level,
          topic,
          question,
          maxMark,
          essayText: textToSave,
          issuesHistory: boundedHistory,
          sentenceCache: (cache as any)?.toJSON()?.sentences || {},
          scoreHistory: scoreEstimate ? [scoreEstimate] : [],
          docVersion: 1,
          schemaVersion: 2,
          diagramTag: combinedDiagramTag,
        },
      })
        .then(() => {
          savingRef.current = false;
          lastSavedTextRef.current = textToSave;
          retryCountRef.current = 0;
          setAutosave("saved");
        })
        .catch(() => {
          savingRef.current = false;
          setAutosave("error");
          // Keep retrying on its own — capped backoff, 5s/10s/20s/30s/30s…
          // — rather than leaving unsaved work stuck until the next edit.
          const delay = Math.min(30_000, 5_000 * 2 ** retryCountRef.current);
          retryCountRef.current += 1;
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            if (essayTextRef.current !== lastSavedTextRef.current) doSave(essayTextRef.current);
          }, delay);
        });
    },
    [saveSession, level, topic, question, maxMark, history, combinedDiagramTag],
  );

  useEffect(() => {
    if (!started || essayText.trim().length < 5 || essayText === lastSavedTextRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current); // fresh edit supersedes a pending retry
    autosaveTimer.current = setTimeout(() => doSave(essayText), AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [essayText, started, doSave]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Warn before leaving the tab with anything unsaved — a pending debounce,
  // an in-flight save, or a save that's currently in its retry backoff.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      const unsaved = started && essayTextRef.current !== lastSavedTextRef.current;
      if (!unsaved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [started]);

  const wordCount = essayText.trim().length === 0 ? 0 : essayText.trim().split(/\s+/).length;

  function handleRestart() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setEssayText("");
    clearDiagrams();
    setMarkSchemeImages([]);
    clearAll();
    setAutosave("idle");
    lastSavedTextRef.current = "";
    retryCountRef.current = 0;
    // Wipe the saved draft server-side too, so a refresh doesn't resurrect
    // the old attempt via session resume.
    saveSession({
      data: {
        level,
        topic,
        question,
        maxMark,
        essayText: "",
        issuesHistory: [],
        diagramTag: undefined,
      },
    }).catch(() => {
      /* best-effort — the next real edit will autosave and retry as usual */
    });
    setRestartDialogOpen(false);
    toast.success("Cleared — write the full answer again from scratch.");
  }

  if (!isAdmin && meQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Live Examiner"
          description="Write your answer and get instant, syllabus-grounded feedback as you go — grammar, clarity, economics accuracy, analysis, application, evaluation and terminology."
        />
        <ChainedChamber
          badgeText="In Active Development — Beta Preview"
          title="Live Examiner is in Active Development"
          description="Our real-time keystroke coaching engine is actively in development and undergoing calibration against official Cambridge 0455 examiner standards. All core platform features (Unlimited Cambridge Essay Grading, AI Reworks, and Past Paper MCQs) remain 100% Free and unlocked."
          primaryCtaText="Open Free Essay Grader"
          primaryCtaLink="/grade"
          secondaryCtaText="Practice MCQ Past Papers"
          secondaryCtaLink="/mcq-live"
          features={[
            {
              icon: Sparkles,
              iconColor: "text-emerald-500",
              title: "100% Free Cambridge Essay Grader",
              description:
                "Full AO1 Knowledge, AO2 Analysis, and AO3 Evaluation marking with official Cambridge syllabus grounding and detailed diagnostic reports.",
            },
            {
              icon: BookOpen,
              iconColor: "text-primary",
              title: "Past Paper Matrix & MCQ Drills",
              description:
                "Complete Cambridge 0455 past-paper library with high-resolution PDFs, domain performance analytics, and official explanations.",
            },
            {
              icon: Users,
              iconColor: "text-purple-500",
              title: "Free Classroom & Cohorts",
              description:
                "Create unlimited Cambridge cohorts, assign past paper questions, review AI grades, and collaborate in real-time.",
            },
          ]}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Live Examiner"
        description="Write your answer and get instant, syllabus-grounded feedback as you go — grammar, clarity, economics accuracy, analysis, application, evaluation and terminology."
      />

      <div className="mx-auto max-w-5xl px-5 pt-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 shadow-2xs">
          <Construction className="size-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
          <div className="leading-relaxed">
            <span className="font-bold tracking-tight">Feature Under Construction / Preview Beta:</span>{" "}
            We are actively fine-tuning real-time Cambridge 0455 causal chain diagnostics and live scoring models. Feel free to test the interactive evaluator below!
          </div>
        </div>
      </div>

      {!started ? (
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          {limitNotice ? (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {limitNotice}
            </div>
          ) : null}
          <div className="grid gap-8 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Level</Label>
                <Tabs value={level} onValueChange={(value) => setLevel(value as "as" | "a2")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="as" className="flex-1">
                      AS Level
                    </TabsTrigger>
                    <TabsTrigger value="a2" className="flex-1">
                      A Level
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="le-topic">Topic</Label>
                <Input
                  id="le-topic"
                  list="live-examiner-topics"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. Market failure and externalities"
                />
                <datalist id="live-examiner-topics">
                  {topics.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Question source</Label>
                <Tabs
                  value={questionSource}
                  onValueChange={(value) => setQuestionSource(value as "type" | "ai" | "bank")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="type" className="flex-1">
                      Type my own
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1">
                      AI-generated
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="flex-1">
                      Question bank
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {questionSource === "ai" ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={aiQuestionMutation.isPending}
                    onClick={() => aiQuestionMutation.mutate()}
                  >
                    {aiQuestionMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Writing a unique question…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> Generate a unique question on this topic
                      </>
                    )}
                  </Button>
                  <CompactProgressBar
                    active={aiQuestionMutation.isPending}
                    stages={[
                      { label: "Checking Cambridge 0455 syllabus scope", weight: 2 },
                      { label: "Drafting authentic command-word question", weight: 4 },
                    ] satisfies ProgressStage[]}
                    totalMs={10_000}
                    title="Generating Cambridge-style question…"
                  />
                </div>
              ) : null}

              {questionSource === "bank" ? (
                <div className="space-y-2">
                  <Select value={bankTopicFilter} onValueChange={setBankTopicFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any topic</SelectItem>
                      {(bankTopics.data ?? []).map((entry) => (
                        <SelectItem key={entry.topic} value={entry.topic}>
                          {entry.topic} ({entry.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={question}
                    onValueChange={(value) => {
                      const picked = (bankQuestions.data ?? []).find(
                        (q) => q.question_text === value,
                      );
                      setQuestion(value);
                      if (picked) {
                        setTopic(picked.topic);
                        setMaxMark(picked.max_mark);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a real past-paper question" />
                    </SelectTrigger>
                    <SelectContent>
                      {(bankQuestions.data ?? []).map((entry) => (
                        <SelectItem key={entry.id} value={entry.question_text}>
                          {entry.question_text.slice(0, 70)}
                          {entry.question_text.length > 70 ? "…" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="le-question">Question</Label>
                  <Textarea
                    id="le-question"
                    rows={3}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Paste or type the exact exam question…"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Marks available</Label>
                <div className="flex gap-2">
                  {MARKS.map((mark) => (
                    <Button
                      key={mark}
                      type="button"
                      size="sm"
                      variant={maxMark === mark ? "default" : "outline"}
                      onClick={() => setMaxMark(mark)}
                    >
                      {mark} marks
                    </Button>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStart}>
                <PenLine className="size-4" /> Start writing
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Suggestions are grounded only in your syllabus, coursebook, mark scheme and examiner
                report material — nothing is invented.
              </p>
            </div>

            <LiveExaminerHistoryPanel onResume={resumeSession} />
          </div>
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[1fr_290px] xl:grid-cols-[1fr_340px]">
          <section className="min-w-0 space-y-3 border-border p-5 lg:border-r md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{level === "a2" ? "A Level" : "AS Level"}</Badge>
              <Badge variant="outline">{topic}</Badge>
              <Badge variant="outline">{maxMark} marks</Badge>
              <Badge variant="outline">{wordCount} words</Badge>
              {contextMutation.isPending ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Syncing syllabus…
                </Badge>
              ) : sourceCount > 0 ? (
                <Badge variant="outline">
                  <GraduationCap className="mr-1 size-3" /> {sourceCount} syllabus source
                  {sourceCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {anchorsUsed > 0 ? (
                <Badge variant="outline">
                  <CheckCircle2 className="mr-1 size-3" /> {anchorsUsed} calibration anchor
                  {anchorsUsed === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {diagrams.map((d) => (
                <Badge key={d.id} variant="outline" className="gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" /> {d.label}
                  <button
                    type="button"
                    onClick={() => removeDiagram(d.id)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${d.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setDiagramDialogOpen(true)}
              >
                <ImagePlus className="size-3.5" />
                {diagrams.length > 0 ? "Add another diagram" : "Attach diagram"}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs">
                    <ClipboardPaste className="size-3.5" />
                    {markSchemeImages.length > 0
                      ? `Mark scheme (${markSchemeImages.length})`
                      : "Attach mark scheme"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-2" align="start">
                  <p className="text-xs text-muted-foreground">
                    Paste a screenshot of the relevant mark scheme page — the examiner reads it
                    directly, on top of your knowledge base, when you grade this answer.
                  </p>
                  <MarkSchemeScreenshots
                    images={markSchemeImages}
                    onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
                    onRemove={(id) =>
                      setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
                    }
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleGradeNow()}
              >
                <Sparkles className="size-3.5" /> Grade now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-medium"
                onClick={handleOpenScoreMaximizer}
              >
                <Sparkles className="size-3.5 text-amber-500" /> Score Maximizer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setRestartDialogOpen(true)}
              >
                <RotateCcw className="size-3.5" /> Restart exam
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs"
                onClick={() => setStarted(false)}
              >
                Change question
              </Button>
            </div>
            <p className="text-sm font-medium">{question}</p>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-lg backdrop-blur-md transition-all">
              <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Live Examiner Studio
                </span>
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {level === "a2" ? "A Level" : "AS Level"} · {maxMark} marks
                </span>
              </div>
              <AoLegend
                sentences={sentences}
                issuesCount={issues.length}
                showAo={showAo}
                showIssues={showIssues}
                onToggleAo={() => setShowAo((prev) => !prev)}
                onToggleIssues={() => setShowIssues((prev) => !prev)}
                activeFilter={activeAoFilter}
                onSelectAo={(tag) => {
                  setActiveAoFilter((current: any) => (current === tag ? null : tag));
                  const target = sentences.find((s) => s.ao?.tag === tag);
                  if (target) {
                    editorRef.current?.focusSpan(target.id);
                  }
                }}
              />
              <LiveExaminerEditor
                ref={editorRef}
                value={essayText}
                onChange={setEssayText}
                issues={issues}
                sentences={sentences}
                classifications={classifications}
                showAo={showAo}
                showIssues={showIssues}
                onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
                onDismiss={dismissIssue}
                focusedIssueId={focusedIssueId}
                predictedMark={predictedMark}
                maxMark={maxMark}
                checking={checking}
                placeholder="Start writing your answer here — whole sentences highlight automatically as AO1 Knowledge, AO2 Analysis, or AO3 Evaluation…"
                className="min-h-[60vh] border-0 bg-transparent shadow-none"
              />
            </div>

            {/* Post-Writing Score Maximizer & Perfection Blueprint Banner */}
            {wordCount >= 40 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Ready to elevate your draft to {maxMark}/{maxMark}?
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Open the Score Maximizer Blueprint for exact paragraph placement, strategic argument angles, and one-click Top-Band phrasing.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleGradeNow()}
                  >
                    Official Grade
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1.5"
                    onClick={handleOpenScoreMaximizer}
                  >
                    <Sparkles className="size-3.5" /> Open Score Maximizer
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="min-w-0 p-4 md:p-5 space-y-4">
            <ScoreWidget
              scoreEstimate={scoreEstimate}
              wordCount={wordCount}
              maxMark={maxMark}
              checking={checking}
              status={assessmentStatus}
              markRange={markRange}
            />


            <LiveExaminerPanel
              issues={issues}
              history={history}
              checking={checking}
              pending={pending}
              error={checkError}
              autosave={autosave}
              predictedMark={predictedMark}
              finalGrading={gradeMutation.data?.grading as Grading | null}
              lastUpdatedAt={lastUpdatedAt}
              maxMark={maxMark}
              onAccept={(id) => setEssayText((current) => acceptIssue(id, current))}
              onAcceptAll={() => setEssayText((current) => acceptAllIssues(current))}
              onDismiss={dismissIssue}
              onRescan={() => rescan(essayText)}
              onClearAll={clearAll}
              onFocusIssue={(id) => {
                setFocusedIssueId(null);
                setTimeout(() => setFocusedIssueId(id), 10);
              }}
              onOpenMaximizer={handleOpenScoreMaximizer}
              maximizerLoading={maxOutMutation.isPending}
            />

            <NextMarks
              nextMoves={scoreEstimate?.nextMoves || []}
              opportunities={opportunities}
              strengths={strengths}
              areasForImprovement={areasForImprovement}
              onSelectMove={(move) => {
                toast.info(`Next mark tip: ${move.title}`, {
                  description: move.detail,
                });
              }}
              onOpenMaximizer={handleOpenScoreMaximizer}
              maximizerLoading={maxOutMutation.isPending}
            />
          </aside>
        </div>
      )}

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your written answer, attached diagrams, and all suggestions for this
              question — including the saved draft — so you can write the full response again from a
              blank sheet. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>Restart exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={diagramDialogOpen} onOpenChange={setDiagramDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach a diagram</DialogTitle>
            <DialogDescription>
              Photograph a hand-drawn diagram, or pick one from the library — either way it's
              considered alongside your writing, exactly like a diagram drawn on a scanned script.
              Attach as many as your answer refers to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {diagrams.length > 0 ? (
              <ul className="space-y-1.5">
                {diagrams.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      {d.label}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => removeDiagram(d.id)}
                      aria-label={`Remove ${d.label}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-1.5">
              <Label>Photo of your diagram</Label>
              <input
                ref={diagramFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleDiagramFile(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={describeDiagramMutation.isPending}
                onClick={() => diagramFileRef.current?.click()}
              >
                {describeDiagramMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Reading your diagram…
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4" /> Upload a photo
                  </>
                )}
              </Button>
              <CompactProgressBar
                active={describeDiagramMutation.isPending}
                stages={[
                  { label: "Inspecting diagram photo", weight: 2 },
                  { label: "Reading axes, curves, shifts & equilibria", weight: 4 },
                ] satisfies ProgressStage[]}
                totalMs={10_000}
                title="Reading your diagram…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Or pick from the diagram library</Label>
              <Select onValueChange={applyLibraryDiagram}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a diagram…" />
                </SelectTrigger>
                <SelectContent>
                  {(diagramLibraryQuery.data ?? []).map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title} ({entry.topic})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full" onClick={() => setDiagramDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiagramCheckDialog
        open={diagramPromptOpen}
        onOpenChange={setDiagramPromptOpen}
        question={question}
        essayText={essayText}
        onAddDiagram={() => setDiagramDialogOpen(true)}
        onProceedAnyway={() => handleGradeNow({ skipDiagramCheck: true })}
      />

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade now</DialogTitle>
            <DialogDescription>
              A full examiner-standard mark for what you've written so far — your feedback and draft
              keep working after you close this.
            </DialogDescription>
          </DialogHeader>

          {gradeMutation.isPending ? (
            <GradingProgress
              active
              stages={[
                { label: "Referring Cambridge 0455 Knowledge Base & Mark Schemes", weight: 3 },
                { label: "Dual-Examiner Parallel Evaluation (Pass 1 & Pass 2)", weight: 5 },
                { label: "Checking Assessment Objectives: AO1 Knowledge · AO2 Analysis · AO3 Evaluation", weight: 4 },
                { label: "Synthesizing diagnostic examiner report & actionable feedback", weight: 3 },
              ]}
              totalMs={48_000}
            />
          ) : gradeMutation.data ? (
            <div className="space-y-4">
              <MarkBreakdown grading={gradeMutation.data.grading as Grading} />
              {gradeMutation.data.grading.total_mark < gradeMutation.data.grading.max_mark ? (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-700 dark:bg-amber-950/40">
                  <div className="flex items-start gap-2">
                    <Sparkles className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                        Score Maximizer &amp; Perfection Blueprint
                      </p>
                      <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                        Official score: {gradeMutation.data.grading.total_mark}/{gradeMutation.data.grading.max_mark}. View step-by-step improvements to reach a perfect score.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 font-semibold"
                    onClick={() => {
                      setGradeDialogOpen(false);
                      handleOpenScoreMaximizer();
                    }}
                  >
                    <Sparkles className="size-4 mr-1.5" /> Open Score Maximizer
                  </Button>
                </div>
              ) : null}
            </div>
          ) : gradeMutation.isError ? (
            <p className="text-sm text-destructive">
              {gradeMutation.error instanceof Error
                ? gradeMutation.error.message
                : "Couldn't grade that just now — try again."}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Score Maximizer Dialog */}
      <ScoreMaximizerDialog
        open={scoreMaximizerOpen}
        onOpenChange={setScoreMaximizerOpen}
        question={question}
        level={level}
        maxMark={maxMark}
        data={maxOutMutation.data}
        loading={maxOutMutation.isPending}
        error={maxOutMutation.isError}
        onRetry={handleOpenScoreMaximizer}
        onInsertText={handleInsertSentence}
        onShowModelAnswer={() => {
          setScoreMaximizerOpen(false);
          fullAnswerMutation.mutate();
        }}
      />

      <Dialog open={modelAnswerOpen} onOpenChange={setModelAnswerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete model answer</DialogTitle>
            <DialogDescription>
              Compare this only after attempting the score maximization hints. Focus on what the
              answer adds, links, and evaluates—not on memorising its wording.
            </DialogDescription>
          </DialogHeader>
          {fullAnswerMutation.data ? <ModelAnswer essay={fullAnswerMutation.data.essay} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5"
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** AO badge colour, reusing the same palette meaning elsewhere in the app:
 *  knowledge/ao1, analysis/ao2, evaluation/ao3, plus a neutral one for
 *  general structural suggestions that don't map to a single AO. */
function aoLabel(target: MaxOutSuggestion["target_ao"]): string {
  switch (target) {
    case "ao1":
      return "Knowledge (AO1)";
    case "ao2":
      return "Analysis (AO2)";
    case "ao3":
      return "Evaluation (AO3)";
    default:
      return "Essay Structure";
  }
}

function aoBadgeStyle(target: MaxOutSuggestion["target_ao"]): string {
  switch (target) {
    case "ao1":
      return "border-ao1/40 bg-ao1/10 text-ao1 font-semibold";
    case "ao2":
      return "border-ao2/40 bg-ao2/10 text-ao2 font-semibold";
    case "ao3":
      return "border-ao3/40 bg-ao3/10 text-ao3 font-semibold";
    default:
      return "border-primary/40 bg-primary/10 text-primary font-semibold";
  }
}

function defaultPlacement(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Paragraph 1 (Introduction & Core Definitions)";
    case "ao2":
      return "Paragraph 2 or 3 (Analytical Transmission Mechanism)";
    case "ao3":
      return "Final Section (Evaluative Balance & Synthesis)";
    default:
      return "Essay Body";
  }
}

function defaultPlacementRationale(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Establishes precise conceptual grounding before the analytical steps unfold.";
    case "ao2":
      return "Deepens the step-by-step causal chain showing how one economic effect triggers the next.";
    case "ao3":
      return "Weighs counterarguments, time lags, and assumptions to reach a nuanced, justified conclusion.";
    default:
      return "Integrates the analytical requirement directly into the core essay structure.";
  }
}

function shortPlacement(ao: "ao1" | "ao2" | "ao3" | "structure") {
  switch (ao) {
    case "ao1":
      return "Intro (¶1)";
    case "ao2":
      return "Body (¶2)";
    case "ao3":
      return "Evaluation";
    default:
      return "Draft";
  }
}

function ScoreMaximizerDialog({
  open,
  onOpenChange,
  question,
  level,
  maxMark,
  data,
  loading,
  error,
  onRetry,
  onInsertText,
  onShowModelAnswer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  level: "as" | "a2";
  maxMark: number;
  data: MaxOutResponse | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onInsertText: (
    text: string,
    targetAo?: "ao1" | "ao2" | "ao3" | "structure",
    placementLabel?: string,
    forceEnd?: boolean,
  ) => void;
  onShowModelAnswer: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 font-semibold">
              <Sparkles className="mr-1 size-3.5" /> Score Maximizer & Perfection Blueprint
            </Badge>
            <Badge variant="outline">
              {level === "a2" ? "A Level" : "AS Level"} · {maxMark} Marks
            </Badge>
            <Badge
              variant="secondary"
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              Target: Full {maxMark}/{maxMark} (Band 1)
            </Badge>
          </div>
          <DialogTitle className="mt-2 text-xl font-bold">
            How to reach a perfect {maxMark}/{maxMark} score
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            Exam Question: {question}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <p className="font-semibold text-foreground">
              Analyzing your essay against Cambridge Level 5 criteria…
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Identifying missing causal chains, evaluative trade-offs, strategic argument options,
              exact essay placement, and exemplar phrasing.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-destructive">Could not generate suggestions right now.</p>
            <Button onClick={onRetry}>Try Again</Button>
          </div>
        ) : data ? (
          <div className="space-y-6 pt-2">
            {/* Headline & Overview Banner */}
            <div className="rounded-xl border border-amber-300/60 bg-linear-to-br from-amber-500/10 via-background to-card p-4 shadow-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Examiner Blueprint Summary</h3>
                    <p className="text-xs font-semibold leading-relaxed text-amber-900 dark:text-amber-200">
                      {data.headline}
                    </p>
                    {data.perfection_summary ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {data.perfection_summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                {data.target_band ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    {data.target_band}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Individual Upgrade Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Step-by-step Improvements ({data.suggestions.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Apply these upgrades to reach full marks
                </span>
              </div>

              {data.suggestions.map((suggestion, index) => {
                const placementText =
                  suggestion.placement || defaultPlacement(suggestion.target_ao);
                const placementReason =
                  suggestion.placement_rationale ||
                  defaultPlacementRationale(suggestion.target_ao);
                const exemplarText = suggestion.model_phrasing || suggestion.suggestion;

                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-border/90 space-y-3.5"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-foreground text-sm">
                          {suggestion.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", aoBadgeStyle(suggestion.target_ao))}
                        >
                          {aoLabel(suggestion.target_ao)}
                        </Badge>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px] font-semibold">
                          {suggestion.mark_uplift}
                        </Badge>
                      </div>
                    </div>

                    {/* Diagnostic suggestion */}
                    <p className="text-xs leading-relaxed text-foreground/90">
                      {suggestion.suggestion}
                    </p>

                    {/* Placement Guidance */}
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground text-[11px]">
                          Where to place this: <span className="text-primary">{placementText}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">{placementReason}</p>
                      </div>
                    </div>

                    {/* How to Write Step-by-Step Checklist */}
                    {suggestion.how_to_write && suggestion.how_to_write.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          How to Construct This Point
                        </p>
                        <ul className="space-y-1">
                          {suggestion.how_to_write.map((step, sIdx) => (
                            <li
                              key={sIdx}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Strategic Argument Options */}
                    {suggestion.strategic_options && suggestion.strategic_options.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Strategic Economic Angles (Click starter to insert)
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {suggestion.strategic_options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-1.5 flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                {opt.label ? (
                                  <p className="text-xs font-semibold text-foreground">
                                    {opt.label}
                                  </p>
                                ) : null}
                                {opt.description ? (
                                  <p className="text-[11px] text-muted-foreground leading-snug">
                                    {opt.description}
                                  </p>
                                ) : null}
                              </div>
                              {opt.sentence_starter ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onInsertText(
                                      opt.sentence_starter!,
                                      suggestion.target_ao,
                                      placementText,
                                      false,
                                    );
                                    onOpenChange(false);
                                  }}
                                  className="text-left rounded border border-primary/30 bg-primary/5 hover:bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary transition-colors"
                                >
                                  + "{opt.sentence_starter}"
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Top-Band Exemplar Phrasing Box */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Sparkles className="size-3" /> Top-Band Cambridge 0455 Phrasing
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Ready to insert into {shortPlacement(suggestion.target_ao)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground italic">
                        "{exemplarText}"
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <CopyButton text={exemplarText} label="Copy Phrasing" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            onInsertText(
                              exemplarText,
                              suggestion.target_ao,
                              "End of Draft",
                              true,
                            );
                            onOpenChange(false);
                          }}
                        >
                          Append to End
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs gap-1 font-semibold"
                          onClick={() => {
                            onInsertText(
                              exemplarText,
                              suggestion.target_ao,
                              placementText,
                              false,
                            );
                            onOpenChange(false);
                          }}
                        >
                          Insert into {shortPlacement(suggestion.target_ao)}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Back to editor
              </Button>
              <Button onClick={onShowModelAnswer} className="gap-1.5">
                <Sparkles className="size-4" /> Compare with complete model answer
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ModelAnswer({ essay }: { essay: GeneratedEssay }) {
  return (
    <article className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Estimated {essay.estimatedMark}/{essay.maxMark}
        </Badge>
        <Badge variant="outline">{essay.wordCount} words</Badge>
      </div>
      {essay.sections.map((section, index) => (
        <section key={`${section.heading}-${index}`} className="space-y-2">
          <h3 className="font-semibold">{section.heading}</h3>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} className="text-sm leading-7 text-foreground/90">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Why this reaches the standard</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {essay.examinerComments.map((comment, index) => (
            <li key={index}>{comment}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
