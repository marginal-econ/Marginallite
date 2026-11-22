import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Check,
  Clock,
  Flame,
  Gamepad2,
  Layers,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createMcqQuiz } from "@/lib/mcq-quiz.functions";
import {
  formatQuizPin,
  type CustomQuizQuestion,
  type QuizGameMode,
  type QuizLetter,
  type QuizLevel,
  type QuizSourceType,
} from "@/lib/mcq-quiz.types";
import { TOPICAL_MCQ_PAPERS } from "@/lib/topical-mcq-papers";
import { cn } from "@/lib/utils";

export type HostablePaperSummary = {
  id: string;
  title: string;
  level: "igcse" | "as" | "a2" | string;
  examYear?: number | null;
  examSeries?: string | null;
  questionCount: number;
};

type CustomDraftQuestion = Omit<CustomQuizQuestion, "number"> & { id: string };

const SAMPLE_CUSTOM_QUESTIONS: Omit<CustomQuizQuestion, "number">[] = [
  {
    stem: "What is the opportunity cost to a student of choosing to revise Economics for 2 hours instead of working a part-time shift paying $15 per hour?",
    options: {
      A: "The total cost of textbooks and tuition fees",
      B: "The $30 wages forgone from the next best alternative",
      C: "The time spent commuting to school",
      D: "The marginal benefit of achieving a higher grade",
    },
    correctAnswer: "B",
    explanation:
      "Opportunity cost is the value of the next best alternative forgone. Giving up a 2-hour shift at $15/hr means $30 of forgone wages.",
    topic: "Basic Economic Ideas",
  },
  {
    stem: "A fall in the price of good X causes total consumer expenditure on good X to rise. What can be concluded about the price elasticity of demand (PED) for good X?",
    options: {
      A: "PED is perfectly inelastic (PED = 0)",
      B: "PED is price inelastic (0 < |PED| < 1)",
      C: "PED is unitary elastic (|PED| = 1)",
      D: "PED is price elastic (|PED| > 1)",
    },
    correctAnswer: "D",
    explanation:
      "When price falls and total revenue/expenditure increases, the percentage rise in quantity demanded exceeds the percentage fall in price, meaning demand is price elastic (|PED| > 1).",
    topic: "Elasticities",
  },
  {
    stem: "Which policy is most likely to cause a rightward shift of the long-run aggregate supply (LRAS) curve?",
    options: {
      A: "A temporary cut in the central bank base interest rate",
      B: "An increase in government welfare transfer payments",
      C: "Investment in national vocational training and broadband infrastructure",
      D: "An increase in the rate of Value Added Tax (VAT)",
    },
    correctAnswer: "C",
    explanation:
      "Supply-side investment in human capital (training) and physical infrastructure increases the economy's productive capacity, shifting LRAS to the right.",
    topic: "Macroeconomic Policies",
  },
];

function createEmptyQuestion(): CustomDraftQuestion {
  return {
    id: crypto.randomUUID(),
    stem: "",
    options: { A: "", B: "", C: "", D: "" },
    correctAnswer: "A",
    explanation: "",
  };
}

