import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock,
  Coins,
  Cpu,
  Download,
  ExternalLink,
  FileQuestion,
  Flame,
  Globe2,
  GraduationCap,
  Layers,
  LineChart,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { adminGetPlatformDiagnostics } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminDiagnosticsPanel() {
  const fetchDiagnostics = useServerFn(adminGetPlatformDiagnostics);
  const [copied, setCopied] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSubTab, setSelectedSubTab] = useState<"schools" | "retention" | "readiness" | "report">("retention");
  const [retentionView, setRetentionView] = useState<"overall" | "essays" | "mcqs">("overall");

  const query = useQuery({
    queryKey: ["admin-platform-diagnostics"],
    queryFn: () => fetchDiagnostics(),
    refetchInterval: 60_000,
  });

  const data = query.data;

  const handleCopyReport = () => {
    if (!data?.reportMarkdown) return;
    navigator.clipboard.writeText(data.reportMarkdown);
    setCopied(true);
    toast.success("Full Diagnostic Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    if (!data?.reportMarkdown) return;
    const blob = new Blob([data.reportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marginal-platform-diagnostics-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded diagnostic report as Markdown.");
  };

  const filteredSchools = useMemo(() => {
    if (!data?.schoolsBreakdown) return [];
    if (!schoolSearch.trim()) return data.schoolsBreakdown;
    const term = schoolSearch.toLowerCase().trim();
    return data.schoolsBreakdown.filter(
      (s) =>
        s.schoolName.toLowerCase().includes(term) ||
        s.domains.some((d) => d.toLowerCase().includes(term)),
    );
  }, [data?.schoolsBreakdown, schoolSearch]);

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
        <p className="text-sm font-semibold text-destructive">Failed to load platform diagnostics telemetry.</p>
        <p className="text-xs text-muted-foreground">{(query.error as Error)?.message || "Unknown error"}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Retry Telemetry Ingestion
        </Button>
      </div>
    );
  }

  const { executiveSummary: exec, retentionStats: ret, academicQuality: acad, platformReadiness: ready } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Banner with 1-Click Copy & Download ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-purple-950/20 to-card shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Live Platform Intelligence &amp; Diagnostic Telemetry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Full Platform Diagnostic Report</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Real-time audit across {exec.totalUsers} registered users, {exec.recognizedSchoolsCount} institutions, repeat usage across Essays &amp; MCQs, and Cambridge IGCSE 0455 operational readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Button
            onClick={handleCopyReport}
            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm transition-all"
          >
            {copied ? <Check className="size-4 mr-1.5" /> : <Clipboard className="size-4 mr-1.5" />}
            {copied ? "Report Copied!" : "Copy Full Report (Markdown)"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadReport}
            className="flex-1 sm:flex-none border-border/80 hover:bg-muted/70 text-xs"
          >
            <Download className="size-4 mr-1.5" />
            Download .md
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            title="Refresh Diagnostic Telemetry"
            className="size-9"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Executive Metric Pulse Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.totalUsers}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">+{exec.userGrowth7d} this wk</span>
            <span>·</span>
            <span>{exec.totalStudents} st / {exec.totalTeachers} tch</span>
          </div>
        </div>

        {/* Schools Reached */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Schools Reached</span>
            <School className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.recognizedSchoolsCount}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <Globe2 className="size-3 text-blue-400 shrink-0" />
            <span>Recognized institutions</span>
          </div>
        </div>

        {/* Evaluated Essays */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Essays Graded</span>
            <BookOpen className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.totalEssays}</div>
          <div className="text-[11px] text-muted-foreground">
            ~{Math.round(exec.estimatedWordsGraded / 1000)}k words evaluated
          </div>
        </div>

        {/* MCQ Papers Graded */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">MCQ Papers</span>
            <FileQuestion className="size-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.totalMcqs}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            Real Cambridge papers
          </div>
        </div>

        {/* Repeated Retention */}
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Repeat Rate</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{exec.overallRetentionRate}%</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {ret.repeatOverallCount} of {ret.totalActivePractitioners} repeat practice
          </div>
        </div>

        {/* Platform Maturity */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Platform Score</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{ready.overallScore}/100</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
            Tier-1 Cambridge Ready
          </div>
        </div>
      </div>

      {/* ── Subtabs for Detailed Analysis ── */}
      <Tabs value={selectedSubTab} onValueChange={(v: any) => setSelectedSubTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="retention" className="py-2.5 text-xs font-semibold gap-1.5">
            <Flame className="size-3.5 text-amber-500" />
            <span>Repeated Usage ({exec.overallRetentionRate}%)</span>
          </TabsTrigger>
          <TabsTrigger value="schools" className="py-2.5 text-xs font-semibold gap-1.5">
            <Building2 className="size-3.5" />
            <span>Schools &amp; Institutions ({data.schoolsBreakdown?.length ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="readiness" className="py-2.5 text-xs font-semibold gap-1.5">
            <Target className="size-3.5 text-emerald-500" />
            <span>Where Marginalite Stands ({ready.overallScore}/100)</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="py-2.5 text-xs font-semibold gap-1.5">
            <Clipboard className="size-3.5 text-purple-500" />
            <span>Diagnostic Report (Export)</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: REPEATED USAGE ACROSS ALL ACTIVITIES (ESSAYS + MCQ + COMBINED) ── */}
        <TabsContent value="retention" className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Sub-navigation pill switcher between Overall, Essays, and MCQs */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-1.5 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={retentionView === "overall" ? "default" : "ghost"}
                onClick={() => setRetentionView("overall")}
                className="text-xs h-8 gap-1.5"
              >
                <Zap className="size-3.5 text-amber-400" />
                <span>All Practice Combined ({ret.overallRetentionRate}% Repeat)</span>
              </Button>
              <Button
                size="sm"
                variant={retentionView === "essays" ? "default" : "ghost"}
                onClick={() => setRetentionView("essays")}
                className="text-xs h-8 gap-1.5"
              >
                <BookOpen className="size-3.5 text-purple-400" />
                <span>Essay Writing ({ret.essayRetentionRate}% Repeat)</span>
              </Button>
              <Button
                size="sm"
                variant={retentionView === "mcqs" ? "default" : "ghost"}
                onClick={() => setRetentionView("mcqs")}
                className="text-xs h-8 gap-1.5"
              >
                <FileQuestion className="size-3.5 text-cyan-400" />
                <span>MCQ Past Papers ({ret.mcqRetentionRate}% Repeat)</span>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground pr-2 font-medium">
              {exec.totalPracticeSubmissions} Total Evaluated Practice Submissions
            </div>
          </div>

          {/* VIEW A: COMBINED PRACTICE RETENTION */}
          {retentionView === "overall" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Metric Highlight Card */}
                <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4 lg:col-span-1">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider">
                    <Flame className="size-4" />
                    <span>Combined Platform Retention</span>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">
                      {ret.overallRetentionRate}%
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1">Multi-Activity Repeat Rate</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Across all practice features (Essays, Data Response, and MCQ past papers), <strong>{ret.repeatOverallCount} of {ret.totalActivePractitioners} active students</strong> have returned for repeated practice sessions.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-purple-500/20 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Total Practice Submissions:</span>
                      <span className="font-bold text-foreground">{exec.totalPracticeSubmissions} evaluated</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Total Essays Graded:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{exec.totalEssays} essays</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">MCQ Papers Completed:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{exec.totalMcqs} full papers</span>
                    </div>
                  </div>
                </div>

                {/* Frequency Histogram */}
                <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Combined Candidate Practice Volume Distribution</h4>
                  <p className="text-xs text-muted-foreground">
                    Total evaluation attempts per candidate across Essays, Data Response, and MCQ Past Papers.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {ret.overallFrequencyBuckets.map((bucket, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{bucket.label}</span>
                          <span className="font-semibold text-muted-foreground">
                            {bucket.count} students ({bucket.percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0
                                ? "bg-slate-400"
                                : idx === 1
                                ? "bg-blue-500"
                                : idx === 2
                                ? "bg-purple-500"
                                : idx === 3
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.max(bucket.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Combined Super-Users Leaderboard */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" />
                    Overall Practice Champions Leaderboard
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Candidates with the highest total platform practice across Essays and MCQ Past Papers.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-3 px-3 text-center">Rank</th>
                        <th className="py-3 px-4">Candidate / User</th>
                        <th className="py-3 px-4">Institution</th>
                        <th className="py-3 px-3 text-center">Essays</th>
                        <th className="py-3 px-3 text-center">MCQ Papers</th>
                        <th className="py-3 px-3 text-center">Live Sessions</th>
                        <th className="py-3 px-4 text-center">Total Activities</th>
                        <th className="py-3 px-4">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ret.topOverallUsers.map((u, idx) => (
                        <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{u.displayName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-medium">
                            {u.school}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-purple-600 dark:text-purple-400">
                            {u.essayCount}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-cyan-600 dark:text-cyan-400">
                            {u.mcqCount}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {u.liveCount}
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-foreground text-sm">
                            <span className="rounded-md bg-muted px-2 py-0.5">{u.totalActivities} total</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "Active"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: ESSAY RETENTION */}
          {retentionView === "essays" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4 lg:col-span-1">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider">
                    <BookOpen className="size-4" />
                    <span>Essay Writing Repeat Rate</span>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">
                      {ret.essayRetentionRate}%
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1">Essay Writer Repeat Rate</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Out of <strong>{ret.totalEssayWriters} unique essay writers</strong>, <strong>{ret.repeatEssayWriters} returned to write multiple essays</strong> ({exec.totalEssays} total essays graded to date).
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-purple-500/20 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Regular Writers (≥5 Essays):</span>
                      <span className="font-bold text-foreground">{ret.essayPowerUsersCount} students</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Extreme Cohort (≥20 Essays):</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{ret.essayExtremeCount} students</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Essay Frequency Tiers</h4>
                  <p className="text-xs text-muted-foreground">
                    Distribution of essay submissions across student candidate cohorts.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {ret.essayFrequencyBuckets.map((bucket, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{bucket.label}</span>
                          <span className="font-semibold text-muted-foreground">
                            {bucket.count} writers ({bucket.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0 ? "bg-slate-400" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-purple-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.max(bucket.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Essay Writers Leaderboard */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Top Essay Champions Leaderboard
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-3 px-3 text-center">Rank</th>
                        <th className="py-3 px-4">Candidate / User</th>
                        <th className="py-3 px-4">Stated School</th>
                        <th className="py-3 px-3 text-center">Essays Graded</th>
                        <th className="py-3 px-3 text-center">Average Mark</th>
                        <th className="py-3 px-4">Last Evaluated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ret.topEssayUsers.map((u, idx) => (
                        <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{u.displayName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-medium">{u.school}</td>
                          <td className="py-3 px-3 text-center font-extrabold text-purple-600 dark:text-purple-400 text-sm">
                            {u.essayCount}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {u.avgScorePct !== null ? `${u.avgScorePct}%` : "Pending"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "Active"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW C: MCQ RETENTION */}
          {retentionView === "mcqs" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-4 lg:col-span-1">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <FileQuestion className="size-4" />
                    <span>MCQ Paper Repeat Rate</span>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-cyan-600 dark:text-cyan-400">
                      {ret.mcqRetentionRate}%
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1">Repeat MCQ Candidate Rate</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Out of <strong>{ret.totalMcqCandidates} candidates</strong> who practiced MCQ past papers, <strong>{ret.repeatMcqCandidates} completed multiple full papers</strong> ({exec.totalMcqs} full paper attempts).
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-cyan-500/20 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Power MCQ Drillers (≥4 Papers):</span>
                      <span className="font-bold text-foreground">{ret.mcqPowerUsersCount} students</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">MCQ Practice Paper Tiers</h4>
                  <p className="text-xs text-muted-foreground">
                    Number of full 30-question Cambridge papers completed per candidate.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {ret.mcqFrequencyBuckets.map((bucket, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{bucket.label}</span>
                          <span className="font-semibold text-muted-foreground">
                            {bucket.count} candidates ({bucket.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0 ? "bg-slate-400" : idx === 1 ? "bg-cyan-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.max(bucket.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top MCQ Candidates Leaderboard */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Top MCQ Practice Champions Leaderboard
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-3 px-3 text-center">Rank</th>
                        <th className="py-3 px-4">Candidate / User</th>
                        <th className="py-3 px-4">School</th>
                        <th className="py-3 px-3 text-center">Papers Completed</th>
                        <th className="py-3 px-3 text-center">Questions Answered</th>
                        <th className="py-3 px-3 text-center">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ret.topMcqUsers.map((u, idx) => (
                        <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{u.displayName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-medium">{u.school}</td>
                          <td className="py-3 px-3 text-center font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">
                            {u.paperCount} papers
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            {u.totalQuestions} questions
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {u.accuracyPct !== null ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {u.accuracyPct}%
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: SCHOOLS & INSTITUTIONAL FOOTPRINT ── */}
        <TabsContent value="schools" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Institutional Sign-In &amp; School Directory</h3>
                <p className="text-xs text-muted-foreground">
                  Identified institutions derived from student/teacher profile disclosures, institutional email domain analysis (@school.org, @school.edu), and official waitlist registrations.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter schools or domains…"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background"
                />
              </div>
            </div>

            {/* Institutional Email Domains Pill Strip */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Detected Institutional Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.domainBreakdown
                  .filter((d) => d.isInstitutional)
                  .map((d) => (
                    <span
                      key={d.domain}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-medium"
                    >
                      <span>@{d.domain}</span>
                      <span className="size-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold">
                        {d.count}
                      </span>
                    </span>
                  ))}
              </div>
            </div>

            {/* Schools Roster Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Institution / School</th>
                    <th className="py-3 px-3">Total Users</th>
                    <th className="py-3 px-3">Role Split</th>
                    <th className="py-3 px-3 text-center">Essays</th>
                    <th className="py-3 px-3 text-center">MCQ Papers</th>
                    <th className="py-3 px-3 text-center">Total Practice</th>
                    <th className="py-3 px-3">Verified Domain</th>
                    <th className="py-3 px-4">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSchools.map((s, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{s.schoolName}</span>
                          {s.isInternational && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/30 text-blue-600 bg-blue-500/10">
                              International
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">
                        <span className="rounded-md bg-muted px-2 py-0.5">{s.userCount}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <span className="text-foreground font-medium">{s.studentCount} st</span>
                        {s.teacherCount > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold ml-1.5">
                            · {s.teacherCount} tch
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {s.essayCount > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{s.essayCount}</span>
                        ) : (
                          <span className="text-muted-foreground/60">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {s.mcqCount > 0 ? (
                          <span className="text-cyan-600 dark:text-cyan-400 font-bold">{s.mcqCount}</span>
                        ) : (
                          <span className="text-muted-foreground/60">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-foreground">
                        <span className={cn("px-2 py-0.5 rounded-md", s.totalPracticeCount > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground")}>
                          {s.totalPracticeCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                        {(s.domains?.length ?? 0) > 0 ? s.domains.join(", ") : <span className="text-muted-foreground/60 italic">Self-Reported</span>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {s.isInternational ? "Global (UK / ID / Overseas)" : "India (Cambridge Centered)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: WHERE MARGINAL STANDS & PLATFORM READINESS ── */}
        <TabsContent value="readiness" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overall Maturity Card */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="size-4" />
                <span>Executive Platform Assessment</span>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {ready.overallScore} / 100
                </div>
                <h4 className="text-sm font-bold text-foreground mt-1">{ready.status}</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {ready.headline}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-foreground">Current Operating Tier:</div>
                <div className="text-muted-foreground">Production Cloudflare Workers · Multi-Provider LLM Failover Pool · Supabase PostgreSQL RAG Grounding</div>
              </div>
            </div>

            {/* Checklist Matrix */}
            <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
              <h4 className="text-sm font-bold text-foreground">Cambridge IGCSE 0455 Readiness Matrix</h4>
              <div className="space-y-3 pt-1">
                {ready.checklist.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{c.item}</span>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-semibold">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Academic Mark Distribution Band */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Cambridge Evaluated Grade Band Distribution</h4>
              <p className="text-xs text-muted-foreground">
                Score breakdown across all {acad.totalScored} graded student essays (Average: <strong>{acad.avgScorePct}%</strong>, Highest: <strong>{acad.highestScorePct}%</strong>).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {acad.scoreBands.map((band, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="text-xs font-bold text-foreground">{band.band.split(" ")[0]} {band.band.split(" ")[1]}</div>
                  <div className="text-[11px] text-muted-foreground">{band.gradeEquivalent}</div>
                  <div className="text-lg font-extrabold text-foreground mt-2">{band.count} <span className="text-xs font-normal text-muted-foreground">scripts</span></div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">{band.percentage}% of cohort</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: RAW REPORT & 1-CLICK EXPORT ── */}
        <TabsContent value="report" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Generated Markdown Diagnostic Report</h4>
                <p className="text-xs text-muted-foreground">
                  Formatted for copy-pasting directly into investor memos, school department presentations, or administrative logs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopyReport} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  {copied ? <Check className="size-3.5 mr-1.5" /> : <Clipboard className="size-3.5 mr-1.5" />}
                  {copied ? "Copied!" : "Copy Report"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadReport} className="text-xs">
                  <Download className="size-3.5 mr-1.5" />
                  Download File
                </Button>
              </div>
            </div>

            <pre className="max-h-[500px] overflow-auto rounded-xl border border-border/80 bg-muted/70 p-4 font-mono text-[11px] text-foreground whitespace-pre leading-relaxed select-all">
              {data.reportMarkdown}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
