import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CircleDot,
  Dumbbell,
  Flame,
  GraduationCap,
  LibraryBig,
  ListChecks,
  BookText,
  MessageSquare,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyEssays, getProgress } from "@/lib/grading.functions";
import { getMe } from "@/lib/account.functions";
import { listDocuments } from "@/lib/knowledge.functions";
import { listClassrooms } from "@/lib/classroom.functions";
import { listAnchors } from "@/lib/calibration.functions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Marginalite Economics" },
      {
        name: "description",
        content:
          "Track your Cambridge IGCSE Economics (0455) essay marks, AO breakdown, and interactive performance trajectory in one place.",
      },
      { property: "og:title", content: "Dashboard — Marginalite Economics" },
      {
        property: "og:description",
        content: "Your marks, assessment-objective trends, and graded essay history.",
      },
    ],
  }),
  component: DashboardPage,
});

const CAMBRIDGE_TIPS = [
  {
    title: "Continuous Evaluation",
    tip: "Evaluate as you go! The strongest essays evaluate each analytical point immediately (e.g. elasticity, timeframe, assumptions) rather than leaving all AO3 judgements for a rushed conclusion.",
    ao: "AO3",
  },
  {
    title: "Explicit Chains of Reasoning",
    tip: "Do not jump straight from policy to outcome. Cambridge examiners award AO2 marks strictly for explicit step-by-step links: state the cause → explain transmission → analyse effect → apply to context.",
    ao: "AO2",
  },
  {
    title: "Accurate Terminology Over Common Speech",
    tip: "Say 'quantitative easing' instead of 'printing money', and distinguish clearly between a 'shift in demand' and a 'movement along the demand curve'. Terminology anchors your AO1 marks.",
    ao: "AO1",
  },
  {
    title: "Contextual Justification",
    tip: "Conclusions that repeat introduction definitions score at Level 1 for AO3. To reach Band 1, state which effect dominates and explain why in this specific country or market context.",
    ao: "AO3",
  },
  {
    title: "Labelled Diagrams With Shifts",
    tip: "A diagram earns credit only when actively integrated into the written analysis: reference new equilibria (P1 to P2, Q1 to Q2) and explain the directional mechanism in words.",
    ao: "AO2",
  },
];

