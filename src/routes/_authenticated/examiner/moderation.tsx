import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Scale,
  History,
  ArrowRight,
  ExternalLink,
  Filter,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { listModerationScripts, submitScriptModeration } from "@/lib/examiner-platform/session.functions";
import type { CandidateScript, ExaminerAuditLog, MarkingSession } from "@/lib/examiner-platform/types";

export const Route = createFileRoute("/_authenticated/examiner/moderation")({
  component: SchoolModerationPage,
});

type ScriptWithSession = CandidateScript & {
  examiner_marking_sessions: MarkingSession;
};

function SchoolModerationPage() {
  const queryClient = useQueryClient();
  const listModerationFn = useServerFn(listModerationScripts);
  const submitModerationFn = useServerFn(submitScriptModeration);

  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"scripts" | "audit">("scripts");

  // Moderation Dialog State
  const [selectedScript, setSelectedScript] = useState<ScriptWithSession | null>(null);
  const [moderatedMark, setModeratedMark] = useState<number>(0);
  const [moderationRationale, setModerationRationale] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["examiner-moderation", discrepancyOnly],
    queryFn: () => listModerationFn({ data: { discrepancyOnly } }),
  });

  const moderateMutation = useMutation({
    mutationFn: (variables: { scriptId: string; moderatedMark: number; rationale: string }) =>
      submitModerationFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examiner-moderation"] });
      setSelectedScript(null);
      setModerationRationale("");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save moderation adjustment.");
    },
  });

  const scripts = (data?.scripts || []) as ScriptWithSession[];
  const auditLogs = (data?.auditLogs || []) as ExaminerAuditLog[];

  const filteredScripts = scripts.filter((s) => {
    if (!searchTerm) return true;
    return (
      (s.candidate_code || s.candidate_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examiner_marking_sessions?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate statistics
  const totalCompleted = scripts.length;
  const discrepantCount = scripts.filter((s) => {
    const ai = s.total_ai_mark ?? 0;
    const teacher = s.total_teacher_approved_mark;
    return teacher !== null && teacher !== undefined && Math.abs(teacher - ai) > 0;
  }).length;

  const moderatedCount = scripts.filter((s) => s.status === "moderated").length;

  const handleOpenModeration = (script: ScriptWithSession) => {
    setSelectedScript(script);
    setModeratedMark(script.total_moderated_mark ?? script.total_teacher_approved_mark ?? script.total_ai_mark ?? 0);
    setModerationRationale("");
    setErrorMsg(null);
  };

  const handleSaveModeration = () => {
    if (!selectedScript) return;
    if (!moderationRationale.trim()) {
      setErrorMsg("Please provide an official examiner rationale for this moderation adjustment.");
      return;
    }
    moderateMutation.mutate({
      scriptId: selectedScript.id,
      moderatedMark,
      rationale: moderationRationale,
    });
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                School Moderation & Standardization Desk
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monitor marking consistency, inspect AI vs Teacher discrepancies, and record standardized marks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Link to="/examiner">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Sessions Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scripts Monitored</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight">{totalCompleted}</div>
          <p className="text-xs text-muted-foreground mt-1">Processed scripts in school</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Teacher Adjustments</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-amber-500">{discrepantCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Where teacher changed AI mark</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Standardized & Moderated</span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-blue-500">{moderatedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Confirmed with moderator rationale</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Agreement Rate</span>
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {totalCompleted > 0
              ? `${Math.round(((totalCompleted - discrepantCount) / totalCompleted) * 100)}%`
              : "100%"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">AI vs Teacher exact concordance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-2">
        <button
          onClick={() => setActiveTab("scripts")}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "scripts"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="w-4 h-4" />
          Candidate Scripts ({filteredScripts.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          School Audit Log ({auditLogs.length})
        </button>
      </div>

      {activeTab === "scripts" ? (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search candidate code or session..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={discrepancyOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscrepancyOnly(!discrepancyOnly)}
                className="gap-2 text-xs"
              >
                <Filter className="w-3.5 h-3.5" />
                {discrepancyOnly ? "Showing Discrepancies Only" : "Filter Discrepancies"}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Candidate Code</th>
                    <th className="py-3 px-4">Session & Paper</th>
                    <th className="py-3 px-4 text-center">AI Mark</th>
                    <th className="py-3 px-4 text-center">Teacher Mark</th>
                    <th className="py-3 px-4 text-center">Discrepancy</th>
                    <th className="py-3 px-4 text-center">Moderated Mark</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        Loading school candidate scripts...
                      </td>
                    </tr>
                  ) : filteredScripts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No candidate scripts match current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredScripts.map((script) => {
                      const ai = script.total_ai_mark ?? 0;
                      const teacher = script.total_teacher_approved_mark;
                      const hasTeacher = teacher !== null && teacher !== undefined;
                      const delta = hasTeacher ? teacher - ai : 0;
                      const maxMark = script.examiner_marking_sessions?.max_mark || 60;

                      return (
                        <tr key={script.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                            {script.candidate_code}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-medium text-foreground">
                              {script.examiner_marking_sessions?.title || "Session"}
                            </div>
                            <div className="text-muted-foreground">
                              Cambridge 0455 P{script.examiner_marking_sessions?.paper_number}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-foreground">
                            {ai} <span className="text-xs text-muted-foreground">/ {maxMark}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold">
                            {hasTeacher ? (
                              <span>
                                {teacher} <span className="text-xs text-muted-foreground">/ {maxMark}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Pending Review</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            {hasTeacher ? (
                              delta === 0 ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                                  0 (Exact)
                                </Badge>
                              ) : delta > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                                  +{delta}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                  {delta}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold">
                            {script.total_moderated_mark !== null ? (
                              <span className="text-blue-500">
                                {script.total_moderated_mark} <span className="text-xs text-muted-foreground">/ {maxMark}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {script.status === "moderated" ? (
                              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[11px]">
                                Moderated
                              </Badge>
                            ) : script.status === "teacher_approved" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[11px]">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">
                                In Review
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleOpenModeration(script)}
                              >
                                <Scale className="w-3.5 h-3.5" />
                                Moderate
                              </Button>
                              <Link
                                to="/examiner/marking-desk/$scriptId"
                                params={{ scriptId: script.id }}
                              >
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open Marking Desk">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Marking & Moderation Audit Trail</h2>
            <p className="text-sm text-muted-foreground">
              Immutable record of all teacher mark adjustments, question approvals, and moderation changes.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No audit log entries recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-border/40 bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-foreground">
                        User ID: {log.user_id ? `${log.user_id.slice(0, 8)}...` : "System"}
                      </span>
                    </div>
                    {log.rationale && (
                      <p className="text-muted-foreground italic text-xs">
                        &quot;{log.rationale}&quot;
                      </p>
                    )}
                  </div>
                  <div className="text-right text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Moderation Adjustment Dialog */}
      <Dialog open={!!selectedScript} onOpenChange={(open) => !open && setSelectedScript(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Standardize Candidate Mark
            </DialogTitle>
            <DialogDescription>
              Record an official moderation adjustment for candidate{" "}
              <span className="font-mono font-semibold text-foreground">
                {selectedScript?.candidate_code}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <span className="text-muted-foreground block mb-1">AI Proposed Mark</span>
                <span className="text-lg font-mono font-bold text-foreground">
                  {selectedScript?.total_ai_mark ?? "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <span className="text-muted-foreground block mb-1">Teacher Approved Mark</span>
                <span className="text-lg font-mono font-bold text-foreground">
                  {selectedScript?.total_teacher_approved_mark ?? "—"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Final Standardized / Moderated Mark (out of {selectedScript?.examiner_marking_sessions?.max_mark || 60})
              </label>
              <Input
                type="number"
                min={0}
                max={selectedScript?.examiner_marking_sessions?.max_mark || 60}
                value={moderatedMark}
                onChange={(e) => setModeratedMark(parseInt(e.target.value, 10) || 0)}
                className="font-mono text-base font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Moderator Standardization Justification
              </label>
              <Textarea
                placeholder="Explain the academic rationale for this adjustment according to the Cambridge 0455 mark scheme..."
                value={moderationRationale}
                onChange={(e) => setModerationRationale(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedScript(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveModeration}
              disabled={moderateMutation.isPending}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {moderateMutation.isPending ? "Saving..." : "Confirm Moderation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
