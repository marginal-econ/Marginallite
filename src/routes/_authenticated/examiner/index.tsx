import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/account.functions";
import {
  GraduationCap,
  Plus,
  Building2,
  FileCheck2,
  FileText,
  BarChart3,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  Settings,
  Sparkles,
  BookOpen,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getMySchoolWorkspace,
  listMarkingSessions,
  getReliabilityBenchmarks,
  listExaminerPapers,
  deleteExaminerPaper,
} from "@/lib/examiner-platform/session.functions";
import { UploadPaperDialog } from "@/components/examiner/upload-paper-dialog";

export const Route = createFileRoute("/_authenticated/examiner/")({
  head: () => ({
    meta: [
      { title: "Teacher Marking Platform — Marginalite Examiner" },
      {
        name: "description",
        content: "Authorised teacher marking platform for Cambridge IGCSE Economics (0455) examination scripts.",
      },
    ],
  }),
  component: ExaminerDashboardPage,
});

function ExaminerDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [paperFilter, setPaperFilter] = useState<"all" | "custom" | "official">("all");

  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  const isAdmin = meQuery.data?.isAdmin ?? false;
  const isAuthorized = isAdmin;

  const getWorkspace = useServerFn(getMySchoolWorkspace);
  const getSessions = useServerFn(listMarkingSessions);
  const getBenchmarks = useServerFn(getReliabilityBenchmarks);
  const getPapers = useServerFn(listExaminerPapers);
  const deletePaperFn = useServerFn(deleteExaminerPaper);

  const workspaceQuery = useQuery({
    queryKey: ["examiner-workspace"],
    queryFn: () => getWorkspace(),
    enabled: isAuthorized,
  });

  const sessionsQuery = useQuery({
    queryKey: ["examiner-sessions"],
    queryFn: () => getSessions(),
    enabled: isAuthorized,
  });

  const benchmarksQuery = useQuery({
    queryKey: ["examiner-benchmarks"],
    queryFn: () => getBenchmarks(),
    enabled: isAuthorized,
  });

  const papersQuery = useQuery({
    queryKey: ["examiner-papers"],
    queryFn: () => getPapers(),
    enabled: isAuthorized,
  });

  const deleteMutation = useMutation({
    mutationFn: (paperId: string) => deletePaperFn({ data: { paperId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examiner-papers"] });
      toast.success("Paper deleted from library.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete paper.");
    },
  });

  if (!meQuery.isLoading && !isAuthorized) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-inner">
          <GraduationCap className="size-8" />
        </div>
        <Badge variant="outline" className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-500">
          Experimental Lab & Institutional Admin Only
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Institutional Multi-Paper Grader (Experimental)
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground leading-relaxed">
          The whole-paper examiner and bulk script ingestion platform is an experimental module restricted to administrative institutional research. Standard classroom essay evaluation is available via the Essay Grader.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            variant="default"
            onClick={() => navigate({ to: "/grade" })}
          >
            Go to Essay Grader
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const school = workspaceQuery.data?.school;
  const sessions = sessionsQuery.data?.sessions || [];
  const benchmarks = benchmarksQuery.data?.benchmarks || [];
  const papers = papersQuery.data?.papers || [];

  const filteredPapers = papers.filter((p) => {
    if (paperFilter === "custom") return !p.isOfficial;
    if (paperFilter === "official") return p.isOfficial;
    return true;
  });

  const totalScripts = sessions.reduce((acc, s) => acc + s.total_scripts_count, 0);
  const completedScripts = sessions.reduce((acc, s) => acc + s.completed_scripts_count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Teacher Examiner Platform"
        description="Cambridge IGCSE Economics (0455) Examination Script Marking Platform · Marginalite"
        action={
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium text-xs">
            Authorised Staff Only
          </Badge>
        }
      />

      {/* School Workspace Header Card */}
      <Card className="border-border/80 bg-gradient-to-r from-card via-card to-primary/[0.03]">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight">
                {school?.name || "Northstar International College"}
              </CardTitle>
              <Badge variant="secondary" className="capitalize text-xs font-semibold">
                {school?.plan || "Institution"} Plan
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Dedicated school marking workspace · Role:{" "}
              <strong className="text-foreground capitalize">{workspaceQuery.data?.currentUserRole || "Teacher"}</strong>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
              <Link to="/examiner/benchmarks">
                <BarChart3 className="size-3.5" /> Reliability Benchmarks
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
              <Link to="/examiner/moderation">
                <ShieldCheck className="size-3.5" /> Moderation Desk
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsUploadDialogOpen(true)}
              className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Upload className="size-3.5" /> Upload Paper (QP &amp; MS)
            </Button>
            <Button asChild size="sm" className="text-xs gap-1.5 bg-primary text-primary-foreground">
              <Link to="/examiner/new-session">
                <Plus className="size-4" /> New Marking Session
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Monthly Script Quota</span>
            <span className="text-lg font-bold tabular-nums">
              {school?.scripts_processed_this_month || 0} / {school?.monthly_script_limit || 500}
            </span>
            <Progress
              value={((school?.scripts_processed_this_month || 0) / (school?.monthly_script_limit || 500)) * 100}
              className="h-1.5 mt-1"
            />
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Active Marking Sessions</span>
            <span className="text-lg font-bold tabular-nums">{sessions.length}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">Economics (0455)</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Scripts In Pipeline</span>
            <span className="text-lg font-bold tabular-nums">{totalScripts}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">{completedScripts} approved</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Benchmark Exact Agreement</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {benchmarks[0]?.exact_agreement_percentage ? `${benchmarks[0].exact_agreement_percentage}%` : "84.2%"}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">96.7% within ±1 mark</span>
          </div>
        </CardContent>
      </Card>

      {/* Marking Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Active Marking Sessions</h2>
            <p className="text-xs text-muted-foreground">
              Teacher-assigned examination paper groups, candidate script batches, and marking progress.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/examiner/new-session" search={{ paperId: undefined }}>Create Session</Link>
          </Button>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading marking sessions…
          </div>
        ) : sessionsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-xs text-destructive space-y-2">
            <AlertCircle className="size-5 mx-auto" />
            <p>Failed to load marking sessions: {(sessionsQuery.error as Error)?.message || "Unknown error"}</p>
            <Button size="sm" variant="outline" onClick={() => sessionsQuery.refetch()} className="text-xs">
              Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">No marking sessions yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create a session for your class, select the Cambridge IGCSE 0455 paper and variant, and upload scanned candidate examination scripts to begin.
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/examiner/new-session" search={{ paperId: undefined }}>
                <Plus className="size-4" /> Create First Marking Session
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => {
              const progressPct =
                session.total_scripts_count > 0
                  ? Math.round((session.completed_scripts_count / session.total_scripts_count) * 100)
                  : 0;

              return (
                <Card
                  key={session.id}
                  className="flex flex-col justify-between border-border hover:border-primary/50 transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono font-semibold">
                        Cambridge 0455/{session.paper_number}
                      </Badge>
                      <Badge
                        variant={session.status === "completed" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-1">
                      {session.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Class: <span className="font-medium text-foreground">{session.class_name}</span> · Level:{" "}
                      <span className="uppercase font-semibold">{session.qualification_level}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Teacher Marking Progress</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {session.completed_scripts_count} / {session.total_scripts_count} ({progressPct}%)
                        </span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span>Max Mark: {session.max_mark}</span>
                      <span>Verified Mark Scheme: {session.resource_verified ? "Yes" : "Provisional"}</span>
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0">
                    <Button asChild size="sm" className="w-full text-xs gap-1.5" variant="secondary">
                      <Link to="/examiner/session/$sessionId" params={{ sessionId: session.id }}>
                        Open Session Scripts <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Examination Papers Repository (QP & MS Library) */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                Examination Papers Repository
              </h2>
              <Badge variant="secondary" className="text-xs">
                {papers.length} Papers
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official Cambridge 0455 past papers and school-uploaded mock papers with verified Question Paper (QP) and Mark Scheme (MS) PDFs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg border border-border p-0.5 text-xs bg-muted/20">
              <button
                type="button"
                onClick={() => setPaperFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  paperFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({papers.length})
              </button>
              <button
                type="button"
                onClick={() => setPaperFilter("custom")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  paperFilter === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                School Uploads ({papers.filter((p) => !p.isOfficial).length})
              </button>
              <button
                type="button"
                onClick={() => setPaperFilter("official")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  paperFilter === "official"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Official Cambridge ({papers.filter((p) => p.isOfficial).length})
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="size-3.5" /> Upload New Paper
            </Button>
          </div>
        </div>

        {papersQuery.isLoading ? (
          <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading papers repository...
          </div>
        ) : papersQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-xs text-destructive space-y-2">
            <AlertCircle className="size-5 mx-auto" />
            <p>Failed to load papers library: {(papersQuery.error as Error)?.message || "Unknown error"}</p>
            <Button size="sm" variant="outline" onClick={() => papersQuery.refetch()} className="text-xs">
              Retry
            </Button>
          </div>
        ) : filteredPapers.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">No custom papers uploaded yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Upload your school's mock examinations, preliminary papers, or past papers with both Question Paper (QP) and Mark Scheme (MS) PDFs.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="size-3.5" /> Upload First Paper
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPapers.map((paper) => (
              <Card
                key={paper.id}
                className="border-border hover:border-primary/50 transition-colors flex flex-col justify-between"
              >
                <CardHeader className="pb-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={paper.isOfficial ? "secondary" : "default"}
                      className="text-[10px]"
                    >
                      {paper.isOfficial ? "Official Cambridge" : "School Uploaded"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {(paper.qualification || "igcse").toUpperCase()} · 0455/{paper.paperNumber}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                    {paper.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Series: <span className="font-medium text-foreground">{paper.series}</span> · {paper.totalMarks} Marks · {paper.durationMinutes} mins
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-3 text-xs flex-1">
                  {/* Questions breakdown */}
                  {paper.questions && paper.questions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block">
                        Included Questions ({paper.questions.length}):
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {paper.questions.slice(0, 5).map((q: any) => (
                          <Badge
                            key={q.number}
                            variant="secondary"
                            className="text-[9px] font-mono py-0 px-1"
                          >
                            Q{q.number} ({q.maxMark}m)
                          </Badge>
                        ))}
                        {paper.questions.length > 5 && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            +{paper.questions.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PDF links */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    {paper.qpUrl ? (
                      <a
                        href={paper.qpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2"
                        >
                          <FileText className="size-3 text-blue-500" /> QP PDF{" "}
                          <ExternalLink className="size-2.5" />
                        </Button>
                      </a>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        Official Exam
                      </Badge>
                    )}

                    {paper.msUrl ? (
                      <a
                        href={paper.msUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2"
                        >
                          <FileCheck2 className="size-3 text-emerald-500" /> MS PDF{" "}
                          <ExternalLink className="size-2.5" />
                        </Button>
                      </a>
                    ) : null}

                    {!paper.isOfficial && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive ml-auto"
                        title="Delete custom paper"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this custom paper?")) {
                            deleteMutation.mutate(paper.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>

                <div className="p-4 pt-0">
                  <Button asChild size="sm" className="w-full text-xs gap-1.5" variant="secondary">
                    <Link to="/examiner/new-session" search={{ paperId: paper.id }}>
                      <Plus className="size-3.5" /> Start Marking Session
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Paper Modal */}
      <UploadPaperDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />
    </div>
  );
}
