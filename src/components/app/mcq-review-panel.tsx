import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MCQ_DOMAIN_LABEL, type DomainStat } from "@/lib/mcq-domain";

export type TopicStat = {
  topic: string;
  attempted: number;
  correct: number;
  accuracyPct: number | null;
};

export type McqDiagnostic = {
  concept: string;
  keyRule: string;
  correctReasoning: string;
  distractorTrap: string;
  speedTip: string;
};

/**
 * SAT-"Reading vs Writing" style two-section breakdown for MCQ feedback —
 * micro and macro side by side, sitting above the fine-grained per-topic
 * list rather than replacing it. Renders nothing for a section with zero
 * attempted questions (e.g. a paper that happened to be all-micro).
 */
export function McqDomainBreakdown({
  domains,
  title = "Micro vs macro",
}: {
  domains: DomainStat[];
  title?: string;
}) {
  const shown = domains.filter((d) => d.attempted > 0 && d.domain !== "unclassified");
  if (shown.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {shown.map((entry) => (
          <div key={entry.domain}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                {MCQ_DOMAIN_LABEL[entry.domain]}
              </span>
              <span className="text-sm font-semibold tabular-nums">{entry.accuracyPct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${entry.accuracyPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {entry.correct}/{entry.attempted} correct
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Advanced, written review of an MCQ attempt — provides overall accuracy,
 * Cambridge grade boundary estimate, pacing insights, and syllabus strength/weakness diagnosis.
 */
export function McqReviewPanel({
  topics,
  title = "Examiner Performance Analysis",
  emptyLabel = "Answer questions to generate Cambridge syllabus diagnostics and distractor breakdown.",
}: {
  topics: TopicStat[];
  title?: string;
  emptyLabel?: string;
}) {
  const withData = topics
    .filter((t) => t.attempted > 0)
    .map((t) => ({ ...t, pct: t.accuracyPct ?? Math.round((t.correct / t.attempted) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  if (withData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{emptyLabel}</CardContent>
      </Card>
    );
  }

  const weak = withData.filter((t) => t.pct < 50).slice(0, 3);
  const strong = [...withData]
    .filter((t) => t.pct >= 70)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const totalAttempted = withData.reduce((s, t) => s + t.attempted, 0);
  const totalCorrect = withData.reduce((s, t) => s + t.correct, 0);
  const overallPct = Math.round((totalCorrect / Math.max(totalAttempted, 1)) * 100);

  const gradeBand =
    overallPct >= 85
      ? { grade: "A*", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
      : overallPct >= 75
        ? { grade: "A", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" }
        : overallPct >= 65
          ? { grade: "B", color: "text-sky-600 bg-sky-500/10 border-sky-500/30" }
          : overallPct >= 50
            ? { grade: "C", color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30" }
            : overallPct >= 40
              ? { grade: "D", color: "text-orange-600 bg-orange-500/10 border-orange-500/30" }
              : { grade: "U", color: "text-rose-600 bg-rose-500/10 border-rose-500/30" };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Est. Grade:</span>
          <Badge variant="outline" className={cn("font-bold text-xs px-2 py-0.5", gradeBand.color)}>
            <Award className="size-3 mr-1" /> Grade {gradeBand.grade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 p-3">
          <div>
            <span className="text-xs text-muted-foreground">Accuracy Score</span>
            <p className="text-lg font-bold tabular-nums">
              {totalCorrect} / {totalAttempted}{" "}
              <span className="text-xs font-normal text-muted-foreground">({overallPct}%)</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Cambridge Paper Pace</span>
            <p className="text-xs font-medium text-foreground">Target: ~2 min / question</p>
          </div>
        </div>

        {strong.length > 0 ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Syllabus Strengths
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {strong.map((t) => (
                <Badge
                  key={t.topic}
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs py-0.5"
                >
                  {t.topic} ({t.pct}%)
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {weak.length > 0 ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Priority Revision Topics
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {weak.map((t) => (
                <Badge
                  key={t.topic}
                  variant="outline"
                  className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 text-xs py-0.5"
                >
                  {t.topic} ({t.pct}%)
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {strong.length === 0 && weak.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Balanced performance across questions — complete more papers to pinpoint topic
            anomalies.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** One graded question, enough to render a clickable review row. */
export type GradedQuestion = {
  number: number;
  topic: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  user_answer: "A" | "B" | "C" | "D" | null;
  correct: boolean | null;
};

/** State for one question's on-demand AI explanation, keyed by question number. */
export type ExplanationState =
  "loading" | { text: string; diagnostic?: McqDiagnostic } | { error: string };

/**
 * Advanced per-question list: right/wrong, student's answer vs correct mark scheme,
 * topic classification, and on-demand Cambridge Examiner diagnostic feedback.
 */
export function McqQuestionReviewList({
  questions,
  onSelect,
  onExplain,
  explanations,
  title = "Review each question",
}: {
  questions: GradedQuestion[];
  onSelect: (number: number) => void;
  /** Called when the student presses "Explain" for a question — caller owns fetching + state. */
  onExplain?: (number: number) => void;
  /** Current explanation state per question number, if any request has been made for it. */
  explanations?: Record<number, ExplanationState>;
  title?: string;
}) {
  const sorted = [...questions].sort((a, b) => a.number - b.number);
  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {sorted.map((q) => {
            const skipped = q.user_answer === null;
            const explanation = explanations?.[q.number];
            return (
              <li key={q.number} className="transition-colors hover:bg-muted/10">
                <div className="flex w-full items-center gap-3 px-4 py-2.5 text-sm">
                  <button
                    type="button"
                    onClick={() => onSelect(q.number)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
                  >
                    {q.correct === true ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : q.correct === false ? (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                    )}
                    <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                      Q{q.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.topic}</span>
                    <span className="shrink-0 font-mono text-xs">
                      {skipped ? (
                        <span className="text-muted-foreground">skipped</span>
                      ) : q.correct ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {q.user_answer}
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          {q.user_answer}{" "}
                          <span className="text-muted-foreground font-normal">→</span>{" "}
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
                      className="h-7 shrink-0 gap-1 px-2.5 text-xs"
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

                {/* ── Structured Examiner Explanation ── */}
                {explanation && explanation !== "loading" ? (
                  <div className="border-t border-border/70 bg-card/60 px-4 py-3 text-xs leading-relaxed">
                    {"error" in explanation ? (
                      <div className="flex items-center gap-2 text-rose-500">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>{explanation.error}</span>
                      </div>
                    ) : explanation.diagnostic ? (
                      <div className="space-y-3">
                        {/* Concept & Target Reference */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <div className="flex items-center gap-1.5 text-primary">
                            <BookOpen className="size-3.5" />
                            <span className="font-semibold">{explanation.diagnostic.concept}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            {q.user_answer && !q.correct ? (
                              <Badge
                                variant="outline"
                                className="text-destructive border-destructive/30 bg-destructive/10"
                              >
                                Student Pick: {q.user_answer}
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                            >
                              Cambridge Mark Scheme: {q.correct_answer}
                            </Badge>
                          </div>
                        </div>

                        {/* Golden Rule / Cambridge Principle */}
                        {explanation.diagnostic.keyRule ? (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-foreground/90">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                              <Lightbulb className="size-3.5 shrink-0" />
                              <span>Cambridge Principle / Golden Rule</span>
                            </div>
                            <p className="mt-1 text-xs leading-normal">
                              {explanation.diagnostic.keyRule}
                            </p>
                          </div>
                        ) : null}

                        {/* Step-by-Step Worked Derivation */}
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-foreground/90">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            <span>
                              Step-by-Step Worked Derivation (Why Option {q.correct_answer} is
                              Correct)
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-normal">
                            {explanation.diagnostic.correctReasoning}
                          </p>
                        </div>

                        {/* Distractor Trap Analysis */}
                        {explanation.diagnostic.distractorTrap ? (
                          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-foreground/90">
                            <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="size-3.5 shrink-0" />
                              <span>Distractor Trap &amp; Misconception Diagnosis</span>
                            </div>
                            <p className="mt-1 text-xs leading-normal">
                              {explanation.diagnostic.distractorTrap}
                            </p>
                          </div>
                        ) : null}

                        {/* Speed Elimination Tip */}
                        {explanation.diagnostic.speedTip ? (
                          <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-2 text-xs text-foreground/90">
                            <Zap className="size-3.5 shrink-0 text-sky-500 mt-0.5" />
                            <div>
                              <span className="font-semibold text-sky-600 dark:text-sky-400">
                                Paper Speed Shortcut (&lt; 45s):{" "}
                              </span>
                              <span>{explanation.diagnostic.speedTip}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-muted-foreground leading-relaxed">{explanation.text}</p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
