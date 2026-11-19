import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  Layers,
  LineChart,
  ListChecks,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CAMBRIDGE_PAPER_MATRIX_DATA,
  type PastPaperQuestion,
  type SyllabusTopicAnalytics,
} from "@/lib/paper-matrix/data";
import {
  getPaperMatrixArchive,
  type MatrixArchiveEssay,
  type MatrixArchivePaper,
} from "@/lib/paper-matrix/matrix.functions";
import {
  FALLBACK_0455_MCQ_PAPERS,
  FALLBACK_0455_ESSAY_QUESTIONS,
} from "@/lib/paper-matrix/fallback-archive";
import { getMe } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/paper-matrix")({
  head: () => ({
    meta: [
      { title: "15-Year Past Paper Cycle Matrix & Topic Predictor — Cambridge 0455" },
      {
        name: "description",
        content:
          "Statistical cycle intelligence analyzing 15 years of Cambridge IGCSE 0455 Economics papers. Identify overdue topics, exam probability indices, and past question stems with zero AI cost.",
      },
    ],
  }),
  component: PaperMatrixPage,
});

function PaperMatrixPage() {
  const navigate = useNavigate();
  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  const isAdmin = meQuery.data?.isAdmin ?? false;

  const [mainTab, setMainTab] = useState<"matrix" | "archive">("matrix");

  // Cycle Matrix state
  const [sectionFilter, setSectionFilter] = useState<"all" | "Microeconomics" | "Macroeconomics">("all");
  const [targetSeries, setTargetSeries] = useState<string>("mj-2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<SyllabusTopicAnalytics | null>(null);

  // Archive query & filter state
  const fetchArchive = useServerFn(getPaperMatrixArchive);
  const archiveQuery = useQuery({
    queryKey: ["paper-matrix-archive"],
    queryFn: () => fetchArchive(),
  });

  const [archiveFilter, setArchiveFilter] = useState<"all" | "mcq" | "essay">("all");
  const [archiveYear, setArchiveYear] = useState<string>("all");
  const [archiveEra, setArchiveEra] = useState<"all" | "legacy" | "2027">("all");
  const [archiveSearch, setArchiveSearch] = useState<string>("");
  const [visibleEssayLimit, setVisibleEssayLimit] = useState(30);

  const mcqPapers = (archiveQuery.data?.mcqPapers && archiveQuery.data.mcqPapers.length > 0)
    ? archiveQuery.data.mcqPapers
    : FALLBACK_0455_MCQ_PAPERS;
  const essayQuestions = (archiveQuery.data?.essayQuestions && archiveQuery.data.essayQuestions.length > 0)
    ? archiveQuery.data.essayQuestions
    : FALLBACK_0455_ESSAY_QUESTIONS;
  const archiveYears = archiveQuery.data?.years ?? [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

  const filteredMcq = useMemo(() => {
    return mcqPapers.filter((p) => {
      if (archiveEra !== "all" && p.era !== archiveEra) return false;
      if (archiveYear !== "all" && String(p.examYear) !== archiveYear) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.examSeries.toLowerCase().includes(q) ||
          String(p.examYear).includes(q)
        );
      }
      return true;
    });
  }, [mcqPapers, archiveEra, archiveYear, archiveSearch]);

  const filteredEssays = useMemo(() => {
    return essayQuestions.filter((e) => {
      if (archiveEra !== "all" && e.era !== archiveEra) return false;
      if (archiveYear !== "all") {
        const match = e.examSeries?.match(/\b(20\d{2})\b/);
        if (!match || match[1] !== archiveYear) return false;
      }
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        return (
          e.questionText.toLowerCase().includes(q) ||
          e.topic.toLowerCase().includes(q) ||
          (e.examSeries && e.examSeries.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [essayQuestions, archiveEra, archiveYear, archiveSearch]);

  // Filtered and sorted topics
  const topics = useMemo(() => {
    return CAMBRIDGE_PAPER_MATRIX_DATA.filter((item) => {
      if (sectionFilter !== "all" && item.section !== sectionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.forecastRationale.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.examProbabilityIndex - a.examProbabilityIndex);
  }, [sectionFilter, searchQuery]);

  // Top overdue topics for the alert banner
  const topOverdue = useMemo(() => {
    return CAMBRIDGE_PAPER_MATRIX_DATA.filter((t) => t.cycleStatus === "overdue")
      .sort((a, b) => b.examProbabilityIndex - a.examProbabilityIndex)
      .slice(0, 3);
  }, []);

  const handlePracticeQuestion = (question: PastPaperQuestion) => {
    navigate({
      to: "/grade",
      search: {
        q: question.stem,
        marks: question.marks as any,
      },
    });
  };

  const handleGradeQuestion = (question: PastPaperQuestion) => {
    navigate({
      to: "/grade",
      search: {
        q: question.stem,
        marks: question.marks as any,
      },
    });
  };

  const handlePracticeEssayText = (text: string, marks: number) => {
    navigate({
      to: "/grade",
      search: {
        q: text,
        marks: marks as any,
      },
    });
  };

  const handleGradeEssayText = (text: string, marks: number) => {
    navigate({
      to: "/grade",
      search: {
        q: text,
        marks: marks as any,
      },
    });
  };

  // Experimental Labs are strictly confidential to platform administrators
  if (!meQuery.isLoading && !isAdmin) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  return (
    <>
      <PageHeader
        title="15-Year Past Paper Cycle Matrix & Topic Predictor"
        description="Statistical intelligence engine analyzing Cambridge 0455 past papers (2010–2025). Discovers overdue exam topics, rotation probability indices, and real question stems without AI token cost."
        action={
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Historical Statistical Engine · 0 AI Tokens
          </Badge>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* PRIMARY ARCHIVE & PREDICTOR TAB SWITCHER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMainTab("matrix")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mainTab === "matrix"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="size-3.5 text-amber-500" />
              <span>Topic Cycle Predictor</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                15-Yr Model
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => setMainTab("archive")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mainTab === "archive"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5 text-primary" />
              <span>All Past Papers Archive</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary">
                {archiveQuery.data ? `${archiveQuery.data.totalMcq} Papers · ${archiveQuery.data.totalEssays} Essays` : "2016–2025"}
              </Badge>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Harvested 2016–2026 · Cambridge 0455 Knowledge Synced</span>
          </div>
        </div>

        {mainTab === "matrix" ? (
          <div className="space-y-6">
            {/* TOP INTELLIGENCE BANNER: TOP OVERDUE PICKS */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Flame className="size-4" />
                  </span>
                  <h2 className="text-sm font-bold text-foreground">
                    Top Cyclically Overdue Topics for {targetSeries === "mj-2026" ? "May/June 2026" : "Oct/Nov 2026"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Targeting Exam Series:</span>
                  <Select value={targetSeries} onValueChange={setTargetSeries}>
                    <SelectTrigger className="w-40 h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mj-2026">May/June 2026 Series</SelectItem>
                      <SelectItem value="on-2026">Oct/Nov 2026 Series</SelectItem>
                      <SelectItem value="fm-2027">Feb/March 2027 Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Cambridge 0455 questions do not appear at random. Over 10 years of exam records show strong rotational cycles. The topics below have not appeared in recent series and carry high probability for upcoming 2, 4, 6, and 8-mark questions:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {topOverdue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTopic(item)}
                    className="group p-3 rounded-lg border border-border/80 bg-background/90 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-primary">Topic {item.code}</span>
                        <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                          {item.examProbabilityIndex}% Probability
                        </Badge>
                      </div>
                      <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {item.forecastRationale}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Last: {item.lastTestedSeries}</span>
                      <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center">
                        View Past Papers <ChevronRight className="size-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTROLS & FILTER BAR */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={sectionFilter} onValueChange={(v) => setSectionFilter(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">All Topics</TabsTrigger>
                    <TabsTrigger value="Microeconomics" className="text-xs">Microeconomics (Units 1-3)</TabsTrigger>
                    <TabsTrigger value="Macroeconomics" className="text-xs">Macroeconomics (Units 4-6)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search topic or concept…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {/* TOPIC MATRIX TABLE */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground text-[11px]">
                      <th className="py-3 px-4">Syllabus Topic</th>
                      <th className="py-3 px-3">Section</th>
                      <th className="py-3 px-3">Unit</th>
                      <th className="py-3 px-3 text-center">15-Yr Frequency</th>
                      <th className="py-3 px-3">Last Tested</th>
                      <th className="py-3 px-3 text-center">Series Elapsed</th>
                      <th className="py-3 px-4 text-right">Exam Probability</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {topics.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedTopic(item)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-primary font-bold text-xs shrink-0">
                              {item.code}
                            </span>
                            <span className="font-semibold group-hover:text-primary transition-colors">
                              {item.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {item.section}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            Unit {item.unit}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium">
                          {item.historicalAppearances} exams
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {item.lastTestedSeries}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.seriesElapsed >= 4
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                                : item.seriesElapsed >= 2
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.seriesElapsed} series ago
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                            {item.examProbabilityIndex >= 80 ? (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <Flame className="size-3.5 fill-rose-500/20" /> {item.examProbabilityIndex}%
                              </span>
                            ) : item.examProbabilityIndex >= 60 ? (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Zap className="size-3.5 fill-amber-500/20" /> {item.examProbabilityIndex}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {item.examProbabilityIndex}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5">
                            Deep Dive <ChevronRight className="size-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CALLOUT TO ARCHIVE */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="size-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Looking for Full Official Question Papers & Real Past Essays?
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Browse all 68 Cambridge MCQ Papers (2016–2025) and 374 approved essay prompts in the complete Past Papers Archive.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setMainTab("archive")}
                className="h-8 text-xs font-semibold shrink-0"
              >
                Browse All Past Papers Archive <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>

            {/* METHODOLOGY NOTE */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs space-y-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Cambridge 0455 Rotational Cycle Methodology
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The Exam Probability Index (EPI) is derived from historical Poisson distribution modeling across past Cambridge examination series. Topics that appear cyclically every 3–4 series but have been absent for 4+ series are marked as <strong>Overdue (80%+)</strong>. Use this intelligence to prioritize high-yield response practice during peak exam revision months.
              </p>
            </div>
          </div>
        ) : (
          /* ALL PAST PAPERS ARCHIVE TAB */
          <div className="space-y-6">
            {/* STATS STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">MCQ Papers</span>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black font-mono text-foreground">
                  {archiveQuery.data ? archiveQuery.data.totalMcq : 68}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  100% Verified Answer Keys
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">Approved Responses</span>
                  <PenLine className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black font-mono text-foreground">
                  {archiveQuery.data ? archiveQuery.data.totalEssays : 374}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  2m, 4m, 6m & 8m Exam Prompts
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">Exam Series Covered</span>
                  <Calendar className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono text-foreground">
                  2016–2025
                </div>
                <p className="text-[10px] text-muted-foreground">
                  10 Years · May/June, Oct/Nov & F/M
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">Knowledge Base Sync</span>
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black font-mono text-foreground">
                  3,115
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Vector Chunks (249 Documents) Ready
                </p>
              </div>
            </div>

            {/* ARCHIVE CONTROLS & FILTERS */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as "all" | "mcq" | "essay")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">
                      All ({filteredMcq.length + filteredEssays.length})
                    </TabsTrigger>
                    <TabsTrigger value="mcq" className="text-xs">
                      MCQ Papers ({filteredMcq.length})
                    </TabsTrigger>
                    <TabsTrigger value="essay" className="text-xs">
                      Essay Questions ({filteredEssays.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Select value={archiveEra} onValueChange={(v) => setArchiveEra(v as any)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="All Eras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Eras</SelectItem>
                    <SelectItem value="legacy">Legacy Era (≤ 2026)</SelectItem>
                    <SelectItem value="2027">New Era (2027–2029)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={archiveYear} onValueChange={setArchiveYear}>
                  <SelectTrigger className="w-32 h-8 text-xs font-mono">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years (2016–2025)</SelectItem>
                    {archiveYears.map((yr) => (
                      <SelectItem key={yr} value={String(yr)} className="font-mono">
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search papers, topics, questions…"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {/* ARCHIVE CONTENT */}
            {archiveQuery.isLoading && mcqPapers.length === 0 ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : archiveQuery.isError && mcqPapers.length === 0 && essayQuestions.length === 0 ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
                <AlertTriangle className="size-8 text-destructive mx-auto" />
                <h3 className="text-sm font-bold text-foreground">Failed to Load Past Papers Archive</h3>
                <p className="text-xs text-muted-foreground">
                  Could not retrieve past paper records from the database.
                </p>
                <Button size="sm" variant="outline" onClick={() => archiveQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. MCQ PAPERS SECTION */}
                {(archiveFilter === "all" || archiveFilter === "mcq") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">
                          Official Cambridge MCQ Papers ({filteredMcq.length})
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Includes Question Paper PDF, Mark Scheme & Simulator
                      </span>
                    </div>

                    {filteredMcq.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                        No MCQ papers found matching the selected filters.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredMcq.map((paper) => (
                          <div
                            key={paper.id}
                            className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                  {paper.era === "2027" ? "2027–2029" : "Legacy"}
                                </Badge>
                                <span className="text-xs font-mono font-semibold text-muted-foreground">
                                  {paper.examYear} · {paper.examSeries}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-foreground font-mono truncate">
                                {paper.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                                <span>{paper.questionCount} Questions · 100% Verified Keys</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
                              <Link
                                to="/mcq-live"
                                search={{ paperId: paper.id }}
                                className="flex-1"
                              >
                                <Button size="sm" className="w-full h-7 text-xs font-semibold">
                                  Practice Simulator <ArrowRight className="size-3 ml-1" />
                                </Button>
                              </Link>
                              {paper.qpUrl && (
                                <a
                                  href={paper.qpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Official Question Paper PDF"
                                >
                                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                                    <FileText className="size-3" />
                                  </Button>
                                </a>
                              )}
                              {paper.msUrl && (
                                <a
                                  href={paper.msUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Official Mark Scheme PDF"
                                >
                                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ESSAY QUESTIONS SECTION */}
                {(archiveFilter === "all" || archiveFilter === "essay") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PenLine className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">
                          Approved Cambridge Past Essay Questions ({filteredEssays.length})
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Real 2m, 4m, 6m & 8m questions with examiner grading
                      </span>
                    </div>

                    {filteredEssays.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                        No essay questions found matching the selected filters.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredEssays.slice(0, visibleEssayLimit).map((essay) => (
                            <div
                              key={essay.id}
                              className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                      {essay.era === "2027" ? "2027–2029" : "Legacy"}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                      {essay.maxMark} Marks
                                    </Badge>
                                  </div>
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    {essay.examSeries || essay.topic}
                                  </span>
                                </div>

                                <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-3">
                                  "{essay.questionText}"
                                </p>

                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Topic: {essay.topic}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGradeEssayText(essay.questionText, essay.maxMark)}
                                  className="h-7 text-xs"
                                >
                                  <ExternalLink className="size-3 mr-1" /> Grade Essay
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handlePracticeEssayText(essay.questionText, essay.maxMark)}
                                  className="h-7 text-xs font-semibold"
                                >
                                  <PenLine className="size-3 mr-1" /> Practice Question
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {filteredEssays.length > visibleEssayLimit && (
                          <div className="pt-2 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVisibleEssayLimit((prev) => prev + 30)}
                              className="text-xs font-semibold"
                            >
                              Load 30 More Essays (Showing {visibleEssayLimit} of {filteredEssays.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOPIC DETAIL & PAST QUESTION EXPLORER DIALOG */}
      <Dialog open={selectedTopic !== null} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTopic && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Topic {selectedTopic.code} · Unit {selectedTopic.unit} ({selectedTopic.section})
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={
                      selectedTopic.examProbabilityIndex >= 80
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }
                  >
                    {selectedTopic.examProbabilityIndex}% Probability for Upcoming Series
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedTopic.title}
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                  {selectedTopic.forecastRationale}
                </DialogDescription>
              </DialogHeader>

              {/* STATS STRIP */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-muted/30 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">15-Year Tested Frequency</span>
                  <span className="font-bold font-mono text-foreground">{selectedTopic.historicalAppearances} past papers</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Last Series Tested</span>
                  <span className="font-bold text-foreground">{selectedTopic.lastTestedSeries}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Series Since Last Test</span>
                  <span className="font-bold font-mono text-primary">{selectedTopic.seriesElapsed} exam cycles</span>
                </div>
              </div>

              {/* REAL PAST PAPER QUESTIONS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Real Past Cambridge Exam Questions ({selectedTopic.questions.length})
                </h4>

                <div className="space-y-3">
                  {selectedTopic.questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-lg border border-border bg-card space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{q.paperCode}</span>
                          <span className="font-semibold text-muted-foreground">{q.questionNumber}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {q.marks} Marks
                        </Badge>
                      </div>

                      <p className="text-xs font-medium text-foreground leading-relaxed">
                        "{q.stem}"
                      </p>

                      <div className="rounded-md bg-muted/40 p-2.5 space-y-1.5 text-[11px]">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Sparkles className="size-3 text-amber-500" /> Examiner Key Tip:
                        </span>
                        <p className="text-muted-foreground leading-normal">{q.examinerTip}</p>
                      </div>

                      {/* MARK SCHEME KEY BULLETS */}
                      <div className="space-y-1 text-[11px]">
                        <span className="font-semibold text-muted-foreground">Mark Scheme Focus Points:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                          {q.markSchemePoints.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(null);
                            handleGradeQuestion(q);
                          }}
                          className="text-xs"
                        >
                          <ExternalLink className="size-3 mr-1" /> Grade Essay
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(null);
                            handlePracticeQuestion(q);
                          }}
                          className="text-xs font-semibold"
                        >
                          <PenLine className="size-3 mr-1" /> Practice Question
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
