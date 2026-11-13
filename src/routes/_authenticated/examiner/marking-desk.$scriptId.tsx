import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  Edit3,
  Save,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Building2,
  History,
  Info,
  Maximize2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getCandidateScriptForMarkingDesk,
  updateQuestionTeacherMark,
  approveCandidateScript,
  updateScriptTranscription,
  processScriptAiMarking,
} from "@/lib/examiner-platform/session.functions";
import type { QuestionMarkRecord } from "@/lib/examiner-platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/examiner/marking-desk/$scriptId")({
  head: () => ({
    meta: [
      { title: "Teacher Marking Desk — Marginalite Examiner" },
      {
        name: "description",
        content: "Desktop-first two-pane Cambridge examination script marking desk.",
      },
    ],
  }),
  component: TeacherMarkingDeskPage,
});

function TeacherMarkingDeskPage() {
  const { scriptId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getScriptFn = useServerFn(getCandidateScriptForMarkingDesk);
  const updateQuestionFn = useServerFn(updateQuestionTeacherMark);
  const approveScriptFn = useServerFn(approveCandidateScript);
  const updateTranscriptionFn = useServerFn(updateScriptTranscription);
  const processScriptFn = useServerFn(processScriptAiMarking);

  const scriptQuery = useQuery({
    queryKey: ["marking-desk-script", scriptId],
    queryFn: () => getScriptFn({ data: { scriptId } }),
  });

  const script = scriptQuery.data?.script;
  const session = scriptQuery.data?.session;
  const questions = scriptQuery.data?.questions || [];
  const auditLogs = scriptQuery.data?.auditLogs || [];

  // Left Pane Scanned Viewer State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeTabLeft, setActiveTabLeft] = useState<"scan" | "transcription">("scan");
  const [editableTranscription, setEditableTranscription] = useState<string | null>(null);

  // Right Pane Question Selector State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const currentQuestion = questions[selectedQuestionIndex] as QuestionMarkRecord | undefined;

  // Local Teacher Override State
  const [teacherMark, setTeacherMark] = useState<number | null>(null);
  const [teacherNote, setTeacherNote] = useState<string>("");

  // Sync current question when selected changes
  const activeMark =
    teacherMark !== null
      ? teacherMark
      : currentQuestion?.teacher_approved_mark !== null && currentQuestion?.teacher_approved_mark !== undefined
        ? currentQuestion.teacher_approved_mark
        : currentQuestion?.ai_awarded_mark ?? 0;

  const totalPages = script?.page_transcriptions?.length || 1;
  const activePageData = script?.page_transcriptions?.find((p: any) => p.page_number === currentPage);

  // Mutations
  const saveQuestionMutation = useMutation({
    mutationFn: async ({ nextIndex }: { nextIndex?: number } = {}) => {
      if (!currentQuestion) return;
      const markToSave = activeMark;
      await updateQuestionFn({
        data: {
          questionId: currentQuestion.id,
          teacherMark: markToSave,
          feedbackNote: teacherNote || currentQuestion.teacher_feedback_note || undefined,
          isApproved: true,
          rationale: "Teacher reviewed and confirmed mark on marking desk.",
        },
      });
      return nextIndex;
    },
    onSuccess: (nextIndex) => {
      queryClient.invalidateQueries({ queryKey: ["marking-desk-script", scriptId] });
      toast.success(`Question ${currentQuestion?.question_number} approved (${activeMark} marks).`);
      setTeacherMark(null);
      setTeacherNote("");

      if (typeof nextIndex === "number" && nextIndex < questions.length) {
        setSelectedQuestionIndex(nextIndex);
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update mark."),
  });

  const approveAllMutation = useMutation({
    mutationFn: () => approveScriptFn({ data: { scriptId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marking-desk-script", scriptId] });
      queryClient.invalidateQueries({ queryKey: ["examiner-session-detail", script?.session_id] });
      toast.success(`Candidate ${script?.candidate_code} script fully approved!`);
      navigate({
        to: "/examiner/session/$sessionId",
        params: { sessionId: script?.session_id || "" },
      });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to approve script."),
  });

  const saveTranscriptionMutation = useMutation({
    mutationFn: async () => {
      const textToSave =
        editableTranscription !== null ? editableTranscription : activePageData?.raw_text || "";
      await updateTranscriptionFn({
        data: {
          scriptId,
          pageNumber: currentPage,
          rawText: textToSave,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marking-desk-script", scriptId] });
      toast.success(`Transcription saved for Page ${currentPage}!`);
      setEditableTranscription(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save transcription."),
  });

  const reMarkMutation = useMutation({
    mutationFn: async () => {
      // First save if edited
      if (editableTranscription !== null) {
        await updateTranscriptionFn({
          data: {
            scriptId,
            pageNumber: currentPage,
            rawText: editableTranscription,
          },
        });
      }
      await processScriptFn({ data: { scriptId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marking-desk-script", scriptId] });
      queryClient.invalidateQueries({ queryKey: ["examiner-session-detail", script?.session_id] });
      toast.success("Script re-evaluated with updated handwriting transcription!");
      setEditableTranscription(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to re-mark script."),
  });

  // Calculate Running Marks
  const currentTotalApproved = questions.reduce(
    (acc, q) => acc + (q.teacher_approved_mark ?? q.ai_awarded_mark),
    0,
  );
  const totalMax = session?.max_mark || 60;

  if (scriptQuery.isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2 text-primary" /> Loading Teacher Marking Desk…
      </div>
    );
  }

  if (scriptQuery.isError || !script) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3 p-4 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <h2 className="text-base font-semibold">Script Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          {scriptQuery.error instanceof Error
            ? scriptQuery.error.message
            : "The examination script you requested could not be found or you do not have permission to access it."}
        </p>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link to="/examiner">Return to Examiner Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background overflow-hidden">
      {/* Top Desk Navigation & Candidate Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
            <Link to="/examiner/session/$sessionId" params={{ sessionId: script?.session_id || "" }}>
              <ArrowLeft className="size-3.5" /> Back to Session
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-tight">
              {script?.candidate_code}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              Cambridge 0455/{session?.paper_number}
            </Badge>
            <Badge
              variant={script?.status === "teacher_approved" ? "default" : "secondary"}
              className="text-[10px] capitalize"
            >
              {script?.status?.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Running score & Approval */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Approved Total</span>
            <span className="font-mono text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {currentTotalApproved} / {totalMax} Marks
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => approveAllMutation.mutate()}
            disabled={approveAllMutation.isPending}
            className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
          >
            <CheckCircle2 className="size-4" /> Approve Full Script
          </Button>
        </div>
      </header>

      {/* Main Two-Pane Split Body */}
      <div className="flex flex-1 min-h-0 divide-x divide-border">
        {/* ============================================================== */}
        {/* LEFT PANE: SCANNED SCRIPT VIEWER & HANDWRITING TRANSCRIPTION   */}
        {/* ============================================================== */}
        <div className="flex flex-1 flex-col min-w-0 bg-muted/20">
          {/* Viewer Toolbar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setEditableTranscription(null);
                }}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="font-mono text-[11px] font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  setEditableTranscription(null);
                }}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="font-mono text-[10px] text-muted-foreground w-10 text-center">
                {zoomLevel}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate Page"
              >
                <RotateCw className="size-3.5" />
              </Button>
            </div>

            <Tabs
              value={activeTabLeft}
              onValueChange={(v) => setActiveTabLeft(v as "scan" | "transcription")}
              className="h-7"
            >
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="scan" className="h-6 text-[11px] px-2">
                  Scanned Script
                </TabsTrigger>
                <TabsTrigger value="transcription" className="h-6 text-[11px] px-2">
                  Transcription
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Viewer Area */}
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {activeTabLeft === "scan" ? (
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                }}
                className="w-full flex justify-center py-2"
              >
                {activePageData?.image_url ? (
                  <div className="relative max-w-3xl w-full rounded-lg border border-border bg-white shadow-md overflow-hidden">
                    <div className="border-b border-border bg-muted/40 px-4 py-2 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                      <span>Candidate: {script?.candidate_code}</span>
                      <span>Page {currentPage} of {totalPages} (Scanned Original)</span>
                    </div>
                    <img
                      src={activePageData.image_url}
                      alt={`Candidate ${script?.candidate_code} - Page ${currentPage}`}
                      className="w-full h-auto object-contain block bg-white select-none"
                    />
                  </div>
                ) : (
                  <div className="max-w-2xl w-full rounded-lg border border-border bg-card p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
                    <div className="border-b border-border/60 pb-3 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                      <span>Candidate: {script?.candidate_code}</span>
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>

                    <div className="my-6 space-y-4 font-serif text-sm leading-relaxed text-foreground/90 select-none">
                      <div className="p-3 bg-muted/30 rounded border border-dashed border-border/80">
                        <p className="font-mono text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">
                          Handwritten Examination Prose:
                        </p>
                        <p className="italic whitespace-pre-wrap">
                          {activePageData?.raw_text ||
                            "Candidate's handwritten responses for this page are verified by OCR."}
                        </p>
                      </div>

                      {activePageData?.diagram_tags && activePageData.diagram_tags.length > 0 ? (
                        <div className="p-3 bg-primary/5 rounded border border-primary/20 space-y-1">
                          <span className="text-[10px] font-mono uppercase font-semibold text-primary block">
                            Hand-Drawn Diagram Region:
                          </span>
                          <p className="font-mono text-xs text-primary/90">
                            {activePageData.diagram_tags.join("\n")}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-border/60 pt-2 text-[10px] text-muted-foreground flex justify-between">
                      <span>Cambridge Assessment International Education · 0455 Economics</span>
                      <span>CONFIDENTIAL CANDIDATE SCRIPT</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-2xl w-full h-full flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Verbatim OCR Transcription (Editable by Teacher)
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Page {currentPage} · Confidence: {Math.round((activePageData?.confidence ?? 0.9) * 100)}%
                  </Badge>
                </div>
                <Textarea
                  value={
                    editableTranscription !== null
                      ? editableTranscription
                      : activePageData?.raw_text || ""
                  }
                  onChange={(e) => setEditableTranscription(e.target.value)}
                  className="flex-1 font-mono text-xs leading-relaxed resize-none bg-card p-4 min-h-[350px]"
                />
                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    disabled={reMarkMutation.isPending}
                    onClick={() => reMarkMutation.mutate()}
                  >
                    {reMarkMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="size-3.5" />
                    )}
                    Re-run AI Marking
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs gap-1.5"
                    disabled={saveTranscriptionMutation.isPending}
                    onClick={() => saveTranscriptionMutation.mutate()}
                  >
                    {saveTranscriptionMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Transcription Correction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANE: QUESTION MARKING, RATIONALE & ASSESSMENT CRITERIA  */}
        {/* ============================================================== */}
        <div className="flex flex-1 flex-col min-w-0 max-w-xl bg-card">
          {/* Question Selector Carousel */}
          <div className="border-b border-border p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Question Navigator
              </span>
              <span className="text-xs text-muted-foreground">
                Question {selectedQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setSelectedQuestionIndex(idx);
                    setTeacherMark(null);
                    setTeacherNote("");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs transition-all shrink-0",
                    selectedQuestionIndex === idx
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <span className="font-mono text-[11px]">{q.question_number}</span>
                  <span className="text-[10px] tabular-nums mt-0.5">
                    {q.teacher_approved_mark ?? q.ai_awarded_mark}/{q.max_mark}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Details and Marking Section */}
          {currentQuestion ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Question Header & Mark Override Banner */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Question {currentQuestion.question_number}: {currentQuestion.question_title}
                    </h3>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Tariff: Max {currentQuestion.max_mark} marks
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground block uppercase font-mono">
                      Proposed / Total
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums">
                      {activeMark} / {currentQuestion.max_mark}
                    </span>
                  </div>
                </div>

                {/* Mark Override Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="mark-input" className="text-xs font-semibold">
                      Teacher Mark:
                    </Label>
                    <Input
                      id="mark-input"
                      type="number"
                      min={0}
                      max={currentQuestion.max_mark}
                      value={activeMark}
                      onChange={(e) => setTeacherMark(Number(e.target.value))}
                      className="h-7 w-16 text-center font-mono font-bold text-xs"
                    />
                    <div className="flex gap-0.5">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        disabled={activeMark <= 0}
                        onClick={() => setTeacherMark(Math.max(0, activeMark - 1))}
                      >
                        -
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        disabled={activeMark >= currentQuestion.max_mark}
                        onClick={() =>
                          setTeacherMark(Math.min(currentQuestion.max_mark, activeMark + 1))
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {activeMark !== currentQuestion.ai_awarded_mark ? (
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      Modified from AI ({currentQuestion.ai_awarded_mark})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      AI Proposed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Assessment Objective Breakdown */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assessment Objective (AO) Breakdown
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-border p-2.5 bg-card space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-semibold">
                      AO1 Knowledge
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums">
                      {currentQuestion.ao_breakdown.knowledge.awarded} /{" "}
                      {currentQuestion.ao_breakdown.knowledge.out_of}
                    </span>
                    {currentQuestion.ao_breakdown.knowledge.comment ? (
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {currentQuestion.ao_breakdown.knowledge.comment}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border p-2.5 bg-card space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-semibold">
                      AO2 Analysis
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums">
                      {currentQuestion.ao_breakdown.analysis.awarded} /{" "}
                      {currentQuestion.ao_breakdown.analysis.out_of}
                    </span>
                    {currentQuestion.ao_breakdown.analysis.comment ? (
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {currentQuestion.ao_breakdown.analysis.comment}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border p-2.5 bg-card space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-semibold">
                      AO3 Evaluation
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums">
                      {currentQuestion.ao_breakdown.evaluation.awarded} /{" "}
                      {currentQuestion.ao_breakdown.evaluation.out_of}
                    </span>
                    {currentQuestion.ao_breakdown.evaluation.comment ? (
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {currentQuestion.ao_breakdown.evaluation.comment}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Examiner Rationale */}
              <div className="space-y-1 text-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Examiner Marking Rationale
                </span>
                <p className="rounded-lg border border-border bg-card p-3 leading-relaxed text-muted-foreground">
                  {currentQuestion.marking_rationale}
                </p>
              </div>

              {/* Supporting Evidence Quotes */}
              {currentQuestion.evidence_quotes && currentQuestion.evidence_quotes.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Verbatim Script Evidence
                  </span>
                  <ul className="space-y-1">
                    {currentQuestion.evidence_quotes.map((quote: string, i: number) => (
                      <li
                        key={i}
                        className="rounded border border-border/70 bg-muted/20 p-2 italic text-[11px] text-muted-foreground"
                      >
                        "{quote}"
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Diagram Evaluation */}
              {currentQuestion.diagram_detected && currentQuestion.diagram_evaluation ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">
                      Diagram Evaluation: {currentQuestion.diagram_evaluation.name || "Hand-Drawn"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      +{currentQuestion.diagram_evaluation.marks_awarded_for_diagram} Marks
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                    <div>Axes: {currentQuestion.diagram_evaluation.axes_labelled_correctly ? "✓ Labelled" : "✗ Unlabelled"}</div>
                    <div>Curves: {currentQuestion.diagram_evaluation.curves_drawn_correctly ? "✓ Accurate" : "✗ Inaccurate"}</div>
                    <div>Shift: {currentQuestion.diagram_evaluation.shift_direction_correct ? "✓ Correct direction" : "✗ Incorrect"}</div>
                    <div>Equilibrium: {currentQuestion.diagram_evaluation.equilibrium_labelled ? "✓ Marked" : "✗ Unmarked"}</div>
                  </div>
                  {currentQuestion.diagram_evaluation.examiner_comment ? (
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/20">
                      {currentQuestion.diagram_evaluation.examiner_comment}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Independent Verification Flags */}
              {currentQuestion.verification_flags && currentQuestion.verification_flags.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Verification Flags
                  </span>
                  <ul className="space-y-1">
                    {currentQuestion.verification_flags.map((flag: any, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-200"
                      >
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-600" />
                        <span>{flag.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Teacher Feedback Note */}
              <div className="space-y-1.5 text-xs">
                <Label htmlFor="teacher-note" className="text-xs font-semibold text-muted-foreground">
                  Teacher Feedback / Annotation
                </Label>
                <Textarea
                  id="teacher-note"
                  value={teacherNote || currentQuestion.teacher_feedback_note || ""}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Add specific comments to be included on the marked-script report..."
                  className="h-16 text-xs resize-none"
                />
              </div>
            </div>
          ) : null}

          {/* Footer Action Bar */}
          <footer className="border-t border-border p-3 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedQuestionIndex === 0}
              onClick={() => {
                setSelectedQuestionIndex((i) => Math.max(0, i - 1));
                setTeacherMark(null);
              }}
              className="text-xs"
            >
              Previous
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={saveQuestionMutation.isPending}
              onClick={() =>
                saveQuestionMutation.mutate({
                  nextIndex:
                    selectedQuestionIndex + 1 < questions.length
                      ? selectedQuestionIndex + 1
                      : undefined,
                })
              }
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              <Check className="size-3.5" />
              {selectedQuestionIndex + 1 < questions.length
                ? "Approve Question & Next"
                : "Approve Question"}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
