import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  MessageSquare,
  MinusCircle,
  PenLine,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  User,
  Users,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useMemo, useState, useEffect, Component, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminFixFailedEssay,
  adminGetEssayDetail,
  adminGetLiveExaminerSessionDetail,
  adminGetLiveUserMonitoring,
  adminGetMcqAttemptDetail,
  adminDeleteMcqAttempt,
  adminGetPlatformActivityFeed,
  adminGetStudentDossier,
  adminListAllDossierUsers,
  adminListAllEssays,
  adminListAllLiveExaminerSessions,
  adminListAllMcqAttempts,
  adminListFailedEssays,
} from "@/lib/admin.functions";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { cn } from "@/lib/utils";

interface GodmodeErrorBoundaryProps {
  children: ReactNode;
  tabName?: string;
}

interface GodmodeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GodmodeErrorBoundary extends Component<GodmodeErrorBoundaryProps, GodmodeErrorBoundaryState> {
  constructor(props: GodmodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GodmodeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("God Mode tab error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="mx-auto size-8 text-destructive" />
          <p className="text-sm font-semibold text-destructive">
            Something went wrong while rendering {this.props.tabName || "this section"}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {this.state.error?.message || "Unexpected UI error"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="size-3" />
            <span>Try Again</span>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminGodmodeDashboard({
  initialTab,
}: {
  initialTab?: "radar" | "dossier" | "failures" | "activity" | "essays" | "mcq" | "live";
} = {}) {
  const [subTab, setSubTab] = useState<
    "radar" | "dossier" | "failures" | "activity" | "essays" | "mcq" | "live"
  >(initialTab || "radar");

  useEffect(() => {
    if (initialTab) {
      setSubTab(initialTab);
    }
  }, [initialTab]);

  // Fetch quick metrics for tab badge counters
  const fetchLiveMonitor = useServerFn(adminGetLiveUserMonitoring);
  const fetchFailedEssays = useServerFn(adminListFailedEssays);

  const liveStatsQuery = useQuery({
    queryKey: ["admin-live-monitor-badge"],
    queryFn: () => fetchLiveMonitor(),
    refetchInterval: 10_000,
  });

  const failedQuery = useQuery({
    queryKey: ["admin-failed-essays-badge"],
    queryFn: () => fetchFailedEssays(),
    refetchInterval: 15_000,
  });

  const onlineCount = liveStatsQuery.data?.stats.onlineCount ?? 0;
  const typingCount = liveStatsQuery.data?.stats.currentlyTypingCount ?? 0;
  const openFailuresCount = (failedQuery.data ?? []).filter((f) => !f.resolved).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: God Mode Authorization */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shadow-sm">
                <Crown className="size-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                God-Mode Platform Vault &amp; Omniscient Monitor
              </h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                ROOT ACCESS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl">
              Real-time user surveillance (live screens &amp; keystrokes), 1-click Cambridge essay failure diagnosis &amp; repair,
              complete 360° student dossiers reflecting all users, and live platform-wide activity stream.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/80 border border-border shadow-xs text-xs font-mono">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{onlineCount}</span>
              <span className="text-muted-foreground text-[11px]">online</span>
              {typingCount > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-semibold text-indigo-500">✍️ {typingCount}</span>
                  <span className="text-muted-foreground text-[11px]">typing</span>
                </>
              )}
            </div>

            {openFailuresCount > 0 && (
              <button
                type="button"
                onClick={() => setSubTab("failures")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <AlertTriangle className="size-3.5" />
                <span className="font-bold">{openFailuresCount}</span>
                <span className="text-[11px]">unfixed</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vault Navigation Tabs */}
      <Tabs value={subTab} onValueChange={(val) => setSubTab(val as typeof subTab)}>
        <TabsList className="flex items-center justify-start gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full h-auto p-1.5 rounded-2xl bg-muted/50 border border-border/80 shadow-2xs scroll-smooth">
          <TabsTrigger
            value="radar"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Radio className="size-3.5 shrink-0 text-emerald-500 animate-pulse" />
            <span className="whitespace-nowrap">Live Radar &amp; Keystrokes</span>
            {typingCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono shrink-0 font-semibold"
              >
                {typingCount}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="failures"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Wrench className="size-3.5 shrink-0 text-rose-500" />
            <span className="whitespace-nowrap">Essay Failures &amp; Fix</span>
            {openFailuresCount > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-mono shrink-0 font-semibold">
                {openFailuresCount}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="dossier"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <User className="size-3.5 shrink-0 text-amber-500" />
            <span className="whitespace-nowrap">Student 360° Dossier</span>
          </TabsTrigger>

          <TabsTrigger
            value="activity"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Activity className="size-3.5 shrink-0 text-indigo-500" />
            <span className="whitespace-nowrap">Activity Feed</span>
          </TabsTrigger>

          <TabsTrigger
            value="essays"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <FileText className="size-3.5 shrink-0 text-primary" />
            <span className="whitespace-nowrap">Essays Vault</span>
          </TabsTrigger>

          <TabsTrigger
            value="mcq"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Target className="size-3.5 shrink-0 text-emerald-500" />
            <span className="whitespace-nowrap">MCQ Attempts</span>
          </TabsTrigger>

          <TabsTrigger
            value="live"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-background/40 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <PenLine className="size-3.5 shrink-0 text-indigo-500" />
            <span className="whitespace-nowrap">Live Examiner</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="radar" className="mt-4">
          <GodmodeErrorBoundary tabName="Live Radar & Keystrokes">
            {subTab === "radar" && <LiveRadarTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="failures" className="mt-4">
          <GodmodeErrorBoundary tabName="Essay Failures & Fix">
            {subTab === "failures" && <FailedEssaysTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="dossier" className="mt-4">
          <GodmodeErrorBoundary tabName="Student 360° Dossier">
            {subTab === "dossier" && <StudentDossierTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <GodmodeErrorBoundary tabName="Activity Feed">
            {subTab === "activity" && <PlatformActivityTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="essays" className="mt-4">
          <GodmodeErrorBoundary tabName="Essays Vault">
            {subTab === "essays" && <EssaysVaultTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="mcq" className="mt-4">
          <GodmodeErrorBoundary tabName="MCQ Attempts">
            {subTab === "mcq" && <McqVaultTab />}
          </GodmodeErrorBoundary>
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          <GodmodeErrorBoundary tabName="Live Examiner">
            {subTab === "live" && <LiveExaminerVaultTab />}
          </GodmodeErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================================
 * TAB 1: ESSAYS VAULT
 * ============================================================================ */

export function EssaysVaultTab() {
  const fetchAllEssays = useServerFn(adminListAllEssays);
  const fetchEssayDetail = useServerFn(adminGetEssayDetail);
  const essaysQuery = useQuery({
    queryKey: ["admin-all-essays"],
    queryFn: () => fetchAllEssays(),
    refetchInterval: 5_000,
  });

  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<"all" | "high" | "mid" | "low">("all");
  const [inspectEssayId, setInspectEssayId] = useState<string | null>(null);

  const essayDetailQuery = useQuery({
    queryKey: ["admin-essay-detail", inspectEssayId],
    queryFn: () => fetchEssayDetail({ data: { essayId: inspectEssayId! } }),
    enabled: Boolean(inspectEssayId),
  });

  const essays = essaysQuery.data ?? [];

  const filteredEssays = useMemo(() => {
    return essays.filter((e) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (e.studentName || "").toLowerCase().includes(q) ||
        (e.studentEmail && e.studentEmail.toLowerCase().includes(q)) ||
        (e.question || "").toLowerCase().includes(q) ||
        (e.school && e.school.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (bandFilter !== "all" && e.latestMark !== null && e.maxMark > 0) {
        const pct = (e.latestMark / e.maxMark) * 100;
        if (bandFilter === "high" && pct < 75) return false;
        if (bandFilter === "mid" && (pct < 50 || pct >= 75)) return false;
        if (bandFilter === "low" && pct >= 50) return false;
      }

      return true;
    });
  }, [essays, search, bandFilter]);

  const avgScorePct = useMemo(() => {
    const scored = essays.filter((e) => e.latestMark !== null && e.maxMark > 0);
    if (!scored.length) return 0;
    const sum = scored.reduce((acc, e) => acc + ((e.latestMark ?? 0) / e.maxMark) * 100, 0);
    return Math.round(sum / scored.length);
  }, [essays]);

  return (
    <div className="space-y-4">
      {/* Summary KPI row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Platform Essays</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{essays.length}</p>
          <p className="text-[11px] text-muted-foreground">Every essay ever written by any student</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Platform Average Score</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-primary">{avgScorePct}%</p>
          <p className="text-[11px] text-muted-foreground">Across all graded Cambridge submissions</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Multi-Version Rewrites</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-500">
            {essays.filter((e) => e.versionsCount > 1).length}
          </p>
          <p className="text-[11px] text-muted-foreground">Essays revised and rewritten for higher marks</p>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, school, or question prompt..."
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={bandFilter} onValueChange={(v) => setBandFilter(v as typeof bandFilter)}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="All Bands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marks</SelectItem>
              <SelectItem value="high">Band 1 (75%+)</SelectItem>
              <SelectItem value="mid">Band 2/3 (50-74%)</SelectItem>
              <SelectItem value="low">Band 4 (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => essaysQuery.refetch()}
            disabled={essaysQuery.isFetching}
          >
            <RefreshCw className={cn("size-3", essaysQuery.isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Essays Table / List */}
      {essaysQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : essaysQuery.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="mx-auto size-8 text-destructive" />
          <p className="text-sm font-semibold text-destructive">Failed to load platform essays</p>
          <p className="text-xs text-muted-foreground">{(essaysQuery.error as Error)?.message || "A database read error occurred."}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => essaysQuery.refetch()}
          >
            <RefreshCw className="size-3" />
            <span>Try Again</span>
          </Button>
        </div>
      ) : filteredEssays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <FileText className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No essays matched your search</p>
          <p className="text-xs text-muted-foreground">Try clearing the search query or band filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card/40 overflow-hidden shadow-sm">
          {filteredEssays.map((essay) => {
            const pct = essay.latestMark !== null && essay.maxMark > 0
              ? Math.round((essay.latestMark / essay.maxMark) * 100)
              : null;

            return (
              <div
                key={essay.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {essay.studentName}
                    </span>
                    {essay.studentEmail && (
                      <span className="text-[11px] font-mono text-muted-foreground truncate">
                        ({essay.studentEmail})
                      </span>
                    )}
                    {essay.school && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {essay.school}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">
                      {new Date(essay.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {essay.question}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {essay.versionsCount > 1 && (
                      <Badge variant="secondary" className="text-[10px] h-4 font-mono">
                        v{essay.versionsCount}
                      </Badge>
                    )}
                    {essay.latestAo1 !== null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        AO1: {essay.latestAo1}
                      </span>
                    )}
                    {essay.latestAo2 !== null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        · AO2: {essay.latestAo2}
                      </span>
                    )}
                    {essay.latestAo3 !== null && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        · AO3: {essay.latestAo3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums">
                      {essay.latestMark !== null ? (
                        <>
                          {essay.latestMark} <span className="text-xs font-normal text-muted-foreground">/ {essay.maxMark}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                    {pct !== null && (
                      <p
                        className={cn(
                          "text-[10px] font-semibold tabular-nums",
                          pct >= 75 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500",
                        )}
                      >
                        {pct}%
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => setInspectEssayId(essay.id)}
                  >
                    <Eye className="size-3.5" />
                    <span>Inspect</span>
                  </Button>

                  <Link
                    to="/essay/$essayId"
                    params={{ essayId: essay.id }}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    title="Open full student report in new tab"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Essay Detail Modal */}
      <Dialog open={Boolean(inspectEssayId)} onOpenChange={(open) => !open && setInspectEssayId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Essay Inspector
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Full student script, version progression, and Cambridge examiner mark report.
                </DialogDescription>
              </div>
              {inspectEssayId && (
                <Link
                  to="/essay/$essayId"
                  params={{ essayId: inspectEssayId }}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <span>Open report page</span>
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          </DialogHeader>

          {essayDetailQuery.isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !essayDetailQuery.data ? (
            <p className="text-sm text-muted-foreground py-6">Failed to load essay details.</p>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Question & Author info */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Author: {essayDetailQuery.data.author.name}{" "}
                    {essayDetailQuery.data.author.email && (
                      <span className="font-mono text-muted-foreground">({essayDetailQuery.data.author.email})</span>
                    )}
                  </span>
                  {essayDetailQuery.data.author.school && (
                    <Badge variant="outline" className="text-[10px]">
                      {essayDetailQuery.data.author.school}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {essayDetailQuery.data.essay.question}
                </p>
              </div>

              {/* Version History Tabs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Versions &amp; Reports ({essayDetailQuery.data?.versions?.length ?? 0})
                </h4>

                {(essayDetailQuery.data?.versions ?? []).map((ver: any) => (
                  <div key={ver.id} className="rounded-xl border border-border p-4 space-y-4 bg-card/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono text-xs">
                          Version {ver.version}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ver.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {ver.total_mark} / {essayDetailQuery.data.essay.max_mark} Marks
                        </span>
                        {ver.audited && (
                          <Badge variant="secondary" className="text-[10px]">
                            Audited
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Full Essay Text */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Student Script:</span>
                      <div className="rounded-lg border border-border bg-background p-3 text-xs leading-relaxed font-serif whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {ver.essay_text}
                      </div>
                    </div>

                    {/* Examiner Breakdown Report */}
                    {(() => {
                      let g = ver.grading;
                      if (typeof g === "string") {
                        try {
                          g = JSON.parse(g);
                        } catch {}
                      }
                      return g && typeof g === "object" ? (
                        <div className="pt-2">
                          <span className="text-xs font-semibold text-muted-foreground block mb-2">
                            Cambridge Examiner Breakdown:
                          </span>
                          <MarkBreakdown grading={g} />
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================================
 * TAB 2: MCQ PAPERS & ATTEMPTS VAULT
 * ============================================================================ */

function McqVaultTab() {
  const queryClient = useQueryClient();
  const fetchAllMcqs = useServerFn(adminListAllMcqAttempts);
  const fetchMcqDetail = useServerFn(adminGetMcqAttemptDetail);
  const deleteMcq = useServerFn(adminDeleteMcqAttempt);
  const mcqsQuery = useQuery({ queryKey: ["admin-all-mcqs"], queryFn: () => fetchAllMcqs() });

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "generated" | "past_paper">("all");
  const [inspectTarget, setInspectTarget] = useState<{ id: string; kind: "generated" | "past_paper" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; kind: "generated" | "past_paper" } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (target: { id: string; kind: "generated" | "past_paper" }) =>
      deleteMcq({ data: { id: target.id, kind: target.kind } }),
    onSuccess: () => {
      toast.success("MCQ score deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-mcqs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-student-dossier"] });
      setDeleteTarget(null);
      if (inspectTarget?.id === deleteTarget?.id) {
        setInspectTarget(null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete MCQ score.");
    },
  });

  const mcqDetailQuery = useQuery({
    queryKey: ["admin-mcq-detail", inspectTarget?.id, inspectTarget?.kind],
    queryFn: () => fetchMcqDetail({ data: { id: inspectTarget!.id, kind: inspectTarget!.kind } }),
    enabled: Boolean(inspectTarget),
  });

  const mcqs = mcqsQuery.data ?? [];

  const filteredMcqs = useMemo(() => {
    return mcqs.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.studentName.toLowerCase().includes(q) ||
        (m.studentEmail && m.studentEmail.toLowerCase().includes(q)) ||
        m.title.toLowerCase().includes(q) ||
        m.topic.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      return true;
    });
  }, [mcqs, search, kindFilter]);

  const avgAccuracy = useMemo(() => {
    const scored = mcqs.filter((m) => m.score !== null && m.total > 0);
    if (!scored.length) return 0;
    const totalQ = scored.reduce((acc, m) => acc + m.total, 0);
    const totalC = scored.reduce((acc, m) => acc + (m.score ?? 0), 0);
    return totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  }, [mcqs]);

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total MCQ Attempts</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{mcqs.length}</p>
          <p className="text-[11px] text-muted-foreground">Official past papers + AI generated sessions</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Overall Platform MCQ Accuracy</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-500">{avgAccuracy}%</p>
          <p className="text-[11px] text-muted-foreground">Student accuracy across all questions taken</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Completed Papers</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-primary">
            {mcqs.filter((m) => m.status === "marked" || m.completedAt).length}
          </p>
          <p className="text-[11px] text-muted-foreground">Papers with final scores computed</p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, paper name, or topic..."
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
            <SelectTrigger className="h-9 w-40 text-xs">
              <SelectValue placeholder="All Paper Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Papers</SelectItem>
              <SelectItem value="past_paper">Official Past Papers</SelectItem>
              <SelectItem value="generated">AI Generated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => mcqsQuery.refetch()}
            disabled={mcqsQuery.isFetching}
          >
            <RefreshCw className={cn("size-3", mcqsQuery.isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* MCQ Attempts List */}
      {mcqsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredMcqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <Target className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No MCQ attempts matched your search</p>
          <p className="text-xs text-muted-foreground">Try clearing the search query or paper type filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card/40 overflow-hidden shadow-sm">
          {filteredMcqs.map((mcq) => (
            <div
              key={mcq.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {mcq.studentName}
                  </span>
                  {mcq.studentEmail && (
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      ({mcq.studentEmail})
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-4 px-1.5",
                      mcq.kind === "past_paper"
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-primary/40 text-primary",
                    )}
                  >
                    {mcq.kind === "past_paper" ? "Cambridge Past Paper" : "Topic Generator"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">
                    {new Date(mcq.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <p className="text-xs font-medium text-foreground">
                  {mcq.title}
                </p>

                <p className="text-[11px] text-muted-foreground truncate">
                  Topic: {mcq.topic} · Level: {mcq.level.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="text-right">
                  <p className="text-base font-bold tabular-nums">
                    {mcq.score !== null ? (
                      <>
                        {mcq.score} <span className="text-xs font-normal text-muted-foreground">/ {mcq.total}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                  {mcq.percentage !== null && (
                    <p
                      className={cn(
                        "text-[10px] font-semibold tabular-nums",
                        mcq.percentage >= 80 ? "text-emerald-500" : mcq.percentage >= 60 ? "text-amber-500" : "text-rose-500",
                      )}
                    >
                      {mcq.percentage}%
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => setInspectTarget({ id: mcq.id, kind: mcq.kind })}
                >
                  <Eye className="size-3.5" />
                  <span>Inspect</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  title="Delete this MCQ score"
                  aria-label="Delete this MCQ score"
                  onClick={() => setDeleteTarget({ id: mcq.id, title: mcq.title, kind: mcq.kind })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCQ score?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the MCQ attempt for &ldquo;{deleteTarget?.title}&rdquo;?
              This will permanently remove the score and answers from the system and recalculate student topic metrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Score"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inspect MCQ Modal */}
      <Dialog open={Boolean(inspectTarget)} onOpenChange={(open) => !open && setInspectTarget(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Target className="size-4 text-emerald-500" />
              MCQ Attempt Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete question-by-question breakdown, student choices, and mark scheme verification.
            </DialogDescription>
          </DialogHeader>

          {mcqDetailQuery.isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !mcqDetailQuery.data?.attempt ? (
            <p className="text-sm text-muted-foreground py-6">Could not load attempt details.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Author & Paper header */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Student: {mcqDetailQuery.data.author.name}{" "}
                    {mcqDetailQuery.data.author.email && (
                      <span className="font-mono text-muted-foreground">({mcqDetailQuery.data.author.email})</span>
                    )}
                    {mcqDetailQuery.data.author.school && (
                      <span className="text-muted-foreground"> · {mcqDetailQuery.data.author.school}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">
                      Score: {mcqDetailQuery.data.attempt.score ?? 0} / {mcqDetailQuery.data.attempt.total}
                    </Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        if (inspectTarget) {
                          setDeleteTarget({
                            id: inspectTarget.id,
                            title: mcqDetailQuery.data.attempt.title || "MCQ Paper",
                            kind: inspectTarget.kind,
                          });
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                      <span>Delete Score</span>
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {mcqDetailQuery.data.attempt.title}
                </p>
              </div>

              {/* Question list breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Questions Breakdown ({Array.isArray(mcqDetailQuery.data.attempt.questions) ? mcqDetailQuery.data.attempt.questions.length : 0})
                </h4>

                {Array.isArray(mcqDetailQuery.data.attempt.questions) &&
                  mcqDetailQuery.data.attempt.questions.map((q: any, idx: number) => {
                    const qNum = q.number ?? idx + 1;
                    const studentAns =
                      q.user_answer ??
                      (mcqDetailQuery.data.attempt.answers &&
                      typeof mcqDetailQuery.data.attempt.answers === "object" &&
                      !Array.isArray(mcqDetailQuery.data.attempt.answers)
                        ? mcqDetailQuery.data.attempt.answers[String(qNum)]
                        : null);
                    const correctAns = q.correct_answer || q.answer || "—";
                    const isAttempted =
                      studentAns !== null && studentAns !== undefined && studentAns !== "" && studentAns !== "—";
                    const isCorrect =
                      q.correct === true ||
                      (isAttempted &&
                        correctAns !== "—" &&
                        String(studentAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase());

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-xl border p-3.5 space-y-2 text-xs transition-colors",
                          !isAttempted
                            ? "border-muted-foreground/30 bg-muted/20"
                            : isCorrect
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-rose-500/30 bg-rose-500/5",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold flex items-center gap-1.5">
                            {!isAttempted ? (
                              <MinusCircle className="size-3.5 text-muted-foreground" />
                            ) : isCorrect ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="size-3.5 text-rose-500" />
                            )}
                            Question {qNum} {q.topic && <span className="font-normal text-muted-foreground">· {q.topic}</span>}
                          </span>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span>
                              Chosen:{" "}
                              <strong className={!isAttempted ? "text-muted-foreground italic font-normal" : undefined}>
                                {isAttempted ? studentAns : "Unattempted"}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              Correct: <strong>{correctAns}</strong>
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 px-1.5 ml-1",
                                !isAttempted
                                  ? "border-muted-foreground/40 text-muted-foreground"
                                  : isCorrect
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                                    : "border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold",
                              )}
                            >
                              {!isAttempted ? "Skipped" : isCorrect ? "Correct (+1)" : "Incorrect (+0)"}
                            </Badge>
                          </div>
                        </div>

                        {(q.question || q.stem_text) && (
                          <p className="text-foreground leading-relaxed font-sans">{q.question || q.stem_text}</p>
                        )}

                        {q.explanation && (
                          <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                            Reasoning: {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================================
 * TAB 3: LIVE EXAMINER SESSIONS VAULT
 * ============================================================================ */

function LiveExaminerVaultTab() {
  const fetchAllLive = useServerFn(adminListAllLiveExaminerSessions);
  const fetchLiveDetail = useServerFn(adminGetLiveExaminerSessionDetail);
  const liveQuery = useQuery({ queryKey: ["admin-all-live"], queryFn: () => fetchAllLive() });

  const [search, setSearch] = useState("");
  const [inspectSessionId, setInspectSessionId] = useState<string | null>(null);

  const liveDetailQuery = useQuery({
    queryKey: ["admin-live-detail", inspectSessionId],
    queryFn: () => fetchLiveDetail({ data: { sessionId: inspectSessionId! } }),
    enabled: Boolean(inspectSessionId),
  });

  const sessions = liveQuery.data ?? [];

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        (s.studentEmail && s.studentEmail.toLowerCase().includes(q)) ||
        s.question.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q)
      );
    });
  }, [sessions, search]);

  return (
    <div className="space-y-4">
      {/* KPI banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Live Examiner Sessions</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{sessions.length}</p>
          <p className="text-[11px] text-muted-foreground">Active and completed live writing runs</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Words Drafted</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-indigo-500">
            {sessions.reduce((acc, s) => acc + s.wordCount, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">Cumulative words typed under examiner supervision</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Suggestions Generated</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-500">
            {sessions.reduce((acc, s) => acc + s.issuesCount, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">Grammar, terminology, and AO points flagged</p>
        </div>
      </div>

      {/* Search & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, question, or topic..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => liveQuery.refetch()}
          disabled={liveQuery.isFetching}
        >
          <RefreshCw className={cn("size-3", liveQuery.isFetching && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Sessions list */}
      {liveQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <PenLine className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No Live Examiner sessions found</p>
          <p className="text-xs text-muted-foreground">Sessions will appear as students write essays in Live Examiner.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card/40 overflow-hidden shadow-sm">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {session.studentName}
                  </span>
                  {session.studentEmail && (
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      ({session.studentEmail})
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {session.level.toUpperCase()} · Max {session.maxMark}m
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">
                    Last active: {new Date(session.updatedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                <p className="text-xs font-medium text-foreground line-clamp-1">
                  {session.question}
                </p>

                <p className="text-[11px] text-muted-foreground line-clamp-2 italic font-serif">
                  &ldquo;{session.previewText || "Empty draft..."}&rdquo;
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-1">
                  <span>✍️ {session.wordCount} words</span>
                  <span>·</span>
                  <span>💡 {session.issuesCount} examiner points</span>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => setInspectSessionId(session.id)}
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Draft</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Live Draft Modal */}
      <Dialog open={Boolean(inspectSessionId)} onOpenChange={(open) => !open && setInspectSessionId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PenLine className="size-4 text-indigo-500" />
              Live Examiner Session Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live student writing buffer, word count, and real-time suggestion log.
            </DialogDescription>
          </DialogHeader>

          {liveDetailQuery.isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !liveDetailQuery.data?.session ? (
            <p className="text-sm text-muted-foreground py-6">Session details could not be loaded.</p>
          ) : (
            <div className="space-y-5 pt-2">
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Student: {liveDetailQuery.data.author.name}{" "}
                    {liveDetailQuery.data.author.email && (
                      <span className="font-mono text-muted-foreground">({liveDetailQuery.data.author.email})</span>
                    )}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {liveDetailQuery.data.session.level.toUpperCase()} · Max {liveDetailQuery.data.session.max_mark} marks
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {liveDetailQuery.data.session.question}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Live Draft Text:</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {liveDetailQuery.data.session.essay_text?.trim()
                      ? liveDetailQuery.data.session.essay_text.trim().split(/\s+/).length
                      : 0}{" "}
                    words
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 text-xs leading-relaxed font-serif whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {liveDetailQuery.data.session.essay_text || "No text written yet."}
                </div>
              </div>

              {/* Suggestions history */}
              {Array.isArray(liveDetailQuery.data.session.issues_history) &&
                liveDetailQuery.data.session.issues_history.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Suggestions Given ({liveDetailQuery.data.session.issues_history.length}):
                    </span>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {liveDetailQuery.data.session.issues_history.map((issue: any, idx: number) => (
                        <div key={idx} className="rounded-lg border border-border bg-card/60 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {issue.category || "Examiner Note"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              Status: {issue.status || "active"}
                            </span>
                          </div>
                          {issue.original && (
                            <p className="text-rose-500 font-mono text-[11px]">
                              Original: &ldquo;{issue.original}&rdquo;
                            </p>
                          )}
                          {issue.suggestion && (
                            <p className="text-emerald-500 font-mono text-[11px]">
                              Suggestion: &ldquo;{issue.suggestion}&rdquo;
                            </p>
                          )}
                          {issue.explanation && (
                            <p className="text-muted-foreground text-[11px]">{issue.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================================
 * TAB: LIVE RADAR & KEYSTROKE SURVEILLANCE
 * ============================================================================ */

function LiveRadarTab() {
  const fetchLiveMonitor = useServerFn(adminGetLiveUserMonitoring);
  const [pollInterval, setPollInterval] = useState<number>(3000);
  const [search, setSearch] = useState("");
  const [selectedUserForInspection, setSelectedUserForInspection] = useState<any | null>(null);

  const queryClient = useQueryClient();
  const monitorQuery = useQuery({
    queryKey: ["admin-live-user-monitoring"],
    queryFn: () => fetchLiveMonitor(),
    refetchInterval: pollInterval > 0 ? pollInterval : false,
  });

  const data = monitorQuery.data;
  const users = data?.users ?? [];
  const stats = data?.stats ?? { onlineCount: 0, currentlyTypingCount: 0, totalMonitored: 0 };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.school && u.school.toLowerCase().includes(q)) ||
        (u.screenDescription && u.screenDescription.toLowerCase().includes(q)) ||
        (u.activeDraft?.question && u.activeDraft.question.toLowerCase().includes(q)),
    );
  }, [users, search]);

  // Keep inspected user updated from live query data
  const inspectedLiveUser = useMemo(() => {
    if (!selectedUserForInspection) return null;
    return users.find((u) => u.userId === selectedUserForInspection.userId) || selectedUserForInspection;
  }, [users, selectedUserForInspection]);

  return (
    <div className="space-y-4">
      {/* KPI banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Online Students Right Now</p>
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-500">
            {stats.onlineCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Active heartbeats within last 2.5 minutes</p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Actively Typing Live Drafts</p>
            <PenLine className="size-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-indigo-500">
            {stats.currentlyTypingCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Writing in Essay Grader or Data Response right now</p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Total Monitored Sessions</p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {stats.totalMonitored}
          </p>
          <p className="text-[11px] text-muted-foreground">Students active within the last 2 hours</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, school, or current screen..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Radio className="size-3 text-emerald-500 animate-pulse" />
            <span>Radar:</span>
          </div>

          <Select value={String(pollInterval)} onValueChange={(v) => setPollInterval(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2000" className="text-xs">⚡ Live (2s poll)</SelectItem>
              <SelectItem value="5000" className="text-xs">Fast (5s poll)</SelectItem>
              <SelectItem value="15000" className="text-xs">Normal (15s poll)</SelectItem>
              <SelectItem value="0" className="text-xs">Paused</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => monitorQuery.refetch()}
            disabled={monitorQuery.isFetching}
          >
            <RefreshCw className={cn("size-3", monitorQuery.isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Users Radar List */}
      {monitorQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/20">
          <Radio className="mx-auto size-8 text-muted-foreground/60 animate-pulse" />
          <p className="text-sm font-medium">No active student sessions found</p>
          <p className="text-xs text-muted-foreground">
            {search ? "No students match your search query." : "When students open any platform feature, their screen and live keystrokes will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.userId}
              className={cn(
                "rounded-xl border p-4 transition-all space-y-3 bg-card/60",
                user.isTyping
                  ? "border-indigo-500/50 shadow-xs ring-1 ring-indigo-500/20 bg-indigo-500/5"
                  : user.isOnline
                  ? "border-emerald-500/30"
                  : "border-border/80 opacity-90",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{user.name}</span>
                    {user.email && (
                      <span className="text-xs font-mono text-muted-foreground">({user.email})</span>
                    )}
                    {user.school && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {user.school}
                      </Badge>
                    )}

                    {user.isOnline ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] h-4 gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online Now
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Seen {Math.round(user.secondsAgo / 60)}m ago
                      </span>
                    )}

                    {user.isTyping && (
                      <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] h-4 gap-1">
                        <PenLine className="size-2.5 animate-bounce" />
                        Typing Live Draft
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-xs font-medium text-foreground">
                      Facing Screen:
                    </span>
                    <Badge variant="secondary" className="text-xs font-medium gap-1.5 py-0.5 px-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {user.screenDescription}
                    </Badge>
                    {user.currentPath && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        ({user.currentPath})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant={user.isTyping ? "default" : "outline"}
                    size="sm"
                    className={cn("h-8 text-xs gap-1.5 shadow-xs", user.isTyping && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                    onClick={() => setSelectedUserForInspection(user)}
                  >
                    <Eye className="size-3.5" />
                    <span>Watch Keystrokes &amp; Screen</span>
                  </Button>
                </div>
              </div>

              {/* Live Draft Preview Snippet */}
              {user.activeDraft ? (
                <div className="rounded-lg border border-border/80 bg-background/80 p-3 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-b border-border/50 pb-1.5">
                    <span className="font-semibold text-foreground truncate max-w-md">
                      Q: {user.activeDraft.question}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>✍️ {user.activeDraft.wordCount} words</span>
                      <span>·</span>
                      <span>{user.activeDraft.charCount} chars</span>
                      <span>·</span>
                      <span className="text-[10px]">
                        Last keystroke: {new Date(user.activeDraft.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="font-serif italic text-foreground text-xs leading-relaxed line-clamp-2">
                    &ldquo;{user.activeDraft.text}&rdquo;
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Watch Keystrokes & Screen Dialog */}
      <Dialog
        open={Boolean(selectedUserForInspection)}
        onOpenChange={(open) => !open && setSelectedUserForInspection(null)}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Radio className="size-4 text-emerald-500 animate-pulse" />
                  Live Keystroke Mirror &amp; Student Screen
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Real-time mirror of student screen and live essay text input.
                </DialogDescription>
              </div>

              {inspectedLiveUser?.isOnline && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs gap-1">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Session Active
                </Badge>
              )}
            </div>
          </DialogHeader>

          {inspectedLiveUser ? (
            <div className="space-y-4 pt-2">
              {/* Student Metadata Card */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Student: {inspectedLiveUser.name}{" "}
                    {inspectedLiveUser.email && (
                      <span className="font-mono text-muted-foreground">({inspectedLiveUser.email})</span>
                    )}
                  </span>
                  {inspectedLiveUser.school && (
                    <Badge variant="outline" className="text-[10px]">
                      {inspectedLiveUser.school}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Currently on screen:</span>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {inspectedLiveUser.screenDescription}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {inspectedLiveUser.currentPath}
                  </span>
                </div>
              </div>

              {/* Active Draft Mirror */}
              {inspectedLiveUser.activeDraft ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Target Question:
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {inspectedLiveUser.activeDraft.question}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Live Keystroke Buffer:</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {inspectedLiveUser.activeDraft.feature === "data_response" ? "Data Response" : "Essay Grader"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <span className="text-foreground font-semibold">
                          ✍️ {inspectedLiveUser.activeDraft.wordCount} words
                        </span>
                        <span>·</span>
                        <span>{inspectedLiveUser.activeDraft.charCount} characters</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-4 text-xs font-serif leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto shadow-inner">
                      {inspectedLiveUser.activeDraft.text || (
                        <span className="text-muted-foreground italic font-sans">
                          Student hasn&apos;t started typing words into this buffer yet...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2 bg-muted/20">
                  <Eye className="mx-auto size-7 text-muted-foreground" />
                  <p className="text-xs font-medium">No active text draft detected for this user right now</p>
                  <p className="text-[11px] text-muted-foreground">
                    The student is viewing <span className="font-semibold">{inspectedLiveUser.screenDescription}</span>. Drafts will appear automatically when they start typing an essay.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================================
 * TAB: FAILED ESSAYS & 1-CLICK CAMBRIDGE FIXER
 * ============================================================================ */

function FailedEssaysTab() {
  const fetchFailures = useServerFn(adminListFailedEssays);
  const fixEssay = useServerFn(adminFixFailedEssay);
  const queryClient = useQueryClient();

  const failuresQuery = useQuery({
    queryKey: ["admin-failed-essays"],
    queryFn: () => fetchFailures(),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unfixed" | "resolved">("unfixed");
  const [selectedFailure, setSelectedFailure] = useState<any | null>(null);

  // Fix modal form states
  const [editQuestion, setEditQuestion] = useState("");
  const [editEssayText, setEditEssayText] = useState("");
  const [editMaxMark, setEditMaxMark] = useState("12");
  const [fixMode, setFixMode] = useState<"auto_cambridge" | "manual">("auto_cambridge");
  const [manualMark, setManualMark] = useState(8);
  const [manualStrengths, setManualStrengths] = useState("Clear economic definitions and logical sequencing.");
  const [manualImprovements, setManualImprovements] = useState("Deepen evaluation and include contextual real-world evidence.");
  const [notifyStudent, setNotifyStudent] = useState(true);

  const fixMutation = useMutation({
    mutationFn: (payload: any) => fixEssay({ data: payload }),
    onSuccess: () => {
      toast.success("Essay successfully graded, repaired, and assigned to student!");
      queryClient.invalidateQueries({ queryKey: ["admin-failed-essays"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-essays"] });
      setSelectedFailure(null);
    },
    onError: (err: any) => {
      toast.error(`Repair failed: ${err.message}`);
    },
  });

  const failures = failuresQuery.data ?? [];

  const filteredFailures = useMemo(() => {
    return failures.filter((f) => {
      if (filter === "unfixed" && f.resolved) return false;
      if (filter === "resolved" && !f.resolved) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        f.studentName.toLowerCase().includes(q) ||
        (f.studentEmail && f.studentEmail.toLowerCase().includes(q)) ||
        f.question.toLowerCase().includes(q) ||
        f.errorMessage.toLowerCase().includes(q)
      );
    });
  }, [failures, filter, search]);

  const openFixModal = (failure: any) => {
    setSelectedFailure(failure);
    setEditQuestion(failure.question || "Assess whether the benefits of inflation outweigh the costs for an economy.");
    setEditEssayText(failure.essayText || "");
    setEditMaxMark(String(failure.maxMark || 12));
    setFixMode("auto_cambridge");
  };

  const handleExecuteFix = () => {
    if (!selectedFailure) return;
    if (!editQuestion.trim()) {
      toast.error("Please provide the question.");
      return;
    }
    if (!editEssayText.trim()) {
      toast.error("Please provide the student's essay text to grade.");
      return;
    }

    const payload: any = {
      failureId: selectedFailure.id,
      targetUserId: selectedFailure.userId,
      question: editQuestion.trim(),
      essayText: editEssayText.trim(),
      maxMark: Number(editMaxMark) || 12,
      mode: fixMode,
      notifyStudent,
    };

    if (fixMode === "manual") {
      const maxM = Number(editMaxMark) || 12;
      const totalM = Math.min(maxM, Math.max(0, manualMark));
      payload.manualGrading = {
        totalMark: totalM,
        ao1Awarded: Math.round(totalM * 0.35),
        ao2Awarded: Math.round(totalM * 0.4),
        ao3Awarded: Math.round(totalM * 0.25),
        strengths: [manualStrengths.trim()],
        improvements: [manualImprovements.trim()],
      };
    }

    fixMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Wrench className="size-4 text-rose-500" />
              Failed Essay Submissions &amp; 1-Click Cambridge Repair
            </h3>
            <p className="text-xs text-muted-foreground">
              Every grading failure, rate-limit rejection, timeout, or unscored script across the platform is captured here.
              Inspect the student&apos;s full script and 1-click re-grade using root Cambridge Examiner privileges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="font-mono text-xs px-2.5 py-1">
              {failures.filter((f) => !f.resolved).length} Unfixed Failures
            </Badge>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, question, or error reason..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <Button
              type="button"
              variant={filter === "unfixed" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("unfixed")}
            >
              Unfixed Only
            </Button>
            <Button
              type="button"
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("all")}
            >
              All Events
            </Button>
            <Button
              type="button"
              variant={filter === "resolved" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("resolved")}
            >
              Repaired
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => failuresQuery.refetch()}
            disabled={failuresQuery.isFetching}
          >
            <RefreshCw className={cn("size-3", failuresQuery.isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Failures List */}
      {failuresQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredFailures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/20">
          <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
          <p className="text-sm font-medium">No failed essays found</p>
          <p className="text-xs text-muted-foreground">
            {filter === "unfixed"
              ? "All student essays across the platform are properly graded with no open errors!"
              : "No failed essays match your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card/40 overflow-hidden shadow-xs">
          {filteredFailures.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors",
                item.resolved && "opacity-75 bg-muted/10",
              )}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {item.studentName}
                  </span>
                  {item.studentEmail && (
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      ({item.studentEmail})
                    </span>
                  )}
                  {item.school && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {item.school}
                    </Badge>
                  )}

                  {item.resolved ? (
                    <Badge variant="outline" className="text-[10px] h-4 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                      Resolved / Repaired
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] h-4">
                      Open Failure
                    </Badge>
                  )}

                  <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">
                    {new Date(item.failedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                {item.question ? (
                  <p className="text-xs font-semibold text-foreground line-clamp-1">
                    Q: {item.question}
                  </p>
                ) : null}

                {/* Error reason */}
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                  <AlertTriangle className="size-3 shrink-0" />
                  <span className="truncate">{item.errorMessage}</span>
                </div>

                {item.essayText ? (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 italic font-serif">
                    &ldquo;{item.essayText}&rdquo;
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant={item.resolved ? "outline" : "default"}
                  size="sm"
                  className={cn("h-8 text-xs gap-1.5 shadow-xs", !item.resolved && "bg-rose-600 hover:bg-rose-700 text-white")}
                  onClick={() => openFixModal(item)}
                >
                  <Wrench className="size-3.5" />
                  <span>{item.resolved ? "Re-evaluate / Edit" : "Inspect & Fix Essay"}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repair Essay Modal */}
      <Dialog open={Boolean(selectedFailure)} onOpenChange={(open) => !open && setSelectedFailure(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="size-4 text-rose-500" />
              Cambridge Examiner Essay Recovery &amp; Repair
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fix and publish this essay directly into the student&apos;s portfolio.
            </DialogDescription>
          </DialogHeader>

          {selectedFailure ? (
            <div className="space-y-4 pt-2">
              {/* Student info & original error */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Target Student: {selectedFailure.studentName}{" "}
                    {selectedFailure.studentEmail && (
                      <span className="font-mono text-muted-foreground">({selectedFailure.studentEmail})</span>
                    )}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    User ID: {selectedFailure.userId.slice(0, 8)}...
                  </Badge>
                </div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-500 font-mono">
                  Failure Reason: {selectedFailure.errorMessage}
                </div>
              </div>

              {/* Question Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Essay Question:</Label>
                <Input
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  placeholder="Paste or enter the Cambridge economics question..."
                  className="text-xs h-9"
                />
              </div>

              {/* Max Mark */}
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold">Max Mark:</Label>
                <Select value={editMaxMark} onValueChange={setEditMaxMark}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2" className="text-xs">2 Marks</SelectItem>
                    <SelectItem value="4" className="text-xs">4 Marks</SelectItem>
                    <SelectItem value="6" className="text-xs">6 Marks</SelectItem>
                    <SelectItem value="8" className="text-xs">8 Marks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student Essay Script */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Student Essay Script:</Label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {editEssayText.trim() ? editEssayText.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <Textarea
                  value={editEssayText}
                  onChange={(e) => setEditEssayText(e.target.value)}
                  placeholder="Paste or edit the student's essay script..."
                  className="text-xs font-serif leading-relaxed h-44 max-h-60"
                />
              </div>

              {/* Repair Mode */}
              <div className="space-y-2 border-t border-border pt-3">
                <Label className="text-xs font-semibold block">Repair Mode:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFixMode("auto_cambridge")}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all space-y-1",
                      fixMode === "auto_cambridge"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card/40 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      <span>Auto-Fix with Cambridge AI</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Evaluates script via Gemini 3.8 Flash, awards AO1/AO2/AO3 marks &amp; creates full examiner report.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFixMode("manual")}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all space-y-1",
                      fixMode === "manual"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card/40 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <SlidersHorizontal className="size-3.5 text-primary" />
                      <span>Manual Mark Award</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Admin manually awards marks and enters examiner feedback directly.
                    </p>
                  </button>
                </div>
              </div>

              {/* Manual mode inputs */}
              {fixMode === "manual" && (
                <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-semibold">Total Mark Awarded:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={Number(editMaxMark) || 12}
                      value={manualMark}
                      onChange={(e) => setManualMark(Number(e.target.value))}
                      className="w-24 h-8 text-xs font-mono font-bold"
                    />
                    <span className="text-xs text-muted-foreground">/ {editMaxMark} Marks</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Strengths:</Label>
                    <Input
                      value={manualStrengths}
                      onChange={(e) => setManualStrengths(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Areas for Improvement:</Label>
                    <Input
                      value={manualImprovements}
                      onChange={(e) => setManualImprovements(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              )}

              {/* Notify toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyStudent"
                  checked={notifyStudent}
                  onChange={(e) => setNotifyStudent(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                <label htmlFor="notifyStudent" className="text-xs text-foreground cursor-pointer select-none">
                  Automatically send direct notification message to student that their essay has been graded &amp; repaired
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => setSelectedFailure(null)}
                  disabled={fixMutation.isPending}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  onClick={handleExecuteFix}
                  disabled={fixMutation.isPending}
                >
                  {fixMutation.isPending ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Grading &amp; Repairing Script...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Publish Repaired Essay to Student</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================================
 * TAB: OMNISCIENT PLATFORM ACTIVITY STREAM
 * ============================================================================ */

function PlatformActivityTab() {
  const fetchActivity = useServerFn(adminGetPlatformActivityFeed);
  const [pollInterval, setPollInterval] = useState<number>(10000);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const activityQuery = useQuery({
    queryKey: ["admin-platform-activity-feed"],
    queryFn: () => fetchActivity(),
    refetchInterval: pollInterval > 0 ? pollInterval : false,
  });

  const data = activityQuery.data;
  const events = data?.events ?? [];
  const stats = data?.stats ?? {
    eventsToday: 0,
    errorsToday: 0,
    successRate: 100,
    activeUsersToday: 0,
    avgLatency: null,
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (categoryFilter === "errors" && ev.ok) return false;
      if (categoryFilter === "essays" && !ev.feature.includes("grade_essay")) return false;
      if (categoryFilter === "messages" && ev.feature !== "DIRECT_MESSAGE") return false;
      if (categoryFilter === "chat" && ev.feature !== "chat") return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        ev.userName.toLowerCase().includes(q) ||
        (ev.userEmail && ev.userEmail.toLowerCase().includes(q)) ||
        ev.feature.toLowerCase().includes(q) ||
        (ev.error && ev.error.toLowerCase().includes(q))
      );
    });
  }, [events, categoryFilter, search]);

  return (
    <div className="space-y-4">
      {/* Activity KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Events Today</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {stats.eventsToday}
          </p>
          <p className="text-[11px] text-muted-foreground">Total platform actions recorded</p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Platform Success Rate</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-500">
            {stats.successRate}%
          </p>
          <p className="text-[11px] text-muted-foreground">{stats.errorsToday} errors logged today</p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Active Students Today</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-indigo-500">
            {stats.activeUsersToday}
          </p>
          <p className="text-[11px] text-muted-foreground">Distinct users executing features</p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Avg AI Latency</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {stats.avgLatency !== null ? `${stats.avgLatency}ms` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">End-to-end response time</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity stream by user, feature, or error..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <Button
              type="button"
              variant={categoryFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "errors" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2 text-rose-500"
              onClick={() => setCategoryFilter("errors")}
            >
              Errors Only
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "essays" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setCategoryFilter("essays")}
            >
              Essays
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "messages" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setCategoryFilter("messages")}
            >
              Messages
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "chat" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setCategoryFilter("chat")}
            >
              Chat
            </Button>
          </div>

          <Select value={String(pollInterval)} onValueChange={(v) => setPollInterval(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5000" className="text-xs">Poll: 5s</SelectItem>
              <SelectItem value="10000" className="text-xs">Poll: 10s</SelectItem>
              <SelectItem value="30000" className="text-xs">Poll: 30s</SelectItem>
              <SelectItem value="0" className="text-xs">Paused</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => activityQuery.refetch()}
            disabled={activityQuery.isFetching}
          >
            <RefreshCw className={cn("size-3", activityQuery.isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Events Stream */}
      {activityQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/20">
          <Activity className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No activity logged yet</p>
          <p className="text-xs text-muted-foreground">Platform events will appear here in real time as students and teachers interact.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card/40 overflow-hidden shadow-xs">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors",
                !ev.ok && "bg-rose-500/5",
              )}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="mt-0.5 shrink-0">
                  {ev.ok ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                      <XCircle className="size-3.5" />
                    </span>
                  )}
                </span>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground truncate">{ev.summary}</span>
                    <Badge variant="outline" className="text-[10px] h-4 font-mono">
                      {ev.feature}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      · {ev.userName} {ev.userEmail ? `(${ev.userEmail})` : ""}
                    </span>
                  </div>

                  {ev.error && (
                    <p className="text-[11px] font-mono text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded p-1.5 line-clamp-2">
                      Error: {ev.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono text-[11px] text-muted-foreground">
                {ev.latencyMs && (
                  <span className="text-indigo-500 font-semibold">{ev.latencyMs}ms</span>
                )}
                <span>{new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * TAB 4: 360° STUDENT DOSSIER (REFLECTS ALL REGISTERED PLATFORM USERS)
 * ============================================================================ */

function StudentDossierTab() {
  const queryClient = useQueryClient();
  const fetchAllDossierUsers = useServerFn(adminListAllDossierUsers);
  const fetchDossier = useServerFn(adminGetStudentDossier);
  const deleteMcq = useServerFn(adminDeleteMcqAttempt);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "has_essays" | "has_mcq" | "teachers">("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const usersQuery = useQuery({
    queryKey: ["admin-all-dossier-users"],
    queryFn: () => fetchAllDossierUsers(),
  });

  const allUsers = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (filter === "online" && !u.isOnline) return false;
      if (filter === "has_essays" && u.totalEssays === 0) return false;
      if (filter === "has_mcq" && u.totalMcqs === 0) return false;
      if (filter === "teachers" && u.role !== "teacher") return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.school && u.school.toLowerCase().includes(q))
      );
    });
  }, [allUsers, filter, search]);

  const dossierQuery = useQuery({
    queryKey: ["admin-student-dossier", selectedStudentId],
    queryFn: () => fetchDossier({ data: { userId: selectedStudentId } }),
    enabled: Boolean(selectedStudentId),
  });

  return (
    <div className="space-y-5">
      {/* User Selector Header Card */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              Platform 360° User Dossier &amp; Academic Record
            </h3>
            <p className="text-xs text-muted-foreground">
              Reflecting all registered users ({allUsers.length} total across the entire platform): inspect written essays, past paper MCQ attempts, live writing sessions, and classroom memberships.
            </p>
          </div>

          <Badge variant="outline" className="self-start sm:self-center font-mono text-xs">
            {allUsers.length} Total Users Available
          </Badge>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter users by name, email, or school..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <Button
              type="button"
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("all")}
            >
              All Users ({allUsers.length})
            </Button>
            <Button
              type="button"
              variant={filter === "online" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400 font-semibold"
              onClick={() => setFilter("online")}
            >
              Online ({allUsers.filter((u) => u.isOnline).length})
            </Button>
            <Button
              type="button"
              variant={filter === "has_essays" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("has_essays")}
            >
              Has Essays ({allUsers.filter((u) => u.totalEssays > 0).length})
            </Button>
            <Button
              type="button"
              variant={filter === "has_mcq" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter("has_mcq")}
            >
              Has MCQs ({allUsers.filter((u) => u.totalMcqs > 0).length})
            </Button>
          </div>
        </div>

        {/* User Selection Dropdown */}
        <div className="max-w-xl">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="text-xs h-10">
              <SelectValue placeholder="Choose any student or teacher from all platform users..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredUsers.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs py-2">
                  <div className="flex items-center gap-2">
                    {u.isOnline ? (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    ) : (
                      <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    )}
                    <span className="font-semibold text-foreground">{u.name}</span>
                    {u.email && (
                      <span className="font-mono text-[11px] text-muted-foreground">({u.email})</span>
                    )}
                    {u.school && (
                      <span className="text-[10px] text-muted-foreground">· {u.school}</span>
                    )}
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-auto font-mono">
                      {u.totalEssays} essays · {u.totalMcqs} mcqs
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dossier Content */}
      {!selectedStudentId ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/20">
          <GraduationCap className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Select a student or teacher above</p>
          <p className="text-xs text-muted-foreground">All {allUsers.length} platform users are loaded and ready to inspect in full 360° depth.</p>
        </div>
      ) : dossierQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !dossierQuery.data ? (
        <p className="text-sm text-muted-foreground">Could not load student dossier.</p>
      ) : (
        <div className="space-y-5">
          {/* Student Profile Card */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {dossierQuery.data.profile.fullName || "Student"}{" "}
                  </h3>
                  {dossierQuery.data.profile.email && (
                    <span className="font-mono text-xs text-muted-foreground">
                      ({dossierQuery.data.profile.email})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dossierQuery.data.profile.school ? `School: ${dossierQuery.data.profile.school} · ` : ""}
                  Joined:{" "}
                  {dossierQuery.data.profile.createdAt
                    ? new Date(dossierQuery.data.profile.createdAt).toLocaleDateString()
                    : "—"}
                  {dossierQuery.data.profile.lastSignInAt && (
                    <span> · Last sign in: {new Date(dossierQuery.data.profile.lastSignInAt).toLocaleString()}</span>
                  )}
                </p>
              </div>

              {(dossierQuery.data?.classrooms ?? []).length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Enrolled in:</span>
                  {(dossierQuery.data?.classrooms ?? []).map((c: any) => (
                    <Badge key={c.id} variant="secondary" className="text-[10px]">
                      {c.name} ({c.level})
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  No Classrooms
                </Badge>
              )}
            </div>

            {/* Performance KPIs */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Essays Marked</span>
                <p className="text-xl font-bold tabular-nums">{dossierQuery.data?.stats?.totalEssays ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">
                  Avg: {dossierQuery.data?.stats?.avgEssayPercent !== null && dossierQuery.data?.stats?.avgEssayPercent !== undefined ? `${dossierQuery.data.stats.avgEssayPercent}%` : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">MCQ Tests Taken</span>
                <p className="text-xl font-bold tabular-nums">{dossierQuery.data?.stats?.totalMcqs ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">
                  Accuracy: {dossierQuery.data?.stats?.avgMcqPercent !== null && dossierQuery.data?.stats?.avgMcqPercent !== undefined ? `${dossierQuery.data.stats.avgMcqPercent}%` : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Total MCQs Answered</span>
                <p className="text-xl font-bold tabular-nums text-emerald-500">
                  {dossierQuery.data?.stats?.totalMcqCorrect ?? 0} / {dossierQuery.data?.stats?.totalMcqQuestions ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Questions answered correctly</p>
              </div>
            </div>
          </div>

          {/* Detailed Lists */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Student's Essays */}
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Essays Written ({(dossierQuery.data?.essays ?? []).length})</span>
              </h4>
              {(dossierQuery.data?.essays ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No essays submitted yet.</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {(dossierQuery.data?.essays ?? []).map((e: any) => (
                    <div key={e.id} className="py-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate max-w-xs">{e.question}</span>
                        <span className="font-bold tabular-nums shrink-0">
                          {e.latest_mark !== null ? `${e.latest_mark}/${e.max_mark}` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{new Date(e.created_at).toLocaleDateString()}</span>
                        <Link
                          to="/essay/$essayId"
                          params={{ essayId: e.id }}
                          target="_blank"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View Report <ExternalLink className="size-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student's MCQ Attempts */}
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>MCQ Attempts ({(dossierQuery.data?.mcqAttempts ?? []).length})</span>
              </h4>
              {(dossierQuery.data?.mcqAttempts ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No MCQ attempts completed yet.</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {(dossierQuery.data?.mcqAttempts ?? []).map((m: any) => (
                    <div key={m.id} className="py-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate max-w-xs">{m.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold tabular-nums text-emerald-500">
                            {m.score !== null ? `${m.score}/${m.total}` : "—"}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                            title="Delete this MCQ score"
                            onClick={async () => {
                              if (window.confirm(`Delete MCQ score for "${m.title}"?`)) {
                                try {
                                  await deleteMcq({ data: { id: m.id, kind: m.kind ?? "past_paper" } });
                                  toast.success("MCQ score deleted.");
                                  dossierQuery.refetch();
                                  queryClient.invalidateQueries({ queryKey: ["admin-all-mcqs"] });
                                } catch (e: any) {
                                  toast.error(e.message || "Failed to delete score.");
                                }
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {m.kind === "past_paper" ? "Past Paper" : "Topic Practice"} ·{" "}
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                        <span>{m.score !== null && m.total > 0 ? `${Math.round((m.score / m.total) * 100)}%` : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
