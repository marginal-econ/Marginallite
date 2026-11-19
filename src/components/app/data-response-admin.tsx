import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  FileCheck2,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clock,
  Trophy,
  Play,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Eye,
  Check,
  Award,
  Layers,
  ArrowRight,
  Filter,
  HelpCircle,
  FileSearch,
  PenTool,
  Send,
  Zap,
  BarChart2,
  Calculator,
  Compass,
  GraduationCap,
  Info,
  BookMarked,
  Lightbulb,
  Printer,
  ExternalLink,
  Download,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, stripStars } from "@/lib/utils";

import {
  listDataResponsePapers,
  getDataResponsePaper,
  saveDataResponsePaper,
  parseDataResponseUpload,
  gradeDataResponseSubmission,
  deleteDataResponsePaper,
} from "@/lib/data-response/data-response.functions";
import type {
  DataResponsePaper,
  DataResponseQuestion,
  DataResponseSubmissionResult,
  QuestionEvaluationResult,
} from "@/lib/data-response/types";
import { extractTextFromFile } from "@/lib/extract-text";
import { ocrPdf } from "@/lib/pdf-ocr";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import { CambridgePdfViewer } from "./cambridge-pdf-viewer";
import { CambridgeExamInsert } from "./cambridge-exam-insert";
import { CompactProgressBar, type ProgressStage } from "./grading-progress";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const DATA_RESPONSE_GRADING_STAGES: ProgressStage[] = [
  { label: "Checking extract evidence, figures & units", weight: 3 },
  { label: "Applying Cambridge IGCSE 0455 mark scheme & OFR rules", weight: 5 },
  { label: "Assessing diagrams, shifts & analytical chains", weight: 4 },
  { label: "Compiling sub-question marks & diagnostic feedback", weight: 3 },
];

