import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, stripStars } from "@/lib/utils";
import { formatThreeLineMcqFeedback } from "@/lib/mcq/mcq-feedback-format";
import {
  getSyllabusTopicMeta,
  MCQ_DOMAIN_LABEL,
  type DomainStat,
  type McqSkill,
} from "@/lib/mcq-domain";
import {
  buildMistakePathologySummary,
  MCQ_MISTAKE_META_MAP,
  type McqMistakeType,
} from "@/lib/mcq-mistakes";

export type TopicStat = {
  topic: string;
  attempted: number;
  correct: number;
  accuracyPct: number | null;
  unit?: string;
  domain?: "micro" | "macro" | "unclassified";
  revisionTip?: string;
  questionNumbers?: number[];
  wrongNumbers?: number[];
};

export type McqDiagnostic = {
  concept: string;
  keyRule: string;
  correctReasoning: string;
  distractorTrap: string;
  speedTip: string;
};

/** One graded question, enough to render a clickable review row and topic/skill breakdown. */
export type GradedQuestion = {
  number: number;
  topic: string;
  subtopic?: string;
  unit?: string;
  domain?: "micro" | "macro" | "unclassified";
  skill?: McqSkill;
  stem_text?: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  user_answer: "A" | "B" | "C" | "D" | null;
  correct: boolean | null;
  mistake_type?: McqMistakeType | null;
};

/**
 * Helper to build rich per-topic diagnostic stats from a graded `questions` list.
 * Groups questions by canonical Cambridge IGCSE 0455 syllabus topic and tracks exact
 * question numbers and missed question numbers for each topic.
 */
export function buildTopicStatsFromQuestions(
  questions: GradedQuestion[],
  level: "AS" | "A2" = "AS",
): TopicStat[] {
  const map = new Map<
    string,
    {
      topic: string;
      unit: string;
      domain: "micro" | "macro";
      revisionTip: string;
      attempted: number;
      correct: number;
      questionNumbers: number[];
      wrongNumbers: number[];
    }
  >();

  for (const q of questions) {
    if (q.correct === null || q.correct === undefined) continue;
    const meta = getSyllabusTopicMeta(q.topic, level);
    const canonicalTopic = meta.topic;
    const entry = map.get(canonicalTopic) ?? {
      topic: canonicalTopic,
      unit: q.unit || meta.unit,
      domain: (q.domain === "macro" || q.domain === "micro" ? q.domain : meta.domain) as
        | "micro"
        | "macro",
      revisionTip: meta.revisionTip,
      attempted: 0,
      correct: 0,
      questionNumbers: [],
      wrongNumbers: [],
    };
    entry.attempted += 1;
    entry.questionNumbers.push(q.number);
    if (q.correct) {
      entry.correct += 1;
    } else {
      entry.wrongNumbers.push(q.number);
    }
    map.set(canonicalTopic, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      questionNumbers: entry.questionNumbers.sort((a, b) => a - b),
      wrongNumbers: entry.wrongNumbers.sort((a, b) => a - b),
      accuracyPct: Math.round((entry.correct / Math.max(1, entry.attempted)) * 100),
    }))
    .sort((a, b) => {
      if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
      return b.attempted - b.correct - (a.attempted - a.correct);
    });
}

/**
 * Clean, compact two-section breakdown for Microeconomics vs Macroeconomics.
 */
