import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  FileText,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/backend/client";
import { extractTextFromFile } from "@/lib/extract-text";
import { parsePaperQuestionsFromTexts } from "@/lib/examiner-platform/paper-parser";
import { createExaminerPaper } from "@/lib/examiner-platform/session.functions";
import type { CambridgeQuestionSpec, ExaminerCustomPaper } from "@/lib/examiner-platform/cambridge-papers";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

export type UploadPaperDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (paper: ExaminerCustomPaper) => void;
};

const COMMON_SERIES = [
  { value: "2024_may_june", label: "May/June 2024" },
  { value: "2024_oct_nov", label: "October/November 2024" },
  { value: "2024_feb_march", label: "February/March 2024" },
  { value: "2023_may_june", label: "May/June 2023" },
  { value: "2023_oct_nov", label: "October/November 2023" },
  { value: "2025_mock", label: "2025 Mock / Internal Assessment" },
  { value: "custom", label: "Custom Exam Series..." },
];

export function UploadPaperDialog({ open, onOpenChange, onSuccess }: UploadPaperDialogProps) {
  const queryClient = useQueryClient();
  const createPaperFn = useServerFn(createExaminerPaper);

  // Metadata
  const [era, setEra] = useState<"legacy" | "2027">("legacy");
  const [paperNumber, setPaperNumber] = useState("22");
  const [seriesSelect, setSeriesSelect] = useState("2024_may_june");
  const [customSeries, setCustomSeries] = useState("");
  const [title, setTitle] = useState("Cambridge 0455/22 May/June 2024 Economics");
  const [durationMinutes, setDurationMinutes] = useState(135);

  // Files
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);

  // Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatusText, setExtractStatusText] = useState("");
  const [qpRawText, setQpRawText] = useState("");
  const [msRawText, setMsRawText] = useState("");

  // Questions
  const [questions, setQuestions] = useState<CambridgeQuestionSpec[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const activeSeries = seriesSelect === "custom" ? customSeries : seriesSelect;

  // Auto-suggest title when metadata changes
  const updateMetadata = (newEra: "legacy" | "2027", newPaper: string, newSeries: string) => {
    const sLabel =
      COMMON_SERIES.find((s) => s.value === newSeries)?.label ||
      newSeries.replace(/_/g, " ").toUpperCase();
    setTitle(`Cambridge 0455/${newPaper} ${sLabel}`);
  };

  const handleEraChange = (val: "legacy" | "2027") => {
    setEra(val);
    const defPaper = "22";
    setPaperNumber(defPaper);
    updateMetadata(val, defPaper, activeSeries);
  };

  const handlePaperChange = (val: string) => {
    setPaperNumber(val);
    updateMetadata(era, val, activeSeries);
  };

  const handleSeriesChange = (val: string) => {
    setSeriesSelect(val);
    if (val !== "custom") {
      updateMetadata(era, paperNumber, val);
    }
  };

  // Perform PDF text extraction & question parsing
  const handleExtractAndParse = async () => {
    if (!qpFile || !msFile) {
      toast.error("Please select both Question Paper (QP) and Mark Scheme (MS) PDF files.");
      return;
    }

    setIsExtracting(true);
    setExtractStatusText("Initializing PDF extraction...");

    try {
      // 1. Extract QP text
      setExtractStatusText(`Extracting Question Paper: ${qpFile.name}...`);
      const qpText = await extractTextFromFile(qpFile, (page, total) => {
        setExtractStatusText(`Extracting QP (${qpFile.name}): Page ${page} of ${total}...`);
      });
      setQpRawText(qpText);

      // 2. Extract MS text
      setExtractStatusText(`Extracting Mark Scheme: ${msFile.name}...`);
      const msText = await extractTextFromFile(msFile, (page, total) => {
        setExtractStatusText(`Extracting MS (${msFile.name}): Page ${page} of ${total}...`);
      });
      setMsRawText(msText);

      // 3. Parse paper structure
      setExtractStatusText("Parsing questions, mark tariffs (AO1/AO2/AO3), and marking criteria...");
      const parsed = parsePaperQuestionsFromTexts(qpText, msText, era, paperNumber);

      if (parsed.length === 0) {
        toast.warning("Could not auto-detect standard questions; default Cambridge paper slots loaded.");
      } else {
        toast.success(`Successfully parsed ${parsed.length} questions from Question Paper & Mark Scheme!`);
      }

      setQuestions(parsed);
      setExpandedIndex(0);
    } catch (err: any) {
      console.error("PDF parse error:", err);
      toast.error(err.message || "Failed to parse PDF files.");
    } finally {
      setIsExtracting(false);
      setExtractStatusText("");
    }
  };

  // Question editing helpers
  const updateQuestion = (index: number, patch: Partial<CambridgeQuestionSpec>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === index ? { ...q, ...patch } : q)),
    );
  };

  const updateQuestionTariff = (
    index: number,
    tariffPatch: Partial<CambridgeQuestionSpec["tariff"]>,
  ) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === index
          ? {
              ...q,
              tariff: { ...q.tariff, ...tariffPatch },
            }
          : q,
      ),
    );
  };

  const addQuestion = () => {
    const nextNum = `${questions.length + 1}`;
    const newQ: CambridgeQuestionSpec = {
      number: nextNum,
      title: "Assess the economic consequences of...",
      maxMark: 12,
      tariff: { ao1: 3, ao2: 5, ao3: 4 },
      hasDiagramRequirement: true,
      syllabusTopic: "Macroeconomic Policy",
      markingGuide: "Award AO1 for definitions, AO2 for analysis with diagrams, AO3 for justified evaluation.",
    };
    setQuestions((prev) => [...prev, newQ]);
    setExpandedIndex(questions.length);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.maxMark || 0), 0);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!qpFile || !msFile) {
        throw new Error("Both Question Paper (QP) and Mark Scheme (MS) PDF files are required.");
      }
      if (questions.length === 0) {
        throw new Error("Please extract or add at least one question to this paper.");
      }
      if (!title.trim()) {
        throw new Error("Please enter a valid paper title.");
      }

      const uploadId = crypto.randomUUID();

      // 1. Upload QP to examiner-papers bucket (with fallback to mcq-papers)
      let qpUrl: string | null = null;
      try {
        const qpFileName = `${uploadId}_qp_${qpFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: qpErr } = await supabase.storage
          .from("examiner-papers")
          .upload(qpFileName, qpFile, { contentType: "application/pdf", upsert: true });

        if (!qpErr) {
          qpUrl = supabase.storage.from("examiner-papers").getPublicUrl(qpFileName).data.publicUrl;
        } else {
          const { error: fallbackErr } = await supabase.storage
            .from("mcq-papers")
            .upload(qpFileName, qpFile, { contentType: "application/pdf", upsert: true });
          if (!fallbackErr) {
            qpUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpFileName).data.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Could not upload QP file to storage:", err);
      }

      // 2. Upload MS to examiner-papers bucket (with fallback to mcq-papers)
      let msUrl: string | null = null;
      try {
        const msFileName = `${uploadId}_ms_${msFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: msErr } = await supabase.storage
          .from("examiner-papers")
          .upload(msFileName, msFile, { contentType: "application/pdf", upsert: true });

        if (!msErr) {
          msUrl = supabase.storage.from("examiner-papers").getPublicUrl(msFileName).data.publicUrl;
        } else {
          const { error: fallbackErr } = await supabase.storage
            .from("mcq-papers")
            .upload(msFileName, msFile, { contentType: "application/pdf", upsert: true });
          if (!fallbackErr) {
            msUrl = supabase.storage.from("mcq-papers").getPublicUrl(msFileName).data.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Could not upload MS file to storage:", err);
      }

      // 3. Save paper in DB via server function (also syncs MS into knowledge_documents)
      const { paper } = await createPaperFn({
        data: {
          title,
          subjectCode: "0455",
          qualificationLevel: "igcse",
          paperNumber,
          examSeries: activeSeries,
          totalMarks: totalCalculatedMarks > 0 ? totalCalculatedMarks : 60,
          durationMinutes,
          qpUrl,
          msUrl,
          qpRawText: qpRawText.slice(0, 150000),
          msRawText: msRawText.slice(0, 150000),
          questions,
        },
      });

      return paper;
    },
    onSuccess: (savedPaper) => {
      queryClient.invalidateQueries({ queryKey: ["examiner-papers"] });
      toast.success("Examination paper added with full QP & MS to school library!");
      onSuccess?.(savedPaper as any);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save paper.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Upload Examination Paper (QP &amp; MS PDF)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a full Cambridge IGCSE 0455 past paper or mock exam. The system parses questions, mark tariffs, and marking guides.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-5 py-3 text-xs">
            {/* Step 1: Exam Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Assessment Era</Label>
                <Select value={era} onValueChange={(v: "legacy" | "2027") => handleEraChange(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legacy">Legacy Era (≤ June 2026)</SelectItem>
                    <SelectItem value="2027">New Era (2027–2029)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Paper Variant</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={paperNumber}
                  onChange={(e) => handlePaperChange(e.target.value)}
                  placeholder="e.g. 22, 21, 23"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Exam Series</Label>
                <Select value={seriesSelect} onValueChange={handleSeriesChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SERIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {seriesSelect === "custom" && (
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-[11px]">Custom Series Key</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={customSeries}
                    onChange={(e) => {
                      setCustomSeries(e.target.value);
                      updateMetadata(era, paperNumber, e.target.value);
                    }}
                    placeholder="e.g. 2025_march_prelim"
                  />
                </div>
              )}

              <div className="md:col-span-2 space-y-1">
                <Label className="text-[11px]">Paper Title</Label>
                <Input
                  className="h-8 text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cambridge 0455/22 May/June 2024 Economics"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Duration (Minutes)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 120)}
                />
              </div>
            </div>

            {/* Step 2: Upload QP and MS PDFs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Question Paper File Box */}
              <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                    <FileText className="size-3.5 text-blue-500" />
                    Question Paper (QP) PDF
                  </Label>
                  {qpFile && (
                    <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/40">
                      {(qpFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Badge>
                  )}
                </div>

                <div className="border border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-md p-3 text-center cursor-pointer relative bg-muted/20">
                  <input
                    type="file"
                    accept="application/pdf,image/*,.heic,.heif"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setQpFile(file);
                    }}
                  />
                  {qpFile ? (
                    <div className="flex items-center justify-center gap-2 text-foreground font-medium text-xs">
                      <FileCheck2 className="size-4 text-emerald-500" />
                      <span className="truncate max-w-[200px]">{qpFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="size-4 text-muted-foreground mx-auto" />
                      <p className="text-[11px] text-muted-foreground">Click or drop Question Paper PDF / photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mark Scheme File Box */}
              <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Mark Scheme (MS) PDF
                  </Label>
                  {msFile && (
                    <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/40">
                      {(msFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Badge>
                  )}
                </div>

                <div className="border border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-md p-3 text-center cursor-pointer relative bg-muted/20">
                  <input
                    type="file"
                    accept="application/pdf,image/*,.heic,.heif"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setMsFile(file);
                    }}
                  />
                  {msFile ? (
                    <div className="flex items-center justify-center gap-2 text-foreground font-medium text-xs">
                      <FileCheck2 className="size-4 text-emerald-500" />
                      <span className="truncate max-w-[200px]">{msFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="size-4 text-muted-foreground mx-auto" />
                      <p className="text-[11px] text-muted-foreground">Click or drop Mark Scheme PDF / photo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parse Trigger Button */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/[0.04] border border-primary/20">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  PDF Question &amp; Mark Scheme Parser
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Extracts question prompts, maximum marks, AO tariff distributions, and mark scheme criteria.
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleExtractAndParse}
                disabled={!qpFile || !msFile || isExtracting}
                className="gap-1.5 text-xs shrink-0"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Parse Questions
                  </>
                )}
              </Button>
            </div>

            {/* Live extraction progress banner */}
            {isExtracting && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs">
                <Loader2 className="size-4 animate-spin shrink-0" />
                <span>{extractStatusText}</span>
              </div>
            )}

            {/* Step 3: Parsed Questions Breakdown */}
            {questions.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">Parsed Questions</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {questions.length} questions
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/40">
                      Total: {totalCalculatedMarks} Marks
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addQuestion}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="size-3" /> Add Question
                  </Button>
                </div>

                <div className="space-y-2">
                  {questions.map((q, idx) => {
                    const isExpanded = expandedIndex === idx;
                    return (
                      <Card key={idx} className="border-border">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer select-none bg-muted/20 hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Badge className="font-mono text-[10px] h-5 px-1.5">
                              Q{q.number}
                            </Badge>
                            <span className="text-xs font-medium text-foreground truncate max-w-[340px]">
                              {q.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {q.maxMark}m
                            </Badge>
                            {q.hasDiagramRequirement && (
                              <Badge variant="secondary" className="text-[9px]">
                                Diagram
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQuestion(idx);
                              }}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="size-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <CardContent className="p-3 pt-2 space-y-3 border-t border-border/50 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Question #</Label>
                                <Input
                                  className="h-7 text-xs font-mono"
                                  value={q.number}
                                  onChange={(e) => updateQuestion(idx, { number: e.target.value })}
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1">
                                <Label className="text-[10px]">Syllabus Topic</Label>
                                <Input
                                  className="h-7 text-xs"
                                  value={q.syllabusTopic}
                                  onChange={(e) => updateQuestion(idx, { syllabusTopic: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Max Mark</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs font-mono"
                                  value={q.maxMark}
                                  onChange={(e) =>
                                    updateQuestion(idx, {
                                      maxMark: parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px]">Question Stem / Prompt</Label>
                              <Textarea
                                className="text-xs min-h-[45px]"
                                value={q.title}
                                onChange={(e) => updateQuestion(idx, { title: e.target.value })}
                              />
                            </div>

                            {/* Tariff Breakdown */}
                            <div className="grid grid-cols-3 gap-2 p-2 rounded-md bg-muted/30">
                              <div className="space-y-1">
                                <Label className="text-[10px]">AO1 (Knowledge)</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs font-mono"
                                  value={q.tariff.ao1}
                                  onChange={(e) =>
                                    updateQuestionTariff(idx, {
                                      ao1: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">AO2 (Analysis)</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs font-mono"
                                  value={q.tariff.ao2}
                                  onChange={(e) =>
                                    updateQuestionTariff(idx, {
                                      ao2: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">AO3 (Evaluation)</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs font-mono"
                                  value={q.tariff.ao3}
                                  onChange={(e) =>
                                    updateQuestionTariff(idx, {
                                      ao3: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                id={`diagram-${idx}`}
                                checked={q.hasDiagramRequirement}
                                onCheckedChange={(val) =>
                                  updateQuestion(idx, { hasDiagramRequirement: val })
                                }
                              />
                              <Label htmlFor={`diagram-${idx}`} className="text-[11px] cursor-pointer">
                                Requires economic diagram (e.g. AD/AS, PPC, market equilibrium)
                              </Label>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px]">Mark Scheme Guidance / Indicative Content</Label>
                              <Textarea
                                className="text-xs min-h-[60px]"
                                value={q.markingGuide}
                                onChange={(e) => updateQuestion(idx, { markingGuide: e.target.value })}
                              />
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-3 border-t border-border/70 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending || !qpFile || !msFile || questions.length === 0}
            onClick={() => saveMutation.mutate()}
            className="text-xs gap-1.5"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading &amp; Saving Paper...
              </>
            ) : (
              <>
                <FileCheck2 className="size-3.5" />
                Save Paper to Library
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
