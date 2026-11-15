import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Images,
  Loader2,
  ShieldCheck,
  SpellCheck,
  Sparkles,
  Upload,
  X,
  PenLine,
  Building2,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { GradingProgress } from "@/components/app/grading-progress";
import { HandwritingUpload } from "@/components/app/handwriting-upload";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import {
  MarkSchemeScreenshots,
  type MarkSchemeImage,
} from "@/components/app/mark-scheme-screenshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  describeDiagramImage,
  describeDiagramUrl,
  listDiagramLibrary,
} from "@/lib/diagrams.functions";
import { checkQuestionGrounding, gradeEssaySubmission } from "@/lib/grading.functions";
import { checkWritingQuality } from "@/lib/writing-check.functions";
import { getMe } from "@/lib/account.functions";
import type { Grading } from "@/lib/examiner/types";

// Optional prefill from the Question bank ("Practice this" links here with
// a real past-paper question already picked).
const gradeSearchSchema = z
  .object({
    q: z.string().trim().max(2000).optional().catch(undefined),
    marks: z
      .union([
        z.literal(2),
        z.literal(4),
        z.literal(6),
        z.literal(8),
        z.literal("2"),
        z.literal("4"),
        z.literal("6"),
        z.literal("8"),
      ])
      .optional()
      .transform((val) => (val ? (Number(val) as 2 | 4 | 6 | 8) : undefined))
      .catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/grade")({
  validateSearch: (search: Record<string, unknown>) => gradeSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Mark an answer — Marginalite Economics" },
      {
        name: "description",
        content:
          "Submit a Cambridge IGCSE Economics (0455) answer and get an examiner-standard mark with AO1, AO2 and AO3 breakdown plus rewrite guidance.",
      },
      { property: "og:title", content: "Mark an answer — Marginalite Economics" },
      {
        property: "og:description",
        content: "Examiner-standard marking with a full assessment-objective breakdown.",
      },
    ],
  }),
  component: GradePage,
});

type WritingIssue = {
  original: string;
  suggestion: string;
  type: "spelling" | "grammar";
  context: string;
};
type WritingCheck = { issues: WritingIssue[]; correctedText: string; clean: boolean };

type AttachedDiagram = { id: string; label: string; tag: string };

function GradePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const grade = useServerFn(gradeEssaySubmission);
  const checkGrounding = useServerFn(checkQuestionGrounding);
  const checkWriting = useServerFn(checkWritingQuality);
  const describeDiagramImg = useServerFn(describeDiagramImage);
  const describeDiagramLink = useServerFn(describeDiagramUrl);
  const listDiagrams = useServerFn(listDiagramLibrary);

  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });
  const DRAFT_STORAGE_KEY = "marginalite_answer_draft_v1";

  const [question, setQuestion] = useState(() => {
    if (search.q) return search.q;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.question) return parsed.question;
        }
      } catch {}
    }
    return "";
  });

  const groundingQuery = useQuery({
    queryKey: ["question-grounding", question.trim()],
    queryFn: () => checkGrounding({ data: { question: question.trim() } }),
    enabled: question.trim().length >= 15,
    staleTime: 5 * 60_000,
  });

  const [essayText, setEssayText] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.essayText) return parsed.essayText;
        }
      } catch {}
    }
    return "";
  });

  const [maxMark, setMaxMark] = useState(() => {
    if (search.marks) return String(search.marks);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.maxMark) return String(parsed.maxMark);
        }
      } catch {}
    }
    return "8";
  });

  // Autosave question, essay answer, and maxMark across page navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (question.trim() || essayText.trim()) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            question,
            essayText,
            maxMark,
            updatedAt: Date.now(),
          }),
        );
      }
    } catch {}
  }, [question, essayText, maxMark]);

  // Load auto-drafted essay from Cambridge Chat if transferred
  useEffect(() => {
    try {
      const prefillDraft = sessionStorage.getItem("marginalite_prefill_draft");
      const prefillQ = sessionStorage.getItem("marginalite_prefill_q");
      if (prefillDraft) {
        setEssayText(prefillDraft);
        sessionStorage.removeItem("marginalite_prefill_draft");
        toast.info("Auto-drafted Cambridge response loaded into grader.");
      }
      if (prefillQ && !question) {
        setQuestion(prefillQ);
        sessionStorage.removeItem("marginalite_prefill_q");
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [question]);
  const [auditPass, setAuditPass] = useState(true);
  // Spelling/grammar is a proofreading nicety, not a hard gate — some
  // people want it every time, others (especially re-marking a script
  // they've already proofread themselves) just want to mark straight away.
  // Optional and on by default; turning it off skips the check entirely
  // instead of forcing that extra round trip before marking can start.
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [result, setResult] = useState<{ grading: Grading; essayId: string | null } | null>(null);

  // A student can reference more than one diagram in the same essay (e.g. a
  // supply/demand diagram AND a PPC diagram) — each attached diagram becomes
  // its own [DIAGRAM: ...] tag, and all of them are joined together when the
  // essay is submitted for marking.
  const [diagrams, setDiagrams] = useState<AttachedDiagram[]>([]);
  const [diagramMode, setDiagramMode] = useState<"none" | "upload" | "library" | "url">("none");
  const [diagramLibraryId, setDiagramLibraryId] = useState<string>("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const diagramFileInputRef = useRef<HTMLInputElement>(null);
  const diagramCameraInputRef = useRef<HTMLInputElement>(null);
  const [isDiagramDragging, setIsDiagramDragging] = useState(false);

  // A pasted screenshot of the mark scheme, sent to the examiner as an
  // actual image (vision) alongside the retrieved text context — see
  // grading.functions.ts / grade.server.ts.
  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);

  const [writingCheck, setWritingCheck] = useState<WritingCheck | null>(null);
  const [checkedTextSnapshot, setCheckedTextSnapshot] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const diagramLibraryQuery = useQuery({
    queryKey: ["diagram-library"],
    queryFn: () => listDiagrams(),
    staleTime: 10 * 60_000,
  });

  const describeDiagramImageMutation = useMutation({
    mutationFn: ({ image, label }: { image: string; label?: string }) =>
      describeDiagramImg({ data: { image } }).then((res) => ({ ...res, label })),
    onSuccess: (data) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: data.label || "Uploaded diagram", tag: data.tag },
      ]);
      setDiagramMode("none");
      toast.success("Diagram image read and attached to your essay.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const describeDiagramUrlMutation = useMutation({
    mutationFn: (url: string) => describeDiagramLink({ data: { url } }),
    onSuccess: (data) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: "Diagram from URL", tag: data.tag },
      ]);
      setDiagramUrl("");
      setDiagramMode("none");
      toast.success("Diagram read and attached to your essay.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleDiagramFiles(files: FileList | File[] | null | undefined) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|heic|heif|bmp|gif|avif|tiff?)$/i.test(file.name);
      if (!isImage) {
        toast.error(`${file.name} is not an image file (PNG, JPEG, WebP, HEIC).`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        describeDiagramImageMutation.mutate({ image: dataUrl, label: file.name });
      };
      reader.onerror = () => toast.error(`Could not read diagram image: ${file.name}`);
      reader.readAsDataURL(file);
    }
  }

  const checkMutation = useMutation({
    mutationFn: () => checkWriting({ data: { essayText } }),
    onSuccess: (data) => {
      setWritingCheck(data as WritingCheck);
      setCheckedTextSnapshot(essayText);
      if (data.clean) toast.success("No spelling or grammar issues found.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mutation = useMutation({
    mutationFn: () =>
      grade({
        data: {
          question,
          essayText,
          maxMark: maxMark === "6_diagram" ? 6 : Number(maxMark),
          isDiagramQuestion: maxMark === "6_diagram",
          auditPass,
          diagramReference:
            diagrams.length > 0 ? diagrams.map((d) => d.tag).join("\n\n") : undefined,
          markSchemeImageDataUrls:
            markSchemeImages.length > 0 ? markSchemeImages.map((img) => img.dataUrl) : undefined,
        },
      }),
    onSuccess: (data) => {
      setResult({ grading: data.grading as Grading, essayId: data.essayId });
      queryClient.invalidateQueries({ queryKey: ["essays"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
      if (data.grading.modelSwapped) {
        toast.info(
          `Engine fallback: Evaluated with ${data.grading.model?.replace(/^(google\/|models\/)/, "")} due to high traffic.`,
        );
      } else if (data.grading.activeKeyType === "vip_fallback") {
        toast.info("Priority pool busy: Evaluated seamlessly using VIP reserve key.");
      } else if (data.grading.keyRotated) {
        toast.info("Key auto-hopped: Evaluated via backup key pool.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        duration: 5000,
      });
    },
  });

  useEffect(() => {
    if (resultRef.current && (mutation.isPending || result)) {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [mutation.isPending, result]);

  const words = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  // Any edit to the essay after a check invalidates it, so a stale "clean"
  // result can never be carried into a since-edited essay.
  const checkIsStale = writingCheck !== null && checkedTextSnapshot !== essayText;
  const readyToMark = !spellCheckEnabled || (writingCheck !== null && !checkIsStale);

  function applyLibraryDiagram(id: string) {
    const entry = diagramLibraryQuery.data?.find((item) => item.id === id);
    if (!entry) return;
    const curves = entry.curveLabels.filter(Boolean).join(", ") || "not specified";
    const tag =
      `[DIAGRAM: ${entry.title} | axes: ${entry.yLabel} (y) / ${entry.xLabel} (x) | ` +
      `curves: ${curves} | labels: as per the standard ${entry.title} diagram | ` +
      `accuracy: reference diagram selected from the diagram library by the student — verify it is correctly applied to their written argument]`;
    setDiagrams((current) => [...current, { id: crypto.randomUUID(), label: entry.title, tag }]);
    setDiagramLibraryId("");
    setDiagramMode("none");
  }

  function removeDiagram(id: string) {
    setDiagrams((current) => current.filter((d) => d.id !== id));
  }

  function handleMarkClick() {
    if (!readyToMark) {
      checkMutation.mutate();
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Mark an answer"
        description="Marked to Cambridge IGCSE 0455 standards, grounded in official syllabus and mark schemes, then independently audited for central-tendency bias."
      />
      <div className="px-3.5 pt-3 pb-0 sm:px-6 sm:pt-4 md:px-8">
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2 text-[11px] sm:text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 sm:size-4 shrink-0 text-primary" />
          <p className="leading-snug sm:leading-relaxed">
            <span className="text-foreground font-semibold">Cambridge IGCSE 0455 Standard:</span>{" "}
            Calibrated against official assessment guidelines. Independent study platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 px-3.5 py-3 sm:py-5 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="panel space-y-3.5 sm:space-y-4 p-3.5 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="question" className="text-xs sm:text-sm font-semibold text-foreground">
                    Exam question
                  </Label>
                  <Link
                    to="/response-structure"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
                  >
                    Structure guide
                  </Link>
                </div>
                <Textarea
                  id="question"
                  rows={2}
                  className="min-h-[64px] sm:min-h-[80px] text-xs sm:text-sm"
                  placeholder="Discuss whether a rise in the minimum wage will always reduce employment."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                {question.trim().length >= 15 ? (
                  groundingQuery.isLoading ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
                      <Loader2 className="size-3 animate-spin" />
                      Checking Knowledge Base for official Cambridge mark schemes...
                    </p>
                  ) : groundingQuery.data?.grounded ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>
                        Knowledge Base Grounded: Verified against {groundingQuery.data.topMatchTitle} ({Math.round((groundingQuery.data.topSimilarity ?? 0) * 100)}% match)
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-400" />
                        <div className="space-y-0.5">
                          <span className="font-semibold">No specific mark scheme found in Knowledge Base</span>
                          <p className="text-amber-200/80 leading-normal">
                            Paste or attach a screenshot of the official mark scheme below for question-specific grounding, or this essay will be marked against standard Cambridge AO level rubrics.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxMark" className="text-xs sm:text-sm font-semibold text-foreground">
                  Question type
                </Label>
                <Select
                  value={maxMark}
                  onValueChange={(value) => {
                    setMaxMark(value);
                    setWritingCheck(null);
                  }}
                >
                  <SelectTrigger id="maxMark" className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">
                      2 marks (Part a: Identify / State / Define — AO1 2)
                    </SelectItem>
                    <SelectItem value="4">
                      4 marks (Part b: Explain / Draw — AO1 2 / AO2 2)
                    </SelectItem>
                    <SelectItem value="6">
                      6 marks (Part c: Analyse — AO2 6: 3 developed points or 2 in-depth chains)
                    </SelectItem>
                    <SelectItem value="6_diagram">
                      6 marks: Diagram Analysis (Part c: Analyse with Diagram — 4m Diagram + 2m Reasoning)
                    </SelectItem>
                    <SelectItem value="8">
                      8 marks (Part d: Discuss evaluative essay — AO1 2 / AO2 3 / AO3 3)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="essay" className="text-xs sm:text-sm font-semibold text-foreground">
                    Your answer
                  </Label>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">{words} words</span>
                </div>
                <Textarea
                  id="essay"
                  rows={8}
                  className="font-sans text-xs sm:text-[15px] leading-relaxed sm:leading-[1.8] p-3 sm:p-4 rounded-xl min-h-[160px] sm:min-h-[280px]"
                  placeholder="Paste or type your full essay here, or upload handwritten pages below…"
                  value={essayText}
                  onChange={(event) => {
                    setEssayText(event.target.value);
                    setWritingCheck(null);
                  }}
                />
              </div>

              <HandwritingUpload
                hint={question}
                onText={(text) => {
                  setEssayText((current: string) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
                  setWritingCheck(null);
                }}
              />

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Diagram references (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Typed your essay online and referred to one or more diagrams without drawing them?
              Attach each one so it's marked like a diagram drawn on the page — pick from the
              diagram library, or paste a link to an image of it.
            </p>

            {diagrams.length > 0 ? (
              <ul className="space-y-1.5">
                {diagrams.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5 text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      {d.label}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => removeDiagram(d.id)}
                      aria-label={`Remove ${d.label}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <Select
              value={diagramMode}
              onValueChange={(value: "none" | "upload" | "library" | "url") => setDiagramMode(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a diagram…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {diagrams.length > 0 ? "No more diagrams to add" : "No diagram to reference"}
                </SelectItem>
                <SelectItem value="upload">Upload diagram image / photo</SelectItem>
                <SelectItem value="library">Choose from the diagram library</SelectItem>
                <SelectItem value="url">Paste a diagram image URL</SelectItem>
              </SelectContent>
            </Select>

            {diagramMode === "upload" ? (
              <div className="space-y-2">
                {/* Photo Library / Gallery Input - uncaptured to open photo gallery */}
                <input
                  ref={diagramFileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleDiagramFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {/* Camera Input - explicit environment capture */}
                <input
                  ref={diagramCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleDiagramFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!describeDiagramImageMutation.isPending) {
                      diagramFileInputRef.current?.click();
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !describeDiagramImageMutation.isPending) {
                      e.preventDefault();
                      diagramFileInputRef.current?.click();
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.files;
                    if (items && items.length > 0) {
                      e.preventDefault();
                      handleDiagramFiles(items);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDiagramDragging(true);
                  }}
                  onDragLeave={() => setIsDiagramDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDiagramDragging(false);
                    const files = e.dataTransfer?.files;
                    if (files && files.length > 0) {
                      handleDiagramFiles(files);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    isDiagramDragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted/30"
                  } ${describeDiagramImageMutation.isPending ? "opacity-70 pointer-events-none" : ""}`}
                >
                  {describeDiagramImageMutation.isPending ? (
                    <div className="flex items-center gap-2 text-primary font-medium text-xs">
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing diagram and extracting economic labels…
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                        <Upload className="size-4 text-primary" />
                        Click to upload diagram image, drag &amp; drop, or paste (Ctrl+V)
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Supports PNG, JPEG, WebP, HEIC photos of hand-drawn diagrams, or digital exports
                      </p>
                    </>
                  )}
                </div>

                {!describeDiagramImageMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => diagramFileInputRef.current?.click()}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Images className="size-3.5 text-primary" />
                      Photos / Gallery
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => diagramCameraInputRef.current?.click()}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Camera className="size-3.5 text-primary" />
                      Take Photo
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {diagramMode === "library" ? (
              <Select value={diagramLibraryId} onValueChange={applyLibraryDiagram}>
                <SelectTrigger>
                  <SelectValue placeholder="Search the diagram library…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(diagramLibraryQuery.data ?? []).map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title} · {entry.section === "Microeconomics" ? "Micro" : "Macro"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {diagramMode === "url" ? (
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/my-diagram.png"
                  value={diagramUrl}
                  onChange={(event) => setDiagramUrl(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!diagramUrl.trim() || describeDiagramUrlMutation.isPending}
                  onClick={() => describeDiagramUrlMutation.mutate(diagramUrl.trim())}
                >
                  {describeDiagramUrlMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Read diagram"
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Mark scheme screenshot (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Paste a screenshot of the relevant mark scheme page and the examiner will read it
              directly — on top of your knowledge base — while marking this essay.
            </p>
            <MarkSchemeScreenshots
              images={markSchemeImages}
              onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
              onRemove={(id) =>
                setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <Toggle
              label="Independent audit pass"
              hint="A second examiner re-checks the mark to correct clustering around the middle bands."
              checked={auditPass}
              onChange={setAuditPass}
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" />
              Every mark is grounded in your knowledge base and any calibration anchors you've set
              up — this always runs now, not just when it happens to help.
            </p>
            <Toggle
              label="Spelling & grammar check"
              hint="Quick proofreading pass before marking — optional, and never changes economics content or marks. Turn off to mark straight away."
              checked={spellCheckEnabled}
              onChange={(value) => {
                setSpellCheckEnabled(value);
                if (!value) {
                  setWritingCheck(null);
                  setCheckedTextSnapshot(null);
                }
              }}
            />
          </div>

          {spellCheckEnabled && writingCheck && !checkIsStale ? (
            <WritingCheckPanel
              check={writingCheck}
              onAccept={() => {
                const corrected = writingCheck.correctedText;
                setEssayText(corrected);
                setCheckedTextSnapshot(corrected);
                // Corrections have now been applied to the essay text, so the
                // panel must reflect "clean" — otherwise it keeps showing the
                // same stale issue list and an Apply button that looks like
                // it does nothing on a second click.
                setWritingCheck({ issues: [], correctedText: corrected, clean: true });
                toast.success("Corrections applied.");
              }}
            />
          ) : null}

          {(question.trim() || essayText.trim()) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-1">
              <span className="flex items-center gap-1.5 opacity-80">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Question &amp; essay answer autosaved in browser
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuestion("");
                  setEssayText("");
                  try {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                  } catch {}
                  toast.info("Essay draft cleared.");
                }}
                className="hover:text-destructive underline underline-offset-2 transition-colors cursor-pointer"
              >
                Clear draft
              </button>
            </div>
          )}

          <Button
            className="w-full"
            disabled={
              mutation.isPending ||
              checkMutation.isPending ||
              question.trim().length < 10 ||
              words < 20
            }
            onClick={handleMarkClick}
          >
            {checkMutation.isPending ? (
              <>
                <SpellCheck className="size-4 animate-pulse" /> Checking spelling &amp; grammar…
              </>
            ) : mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Marking — this takes up to a minute
              </>
            ) : readyToMark ? (
              <>
                <Sparkles className="size-4" /> Mark this answer
              </>
            ) : (
              <>
                <SpellCheck className="size-4" /> Check spelling &amp; grammar, then mark
              </>
            )}
          </Button>
        </div>

        <div ref={resultRef}>
          {mutation.isPending ? (
            <GradingProgress
              active
              stages={[
                { label: "Referring Cambridge 0455 Knowledge Base & Mark Schemes", weight: 3 },
                { label: "Checking Assessment Objectives: AO1 Knowledge · AO2 Analysis · AO3 Evaluation", weight: 4 },
                { label: "Evaluating point-marking and Level 1–3 band descriptors", weight: 3 },
                ...(auditPass ? [{ label: "Independent moderation & multi-key verification", weight: 2 }] : []),
                { label: "Synthesizing diagnostic examiner report & actionable feedback", weight: 2 },
              ]}
              totalMs={auditPass ? 65_000 : 45_000}
            />
          ) : result ? (
            <div className="space-y-4">
              <MarkBreakdown grading={result.grading} />
              {result.essayId ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate({ to: "/essay/$essayId", params: { essayId: result.essayId! } })
                  }
                >
                  Open full report and rewrite
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="panel hidden lg:flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
              <Sparkles className="size-6 text-muted-foreground" />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Your mark, AO breakdown, missing elements and rewrite plan will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WritingCheckPanel({ check, onAccept }: { check: WritingCheck; onAccept: () => void }) {
  if (check.clean) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" /> No spelling or grammar issues found — ready to
        mark.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <AlertCircle className="size-4 shrink-0" />
        {check.issues.length} spelling/grammar issue{check.issues.length === 1 ? "" : "s"} found
      </div>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
        {check.issues.map((issue, index) => (
          <li key={index} className="rounded-md border border-border bg-background p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">
                {issue.type}
              </Badge>
              <span className="text-destructive line-through">{issue.original}</span>
              <span>→</span>
              <span className="font-medium">{issue.suggestion}</span>
            </div>
            {issue.context ? <p className="mt-1 text-muted-foreground">"{issue.context}"</p> : null}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onAccept}>
          Apply corrections
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        These are spelling/grammar fixes only — economics content and marks are never changed by
        this check. You can also mark the essay as originally written.
      </p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
