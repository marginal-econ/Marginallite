import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
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
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

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
  adminGetEssayDetail,
  adminGetMcqAttemptDetail,
  adminGetStudentDossier,
  adminListAllEssays,
  adminListAllMcqAttempts,
} from "@/lib/admin.functions";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { cn } from "@/lib/utils";

export function AdminGodmodeDashboard() {
  const [subTab, setSubTab] = useState<"essays" | "mcq" | "dossier">("essays");

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
                God-Mode Platform Vault &amp; Inspector
              </h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                ROOT ACCESS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Inspect any student&apos;s written essays, full Cambridge examiner rubrics, past paper MCQ attempts,
              and 360° student dossiers across the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Vault Navigation Tabs */}
      <Tabs value={subTab} onValueChange={(val) => setSubTab(val as typeof subTab)}>
        <TabsList className="grid grid-cols-3 w-full h-auto p-1 bg-muted/60 border border-border">
          <TabsTrigger value="essays" className="py-2.5 text-xs font-medium gap-2">
            <FileText className="size-3.5 text-primary" />
            <span>Essays Vault</span>
          </TabsTrigger>
          <TabsTrigger value="mcq" className="py-2.5 text-xs font-medium gap-2">
            <Target className="size-3.5 text-emerald-500" />
            <span>MCQ Papers &amp; Attempts</span>
          </TabsTrigger>
          <TabsTrigger value="dossier" className="py-2.5 text-xs font-medium gap-2">
            <User className="size-3.5 text-amber-500" />
            <span>Student 360° Dossier</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="essays" className="mt-4">
          {subTab === "essays" && <EssaysVaultTab />}
        </TabsContent>

        <TabsContent value="mcq" className="mt-4">
          {subTab === "mcq" && <McqVaultTab />}
        </TabsContent>

        <TabsContent value="dossier" className="mt-4">
          {subTab === "dossier" && <StudentDossierTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================================
 * TAB 1: ESSAYS VAULT
 * ============================================================================ */

function EssaysVaultTab() {
  const fetchAllEssays = useServerFn(adminListAllEssays);
  const fetchEssayDetail = useServerFn(adminGetEssayDetail);
  const essaysQuery = useQuery({ queryKey: ["admin-all-essays"], queryFn: () => fetchAllEssays() });

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
        e.studentName.toLowerCase().includes(q) ||
        (e.studentEmail && e.studentEmail.toLowerCase().includes(q)) ||
        e.question.toLowerCase().includes(q) ||
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
                  Versions &amp; Reports ({essayDetailQuery.data.versions.length})
                </h4>

                {essayDetailQuery.data.versions.map((ver: any) => (
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
                    {ver.grading && typeof ver.grading === "object" && ver.grading.strengths ? (
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-muted-foreground block mb-2">
                          Cambridge Examiner Breakdown:
                        </span>
                        <MarkBreakdown grading={ver.grading} />
                      </div>
                    ) : null}
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
  const fetchAllMcqs = useServerFn(adminListAllMcqAttempts);
  const fetchMcqDetail = useServerFn(adminGetMcqAttemptDetail);
  const mcqsQuery = useQuery({ queryKey: ["admin-all-mcqs"], queryFn: () => fetchAllMcqs() });

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "generated" | "past_paper">("all");
  const [inspectTarget, setInspectTarget] = useState<{ id: string; kind: "generated" | "past_paper" } | null>(null);

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
              </div>
            </div>
          ))}
        </div>
      )}

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
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">
                      Score: {mcqDetailQuery.data.attempt.score ?? 0} / {mcqDetailQuery.data.attempt.total}
                    </Badge>
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
                      mcqDetailQuery.data.kind === "generated"
                        ? mcqDetailQuery.data.attempt.answers?.[String(qNum)]
                        : q.user_answer;
                    const correctAns =
                      mcqDetailQuery.data.kind === "generated" ? q.answer : q.correct_answer;
                    const isCorrect =
                      mcqDetailQuery.data.kind === "generated"
                        ? studentAns === correctAns
                        : Boolean(q.correct);

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-xl border p-3.5 space-y-2 text-xs transition-colors",
                          isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold flex items-center gap-1.5">
                            {isCorrect ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="size-3.5 text-rose-500" />
                            )}
                            Question {qNum} {q.topic && <span className="font-normal text-muted-foreground">· {q.topic}</span>}
                          </span>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span>
                              Chosen: <strong>{studentAns || "—"}</strong>
                            </span>
                            <span>·</span>
                            <span>
                              Correct: <strong>{correctAns}</strong>
                            </span>
                          </div>
                        </div>

                        {q.question && (
                          <p className="text-foreground leading-relaxed font-sans">{q.question}</p>
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
 * TAB 3: 360° STUDENT DOSSIER
 * ============================================================================ */

function StudentDossierTab() {
  const fetchAllEssays = useServerFn(adminListAllEssays);
  const fetchDossier = useServerFn(adminGetStudentDossier);
  const essaysQuery = useQuery({ queryKey: ["admin-all-essays"], queryFn: () => fetchAllEssays() });

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Build unique students list
  const students = useMemo(() => {
    const list = essaysQuery.data ?? [];
    const map = new Map<string, { id: string; name: string; email: string | null; school: string | null }>();
    for (const e of list) {
      if (!map.has(e.userId)) {
        map.set(e.userId, {
          id: e.userId,
          name: e.studentName,
          email: e.studentEmail,
          school: e.school,
        });
      }
    }
    return Array.from(map.values());
  }, [essaysQuery.data]);

  const dossierQuery = useQuery({
    queryKey: ["admin-student-dossier", selectedStudentId],
    queryFn: () => fetchDossier({ data: { userId: selectedStudentId } }),
    enabled: Boolean(selectedStudentId),
  });

  return (
    <div className="space-y-5">
      {/* Student Selector Card */}
      <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="size-4 text-primary" />
          Select a Student to Inspect Complete Dossier
        </h3>
        <p className="text-xs text-muted-foreground">
          View all work ever completed by a student in one place: all written essays, past paper MCQ test attempts,
          live writing sessions, and classroom memberships.
        </p>

        <div className="max-w-md pt-1">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Choose a student..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name} {s.email ? `(${s.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dossier Content */}
      {!selectedStudentId ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <GraduationCap className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No student selected</p>
          <p className="text-xs text-muted-foreground">Select a student from the dropdown above to load their full record.</p>
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
                <h3 className="text-base font-bold text-foreground">
                  {dossierQuery.data.profile.fullName || "Student"}{" "}
                  {dossierQuery.data.profile.email && (
                    <span className="font-mono text-xs text-muted-foreground">
                      ({dossierQuery.data.profile.email})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {dossierQuery.data.profile.school ? `School: ${dossierQuery.data.profile.school} · ` : ""}
                  Joined:{" "}
                  {dossierQuery.data.profile.createdAt
                    ? new Date(dossierQuery.data.profile.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>

              {dossierQuery.data.classrooms.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Enrolled in:</span>
                  {dossierQuery.data.classrooms.map((c: any) => (
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Essays Marked</span>
                <p className="text-xl font-bold tabular-nums">{dossierQuery.data.stats.totalEssays}</p>
                <p className="text-[10px] text-muted-foreground">
                  Avg: {dossierQuery.data.stats.avgEssayPercent !== null ? `${dossierQuery.data.stats.avgEssayPercent}%` : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">MCQ Tests Taken</span>
                <p className="text-xl font-bold tabular-nums">{dossierQuery.data.stats.totalMcqs}</p>
                <p className="text-[10px] text-muted-foreground">
                  Accuracy: {dossierQuery.data.stats.avgMcqPercent !== null ? `${dossierQuery.data.stats.avgMcqPercent}%` : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Total MCQs Answered</span>
                <p className="text-xl font-bold tabular-nums text-emerald-500">
                  {dossierQuery.data.stats.totalMcqCorrect} / {dossierQuery.data.stats.totalMcqQuestions}
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
                <span>Essays Written ({dossierQuery.data.essays.length})</span>
              </h4>
              {dossierQuery.data.essays.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No essays submitted yet.</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {dossierQuery.data.essays.map((e: any) => (
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
                <span>MCQ Attempts ({dossierQuery.data.mcqAttempts.length})</span>
              </h4>
              {dossierQuery.data.mcqAttempts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No MCQ attempts completed yet.</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {dossierQuery.data.mcqAttempts.map((m: any) => (
                    <div key={m.id} className="py-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate max-w-xs">{m.title}</span>
                        <span className="font-bold tabular-nums shrink-0 text-emerald-500">
                          {m.score !== null ? `${m.score}/${m.total}` : "—"}
                        </span>
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
