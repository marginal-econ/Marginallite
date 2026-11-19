import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Flame,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { classifyMcqQuestion, type DomainStat } from "@/lib/mcq-domain";
import {
  MCQ_MISTAKE_META_MAP,
  MCQ_MISTAKE_TYPES,
  type McqMistakeType,
} from "@/lib/mcq-mistakes";
import type { StemBlob } from "@/lib/mcq-pdf-text";
import { cn, stripStars } from "@/lib/utils";
import {
  McqDomainBreakdown,
  McqMistakeLedger,
  McqReviewPanel,
  MistakeTypeIcon,
  type ExplanationState,
  type GradedQuestion,
  type TopicStat,
} from "./mcq-review-panel";

type Letter = "A" | "B" | "C" | "D";
type AnnotateTool = "pen" | "eraser";

export type TutorPageImage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
};

type McqTutorModeProps = {
  paperTitle: string;
  level: "as" | "a2";
  questionNumbers: number[];
  pages: TutorPageImage[];
  questionPages: Record<number, number>;
  questionSlices: Record<number, HTMLCanvasElement>;
  stemBlobs: StemBlob[];
  answerKey: Record<number, Letter>;
  answers: Record<number, Letter>;
  checkedQuestions: Set<number>;
  mistakeTypes: Record<number, McqMistakeType>;
  eliminatedOptions: Record<number, Letter[]>;
  questionTimes: Record<number, number>;
  flagged: Set<number>;
  activeQuestion: number;
  explanations: Record<number, ExplanationState>;
  graded: boolean;
  busyLabel: string | null;
  result: { score: number; total: number } | null;
  attemptTopics: TopicStat[];
  attemptDomains: DomainStat[];
  reviewQuestions: GradedQuestion[];
  annotateMode: boolean;
  annotateTool: AnnotateTool;
  annotateColor: string;
  annotationClearSeq: number;
  calcOpen: boolean;
  onSelectActiveQuestion: (num: number) => void;
  onPickAnswer: (num: number, letter: Letter) => void;
  onCheckAnswer: (num: number, elapsedSeconds: number) => void;
  onSetMistakeType: (num: number, type: McqMistakeType) => void;
  onToggleEliminate: (num: number, letter: Letter) => void;
  onToggleFlag: (num: number) => void;
  onExplainQuestion: (num: number, overrideMistakeType?: McqMistakeType | null) => void;
  onFinishSession: () => void;
};

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

/**
 * Isolated freehand drawing overlay for the active question PDF slice.
 * Allows students to underline key terms, mark axes, or scribble directly
 * on top of real Cambridge diagrams & tables.
 */
function TutorAnnotationCanvas({
  width,
  height,
  enabled,
  tool,
  color,
  clearSeq,
  questionKey,
}: {
  width: number;
  height: number;
  enabled: boolean;
  tool: AnnotateTool;
  color: string;
  clearSeq: number;
  questionKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearSeq, questionKey]);

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