const DATA_RESPONSE_EXTRACTION_STAGES: ProgressStage[] = [
  { label: "Reading question paper & mark scheme PDFs", weight: 3 },
  { label: "Extracting extract tables, figures & charts", weight: 4 },
  { label: "Mapping Section A sub-questions & mark allocations", weight: 5 },
  { label: "Building interactive Data Response schema", weight: 3 },
];
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function DataResponseStudio() {
  const queryClient = useQueryClient();

  const listPapersFn = useServerFn(listDataResponsePapers);
  const savePaperFn = useServerFn(saveDataResponsePaper);
  const parseUploadFn = useServerFn(parseDataResponseUpload);
  const gradeSubmissionFn = useServerFn(gradeDataResponseSubmission);
  const deletePaperFn = useServerFn(deleteDataResponsePaper);

  // Top level active tab: "practice" | "results" | "upload" | "library"
  const [activeTab, setActiveTab] = useState<"practice" | "results" | "upload" | "library">("practice");

  // Level Filter for selection & library: "all" | "as" | "a2"
  const [levelFilter, setLevelFilter] = useState<"all" | "as" | "a2">("all");
  const [paperSearchQuery, setPaperSearchQuery] = useState<string>("");

  // Instruction Guide toggle (collapsed by default to keep PDF immediately in view)
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Selected Paper State (default to authentic Feb/March 2026 0455/22 Senegal paper)
  const [selectedPaperId, setSelectedPaperId] = useState<string>("0455_22_2026_fm");

  // Extract View Mode: "pdf" (Past Paper PDF / Insert) | "text" (Transcript reference)
  const [extractViewMode, setExtractViewMode] = useState<"pdf" | "text">("pdf");
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);

  // Answering State (questionId/number -> text)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [extractFilter, setExtractFilter] = useState<string>("");

  // Load draft answers from localStorage when paper changes
  useEffect(() => {
    if (!selectedPaperId) return;
    try {
      const saved = localStorage.getItem(`marginal_dr_draft_${selectedPaperId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setAnswers(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setAnswers({});
  }, [selectedPaperId]);

  // Auto-save draft to localStorage whenever answers change
  useEffect(() => {
    if (!selectedPaperId) return;
    try {
      if (answers && Object.keys(answers).length > 0) {
        localStorage.setItem(`marginal_dr_draft_${selectedPaperId}`, JSON.stringify(answers));
      }
    } catch {
      // ignore
    }
  }, [answers, selectedPaperId]);

  // Quick Action: Load Cambridge Benchmark Script
  const handleLoadSampleAnswers = () => {
    if (!currentPaper) return;
    if (currentPaper.sampleAnswers && Object.keys(currentPaper.sampleAnswers).length > 0) {
      setAnswers(currentPaper.sampleAnswers);
      toast.success("Loaded Cambridge benchmark answers into all sub-questions!");
    } else {
      toast.info("No benchmark script available for this paper.");
    }
  };

  // Marking Results State
  const [lastSubmission, setLastSubmission] = useState<DataResponseSubmissionResult | null>(null);

  // Upload & OCR State
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [uploadSubject, setUploadSubject] = useState<"0455">("0455");
  const [uploadLevel, setUploadLevel] = useState<"as" | "a2">("as");
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<string>("");
  const [parsedPreviewPaper, setParsedPreviewPaper] = useState<DataResponsePaper | null>(null);

  // Query: Fetch papers list
  const { data: papersData, isLoading: isLoadingPapers } = useQuery({
    queryKey: ["data-response-papers"],
    queryFn: () => listPapersFn(),
  });

  const papers: DataResponsePaper[] = papersData?.papers || [];

  // Filtered papers based on level and search query
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (levelFilter === "as" && p.qualificationLevel !== "as") return false;
      if (levelFilter === "a2" && p.qualificationLevel !== "a2") return false;
      if (paperSearchQuery.trim()) {
        const query = paperSearchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesSeries = p.seriesLabel?.toLowerCase().includes(query);
        const matchesExtract = p.extract.title.toLowerCase().includes(query);
        const matchesCode = `${p.subjectCode}/${p.paperNumber}`.toLowerCase().includes(query);
        return matchesTitle || matchesSeries || matchesExtract || matchesCode;
      }
      return true;
    });
  }, [papers, levelFilter, paperSearchQuery]);

  // Counts for tabs
  const asCount = useMemo(() => papers.filter((p) => p.qualificationLevel === "as").length, [papers]);
  const a2Count = useMemo(() => papers.filter((p) => p.qualificationLevel === "a2").length, [papers]);

  // Active Selected Paper
  const currentPaper = useMemo(() => {
    return papers.find((p) => p.id === selectedPaperId) || papers[0] || null;
  }, [papers, selectedPaperId]);

  // Current sub-question
  const currentQuestion: DataResponseQuestion | null = useMemo(() => {
    if (!currentPaper || !currentPaper.questions || currentPaper.questions.length === 0) return null;
    return currentPaper.questions[activeQuestionIdx] || currentPaper.questions[0];
  }, [currentPaper, activeQuestionIdx]);

  // Mutation: Grade paper
  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!currentPaper) throw new Error("No paper selected.");
      return await gradeSubmissionFn({
        data: {
          paperId: currentPaper.id,
          candidateName: "Candidate Standardisation Script",
          answers,
        },
      });
    },
    onSuccess: (data) => {
      setLastSubmission(data.result);
      setActiveTab("results");
      toast.success("Exam paper successfully marked strictly against Mark Scheme!");
    },
    onError: (err: any) => {
      toast.error(`Grading failed: ${err.message || "Unknown error"}`);
    },
  });

  // Mutation: Save parsed custom paper
  const savePaperMutation = useMutation({
    mutationFn: async (paperToSave: DataResponsePaper) => {
      return await savePaperFn({
        data: { paper: paperToSave },
      });
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["data-response-papers"] });
      setSelectedPaperId(vars.id);
      setParsedPreviewPaper(null);
      setQpFile(null);
      setMsFile(null);
      setActiveTab("practice");
      toast.success("New Data Response Paper saved & loaded into Practice Studio!");
    },
    onError: (err: any) => {
      toast.error(`Failed to save paper: ${err.message}`);
    },
  });

  // Mutation: Delete custom paper
  const deletePaperMutation = useMutation({
    mutationFn: async (paperId: string) => {
      return await deletePaperFn({ data: { paperId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-response-papers"] });
      toast.success("Paper removed.");
      if (selectedPaperId === papers[0]?.id) {
        setSelectedPaperId("0455_22_2026_fm");
      }
    },
  });

  // Quick Action: Copy extract snippet to current question answer
  const handleInsertExtractQuote = (paragraphText: string) => {
    if (!currentQuestion) return;
    const key = currentQuestion.number;
    const existing = answers[key] || "";
    const quote = `As stated in the extract: "${paragraphText.slice(0, 140)}..." `;
    setAnswers({
      ...answers,
      [key]: existing ? `${existing}\n\n${quote}` : quote,
    });
    toast.success("Inserted extract quote into answer.");
  };

  // Quick Action: Insert diagram analysis template
  const handleInsertDiagramTemplate = (q: DataResponseQuestion) => {
    if (!q.diagramSpec) return;
    const key = q.number;
    const existing = answers[key] || "";
    const axesY = q.diagramSpec.yLabel;
    const axesX = q.diagramSpec.xLabel;
    const shift = q.diagramGuidance?.shiftDescription || "Shift direction...";
    const eq = q.diagramGuidance?.equilibriumDescription || "Equilibrium changes from (P1, Q1) to (P2, Q2)...";
    const template = `[DIAGRAM ANALYSIS: ${q.diagramGuidance?.diagramName || "Cambridge Economic Model"}]\n- Vertical Axis: ${axesY}\n- Horizontal Axis: ${axesX}\n- Initial Equilibrium: (P1, Q1) established where initial curves intersect.\n- Curve Shift: ${shift}\n- New Equilibrium: ${eq}`;
    setAnswers({
      ...answers,
      [key]: existing ? `${existing}\n\n${template}` : template,
    });
    toast.success("Inserted Cambridge diagram analysis template into answer.");
  };

  // OCR and Extraction pipeline
  const handleRunOcrExtraction = async () => {
    if (!qpFile || !msFile) {
      toast.error("Please select both a Question Paper (QP) and a Mark Scheme (MS) file.");
      return;
    }

    setIsOcrProcessing(true);
    setOcrStatusMessage("Reading Question Paper text & tables…");

    try {
      // 1. Extract QP text
      let qpText = "";
      try {
        qpText = await extractTextFromFile(qpFile);
      } catch {
        setOcrStatusMessage("Running OCR on Question Paper…");
        const ocrRes = await ocrPdf(qpFile);
        qpText = ocrRes.text;
      }

      setOcrStatusMessage("Reading Mark Scheme text & rubrics…");

      // 2. Extract MS text
      let msText = "";
      try {
        msText = await extractTextFromFile(msFile);
      } catch {
        setOcrStatusMessage("Running OCR on Mark Scheme…");
        const ocrRes = await ocrPdf(msFile);
        msText = ocrRes.text;
      }

      setOcrStatusMessage("AI Extracting Section A case study, questions, and mark schemes…");

      // 3. Send to Server Parser
      const parseRes = await parseUploadFn({
        data: {
          qpText,
          msText,
          defaultLevel: uploadLevel,
          defaultSubject: uploadSubject,
        },
      });

      setParsedPreviewPaper(parseRes.paper);
      setOcrStatusMessage("Extraction complete! Review parsed paper below.");
      toast.success("Paper and Mark Scheme successfully extracted!");
    } catch (err: any) {
      console.error("OCR extraction failed:", err);
      toast.error(`Extraction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* TOP HEADER & STUDIO IDENTITY BANNER                                  */}
      {/* ==================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-muted/40 p-5 sm:p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="h-6 w-6 text-emerald-500 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
                  Cambridge Data Response Studio
                </h2>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold uppercase tracking-wider shrink-0">
                Section A Mastery
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-muted-foreground shrink-0">
                0455 Syllabus
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real examination case studies for Cambridge International IGCSE 0455 (Paper 2) and IGCSE 0455 (Paper 2). Practice Table 1.1 interpretation, Own Figure Rule (OFR) calculations, curve shift diagrams, and extended essays graded strictly against official Cambridge mark scheme rubrics.
            </p>
          </div>

          {/* Quick Header Actions & Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs gap-1.5 h-9 font-medium border-border/80 hover:bg-muted/60 shrink-0"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              {showInstructions ? "Hide Instructions" : "How to Use & Exam Rules"}
              {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-muted/80 p-1 h-9 flex-wrap sm:flex-nowrap">
                <TabsTrigger value="practice" className="gap-1.5 text-xs font-semibold">
                  <PenTool className="h-3.5 w-3.5" />
                  Practice Studio
                </TabsTrigger>
                {lastSubmission && (
                  <TabsTrigger value="results" className="gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Award className="h-3.5 w-3.5" />
                    Marking Report
                  </TabsTrigger>
                )}
                <TabsTrigger value="upload" className="gap-1.5 text-xs font-semibold">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload & OCR
                </TabsTrigger>
                <TabsTrigger value="library" className="gap-1.5 text-xs font-semibold">
                  <BookOpen className="h-3.5 w-3.5" />
                  Paper Library ({papers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* COLLAPSIBLE INSTRUCTIONS & Cambridge IGCSE 0455 STANDARDISATION GUIDE      */}
      {/* ==================================================================== */}
      {showInstructions && (
        <Card className="border border-primary/30 bg-primary/[0.02] shadow-sm transition-all animate-in fade-in-50 duration-200">
          <CardHeader className="p-5 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Compass className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                  How to Use the Data Response Studio & Cambridge Marking Rules
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[11px] font-mono">
                Examiner Reference Standard
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Follow this 4-step framework to maximize your AO1, AO2, and AO3 marks on Cambridge IGCSE 0455 Section A papers.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* 4 Interactive Process Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    STEP 1
                  </Badge>
                  <BookMarked className="h-4 w-4 text-emerald-500" />
                </div>
                <h4 className="font-bold text-xs text-foreground">Select or Upload Paper</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Choose from 30 official Cambridge IGCSE 0455 past papers (15 AS & 15 IGCSE 0455) or upload any custom QP + MS PDF via multi-model Vision OCR.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-[10px] font-bold">
                    STEP 2
                  </Badge>
                  <Search className="h-4 w-4 text-cyan-500" />
                </div>
                <h4 className="font-bold text-xs text-foreground">Scrutinise Case Data</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Read the extract, search keywords, and inspect Table 1.1 figures. Use 1-click "Quote" to paste exact contextual data straight into your answers.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                    STEP 3
                  </Badge>
                  <Calculator className="h-4 w-4 text-amber-500" />
                </div>
                <h4 className="font-bold text-xs text-foreground">Draft Answers & Workings</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Show workings for calculation questions (Own Figure Rule applies). For diagram questions, describe axes and shifts. Write balanced arguments for 6+ mark questions.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold">
                    STEP 4
                  </Badge>
                  <Trophy className="h-4 w-4 text-purple-500" />
                </div>
                <h4 className="font-bold text-xs text-foreground">Strict Cambridge Marking</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Submit to get line-by-line mark scheme matching, AO1-AO3 mark breakdowns, Level 3 evaluation checks, and verified Cambridge model answers.
                </p>
              </div>
            </div>

            {/* Cambridge 3 Golden Rules Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-700 dark:text-amber-300 block">
                    Level 3 Rubric Rule (6+ marks)
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    Marks above Level 2 (5+ marks) are strictly withheld unless there is an explicit, balanced conclusion with contextual evaluation.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                    Own Figure Rule (OFR)
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    Even if an initial arithmetic calculation is mistaken, subsequent answers using that figure receive full credit if economically sound.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-700 dark:text-blue-300 block">
                    Extract Linkage Penalty
                  </span>
                  <span className="text-muted-foreground text-[11px] leading-tight">
                    Pure textbook theory without quoting countries, company names, or figures from the case study extract is capped at partial marks.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* VIEW 1: PRACTICE STUDIO (Split-View Extract Reader & Answering)       */}
      {/* ==================================================================== */}
      {activeTab === "practice" && (
        <div className="space-y-6">
          {/* LEVEL SELECTION & PAPER FILTER TOOLBAR */}
          <Card className="border border-border/80 shadow-sm bg-card/70 backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
              {/* Row 1: Level Filter Pills & Search Input */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    Filter Level:
                  </span>
                  <Button
                    variant={levelFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLevelFilter("all")}
                    className={cn(
                      "text-xs font-semibold h-8 px-3 gap-1.5 transition-all",
                      levelFilter === "all" ? "shadow-xs" : "hover:bg-muted"
                    )}
                  >
                    All Official 0455 Papers ({papers.length})
                  </Button>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs font-semibold px-2.5 py-1">
                    Cambridge IGCSE 0455 · Paper 2 Section A ({asCount + a2Count})
                  </Badge>
                </div>

                {/* Quick Topic Search */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by topic, country, year…"
                    value={paperSearchQuery}
                    onChange={(e) => setPaperSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                  {paperSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaperSearchQuery("")}
                      className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Selected Paper Dropdown & Active Exam Status Badges */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-3 border-t border-border/50">
                <div className="flex flex-1 items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap shrink-0">
                    Active Paper:
                  </Label>
                  <Select
                    value={selectedPaperId}
                    onValueChange={(id) => {
                      setSelectedPaperId(id);
                      setActiveQuestionIdx(0);
                    }}
                  >
                    <SelectTrigger className="w-full xl:max-w-md 2xl:max-w-xl bg-background font-medium text-xs h-9 min-w-0">
                      <SelectValue placeholder="Select Data Response Paper..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[380px]">
                      {filteredPapers.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs py-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-mono px-1.5 py-0 font-bold",
                                p.qualificationLevel === "as"
                                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                  : "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5"
                              )}
                            >
                              IGCSE {p.subjectCode}/{p.paperNumber}
                            </Badge>
                            <span className="truncate font-semibold">{p.title}</span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              ({p.seriesLabel || "Official"})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Controls & Submission Trigger */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 xl:pt-0">
                  {currentPaper?.sampleAnswers && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadSampleAnswers}
                      className="text-xs text-primary border-primary/30 hover:bg-primary/10 h-9 font-semibold gap-1.5 whitespace-nowrap"
                      title="Load Cambridge benchmark answers into all sub-questions"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Load Benchmark Script
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnswers({});
                      try {
                        localStorage.removeItem(`marginal_dr_draft_${selectedPaperId}`);
                      } catch {}
                      toast.info("Cleared all question answers.");
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive h-9 whitespace-nowrap"
                  >
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => gradeMutation.mutate()}
                    disabled={gradeMutation.isPending || !currentPaper}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9 shadow-xs whitespace-nowrap shrink-0"
                  >
                    {gradeMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Marking against MS…
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Submit for Strict Marking
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Active Paper Feature Bar */}
              {currentPaper && (
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <Badge
                    className={cn(
                      "font-bold text-[11px]",
                      currentPaper.qualificationLevel === "as"
                        ? "bg-emerald-600 text-white"
                        : "bg-indigo-600 text-white"
                    )}
                  >
                    {currentPaper.qualificationLevel === "as" ? "Cambridge IGCSE 0455 (Paper 2)" : "Cambridge IGCSE 0455 (Paper 2)"}
                  </Badge>

                  <Badge variant="outline" className="text-[11px] font-mono">
                    {currentPaper.subjectCode}/{currentPaper.paperNumber} · {currentPaper.totalMarks} Marks
                  </Badge>

                  <Badge variant="secondary" className="text-[11px] font-medium">
                    <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                    {currentPaper.durationMinutes} Minutes Time Allocation
                  </Badge>

                  {currentPaper.extract.tables && currentPaper.extract.tables.length > 0 && (
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-cyan-500/5 text-[11px]">
                      Table 1.1 Data Included
                    </Badge>
                  )}

                  {currentPaper.questions.some((q) => q.hasDiagramRequirement) && (
                    <Badge variant="outline" className="border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/5 text-[11px]">
                      SVG Curve Shift Diagrams
                    </Badge>
                  )}

                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5 text-[11px]">
                    Level 3 Evaluative Rubrics
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <CompactProgressBar
            active={gradeMutation.isPending}
            stages={DATA_RESPONSE_GRADING_STAGES}
            totalMs={36_000}
            title="Marking Data Response paper against Cambridge mark scheme…"
            estimatedTimeLabel="Est: ~25–45s"
            statusBadge="Marking Active"
            showStages
          />

          {currentPaper ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: CASE STUDY / EXTRACT VIEWER (5 COLS, STICKY ON DESKTOP) */}
              <div className="xl:col-span-5 space-y-3 flex flex-col xl:sticky xl:top-4 xl:self-start min-w-0">
                {/* View Mode Toggle Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/80 shadow-xs">
                  <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-lg border border-border/60">
                    <Button
                      type="button"
                      variant={extractViewMode === "pdf" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setExtractViewMode("pdf")}
                      className={cn(
                        "h-7 text-xs font-semibold px-2.5 gap-1.5 transition-all",
                        extractViewMode === "pdf"
                          ? "bg-background shadow-xs text-rose-600 dark:text-rose-400 font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Official Past Paper PDF
                      {currentPaper.pdfUrl && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant={extractViewMode === "text" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setExtractViewMode("text")}
                      className={cn(
                        "h-7 text-xs font-semibold px-2.5 gap-1.5 transition-all",
                        extractViewMode === "text"
                          ? "bg-background shadow-xs text-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Text Transcript
                    </Button>
                  </div>

                  {extractViewMode === "text" ? (
                    <div className="relative flex-1 sm:w-48">
                      <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search extract data…"
                        value={extractFilter}
                        onChange={(e) => setExtractFilter(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background"
                      />
                    </div>
                  ) : (
                    currentPaper.originalExamCode && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono font-bold border-primary/30 text-primary bg-primary/5 ml-auto"
                      >
                        {currentPaper.originalExamCode}
                      </Badge>
                    )
                  )}
                </div>

                {/* Left Column Content: Typeset Insert vs PDF Viewer */}
                {extractViewMode === "text" ? (
                  <CambridgeExamInsert
                    paper={currentPaper}
                    activeQuestion={currentQuestion}
                    onInsertQuote={handleInsertExtractQuote}
                    searchFilter={extractFilter}
                    className="flex-1"
                  />
                ) : (
                  <CambridgePdfViewer
                    paperId={currentPaper.id}
                    pdfUrl={currentPaper.pdfUrl}
                    paperTitle={currentPaper.title}
                    examCode={currentPaper.originalExamCode}
                    height="calc(100vh - 175px)"
                    className="min-h-[560px] max-h-[860px]"
                    onFullScreenToggle={() => setPdfModalOpen(true)}
                  />
                )}
              </div>

              {/* RIGHT COLUMN: QUESTIONS & ANSWERING CANVAS (7 COLS) */}
              <div className="xl:col-span-7 space-y-4 min-w-0">
                {/* Question Navigation Tabs with Progress Tally */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                    {currentPaper.questions.map((q, idx) => {
                      const ans = answers[q.number] || answers[q.id] || "";
                      const hasAnswer = ans.trim().length > 0;
                      const isActive = idx === activeQuestionIdx;
                      return (
                        <Button
                          key={q.id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveQuestionIdx(idx)}
                          className={cn(
                            "text-xs font-semibold h-8 px-3 gap-1.5 shrink-0 transition-all",
                            isActive
                              ? "shadow-xs"
                              : hasAnswer
                              ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                              : ""
                          )}
                        >
                          {hasAnswer ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          )}
                          {q.number}
                          <span className="text-[10px] opacity-75">[{q.maxMark}m]</span>
                        </Button>
                      );
                    })}
                  </div>

                  <span className="text-xs font-mono font-semibold text-muted-foreground whitespace-nowrap shrink-0">
                    Q{activeQuestionIdx + 1} of {currentPaper.questions.length}
                  </span>
                </div>

                {currentQuestion && (
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="p-4 border-b bg-card pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className="text-xs font-bold font-mono px-2 py-0.5 border-primary/40 text-primary bg-primary/5">
                            Question {currentQuestion.number}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {currentQuestion.maxMark} Marks
                          </Badge>
                          {currentQuestion.maxMark >= 6 ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">
                              Levels-Based Rubric (AO3 Evaluation)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase font-mono">
                              Point-Based Criteria
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono text-[11px]">
                            AO1: {currentQuestion.tariff.ao1} · AO2: {currentQuestion.tariff.ao2}
                            {currentQuestion.tariff.ao3 ? ` · AO3: ${currentQuestion.tariff.ao3}` : ""}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-semibold text-foreground leading-snug">
                        {currentQuestion.title}
                      </h3>

                      {currentQuestion.extractLinkageExpected && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            <strong>Extract Linkage Required:</strong> Cambridge mark schemes strictly penalise generic textbook answers that fail to quote or apply specific facts, numbers, or names from the case extract.
                          </span>
                        </div>
                      )}

                      {/* Official Past Paper PDF Reference Toolbar */}
                      {currentPaper.pdfUrl && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/40">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExtractViewMode("pdf")}
                            className={cn(
                              "h-7 text-[11px] gap-1.5 font-semibold transition-all",
                              extractViewMode === "pdf"
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border/80 text-foreground hover:bg-muted"
                            )}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            {extractViewMode === "pdf" ? "Showing Past Paper PDF" : "View in Past Paper PDF / Insert"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPdfModalOpen(true)}
                            className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground font-medium"
                          >
                            <Maximize2 className="h-3 w-3" />
                            Full Screen PDF
                          </Button>
                          <a
                            href={currentPaper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline font-medium ml-auto"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open {currentPaper.originalExamCode || "Past Paper"} in New Tab
                          </a>
                        </div>
                      )}

                      {/* Visual Cambridge Model Diagram Container */}
                      {currentQuestion.diagramSpec && (
                        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BarChart2 className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-xs text-foreground">
                                Cambridge Diagram Requirement: {currentQuestion.diagramGuidance?.diagramName || "Economics Diagram"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                                {currentQuestion.diagramGuidance?.marksAllocated || 2} Diagram Marks
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInsertDiagramTemplate(currentQuestion)}
                                className="h-6 px-2 text-[10px] gap-1 text-primary border-primary/40 hover:bg-primary/10"
                              >
                                <Sparkles className="h-3 w-3" />
                                Insert Diagram Analysis Template
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 items-start">
                            <div className="2xl:col-span-7 bg-background rounded-lg border border-border/80 p-2 shadow-xs flex items-center justify-center min-w-0 overflow-hidden">
                              <div className="w-full max-w-[380px]">
                                <EconomicsDiagram
                                  spec={currentQuestion.diagramSpec}
                                  title={currentQuestion.diagramGuidance?.diagramName || currentQuestion.title}
                                />
                              </div>
                            </div>
                            <div className="2xl:col-span-5 text-xs space-y-2 min-w-0">
                              <div className="p-2 rounded bg-muted/40 border border-border/50 space-y-1">
                                <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider block">
                                  Mark Scheme Diagram Criteria:
                                </span>
                                <p className="text-[11px] text-foreground/90">
                                  <strong>Axes:</strong> {currentQuestion.diagramGuidance?.axes?.join(" & ") || `${currentQuestion.diagramSpec.yLabel} vs ${currentQuestion.diagramSpec.xLabel}`}
                                </p>
                                <p className="text-[11px] text-foreground/90">
                                  <strong>Shift:</strong> {currentQuestion.diagramGuidance?.shiftDescription}
                                </p>
                                <p className="text-[11px] text-foreground/90">
                                  <strong>Equilibrium:</strong> {currentQuestion.diagramGuidance?.equilibriumDescription}
                                </p>
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">
                                Note: Describe curve shifts with precise coordinates (P1, Q1 to P2, Q2) to earn full diagram marks.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Collapsible Mark Scheme / Rubric preview for reference */}
                      <Accordion type="single" collapsible className="mt-2 text-xs">
                        <AccordionItem value="rubric-preview" className="border-border/40">
                          <AccordionTrigger className="py-1.5 text-xs text-muted-foreground hover:text-foreground">
                            Inspect Official Mark Scheme Criteria & Rubric
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 pt-1 pb-2">
                            <div className="bg-muted/40 p-3 rounded border border-border/50 text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground">
                              {currentQuestion.markingGuide}
                            </div>
                            {currentQuestion.rubricLevels && (
                              <div className="grid grid-cols-1 gap-1.5 pt-1">
                                {currentQuestion.rubricLevels.map((lvl) => (
                                  <div key={lvl.level} className="text-xs p-2 rounded bg-muted/20 border border-border/40">
                                    <div className="font-semibold text-foreground flex items-center justify-between">
                                      <span>Level {lvl.level}: {lvl.label}</span>
                                      <span className="font-mono text-primary">{lvl.marksRange}</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] mt-0.5">{lvl.description}</p>
                                    {lvl.evaluativeRequirement && (
                                      <p className="text-amber-600 dark:text-amber-400 text-[11px] mt-1 font-medium">
                                        Evaluation Requirement: {lvl.evaluativeRequirement}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`answer_${currentQuestion.number}`} className="font-semibold text-foreground">
                            Candidate Script:
                          </Label>
                          {(answers[currentQuestion.number] || answers[currentQuestion.id])?.trim() && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="h-3 w-3" /> Auto-saved draft
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px]">
                          Word Count: {((answers[currentQuestion.number] || answers[currentQuestion.id]) || "").trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>

                      <Textarea
                        id={`answer_${currentQuestion.number}`}
                        rows={11}
                        placeholder={`Write candidate response for question ${currentQuestion.number} here. Explicitly reference extract facts, data points, and economic theory...`}
                        value={answers[currentQuestion.number] || answers[currentQuestion.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [currentQuestion.number]: e.target.value, [currentQuestion.id]: e.target.value })}
                        className="font-sans text-sm leading-relaxed resize-y bg-background"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {currentQuestion.hasDiagramRequirement && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInsertDiagramTemplate(currentQuestion)}
                              className="h-7 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <BarChart2 className="h-3 w-3" />
                              Insert Diagram Analysis
                            </Button>
                          )}
                          {currentPaper.sampleAnswers?.[currentQuestion.number] && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const sample = currentPaper.sampleAnswers?.[currentQuestion.number] || "";
                                setAnswers({
                                  ...answers,
                                  [currentQuestion.number]: sample,
                                  [currentQuestion.id]: sample,
                                });
                                toast.success(`Loaded benchmark exemplar for ${currentQuestion.number}`);
                              }}
                              className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Sparkles className="h-3 w-3 text-primary" />
                              Load Benchmark Answer
                            </Button>
                          )}
                        </div>

                        {(answers[currentQuestion.number] || answers[currentQuestion.id]) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newAns = { ...answers };
                              delete newAns[currentQuestion.number];
                              delete newAns[currentQuestion.id];
                              setAnswers(newAns);
                            }}
                            className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                          >
                            Clear Answer
                          </Button>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIdx === 0}
                        onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                        className="text-xs"
                      >
                        Previous Question
                      </Button>

                      <div className="flex items-center gap-2">
                        {activeQuestionIdx < currentPaper.questions.length - 1 ? (
                          <Button
                            size="sm"
                            onClick={() => setActiveQuestionIdx((prev) => prev + 1)}
                            className="text-xs gap-1"
                          >
                            Next Question
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => gradeMutation.mutate()}
                            disabled={gradeMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                          >
                            {gradeMutation.isPending ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Finish & Mark Entire Paper
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                )}

                <CompactProgressBar
                  active={gradeMutation.isPending}
                  stages={DATA_RESPONSE_GRADING_STAGES}
                  totalMs={36_000}
                  title="Marking Data Response paper against Cambridge mark scheme…"
                  estimatedTimeLabel="Est: ~25–45s"
                  statusBadge="Marking Active"
                  showStages
                />
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <FileSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No Data Response paper loaded. Select a paper from the dropdown or upload a new one.</p>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: MARKING REPORT & DIAGNOSTIC REVIEW                           */}
      {/* ==================================================================== */}
      {activeTab === "results" && lastSubmission && (
        <div className="space-y-6">
          {/* Executive Performance Banner */}
          <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-background to-emerald-500/5 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-emerald-500" />
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      Official Cambridge Mark Scheme Assessment
                    </h3>
                  </div>
                  <p className="text-sm text-foreground/90 font-medium">
                    {stripStars(lastSubmission.paperTitle)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stripStars(lastSubmission.examinerExecutiveSummary)}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-card/80 p-4 rounded-xl border border-border/80 shadow-sm shrink-0">
                  <div className="text-center px-3 border-r border-border/60">
                    <div className="text-3xl font-extrabold text-foreground">
                      {lastSubmission.totalMarksAwarded}
                      <span className="text-lg text-muted-foreground font-normal">/{lastSubmission.maxTotalMarks}</span>
                    </div>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                      Total Marks
                    </div>
                  </div>

                  <div className="text-center px-3 border-r border-border/60">
                    <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {lastSubmission.percentage}%
                    </div>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                      Percentage
                    </div>
                  </div>

                  <div className="text-center px-3">
                    <Badge className="bg-emerald-600 text-white font-bold text-xs py-1">
                      {stripStars(lastSubmission.overallBand)}
                    </Badge>
                    <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mt-1">
                      Cambridge Band
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="text-xs gap-1.5 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / Save Report (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("practice")}
                    className="text-xs gap-1.5 font-semibold bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    Return to Answering Studio (Edit & Regrade)
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Standardised: {new Date(lastSubmission.submittedAt).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Question Detailed Breakdown */}
          <div className="space-y-4">
            <h4 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Sub-Question Detailed Review & Rubric Audits
            </h4>

            {Object.values(lastSubmission.questionResults).map((result, idx) => (
              <Card key={idx} className="border border-border/80 overflow-hidden shadow-sm">
                <CardHeader className="p-4 border-b bg-muted/20 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                        {result.questionNumber}
                      </Badge>
                      <h5 className="font-semibold text-sm text-foreground">
                        {stripStars(result.questionTitle)}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Extract Context Verification Pill */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium",
                          result.extractContextCheck.contextQuality === "strong"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : result.extractContextCheck.contextQuality === "adequate"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        )}
                      >
                        Extract: {stripStars(result.extractContextCheck.contextQuality.replace(/_/g, " "))}
                      </Badge>

                      <Badge
                        className={cn(
                          "font-bold font-mono text-xs px-2.5 py-0.5",
                          result.awardedMark === result.maxMark
                            ? "bg-emerald-600 text-white"
                            : result.awardedMark > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        )}
                      >
                        {result.awardedMark} / {result.maxMark} Marks
                      </Badge>
                    </div>
                  </div>

                  {/* Rubric level awarded banner for 6+ mark questions */}
                  {result.rubricLevelAwarded && (
                    <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">
                          {stripStars(result.rubricLevelAwarded.label)} ({stripStars(result.rubricLevelAwarded.marksRange)})
                        </span>
                      </div>
                      {result.rubricLevelAwarded.evaluativeComment && (
                        <span className="text-muted-foreground italic text-[11px]">
                          {stripStars(result.rubricLevelAwarded.evaluativeComment)}
                        </span>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Diagram Mark Scheme Criteria Audit */}
                  {result.diagramEvaluation && (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-primary" />
                          <span className="font-bold text-xs text-foreground">
                            Cambridge Diagram Criteria Audit
                          </span>
                        </div>
                        <Badge
                          className={cn(
                            "font-mono text-xs font-bold",
                            result.diagramEvaluation.marksAwarded === (currentQuestion?.diagramGuidance?.marksAllocated || 2)
                              ? "bg-emerald-600 text-white"
                              : result.diagramEvaluation.marksAwarded > 0
                              ? "bg-primary text-primary-foreground"
                              : "bg-destructive text-destructive-foreground"
                          )}
                        >
                          Diagram Marks: {result.diagramEvaluation.marksAwarded} / {currentQuestion?.diagramGuidance?.marksAllocated || 2}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div
                          className={cn(
                            "p-2 rounded border text-center font-medium",
                            result.diagramEvaluation.detected
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-destructive/10 border-destructive/30 text-destructive"
                          )}
                        >
                          <div className="text-[10px] text-muted-foreground uppercase">Diagram</div>
                          <div className="text-xs font-semibold">
                            {result.diagramEvaluation.detected ? "Detected" : "Missing"}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-2 rounded border text-center font-medium",
                            result.diagramEvaluation.axesLabelledCorrectly
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-destructive/10 border-destructive/30 text-destructive"
                          )}
                        >
                          <div className="text-[10px] text-muted-foreground uppercase">Axes</div>
                          <div className="text-xs font-semibold">
                            {result.diagramEvaluation.axesLabelledCorrectly ? "Correct" : "Inaccurate"}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-2 rounded border text-center font-medium",
                            result.diagramEvaluation.shiftDirectionCorrect
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                          )}
                        >
                          <div className="text-[10px] text-muted-foreground uppercase">Shifts</div>
                          <div className="text-xs font-semibold">
                            {result.diagramEvaluation.shiftDirectionCorrect ? "Accurate" : "Flawed/Missing"}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-2 rounded border text-center font-medium",
                            result.diagramEvaluation.equilibriumLabelled
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                          )}
                        >
                          <div className="text-[10px] text-muted-foreground uppercase">Equilibrium</div>
                          <div className="text-xs font-semibold">
                            {result.diagramEvaluation.equilibriumLabelled ? "Identified" : "Omitted"}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground bg-background p-2.5 rounded border border-border/60 leading-relaxed">
                        <strong className="text-foreground">Diagram Evaluation:</strong> {stripStars(result.diagramEvaluation.examinerComment)}
                      </p>
                    </div>
                  )}

                  {/* AO Breakdown Pills */}
                  <div className="flex flex-wrap items-center gap-3 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      AO Allocation:
                    </span>
                    <span className="font-mono">
                      <strong>AO1 (Knowledge):</strong> {result.aoBreakdown.knowledge.awarded}/{result.aoBreakdown.knowledge.outOf}
                    </span>
                    <span className="font-mono">
                      <strong>AO2 (Analysis):</strong> {result.aoBreakdown.analysis?.awarded ?? (result.aoBreakdown as any).application?.awarded ?? 0}/{result.aoBreakdown.analysis?.outOf ?? (result.aoBreakdown as any).application?.outOf ?? 0}
                    </span>
                    {result.aoBreakdown.evaluation && result.aoBreakdown.evaluation.outOf > 0 && (
                      <span className="font-mono text-primary font-bold">
                        <strong>AO3 (Evaluation):</strong> {result.aoBreakdown.evaluation.awarded}/{result.aoBreakdown.evaluation.outOf}
                      </span>
                    )}
                  </div>

                  {/* Specific Mark Scheme Criteria Met & Credited Reasoning */}
                  {result.specificCriteriaMet && result.specificCriteriaMet.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Specific Mark Scheme Criteria Met:</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {result.specificCriteriaMet.map((item, cIdx) => (
                          <div key={cIdx} className="p-2.5 rounded-lg bg-background/80 border border-emerald-500/20 text-xs space-y-1">
                            <div className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <span className="font-semibold text-foreground/90">{stripStars(item.criterion)}</span>
                            </div>
                            {item.candidateEvidence && (
                              <div className="pl-5 text-[11px] text-muted-foreground italic">
                                Candidate Evidence: &ldquo;{stripStars(item.candidateEvidence)}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : result.creditedPoints && result.creditedPoints.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Specific Mark Scheme Criteria Met:</span>
                      </div>
                      <ul className="list-disc pl-5 text-xs text-foreground/90 space-y-1 pt-1">
                        {result.creditedPoints.map((pt, pIdx) => (
                          <li key={pIdx}>{stripStars(pt)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Rewarded Quotations from Candidate Script */}
                  {result.evidenceQuotes.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Rewarded Quotations from Candidate Script:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {result.evidenceQuotes.map((quote, qIdx) => (
                          <Badge key={qIdx} variant="secondary" className="text-xs font-normal italic bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20">
                            &ldquo;{stripStars(quote)}&rdquo;
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Constructive Feedback & Missing Criteria */}
                  {((result.constructiveFeedback && result.constructiveFeedback.length > 0) || (result.missingMarkSchemePoints && result.missingMarkSchemePoints.length > 0)) && (
                    <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Constructive Feedback & Official Criteria Guidance:</span>
                      </div>
                      <ul className="list-disc pl-5 text-xs text-foreground/80 space-y-1 pt-1">
                        {(result.constructiveFeedback && result.constructiveFeedback.length > 0
                          ? result.constructiveFeedback
                          : result.missingMarkSchemePoints
                        ).map((miss, mIdx) => (
                          <li key={mIdx} className="leading-relaxed">
                            {stripStars(miss)}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-muted-foreground italic pt-1">
                        Feedback strictly reflects omissions from official Cambridge IGCSE 0455 mark scheme requirements.
                      </p>
                    </div>
                  )}

                  {/* Examiner Assessment Rationale */}
                  <div className="space-y-1.5 rounded-lg border border-border/70 bg-card p-3.5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span>Principal Examiner Assessment Rationale:</span>
                    </div>
                    <p className="text-xs/relaxed text-foreground/90 font-medium whitespace-pre-wrap">
                      {stripStars(result.examinerRationale)}
                    </p>
                  </div>

                  {/* Context Check Feedback */}
                  {result.extractContextCheck.feedback && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/40">
                      <strong className="text-foreground">Contextual Evidence Assessment:</strong> {stripStars(result.extractContextCheck.feedback)}
                    </div>
                  )}

                  {/* Model Answer Exemplar & Improvement Tip */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
                    <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                      <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Cambridge Model Answer Formulation
                      </span>
                      <p className="text-foreground/90 text-xs/relaxed leading-relaxed">{stripStars(result.modelAnswerSnippet)}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        Examiner Key Improvement Advice
                      </span>
                      <p className="text-foreground/90 text-xs/relaxed leading-relaxed">{stripStars(result.improvementTip)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: UPLOAD & OCR EXTRACTOR                                       */}
      {/* ==================================================================== */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-5 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold">
                  Upload Whole Examination Paper (QP & MS)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Upload both Question Paper (QP) and Mark Scheme (MS) as PDF, Word (.docx), or scanned images. Our browser OCR and AI parser automatically extract the Section A Case Study extract, tables, sub-questions, and exact mark scheme rubrics.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Paper Metadata selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject Syllabus:</Label>
                  <Select value={uploadSubject} onValueChange={(v: any) => setUploadSubject(v)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0455">Economics (0455)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qualification Level:</Label>
                  <Select value={uploadLevel} onValueChange={(v: any) => setUploadLevel(v)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="as">IGCSE 0455 (Paper 2)</SelectItem>
                      <SelectItem value="a2">IGCSE 0455 (Paper 2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload Dropzones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QP Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>1. Question Paper (QP) File:</span>
                    {qpFile && <Badge variant="secondary" className="text-[10px]">{qpFile.name}</Badge>}
                  </Label>
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/10">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                    <p className="text-xs font-medium text-foreground mb-1">
                      Drag & Drop or Select QP PDF / DOCX
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Contains the Section A Case Study article, data tables, and sub-questions.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setQpFile(file);
                      }}
                      className="max-w-xs mx-auto text-xs"
                    />
                  </div>
                </div>

                {/* MS Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>2. Mark Scheme (MS) File:</span>
                    {msFile && <Badge variant="secondary" className="text-[10px]">{msFile.name}</Badge>}
                  </Label>
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/10">
                    <FileCheck2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                    <p className="text-xs font-medium text-foreground mb-1">
                      Drag & Drop or Select MS PDF / DOCX
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Contains official points, calculation answers, and 6+ marks Level 3 rubrics.
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMsFile(file);
                      }}
                      className="max-w-xs mx-auto text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Extraction Trigger Button & Progress */}
              <div className="pt-2">
                <Button
                  onClick={handleRunOcrExtraction}
                  disabled={!qpFile || !msFile || isOcrProcessing}
                  className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold text-xs gap-2"
                >
                  {isOcrProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {ocrStatusMessage || "Running OCR & AI parsing…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Run OCR & Extract Section A Questions & Mark Scheme
                    </>
                  )}
                </Button>

                {isOcrProcessing && (
                  <CompactProgressBar
                    active={isOcrProcessing}
                    stages={DATA_RESPONSE_EXTRACTION_STAGES}
                    totalMs={28_000}
                    title={ocrStatusMessage || "Running OCR & AI parsing…"}
                    estimatedTimeLabel="Est: ~20–35s"
                    statusBadge="Extracting"
                    showStages
                    className="mt-3"
                  />
                )}
              </div>

              {/* Preview of Parsed Paper */}
              {parsedPreviewPaper && (
                <div className="space-y-4 pt-6 border-t border-border/70">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Parsed Paper Preview: {parsedPreviewPaper.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {parsedPreviewPaper.questions.length} Sub-questions extracted · {parsedPreviewPaper.totalMarks} Total marks
                      </p>
                    </div>

                    <Button
                      onClick={() => savePaperMutation.mutate(parsedPreviewPaper)}
                      disabled={savePaperMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                    >
                      {savePaperMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save to Library & Practice
                    </Button>
                  </div>

                  {/* Extract Preview */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-2">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      Extracted Case Study Extract: {parsedPreviewPaper.extract.title}
                    </span>
                    <p className="text-foreground/90 text-xs/relaxed max-h-36 overflow-y-auto pr-2">
                      {parsedPreviewPaper.extract.paragraphs.join("\n\n")}
                    </p>
                  </div>

                  {/* Extracted Questions list */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      Extracted Sub-Questions & Mark Schemes:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {parsedPreviewPaper.questions.map((q, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border/60 bg-card text-xs flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[11px] font-bold">
                                {q.number}
                              </Badge>
                              <span className="font-semibold text-foreground">{q.title}</span>
                            </div>
                            <p className="text-muted-foreground text-[11px] line-clamp-2">
                              <strong>Mark Scheme:</strong> {q.markingGuide}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs font-mono">
                            {q.maxMark} Marks
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: PAPER LIBRARY & REPOSITORY WITH AS/A LEVEL FILTERS           */}
      {/* ==================================================================== */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {/* Library Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={levelFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter("all")}
                className="text-xs font-semibold h-8"
              >
                All Official 0455 Papers ({papers.length})
              </Button>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs font-semibold px-2.5 py-1">
                Cambridge IGCSE 0455 · Paper 2 Section A
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter library papers…"
                  value={paperSearchQuery}
                  onChange={(e) => setPaperSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("upload")}
                className="text-xs gap-1.5 h-8 shrink-0 font-semibold"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload New
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPapers.map((paper) => {
              const isSelected = paper.id === selectedPaperId;
              const isAs = paper.qualificationLevel === "as";
              return (
                <Card
                  key={paper.id}
                  className={cn(
                    "border transition-all duration-200 hover:shadow-md flex flex-col justify-between",
                    isSelected ? "border-primary shadow-sm ring-1 ring-primary/40 bg-primary/[0.02]" : "border-border/70 hover:border-border"
                  )}
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            isAs ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                          )}
                        >
                          {isAs ? "AS Paper 2" : "A2 Paper 2"}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px] font-bold">
                          {paper.subjectCode}/{paper.paperNumber}
                        </Badge>
                      </div>

                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {paper.totalMarks} Marks
                      </Badge>
                    </div>

                    <CardTitle className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {paper.title}
                    </CardTitle>

                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {paper.extract.title}: {paper.extract.paragraphs[0]?.slice(0, 110)}…
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 pb-3 text-xs space-y-2.5">
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5">
                      {paper.extract.tables && paper.extract.tables.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                          Table 1.1 Data
                        </span>
                      )}
                      {paper.questions.some((q) => q.hasDiagramRequirement) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          SVG Diagram
                        </span>
                      )}
                      {paper.questions.some((q) => q.maxMark >= 6) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          Level 3 Rubric
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{paper.questions.length} Questions</span>
                      <span>·</span>
                      <span>{paper.seriesLabel || "Official Series"}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-2 border-t border-border/40 flex items-center justify-between">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedPaperId(paper.id);
                        setActiveQuestionIdx(0);
                        setActiveTab("practice");
                      }}
                      className={cn(
                        "text-xs gap-1.5 h-8 font-semibold w-full",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <Play className="h-3 w-3" />
                      {isSelected ? "Currently Active — Practice" : "Select & Start Practice"}
                    </Button>

                    {!paper.isOfficial && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePaperMutation.mutate(paper.id)}
                        className="text-xs text-destructive hover:text-destructive h-8 px-2 ml-2"
                        title="Delete custom paper"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Screen Past Paper PDF Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-6xl h-[94vh] flex flex-col p-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {currentPaper?.originalExamCode || "Cambridge IGCSE 0455"} — Official Past Paper & Insert
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {currentPaper?.title}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-0 pt-2">
            {currentPaper ? (
              <CambridgePdfViewer
                paperId={currentPaper.id}
                pdfUrl={currentPaper.pdfUrl}
                paperTitle={currentPaper.title}
                examCode={currentPaper.originalExamCode}
                height="calc(94vh - 110px)"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No official PDF available for this paper.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Backwards compatibility alias for admin console
export const DataResponseAdminPanel = DataResponseStudio;
