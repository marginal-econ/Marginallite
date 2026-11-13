import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Filter,
  Flame,
  GraduationCap,
  Layers,
  LibraryBig,
  ListChecks,
  Loader2,
  Minus,
  PenLine,
  Printer,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getReviewPanel,
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type ReviewTool,
} from "@/lib/review.functions";
import { listMyEssays, getProgress } from "@/lib/grading.functions";
import {
  getMyPaperHistory,
  getMcqTopicPerformance,
  type PaperHistoryEntry,
} from "@/lib/mcq-pdf.functions";
import { MCQ_DOMAIN_LABEL } from "@/lib/mcq-domain";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review & Analytics — Marginalite" },
      {
        name: "description",
        content:
          "Comprehensive revision and performance hub: Cambridge grade projection, all past MCQ papers, essay portfolio, mastery pillars, and targeted mark gains.",
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

export function ReviewPanelPage() {
  const fetchReview = useServerFn(getReviewPanel);
  const fetchEssays = useServerFn(listMyEssays);
  const fetchProgress = useServerFn(getProgress);
  const fetchMcqHistory = useServerFn(getMyPaperHistory);
  const fetchMcqTopics = useServerFn(getMcqTopicPerformance);

  const [activeTab, setActiveTab] = useState<"synthesis" | "mcq" | "essays">("synthesis");
  const [essaySearch, setEssaySearch] = useState("");
  const [essayBandFilter, setEssayBandFilter] = useState<"all" | "band1" | "band2" | "band3">("all");
  const [mcqEraFilter, setMcqEraFilter] = useState<"all" | "legacy" | "2027">("all");

  // Queries
  const reviewQuery = useQuery({
    queryKey: ["review-panel"],
    queryFn: () => fetchReview(),
    staleTime: 60_000,
  });

  const essaysQuery = useQuery({
    queryKey: ["review-essays"],
    queryFn: () => fetchEssays(),
  });

  const progressQuery = useQuery({
    queryKey: ["review-progress"],
    queryFn: () => fetchProgress(),
  });

  const mcqHistoryQuery = useQuery({
    queryKey: ["review-mcq-history"],
    queryFn: () => fetchMcqHistory(),
  });

  const mcqTopicsQuery = useQuery({
    queryKey: ["review-mcq-topics"],
    queryFn: () => fetchMcqTopics(),
  });

  // Computed metrics
  const essayList = useMemo(() => essaysQuery.data ?? [], [essaysQuery.data]);
  const mcqPapers = useMemo(() => mcqHistoryQuery.data?.papers ?? [], [mcqHistoryQuery.data]);
  const progressList = useMemo(() => progressQuery.data ?? [], [progressQuery.data]);
  const topicList = useMemo(() => mcqTopicsQuery.data?.topics ?? [], [mcqTopicsQuery.data]);

  // Overall essay average %
  const essayAvgPct = useMemo(() => {
    if (essayList.length === 0) return null;
    const percentages = essayList.map((e) => {
      const max = e.max_mark ?? 12;
      return max > 0 ? ((e.latest_mark ?? 0) / max) * 100 : 0;
    });
    return Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
  }, [essayList]);

  // Overall MCQ accuracy %
  const mcqOverallStats = useMemo(() => {
    if (mcqPapers.length === 0) return { accuracyPct: null, totalAttempted: 0, totalCorrect: 0 };
    let correct = 0;
    let total = 0;
    for (const p of mcqPapers) {
      if (p.aggregateScore !== null && p.aggregateTotal > 0) {
        correct += p.aggregateScore;
        total += p.aggregateTotal;
      }
    }
    return {
      accuracyPct: total > 0 ? Math.round((correct / total) * 100) : null,
      totalAttempted: total,
      totalCorrect: correct,
    };
  }, [mcqPapers]);

  // Filtered essays
  const filteredEssays = useMemo(() => {
    return essayList.filter((e) => {
      const matchesSearch = e.question.toLowerCase().includes(essaySearch.toLowerCase());
      if (!matchesSearch) return false;
      if (essayBandFilter === "all") return true;
      const mark = e.latest_mark ?? 0;
      const max = e.max_mark ?? 12;
      const pct = max > 0 ? (mark / max) * 100 : 0;
      if (essayBandFilter === "band1") return pct >= 75;
      if (essayBandFilter === "band2") return pct >= 50 && pct < 75;
      if (essayBandFilter === "band3") return pct < 50;
      return true;
    });
  }, [essayList, essaySearch, essayBandFilter]);

  // Filtered MCQ papers
  const filteredMcqPapers = useMemo(() => {
    return mcqPapers.filter((p) => {
      if (mcqEraFilter === "all") return true;
      return p.level === mcqEraFilter;
    });
  }, [mcqPapers, mcqEraFilter]);

  const isEligible = reviewQuery.data?.eligible === true;
  const reviewData = isEligible ? (reviewQuery.data as Extract<Awaited<ReturnType<typeof getReviewPanel>>, { eligible: true }>) : null;

  return (
    <>
      <PageHeader
        title="Review & Analytics"
        description="Your central revision hub: Cambridge grade projection, marked essay portfolio, past MCQ papers, and syllabus diagnostics in one place."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden sm:inline-flex print:hidden h-8 text-xs"
            >
              <Printer className="size-3.5 mr-1.5" />
              Print summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reviewQuery.refetch();
                essaysQuery.refetch();
                mcqHistoryQuery.refetch();
              }}
              disabled={reviewQuery.isFetching}
              className="print:hidden h-8 text-xs"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", reviewQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:px-8">
        {/* ── Top Executive KPI Overview (Minimalist) ── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* 1. Cambridge Grade */}
          <div className="rounded-xl border border-border/80 bg-card p-4 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Cambridge Grade</span>
              <Award className="size-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {reviewData?.gradeProjection?.projectedGrade ?? (essayList.length > 0 ? "Calibrating" : "—")}
              </span>
              {reviewData?.gradeProjection?.targetGrade ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Target: {reviewData.gradeProjection.targetGrade}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {reviewData?.gradeProjection?.confidence
                ? `${reviewData.gradeProjection.confidence.toUpperCase()} confidence`
                : "Based on official boundaries"}
            </p>
          </div>

          {/* 2. Essay Portfolio */}
          <div className="rounded-xl border border-border/80 bg-card p-4 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Essay Average</span>
              <PenLine className="size-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {essayAvgPct !== null ? `${essayAvgPct}%` : "—"}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {essayList.length} marked
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {essayList.length >= 3 ? "Multi-essay trend ready" : `${Math.max(0, 3 - essayList.length)} more for full trend`}
            </p>
          </div>

          {/* 3. MCQ Performance */}
          <div className="rounded-xl border border-border/80 bg-card p-4 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">MCQ Accuracy</span>
              <ListChecks className="size-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {mcqOverallStats.accuracyPct !== null ? `${mcqOverallStats.accuracyPct}%` : "—"}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {mcqPapers.length} papers
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {mcqOverallStats.totalAttempted > 0
                ? `${mcqOverallStats.totalCorrect}/${mcqOverallStats.totalAttempted} answered`
                : "No papers completed"}
            </p>
          </div>

          {/* 4. Domain Balance */}
          <div className="rounded-xl border border-border/80 bg-card p-4 transition-all">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Domain Balance</span>
              <Scale className="size-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground capitalize">
                {reviewData?.domainComparison?.strongerDomain === "balanced"
                  ? "Equal"
                  : (reviewData?.domainComparison?.strongerDomain ?? "—")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {reviewData?.domainComparison
                ? `${reviewData.domainComparison.microAvgPercent}% Micro · ${reviewData.domainComparison.macroAvgPercent}% Macro`
                : "Syllabus Micro vs Macro"}
            </p>
          </div>
        </section>

        {/* ── Main Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="synthesis" className="text-xs px-3.5 py-1.5 gap-1.5">
                <Sparkles className="size-3.5" />
                <span>AI Synthesis</span>
              </TabsTrigger>
              <TabsTrigger value="mcq" className="text-xs px-3.5 py-1.5 gap-1.5">
                <ListChecks className="size-3.5" />
                <span>MCQ Papers ({mcqPapers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="essays" className="text-xs px-3.5 py-1.5 gap-1.5">
                <PenLine className="size-3.5" />
                <span>Essay Portfolio ({essayList.length})</span>
              </TabsTrigger>
            </TabsList>

            <span className="hidden text-xs text-muted-foreground sm:inline-block">
              {activeTab === "synthesis" && "Holistic Cambridge examination pass"}
              {activeTab === "mcq" && "Real Cambridge past papers & topics"}
              {activeTab === "essays" && "Marked scripts & AO breakdown"}
            </span>
          </div>

          {/* ═════════ TAB 1: AI SYNTHESIS ═════════ */}
          <TabsContent value="synthesis" className="mt-6 space-y-6">
            {reviewQuery.isLoading ? (
              <LoadingState />
            ) : reviewQuery.isError ? (
              <ErrorState
                message={(reviewQuery.error as Error).message}
                onRetry={() => reviewQuery.refetch()}
              />
            ) : isEligible && reviewData ? (
              <ReviewResults data={reviewData} />
            ) : (
              <DiagnosticInProgressView
                essayCount={essayList.length}
                mcqPaperCount={mcqPapers.length}
                essayAvgPct={essayAvgPct}
                mcqAccuracyPct={mcqOverallStats.accuracyPct}
              />
            )}
          </TabsContent>

          {/* ═════════ TAB 2: MCQ PAPERS & PERFORMANCE ═════════ */}
          <TabsContent value="mcq" className="mt-6 space-y-6">
            {/* Action Bar & Level Filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                {(["all", "legacy", "2027"] as const).map((era) => (
                  <Button
                    key={era}
                    variant={mcqEraFilter === era ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMcqEraFilter(era)}
                    className="h-7 text-xs capitalize"
                  >
                    {era === "all" ? "All Papers" : era === "legacy" ? "Legacy (≤ 2026)" : "2027–2029"}
                  </Button>
                ))}
              </div>

              <Button asChild size="sm" className="h-8 text-xs gap-1.5">
                <Link to="/mcq-live">
                  <ListChecks className="size-3.5" /> Practice past paper
                </Link>
              </Button>
            </div>

            {/* MCQ Topic Weakness / Strength Matrix */}
            {topicList.length > 0 ? (
              <div className="rounded-xl border border-border/80 bg-card p-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Syllabus Topic Performance</h3>
                    <p className="text-xs text-muted-foreground">Accuracy computed across all your completed past-paper attempts</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {topicList.length} topics tested
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topicList.map((t) => {
                    const pct = t.accuracyPct ?? 0;
                    const tone =
                      pct >= 75
                        ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        : pct >= 50
                          ? "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5"
                          : "text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5";

                    return (
                      <div key={t.topic} className={cn("rounded-lg border p-3 flex flex-col justify-between", tone)}>
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">
                              {t.topic}
                            </span>
                            <span className="font-mono text-xs font-bold tabular-nums shrink-0">
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-current transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {t.correct} of {t.attempted} correct
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Completed Papers List */}
            {filteredMcqPapers.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card p-12 text-center">
                <ListChecks className="mx-auto size-8 text-muted-foreground/60" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">No MCQ papers completed yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Take a real Cambridge 0455 past paper under exam conditions. Your score, topic analytics, and flagged questions will be tracked right here.
                </p>
                <Button asChild size="sm" className="mt-4 text-xs">
                  <Link to="/mcq-live">Open MCQ Past Papers</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Completed Papers ({filteredMcqPapers.length})</span>
                  <span>Click to review or practice again</span>
                </div>

                <div className="grid gap-2.5">
                  {filteredMcqPapers.map((paper) => {
                    const score = paper.aggregateScore ?? 0;
                    const total = paper.aggregateTotal || 30;
                    const pct = Math.round((score / total) * 100);
                    const tierBadge =
                      pct >= 80
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                        : pct >= 60
                          ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";

                    return (
                      <div
                        key={paper.paperId ?? paper.aggregateAttemptId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-border hover:shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {paper.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {paper.level === "2027" ? "Paper 1 (2027–2029)" : "Paper 1 (Legacy)"}
                            </Badge>
                            {paper.attemptsCount > 1 ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {paper.attemptsCount} attempts
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {paper.latestAt ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {new Date(paper.latestAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            ) : null}
                            {paper.attemptsCount > 1 && paper.latestScore !== null ? (
                              <span>Latest retake: {paper.latestScore}/{paper.latestTotal}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-base font-bold text-foreground">
                              {score} <span className="text-xs text-muted-foreground">/ {total}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] font-mono", tierBadge)}>
                              {pct}%
                            </Badge>
                          </div>

                          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                            <Link to="/mcq-live" search={{ paperId: paper.paperId ?? undefined }}>
                              Retake <ArrowRight className="size-3 ml-0.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═════════ TAB 3: ESSAY PORTFOLIO & MARKING ═════════ */}
          <TabsContent value="essays" className="mt-6 space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search essays by question…"
                    value={essaySearch}
                    onChange={(e) => setEssaySearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(["all", "band1", "band2", "band3"] as const).map((b) => (
                    <Button
                      key={b}
                      variant={essayBandFilter === b ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEssayBandFilter(b)}
                      className="h-8 text-xs capitalize"
                    >
                      {b === "all" ? "All Bands" : b === "band1" ? "Band 1 (75%+)" : b === "band2" ? "Band 2 (50-74%)" : "Band 3 (<50%)"}
                    </Button>
                  ))}
                </div>
              </div>

              <Button asChild size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                <Link to="/grade">
                  <PenLine className="size-3.5" /> Mark new essay
                </Link>
              </Button>
            </div>

            {/* Essay Portfolio List */}
            {filteredEssays.length === 0 ? (
              <div className="rounded-xl border border-border/80 bg-card p-12 text-center">
                <PenLine className="mx-auto size-8 text-muted-foreground/60" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">No essays found</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {essayList.length === 0
                    ? "Submit your first response for rigorous Cambridge 0455 examiner marking, line-by-line annotations, and AO breakdown."
                    : "No essays match the current search or band filter."}
                </p>
                <Button asChild size="sm" className="mt-4 text-xs">
                  <Link to="/grade">Submit an essay</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Marked Essays ({filteredEssays.length})</span>
                  <span>Click to view full examiner feedback &amp; annotations</span>
                </div>

                <div className="grid gap-2.5">
                  {filteredEssays.map((essay) => {
                    const mark = essay.latest_mark ?? 0;
                    const max = essay.max_mark ?? 12;
                    const pct = max > 0 ? Math.round((mark / max) * 100) : 0;
                    const bandLabel =
                      pct >= 75 ? "Band 1" : pct >= 50 ? "Band 2" : "Band 3";
                    const bandColor =
                      pct >= 75
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                        : pct >= 50
                          ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";

                    return (
                      <Link
                        key={essay.id}
                        to="/essay/$essayId"
                        params={{ essayId: essay.id }}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {max} Marks
                            </Badge>
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {essay.question}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {new Date(essay.updated_at || essay.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono text-base font-bold text-foreground">
                              {mark} <span className="text-xs text-muted-foreground">/ {max}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] font-medium", bandColor)}>
                              {bandLabel} · {pct}%
                            </Badge>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/** Diagnostic overview when fewer than 3 essays or 1 MCQ paper have been submitted */
function DiagnosticInProgressView({
  essayCount,
  mcqPaperCount,
  essayAvgPct,
  mcqAccuracyPct,
}: {
  essayCount: number;
  mcqPaperCount: number;
  essayAvgPct: number | null;
  mcqAccuracyPct: number | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Diagnostic In Progress
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Building your holistic Cambridge benchmark
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm leading-relaxed">
            Marginalite combines your essay writing and MCQ papers together to identify recurring patterns,
            project your Cambridge grade, and chart high-gain mark improvements.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Essay Progress */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <PenLine className="size-3.5 text-primary" /> Graded Essays
              </span>
              <span className="font-mono">{essayCount} / {MIN_ESSAYS_FOR_REVIEW}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (essayCount / MIN_ESSAYS_FOR_REVIEW) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {essayCount >= MIN_ESSAYS_FOR_REVIEW
                ? "Requirement fulfilled"
                : `${MIN_ESSAYS_FOR_REVIEW - essayCount} more essay needed for aggregate patterns`}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full h-7 text-xs">
              <Link to="/grade">Mark an essay</Link>
            </Button>
          </div>

          {/* MCQ Progress */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-primary" /> Completed MCQ Papers
              </span>
              <span className="font-mono">{mcqPaperCount} / {MIN_MCQ_PAPERS_FOR_REVIEW}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (mcqPaperCount / MIN_MCQ_PAPERS_FOR_REVIEW) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {mcqPaperCount >= MIN_MCQ_PAPERS_FOR_REVIEW
                ? "Requirement fulfilled"
                : `${MIN_MCQ_PAPERS_FOR_REVIEW - mcqPaperCount} more past paper needed`}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full h-7 text-xs">
              <Link to="/mcq-live">Practice past MCQ</Link>
            </Button>
          </div>
        </div>

        {/* Current Preliminary Insights */}
        {(essayCount > 0 || mcqPaperCount > 0) && (
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs">
            <span className="font-semibold text-primary uppercase text-[10px] tracking-wider">
              Preliminary Observations
            </span>
            <p className="mt-1 leading-relaxed text-foreground/90">
              {essayAvgPct !== null
                ? `Your essay writing currently averages ${essayAvgPct}%. `
                : ""}
              {mcqAccuracyPct !== null
                ? `Your MCQ accuracy is at ${mcqAccuracyPct}%. `
                : ""}
              Complete the remaining items to generate the full Cambridge 0455 grade synthesis, syllabus pillars, and step-by-step action plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <Loader2 className="mx-auto size-6 animate-spin text-primary" />
      <p className="mt-3 text-sm font-medium text-foreground">
        Synthesizing across your recent essays, MCQ papers, and Cambridge 0455 boundaries…
      </p>
      <div className="mx-auto mt-3 w-full max-w-sm space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mx-auto size-6 text-destructive" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 text-xs">
        Try again
      </Button>
    </div>
  );
}

type Eligible = Extract<Awaited<ReturnType<typeof getReviewPanel>>, { eligible: true }>;

function ReviewResults({ data }: { data: Eligible }) {
  const trendIcon =
    data.gradeTrend === "improving"
      ? TrendingUp
      : data.gradeTrend === "declining"
        ? TrendingDown
        : Minus;
  const TrendIcon = trendIcon;
  const trendTone =
    data.gradeTrend === "improving"
      ? "text-emerald-600 dark:text-emerald-400"
      : data.gradeTrend === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  const { gradeProjection, masteryPillars, domainComparison } = data;

  const gradeColor =
    gradeProjection?.projectedGrade === "A*"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : gradeProjection?.projectedGrade === "A"
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
        : gradeProjection?.projectedGrade === "B"
          ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
          : "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-6">
      {/* ── 1. Cambridge Grade Projection Header ── */}
      {gradeProjection ? (
        <div className="rounded-xl border border-border/80 bg-card p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="size-4" />
                </span>
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Cambridge 0455 Benchmark
                </span>
                <Badge variant="outline" className="ml-1 text-[11px] capitalize">
                  {data.sampleLevel} review
                </Badge>
              </div>

              <div className="flex items-baseline gap-3">
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl border text-3xl font-extrabold tracking-tight shadow-xs",
                    gradeColor,
                  )}
                >
                  {gradeProjection.projectedGrade}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Projected Grade: {gradeProjection.projectedGrade}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Current average across scripts:{" "}
                    <span className="font-semibold text-foreground">
                      {gradeProjection.currentAveragePercent}%
                    </span>{" "}
                    · Target:{" "}
                    <span className="font-semibold text-foreground">
                      Grade {gradeProjection.targetGrade}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/60 p-4 sm:max-w-md w-full sm:w-auto shrink-0 space-y-2.5">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground block">Target Distance:</span>
                <p className="text-xs font-semibold text-primary leading-relaxed break-words">
                  {gradeProjection.marksToNextGrade}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                <span className="font-medium text-muted-foreground">Model Confidence:</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] capitalize",
                    gradeProjection.confidence === "high"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {gradeProjection.confidence}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Calibrated against official Cambridge 0455 grade boundaries.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 2. Overall Summary & Trend ── */}
      <div className="rounded-xl border border-border/80 bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.essayCount} essays evaluated</Badge>
          <Badge variant="secondary">{data.mcqPaperCount} MCQ papers evaluated</Badge>
          <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium", trendTone)}>
            <TrendIcon className="size-3.5" />
            {data.gradeTrend === "not enough data"
              ? "Trend emerging"
              : `Trajectory: ${data.gradeTrend}`}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{data.overallSummary}</p>
        {data.encouragement ? (
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs sm:text-sm text-foreground/90">
            {data.encouragement}
          </p>
        ) : null}
      </div>

      {/* ── 3. The 5 Pillars of Cambridge Economics Mastery ── */}
      {masteryPillars && masteryPillars.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-6">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="size-4 text-primary" /> 5 Pillars of Cambridge Economics
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Diagnostics across definitions, causal depth, evaluative weigh-ups, diagrams, and MCQ traps.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {masteryPillars.map((pillar) => {
              const statusBadge =
                pillar.status === "mastered"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                  : pillar.status === "developing"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400";

              const barColor =
                pillar.status === "mastered"
                  ? "bg-emerald-600"
                  : pillar.status === "developing"
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <div
                  key={pillar.pillar}
                  className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-4 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold leading-tight">{pillar.pillar}</h3>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] shrink-0 uppercase", statusBadge)}
                      >
                        {pillar.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Proficiency</span>
                      <span className="font-semibold tabular-nums">{pillar.score}%</span>
                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground border-t border-border/60 pt-2.5">
                    {pillar.guidance}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── 4. Assessment Objective (AO) Breakdown & Micro vs Macro Split ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card p-6">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="size-4 text-primary" /> Assessment Objective Profile
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Official Cambridge weights: AO1 Knowledge, AO2 Analysis, AO3 Evaluation.
          </p>
          <div className="mt-4 space-y-3">
            {data.aoAnalysis.map((ao) => (
              <div
                key={ao.ao}
                className="rounded-lg border border-border/70 bg-background/50 p-3.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{ao.ao}</span>
                  <span className="text-sm font-semibold tabular-nums">{ao.averagePercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${ao.averagePercent}%` }}
                  />
                </div>
                {ao.comment ? (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{ao.comment}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {domainComparison ? (
          <div className="rounded-xl border border-border/80 bg-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="size-4 text-primary" /> Micro vs Macro Balance
                </h2>
                <Badge variant="outline" className="text-[10px] capitalize font-medium">
                  {domainComparison.strongerDomain === "balanced"
                    ? "Equilibrium"
                    : `${domainComparison.strongerDomain} leading`}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Comparing aggregate mastery across syllabus Sections 1–3 (Micro) vs 4–6 (Macro).
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Microeconomics (Firms, Markets, Efficiency)
                    </span>
                    <span className="font-semibold tabular-nums">
                      {domainComparison.microAvgPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${domainComparison.microAvgPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Macroeconomics (Monetary, Fiscal, Trade, Growth)
                    </span>
                    <span className="font-semibold tabular-nums">
                      {domainComparison.macroAvgPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${domainComparison.macroAvgPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-background/50 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Examiner Guidance
              </span>
              <p className="mt-1 text-xs text-foreground/90 leading-relaxed">
                {domainComparison.recommendation}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 5. Strengths & Costing Marks ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" /> What's genuinely working
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyStrengths.map((item, index) => (
              <li key={index} className="rounded-lg border border-border/70 bg-background/50 p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
              </li>
            ))}
            {data.keyStrengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recurring strength flagged yet.</p>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> What's costing you marks
          </h2>
          <ul className="mt-4 space-y-3">
            {data.keyWeaknesses.map((item, index) => (
              <li key={index} className="rounded-lg border border-border/70 bg-background/50 p-3.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                {item.evidence ? (
                  <div className="mt-2 rounded bg-muted/60 px-2.5 py-1.5 text-xs text-foreground/80 italic border-l-2 border-amber-500">
                    “{item.evidence}”
                  </div>
                ) : null}
              </li>
            ))}
            {data.keyWeaknesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing recurring flagged.</p>
            ) : null}
          </ul>
        </div>
      </div>

      {/* ── 6. Prioritised Mark Gain Plan ── */}
      <div className="rounded-xl border border-border/80 bg-card p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="size-4 text-primary" /> Prioritised mark gain plan
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ranked high-yield actions with estimated mark gains on Cambridge Papers 1, 2, 3 &amp; 4.
        </p>

        <ol className="mt-4 space-y-3">
          {data.actionPlan.map((item, index) => {
            const tool = TOOL_LABEL[item.tool];
            return (
              <li
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 p-4 transition-colors"
              >
                <div className="flex gap-3 min-w-0 flex-1">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {item.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.action}</p>
                      {item.estimatedMarkGain ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium"
                        >
                          Gain: {item.estimatedMarkGain}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.why}</p>
                  </div>
                </div>

                {tool ? (
                  <Button asChild size="sm" variant="outline" className="shrink-0 text-xs h-8">
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
    </div>
  );
}