export function McqTutorMode({
  level,
  questionNumbers,
  pages,
  questionPages,
  questionSlices,
  stemBlobs,
  answerKey,
  answers,
  checkedQuestions,
  mistakeTypes,
  eliminatedOptions,
  questionTimes,
  flagged,
  activeQuestion,
  explanations,
  graded,
  busyLabel,
  result,
  attemptTopics,
  attemptDomains,
  reviewQuestions,
  annotateMode,
  annotateTool,
  annotateColor,
  annotationClearSeq,
  calcOpen,
  onSelectActiveQuestion,
  onPickAnswer,
  onCheckAnswer,
  onSetMistakeType,
  onToggleEliminate,
  onToggleFlag,
  onExplainQuestion,
  onFinishSession,
}: McqTutorModeProps) {
  // Toggle between cropped single-question PDF slice vs full PDF page
  const [showFullPage, setShowFullPage] = useState(false);
  // Allow revealing explanation without tagging mistake if the student explicitly skips
  const [skippedTagging, setSkippedTagging] = useState<Set<number>>(new Set());
  // Show end-of-session diagnostic report view
  const [showSessionReport, setShowSessionReport] = useState(false);

  // Focused Re-Drill Loop for missed questions (local revision loop, doesn't overwrite saved first score)
  const [redrillQueue, setRedrillQueue] = useState<number[] | null>(null);
  const [redrillIndex, setRedrillIndex] = useState(0);
  const [redrillAnswers, setRedrillAnswers] = useState<Record<number, Letter>>({});
  const [redrillChecked, setRedrillChecked] = useState<Set<number>>(new Set());

  const isRedrill = redrillQueue !== null && redrillQueue.length > 0;
  const currentNumber = isRedrill
    ? (redrillQueue[redrillIndex] ?? redrillQueue[0])
    : activeQuestion;

  // Per-question live stopwatch
  const [liveSeconds, setLiveSeconds] = useState<number>(0);

  const isCurrentChecked = isRedrill
    ? redrillChecked.has(currentNumber)
    : graded || checkedQuestions.has(currentNumber);

  // Reset stopwatch whenever active question changes
  useEffect(() => {
    setShowFullPage(false);
    if (isRedrill) {
      setLiveSeconds(0);
    } else {
      setLiveSeconds(questionTimes[currentNumber] ?? 0);
    }
  }, [currentNumber, isRedrill, questionTimes]);

  // Tick stopwatch while active question is unchecked and report is closed
  useEffect(() => {
    if (isCurrentChecked || showSessionReport) return;
    const id = window.setInterval(() => {
      setLiveSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isCurrentChecked, showSessionReport]);

  // Automatically open session report when `graded` flips to true after clicking Finish
  const prevGradedRef = useRef(graded);
  useEffect(() => {
    if (!prevGradedRef.current && graded) {
      setShowSessionReport(true);
    }
    prevGradedRef.current = graded;
  }, [graded]);

  // Compute live session metrics
  const sessionStats = useMemo(() => {
    let checkedCount = 0;
    let correctCount = 0;
    let wrongNumbers: number[] = [];
    let currentStreak = 0;

    for (const num of questionNumbers) {
      const isChecked = graded || checkedQuestions.has(num);
      if (!isChecked) continue;
      checkedCount += 1;
      const ans = answers[num];
      const key = answerKey[num];
      if (key && ans === key) {
        correctCount += 1;
        currentStreak += 1;
      } else {
        wrongNumbers.push(num);
        currentStreak = 0;
      }
    }

    const accuracyPct =
      checkedCount > 0 ? Math.round((correctCount / checkedCount) * 100) : null;
    const totalTrackedSeconds = Object.values(questionTimes).reduce((a, b) => a + b, 0);
    const avgSeconds =
      checkedCount > 0 ? Math.round(totalTrackedSeconds / checkedCount) : null;

    return {
      checkedCount,
      correctCount,
      wrongCount: wrongNumbers.length,
      wrongNumbers,
      accuracyPct,
      currentStreak,
      avgSeconds,
    };
  }, [questionNumbers, graded, checkedQuestions, answers, answerKey, questionTimes]);

  // Current question data
  const activeAnswer = isRedrill ? redrillAnswers[currentNumber] : answers[currentNumber];
  const correctAnswer = answerKey[currentNumber] ?? null;
  const isCorrect =
    isCurrentChecked && correctAnswer !== null && activeAnswer === correctAnswer;
  const isIncorrect =
    isCurrentChecked && correctAnswer !== null && activeAnswer !== correctAnswer;
  const selectedMistake = mistakeTypes[currentNumber] ?? null;
  const isTagSkipped = skippedTagging.has(currentNumber);
  const activeEliminated = eliminatedOptions[currentNumber] ?? [];
  const explanation = explanations[currentNumber];

  // Syllabus classification for current question (instant, zero network)
  const questionMeta = useMemo(() => {
    const stem = stemBlobs.find((s) => s.number === currentNumber)?.text ?? "";
    return classifyMcqQuestion({
      level: level === "a2" ? "A2" : "AS",
      number: currentNumber,
      text: stem,
    });
  }, [stemBlobs, currentNumber, level]);

  // Resolve real PDF canvas (isolated single-question PDF crop OR full PDF page fallback)
  const sliceCanvas = questionSlices[currentNumber] ?? null;
  const targetPageNum = questionPages[currentNumber] ?? 1;
  const fullPageCanvas = useMemo(() => {
    return (
      pages.find((p) => p.pageNumber === targetPageNum)?.canvas ??
      pages[0]?.canvas ??
      null
    );
  }, [pages, targetPageNum]);

  const displayedCanvas = !showFullPage && sliceCanvas ? sliceCanvas : fullPageCanvas;
  const isShowingCrop = !showFullPage && Boolean(sliceCanvas);

  const displayedDataUrl = useMemo(() => {
    if (!displayedCanvas) return null;
    try {
      return displayedCanvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [displayedCanvas]);

  const currentIdx = questionNumbers.indexOf(currentNumber);
  const hasPrev = isRedrill ? redrillIndex > 0 : currentIdx > 0;
  const hasNext = isRedrill
    ? redrillIndex < (redrillQueue?.length ?? 0) - 1
    : currentIdx >= 0 && currentIdx < questionNumbers.length - 1;

  const goPrev = useCallback(() => {
    if (isRedrill) {
      if (redrillIndex > 0) setRedrillIndex((i) => i - 1);
      return;
    }
    if (currentIdx > 0) {
      onSelectActiveQuestion(questionNumbers[currentIdx - 1]);
    }
  }, [isRedrill, redrillIndex, currentIdx, questionNumbers, onSelectActiveQuestion]);

  const goNext = useCallback(() => {
    if (isRedrill) {
      if (redrillQueue && redrillIndex < redrillQueue.length - 1) {
        setRedrillIndex((i) => i + 1);
      }
      return;
    }
    if (currentIdx >= 0 && currentIdx < questionNumbers.length - 1) {
      onSelectActiveQuestion(questionNumbers[currentIdx + 1]);
    }
  }, [isRedrill, redrillQueue, redrillIndex, currentIdx, questionNumbers, onSelectActiveQuestion]);

  const jumpToNextUnchecked = useCallback(() => {
    if (isRedrill) {
      goNext();
      return;
    }
    const after = questionNumbers
      .slice(currentIdx + 1)
      .find((n) => !checkedQuestions.has(n));
    const before = questionNumbers
      .slice(0, currentIdx)
      .find((n) => !checkedQuestions.has(n));
    const nextTarget = after ?? before;
    if (nextTarget !== undefined) {
      onSelectActiveQuestion(nextTarget);
    } else if (hasNext) {
      goNext();
    }
  }, [isRedrill, goNext, questionNumbers, currentIdx, checkedQuestions, onSelectActiveQuestion, hasNext]);

  const handleSelectOption = useCallback(
    (letter: Letter) => {
      if (isCurrentChecked) return;
      if (isRedrill) {
        setRedrillAnswers((prev) => ({ ...prev, [currentNumber]: letter }));
        return;
      }
      // If option was eliminated, un-eliminate it on explicit pick
      if (activeEliminated.includes(letter)) {
        onToggleEliminate(currentNumber, letter);
      }
      onPickAnswer(currentNumber, letter);
    },
    [isCurrentChecked, isRedrill, currentNumber, activeEliminated, onToggleEliminate, onPickAnswer],
  );

  const handleCheck = useCallback(() => {
    if (!activeAnswer || isCurrentChecked) return;
    if (isRedrill) {
      setRedrillChecked((prev) => {
        const next = new Set(prev);
        next.add(currentNumber);
        return next;
      });
      if (correctAnswer && activeAnswer !== correctAnswer && !explanations[currentNumber]) {
        onExplainQuestion(currentNumber, mistakeTypes[currentNumber] ?? null);
      }
      return;
    }

    onCheckAnswer(currentNumber, liveSeconds);
    // Immediately prefetch AI Examiner explanation in background on wrong answer
    // so it's ready right after the student picks their mistake archetype!
    if (correctAnswer && activeAnswer !== correctAnswer && !explanations[currentNumber]) {
      onExplainQuestion(currentNumber, null);
    }
  }, [
    activeAnswer,
    isCurrentChecked,
    isRedrill,
    currentNumber,
    correctAnswer,
    explanations,
    onExplainQuestion,
    mistakeTypes,
    onCheckAnswer,
    liveSeconds,
  ]);

  const handleStartRedrill = useCallback(() => {
    const missed = sessionStats.wrongNumbers;
    if (missed.length === 0) return;
    setRedrillQueue(missed);
    setRedrillIndex(0);
    setRedrillAnswers({});
    setRedrillChecked(new Set());
    setShowSessionReport(false);
  }, [sessionStats.wrongNumbers]);

  // Keyboard shortcuts (A/B/C/D or 1/2/3/4, Enter, Arrows, F for flag)
  useEffect(() => {
    if (showSessionReport || calcOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (!isCurrentChecked) {
        if (key === "a" || key === "1") {
          e.preventDefault();
          handleSelectOption("A");
          return;
        }
        if (key === "b" || key === "2") {
          e.preventDefault();
          handleSelectOption("B");
          return;
        }
        if (key === "c" || key === "3") {
          e.preventDefault();
          handleSelectOption("C");
          return;
        }
        if (key === "d" || key === "4") {
          e.preventDefault();
          handleSelectOption("D");
          return;
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (!isCurrentChecked && activeAnswer) {
          handleCheck();
        } else if (isCurrentChecked) {
          if (isIncorrect && !selectedMistake && !isTagSkipped && !isRedrill) {
            // Wait for mistake diagnosis before Enter auto-advances
            return;
          }
          if (hasNext) {
            goNext();
          } else if (!isRedrill && !graded) {
            onFinishSession();
          } else if (!isRedrill && graded) {
            setShowSessionReport(true);
          }
        }
        return;
      }

      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        goNext();
      } else if (key === "f" && !isRedrill) {
        e.preventDefault();
        onToggleFlag(currentNumber);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showSessionReport,
    calcOpen,
    isCurrentChecked,
    activeAnswer,
    isIncorrect,
    selectedMistake,
    isTagSkipped,
    isRedrill,
    hasPrev,
    hasNext,
    graded,
    currentNumber,
    handleSelectOption,
    handleCheck,
    goPrev,
    goNext,
    onToggleFlag,
    onFinishSession,
  ]);

  const allChecked =
    questionNumbers.length > 0 && sessionStats.checkedCount >= questionNumbers.length;

  // Live mistake counters for the header pill strip
  const mistakeCounts = useMemo(() => {
    const counts: Record<McqMistakeType, number> = {
      concept_gap: 0,
      distractor_trap: 0,
      stem_misread: 0,
      calculation_rush: 0,
    };
    for (const num of sessionStats.wrongNumbers) {
      const t = mistakeTypes[num];
      if (t && counts[t] !== undefined) {
        counts[t] += 1;
      }
    }
    return counts;
  }, [sessionStats.wrongNumbers, mistakeTypes]);

  const redrillDoneCount = redrillChecked.size;
  const redrillCorrectCount = useMemo(() => {
    if (!redrillQueue) return 0;
    return redrillQueue.filter(
      (n) => redrillChecked.has(n) && redrillAnswers[n] && redrillAnswers[n] === answerKey[n],
    ).length;
  }, [redrillQueue, redrillChecked, redrillAnswers, answerKey]);

  /* ---------------- Session Diagnostic Report View ---------------- */
  if (showSessionReport) {
    const finalScore = result?.score ?? sessionStats.correctCount;
    const finalTotal = result?.total ?? questionNumbers.length;
    const finalPct = Math.round((finalScore / Math.max(1, finalTotal)) * 100);

    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-6 bg-muted/15">
        <div className="mx-auto max-w-4xl space-y-5 pb-24">
          {/* Top Diagnostic Hero Card */}
          <Card className="overflow-hidden border-2 border-foreground/80 shadow-[5px_5px_0_hsl(var(--foreground))]">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">
                    <Target className="h-3.5 w-3.5" />
                    <span>Question-by-Question Diagnostic Report</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    {finalScore} / {finalTotal}{" "}
                    <span className="text-primary font-mono">({finalPct}%)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {sessionStats.avgSeconds !== null
                      ? `Average pacing: ${formatElapsed(sessionStats.avgSeconds)} per question · `
                      : ""}
                    {sessionStats.wrongCount === 0
                      ? "Flawless run — zero mistakes recorded."
                      : `${sessionStats.wrongCount} question${sessionStats.wrongCount === 1 ? "" : "s"} missed across this paper.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sessionStats.wrongCount > 0 ? (
                    <Button
                      size="sm"
                      onClick={handleStartRedrill}
                      className="gap-1.5 font-semibold shadow-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>
                        Re-Drill {sessionStats.wrongCount} Missed Question
                        {sessionStats.wrongCount === 1 ? "" : "s"}
                      </span>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSessionReport(false)}
                    className="gap-1.5"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Browse Questions</span>
                  </Button>
                </div>
              </div>

              <Progress value={finalPct} className="h-2.5" />
            </CardContent>
          </Card>

          {/* Mistake Pathology Ledger */}
          <McqMistakeLedger
            mistakeTypes={mistakeTypes}
            wrongNumbers={sessionStats.wrongNumbers}
            onSelectQuestion={(q) => {
              onSelectActiveQuestion(q);
              setShowSessionReport(false);
            }}
          />

          {/* Micro vs Macro + Topic Breakdown */}
          {attemptDomains.length > 0 ? (
            <McqDomainBreakdown
              domains={attemptDomains}
              title="This Paper: Microeconomics vs Macroeconomics"
            />
          ) : null}

          {attemptTopics.length > 0 ? (
            <McqReviewPanel
              topics={attemptTopics}
              questions={reviewQuestions}
              onSelectQuestion={(q) => {
                onSelectActiveQuestion(q);
                setShowSessionReport(false);
              }}
              title="Syllabus Topic Diagnostic"
            />
          ) : null}
        </div>
      </div>
    );
  }

  /* ---------------- Active Question-by-Question Focus Workspace ---------------- */
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-muted/10">
      {/* Top Progress Strip + Live Mistake Ledger */}
      <div className="shrink-0 border-b border-border/80 bg-card/90 px-3 sm:px-6 py-2.5 space-y-2 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isRedrill ? (
            <div className="flex items-center gap-2">
              <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500 font-bold text-[11px]">
                <RotateCcw className="h-3 w-3" />
                <span>
                  Missed-Question Re-Drill ({redrillIndex + 1}/{redrillQueue.length})
                </span>
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Fixed: <strong className="text-emerald-600 dark:text-emerald-400">{redrillCorrectCount}</strong>/{redrillDoneCount}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRedrillQueue(null);
                  setShowSessionReport(true);
                }}
                className="h-6 px-2 text-[11px]"
              >
                Exit Re-Drill
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-foreground">
                {sessionStats.correctCount}/{sessionStats.checkedCount} Correct
              </span>
              {sessionStats.accuracyPct !== null ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] font-bold py-0",
                    sessionStats.accuracyPct >= 75
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : sessionStats.accuracyPct >= 50
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {sessionStats.accuracyPct}%
                </Badge>
              ) : null}

              {sessionStats.currentStreak >= 2 ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono text-[10px] font-bold py-0"
                >
                  <Flame className="h-3 w-3 fill-orange-500" />
                  <span>{sessionStats.currentStreak} streak</span>
                </Badge>
              ) : null}

              {/* Live Mistake Ledger Chips */}
              {sessionStats.wrongCount > 0 ? (
                <div className="hidden md:flex items-center gap-1 pl-2 border-l border-border">
                  {MCQ_MISTAKE_TYPES.map((m) => {
                    const count = mistakeCounts[m.id];
                    if (count === 0) return null;
                    return (
                      <span
                        key={m.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          m.badgeClassName,
                        )}
                        title={`${m.label}: ${count}`}
                      >
                        <MistakeTypeIcon type={m.id} className="h-2.5 w-2.5" />
                        <span>
                          {m.shortLabel}: {count}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {!isRedrill && (graded || sessionStats.checkedCount > 0) ? (
              <Button
                size="sm"
                variant={allChecked || graded ? "default" : "outline"}
                disabled={!!busyLabel}
                onClick={() => {
                  if (graded) setShowSessionReport(true);
                  else onFinishSession();
                }}
                className="h-7 px-2.5 text-xs gap-1.5 font-semibold"
              >
                {busyLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                <span>
                  {graded
                    ? "Diagnostic Report"
                    : allChecked
                      ? "Finish & View Report"
                      : `Finish & Save (${sessionStats.checkedCount}/${questionNumbers.length})`}
                </span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Segmented Clickable Question Number Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {(isRedrill ? redrillQueue : questionNumbers).map((num, idx) => {
            const isCurrent = num === currentNumber;
            const checked = isRedrill
              ? redrillChecked.has(num)
              : graded || checkedQuestions.has(num);
            const picked = isRedrill ? redrillAnswers[num] : answers[num];
            const key = answerKey[num];
            const right = checked && key && picked === key;
            const wrong = checked && key && picked !== key;
            const isFlag = !isRedrill && flagged.has(num);
            const mistake = !isRedrill ? mistakeTypes[num] : undefined;

            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  if (isRedrill) setRedrillIndex(idx);
                  else onSelectActiveQuestion(num);
                }}
                className={cn(
                  "relative flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-bold transition-all",
                  isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105 z-10",
                  right
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : wrong
                      ? "border-destructive/60 bg-destructive/15 text-destructive"
                      : picked
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted",
                )}
                title={`Question ${num}${right ? " — Correct" : wrong ? ` — Incorrect${mistake ? ` (${MCQ_MISTAKE_META_MAP[mistake].label})` : ""}` : ""}${isFlag ? " (Flagged)" : ""}`}
              >
                {num}
                {isFlag ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-background" />
                ) : null}
                {wrong && mistake ? (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full",
                      MCQ_MISTAKE_META_MAP[mistake].barClassName,
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Workspace: Left = Real PDF Question Slice, Right = Answer & Diagnostic Panel */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* LEFT: Real PDF Question Stage */}
        <div className="lg:flex-1 min-w-0 lg:h-full lg:overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-[820px] space-y-3 pb-6 lg:pb-16">
            {/* Question Metadata Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2.5 font-mono text-xs font-extrabold text-primary-foreground">
                  Q{currentNumber}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground truncate">
                      {questionMeta.unit} · {questionMeta.topic}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                      Page {targetPageNum}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {questionMeta.subtopic}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground tabular-nums"
                  title="Time spent on this question"
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {formatElapsed(liveSeconds)}
                </span>

                {!isRedrill ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={flagged.has(currentNumber) ? "secondary" : "outline"}
                    onClick={() => onToggleFlag(currentNumber)}
                    className={cn(
                      "h-7 px-2 text-xs gap-1",
                      flagged.has(currentNumber) &&
                        "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                    title="Flag this question (F)"
                  >
                    <Flag
                      className={cn(
                        "h-3 w-3",
                        flagged.has(currentNumber) && "fill-amber-500 text-amber-500",
                      )}
                    />
                    <span className="hidden sm:inline">
                      {flagged.has(currentNumber) ? "Flagged" : "Flag"}
                    </span>
                  </Button>
                ) : null}

                {sliceCanvas ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFullPage((v) => !v)}
                    className="h-7 px-2 text-xs gap-1"
                    title={
                      showFullPage
                        ? "Return to isolated single-question PDF crop"
                        : "Expand to see the full original PDF page"
                    }
                  >
                    {showFullPage ? (
                      <>
                        <Minimize2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Question Crop</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Full Page</span>
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Real Official PDF Question Canvas Card */}
            <div className="rounded-xl border border-border/80 bg-white shadow-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] text-slate-600">
                <span className="font-semibold">
                  {isShowingCrop
                    ? `Official Cambridge PDF · Question ${currentNumber}`
                    : `Official Cambridge PDF · Full Page ${targetPageNum}`}
                </span>
                {annotateMode ? (
                  <span className="font-semibold text-rose-600">
                    Pen active — draw directly on diagram
                  </span>
                ) : !sliceCanvas ? (
                  <span className="text-slate-500">Full page view (PDF text layer unavailable)</span>
                ) : null}
              </div>

              {displayedCanvas && displayedDataUrl ? (
                <div
                  className="relative w-full select-none bg-white"
                  style={{
                    aspectRatio: `${displayedCanvas.width} / ${displayedCanvas.height}`,
                  }}
                >
                  <img
                    src={displayedDataUrl}
                    alt={`Question ${currentNumber} official PDF`}
                    className="w-full h-full object-contain pointer-events-none block"
                  />
                  <TutorAnnotationCanvas
                    width={displayedCanvas.width}
                    height={displayedCanvas.height}
                    enabled={annotateMode}
                    tool={annotateTool}
                    color={annotateColor}
                    clearSeq={annotationClearSeq}
                    questionKey={`${currentNumber}-${isShowingCrop ? "crop" : "full"}`}
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-slate-500">
                  Rendering official PDF question…
                </div>
              )}
            </div>

            {/* Bottom Prev / Next Question Bar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={goPrev}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Shortcuts: <kbd className="rounded border px-1 font-mono text-[10px]">A–D</kbd> pick
                · <kbd className="rounded border px-1 font-mono text-[10px]">Enter</kbd> check / next
                · <kbd className="rounded border px-1 font-mono text-[10px]">← →</kbd> navigate
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={goNext}
                className="gap-1.5"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: Interactive Answer + Instant Correction + Mistake Diagnosis Panel */}
        <aside className="lg:w-[25rem] xl:w-[28rem] shrink-0 lg:h-full lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-border/80 bg-card/60 backdrop-blur-xs">
          <div className="p-4 sm:p-5 space-y-4 pb-20">
            {/* Step 1: Answer Selection Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isCurrentChecked ? "Answer Verified" : `Select Answer for Q${currentNumber}`}
                </span>
                {!isCurrentChecked ? (
                  <span className="text-[11px] text-muted-foreground">
                    Right-click or tap ✕ to eliminate
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {(["A", "B", "C", "D"] as Letter[]).map((letter) => {
                  const isPicked = activeAnswer === letter;
                  const isEliminated = !isCurrentChecked && activeEliminated.includes(letter);
                  const isRightOpt = isCurrentChecked && correctAnswer === letter;
                  const isWrongPick =
                    isCurrentChecked && isPicked && correctAnswer !== null && correctAnswer !== letter;

                  return (
                    <div key={letter} className="relative group">
                      <button
                        type="button"
                        disabled={isCurrentChecked}
                        onClick={() => handleSelectOption(letter)}
                        onContextMenu={(e) => {
                          if (isCurrentChecked || isRedrill) return;
                          e.preventDefault();
                          onToggleEliminate(currentNumber, letter);
                        }}
                        className={cn(
                          "w-full h-14 rounded-xl border-2 font-bold transition-all flex items-center justify-between px-4 text-left",
                          !isCurrentChecked && !isPicked && !isEliminated &&
                            "border-border/80 bg-background hover:border-primary/60 hover:bg-primary/[0.03] active:scale-[0.98]",
                          !isCurrentChecked && isPicked &&
                            "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/25",
                          isEliminated &&
                            "border-dashed border-border/60 bg-muted/40 text-muted-foreground/50 line-through opacity-60",
                          isRightOpt &&
                            "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/25",
                          isWrongPick &&
                            "border-destructive bg-destructive/15 text-destructive ring-2 ring-destructive/20",
                          isCurrentChecked && !isRightOpt && !isWrongPick &&
                            "border-border/50 bg-muted/20 text-muted-foreground/60",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-extrabold",
                              isRightOpt
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : isWrongPick
                                  ? "border-destructive bg-destructive text-white"
                                  : isPicked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-muted/40 text-foreground",
                            )}
                          >
                            {letter}
                          </span>
                          <span className="text-xs font-semibold">
                            {isRightOpt
                              ? "Correct"
                              : isWrongPick
                                ? "Your Pick"
                                : isPicked
                                  ? "Selected"
                                  : isEliminated
                                    ? "Ruled Out"
                                    : `Option ${letter}`}
                          </span>
                        </div>

                        {isRightOpt ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isWrongPick ? (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : null}
                      </button>

                      {/* Eliminate distractor mini-button */}
                      {!isCurrentChecked && !isRedrill ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEliminate(currentNumber, letter);
                          }}
                          className={cn(
                            "absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-opacity",
                            isEliminated
                              ? "border-primary/40 bg-background text-primary opacity-100"
                              : "border-border/60 bg-background/80 text-muted-foreground opacity-60 group-hover:opacity-100 hover:border-destructive/50 hover:text-destructive",
                          )}
                          title={isEliminated ? `Restore Option ${letter}` : `Cross out Option ${letter}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons Before Checking */}
              {!isCurrentChecked ? (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="lg"
                    disabled={!activeAnswer || !correctAnswer}
                    onClick={handleCheck}
                    className="flex-1 font-bold gap-1.5 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>Check Answer</span>
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={jumpToNextUnchecked}
                    className="px-3 gap-1 text-xs"
                    title="Skip to next unanswered question"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>Skip</span>
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Step 2A: Instant Correction — CORRECT Outcome */}
            {isCorrect ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-extrabold">
                        Spot on! Option {correctAnswer} is correct.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-background/70 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                    >
                      {formatElapsed(liveSeconds)}
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                    {questionMeta.revisionTip}
                  </p>
                </div>

                {/* Optional Examiner Shortcut Breakdown on Correct Answer */}
                {!explanation ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onExplainQuestion(currentNumber, null)}
                    className="w-full gap-1.5 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Show Examiner Shortcut &amp; Derivation</span>
                  </Button>
                ) : (
                  <ExaminerRepairCard
                    explanation={explanation}
                    correctAnswer={correctAnswer!}
                    userAnswer={activeAnswer ?? null}
                    isCorrect={true}
                    mistakeType={null}
                    onRetry={() => onExplainQuestion(currentNumber, null)}
                  />
                )}

                <TutorNextActionBar
                  isRedrill={isRedrill}
                  hasNext={hasNext}
                  allChecked={allChecked}
                  graded={graded}
                  busyLabel={busyLabel}
                  redrillFinished={isRedrill && redrillDoneCount >= (redrillQueue?.length ?? 0)}
                  onNext={goNext}
                  onFinish={onFinishSession}
                  onOpenReport={() => {
                    setRedrillQueue(null);
                    setShowSessionReport(true);
                  }}
                />
              </div>
            ) : null}

            {/* Step 2B: Instant Correction — INCORRECT + "What Type of Mistake?" Gate */}
            {isIncorrect ? (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Immediate Correction Verdict Banner */}
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-extrabold">
                        Not quite — Official answer is {correctAnswer}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-background/80 font-mono text-[10px] font-bold"
                    >
                      {activeAnswer ?? "—"} &rarr; {correctAnswer}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/80">
                    Don&apos;t rush past this mark. Diagnose why you picked{" "}
                    <strong>Option {activeAnswer}</strong> so you never repeat it on exam day.
                  </p>
                </div>

                {/* "What Type of Mistake Did You Make?" Interactive 4-Card Selector */}
                {!isRedrill ? (
                  <div className="space-y-2 rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span>What type of mistake was this?</span>
                      </span>
                      {selectedMistake ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold py-0",
                            MCQ_MISTAKE_META_MAP[selectedMistake].badgeClassName,
                          )}
                        >
                          Tagged: {MCQ_MISTAKE_META_MAP[selectedMistake].shortLabel}
                        </Badge>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Tap 1 to unlock repair
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MCQ_MISTAKE_TYPES.map((m) => {
                        const isSelected = selectedMistake === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSetMistakeType(currentNumber, m.id);
                              if (!explanations[currentNumber]) {
                                onExplainQuestion(currentNumber, m.id);
                              }
                            }}
                            className={cn(
                              "flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-all active:scale-[0.98]",
                              isSelected
                                ? m.cardActiveClassName
                                : "border-border/70 bg-muted/20 hover:border-foreground/40 hover:bg-muted/40",
                            )}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-md border",
                                    m.badgeClassName,
                                  )}
                                >
                                  <MistakeTypeIcon type={m.id} className="h-3 w-3" />
                                </span>
                                <span className="text-xs font-bold leading-none">{m.label}</span>
                              </div>
                              {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                            </div>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {m.tagline}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {!selectedMistake && !isTagSkipped ? (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSkippedTagging((prev) => {
                              const next = new Set(prev);
                              next.add(currentNumber);
                              return next;
                            });
                            if (!explanations[currentNumber]) {
                              onExplainQuestion(currentNumber, null);
                            }
                          }}
                          className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Skip tagging &amp; reveal examiner explanation
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Step 3: Examiner Repair Card (Revealed once mistake is diagnosed or skipped, or in Re-Drill) */}
                {selectedMistake || isTagSkipped || isRedrill ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Tailored Action Tip for Selected Mistake Archetype */}
                    {selectedMistake ? (
                      <div
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
                          MCQ_MISTAKE_META_MAP[selectedMistake].badgeClassName,
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <MistakeTypeIcon type={selectedMistake} className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">
                              Fix your {MCQ_MISTAKE_META_MAP[selectedMistake].label}:{" "}
                            </span>
                            <span>{MCQ_MISTAKE_META_MAP[selectedMistake].coachingAction}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Structured Cambridge Examiner Explanation */}
                    <ExaminerRepairCard
                      explanation={explanation ?? "loading"}
                      correctAnswer={correctAnswer!}
                      userAnswer={activeAnswer ?? null}
                      isCorrect={false}
                      mistakeType={selectedMistake}
                      onRetry={() => onExplainQuestion(currentNumber, selectedMistake)}
                    />

                    <TutorNextActionBar
                      isRedrill={isRedrill}
                      hasNext={hasNext}
                      allChecked={allChecked}
                      graded={graded}
                      busyLabel={busyLabel}
                      redrillFinished={isRedrill && redrillDoneCount >= (redrillQueue?.length ?? 0)}
                      onNext={goNext}
                      onFinish={onFinishSession}
                      onOpenReport={() => {
                        setRedrillQueue(null);
                        setShowSessionReport(true);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExaminerRepairCard({
  explanation,
  correctAnswer,
  userAnswer,
  isCorrect,
  mistakeType,
  onRetry,
}: {
  explanation: ExplanationState;
  correctAnswer: Letter;
  userAnswer: Letter | null;
  isCorrect: boolean;
  mistakeType: McqMistakeType | null;
  onRetry: () => void;
}) {
  if (explanation === "loading") {
    return (
      <Card className="border-primary/25 bg-primary/[0.03]">
        <CardContent className="p-3.5 flex items-center gap-2.5 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span>Principal Examiner is analyzing why Option {correctAnswer} is uniquely right…</span>
        </CardContent>
      </Card>
    );
  }

  if ("error" in explanation) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-3.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{explanation.error}</span>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onRetry} className="h-7 px-2 text-xs gap-1">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const d = explanation.diagnostic;

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="py-2.5 px-3.5 border-b border-border/60 bg-muted/25">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Examiner Repair Breakdown</span>
          </CardTitle>
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] py-0"
          >
            Mark Scheme: {correctAnswer}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5 text-xs leading-relaxed">
        {d ? (
          <>
            {d.keyRule ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 text-[11px] mb-0.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Golden Rule</span>
                </div>
                <p className="text-foreground/90">{stripStars(d.keyRule)}</p>
              </div>
            ) : null}

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Why Option {correctAnswer} Works
              </span>
              <p className="text-foreground/90">{stripStars(d.correctReasoning)}</p>
            </div>

            {d.distractorTrap && !isCorrect ? (
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2">
                <div className="font-bold text-rose-700 dark:text-rose-300 text-[11px] mb-0.5">
                  The Trap {userAnswer ? `(Why Option ${userAnswer} Fails)` : ""}
                </div>
                <p className="text-foreground/90">{stripStars(d.distractorTrap)}</p>
              </div>
            ) : null}

            {d.speedTip ? (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
                <div className="flex items-center gap-1.5 font-bold text-primary text-[11px] mb-0.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span>45-Second Speed Tip</span>
                </div>
                <p className="text-foreground/90">{stripStars(d.speedTip)}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-foreground/90">{stripStars(explanation.text)}</p>
        )}

        {!isCorrect && mistakeType ? (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              title="Re-run explanation specifically focused on your tagged mistake type"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Tailor specifically to {MCQ_MISTAKE_META_MAP[mistakeType].shortLabel}</span>
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TutorNextActionBar({
  isRedrill,
  hasNext,
  allChecked,
  graded,
  busyLabel,
  redrillFinished,
  onNext,
  onFinish,
  onOpenReport,
}: {
  isRedrill: boolean;
  hasNext: boolean;
  allChecked: boolean;
  graded: boolean;
  busyLabel: string | null;
  redrillFinished: boolean;
  onNext: () => void;
  onFinish: () => void;
  onOpenReport: () => void;
}) {
  if (isRedrill) {
    if (hasNext) {
      return (
        <Button type="button" size="lg" onClick={onNext} className="w-full font-bold gap-1.5">
          <span>Next Missed Question</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="lg"
        onClick={onOpenReport}
        className="w-full font-bold gap-1.5"
      >
        <Award className="h-4 w-4" />
        <span>{redrillFinished ? "Re-Drill Complete — Return to Report" : "Return to Report"}</span>
      </Button>
    );
  }

  if (hasNext && !allChecked) {
    return (
      <Button type="button" size="lg" onClick={onNext} className="w-full font-bold gap-1.5 shadow-sm">
        <span>Next Question</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        disabled={!!busyLabel}
        onClick={graded ? onOpenReport : onFinish}
        className="w-full font-bold gap-1.5 shadow-sm"
      >
        {busyLabel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
        <span>{graded ? "Open Session Diagnostic Report" : "Finish & Save Diagnostic Report"}</span>
      </Button>
      {hasNext ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onNext}
          className="w-full gap-1 text-xs"
        >
          <span>Next Question</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