export function DashboardPage() {
  const fetchProgress = useServerFn(getProgress);
  const fetchEssays = useServerFn(listMyEssays);
  const fetchMe = useServerFn(getMe);
  const fetchDocs = useServerFn(listDocuments);
  const fetchClassrooms = useServerFn(listClassrooms);
  const fetchAnchors = useServerFn(listAnchors);

  const progress = useQuery({ queryKey: ["progress"], queryFn: () => fetchProgress() });
  const essays = useQuery({ queryKey: ["essays"], queryFn: () => fetchEssays() });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocs(),
    enabled: me.data?.isStaff === true,
  });

  const [clientSessionUser, setClientSessionUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setClientSessionUser(data.user);
    });
  }, []);

  const routeContext = Route.useRouteContext();
  const sessionUser = (routeContext as any)?.user || clientSessionUser;

  const isTeacherUser =
    me.data?.role === "teacher" ||
    (sessionUser?.user_metadata as any)?.role === "teacher" ||
    (sessionUser?.app_metadata as any)?.role === "teacher";
  const userDisplayName =
    me.data?.fullName ||
    (sessionUser?.user_metadata as any)?.full_name ||
    (sessionUser?.email ? sessionUser.email.split("@")[0] : "Economist");

  const classrooms = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => fetchClassrooms(),
    enabled: Boolean(isTeacherUser || me.data?.isStaff),
  });

  const anchors = useQuery({
    queryKey: ["anchors"],
    queryFn: () => fetchAnchors(),
    enabled: Boolean(isTeacherUser || me.data?.isStaff),
  });

  const [activeTariff, setActiveTariff] = useState<number | "all">("all");
  const [essaySearch, setEssaySearch] = useState("");
  const [bandFilter, setBandFilter] = useState<"all" | "band1" | "band2" | "band3">("all");
  const [showAllEssays, setShowAllEssays] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    mark: number;
    date: string;
    question: string;
  } | null>(null);

  const versions = useMemo(() => progress.data ?? [], [progress.data]);
  const marks = useMemo(() => versions.map((v) => v.total_mark ?? 0), [versions]);
  const average = useMemo(
    () => (marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0),
    [marks],
  );
  const best = useMemo(() => (marks.length ? Math.max(...marks) : 0), [marks]);
  const readyDocs = (docs.data ?? []).filter((document) => document.status === "ready").length;

  const recent = marks.slice(-5);
  const earlier = marks.slice(0, -5);
  const delta =
    recent.length && earlier.length
      ? recent.reduce((a, b) => a + b, 0) / recent.length -
        earlier.reduce((a, b) => a + b, 0) / earlier.length
      : 0;

  // Filtered versions by tariff
  const filteredVersions = useMemo(() => {
    if (activeTariff === "all") return versions;
    // Map max_mark from matching essay if available
    const essayMap = new Map((essays.data ?? []).map((e) => [e.id, e.max_mark]));
    return versions.filter((v) => {
      // Best guess based on marks or essay reference
      if (activeTariff === 12) return (v.total_mark ?? 0) <= 12;
      if (activeTariff === 8) return (v.total_mark ?? 0) <= 8;
      if (activeTariff === 20) return (v.total_mark ?? 0) > 12;
      return true;
    });
  }, [versions, essays.data, activeTariff]);

  const aoAverage = (key: "ao1_awarded" | "ao2_awarded" | "ao3_awarded") => {
    const list = filteredVersions.length ? filteredVersions : versions;
    const values = list.map((v) => v[key] ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  // Study Progress & Consistency Index (0 - 100%)
  // Transparent calculation: average mark weight (60%) + practice volume (30%) + positive improvement trend (10%)
  const progressIndex = useMemo(() => {
    if (versions.length === 0) return 0;
    const avgPercent = Math.min(100, (average / 12) * 100);
    const volumeScore = Math.min(30, versions.length * 6); // capped at 30% for 5+ essays
    const consistencyScore = delta >= 0 ? 10 : 0;
    return Math.min(100, Math.round(avgPercent * 0.6 + volumeScore + consistencyScore));
  }, [average, versions.length, delta]);

  const progressBadge = useMemo(() => {
    if (progressIndex >= 80)
      return {
        label: "Band 1 Target Track",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      };
    if (progressIndex >= 60)
      return {
        label: "Band 2 Target Track",
        color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      };
    if (progressIndex >= 40)
      return {
        label: "Developing Consistency",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      };
    return { label: "Initial Calibration", color: "text-muted-foreground bg-muted border-border" };
  }, [progressIndex]);

  // Filtered essays
  const filteredEssays = useMemo(() => {
    const list = essays.data ?? [];
    return list.filter((essay) => {
      const matchesSearch = essay.question.toLowerCase().includes(essaySearch.toLowerCase());
      if (!matchesSearch) return false;
      if (bandFilter === "all") return true;
      const mark = essay.latest_mark ?? 0;
      const max = essay.max_mark ?? 12;
      const pct = max > 0 ? (mark / max) * 100 : 0;
      if (bandFilter === "band1") return pct >= 75;
      if (bandFilter === "band2") return pct >= 50 && pct < 75;
      if (bandFilter === "band3") return pct < 50;
      return true;
    });
  }, [essays.data, essaySearch, bandFilter]);

  const visibleEssays = useMemo(() => {
    if (showAllEssays || essaySearch.trim().length > 0 || bandFilter !== "all") {
      return filteredEssays;
    }
    return filteredEssays.slice(0, 4);
  }, [filteredEssays, showAllEssays, essaySearch, bandFilter]);

  // Greeting by hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const currentTip = CAMBRIDGE_TIPS[tipIndex % CAMBRIDGE_TIPS.length];

  if (isTeacherUser && !me.data?.isAdmin) {
    return (
      <EducatorDashboardView
        userName={userDisplayName}
        school={me.data?.school ?? (sessionUser?.user_metadata as any)?.school ?? null}
        classrooms={classrooms.data?.classes ?? (Array.isArray(classrooms.data) ? classrooms.data : [])}
        docs={docs.data ?? []}
        anchors={anchors.data ?? []}
        essays={essays.data ?? []}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Cambridge IGCSE Economics (0455) performance analytics, AO mastery breakdown, and live study progress."
        action={
          me.data?.role === "teacher" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/review">
                  <ClipboardCheck className="size-3.5 text-primary" /> Review &amp; Diagnostics
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/classes">
                  <UsersRound className="size-3.5" /> Manage Classes
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/mcq-live">
                  <ListChecks className="size-3.5 text-primary" /> MCQ Past Papers
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/grade">
                  <PenLine className="size-3.5" /> Mark an essay
                </Link>
              </Button>
            </div>
          )
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6 md:px-8">
        {/* Compact Candidate Status Strip */}
        <section className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {greeting}, {userDisplayName.split(" ")[0]}!
              </h2>
              {isTeacherUser ? (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold">
                  Authorized Educator
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold"
                >
                  0455 RAG Grounded
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {versions.length > 0
                ? `${versions.length} essay attempt${versions.length === 1 ? "" : "s"} evaluated against Cambridge mark schemes.`
                : "Welcome to Marginalite. Submit your first essay to calibrate your baseline."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <Badge
              variant="outline"
              className={cn("px-2.5 py-1 text-xs font-semibold", progressBadge.color)}
            >
              {progressBadge.label}
            </Badge>
            <div className="flex items-center gap-2 border-l border-border/80 pl-3">
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {progressIndex}%
                </span>
                <p className="text-[9px] uppercase font-bold text-muted-foreground">
                  Readiness
                </p>
              </div>
              <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progressIndex))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Educator Workspace Quick Banner */}
        {isTeacherUser && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4 text-xs shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Cambridge IGCSE 0455 Educator Workspace</h3>
                  <p className="text-muted-foreground mt-0.5">
                    Organize Cambridge cohorts, assign essays, ingest mark schemes, and run examiner moderation.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-primary/30 hover:bg-primary/10">
                  <Link to="/classes">
                    <UsersRound className="size-3.5 mr-1 text-primary" /> My Classes
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-primary/30 hover:bg-primary/10">
                  <Link to="/grade">
                    <PenLine className="size-3.5 mr-1 text-primary" /> Essay Grader
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-primary/30 hover:bg-primary/10">
                  <Link to="/knowledge">
                    <BookOpen className="size-3.5 mr-1 text-primary" /> Knowledge Base
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 4 Clean Stat Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InteractiveStat
            label="Essays marked"
            value={String(versions.length)}
            badge={`${essays.data?.length ?? 0} threads`}
            hint="Total Cambridge submissions"
            loading={progress.isLoading}
            icon={PenLine}
          />
          <InteractiveStat
            label="Average mark"
            value={versions.length ? `${average.toFixed(1)}/8` : "—"}
            badge={delta !== 0 ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} trend` : "Baseline"}
            hint={
              versions.length
                ? `${Math.round((average / 8) * 100)}% Cambridge benchmark`
                : "Submit to calculate"
            }
            loading={progress.isLoading}
            icon={TrendingUp}
          />
          <InteractiveStat
            label="Personal best"
            value={versions.length ? `${best}/8` : "—"}
            badge="Top attempt"
            hint="Highest single awarded mark"
            loading={progress.isLoading}
            icon={Trophy}
          />
          <InteractiveStat
            label="Knowledge base"
            value={me.data?.isStaff ? String(readyDocs) : "58"}
            badge="RRF Grounded"
            hint="Syllabus & mark schemes active"
            loading={me.isLoading || (me.data?.isStaff === true && docs.isLoading)}
            icon={BookOpen}
          />
        </div>

        {/* Sleek Cambridge Examiner Tip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-2.5 sm:px-4 text-xs leading-relaxed">
          <div className="flex flex-wrap items-baseline gap-1.5 min-w-0 flex-1">
            <span className="font-bold text-primary inline-flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="size-3.5 shrink-0" /> Cambridge 0455 Tip:
            </span>
            <span className="font-semibold text-foreground shrink-0">{currentTip.title} —</span>
            <span className="text-muted-foreground text-pretty">{currentTip.tip}</span>
          </div>
          <button
            type="button"
            onClick={() => setTipIndex((prev) => prev + 1)}
            className="self-end sm:self-center shrink-0 text-muted-foreground hover:text-foreground text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3" /> Next
          </button>
        </div>

        {/* Assessment Objective Mastery Console */}
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 md:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-border/80 pb-3 sm:pb-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Award className="size-4 text-primary" /> Cambridge Assessment Objective (AO)
                Mastery
              </h2>
              <p className="text-xs text-muted-foreground">
                Authoritative criteria for Cambridge 0455 evaluative and structured questions (AO1 Knowledge : AO2 Analysis : AO3 Evaluation).
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTariff("all")}
                className={cn(
                  "rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                  activeTariff === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All tariffs
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(8)}
                className={cn(
                  "rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                  activeTariff === 8
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                8-mark discuss
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(6)}
                className={cn(
                  "rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                  activeTariff === 6
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                6-mark analyse
              </button>
              <button
                type="button"
                onClick={() => setActiveTariff(20)}
                className={cn(
                  "rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors whitespace-nowrap",
                  activeTariff === 20
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                20-mark structured
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <AoCard
              label="AO1 Knowledge"
              subtitle="Definitions, concepts & theory"
              score={aoAverage("ao1_awarded")}
              maxScore={2}
              tone="bg-ao1"
              badgeClass="bg-ao1/10 text-ao1 border-ao1/30"
              insight="Accurate definitions and diagrams set the baseline for high marks."
              targetRatio={0.85}
              aoKey="ao1"
            />
            <AoCard
              label="AO2 Analysis"
              subtitle="Explicit chains of economic reasoning"
              score={aoAverage("ao2_awarded")}
              maxScore={6}
              tone="bg-ao2"
              badgeClass="bg-ao2/10 text-ao2 border-ao2/30"
              insight="Largest mark share. Build step-by-step causal mechanisms without skipping steps."
              targetRatio={0.75}
              aoKey="ao2"
            />
            <AoCard
              label="AO3 Evaluation"
              subtitle="Weighing up, conditions & justified judgement"
              score={aoAverage("ao3_awarded")}
              maxScore={4}
              tone="bg-ao3"
              badgeClass="bg-ao3/10 text-ao3 border-ao3/30"
              insight="Decisive differentiator for Band 1. Must be justified with magnitude or elasticity."
              targetRatio={0.65}
              aoKey="ao3"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs">
            <span className="text-muted-foreground">
              💡 <strong className="text-foreground">Examiner insight:</strong> Evaluation (AO3) is
              where over 70% of Cambridge students lose top-band marks. Strengthen judgements with
              context.
            </span>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to="/practice">
                <Dumbbell className="size-3" /> Train AO Skills
              </Link>
            </Button>
          </div>
        </div>

        {/* Interactive Performance Trajectory Graph */}
        <section className="panel p-3.5 sm:p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 sm:pb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Essay Mark Trajectory
              </h2>
              <p className="text-xs text-muted-foreground">
                Chronological marking progression across all submissions with Cambridge Grade Band
                thresholds.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Band 1 (Top)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" /> Band 2 (Mid)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Band 3 (Lower)
              </span>
            </div>
          </div>

          <div className="mt-5">
            {marks.length >= 2 ? (
              <div className="relative">
                <PerformanceChart
                  versions={versions}
                  hoveredPoint={hoveredPoint}
                  onHoverPoint={setHoveredPoint}
                />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 py-10 px-6 text-center">
                <Sparkles className="mx-auto size-8 text-primary/60 mb-3" />
                <h3 className="text-sm font-semibold">Ready to plot your trajectory</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Submit 2 or more essays to unlock interactive performance charts and historical
                  grade band tracking.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/grade">Submit an essay to begin</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Quick-Launch Command Center */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="size-4 text-primary" /> Cambridge Practice Suites
            </h2>
            <span className="text-xs text-muted-foreground">Select a tool to start studying</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              to="/grade"
              icon={PenLine}
              title="Grade Essay"
              badge="Cambridge 0455"
              description="Authoritative Cambridge marking with AO breakdown, model corrections, and Principal Examiner review."
            />
            <QuickActionCard
              to="/mcq-live"
              icon={ListChecks}
              title="MCQ Past Papers"
              badge="Paper 1 (MCQ)"
              description="Real Cambridge past papers with interactive jump matrix, timer, and AI mark-scheme explanations."
            />
            <QuickActionCard
              to="/definitions"
              icon={BookText}
              title="Definitions Hub"
              badge="120+ Terms"
              description="Official Cambridge 0455 syllabus definitions, keywords, and flashcards for full AO1 knowledge."
            />
            <QuickActionCard
              to="/practice"
              icon={Dumbbell}
              title="AO Skills Coach"
              badge="Targeted Drills"
              description="Train individual knowledge points, analytical reasoning chains, and evaluative judgements."
            />
            <QuickActionCard
              to="/question-bank"
              icon={LibraryBig}
              title="Question Bank"
              badge="0455 Past Papers"
              description="Filter hundreds of past paper essay and MCQ questions, or generate fresh syllabus prompts."
            />
          </div>

          {/* Conditional Experimental Labs Compartment (Admin Only) */}
          {me.data?.isAdmin ? (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/[0.03] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                    Experimental Labs
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    Administrator Access
                  </span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <QuickActionCard
                  to="/chat"
                  icon={MessageSquare}
                  title="Cambridge Chat Lab"
                  badge="Voice AI"
                  description="Interactive conversational economics examiner with 100% syllabus grounding, voiceover studio, and auto-draft essays."
                />
                <QuickActionCard
                  to="/diagram-lab"
                  icon={Sliders}
                  title="Diagram CAD Lab"
                  badge="Vector CAD"
                  description="Interactive vector economics canvas. Manipulate curves, equilibrium points, deadweight loss, and tax shifts."
                />
                <QuickActionCard
                  to="/paper-matrix"
                  icon={Flame}
                  title="Paper Predictor"
                  badge="15-Yr Matrix"
                  description="Statistical cycle intelligence analyzing 15 years of Cambridge 0455 past papers to flag overdue topics."
                />
              </div>
            </div>
          ) : null}
        </section>

        {/* Recent Essays Interactive Feed */}
        <div className="panel overflow-hidden shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/80 px-3.5 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Your Recent Essays</h2>
              <p className="text-xs text-muted-foreground">
                Review feedback and track improvements on rewrites
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search questions…"
                  value={essaySearch}
                  onChange={(e) => setEssaySearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBandFilter("all")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "all"
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setBandFilter("band1")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "band1"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Band 1
                </button>
                <button
                  type="button"
                  onClick={() => setBandFilter("band2")}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    bandFilter === "band2"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Band 2
                </button>
              </div>
            </div>
          </div>

          {essays.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredEssays.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <GraduationCap className="mx-auto size-9 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium">No matching essays found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {essaySearch
                  ? "Try adjusting your search query or clear the filter."
                  : "Submit an essay response to start building your Cambridge portfolio."}
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/grade">Mark your first essay</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visibleEssays.map((essay) => {
                const mark = essay.latest_mark ?? 0;
                const max = essay.max_mark ?? 12;
                const pct = max > 0 ? Math.round((mark / max) * 100) : 0;
                const isTopBand = pct >= 75;
                const isMidBand = pct >= 50 && pct < 75;

                return (
                  <li key={essay.id}>
                    <Link
                      to="/essay/$essayId"
                      params={{ essayId: essay.id }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors">
                            {essay.question}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            {new Date(essay.updated_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>Tariff: {essay.max_mark}m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-semibold",
                            isTopBand
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isMidBand
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {isTopBand ? "Band 1" : isMidBand ? "Band 2" : "Band 3"} • {pct}%
                        </Badge>
                        <span className="text-xs sm:text-sm font-bold tabular-nums">
                          {essay.latest_mark ?? "—"}
                          <span className="text-muted-foreground font-normal text-xs">
                            /{essay.max_mark}
                          </span>
                        </span>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Expand / Collapse Toggle if more than 4 essays */}
          {filteredEssays.length > 4 && !essaySearch.trim() && bandFilter === "all" ? (
            <div className="border-t border-border/70 px-4 py-2 text-center bg-muted/20">
              <button
                type="button"
                onClick={() => setShowAllEssays(!showAllEssays)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                {showAllEssays ? (
                  <>
                    <ChevronUp className="size-3.5" /> Show fewer essays
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> View all {filteredEssays.length} essays ({filteredEssays.length - 4} more)
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function InteractiveStat({
  label,
  value,
  badge,
  hint,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  badge: string;
  hint: string;
  loading: boolean;
  icon: typeof PenLine;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
        <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.2">
          {badge}
        </Badge>
      </div>

      <p className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</p>
    </div>
  );
}

function AoCard({
  label,
  subtitle,
  score,
  maxScore,
  tone,
  badgeClass,
  insight,
  targetRatio,
}: {
  label: string;
  subtitle: string;
  score: number;
  maxScore: number;
  tone: string;
  badgeClass: string;
  insight: string;
  targetRatio: number;
  aoKey: "ao1" | "ao2" | "ao3";
}) {
  const percent = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  const targetMark = maxScore * targetRatio;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2 py-0.5 font-semibold shrink-0", badgeClass)}
          >
            {score.toFixed(1)} / {maxScore} marks
          </Badge>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Mastery level</span>
            <span className="font-semibold text-foreground tabular-nums">{percent}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500 ease-out", tone)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Level 1 (Basic)</span>
            <span className="font-medium text-primary">Band 1 Target: {targetMark.toFixed(1)}</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
          {insight}
        </p>
      </div>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full text-xs h-8 mt-3 text-primary hover:text-primary hover:bg-primary/10"
      >
        <Link to="/practice">Practise {label.split(" ")[0]} →</Link>
      </Button>
    </div>
  );
}

function QuickActionCard({
  to,
  icon: Icon,
  title,
  badge,
  description,
}: {
  to: string;
  icon: typeof PenLine;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group panel p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-4" />
          </div>
          <Badge
            variant="outline"
            className="border-primary/20 text-[10px] font-medium text-primary bg-primary/5"
          >
            {badge}
          </Badge>
        </div>
        <h3 className="mt-3.5 text-sm font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-primary">
        <span>Launch</span>
        <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

function PerformanceChart({
  versions,
  hoveredPoint,
  onHoverPoint,
}: {
  versions: Array<{ total_mark?: number | null; created_at: string; essay_id?: string | null }>;
  hoveredPoint: { index: number; mark: number; date: string; question: string } | null;
  onHoverPoint: (
    pt: { index: number; mark: number; date: string; question: string } | null,
  ) => void;
}) {
  const width = 800;
  const height = 220;
  const padding = { top: 24, right: 120, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    const list = versions.slice(-15);
    const maxMarkVal = Math.max(12, ...list.map((v) => v.total_mark ?? 0));
    return list.map((v, i) => {
      const mark = v.total_mark ?? 0;
      const pct = maxMarkVal > 0 ? Math.min(1, Math.max(0, mark / maxMarkVal)) : 0;
      const x = padding.left + (i / Math.max(1, list.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - pct * chartHeight;
      const date = new Date(v.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return { x, y, mark, maxMark: maxMarkVal, date, question: `Essay submission #${i + 1}` };
    });
  }, [versions, chartWidth, chartHeight, padding.left, padding.top]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`;
    }, "");
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const bottomY = padding.top + chartHeight;
    return `${pathD} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
  }, [pathD, points, padding.top, chartHeight]);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-hidden sm:overflow-visible text-muted-foreground min-w-[520px] sm:min-w-0"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Band Reference Lines */}
        {/* Band 1: 75% Distinction Target */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.75)}
          x2={padding.left + chartWidth + 6}
          y2={padding.top + chartHeight * (1 - 0.75)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-emerald-500/40"
          strokeWidth="1"
        />
        <rect
          x={width - 105}
          y={padding.top + chartHeight * (1 - 0.75) - 8}
          width="95"
          height="16"
          rx="4"
          className="fill-background/90 stroke-emerald-500/30"
          strokeWidth="1"
        />
        <text
          x={width - 57}
          y={padding.top + chartHeight * (1 - 0.75) + 3.5}
          textAnchor="middle"
          className="text-[9.5px] fill-emerald-600 dark:fill-emerald-400 font-semibold select-none"
        >
          Band 1 (75%+)
        </text>

        {/* Band 2: 50% Mid Band */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.5)}
          x2={padding.left + chartWidth + 6}
          y2={padding.top + chartHeight * (1 - 0.5)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-blue-500/40"
          strokeWidth="1"
        />
        <rect
          x={width - 105}
          y={padding.top + chartHeight * (1 - 0.5) - 8}
          width="95"
          height="16"
          rx="4"
          className="fill-background/90 stroke-blue-500/30"
          strokeWidth="1"
        />
        <text
          x={width - 57}
          y={padding.top + chartHeight * (1 - 0.5) + 3.5}
          textAnchor="middle"
          className="text-[9.5px] fill-blue-600 dark:fill-blue-400 font-semibold select-none"
        >
          Band 2 (50%+)
        </text>

        {/* Band 3: 35% Lower Band */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - 0.35)}
          x2={padding.left + chartWidth + 6}
          y2={padding.top + chartHeight * (1 - 0.35)}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-amber-500/40"
          strokeWidth="1"
        />
        <rect
          x={width - 105}
          y={padding.top + chartHeight * (1 - 0.35) - 8}
          width="95"
          height="16"
          rx="4"
          className="fill-background/90 stroke-amber-500/30"
          strokeWidth="1"
        />
        <text
          x={width - 57}
          y={padding.top + chartHeight * (1 - 0.35) + 3.5}
          textAnchor="middle"
          className="text-[9.5px] fill-amber-600 dark:fill-amber-400 font-semibold select-none"
        >
          Band 3 (35%+)
        </text>

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Trajectory Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#ec4899"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() =>
              onHoverPoint({ index: idx, mark: pt.mark, date: pt.date, question: pt.question })
            }
            onMouseLeave={() => onHoverPoint(null)}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.index === idx ? "6" : "4"}
              className="fill-background stroke-primary transition-all duration-200"
              strokeWidth="2.5"
            />
          </g>
        ))}

        {/* Tooltip on hover */}
        {hoveredPoint !== null && points[hoveredPoint.index] ? (
          <g
            transform={`translate(${Math.max(50, Math.min(width - 50, points[hoveredPoint.index]?.x ?? 0))}, ${Math.max(35, (points[hoveredPoint.index]?.y ?? 0) - 12)})`}
          >
            <rect
              x="-48"
              y="-28"
              width="96"
              height="26"
              rx="6"
              className="fill-popover stroke-border shadow-md"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-11"
              textAnchor="middle"
              className="text-[11px] font-bold fill-foreground"
            >
              {hoveredPoint.mark} marks awarded
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function EducatorDashboardView({
  userName,
  school,
  classrooms,
  docs,
  anchors,
  essays,
}: {
  userName: string;
  school: string | null;
  classrooms: any;
  docs: any[];
  anchors: any[];
  essays: any[];
}) {
  const classList: any[] = Array.isArray(classrooms)
    ? classrooms
    : classrooms?.classes && Array.isArray(classrooms.classes)
      ? classrooms.classes
      : [];
  const safeDocs = Array.isArray(docs) ? docs : [];
  const safeAnchors = Array.isArray(anchors) ? anchors : [];
  const safeEssays = Array.isArray(essays) ? essays : [];

  const readyDocs = safeDocs.filter((d) => d.status === "ready").length;
  const activeAnchors = safeAnchors.filter((a) => a.active !== false).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Educator Command Center"
        description="Cambridge IGCSE Economics (0455) educator workspace, classrooms, mark schemes, and calibrated anchors."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/classes">
                <UsersRound className="size-3.5 text-primary mr-1.5" /> My Classrooms
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/grade">
                <PenLine className="size-3.5 mr-1.5" /> Grade Essay
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4 sm:space-y-6 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto">
        {/* Top Educator Status Strip */}
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-3.5 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Welcome back, {userName}!
                </h2>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10.5px] font-bold">
                  Authorized Cambridge 0455 Educator
                </Badge>
                {school ? (
                  <Badge variant="outline" className="border-border text-foreground text-[10.5px] font-medium">
                    {school}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Your academic workspace is active. Manage your classrooms, evaluate candidate essays, ingest mark schemes, and calibrate standard anchors.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <Button asChild size="sm" variant="outline" className="border-primary/30 hover:bg-primary/10 text-xs">
                <Link to="/classes">
                  <UsersRound className="size-3.5 mr-1 text-primary" /> My Classrooms
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs">
                <Link to="/grade">
                  <PenLine className="size-3.5 mr-1" /> Grade Essay
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* If teacher has no classrooms, guide them to create one */}
        {classList.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-5 sm:p-8 text-center">
            <div className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <UsersRound className="size-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">No Classrooms Created Yet</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Create your first Cambridge IGCSE 0455 classroom to invite students, set homework essays, and view student progress.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4">
                <Link to="/classes">
                  <UsersRound className="size-3.5 mr-1.5" /> Create Your First Classroom
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/grade">
                  <PenLine className="size-3.5 mr-1.5" /> Grade an Essay Now
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          /* Metric Cards & Active Classrooms when classrooms exist */
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Classrooms</p>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UsersRound className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{classList.length}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active classrooms</span>
                  <Link to="/classes" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Manage <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Knowledge Base</p>
                  <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{readyDocs}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ingested RAG documents</span>
                  <Link to="/knowledge" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Search &amp; Add <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Calibrated Anchors</p>
                  <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{activeAnchors}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Standardized benchmarks</span>
                  <Link to="/calibration" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Calibrate <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-2xs hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Evaluated Essays</p>
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <PenLine className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{safeEssays.length}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Submissions evaluated</span>
                  <Link to="/grade" className="font-semibold text-primary hover:underline flex items-center gap-0.5">
                    Grade <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Enrolled Classrooms Grid */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Enrolled Classrooms</h3>
                  <p className="text-xs text-muted-foreground">
                    Classroom analytics, assignment submissions, and student performance diagnostic gradebooks are accessed directly inside your classrooms.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to="/classes">
                    <UsersRound className="size-3.5 mr-1" /> View All Classrooms
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classList.map((cls) => (
                  <div key={cls.id} className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{cls.name}</h4>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                          {cls.level.toUpperCase()} Level Cambridge Economics
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0">
                        Code: {cls.join_code}
                      </Badge>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Student Roster &amp; Grades</span>
                      <Link to="/classes" className="font-semibold text-primary hover:underline flex items-center gap-1">
                        Open Classroom &amp; Grades →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* The 3 Dedicated Core Educator Tools */}
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Core Educator Workspace</h3>
            <p className="text-xs text-muted-foreground">
              Essential evaluation and curriculum tools for Cambridge IGCSE Economics (0455) teachers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Tool 1: Essay Grader */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                  <PenLine className="size-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Essay Grader</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Evaluate candidate submissions with Cambridge 0455 mark schemes. Detailed AO1, AO2, and AO3 criteria breakdowns with maximum tariff benchmarking.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/60">
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs w-full">
                  <Link to="/grade">
                    <PenLine className="size-3.5 mr-1" /> Launch Grader
                  </Link>
                </Button>
              </div>
            </div>

            {/* Tool 2: Knowledge Base */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between hover:border-sky-500/50 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Knowledge Base</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Search and ingest official Cambridge mark schemes, specimen papers, and school assessments. Grounded citations verify every evaluated criterion.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/60">
                <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs w-full">
                  <Link to="/knowledge">
                    <BookOpen className="size-3.5 mr-1" /> Open Knowledge Base
                  </Link>
                </Button>
              </div>
            </div>

            {/* Tool 3: Anchor Calibration */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Anchor Calibration</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Lock the evaluation standard across Level 1 to Level 4 bands with verified candidate exemplars and confirmed marks to prevent mark drift.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/60">
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs w-full">
                  <Link to="/calibration">
                    <ShieldCheck className="size-3.5 mr-1" /> Calibrate Anchors
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