export function McqQuizHostModal({
  open,
  onOpenChange,
  libraryPapers,
  initialSourceType,
  initialPaperId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryPapers: HostablePaperSummary[];
  initialSourceType?: QuizSourceType;
  initialPaperId?: string | null;
  onCreated?: (pin: string) => void;
}) {
  const navigate = useNavigate();
  const createQuizFn = useServerFn(createMcqQuiz);

  const [sourceType, setSourceType] = useState<QuizSourceType>(initialSourceType ?? "library_paper");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>(
    initialSourceType === "library_paper" && initialPaperId
      ? initialPaperId
      : libraryPapers[0]?.id ?? "",
  );
  const [selectedTopicalId, setSelectedTopicalId] = useState<string>(
    initialSourceType === "topical_paper" && initialPaperId
      ? initialPaperId
      : TOPICAL_MCQ_PAPERS[0]?.id ?? "",
  );
  const [paperSearch, setPaperSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "igcse" | "as" | "a2">("all");
  const [customLevel, setCustomLevel] = useState<QuizLevel>("as");

  const [title, setTitle] = useState("");
  const [questionStart, setQuestionStart] = useState<number>(1);
  const [questionEnd, setQuestionEnd] = useState<number>(30);
  const [gameMode, setGameMode] = useState<QuizGameMode>("live_race");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0); // 0 = untimed
  const [showInstantFeedback, setShowInstantFeedback] = useState(true);
  const [showLiveLeaderboard, setShowLiveLeaderboard] = useState(true);

  const [customQuestions, setCustomQuestions] = useState<CustomDraftQuestion[]>([
    createEmptyQuestion(),
  ]);
  const [creating, setCreating] = useState(false);

  // Only sync/initialize when modal transitions to open, NEVER reset when user clicks another paper
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (initialSourceType) setSourceType(initialSourceType);
      if (initialSourceType === "library_paper" && initialPaperId) {
        setSelectedLibraryId(initialPaperId);
      } else if (initialSourceType === "topical_paper" && initialPaperId) {
        setSelectedTopicalId(initialPaperId);
      } else if (libraryPapers[0]?.id) {
        setSelectedLibraryId(libraryPapers[0].id);
      }
      setPaperSearch("");
      setTitle("");
    }
    prevOpenRef.current = open;
  }, [open, initialSourceType, initialPaperId, libraryPapers]);

  // If papers loaded asynchronously while modal is open
  useEffect(() => {
    if (open && !selectedLibraryId && libraryPapers.length > 0) {
      setSelectedLibraryId(libraryPapers[0].id);
    }
  }, [open, selectedLibraryId, libraryPapers]);

  const selectedLibraryPaper = useMemo(
    () => libraryPapers.find((p) => p.id === selectedLibraryId) ?? libraryPapers[0] ?? null,
    [libraryPapers, selectedLibraryId],
  );
  const selectedTopicalPaper = useMemo(
    () => TOPICAL_MCQ_PAPERS.find((p) => p.id === selectedTopicalId) ?? TOPICAL_MCQ_PAPERS[0],
    [selectedTopicalId],
  );

  // Update question range whenever selected paper changes
  const activePaperMaxQ =
    sourceType === "library_paper"
      ? selectedLibraryPaper?.questionCount || 30
      : sourceType === "topical_paper"
        ? selectedTopicalPaper?.questionCount || 15
        : customQuestions.length;

  useEffect(() => {
    if (sourceType !== "custom_questions") {
      setQuestionStart(1);
      setQuestionEnd(activePaperMaxQ);
    }
  }, [sourceType, selectedLibraryPaper?.id, selectedTopicalPaper?.id, activePaperMaxQ]);

  const filteredLibraryPapers = useMemo(() => {
    const q = paperSearch.trim().toLowerCase();
    return libraryPapers.filter((p) => {
      if (levelFilter !== "all" && p.level !== levelFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        String(p.examYear ?? "").includes(q) ||
        (p.examSeries ?? "").toLowerCase().includes(q)
      );
    });
  }, [libraryPapers, paperSearch, levelFilter]);

  function updateCustomQuestion(
    id: string,
    updater: (q: CustomDraftQuestion) => CustomDraftQuestion,
  ) {
    setCustomQuestions((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  }

  function loadSampleCustomPaper() {
    setCustomQuestions(
      SAMPLE_CUSTOM_QUESTIONS.map((q) => ({
        ...q,
        id: crypto.randomUUID(),
      })),
    );
    if (!title.trim()) {
      setTitle("0455 Economics Live Warm-Up Battle");
    }
    toast.success("Loaded 3 sample Cambridge 0455 questions — edit or add more!");
  }

  async function handleCreate() {
    if (creating) return;

    if (sourceType === "library_paper" && !selectedLibraryPaper) {
      toast.error("Please select a past paper first.");
      return;
    }
    if (sourceType === "custom_questions") {
      const invalidIdx = customQuestions.findIndex(
        (q) =>
          !q.stem.trim() ||
          !q.options.A.trim() ||
          !q.options.B.trim() ||
          !q.options.C.trim() ||
          !q.options.D.trim(),
      );
      if (invalidIdx !== -1) {
        toast.error(`Please complete the question text and all 4 options (A–D) for Question ${invalidIdx + 1}.`);
        return;
      }
    }

    setCreating(true);
    try {
      const payload =
        sourceType === "library_paper"
          ? {
              title: title.trim() || selectedLibraryPaper!.title,
              sourceType: "library_paper" as const,
              paperId: selectedLibraryPaper!.id,
              level: selectedLibraryPaper!.level,
              questionStart: Math.max(1, Math.min(activePaperMaxQ, questionStart)),
              questionEnd: Math.max(questionStart, Math.min(activePaperMaxQ, questionEnd)),
              gameMode,
              timeLimitSeconds: timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null,
              showInstantFeedback,
              showLiveLeaderboard,
            }
          : sourceType === "topical_paper"
            ? {
                title: title.trim() || selectedTopicalPaper.shortTitle,
                sourceType: "topical_paper" as const,
                paperId: selectedTopicalPaper.id,
                level: selectedTopicalPaper.level,
                questionStart: Math.max(1, Math.min(activePaperMaxQ, questionStart)),
                questionEnd: Math.max(questionStart, Math.min(activePaperMaxQ, questionEnd)),
                gameMode,
                timeLimitSeconds: timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null,
                showInstantFeedback,
                showLiveLeaderboard,
              }
            : {
                title: title.trim() || `Custom MCQ Paper (${customQuestions.length}Q)`,
                sourceType: "custom_questions" as const,
                level: customLevel,
                customQuestions: customQuestions.map(({ id: _id, ...rest }) => rest),
                gameMode,
                timeLimitSeconds: timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null,
                showInstantFeedback,
                showLiveLeaderboard,
              };

      const res = await createQuizFn({ data: payload });
      const shareUrl = `${window.location.origin}/quiz/${res.pin}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(`Live Quiz PIN ${formatQuizPin(res.pin)} created — invite link copied!`);
      } catch {
        toast.success(`Live Quiz PIN ${formatQuizPin(res.pin)} created!`);
      }

      onOpenChange(false);
      onCreated?.(res.pin);
      navigate({ to: "/quiz/$pin", params: { pin: res.pin } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create live quiz.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10 px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold tracking-tight">
                  Host a Live MCQ Quiz
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Generate a shareable link &amp; 6-digit PIN — students join and race through a whole paper together.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {/* Step 1: Source Type Switcher */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Choose Paper Source
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "library_paper",
                    label: "Past Paper",
                    sub: `${libraryPapers.length} papers`,
                    icon: BookOpen,
                  },
                  {
                    id: "topical_paper",
                    label: "Topical Paper",
                    sub: `${TOPICAL_MCQ_PAPERS.length} topics`,
                    icon: Layers,
                  },
                  {
                    id: "custom_questions",
                    label: "Create Custom",
                    sub: "Write own MCQs",
                    icon: PenLine,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = sourceType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceType(tab.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                        : "border-border hover:border-foreground/30 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold text-foreground">{tab.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{tab.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Source Selection */}
          {sourceType === "library_paper" ? (
            <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={paperSearch}
                    onChange={(e) => setPaperSearch(e.target.value)}
                    placeholder="Search Cambridge 0455 paper (e.g. 2026, Paper 12, Feb/March)…"
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-[11px]">
                  {(["all", "igcse", "as"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelFilter(lvl)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-semibold uppercase transition-colors",
                        levelFilter === lvl
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1 pr-1">
                {filteredLibraryPapers.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No matching past papers found.
                  </p>
                ) : (
                  filteredLibraryPapers.map((paper) => {
                    const selected = selectedLibraryPaper?.id === paper.id;
                    return (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => setSelectedLibraryId(paper.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          selected
                            ? "border-primary bg-primary/10 font-semibold text-foreground"
                            : "border-transparent bg-background hover:border-border",
                        )}
                      >
                        <span className="truncate">{paper.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] uppercase py-0">
                            {paper.level}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {paper.questionCount}Q
                          </span>
                          {selected ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedLibraryPaper ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                  <span className="font-medium text-muted-foreground">Question range:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">Q</span>
                    <Input
                      type="number"
                      min={1}
                      max={activePaperMaxQ}
                      value={questionStart}
                      onChange={(e) => setQuestionStart(Math.max(1, Number(e.target.value) || 1))}
                      className="h-7 w-16 text-center font-mono text-xs bg-background"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      min={questionStart}
                      max={activePaperMaxQ}
                      value={questionEnd}
                      onChange={(e) =>
                        setQuestionEnd(
                          Math.min(activePaperMaxQ, Math.max(questionStart, Number(e.target.value) || activePaperMaxQ)),
                        )
                      }
                      className="h-7 w-16 text-center font-mono text-xs bg-background"
                    />
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {Math.max(1, questionEnd - questionStart + 1)} Qs
                    </Badge>
                  </div>
                </div>
              ) : null}
            </div>
          ) : sourceType === "topical_paper" ? (
            <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {TOPICAL_MCQ_PAPERS.map((paper) => {
                  const selected = selectedTopicalPaper.id === paper.id;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setSelectedTopicalId(paper.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/10 font-semibold text-foreground"
                          : "border-transparent bg-background hover:border-border",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{paper.shortTitle}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {paper.topicNumber} · {paper.sourceYearsLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase py-0">
                          {paper.level}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {paper.questionCount}Q
                        </span>
                        {selected ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                <span className="font-medium text-muted-foreground">Question range:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Q</span>
                  <Input
                    type="number"
                    min={1}
                    max={activePaperMaxQ}
                    value={questionStart}
                    onChange={(e) => setQuestionStart(Math.max(1, Number(e.target.value) || 1))}
                    className="h-7 w-16 text-center font-mono text-xs bg-background"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={questionStart}
                    max={activePaperMaxQ}
                    value={questionEnd}
                    onChange={(e) =>
                      setQuestionEnd(
                        Math.min(activePaperMaxQ, Math.max(questionStart, Number(e.target.value) || activePaperMaxQ)),
                      )
                    }
                    className="h-7 w-16 text-center font-mono text-xs bg-background"
                  />
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {Math.max(1, questionEnd - questionStart + 1)} Qs
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* Custom Paper Question Builder */
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Custom Questions ({customQuestions.length})
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-[10px]">
                    {(["as", "a2"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCustomLevel(lvl)}
                        className={cn(
                          "rounded px-2 py-0.5 font-bold uppercase",
                          customLevel === lvl
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={loadSampleCustomPaper}
                  className="h-7 gap-1 text-[11px]"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Load 3 Sample 0455 Qs
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {customQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="space-y-2.5 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        Question {idx + 1}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Correct:</span>
                        <div className="inline-flex gap-1">
                          {(["A", "B", "C", "D"] as QuizLetter[]).map((letter) => (
                            <button
                              key={letter}
                              type="button"
                              onClick={() =>
                                updateCustomQuestion(q.id, (prev) => ({
                                  ...prev,
                                  correctAnswer: letter,
                                }))
                              }
                              className={cn(
                                "h-6 w-6 rounded font-mono text-xs font-bold transition-all",
                                q.correctAnswer === letter
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                        {customQuestions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCustomQuestions((prev) => prev.filter((item) => item.id !== q.id))
                            }
                            className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remove question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <Textarea
                      value={q.stem}
                      onChange={(e) =>
                        updateCustomQuestion(q.id, (prev) => ({ ...prev, stem: e.target.value }))
                      }
                      placeholder="Type the MCQ question stem…"
                      rows={2}
                      className="text-xs resize-none"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(["A", "B", "C", "D"] as QuizLetter[]).map((letter) => (
                        <div key={letter} className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold",
                              q.correctAnswer === letter
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {letter}
                          </span>
                          <Input
                            value={q.options[letter]}
                            onChange={(e) =>
                              updateCustomQuestion(q.id, (prev) => ({
                                ...prev,
                                options: { ...prev.options, [letter]: e.target.value },
                              }))
                            }
                            placeholder={`Option ${letter}`}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <Input
                      value={q.explanation ?? ""}
                      onChange={(e) =>
                        updateCustomQuestion(q.id, (prev) => ({
                          ...prev,
                          explanation: e.target.value,
                        }))
                      }
                      placeholder="Optional explanation shown after answering…"
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomQuestions((prev) => [...prev, createEmptyQuestion()])}
                className="w-full gap-1.5 text-xs border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Question
              </Button>
            </div>
          )}

          {/* Step 3: Room Title & Game Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-room-title" className="text-xs font-semibold">
                Quiz Title (shown to students)
              </Label>
              <Input
                id="quiz-room-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  sourceType === "library_paper"
                    ? selectedLibraryPaper?.title ?? "e.g. Period 3 Paper 12 Battle"
                    : sourceType === "topical_paper"
                      ? selectedTopicalPaper.shortTitle
                      : "e.g. Year 12 Elasticity Quiz"
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Time Limit (optional)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {[0, 10, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimeLimitMinutes(mins)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      timeLimitMinutes === mins
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {mins === 0 ? "No limit" : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game Mode Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Quiz Mode
              </Label>
              <span className="text-[11px] font-semibold text-primary">
                {gameMode === "live_race" ? "🎮 Game Arena with Power-Ups" : "🎓 Serious Exam Assessment"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGameMode("live_race")}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all active:scale-[0.99]",
                  gameMode === "live_race"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40"
                    : "border-border/80 hover:bg-muted/40",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 text-lg">
                  ⚡
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-black text-foreground">Game Arena Mode</p>
                    <Badge className="bg-amber-500 text-amber-950 font-bold text-[9px] py-0 px-1.5">
                      Power-Ups Active
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Steal points, Swap scores, Pigouvian tax, Central Bank shields, 2x boosts, and Freeze attacks! High energy Blooket-style competition.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameMode("exam_sprint")}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all active:scale-[0.99]",
                  gameMode === "exam_sprint"
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                    : "border-border/80 hover:bg-muted/40",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary text-lg">
                  🎓
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-black text-foreground">Serious Exam Mode</p>
                    <Badge variant="outline" className="font-mono text-[9px] py-0 px-1.5">
                      Standard
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Distraction-free official exam timer, accuracy-first scoring, no power-ups, and full diagnostic report for mock exam prep.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Show right/wrong &amp; explanation after each question
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Students immediately see why the official Cambridge answer is right (uses stored instant explanations).
                </p>
              </div>
              <Switch checked={showInstantFeedback} onCheckedChange={setShowInstantFeedback} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Live student leaderboard during quiz
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Students can see their live rank &amp; classmates&apos; scores while answering.
                </p>
              </div>
              <Switch checked={showLiveLeaderboard} onCheckedChange={setShowLiveLeaderboard} />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="gap-2 font-bold shadow-sm"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Quiz Room…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Create Quiz Link &amp; Open Lobby
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
