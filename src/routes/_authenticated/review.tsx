import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  ListChecks,
  PenLine,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getReviewPanel,
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type ReviewTool,
} from "@/lib/review.functions";
import { MCQ_DOMAIN_LABEL } from "@/lib/mcq-domain";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review panel — Marginal Economics" },
      {
        name: "description",
        content:
          "A single AI review across your recent essays and MCQ papers — recurring strengths, recurring weaknesses, and a prioritised plan for what to do next.",
      },
    ],
  }),
  component: ReviewPanelPage,
});

const TOOL_LABEL: Record<ReviewTool, { label: string; to: string }> = {
  grade: { label: "Essay marking", to: "/grade" },
  practice: { label: "AO skills coach", to: "/practice" },
  "response-structure": { label: "Response structure", to: "/response-structure" },
  "essay-generator": { label: "Perfect essay generator", to: "/essay-generator" },
  diagrams: { label: "Diagram library", to: "/diagrams" },
  mcq: { label: "MCQ papers", to: "/mcq-live" },
  "question-bank": { label: "Question bank", to: "/question-bank" },
};

function ReviewPanelPage() {
  const fetchReview = useServerFn(getReviewPanel);
  const [hasRequested, setHasRequested] = useState(false);

  const query = useQuery({
    queryKey: ["review-panel"],
    queryFn: () => fetchReview(),
    enabled: hasRequested,
    staleTime: 0,
  });

  return (
    <>
      <PageHeader
        title="Review panel"
        description="One AI pass across all your recent essays and MCQ papers together — the patterns a single grade never shows you."
        action={
          hasRequested && query.data && query.data.eligible ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn("size-4 mr-1.5", query.isFetching && "animate-spin")} />
              Regenerate
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6 md:px-8">
        {!hasRequested ? (
          <StartCard onStart={() => setHasRequested(true)} />
        ) : query.isLoading || query.isFetching ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
        ) : query.data && !query.data.eligible ? (
          <NotEligibleCard
            essayCount={query.data.essayCount}
            mcqPaperCount={query.data.mcqPaperCount}
            essaysNeeded={query.data.essaysNeeded}
            mcqPapersNeeded={query.data.mcqPapersNeeded}
          />
        ) : query.data && query.data.eligible ? (
          <ReviewResults data={query.data} />
        ) : null}
      </div>
    </>
  );
}

function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="panel flex flex-col items-center gap-4 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ClipboardCheck className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold">Your full aggregate review</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Unlocks once you have {MIN_ESSAYS_FOR_REVIEW} graded essays and{" "}
          {MIN_MCQ_PAPERS_FOR_REVIEW} completed MCQ papers. The examiner reads across all of them at
          once — recurring strengths, recurring weaknesses with real evidence, an AO1/AO2/AO3 trend,
          your weakest MCQ topics, and a prioritised plan for exactly what to do next.
        </p>
      </div>
      <Button onClick={onStart} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs">
        <Sparkles className="size-4 mr-1.5" /> Check my review
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="panel flex flex-col items-center gap-3 p-12 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Reading across your recent essays and MCQ papers — this takes a bit longer than a single
        grade…
      </p>
      <div className="mt-2 w-full max-w-sm space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function NotEligibleCard({
  essayCount,
  mcqPaperCount,
  essaysNeeded,
  mcqPapersNeeded,
}: {
  essayCount: number;
  mcqPaperCount: number;
  essaysNeeded: number;
  mcqPapersNeeded: number;
}) {
  return (
    <div className="panel space-y-6 p-8">
      <div className="text-center">
        <h2 className="text-base font-semibold">Not quite enough data yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The review needs a real sample to find genuine patterns, not just restate one grade.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">Essays graded</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {essayCount}
            <span className="text-sm text-muted-foreground"> / {MIN_ESSAYS_FOR_REVIEW}</span>
          </p>
          {essaysNeeded > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {essaysNeeded} more {essaysNeeded === 1 ? "essay" : "essays"} needed
            </p>
          ) : (
            <p className="mt-1 text-xs text-emerald-500 font-medium">Ready</p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/grade">
              <PenLine className="size-3.5 mr-1" /> Mark an essay
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">MCQ papers finished</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {mcqPaperCount}
            <span className="text-sm text-muted-foreground"> / {MIN_MCQ_PAPERS_FOR_REVIEW}</span>
          </p>
          {mcqPapersNeeded > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {mcqPapersNeeded} more {mcqPapersNeeded === 1 ? "paper" : "papers"} needed
            </p>
          ) : (
            <p className="mt-1 text-xs text-emerald-500 font-medium">Ready</p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/mcq-live">
              <ListChecks className="size-3.5 mr-1" /> Practise MCQ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewResults({ data }: { data: any }) {
  const r = data.review;
  if (!r) return null;

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="text-base font-semibold">Executive summary</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
            {data.essayCount} essays sampled
          </Badge>
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
            {data.mcqPaperCount} MCQ papers sampled
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="size-4" /> Recurring strengths
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {r.strengths?.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-4" /> Recurring weaknesses
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {r.weaknesses?.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {r.nextSteps?.length ? (
        <div className="panel p-5">
          <h3 className="text-sm font-semibold">Prioritised action plan</h3>
          <ol className="mt-4 space-y-3">
            {r.nextSteps.map((step: any, i: number) => {
              const tool = TOOL_LABEL[step.tool as ReviewTool];
              return (
                <li
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      {i + 1}. {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.reason}</p>
                  </div>
                  {tool ? (
                    <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                      <Link to={tool.to}>
                        {tool.label} <ArrowRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
