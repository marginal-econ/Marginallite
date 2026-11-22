import {
  Check,
  CheckCheck,
  Crosshair,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActiveIssue,
  HistoryEntry,
  IssueCategory,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { AO_DEFINITIONS, defaultSplitForMaxMark } from "@/lib/examiner/config";
import type { Grading } from "@/lib/examiner/types";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

function cleanStars(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "")
    .replace(/[`_]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const CATEGORY_AO: Partial<Record<IssueCategory, string | null>> = {
  grammar: null,
  spelling: null,
  punctuation: null,
  clarity: null,
  economics_accuracy: AO_DEFINITIONS.ao1.code,
  misconception: AO_DEFINITIONS.ao1.code,
  terminology: AO_DEFINITIONS.ao1.code,
  analysis: AO_DEFINITIONS.ao2.code,
  application: AO_DEFINITIONS.ao2.code,
  reasoning_chain: AO_DEFINITIONS.ao2.code,
  evaluation: AO_DEFINITIONS.ao3.code,
};

const CATEGORY_LABEL: Partial<Record<IssueCategory, string>> = {
  grammar: "Grammar",
  spelling: "Spelling",
  punctuation: "Punctuation",
  clarity: "Clarity",
  economics_accuracy: "Economics accuracy",
  misconception: "Economic misconception",
  analysis: "Analysis",
  application: "Application",
  evaluation: "Evaluation",
  reasoning_chain: "Chain of reasoning",
  terminology: "Terminology",
};

const SEVERITY_VARIANT: Record<ActiveIssue["severity"], "destructive" | "default" | "outline"> = {
  high: "destructive",
  medium: "default",
  low: "outline",
};

const AO_STYLE = {
  AO1: { dot: "bg-ao1", badge: "border-ao1/40 bg-ao1/10 text-ao1" },
  AO2: { dot: "bg-ao2", badge: "border-ao2/40 bg-ao2/10 text-ao2" },
  AO3: { dot: "bg-ao3", badge: "border-ao3/40 bg-ao3/10 text-ao3" },
} as const;

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function getLiveExaminerIssueVisual(category: string) {
  if (category === "economics_accuracy" || category === "misconception") {
    return {
      cardBorder: "border-l-4 border-l-red-600 bg-red-500/5",
      badge: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300",
      dot: "bg-red-600",
    };
  }
  if (category === "terminology") {
    return {
      cardBorder: "border-l-4 border-l-ao1 bg-ao1/5",
      badge: "border-ao1/40 bg-ao1/10 text-ao1",
      dot: "bg-ao1",
    };
  }
  if (category === "analysis" || category === "application" || category === "reasoning_chain") {
    return {
      cardBorder: "border-l-4 border-l-ao2 bg-ao2/5",
      badge: "border-ao2/40 bg-ao2/10 text-ao2",
      dot: "bg-ao2",
    };
  }
  if (category === "evaluation") {
    return {
      cardBorder: "border-l-4 border-l-ao3 bg-ao3/5",
      badge: "border-ao3/40 bg-ao3/10 text-ao3",
      dot: "bg-ao3",
    };
  }
  return {
    cardBorder: "border-l-4 border-l-rose-500 bg-rose-500/5",
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  };
}

type FilterKey = "all" | "AO1" | "AO2" | "AO3" | "mechanics";

export function LiveExaminerPanel({
  issues,
  history,
  checking,
  pending,
  error,
  autosave,
  predictedMark,
  finalGrading,
  lastUpdatedAt,
  maxMark,
  gradedHelp,
  onAccept,
  onAcceptAll,
  onDismiss,
  onRescan,
  onClearAll,
  onFocusIssue,
  onOpenMaximizer,
  maximizerLoading,
  showPredictedMark = false,
}: {
  issues: ActiveIssue[];
  history: HistoryEntry[];
  checking: boolean;
  pending: boolean;
  error: string | null;
  autosave: AutosaveState;
  predictedMark: PredictedMark | null;
  finalGrading?: Grading | null;
  lastUpdatedAt: number | null;
  maxMark: number;
  gradedHelp?: ReactNode;
  onAccept: (id: string) => void;
  onAcceptAll?: () => void;
  onDismiss: (id: string) => void;
  onRescan: () => void;
  onClearAll: () => void;
  onFocusIssue?: (id: string) => void;
  onOpenMaximizer?: () => void;
  maximizerLoading?: boolean;
  showPredictedMark?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const resolvedHistory = useMemo(
    () =>
      history
        .filter((entry) => entry.status !== "active")
        .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)),
    [history],
  );

  const filteredIssues = useMemo(() => {
    if (filter === "all") return issues;
    if (filter === "mechanics") {
      return issues.filter((i) => CATEGORY_AO[i.category] === null);
    }
    return issues.filter((i) => CATEGORY_AO[i.category] === filter);
  }, [issues, filter]);

  return (
    <div className="flex h-full flex-col gap-3">
      {(showPredictedMark || finalGrading) ? (
        <PredictedMarkCard
          predictedMark={predictedMark}
          maxMark={maxMark}
          finalGrading={finalGrading}
          onOpenMaximizer={onOpenMaximizer}
          maximizerLoading={maximizerLoading}
        />
      ) : null}
      {gradedHelp}

      <div className="grid grid-cols-3 gap-1.5" aria-label="Assessment objective colour key">
        {[
          ["AO1", "Knowledge"],
          ["AO2", "Analysis"],
          ["AO3", "Evaluation"],
        ].map(([code, label]) => {
          const style = AO_STYLE[code as keyof typeof AO_STYLE];
          const isSelected = filter === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setFilter((prev) => (prev === code ? "all" : (code as FilterKey)))}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-all",
                style.badge,
                isSelected && "ring-2 ring-foreground/40 shadow-sm",
              )}
              title={`Filter suggestions by ${code} ${label}`}
            >
              <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
              <span className="min-w-0 text-[10px] font-semibold">
                {code}{" "}
                <span className="hidden font-normal text-muted-foreground xl:inline">{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusLine
          checking={checking}
          pending={pending}
          count={issues.length}
          lastUpdatedAt={lastUpdatedAt}
        />
        <div className="flex shrink-0 items-center gap-1">
          {issues.length > 1 && onAcceptAll ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[11px] font-semibold gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30"
              onClick={onAcceptAll}
              title="Accept all active revisions"
            >
              <CheckCheck className="size-3.5" /> Fix All ({issues.length})
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRescan}
          >
            <RefreshCw className={cn("size-3.5", checking && "animate-spin")} /> Rescan
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={issues.length === 0}
            onClick={onClearAll}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {(
            [
              ["all", `All (${issues.length})`],
              ["AO1", "AO1"],
              ["AO2", "AO2"],
              ["AO3", "AO3"],
              ["mechanics", "Grammar"],
            ] as [FilterKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                filter === key
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Tabs defaultValue="active" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            Suggestions {issues.length > 0 ? `(${issues.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            History {resolvedHistory.length > 0 ? `(${resolvedHistory.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-2 min-h-0 flex-1">
          <ScrollArea className="h-full pr-2">
            {filteredIssues.length === 0 ? (
              <EmptyState checking={checking} pending={pending} />
            ) : (
              <ul className="space-y-2.5">
                {filteredIssues.map((issue) => {
                  const visual = getLiveExaminerIssueVisual(issue.category);
                  return (
                    <li
                      key={issue.id}
                      onClick={() => onFocusIssue?.(issue.id)}
                      className={cn(
                        "group cursor-pointer rounded-xl border border-border bg-card p-3 transition-all hover:shadow-md hover:border-foreground/30",
                        visual.cardBorder,
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-semibold", visual.badge)}
                          >
                            {CATEGORY_LABEL[issue.category] ?? issue.category}
                            {CATEGORY_AO[issue.category] ? ` · ${CATEGORY_AO[issue.category]}` : ""}
                          </Badge>
                          <Badge
                            variant={SEVERITY_VARIANT[issue.severity]}
                            className="text-[9px] uppercase tracking-wider"
                          >
                            {issue.category === "misconception" ? "Misconception" : issue.severity}
                          </Badge>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Crosshair className="size-3" /> Locate
                        </span>
                      </div>

                      <div className="my-1.5 rounded-md border border-border/60 bg-background/70 p-2 text-xs space-y-1">
                        <p className="text-destructive line-through">
                          {cleanStars(issue.original)}
                        </p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          → {cleanSuggestion(cleanStars(issue.suggestion))}
                        </p>
                      </div>

                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {cleanStars(issue.explanation)}
                      </p>
                      {issue.evidence ? (
                        <p className="mt-1.5 rounded-md border border-border/70 bg-muted/30 p-1.5 text-[10px] leading-relaxed text-muted-foreground italic">
                          "{cleanStars(issue.evidence)}"
                        </p>
                      ) : null}
                      <div
                        className="mt-2.5 flex gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 flex-1 text-[11px] font-semibold"
                          onClick={() => onAccept(issue.id)}
                        >
                          <Check className="size-3" /> Accept Fix
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => onDismiss(issue.id)}
                        >
                          <X className="size-3" /> Dismiss
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-2 min-h-0 flex-1">
          <ScrollArea className="h-full pr-2">
            {resolvedHistory.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Accepted and dismissed suggestions will appear here.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {resolvedHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-[11px]"
                  >
                    {entry.status === "accepted" ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <span className="text-muted-foreground">
                        {CATEGORY_LABEL[entry.category] ?? entry.category}
                        {CATEGORY_AO[entry.category] ? ` (${CATEGORY_AO[entry.category]})` : ""}
                        :{" "}
                      </span>
                      <span className="line-through">{cleanStars(entry.original)}</span>
                      {entry.status === "accepted" ? (
                        <>
                          {" → "}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {cleanSuggestion(cleanStars(entry.suggestion))}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AutosaveIndicator state={autosave} />
    </div>
  );
}

function getCambridgeBandLabel(total: number, max: number): { label: string; color: string } {
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.8) {
    return {
      label: "Top Band · Level 4",
      color: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (ratio >= 0.6) {
    return {
      label: "Upper Middle · Level 3",
      color: "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300",
    };
  }
  if (ratio >= 0.35) {
    return {
      label: "Middle Band · Level 2",
      color: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
  }
  return {
    label: "Foundation · Level 1",
    color: "border-border bg-muted text-muted-foreground",
  };
}

function PredictedMarkCard({
  predictedMark,
  maxMark,
  finalGrading,
  onOpenMaximizer,
  maximizerLoading,
}: {
  predictedMark: PredictedMark | null;
  maxMark: number;
  finalGrading?: Grading | null;
  onOpenMaximizer?: () => void;
  maximizerLoading?: boolean;
}) {
  const [justChanged, setJustChanged] = useState(false);
  const previousMarkRef = useRef<number | null>(null);

  useEffect(() => {
    if (!predictedMark) return;
    const prev = previousMarkRef.current;
    previousMarkRef.current = predictedMark.total_mark;
    if (prev !== null && prev !== predictedMark.total_mark) {
      setJustChanged(true);
      const timeout = setTimeout(() => setJustChanged(false), 900);
      return () => clearTimeout(timeout);
    }
  }, [predictedMark]);

  if (finalGrading && Number.isFinite(finalGrading.total_mark)) {
    const total_mark = finalGrading.total_mark;
    const band = finalGrading.band;
    const knowledgeAw =
      finalGrading.ao_breakdown?.knowledge?.awarded ??
      (finalGrading as any).breakdown?.knowledge?.awarded ??
      0;
    const knowledgeMax =
      finalGrading.ao_breakdown?.knowledge?.out_of ??
      (finalGrading as any).breakdown?.knowledge?.out_of ??
      0;
    const analysisAw =
      finalGrading.ao_breakdown?.analysis?.awarded ??
      (finalGrading as any).breakdown?.analysis?.awarded ??
      0;
    const analysisMax =
      finalGrading.ao_breakdown?.analysis?.out_of ??
      (finalGrading as any).breakdown?.analysis?.out_of ??
      0;
    const evalAw =
      finalGrading.ao_breakdown?.evaluation?.awarded ??
      (finalGrading as any).breakdown?.evaluation?.awarded ??
      0;
    const evalMax =
      finalGrading.ao_breakdown?.evaluation?.out_of ??
      (finalGrading as any).breakdown?.evaluation?.out_of ??
      0;

    return (
      <div className="overflow-hidden rounded-xl border-2 border-emerald-600 bg-card shadow-[3px_3px_0_0_rgba(16,185,129,0.3)]">
        <div className="flex items-center justify-between bg-emerald-600 px-3 py-2 text-white">
          <span className="flex items-center gap-2 text-xs font-semibold">
            <span className="size-2 rounded-full bg-white animate-pulse" /> Official Cambridge Grade
          </span>
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
            {band || "Marked"}
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Examiner Score</span>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/30 text-emerald-600 font-semibold"
            >
              Verified Rubric
            </Badge>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {total_mark}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/ {maxMark}</span>
          </div>
          {finalGrading.examiner_summary ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
              {cleanStars(finalGrading.examiner_summary)}
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            <AoMini
              label={AO_DEFINITIONS.ao1.code}
              name="Knowledge"
              ao={{ awarded: knowledgeAw, out_of: knowledgeMax }}
              tone="ao1"
            />
            <AoMini
              label={AO_DEFINITIONS.ao2.code}
              name="Analysis"
              ao={{ awarded: analysisAw, out_of: analysisMax }}
              tone="ao2"
            />
            <AoMini
              label={AO_DEFINITIONS.ao3.code}
              name="Evaluation"
              ao={{ awarded: evalAw, out_of: evalMax }}
              tone="ao3"
            />
          </div>
          {onOpenMaximizer ? (
            <Button
              type="button"
              size="sm"
              onClick={onOpenMaximizer}
              disabled={maximizerLoading}
              className="mt-3 h-8 w-full gap-1.5 text-xs font-semibold shadow-sm"
            >
              {maximizerLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Building Perfection Blueprint…
                </>
              ) : (
                <>
                  <Wand2 className="size-3.5" /> Open Score Maximizer Blueprint
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const fallbackSplit = defaultSplitForMaxMark(maxMark);
  const effectiveMark: PredictedMark = predictedMark ?? {
    total_mark: 0,
    confidence: 0.5,
    headline: `0/${maxMark} marks — Define key syllabus terms in your opening to unlock AO1 marks`,
    ao_breakdown: {
      knowledge: { awarded: 0, out_of: fallbackSplit.ao1_marks },
      analysis: { awarded: 0, out_of: fallbackSplit.ao2_marks },
      evaluation: { awarded: 0, out_of: fallbackSplit.ao3_marks },
    },
  };

  const { total_mark, ao_breakdown, headline } = effectiveMark;
  const nextMove = getNextMove(ao_breakdown);
  const bandInfo = getCambridgeBandLabel(total_mark, maxMark);
  const overallPct = maxMark > 0 ? Math.min(100, Math.round((total_mark / maxMark) * 100)) : 0;

  return (
    <div className="overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--foreground)]">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <span className="size-2 rounded-full bg-white animate-pulse" /> Live Examiner
        </span>
        <span className="font-mono text-[10px] tracking-wider opacity-90">REAL-TIME RUBRIC</span>
      </div>
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Running Mark</span>
          <Badge variant="outline" className={cn("text-[10px] font-semibold", bandInfo.color)}>
            {bandInfo.label}
          </Badge>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums transition-all duration-300",
                justChanged && "scale-110 text-primary",
              )}
            >
              {total_mark}
            </span>
            <span className="text-sm font-medium text-muted-foreground">/ {maxMark}</span>
          </div>
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {overallPct}%
          </span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {headline ? (
          <p className="mt-2 text-[11px] font-medium leading-snug text-foreground/90">
            {cleanStars(headline)}
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          <AoMini
            label={AO_DEFINITIONS.ao1.code}
            name="Knowledge"
            ao={ao_breakdown.knowledge}
            tone="ao1"
          />
          <AoMini
            label={AO_DEFINITIONS.ao2.code}
            name="Analysis"
            ao={ao_breakdown.analysis}
            tone="ao2"
          />
          {ao_breakdown.evaluation.out_of > 0 ? (
            <AoMini
              label={AO_DEFINITIONS.ao3.code}
              name="Evaluation"
              ao={ao_breakdown.evaluation}
              tone="ao3"
            />
          ) : null}
        </div>

        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
          <p className="text-[9px] font-bold tracking-wider text-primary uppercase">
            Examiner Next Move
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-foreground">{nextMove}</p>
        </div>

        {onOpenMaximizer ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenMaximizer}
            disabled={maximizerLoading}
            className="mt-2.5 h-8 w-full gap-1.5 text-xs font-semibold border-primary/40 hover:bg-primary/10"
          >
            {maximizerLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Analysing Draft…
              </>
            ) : (
              <>
                <Wand2 className="size-3.5 text-primary" /> Maximize Score Blueprint
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function getNextMove(breakdown: PredictedMark["ao_breakdown"]): string {
  if (breakdown.knowledge.awarded === 0) {
    return "Start with a precise Cambridge IGCSE 0455 definition of the core concept in the question.";
  }
  if (breakdown.knowledge.awarded < breakdown.knowledge.out_of) {
    return "Add a second key syllabus definition or formula to lock in full AO1 Knowledge marks.";
  }
  if (breakdown.analysis.awarded < Math.ceil(breakdown.analysis.out_of / 2)) {
    return "Build an unbroken AO2 transmission chain: initial shock → market mechanism → equilibrium outcome.";
  }
  if (breakdown.evaluation.out_of > 0 && breakdown.evaluation.awarded === 0) {
    return "Introduce an AO3 evaluation sentence ('However, the effectiveness depends on PED/time lags...').";
  }
  if (breakdown.evaluation.awarded < breakdown.evaluation.out_of) {
    return "Weigh your arguments and finish with a conditional conclusion ('On balance, to a large extent...').";
  }
  return "Strengthen your analysis with a specific real-world example or policy comparison.";
}

function AoMini({
  label,
  name,
  ao,
  tone,
}: {
  label: string;
  name: string;
  ao: { awarded: number; out_of: number };
  tone: "ao1" | "ao2" | "ao3";
}) {
  const pct = ao.out_of > 0 ? Math.min(100, Math.round((ao.awarded / ao.out_of) * 100)) : 0;
  const toneClass = { ao1: "bg-ao1", ao2: "bg-ao2", ao3: "bg-ao3" }[tone];
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px]">
      <span className="flex w-20 items-center gap-1.5 font-semibold">
        <span className={cn("size-2 rounded-full", toneClass)} />
        {label} <span className="font-normal text-muted-foreground">{name.slice(0, 4)}.</span>
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", toneClass)}
          style={{ width: `${pct}%` }}
          aria-label={`${label} ${name}: ${ao.awarded} out of ${ao.out_of}`}
        />
      </div>
      <span className="w-9 text-right font-mono font-semibold text-foreground">
        {ao.awarded}/{ao.out_of}
      </span>
    </div>
  );
}

function StatusLine({
  checking,
  pending,
  count,
  lastUpdatedAt,
}: {
  checking: boolean;
  pending: boolean;
  count: number;
  lastUpdatedAt: number | null;
}) {
  if (checking) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" /> Calibrating with AI…
      </p>
    );
  }
  if (pending) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0 text-primary" /> Instant rubric active…
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0 text-primary" />
      {count > 0 ? `${count} suggestion${count === 1 ? "" : "s"}` : "All clear"}
      {lastUpdatedAt ? <span className="text-[10px] opacity-70">· Synced</span> : null}
    </p>
  );
}

function EmptyState({ checking, pending }: { checking: boolean; pending: boolean }) {
  if (checking || pending) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Loader2 className="size-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Verifying latest sentences against 0455 syllabus…</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <Sparkles className="size-5 text-emerald-500" />
      <p className="text-xs font-medium text-foreground">No active issues detected</p>
      <p className="text-[11px] text-muted-foreground">
        Hover or click any highlighted sentence in the editor to inspect its AO classification.
      </p>
    </div>
  );
}

function AutosaveIndicator({ state }: { state: AutosaveState }) {
  if (state === "idle") return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3 text-emerald-600" /> Saved
        </>
      ) : (
        <>
          <TriangleAlert className="size-3 text-amber-600" /> Couldn't autosave — keep this tab open
        </>
      )}
    </p>
  );
}
