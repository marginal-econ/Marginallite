import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  FileCheck2,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMarkingSessionDetails,
  processScriptAiMarking,
} from "@/lib/examiner-platform/session.functions";
import type { CandidateScript } from "@/lib/examiner-platform/types";

export const Route = createFileRoute("/_authenticated/examiner/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Marking Session — Marginalite Examiner" },
      {
        name: "description",
        content: "Batch candidate script processing and teacher review queue.",
      },
    ],
  }),
  component: SessionDetailsPage,
});

function SessionDetailsPage() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const getSessionFn = useServerFn(getMarkingSessionDetails);
  const processScriptFn = useServerFn(processScriptAiMarking);

  const sessionQuery = useQuery({
    queryKey: ["examiner-session-detail", sessionId],
    queryFn: () => getSessionFn({ data: { sessionId } }),
  });

  const processMutation = useMutation({
    mutationFn: (scriptId: string) => processScriptFn({ data: { scriptId } }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["examiner-session-detail", sessionId] });
      toast.success(`Candidate ${data.script.candidate_code} marked successfully!`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process script.");
    },
  });

  const session = sessionQuery.data?.session;
  const scripts = sessionQuery.data?.scripts || [];

  const queuedCount = scripts.filter((s) => s.status === "queued").length;
  const readyCount = scripts.filter((s) => s.status === "ready_for_review").length;
  const approvedCount = scripts.filter((s) => s.status === "teacher_approved").length;

  const handleProcessAllQueued = async () => {
    const queued = scripts.filter((s) => s.status === "queued");
    if (queued.length === 0) return;
    toast.info(`Processing ${queued.length} scripts sequentially...`);

    for (const script of queued) {
      try {
        await processMutation.mutateAsync(script.id);
      } catch {
        // Continue with next
      }
    }
  };

  const getStatusBadge = (status: CandidateScript["status"]) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary" className="text-[10px]">Queued</Badge>;
      case "ocr_processing":
        return (
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10 gap-1">
            <Loader2 className="size-3 animate-spin" /> Reading Handwriting
          </Badge>
        );
      case "marking":
        return (
          <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600 bg-blue-500/10 gap-1">
            <Loader2 className="size-3 animate-spin" /> Cambridge Marking
          </Badge>
        );
      case "verification":
        return (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10 gap-1">
            <Loader2 className="size-3 animate-spin" /> Verifying
          </Badge>
        );
      case "ready_for_review":
        return (
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
            Awaiting Review
          </Badge>
        );
      case "teacher_approved":
        return (
          <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
            Teacher Approved
          </Badge>
        );
      case "moderated":
        return (
          <Badge variant="outline" className="text-[10px] border-pink-500/40 text-pink-600 bg-pink-500/10">
            Moderated
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading marking session details…</p>
      </div>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Marking Session Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {sessionQuery.error instanceof Error
              ? sessionQuery.error.message
              : "The requested marking session does not exist or has been removed."}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/examiner">Return to Examiner Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={session?.title || "Marking Session"}
          description={`Cambridge IGCSE 0455/${session?.paper_number || "22"} · Cohort: ${session?.class_name || ""} · Maximum: ${session?.max_mark || 60} marks`}
          action={
            <div className="flex items-center gap-2">
              <Link to="/examiner">
                <Button size="sm" variant="outline" className="text-xs">Back</Button>
              </Link>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium text-xs">
                IGCSE 0455
              </Badge>
            </div>
          }
        />
        {/* Quick links to uploaded Question Paper & Mark Scheme PDFs */}
        {(session?.qp_url || session?.ms_url) && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {session.qp_url && (
              <a href={session.qp_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                  <FileText className="size-3.5 text-blue-500" />
                  Question Paper (QP) PDF
                  <ExternalLink className="size-3 text-muted-foreground" />
                </Button>
              </a>
            )}
            {session.ms_url && (
              <a href={session.ms_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                  <FileCheck2 className="size-3.5 text-emerald-500" />
                  Mark Scheme (MS) PDF
                  <ExternalLink className="size-3 text-muted-foreground" />
                </Button>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Total Candidates</span>
          <span className="text-2xl font-bold tabular-nums">{scripts.length}</span>
          <span className="text-[10px] text-muted-foreground block">Scanned Scripts</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Awaiting Teacher Review</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{readyCount}</span>
          <span className="text-[10px] text-muted-foreground block">Ready for Marking Desk</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Approved Results</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approvedCount}</span>
          <span className="text-[10px] text-muted-foreground block">Finalized by Teacher</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground block">Queued For Marking</span>
          <span className="text-2xl font-bold text-muted-foreground tabular-nums">{queuedCount}</span>
          <span className="text-[10px] text-muted-foreground block">OCR &amp; AI pending</span>
        </Card>
      </div>

      {/* Script Batch Actions & Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">Candidate Scripts in Cohort</CardTitle>
            <CardDescription className="text-xs">
              Review and approve proposed marks on the desktop-first Teacher Marking Desk.
            </CardDescription>
          </div>
          {queuedCount > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleProcessAllQueued}
              disabled={processMutation.isPending}
              className="text-xs gap-1.5"
            >
              {processMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Processing Batch…
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Mark All Queued ({queuedCount})
                </>
              )}
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Candidate Code</TableHead>
                <TableHead>Script File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">AI Proposed</TableHead>
                <TableHead className="text-right">Approved Mark</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No scripts in this session.
                  </TableCell>
                </TableRow>
              ) : (
                scripts.map((script) => (
                  <TableRow key={script.id} className="text-xs">
                    <TableCell className="font-mono font-semibold">
                      {script.candidate_code}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {script.file_name} ({script.page_count}p)
                    </TableCell>
                    <TableCell>{getStatusBadge(script.status)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {script.total_ai_mark !== null ? (
                        <span>
                          {script.total_ai_mark} / {session?.max_mark || 60}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {script.total_teacher_approved_mark !== null ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {script.total_teacher_approved_mark} / {session?.max_mark || 60}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {script.status === "queued" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={processMutation.isPending}
                          onClick={() => processMutation.mutate(script.id)}
                        >
                          <Play className="size-3" /> Mark Script
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="default" className="h-7 text-xs gap-1">
                          <Link
                            to="/examiner/marking-desk/$scriptId"
                            params={{ scriptId: script.id }}
                          >
                            Marking Desk <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