export function McqDomainBreakdown({
  domains,
  title = "Section Split: Microeconomics vs Macroeconomics",
}: {
  domains: DomainStat[];
  title?: string;
}) {
  const shown = domains.filter((d) => d.attempted > 0 && d.domain !== "unclassified");
  if (shown.length === 0) return null;

  const micro = shown.find((d) => d.domain === "micro");
  const macro = shown.find((d) => d.domain === "macro");

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="pb-2.5 pt-4 px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {micro && macro && Math.abs(micro.accuracyPct - macro.accuracyPct) > 7 ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] py-0"
            >
              Focus: {micro.accuracyPct < macro.accuracyPct ? "Microeconomics" : "Macroeconomics"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {shown.map((entry) => {
            const marksLost = entry.attempted - entry.correct;
            return (
              <div
                key={entry.domain}
                className="rounded-lg border border-border/70 bg-muted/20 p-2.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {MCQ_DOMAIN_LABEL[entry.domain]}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      entry.accuracyPct >= 75
                        ? "text-emerald-600 dark:text-emerald-400"
                        : entry.accuracyPct >= 55
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {entry.correct}/{entry.attempted} ({entry.accuracyPct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      entry.accuracyPct >= 75
                        ? "bg-emerald-500"
                        : entry.accuracyPct >= 55
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${entry.accuracyPct}%` }}
                  />
                </div>
                {marksLost > 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {marksLost} {marksLost === 1 ? "mark" : "marks"} lost in this section
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Clean, tabbed Topic-Wise Diagnostic Report for Cambridge IGCSE 0455 MCQ attempts.
 * Separates Priority Revision, All Topics, and AO Skills into compact tabs so the UI stays neat.
 */
export function McqReviewPanel({
  topics,
  questions,
  onSelectQuestion,
  title = "Topic-Wise Diagnostic",
  emptyLabel = "Complete an MCQ paper to unlock your topic-by-topic Cambridge IGCSE 0455 diagnostic report.",
}: {
  topics: TopicStat[];
  questions?: GradedQuestion[];
  onSelectQuestion?: (questionNumber: number) => void;
  title?: string;
  emptyLabel?: string;
}) {
  const [activeTab, setActiveTab] = useState<"priority" | "all" | "skills">("priority");
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  const mergedMap = new Map<
    string,
    {
      topic: string;
      unit: string;
      domain: "micro" | "macro";
      revisionTip: string;
      attempted: number;
      correct: number;
      questionNumbers: number[];
      wrongNumbers: number[];
    }
  >();

  const baseList =
    questions && questions.length > 0 ? buildTopicStatsFromQuestions(questions) : topics;

  for (const raw of baseList) {
    if (raw.attempted <= 0) continue;
    const meta = getSyllabusTopicMeta(raw.topic);
    const key = meta.topic;
    const existing = mergedMap.get(key) ?? {
      topic: meta.topic,
      unit: raw.unit || meta.unit,
      domain: raw.domain === "macro" || raw.domain === "micro" ? raw.domain : meta.domain,
      revisionTip: raw.revisionTip || meta.revisionTip,
      attempted: 0,
      correct: 0,
      questionNumbers: [],
      wrongNumbers: [],
    };
    existing.attempted += raw.attempted;
    existing.correct += raw.correct;
    if (raw.questionNumbers) {
      existing.questionNumbers.push(...raw.questionNumbers);
    }
    if (raw.wrongNumbers) {
      existing.wrongNumbers.push(...raw.wrongNumbers);
    }
    mergedMap.set(key, existing);
  }

  const withData = [...mergedMap.values()]
    .map((t) => {
      const pct = Math.round((t.correct / Math.max(1, t.attempted)) * 100);
      const marksLost = t.attempted - t.correct;
      return {
        ...t,
        pct,
        marksLost,
      };
    })
    .sort((a, b) => {
      if (a.pct !== b.pct) return a.pct - b.pct;
      return b.marksLost - a.marksLost;
    });

  if (withData.length === 0) {
    return (
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="py-4 px-5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-0 text-xs text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  const totalAttempted = withData.reduce((s, t) => s + t.attempted, 0);
  const totalCorrect = withData.reduce((s, t) => s + t.correct, 0);
  const totalMarksLost = totalAttempted - totalCorrect;
  const overallPct = Math.round((totalCorrect / Math.max(totalAttempted, 1)) * 100);

  const laggingTopics = withData.filter((t) => t.pct < 70 && t.marksLost > 0).slice(0, 4);
  const fallbackLagging =
    laggingTopics.length === 0
      ? withData.filter((t) => t.marksLost > 0).slice(0, 3)
      : laggingTopics;

  const strongTopics = [...withData]
    .filter((t) => t.pct >= 75)
    .sort((a, b) => b.pct - a.pct || b.attempted - a.attempted);

  const gradeBand =
    overallPct >= 80
      ? { grade: "A*", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
      : overallPct >= 70
        ? { grade: "A", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" }
        : overallPct >= 60
          ? { grade: "B", color: "text-sky-600 bg-sky-500/10 border-sky-500/30" }
          : overallPct >= 50
            ? { grade: "C", color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/30" }
            : overallPct >= 40
              ? { grade: "D", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" }
              : overallPct >= 33
                ? { grade: "E", color: "text-orange-600 bg-orange-500/10 border-orange-500/30" }
                : { grade: "U", color: "text-rose-600 bg-rose-500/10 border-rose-500/30" };

  const skillStats = (() => {
    if (!questions || questions.length === 0) return [];
    const map = new Map<McqSkill, { label: string; attempted: number; correct: number }>([
      ["knowledge", { label: "AO1 Knowledge", attempted: 0, correct: 0 }],
      ["application", { label: "AO2 Data & Calculation", attempted: 0, correct: 0 }],
      ["analysis", { label: "AO3 Diagram & Analysis", attempted: 0, correct: 0 }],
    ]);
    for (const q of questions) {
      const sk: McqSkill =
        q.skill === "application" || q.skill === "analysis" ? q.skill : "knowledge";
      const entry = map.get(sk)!;
      entry.attempted += 1;
      if (q.correct) entry.correct += 1;
    }
    return [...map.entries()]
      .filter(([, v]) => v.attempted > 0)
      .map(([skill, v]) => ({
        skill,
        label: v.label,
        attempted: v.attempted,
        correct: v.correct,
        pct: Math.round((v.correct / v.attempted) * 100),
      }));
  })();

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3 pt-4 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className={cn("font-bold text-[11px] px-2 py-0", gradeBand.color)}>
            <Award className="size-3 mr-1" /> Grade {gradeBand.grade}
          </Badge>
        </div>

        {/* Clean segmented control to switch views without clutter */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("priority")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              activeTab === "priority"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Focus Areas ({fallbackLagging.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              activeTab === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Topics ({withData.length})
          </button>
          {skillStats.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab("skills")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                activeTab === "skills"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Skills
            </button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 text-xs">
        {/* Compact KPI Strip */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Accuracy
            </span>
            <p className="text-sm font-bold tabular-nums">
              {totalCorrect}/{totalAttempted}{" "}
              <span className="font-normal text-muted-foreground">({overallPct}%)</span>
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Marks Lost
            </span>
            <p
              className={cn(
                "text-sm font-bold tabular-nums",
                totalMarksLost > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {totalMarksLost > 0 ? `-${totalMarksLost}` : "0"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Mastered (&ge;75%)
            </span>
            <p className="text-sm font-bold tabular-nums">
              {strongTopics.length}/{withData.length} topics
            </p>
          </div>
        </div>

        {/* TAB 1: PRIORITY FOCUS AREAS */}
        {activeTab === "priority" ? (
          <div className="space-y-2">
            {fallbackLagging.length > 0 ? (
              fallbackLagging.map((t) => {
                const isTipOpen = !!expandedTips[t.topic];
                return (
                  <div
                    key={t.topic}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <TrendingDown className="size-3.5 shrink-0 text-rose-500" />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {t.unit}
                        </span>
                        <span className="font-semibold text-foreground truncate">{t.topic}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          -{t.marksLost}m
                        </span>
                        <Badge
                          variant="outline"
                          className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] px-1.5 py-0"
                        >
                          {t.correct}/{t.attempted} ({t.pct}%)
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {(t.wrongNumbers?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-muted-foreground mr-0.5">Missed:</span>
                          {(t.wrongNumbers ?? []).map((qNum) =>
                            onSelectQuestion ? (
                              <button
                                key={qNum}
                                type="button"
                                onClick={() => onSelectQuestion(qNum)}
                                className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                              >
                                Q{qNum}
                              </button>
                            ) : (
                              <span
                                key={qNum}
                                className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-700 dark:text-rose-300"
                              >
                                Q{qNum}
                              </span>
                            ),
                          )}
                        </div>
                      ) : <span />}

                      {t.revisionTip ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTips((prev) => ({ ...prev, [t.topic]: !prev[t.topic] }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          <Lightbulb className="size-3" />
                          <span>{isTipOpen ? "Hide tip" : "Examiner tip"}</span>
                          {isTipOpen ? (
                            <ChevronUp className="size-3" />
                          ) : (
                            <ChevronDown className="size-3" />
                          )}
                        </button>
                      ) : null}
                    </div>

                    {isTipOpen && t.revisionTip ? (
                      <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-foreground/90 leading-relaxed">
                        {t.revisionTip}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Every tested syllabus topic achieved 100% accuracy!</span>
              </div>
            )}

            {strongTopics.length > 0 ? (
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mr-1">
                  <TrendingUp className="size-3" /> Strongest:
                </span>
                {strongTopics.slice(0, 4).map((t) => (
                  <Badge
                    key={t.topic}
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 text-[10px] py-0"
                  >
                    {t.topic} ({t.pct}%)
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 2: ALL TOPICS */}
        {activeTab === "all" ? (
          <div className="divide-y divide-border/60 rounded-lg border border-border/80 max-h-72 overflow-y-auto">
            {withData.map((t) => {
              const barClass =
                t.pct < 55 ? "bg-rose-500" : t.pct < 75 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={t.topic} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {t.unit}
                      </span>
                      <span className="font-medium text-foreground truncate">{t.topic}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums font-mono text-[11px]">
                      <span className="text-muted-foreground">
                        {t.correct}/{t.attempted}
                      </span>
                      <span className="w-8 text-right font-bold">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", barClass)}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* TAB 3: ASSESSMENT SKILLS */}
        {activeTab === "skills" && skillStats.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {skillStats.map((sk) => (
              <div
                key={sk.skill}
                className="rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-foreground truncate">{sk.label}</span>
                  <span className="font-bold tabular-nums">{sk.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      sk.pct >= 75
                        ? "bg-emerald-500"
                        : sk.pct >= 55
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${sk.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {sk.correct}/{sk.attempted} correct
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** State for one question's on-demand AI explanation, keyed by question number. */
export type ExplanationState =
  | "loading"
  | { text: string; diagnostic?: McqDiagnostic }
  | { error: string };

/**
 * Clean, scannable per-question review list with filter tabs and structured on-demand AI explanations.
 */
export function McqQuestionReviewList({
  questions,
  onSelect,
  onExplain,
  explanations,
  title = "Question Review",
}: {
  questions: GradedQuestion[];
  onSelect: (number: number) => void;
  onExplain?: (number: number) => void;
  explanations?: Record<number, ExplanationState>;
  title?: string;
}) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct">("all");
  const sorted = [...questions].sort((a, b) => a.number - b.number);
  if (sorted.length === 0) return null;

  const wrongCount = sorted.filter((q) => !q.correct).length;
  const correctCount = sorted.filter((q) => q.correct === true).length;

  const filtered = sorted.filter((q) => {
    if (filter === "wrong") return !q.correct;
    if (filter === "correct") return q.correct === true;
    return true;
  });

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="space-y-2.5 pb-3 pt-3.5 px-3.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <span className="font-mono text-[11px] text-muted-foreground">
            {correctCount}/{sorted.length} correct
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-md py-1 font-medium transition-colors",
              filter === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All ({sorted.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("wrong")}
            className={cn(
              "rounded-md py-1 font-medium transition-colors",
              filter === "wrong"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Missed ({wrongCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("correct")}
            className={cn(
              "rounded-md py-1 font-medium transition-colors",
              filter === "correct"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Correct ({correctCount})
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {filter === "wrong"
              ? "Zero missed questions — perfect score!"
              : "No questions match this filter."}
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((q) => {
              const skipped = q.user_answer === null;
              const explanation = explanations?.[q.number];
              const meta = getSyllabusTopicMeta(q.topic);
              const displayTopic = q.topic && q.topic !== "Untagged" ? q.topic : meta.topic;

              return (
                <li key={q.number} className="transition-colors hover:bg-muted/15">
                  <div className="flex w-full items-center gap-2 px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelect(q.number)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:opacity-85"
                    >
                      {q.correct === true ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : q.correct === false ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                      )}
                      <span className="w-7 shrink-0 font-mono text-[11px] font-bold text-foreground">
                        Q{q.number}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                        {displayTopic}
                      </span>
                      {q.correct === false && q.mistake_type && MCQ_MISTAKE_META_MAP[q.mistake_type] ? (
                        <span
                          className={cn(
                            "hidden sm:inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.2 text-[9px] font-semibold",
                            MCQ_MISTAKE_META_MAP[q.mistake_type].badgeClassName,
                          )}
                          title={`Diagnosed mistake: ${MCQ_MISTAKE_META_MAP[q.mistake_type].label}`}
                        >
                          {MCQ_MISTAKE_META_MAP[q.mistake_type].shortLabel}
                        </span>
                      ) : null}
                      <span className="shrink-0 font-mono text-[11px]">
                        {skipped ? (
                          <span className="text-muted-foreground">
                            — &rarr;{" "}
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {q.correct_answer}
                            </span>
                          </span>
                        ) : q.correct ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {q.user_answer}
                          </span>
                        ) : (
                          <span className="text-destructive font-bold">
                            {q.user_answer}{" "}
                            <span className="text-muted-foreground font-normal">&rarr;</span>{" "}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {q.correct_answer}
                            </span>
                          </span>
                        )}
                      </span>
                    </button>

                    {onExplain && q.correct_answer ? (
                      <Button
                        variant={explanation && explanation !== "loading" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-6 shrink-0 gap-1 px-2 text-[11px]"
                        disabled={explanation === "loading"}
                        onClick={() => onExplain(q.number)}
                      >
                        {explanation === "loading" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Explain
                      </Button>
                    ) : null}
                  </div>

                  {/* Compact Examiner Explanation */}
                  {explanation && explanation !== "loading" ? (
                    <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed">
                      {"error" in explanation ? (
                        <div className="flex items-center gap-1.5 text-rose-500">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span>{explanation.error}</span>
                        </div>
                      ) : (() => {
                        const formatted = formatThreeLineMcqFeedback({
                          explanation,
                          correctAnswer: q.correct_answer,
                          userAnswer: q.selected,
                          isCorrect: q.correct,
                        });
                        return (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-semibold text-primary text-[11px] truncate">
                                {formatted.concept ?? (explanation.diagnostic ? stripStars(explanation.diagnostic.concept) : `Q${q.number} Breakdown`)}
                              </span>
                              <div className="flex items-center gap-1">
                                {explanation.visionGrounded ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-0.5 border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[9px] py-0 px-1"
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                    Vision
                                  </Badge>
                                ) : null}
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] py-0"
                                >
                                  Ans: {q.correct_answer}
                                </Badge>
                              </div>
                            </div>

                            {/* Strictly 3 Punchy Lines */}
                            <div className="space-y-1.5 rounded-md border border-border/60 bg-background/60 p-2">
                              {/* Line 1: Why Correct */}
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

                              {/* Line 2: The Trap */}
                              {formatted.line2.text ? (
                                <div className="flex items-start gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] font-bold py-0 px-1 shrink-0",
                                      q.correct
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

                              {/* Line 3: Cambridge Takeaway */}
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
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MistakeTypeIcon({
  type,
  className,
}: {
  type: McqMistakeType;
  className?: string;
}) {
  switch (type) {
    case "concept_gap":
      return <Brain className={cn("h-4 w-4", className)} />;
    case "distractor_trap":
      return <AlertTriangle className={cn("h-4 w-4", className)} />;
    case "stem_misread":
      return <Eye className={cn("h-4 w-4", className)} />;
    case "calculation_rush":
      return <Zap className={cn("h-4 w-4", className)} />;
  }
}

/**
 * Reusable Cognitive Mistake Ledger ("Why You Lost Marks") card.
 * Works both from per-question mistake maps (single attempt) and lifetime
 * aggregate counts (overall analytics tab).
 */
export function McqMistakeLedger({
  mistakeTypes,
  wrongNumbers,
  countsOverride,
  onSelectQuestion,
  title = "Why You Lost Marks — Mistake Pathology",
  className,
}: {
  mistakeTypes?: Record<number, McqMistakeType | null | undefined>;
  wrongNumbers?: number[];
  countsOverride?: Record<McqMistakeType, number>;
  onSelectQuestion?: (questionNumber: number) => void;
  title?: string;
  className?: string;
}) {
  const effectiveMap: Record<number, McqMistakeType> = {};
  const effectiveWrong: number[] = [];

  if (countsOverride) {
    let syntheticIdx = 1;
    for (const [k, count] of Object.entries(countsOverride) as [McqMistakeType, number][]) {
      for (let i = 0; i < count; i += 1) {
        effectiveMap[syntheticIdx] = k;
        effectiveWrong.push(syntheticIdx);
        syntheticIdx += 1;
      }
    }
  }

  const summary = buildMistakePathologySummary(
    countsOverride ? effectiveMap : (mistakeTypes ?? {}),
    countsOverride ? effectiveWrong : (wrongNumbers ?? []),
  );

  if (summary.totalTagged === 0 && summary.totalWrong === 0) {
    return null;
  }

  return (
    <Card className={cn("border-border/80 shadow-xs overflow-hidden", className)}>
      <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                {summary.totalTagged} diagnosed mistake{summary.totalTagged === 1 ? "" : "s"}
                {summary.untaggedCount > 0 ? ` · ${summary.untaggedCount} untagged` : ""}
              </p>
            </div>
          </div>

          {summary.dominant ? (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 font-semibold text-[11px] py-0.5",
                summary.dominant.meta.badgeClassName,
              )}
            >
              <MistakeTypeIcon type={summary.dominant.meta.id} className="h-3 w-3" />
              <span>Primary Leak: {summary.dominant.meta.label}</span>
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5">
        <div className="space-y-2.5">
          {summary.buckets.map((bucket) => {
            const isPrimary = summary.dominant?.meta.id === bucket.meta.id && bucket.count > 0;
            return (
              <div key={bucket.meta.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        bucket.meta.badgeClassName,
                      )}
                    >
                      <MistakeTypeIcon type={bucket.meta.id} className="h-3 w-3" />
                    </span>
                    <span className={cn("font-semibold truncate", isPrimary && "text-foreground")}>
                      {bucket.meta.label}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">
                      — {bucket.meta.tagline}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    <span className="font-bold text-foreground">{bucket.count}</span>
                    <span className="text-muted-foreground">({bucket.pct}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", bucket.meta.barClassName)}
                    style={{ width: `${bucket.count > 0 ? Math.max(6, bucket.pct) : 0}%` }}
                  />
                </div>

                {!countsOverride && onSelectQuestion && (bucket.questionNumbers?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(bucket.questionNumbers ?? []).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onSelectQuestion(num)}
                        className={cn(
                          "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors hover:opacity-80",
                          bucket.meta.badgeClassName,
                        )}
                      >
                        Q{num}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5 text-xs leading-relaxed">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary">Examiner Recommendation: </span>
              <span className="text-foreground/90">{summary.recommendation}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Clean, accessible dialog prompting the student to choose whether to grade
 * only attempted questions or the full paper when finishing/submitting early.
 */
export function SubmitGradingDialog({
  open,
  onOpenChange,
  attemptedCount,
  totalCount,
  onConfirm,
  busy,
  title = "Submit MCQ Paper",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptedCount: number;
  totalCount: number;
  onConfirm: (gradeOnlyAttempted: boolean) => void;
  busy?: boolean;
  title?: string;
}) {
  const unattemptedCount = Math.max(0, totalCount - attemptedCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Target className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            You have answered <span className="font-semibold text-foreground">{attemptedCount}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span> questions (
            <span className="text-amber-600 dark:text-amber-400 font-medium">{unattemptedCount} unattempted</span>).
            Choose how you would like your score calculated:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Option 1: Grade only attempted */}
          <button
            type="button"
            disabled={busy || attemptedCount === 0}
            onClick={() => onConfirm(true)}
            className="w-full text-left p-3.5 rounded-xl border-2 border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] hover:border-primary transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground group-hover:text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Grade Only Attempted Questions</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                    Recommended
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your score is calculated out of <span className="font-bold font-mono text-foreground">{attemptedCount}</span>.
                  The {unattemptedCount} unattempted question{unattemptedCount === 1 ? "" : "s"} will not count against your score or affect your Cambridge topic diagnostics.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Grade entire paper */}
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(false)}
            className="w-full text-left p-3.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Grade Entire Paper (All Questions)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Simulates official Cambridge exam conditions out of <span className="font-bold font-mono text-foreground">{totalCount}</span>.
                  The {unattemptedCount} unattempted question{unattemptedCount === 1 ? "" : "s"} will be counted as incorrect (0 marks).
                </p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Keep Practicing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
