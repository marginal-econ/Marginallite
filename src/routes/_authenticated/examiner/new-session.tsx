import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/account.functions";
import {
  Camera,
  Images,
  Upload,
  FileText,
  FileCheck2,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMarkingSession,
  uploadCandidateScriptBatch,
  listExaminerPapers,
} from "@/lib/examiner-platform/session.functions";
import { CAMBRIDGE_0455_PAPERS, type ExaminerCustomPaper } from "@/lib/examiner-platform/cambridge-papers";
import { UploadPaperDialog } from "@/components/examiner/upload-paper-dialog";
import { ExternalLink, Sparkles, BookOpen } from "lucide-react";
import { filesToPageImages } from "@/lib/handwriting-images";
import { generateSampleScriptPage } from "@/lib/examiner-platform/sample-script-generator";

export const Route = createFileRoute("/_authenticated/examiner/new-session")({
  validateSearch: (search: Record<string, unknown>): { paperId?: string } => ({
    paperId: typeof search.paperId === "string" ? search.paperId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New Marking Session — Marginalite Examiner" },
      {
        name: "description",
        content: "Set up a new Cambridge IGCSE 0455 marking session and upload scanned candidate scripts.",
      },
    ],
  }),
  component: NewMarkingSessionPage,
});

type ScriptPageUpload = {
  pageNumber: number;
  dataUrl?: string;
  textFallback?: string;
};

type UploadItem = {
  id: string;
  candidateCode: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  pages: ScriptPageUpload[];
  rawTextFallback?: string;
  dataUrl?: string;
};

function NewMarkingSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { paperId: initialPaperId } = Route.useSearch();
  const listPapersFn = useServerFn(listExaminerPapers);
  const createSessionFn = useServerFn(createMarkingSession);
  const uploadBatchFn = useServerFn(uploadCandidateScriptBatch);

  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  // Papers Query
  const papersQuery = useQuery({
    queryKey: ["examiner-papers"],
    queryFn: () => listPapersFn(),
    enabled: Boolean(meQuery.data?.isAdmin),
  });
  const papers = papersQuery.data?.papers || [];

  const [selectedPaperId, setSelectedPaperId] = useState<string>(
    initialPaperId || "builtin_0455_22_2026_fm",
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("IGCSE Economics Mock Examination");
  const [className, setClassName] = useState("IGCSE-Econ-Set-1");
  const [level, setLevel] = useState<string>("igcse");
  const [paperNumber, setPaperNumber] = useState("22");
  const [examSeries, setExamSeries] = useState("2026_feb_march");

  // Script Batch State
  const [uploadedScripts, setUploadedScripts] = useState<UploadItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Find active paper
  const selectedPaper =
    papers.find((p) => p.id === selectedPaperId) ||
    papers.find((p) => p.paperNumber === paperNumber) ||
    papers[0];

  const handleSelectPaper = (paperId: string) => {
    setSelectedPaperId(paperId);
    const p = papers.find((x) => x.id === paperId);
    if (p) {
      setLevel(p.qualification || "igcse");
      setPaperNumber(p.paperNumber);
      setExamSeries(p.series);
      setTitle(`${p.title} Assessment`);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (uploadedScripts.length === 0) {
        throw new Error("Please upload at least one candidate script before proceeding.");
      }

      // Step 1: Create Session
      const { session } = await createSessionFn({
        data: {
          title,
          className,
          subjectCode: "0455",
          qualificationLevel: level,
          examSeries,
          paperNumber,
          paperId: selectedPaper && !selectedPaper.id.startsWith("builtin_") ? selectedPaper.id : undefined,
          qpUrl: selectedPaper?.qpUrl ?? undefined,
          msUrl: selectedPaper?.msUrl ?? undefined,
        },
      });

      // Step 2: Upload candidate batch in chunks of 2 to avoid browser/network payload limits
      const chunkSize = 2;
      for (let i = 0; i < uploadedScripts.length; i += chunkSize) {
        const chunk = uploadedScripts.slice(i, i + chunkSize);
        await uploadBatchFn({
          data: {
            sessionId: session.id,
            scripts: chunk.map((item) => ({
              candidateCode: item.candidateCode,
              fileName: item.fileName,
              pageCount: item.pages.length || item.pageCount || 1,
              pages:
                item.pages.length > 0
                  ? item.pages.map((p, idx) => ({
                      pageNumber: p.pageNumber || idx + 1,
                      dataUrl: p.dataUrl,
                      textFallback: p.textFallback || item.rawTextFallback,
                    }))
                  : [
                      {
                        pageNumber: 1,
                        dataUrl: item.dataUrl,
                        textFallback: item.rawTextFallback,
                      },
                    ],
            })),
          },
        });
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["examiner-sessions"] });
      toast.success(`Marking session created with ${uploadedScripts.length} candidate scripts!`);
      navigate({ to: "/examiner/session/$sessionId", params: { sessionId: session.id } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create marking session.");
    },
  });

  if (!meQuery.isLoading && !meQuery.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <Badge variant="outline" className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-500">
          Admin Only
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New session creation for whole-paper examiner batches is restricted to administrators.
        </p>
        <div className="mt-6">
          <Button variant="default" onClick={() => navigate({ to: "/dashboard" })}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    const newItems: UploadItem[] = [];
    const startIndex = uploadedScripts.length + 1;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const candidateCode = `CAND-${String(startIndex + i).padStart(3, "0")}`;

        toast.info(`Rasterizing handwriting scan: ${file.name}…`);

        let pageImages: string[] = [];
        try {
          pageImages = await filesToPageImages([file]);
        } catch (rasterErr: any) {
          console.warn("Failed to rasterize file:", file.name, rasterErr);
          toast.error(`Could not read ${file.name}: ${rasterErr?.message || "Invalid file"}`);
          continue;
        }

        const pages: ScriptPageUpload[] = pageImages.map((dataUrl, idx) => ({
          pageNumber: idx + 1,
          dataUrl,
        }));

        newItems.push({
          id: crypto.randomUUID(),
          candidateCode,
          fileName: file.name,
          fileSize: file.size,
          pageCount: pages.length,
          pages,
          dataUrl: pages[0]?.dataUrl,
        });
      }

      if (newItems.length > 0) {
        setUploadedScripts((prev) => [...prev, ...newItems]);
        toast.success(`Loaded ${newItems.length} candidate scripts with genuine handwritten scans!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error processing files.");
    } finally {
      setIsProcessingFiles(false);
      event.target.value = "";
    }
  };

  const removeScript = (id: string) => {
    setUploadedScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const updateCandidateCode = (id: string, code: string) => {
    setUploadedScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, candidateCode: code } : s)),
    );
  };

  // Pre-seed sample demonstration scripts button with canvas-rendered Cambridge exam pages
  const handleLoadDemoBatch = () => {
    const paperName = selectedPaper?.title || `Cambridge 0455/${paperNumber}`;

    const cand1Text = `Question 1(a): A negative externality is an external cost inflicted upon third parties not directly involved in the transaction. In this market, over-production leads to deadweight welfare loss as MSC > MPC.

Question 1(b): An indirect tax increases production costs, shifting the private marginal cost curve upward from MPC to MPC + tax. This raises market price to P* and contracts quantity demanded to the socially optimal level Q*, eliminating deadweight welfare loss.
[DIAGRAM: Negative externality with tax | axes: Price / Quantity | curves: MPC, MSC, MPC+tax | labels: P1, P2, Q1, Qopt | accuracy: accurate axes and shifts]

Question 2(a): Productive efficiency occurs at the lowest average total cost on the LRAC curve where MES is achieved. Allocative efficiency is achieved where price equals marginal cost (P=MC), maximizing total societal welfare.`;

    const cand2Text = `Question 1(a): Negative externalities mean pollution caused by factories that hurts people living nearby.

Question 1(b): The government should tax firms because it makes them stop producing bad goods and pay for the damage. This will fix the failure and make things fair for everyone.

Question 2(a): Productive efficiency is when a firm produces a lot of output quickly without wasting time. Allocative efficiency is when consumers are happy with market prices.`;

    const cand3Text = `Question 1(a): A negative externality is a market failure occurring when marginal social cost exceeds marginal private cost (MSC > MPC), representing negative spillover effects to society.

Question 1(b): Imposing a specific indirect tax internalises the external cost. The supply curve shifts vertically upwards by the per-unit tax amount, moving the market from equilibrium price P1 to the socially optimal price P*, eliminating the welfare deadweight loss triangle.
[DIAGRAM: Market failure and indirect tax | axes: P / Q | curves: MPB, MSB, MPC, MSC, MPC+tax | labels: P*, Q*, deadweight loss triangle | accuracy: perfectly drawn and fully annotated]

Question 2(a): Productive efficiency requires operation at minimum average cost on the long-run average cost curve. Allocative efficiency requires P = MC where marginal social benefit equals marginal social cost.`;

    const img1 = generateSampleScriptPage("CAND-001", 1, paperName, cand1Text);
    const img2 = generateSampleScriptPage("CAND-002", 1, paperName, cand2Text);
    const img3 = generateSampleScriptPage("CAND-003", 1, paperName, cand3Text);

    const demoCandidates: UploadItem[] = [
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-001",
        fileName: "0455_S24_Candidate_001_Scanned.pdf",
        fileSize: 1024 * 850,
        pageCount: 1,
        pages: [{ pageNumber: 1, dataUrl: img1, textFallback: cand1Text }],
        dataUrl: img1,
        rawTextFallback: cand1Text,
      },
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-002",
        fileName: "0455_S24_Candidate_002_Scanned.pdf",
        fileSize: 1024 * 920,
        pageCount: 1,
        pages: [{ pageNumber: 1, dataUrl: img2, textFallback: cand2Text }],
        dataUrl: img2,
        rawTextFallback: cand2Text,
      },
      {
        id: crypto.randomUUID(),
        candidateCode: "CAND-003",
        fileName: "0455_S24_Candidate_003_Scanned.pdf",
        fileSize: 1024 * 780,
        pageCount: 1,
        pages: [{ pageNumber: 1, dataUrl: img3, textFallback: cand3Text }],
        dataUrl: img3,
        rawTextFallback: cand3Text,
      },
    ];

    setUploadedScripts(demoCandidates);
    toast.success("Loaded 3 sample candidate scripts with rendered Cambridge exam booklet scans.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Create Marking Session"
        description="Step 1: Configure Cambridge examination paper · Step 2: Batch upload candidate scripts"
        action={
          <div className="flex items-center gap-2">
            <Link to="/examiner">
              <Button size="sm" variant="outline" className="text-xs">Back</Button>
            </Link>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium text-xs">
              Teacher Workflow
            </Badge>
          </div>
        }
      />

      {/* Step 1: Paper Configuration */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">1. Examination &amp; Paper Configuration</CardTitle>
              <CardDescription className="text-xs">
                Match this session to an official Cambridge IGCSE 0455 paper or a school-uploaded custom paper (QP &amp; MS PDF).
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
              className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0"
            >
              <Plus className="size-3.5" /> Upload New Paper (QP &amp; MS)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Paper Picker */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="font-semibold text-xs">Select Examination Paper</Label>
            <Select value={selectedPaperId} onValueChange={handleSelectPaper}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose past paper or custom mock..." />
              </SelectTrigger>
              <SelectContent>
                {papers.some((p) => !p.isOfficial) && (
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    School Uploaded Papers
                  </div>
                )}
                {papers
                  .filter((p) => !p.isOfficial)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      📄 {p.title} ({(p.qualification || "igcse").toUpperCase()} · {p.totalMarks} marks)
                    </SelectItem>
                  ))}

                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Official Cambridge Past Papers
                </div>
                {papers
                  .filter((p) => p.isOfficial)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      🏛️ {p.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paper Details Banner */}
          {selectedPaper && (
            <div className="md:col-span-2 rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedPaper.isOfficial ? "secondary" : "default"} className="text-[10px]">
                    {selectedPaper.isOfficial ? "Official Cambridge" : "School Uploaded"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {(selectedPaper.qualification || "igcse").toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedPaper.totalMarks} Marks · {selectedPaper.durationMinutes} mins
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">{selectedPaper.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedPaper.qpUrl && (
                    <a href={selectedPaper.qpUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                        <FileText className="size-3 text-blue-500" /> View QP PDF <ExternalLink className="size-2.5" />
                      </Button>
                    </a>
                  )}
                  {selectedPaper.msUrl && (
                    <a href={selectedPaper.msUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                        <FileCheck2 className="size-3 text-emerald-500" /> View MS PDF <ExternalLink className="size-2.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Questions Preview Pills */}
              {selectedPaper.questions && selectedPaper.questions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground mr-1">Questions:</span>
                  {selectedPaper.questions.map((q: any) => (
                    <Badge key={q.number} variant="secondary" className="text-[10px] font-mono py-0 px-1.5 gap-1">
                      Q{q.number}
                      <span className="text-muted-foreground">
                        ({q.maxMark}m{q.hasDiagramRequirement ? ", diag" : ""})
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 2 Economics Assessment"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-name">Class / Cohort</Label>
            <Input
              id="class-name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 10-Econ-A"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Subject Qualification</Label>
            <Select value={level} onValueChange={(val: string) => setLevel(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="igcse">Cambridge IGCSE Economics (0455)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Examination Series</Label>
            <Select value={examSeries} onValueChange={setExamSeries}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024_may_june">May/June 2024</SelectItem>
                <SelectItem value="2024_oct_nov">October/November 2024</SelectItem>
                <SelectItem value="2023_may_june">May/June 2023</SelectItem>
                <SelectItem value="2025_mock">2025 Mock Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Paper &amp; Variant</Label>
            <Select value={paperNumber} onValueChange={setPaperNumber}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="22">Paper 22 (IGCSE Structured Questions · 90 marks)</SelectItem>
                <SelectItem value="21">Paper 21 (IGCSE Structured Questions · 90 marks)</SelectItem>
                <SelectItem value="12">Paper 12 (IGCSE Multiple Choice · 30 marks)</SelectItem>
                <SelectItem value="11">Paper 11 (IGCSE Multiple Choice · 30 marks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Verified Cambridge 0455/{paperNumber} Mark Scheme:</strong> Structured questions, Assessment Objectives (AO1 Knowledge, AO2 Analysis, AO3 Evaluation), and diagram requirements are loaded and verified.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload Candidate Scripts */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">2. Upload Scanned Candidate Scripts</CardTitle>
            <CardDescription className="text-xs">
              Upload multi-page scanned PDFs or high-resolution images. Anonymous candidate codes protect student privacy.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadDemoBatch}
            className="text-xs shrink-0"
          >
            Load Sample Batch (3 Scripts)
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*,.heic,.heif"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-6 cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-colors text-center focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Drop scanned exam scripts here, or click to browse
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports PDF, Photos/Gallery images (JPEG, PNG, HEIC) · Multi-page documents and bulk class uploads supported
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Images className="size-3.5 text-primary" />
                Upload from Gallery / Files
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Camera className="size-3.5 text-primary" />
                Take Photo / Scan
              </Button>
            </div>
          </div>

          {/* Script Queue List */}
          {uploadedScripts.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Candidate Scripts ({uploadedScripts.length})</span>
                <span>Pages</span>
              </div>
              <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card">
                {uploadedScripts.map((script) => (
                  <li key={script.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Input
                            value={script.candidateCode}
                            onChange={(e) => updateCandidateCode(script.id, e.target.value)}
                            className="h-6 w-24 text-[11px] font-mono font-semibold px-1.5 py-0"
                          />
                          <span className="text-muted-foreground truncate text-[11px]">
                            {script.fileName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {(script.fileSize / 1024).toFixed(0)} KB · Anonymous Candidate Identifier
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {script.pageCount} {script.pageCount === 1 ? "page" : "pages"}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeScript(script.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {uploadedScripts.length} candidate {uploadedScripts.length === 1 ? "script" : "scripts"} ready for OCR and marking
            </span>
            <Button
              type="button"
              disabled={uploadedScripts.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="gap-1.5 text-xs font-semibold"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Initializing Batch…
                </>
              ) : (
                <>
                  Create Session &amp; Begin Marking <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Paper Modal */}
      <UploadPaperDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={(newPaper) => handleSelectPaper(newPaper.id)}
      />
    </div>
  );
}
