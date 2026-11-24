import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Clock,
  Copy,
  FileText,
  GraduationCap,
  ImagePlus,
  Images,
  Layers,
  Loader2,
  PenLine,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
  Wand2,
  HelpCircle,
  Plus,
  Search,
  GripVertical,
  Eye,
  BookOpenCheck,
  SlidersHorizontal,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { ChainedChamber } from "@/components/app/chained-chamber";
import { CompactProgressBar, GradingProgress, type ProgressStage } from "@/components/app/grading-progress";
import { HandwritingUpload } from "@/components/app/handwriting-upload";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { generatePass4Comments, parseParagraphBlocks, findHighlightSpanInText, type Pass4Comment, type ParagraphBlock } from "@/lib/pass4-comments";
import { DiagramCheckDialog } from "@/components/app/diagram-check-dialog";
import { SampleEssayBanner } from "@/components/app/sample-essay-banner";
import { InSituTour, type TourStep } from "@/components/app/in-situ-tour";
import { SAMPLE_ESSAYS, type SampleEssay } from "@/lib/sample-essays";
import { DIAGRAMS, type DiagramEntry, DIAGRAM_BY_ID } from "@/lib/diagrams/catalog";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
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
import { checkQuestionGrounding, gradeEssaySubmission, syncLiveEssayDraft } from "@/lib/grading.functions";
import { gradeAssignmentSubmission } from "@/lib/classroom.functions";
import { checkWritingQuality } from "@/lib/writing-check.functions";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { getMe } from "@/lib/account.functions";
import { cn, cleanMathDollarSigns, autoParagraphText, stripStars } from "@/lib/utils";
import { stripScoreFractionsFromText, type Grading } from "@/lib/examiner/types";
import { isEvaluativeQuestion } from "@/lib/examiner/config";

// Optional prefill from the Question bank, Practice desk, or Classroom Direct Grading
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
        z.literal(12),
        z.literal(20),
        z.literal("12"),
        z.literal("20"),
      ])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        if (num === 2 || num === 4 || num === 6 || num === 8) return num as 2 | 4 | 6 | 8;
        return 8 as 2 | 4 | 6 | 8;
      })
      .catch(undefined),
    essayType: z.string().optional().catch(undefined),
    text: z.string().optional().catch(undefined),
    assignmentId: z.string().uuid().optional().catch(undefined),
    studentId: z.string().uuid().optional().catch(undefined),
    classroomId: z.string().uuid().optional().catch(undefined),
    studentName: z.string().optional().catch(undefined),
    sample: z.union([z.string(), z.number(), z.boolean()]).optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/grade")({
  validateSearch: (search: Record<string, unknown>) => gradeSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Mark an essay — Marginal Economics" },
      {
        name: "description",
        content:
          "Submit a Cambridge IGCSE 0455 Economics essay and get an examiner-standard mark with AO1, AO2 and AO3 breakdown plus rewrite guidance.",
      },
      { property: "og:title", content: "Mark an essay — Marginal Economics" },
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
  explanation?: string;
};
type WritingCheck = {
  issues: WritingIssue[];
  correctedText: string;
  clean: boolean;
  engine?: "in_house" | "ai";
};

type AttachedDiagram = {
  id: string;
  label: string;
  tag: string;
  catalogId?: string;
  imageUrl?: string;
};

const TARIFF_OPTIONS = [
  {
    value: "8" as const,
    marks: "8M",
    badge: "Part (d)",
    subtitle: "Discuss / Table A",
    targetWords: "250–400w",
    paperLevel: "Paper 2 Section B",
    fullTitle: "8 Marks · Section B Evaluative Essay (Discuss)",
    guidance:
      "Two-sided balanced evaluative essay governed strictly by Cambridge Table A Level Descriptors (Level 1: 1–2m, Level 2: 3–5m, Level 3: 6–8m).",
    aoFull: "AO1: 2 · AO2: 3 · AO3: 3",
  },
  {
    value: "6" as const,
    marks: "6M",
    badge: "Part (c)",
    subtitle: "Analyse",
    targetWords: "150–250w",
    paperLevel: "Paper 2 Section B",
    fullTitle: "6 Marks · Section B Causal Analysis (Analyse)",
    guidance:
      "Point-marked multi-step analytical chains of reasoning (e.g. 3 developed points × 2m). Listing without causal chains is strictly capped at max 3 marks.",
    aoFull: "AO1: 0 · AO2: 6 (No AO3)",
  },
  {
    value: "4" as const,
    marks: "4M",
    badge: "Part (b)",
    subtitle: "Explain",
    targetWords: "80–150w",
    paperLevel: "Paper 2 Section B",
    fullTitle: "4 Marks · Section B Structured Explanation (Explain)",
    guidance:
      "2 identified economic reasons/policies (1m each) plus developed explanation for each (1m each). Structure: 2 × (1m identify + 1m develop) = 4m.",
    aoFull: "AO1: 2 · AO2: 2",
  },
  {
    value: "2" as const,
    marks: "2M",
    badge: "Part (a)",
    subtitle: "Identify / Define",
    targetWords: "20–60w",
    paperLevel: "Paper 2 Section B",
    fullTitle: "2 Marks · Section B Identification (Identify / Define)",
    guidance:
      "Concise identification of two distinct economic causes, features, or definitions (1m each). Requires directional changes where specified.",
    aoFull: "AO1: 2",
  },
];

const POPULAR_DRAGGABLE_DIAGRAMS = [
  { id: "maximum-price", title: "Maximum Price" },
  { id: "minimum-price", title: "Minimum Price" },
  { id: "indirect-tax", title: "Specific Tax" },
  { id: "subsidy", title: "Subsidy" },
  { id: "tariff-diagram", title: "Tariff" },
  { id: "ad-as-equilibrium", title: "AD/AS Growth" },
  { id: "j-curve", title: "The J-Curve" },
  { id: "phillips-curve", title: "Phillips Curve" },
  { id: "lorenz-curve", title: "Lorenz Curve" },
  { id: "deadweight-welfare-loss", title: "Deadweight Loss" },
];

import {
  extractDiagramReferences,
  type DiagramRefMatch,
  type DiagramRefResult,
  GENERIC_ECONOMICS_VOCAB,
} from "@/lib/diagram-detection";
export { extractDiagramReferences, type DiagramRefMatch, type DiagramRefResult, GENERIC_ECONOMICS_VOCAB };


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
  const sub = meQuery.data?.subscription;
  const isAdmin = meQuery.data?.isAdmin ?? false;
  const isTeacher = meQuery.data?.role === "teacher" || Boolean((sub as any)?.isTeacher);
  const isTeacherUnpaid = isTeacher && !sub?.isPaid && !isAdmin;
  const isLimitReached = false;

  const DRAFT_STORAGE_KEY = "marginal_essay_draft_v2";

  const gradeSubmissionFn = useServerFn(gradeAssignmentSubmission);
  const [isReturningGrade, setIsReturningGrade] = useState(false);
  const isDirectGradingMode = Boolean(search.assignmentId && search.studentId && search.classroomId);

  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const [question, setQuestion] = useState(() => {
    if (search.q) return search.q;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem("marginal_essay_draft_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.question) return parsed.question;
        }
      } catch {}
    }
    return "";
  });

  const [debouncedQuestion, setDebouncedQuestion] = useState(question.trim());
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuestion(question.trim());
    }, 450);
    return () => clearTimeout(timer);
  }, [question]);

  const groundingQuery = useQuery({
    queryKey: ["question-grounding", debouncedQuestion],
    queryFn: () => checkGrounding({ data: { question: debouncedQuestion } }),
    enabled: debouncedQuestion.length >= 15,
    staleTime: 5 * 60_000,
  });

  const [essayText, setEssayText] = useState(() => {
    if (search.text) return cleanMathDollarSigns(search.text);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.essayText) {
            let cleaned = cleanMathDollarSigns(parsed.essayText);
            cleaned = cleaned.replace(/^\s*\((?:Diagram:\s*)?[^)]+\)\s*(?=[A-Z])/i, "");
            return cleaned;
          }
        }
      } catch {}
    }
    return "";
  });

  const [essayCategory, setEssayCategory] = useState<"8" | "6" | "4" | "2">(() => {
    if (search.marks) {
      const m = String(search.marks);
      if (m === "8" || m === "6" || m === "4" || m === "2") return m;
    }
    if (search.essayType === "8_eval" || search.essayType === "8_legacy" || search.essayType === "8") return "8";
    if (search.essayType === "6") return "6";
    if (search.essayType === "4") return "4";
    if (search.essayType === "2") return "2";
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.essayCategory && ["8", "6", "4", "2"].includes(parsed.essayCategory)) {
            return parsed.essayCategory;
          }
          if (parsed.maxMark && ["8", "6", "4", "2"].includes(String(parsed.maxMark))) {
            return String(parsed.maxMark) as "8" | "6" | "4" | "2";
          }
        }
      } catch {}
    }
    return "8";
  });

  const [maxMark, setMaxMark] = useState(() => {
    if (search.marks) {
      const m = String(search.marks);
      if (["8", "6", "4", "2"].includes(m)) return m;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.maxMark && ["8", "6", "4", "2"].includes(String(parsed.maxMark))) {
            return String(parsed.maxMark);
          }
        }
      } catch {}
    }
    return "8";
  });

  // Keep maxMark synchronized with essayCategory
  useEffect(() => {
    setMaxMark(essayCategory);
  }, [essayCategory]);

  // Sync state if direct grading search params arrive
  useEffect(() => {
    if (search.q) setQuestion(search.q);
    if (search.text) setEssayText(search.text);
    if (search.marks) {
      const m = String(search.marks);
      if (m === "8" || m === "6" || m === "4" || m === "2") {
        setEssayCategory(m);
        setMaxMark(m);
      } else {
        setEssayCategory("8");
        setMaxMark("8");
      }
    } else if (search.essayType) {
      if (search.essayType === "6") {
        setEssayCategory("6");
        setMaxMark("6");
      } else if (search.essayType === "4") {
        setEssayCategory("4");
        setMaxMark("4");
      } else if (search.essayType === "2") {
        setEssayCategory("2");
        setMaxMark("2");
      } else {
        setEssayCategory("8");
        setMaxMark("8");
      }
    }
  }, [search.q, search.text, search.marks, search.essayType]);

  const handleSelectSample = useCallback((sample: SampleEssay) => {
    setQuestion(sample.question);
    setEssayText(cleanMathDollarSigns(sample.essayText));
    setMaxMark(sample.maxMark);
    const tariffMap: Record<string, "8" | "6" | "4" | "2"> = {
      "8_eval": "8",
      "8_legacy": "8",
      "8": "8",
      "6": "6",
      "4": "4",
      "2": "2",
    };
    setEssayCategory(tariffMap[sample.tariff] || "8");
    setActiveSampleId(sample.id);
    setDiagrams([]);
    setResult(null);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem("marginal_essay_draft_v1");
    } catch {}
    toast.success(`Loaded ${sample.shortLabel}! Hit "Mark this essay" below to evaluate.`);
  }, [DRAFT_STORAGE_KEY, meQuery.data]);

  const handleClearSample = useCallback(() => {
    setQuestion("");
    setEssayText("");
    setActiveSampleId(null);
    setDiagrams([]);
    setResult(null);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem("marginal_essay_draft_v1");
    } catch {}
    toast.info("Sample cleared. You can now type or paste your own essay.");
  }, [DRAFT_STORAGE_KEY]);

  useEffect(() => {
    if (search.sample) {
      const sampleParam = String(search.sample);
      const matchedSample =
        SAMPLE_ESSAYS.find(
          (s) => s.maxMark === sampleParam || s.id.toLowerCase().includes(sampleParam.toLowerCase()),
        ) || SAMPLE_ESSAYS[0];

      handleSelectSample(matchedSample);
    }
  }, [search.sample, handleSelectSample]);

  const handleReturnToClassroom = async () => {
    if (!search.assignmentId || !search.studentId || !search.classroomId || !result) return;
    setIsReturningGrade(true);
    try {
      const feedback = (result.grading as any).overall_comment || result.grading.examiner_summary || "";
      await gradeSubmissionFn({
        data: {
          assignmentId: search.assignmentId,
          studentId: search.studentId,
          classroomId: search.classroomId,
          teacherScore: result.grading.total_mark,
          teacherFeedback: feedback,
          returnToStudent: true,
        },
      });
      toast.success(`Grade returned to ${search.studentName || "student"} in Classroom!`);
      navigate({
        to: "/classes",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to return grade to student.");
    } finally {
      setIsReturningGrade(false);
    }
  };

  const syncDraftFn = useServerFn(syncLiveEssayDraft);

  // Autosave question, essay answer, and maxMark across page navigation & sync live draft to God Mode
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
            essayCategory,
            updatedAt: Date.now(),
          }),
        );
      }
    } catch {}

    const timer = window.setTimeout(() => {
      if (question.trim() || essayText.trim()) {
        void syncDraftFn({
          data: {
            question,
            essayText,
            maxMark: Number(maxMark) || 8,
            wordCount: essayText.trim() ? essayText.trim().split(/\s+/).length : 0,
          },
        }).catch(() => {});
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [question, essayText, maxMark, syncDraftFn]);

  // Load auto-drafted essay from Cambridge Chat if transferred
  useEffect(() => {
    try {
      const prefillDraft = sessionStorage.getItem("marginal_prefill_draft");
      const prefillQ = sessionStorage.getItem("marginal_prefill_q");
      if (prefillDraft) {
        setEssayText(prefillDraft);
        sessionStorage.removeItem("marginal_prefill_draft");
        toast.info("Auto-drafted Cambridge essay loaded into grader.");
      }
      if (prefillQ && !question) {
        setQuestion(prefillQ);
        sessionStorage.removeItem("marginal_prefill_q");
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
  const [diagramDrawerOpen, setDiagramDrawerOpen] = useState(false);
  const [diagramTrayExpanded, setDiagramTrayExpanded] = useState(false);
  const [draggingDiagram, setDraggingDiagram] = useState<{ id: string; title: string } | null>(null);
  const [hoveredDropSlot, setHoveredDropSlot] = useState<number | null>(null);
  const [placementPickerDiagram, setPlacementPickerDiagram] = useState<{ id: string; title: string } | null>(null);
  const [diagramSearch, setDiagramSearch] = useState("");
  const [diagramFilterSection, setDiagramFilterSection] = useState<"all" | "Microeconomics" | "Macroeconomics" | "custom">("all");
  const [activeViewTab, setActiveViewTab] = useState<"editor" | "report">("editor");
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isEditingAfterGrade, setIsEditingAfterGrade] = useState(false);
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [ocrDrawerOpen, setOcrDrawerOpen] = useState(false);
  const [markSchemeDrawerOpen, setMarkSchemeDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [proofreadDrawerOpen, setProofreadDrawerOpen] = useState(false);
  const [detailedBreakdownOpen, setDetailedBreakdownOpen] = useState(false);
  const [essayFont, setEssayFont] = useState<"serif" | "sans">("serif");

  const essayInputRef = useRef<HTMLTextAreaElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Auto-launch guided spotlight tour for first-time visitors
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tourDismissed =
      localStorage.getItem("marginal_grade_tour_seen_v2") === "true" ||
      localStorage.getItem("marginal_grade_tour_seen") === "true";
    const forceTour = search.tour === "true";
    if ((!tourDismissed || forceTour) && !result) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [result, search.tour]);

  // Auto-resize essay textarea to feel like an authentic document without layout jitter
  const adjustTextareaHeight = useCallback(() => {
    const el = essayInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(520, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [essayText, essayFont, adjustTextareaHeight]);

  // Auto-resize question textarea smoothly without layout jitter
  const adjustQuestionHeight = useCallback(() => {
    const el = questionInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(48, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustQuestionHeight();
  }, [question, adjustQuestionHeight]);

  const [previewDiagram, setPreviewDiagram] = useState<DiagramEntry | null>(null);

  // Directly parse all diagram references in brackets, e.g. (Maximum price), (J-curve)
  const inTextDiagrams = useMemo(() => {
    return extractDiagramReferences(essayText);
  }, [essayText]);

  // Pass 4: Decode diagram integration & compare report with candidate script
  const pass4Comments = useMemo(() => {
    if (!result?.grading) return [];
    return generatePass4Comments(essayText, question, result.grading, inTextDiagrams.matches);
  }, [essayText, question, result?.grading, inTextDiagrams.matches]);

  // Unified syllabus paragraph blocks (ensuring identical indices between manuscript & comments)
  const paragraphBlocks = useMemo(() => {
    if (!essayText.trim()) return [];
    return parseParagraphBlocks(essayText, inTextDiagrams.matches);
  }, [essayText, inTextDiagrams.matches]);

  // Split essay into text paragraphs excluding diagram tags (used for interactive drop target slots)
  const textParagraphs = useMemo(() => {
    if (!essayText.trim()) return [];
    return paragraphBlocks
      .filter((b) => !b.isDiagram)
      .map((b) => ({ index: b.index, raw: b.text, isDiagram: false }));
  }, [paragraphBlocks]);

  function getDiagramPlacementDescription(matchText: string): {
    description: string;
    canMoveEarlier: boolean;
    canMoveLater: boolean;
  } {
    const idx = essayText.indexOf(matchText);
    if (idx < 0) {
      return {
        description: "Positioned in candidate script",
        canMoveEarlier: false,
        canMoveLater: false,
      };
    }
    const before = essayText.slice(0, idx);
    const after = essayText.slice(idx + matchText.length);
    const parasBefore = before
      .trim()
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0 && !/^\s*\((?:Diagram:\s*)?[^)]+\)\s*$/i.test(p.trim()));
    const parasAfter = after
      .trim()
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0 && !/^\s*\((?:Diagram:\s*)?[^)]+\)\s*$/i.test(p.trim()));

    const canMoveEarlier = parasBefore.length > 0;
    const canMoveLater = parasAfter.length > 0;

    if (parasBefore.length === 0) {
      return {
        description: "Positioned at beginning of essay (Before Paragraph 1)",
        canMoveEarlier: false,
        canMoveLater,
      };
    }

    if (parasAfter.length === 0) {
      return {
        description: `Positioned after Paragraph ${parasBefore.length} (at end of essay)`,
        canMoveEarlier,
        canMoveLater: false,
      };
    }

    return {
      description: `Positioned between Paragraph ${parasBefore.length} and Paragraph ${parasBefore.length + 1}`,
      canMoveEarlier,
      canMoveLater,
    };
  }

  function handleDropAtSlot(slotIndex: number, diagramTitle: string, catalogId?: string) {
    const cleanTitle = diagramTitle.trim();
    if (!cleanTitle) return;

    const tagToInsert = `(Diagram: ${cleanTitle})`;
    const rawParas = essayText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (rawParas.length === 0) {
      setEssayText(`${tagToInsert}\n\n`);
    } else {
      const textOnly = rawParas.filter((p) => !/^\s*\((?:Diagram:\s*)?[^)]+\)\s*$/i.test(p));
      let newParas: string[] = [];

      if (slotIndex <= 0) {
        newParas = [tagToInsert, ...rawParas];
      } else if (slotIndex >= textOnly.length) {
        newParas = [...rawParas, tagToInsert];
      } else {
        const targetText = textOnly[slotIndex - 1];
        const targetIdx = rawParas.indexOf(targetText);
        if (targetIdx >= 0) {
          newParas = [
            ...rawParas.slice(0, targetIdx + 1),
            tagToInsert,
            ...rawParas.slice(targetIdx + 1),
          ];
        } else {
          newParas = [...rawParas, tagToInsert];
        }
      }

      setEssayText(cleanMathDollarSigns(newParas.join("\n\n")));
    }

    setDraggingDiagram(null);
    setHoveredDropSlot(null);
    setPlacementPickerDiagram(null);

    const slotLabel =
      slotIndex <= 0
        ? "at beginning of essay"
        : slotIndex >= textParagraphs.length
        ? "at end of essay"
        : `after Paragraph ${slotIndex}`;
    toast.success(`Positioned (Diagram: ${cleanTitle}) ${slotLabel}!`);
  }

  function insertDiagramAtCursor(entry: DiagramEntry | { id: string; title: string }) {
    const textarea = essayInputRef.current;
    const tagToInsert = ` (Diagram: ${entry.title}) `;
    if (textarea && document.activeElement === textarea && textarea.selectionStart > 0) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd ?? start;
      const newText = essayText.slice(0, start) + tagToInsert + essayText.slice(end);
      setEssayText(cleanMathDollarSigns(newText));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagToInsert.length, start + tagToInsert.length);
      }, 50);
    } else {
      setEssayText((prev: string) => {
        const trimmed = cleanMathDollarSigns(prev).trim();
        return trimmed ? `${trimmed}\n\n(Diagram: ${entry.title})\n\n` : `(Diagram: ${entry.title})\n\n`;
      });
    }
    setDiagramDrawerOpen(false);
    toast.success(`Positioned (Diagram: ${entry.title}) in candidate script`);
  }

  function insertCatalogDiagram(entry: DiagramEntry) {
    insertDiagramAtCursor(entry);
  }

  const [customDiagramTitle, setCustomDiagramTitle] = useState("");
  const [customDiagramNotes, setCustomDiagramNotes] = useState("");

  function insertCustomDiagram(titleToInsert: string, notesToInsert?: string) {
    const cleanTitle = titleToInsert.trim();
    if (!cleanTitle) {
      toast.error("Please enter a diagram title.");
      return;
    }
    const textarea = essayInputRef.current;
    const tagToInsert = ` (Diagram: ${cleanTitle}) `;
    if (textarea && document.activeElement === textarea && textarea.selectionStart > 0) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd ?? start;
      const newText = essayText.slice(0, start) + tagToInsert + essayText.slice(end);
      setEssayText(cleanMathDollarSigns(newText));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagToInsert.length, start + tagToInsert.length);
      }, 50);
    } else {
      setEssayText((prev: string) => {
        const trimmed = cleanMathDollarSigns(prev).trim();
        return trimmed ? `${trimmed}\n\n(Diagram: ${cleanTitle})` : `(Diagram: ${cleanTitle})\n\n`;
      });
    }

    setCustomDiagramTitle("");
    setCustomDiagramNotes("");
    setDiagramDrawerOpen(false);
    toast.success(`Positioned custom (Diagram: ${cleanTitle}) in candidate script`);
  }

  const [isDraggingOverTextarea, setIsDraggingOverTextarea] = useState(false);

  function moveDiagramEarlier(matchText: string) {
    const idx = essayText.indexOf(matchText);
    if (idx <= 0) {
      toast.info("Diagram is already at the beginning of the essay.");
      return;
    }
    const before = essayText.slice(0, idx);
    const after = essayText.slice(idx + matchText.length);
    const paragraphsBefore = before.trim().split(/\n\s*\n/);
    if (paragraphsBefore.length <= 1) {
      const newText = `${matchText.trim()}\n\n${paragraphsBefore.join("\n\n")}${after ? `\n\n${after.trim()}` : ""}`;
      setEssayText(cleanMathDollarSigns(newText));
      toast.success("Moved diagram earlier in essay.");
      return;
    }
    const lastPara = paragraphsBefore.pop();
    const newBefore = paragraphsBefore.join("\n\n");
    const newText = `${newBefore ? `${newBefore}\n\n` : ""}${matchText.trim()}\n\n${lastPara}${after ? `\n\n${after.trim()}` : ""}`;
    setEssayText(cleanMathDollarSigns(newText));
    toast.success("Moved diagram earlier in essay.");
  }

  function moveDiagramLater(matchText: string) {
    const idx = essayText.indexOf(matchText);
    if (idx < 0) return;
    const before = essayText.slice(0, idx);
    const after = essayText.slice(idx + matchText.length);
    const paragraphsAfter = after.trim().split(/\n\s*\n/);
    if (paragraphsAfter.length === 0 || !paragraphsAfter[0]) {
      toast.info("Diagram is already at the end of the essay.");
      return;
    }
    const firstParaAfter = paragraphsAfter.shift();
    const restAfter = paragraphsAfter.join("\n\n");
    const newText = `${before ? `${before.trim()}\n\n` : ""}${firstParaAfter}\n\n${matchText.trim()}${restAfter ? `\n\n${restAfter.trim()}` : ""}`;
    setEssayText(cleanMathDollarSigns(newText));
    toast.success("Moved diagram later in essay.");
  }

  function removeDiagramFromEssay(matchText: string) {
    const newText = essayText.replace(matchText, "").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
    setEssayText(cleanMathDollarSigns(newText));
    toast.info("Removed diagram from script.");
  }

  const filteredDiagrams = useMemo(() => {
    const q = diagramSearch.trim().toLowerCase();
    return DIAGRAMS.filter((d) => {
      if (diagramFilterSection !== "all" && diagramFilterSection !== "custom") {
        if (d.section !== diagramFilterSection) return false;
      }
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.topic.toLowerCase().includes(q) ||
        d.represents.toLowerCase().includes(q) ||
        d.whyUsed.toLowerCase().includes(q)
      );
    });
  }, [diagramSearch, diagramFilterSection]);

  const [markSchemeImages, setMarkSchemeImages] = useState<MarkSchemeImage[]>([]);
  const [diagramMode, setDiagramMode] = useState<"none" | "upload" | "library" | "url">("none");
  const [diagramLibraryId, setDiagramLibraryId] = useState<string>("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const diagramFileInputRef = useRef<HTMLInputElement>(null);
  const diagramCameraInputRef = useRef<HTMLInputElement>(null);
  const [isDiagramDragging, setIsDiagramDragging] = useState(false);
  const [diagramSectionOpen, setDiagramSectionOpen] = useState(false);
  const [diagramPromptOpen, setDiagramPromptOpen] = useState(false);
  const [isDiagramHighlighted, setIsDiagramHighlighted] = useState(false);
  const diagramSectionRef = useRef<HTMLDivElement>(null);
  const [markSchemeSectionOpen, setMarkSchemeSectionOpen] = useState(false);
  const [settingsSectionOpen, setSettingsSectionOpen] = useState(false);
  const [activeAccessory, setActiveAccessory] = useState<"none" | "handwriting" | "diagrams" | "markscheme" | "settings">("none");

  const handleOpenDiagramSection = useCallback(() => {
    setDiagramDrawerOpen(true);
    setActiveAccessory("diagrams");
    setDiagramSectionOpen(true);
    setDiagramMode((current) => (current === "none" ? "upload" : current));
    setIsDiagramHighlighted(true);
    window.setTimeout(() => setIsDiagramHighlighted(false), 3500);
    toast.info("Curate a Cambridge diagram or upload your hand-drawn graph.");
  }, []);

  useEffect(() => {
    if (diagrams.length > 0) setDiagramSectionOpen(true);
  }, [diagrams.length]);

  useEffect(() => {
    if (markSchemeImages.length > 0) setMarkSchemeSectionOpen(true);
  }, [markSchemeImages.length]);

  const handlePasteEssay = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        let cleaned = cleanMathDollarSigns(text);
        if (cleaned.split(/\s+/).length >= 60 && !cleaned.includes("\n\n")) {
          cleaned = autoParagraphText(cleaned);
        }
        setEssayText((current: string) => (current.trim() ? `${current.trim()}\n\n${cleaned}` : cleaned));
        setWritingCheck(null);
        toast.success("Pasted clipboard text into essay.");
      }
    } catch {
      toast.info("Please use Ctrl+V to paste your text directly into the box.");
    }
  };

  const [writingCheck, setWritingCheck] = useState<WritingCheck | null>(null);
  const [checkedTextSnapshot, setCheckedTextSnapshot] = useState<string | null>(null);
  const [grammarCheckEngine, setGrammarCheckEngine] = useState<"in_house" | "ai">("in_house");
  const resultRef = useRef<HTMLDivElement>(null);

  const diagramLibraryQuery = useQuery({
    queryKey: ["diagram-library"],
    queryFn: () => listDiagrams(),
    staleTime: 10 * 60_000,
  });

  const describeDiagramImageMutation = useMutation({
    mutationFn: ({ image, label }: { image: string; label?: string }) =>
      describeDiagramImg({ data: { image } }).then((res) => ({ ...res, label, image })),
    onSuccess: (data) => {
      const cleanLabel = (data.label || "Uploaded Diagram").replace(/\.[^/.]+$/, "");
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: cleanLabel, tag: data.tag, imageUrl: data.image },
      ]);
      setEssayText((prev: string) => {
        const trimmed = cleanMathDollarSigns(prev).trim();
        return trimmed ? `${trimmed}\n\n(Diagram: ${cleanLabel})\n\n` : `(Diagram: ${cleanLabel})\n\n`;
      });
      setDiagramMode("none");
      setDiagramDrawerOpen(false);
      toast.success(`Diagram image "${cleanLabel}" analyzed and positioned in your essay.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const describeDiagramUrlMutation = useMutation({
    mutationFn: (url: string) => describeDiagramLink({ data: { url } }).then((res) => ({ ...res, url })),
    onSuccess: (data) => {
      setDiagrams((current) => [
        ...current,
        { id: crypto.randomUUID(), label: "Diagram from URL", tag: data.tag, imageUrl: data.url },
      ]);
      setDiagramUrl("");
      setDiagramMode("none");
      setDiagramDrawerOpen(false);
      toast.success("Diagram read and embedded in your essay.");
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

  const runInHouseCheck = useCallback(() => {
    if (!essayText.trim() || essayText.trim().split(/\s+/).length < 5) {
      toast.info("Please write at least a few sentences before running grammar check.");
      return;
    }
    const sentences = splitSentences(essayText);
    const rawIssues = analyzeGrammarAndMechanics(sentences);
    // Explicit safeguard: Never flag capital "I"
    const safeIssues = rawIssues.filter((iss) => iss.original.trim() !== "I");

    let workingText = essayText;
    for (const iss of safeIssues) {
      if (iss.original && iss.suggestion && iss.original !== iss.suggestion) {
        workingText = workingText.split(iss.original).join(iss.suggestion);
      }
    }

    const formattedIssues: WritingIssue[] = safeIssues.map((iss) => ({
      original: iss.original,
      suggestion: iss.suggestion,
      type: iss.category === "grammar" ? "grammar" : "spelling",
      context: iss.context,
      explanation: iss.explanation,
    }));

    setWritingCheck({
      issues: formattedIssues,
      correctedText: workingText,
      clean: formattedIssues.length === 0,
      engine: "in_house",
    });
    setCheckedTextSnapshot(essayText);
    if (formattedIssues.length === 0) {
      toast.success("In-House Engine: No grammar issues or economic misconceptions found.");
    } else {
      toast.info(`In-House Engine: Found ${formattedIssues.length} suggestion${formattedIssues.length === 1 ? "" : "s"}.`);
    }
  }, [essayText]);

  const checkMutation = useMutation({
    mutationFn: () => checkWriting({ data: { essayText } }),
    onSuccess: (data) => {
      // Safeguard: Filter out any accidental capital "I" issue
      const issues = (data.issues as WritingIssue[]).filter((iss) => iss.original.trim() !== "I");
      setWritingCheck({
        issues,
        correctedText: data.correctedText,
        clean: issues.length === 0,
        engine: "ai",
      });
      setCheckedTextSnapshot(essayText);
      if (issues.length === 0) toast.success("AI Proofreader: No spelling or grammar issues found.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mutation = useMutation({
    mutationFn: () => {
      // Resolve any in-text diagram references (e.g. (Diagram: Subsidy), (Figure: ...), [DIAGRAM: ...])
      const inText = extractDiagramReferences(essayText);
      const combinedDiagramTags = [
        ...diagrams.map((d) => d.tag),
        ...inText.detectedTags,
      ];
      const uniqueTags = Array.from(new Set(combinedDiagramTags));
      const diagramRef = uniqueTags.length > 0 ? uniqueTags.join("\n\n") : undefined;

      let essayToGrade = essayText;
      for (const rep of inText.inlineReplacements) {
        if (!essayToGrade.includes(rep.tag)) {
          essayToGrade = essayToGrade.replace(rep.matchText, `\n\n${rep.tag}\n\n`);
        }
      }
      essayToGrade = cleanMathDollarSigns(essayToGrade);

      return grade({
        data: {
          question,
          essayText: essayToGrade,
          maxMark: Number(maxMark) || 8,
          essayType: essayCategory === "8" ? "8_eval" : essayCategory,
          auditPass,
          diagramReference: diagramRef,
          markSchemeImageDataUrls:
            markSchemeImages.length > 0 ? markSchemeImages.map((img) => img.dataUrl) : undefined,
        },
      });
    },
    onSuccess: (data) => {
      setResult({ grading: data.grading as Grading, essayId: data.essayId });
      setShowDetailedReport(false);
      setActiveViewTab("report");
      setIsEditingAfterGrade(false);
      setActiveCommentId(null);
      queryClient.invalidateQueries({ queryKey: ["essays"] });
      queryClient.invalidateQueries({ queryKey: ["review-essays"] });
      queryClient.invalidateQueries({ queryKey: ["review-panel"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      toast.success(`Marked ${data.grading.total_mark}/${data.grading.max_mark}`);
      setTimeout(() => {
        const target = document.getElementById("candidate-report-header");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
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

  function handleMarkClick(options?: { skipDiagramCheck?: boolean }) {
    // Prompt user only if no diagram has been attached or referenced in brackets yet
    const { matches } = extractDiagramReferences(essayText);
    const hasAnyDiagram = diagrams.length > 0 || matches.length > 0;

    if (!options?.skipDiagramCheck && !hasAnyDiagram) {
      setDiagramPromptOpen(true);
      return;
    }

    mutation.mutate();
  }

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        targetId: "tour-sample-banner",
        title: "1-Click Interactive Sandbox",
        description:
          "Welcome to Marginal! Want to see how the examiner marks an essay with 1 click? Click 'Load 8M Sample' anytime to test the OCR, diagrams, and Cambridge marks instantly.",
        badge: "Interactive Demo",
        actionHint: "Click 'Load 8M Sample' to test right now!",
      },
      {
        targetId: "tour-question",
        title: "1. Exam Question & Command Words",
        description:
          "Enter or paste any Cambridge IGCSE 0455 question. Marginal detects command words ('Explain', 'Discuss', 'Assess', 'Evaluate') to calibrate AO1, AO2, and AO3 quotas automatically.",
        badge: "Question Box",
        actionHint: "Supports Part a (2m), Part b (4m), Part c (6m), and Part d (8m) questions.",
      },
      {
        targetId: "tour-tariff",
        title: "2. Mark Tariff Level",
        description:
          "Pick the official 0455 mark tariff (8m Discuss, 6m Analyse, 4m Explain, or 2m Identify). The examiner applies Cambridge Paper 2 rubric guidelines and Table A descriptors accordingly.",
        badge: "Cambridge Tariff",
      },
      {
        targetId: "tour-ocr",
        title: "3. Import Handwriting (Vision OCR)",
        description:
          "Have a handwritten mock exam paper or school notebook? Click 'Import Handwriting' to snap a photo or upload pages — Vision OCR extracts candidate text and diagrams automatically!",
        badge: "Handwriting OCR",
        actionHint: "Fast photo extraction without typing.",
      },
      {
        targetId: "tour-diagrams",
        title: "4. Economics Diagrams & Curve Shifts",
        description:
          "Attach diagrams to boost AO2 marks! Upload hand-drawn graph photos or insert curve tokens (e.g. [DIAGRAM: Tax shift MPC > MSC]). The examiner audits axes, equilibrium shifts, and welfare losses.",
        badge: "Vector CAD",
      },
      {
        targetId: "tour-essay",
        title: "5. Candidate Essay Manuscript",
        description:
          "Type or edit your response here. Real-time word count tracks your progress, and paragraphs format automatically.",
        badge: "Candidate Script",
        actionHint: "Shortcut: Press Ctrl + Enter from anywhere to start marking.",
      },
      {
        targetId: "tour-submit",
        title: "6. Run Cambridge Examiner!",
        description:
          "Hit 'Mark Essay' to trigger our 4-pass Cambridge pipeline. You'll receive official AO marks, band descriptors, and Google-Docs-style comment pins directly on your exact sentences!",
        badge: "Dual AI Examiner",
        actionHint: "Click to start evaluation when ready.",
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Mark an essay"
        description="Marked to Cambridge IGCSE 0455 standards, grounded in your syllabus and coursebooks."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTourOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/80 rounded-xl cursor-pointer gap-1.5"
            >
              <HelpCircle className="size-3.5 text-primary" />
              <span>How It Works</span>
            </Button>
            {activeSampleId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSample}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl cursor-pointer"
              >
                <X className="size-3.5" />
                <span>Clear Sample</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSelectSample(SAMPLE_ESSAYS[0])}
                className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Wand2 className="size-3.5" />
                <span>Try 8M Sample</span>
              </Button>
            )}
          </div>
        }
      />

      {isDirectGradingMode && (
        <div className="px-3.5 pt-3 pb-0 sm:px-6 sm:pt-4 md:px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Teacher Direct Grading Desk
                  </span>
                  <Badge className="bg-purple-900/80 text-purple-200 border-purple-700 text-[10px]">
                    Class Assignment Submission
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-white mt-0.5">
                  Directly evaluating submission for:{" "}
                  <strong className="text-purple-300">{search.studentName || "Student"}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/classes",
                  })
                }
                className="border-purple-700/60 text-purple-200 hover:text-white hover:bg-purple-900/40 text-xs"
              >
                Back to Classroom
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Google Docs Command Bar (Single-Row, Ultra-Refined, Non-Wrapping) */}
      <div className="sticky top-12 z-20 backdrop-blur-md bg-background/90 border-b border-border/60 py-2.5 px-3.5 sm:px-6 md:px-8">
        <div className="max-w-5xl 2xl:max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Document Identity & Word count */}
          <div className="flex items-center gap-2.5">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">Candidate Script</span>
            <span className="text-xs text-muted-foreground font-mono">
              · {words} words
            </span>
          </div>

          {/* Center: Cambridge Tariff Selector */}
          <div id="tour-tariff" className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/40 overflow-x-auto">
            {TARIFF_OPTIONS.map((opt) => {
              const isSelected = essayCategory === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setEssayCategory(opt.value);
                    setWritingCheck(null);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/40"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{opt.marks}</span>
                  <span className="text-[10px] opacity-75 font-normal">({opt.badge})</span>
                </button>
              );
            })}
          </div>

          {/* Right: Essential Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Import Handwriting */}
            <Button
              id="tour-ocr"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOcrDrawerOpen(true)}
              className="h-8 px-2.5 text-xs font-medium border-border/70 hover:bg-muted text-foreground gap-1.5 rounded-xl cursor-pointer"
              title="Import handwritten pages"
            >
              <Camera className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Import Handwriting</span>
            </Button>

            {/* Proofread */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runInHouseCheck}
              disabled={words < 5}
              className="h-8 px-2.5 text-xs font-medium border-border/70 hover:bg-muted text-foreground gap-1.5 rounded-xl cursor-pointer"
              title="Run Cambridge Economics Proofreading"
            >
              <Zap className="size-3.5 text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">Proofread</span>
            </Button>

            {/* Settings & Mark Scheme Drawer */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsDrawerOpen(true)}
              className="size-8 text-muted-foreground hover:text-foreground rounded-xl"
              title="Examiner Settings & Vision Mark Scheme"
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>

            {/* Primary Grade Button */}
            <Button
              id="tour-submit"
              size="sm"
              disabled={
                mutation.isPending ||
                checkMutation.isPending ||
                question.trim().length < 10 ||
                words < 20
              }
              onClick={() => handleMarkClick()}
              className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-primary text-white shadow-xs hover:opacity-95 cursor-pointer gap-1.5"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Grading...</span>
                </>
              ) : result ? (
                <>
                  <RotateCcw className="size-3.5" />
                  <span>Re-Grade</span>
                </>
              ) : (
                <>
                  <GraduationCap className="size-3.5" />
                  <span>Grade Essay</span>
                  <span className="opacity-70 text-[10px] hidden md:inline">(⌘↵)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

          {/* Main Google Docs Studio Canvas */}
          <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-3.5 sm:px-6 md:px-8 py-5 min-w-0">
            {mutation.isPending ? (
              <div className="max-w-3xl mx-auto py-12">
                <GradingProgress
                  active
                  stages={[
                    { label: "Referring Cambridge IGCSE 0455 Knowledge Base & Mark Schemes", weight: 3 },
                    { label: "Dual-Examiner Parallel Evaluation (Pass 1 Error Check & Pass 2 Holistic)", weight: 5 },
                    { label: "Checking Assessment Objectives: AO1 Knowledge · AO2 Application · AO3 Evaluation", weight: 4 },
                    { label: "Evaluating policy trade-offs, multi-perspective weighing & examples", weight: 3 },
                    { label: "Synthesizing diagnostic examiner report & actionable feedback", weight: 3 },
                  ]}
                  totalMs={25_000}
                />
              </div>
            ) : (
              <div className="space-y-8 w-full max-w-5xl 2xl:max-w-6xl mx-auto min-w-0">
                {/* Prominent Cambridge Score Banner when graded */}
                {result && (
                  <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-5 shadow-sm animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner">
                          <Award className="size-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base sm:text-lg text-foreground">
                              Cambridge IGCSE 0455 Assessment Complete
                            </span>
                            <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
                              {result.grading.total_mark} / {result.grading.max_mark} Marks
                            </Badge>
                            <Badge variant="outline" className="border-border/80 text-foreground/90 text-xs font-semibold">
                              {result.grading.band}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {result.grading.latencyMs ? `Graded in ${Math.round(result.grading.latencyMs / 1000)}s · ` : ""}
                            Full examiner diagnostic report and Cambridge exemplar breakdown generated below.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!showDetailedReport) {
                              setShowDetailedReport(true);
                              setTimeout(() => {
                                reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            } else {
                              setShowDetailedReport(false);
                            }
                          }}
                          className="text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
                        >
                          {showDetailedReport ? (
                            <>
                              <ChevronUp className="size-3.5" /> Hide Diagnostic Report
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" /> View Diagnostic Report
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkClick()}
                          className="text-xs font-medium border-border/80 hover:bg-muted text-foreground rounded-xl gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="size-3.5" /> Re-Grade
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidate Script Document Sheet */}
                <div
                  ref={resultRef}
                  className={cn(
                    "relative rounded-3xl border border-border/80 bg-card text-card-foreground shadow-md p-5 sm:p-8 lg:p-10 space-y-6 min-h-[850px] transition-all w-full min-w-0 max-w-full overflow-hidden",
                    isDocDragging && "ring-2 ring-primary border-primary shadow-xl shadow-primary/20",
                  )}
                >
                  {/* Cambridge International Examination Letterhead */}
                  <div className="border-b border-border/60 pb-5 space-y-2 w-full min-w-0">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      <span>Cambridge Assessment International Education</span>
                      <span>Syllabus 0455</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                        Economics Examination · Candidate Response Script
                      </h2>
                      <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[10px] font-mono">
                        {(TARIFF_OPTIONS.find((t) => t.value === essayCategory) || TARIFF_OPTIONS[0]).fullTitle}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {(TARIFF_OPTIONS.find((t) => t.value === essayCategory) || TARIFF_OPTIONS[0]).guidance} · <strong className="text-foreground">{(TARIFF_OPTIONS.find((t) => t.value === essayCategory) || TARIFF_OPTIONS[0]).aoFull}</strong>
                    </p>
                  </div>

                  {/* Interactive Quick-Test Banner for Guests & New Students */}
                  <div
                    id="tour-sample-banner"
                    className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] via-indigo-500/[0.05] to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          New to Marginal? Test Cambridge Examiner in 1 Click
                        </span>
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-[9.5px] font-bold">
                          Quick Start
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Load our verified 8-mark past paper exemplar (Exchange Rates &amp; Current Account) to test OCR, diagrams, and Cambridge marks right now.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSelectSample(SAMPLE_ESSAYS[0])}
                        className="h-8 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Load 8M Sample</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTourOpen(true)}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/80 gap-1 cursor-pointer"
                      >
                        <Lightbulb className="size-3 text-amber-500" />
                        <span>How To Use</span>
                      </Button>
                    </div>
                  </div>

                  {/* Question Section */}
                  <div
                    id="tour-question"
                    onClick={(e) => {
                      if (e.target === e.currentTarget && questionInputRef.current) {
                        questionInputRef.current.focus();
                      }
                    }}
                    className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3 w-full min-w-0 cursor-text focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/10 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-foreground shrink-0">
                        <PenLine className="size-3.5 text-primary" /> Question Prompt
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        Cambridge IGCSE 0455 Standard
                      </span>
                    </div>
                    <textarea
                      ref={questionInputRef}
                      rows={2}
                      spellCheck={true}
                      className="block w-full resize-none border-0 bg-transparent p-0 text-base sm:text-lg font-semibold leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40 text-foreground shadow-none"
                      style={{
                        fontFamily: '"Inter Tight", "Outfit", system-ui, -apple-system, sans-serif',
                        fontOpticalSizing: "none",
                        letterSpacing: "0px",
                        wordSpacing: "0px",
                        lineHeight: "1.6",
                      }}
                      placeholder="Enter or paste the exam question (e.g. Discuss whether a rise in the minimum wage will always reduce employment)..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />

                    {/* Prominent Cambridge Knowledge Base Calibration Banner */}
                    {question.trim().length >= 8 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-xs text-emerald-400 animate-in fade-in duration-200 w-full min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-emerald-300 flex items-center gap-2 flex-wrap">
                              <span>Calibrated with Cambridge IGCSE 0455 Knowledge Base</span>
                              {groundingQuery.isLoading && (
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                              )}
                            </div>
                            <div className="text-[11px] text-emerald-400/80 leading-relaxed">
                              {groundingQuery.data?.grounded && groundingQuery.data.topMatchTitle
                                ? `Grounded in: ${groundingQuery.data.topMatchTitle} · Cambridge syllabus & mark scheme criteria verified`
                                : "Question actively grounded against official Cambridge syllabus topics, coursebook anchors, and examiner mark schemes."}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono shrink-0 uppercase tracking-wider">
                          Calibrated
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Diagram Studio (Clean, Prominent & Expandable On-Demand) */}
                  <div
                    id="tour-diagrams"
                    className="rounded-2xl border border-primary/25 bg-primary/[0.03] overflow-hidden transition-all duration-200 w-full min-w-0"
                  >
                    <div className="flex items-center justify-between p-2.5 sm:px-3.5 flex-wrap gap-2 w-full min-w-0">
                      {/* Left: Prominent Clickable Trigger to toggle draggable tray */}
                      <button
                        type="button"
                        onClick={() => setDiagramTrayExpanded((prev) => !prev)}
                        className="flex items-center gap-2.5 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer group select-none text-left"
                        title={diagramTrayExpanded ? "Click to collapse diagram tray" : "Click to expand draggable diagrams"}
                      >
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                          <Images className="size-4" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground group-hover:text-primary">
                            Drag or Insert Diagram
                          </span>
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-mono">
                            30+ Cambridge &amp; Custom
                          </Badge>
                          {inTextDiagrams.matches.length > 0 && (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                              {inTextDiagrams.matches.length} in essay
                            </Badge>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground group-hover:text-primary transition-transform duration-200 shrink-0",
                            diagramTrayExpanded && "rotate-180",
                          )}
                        />
                      </button>

                      {/* Right: Quick actions that work instantly whether tray is expanded or not */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDiagramFilterSection("custom");
                            setDiagramDrawerOpen(true);
                          }}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg gap-1.5 cursor-pointer"
                          title="Paste or upload diagram image"
                        >
                          <Upload className="size-3 text-primary" />
                          <span className="hidden sm:inline">Upload Image</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => diagramCameraInputRef.current?.click()}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg gap-1.5 cursor-pointer"
                          title="Take photo of handwritten notebook diagram"
                        >
                          <Camera className="size-3 text-primary" />
                          <span className="hidden sm:inline">Photo</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDiagramFilterSection("all");
                            setDiagramDrawerOpen(true);
                          }}
                          className="h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10 rounded-lg gap-1 font-semibold cursor-pointer"
                        >
                          <span>Browse All ↗</span>
                        </Button>
                      </div>
                    </div>

                    {/* Draggable Diagram Tray (Visible on click with smooth animation) */}
                    {diagramTrayExpanded && (
                      <div className="border-t border-primary/15 bg-background/60 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 w-full min-w-0">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 font-medium">
                            <GripVertical className="size-3 text-primary" />
                            Drag any diagram directly into your text below, or click to insert at cursor:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDiagramFilterSection("all");
                              setDiagramDrawerOpen(true);
                            }}
                            className="text-primary hover:underline font-medium text-[11px] cursor-pointer shrink-0"
                          >
                            Browse 30+ Library &amp; Draw Custom →
                          </button>
                        </div>

                        {/* Popular Draggable Diagram Chips - Wrapped so they fit any screen without blowout */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 w-full min-w-0">
                          {POPULAR_DRAGGABLE_DIAGRAMS.map((diag) => {
                            const isAlreadyAdded = inTextDiagrams.matches.some((m) => m.entry.id === diag.id);
                            return (
                              <div
                                key={diag.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/marginal-diagram", diag.id);
                                  e.dataTransfer.setData("application/marginal-diagram-title", diag.title);
                                  e.dataTransfer.setData("text/plain", `\n\n(Diagram: ${diag.title})\n\n`);
                                  e.dataTransfer.effectAllowed = "copy";
                                  setDraggingDiagram({ id: diag.id, title: diag.title });
                                }}
                                onDragEnd={() => {
                                  setDraggingDiagram(null);
                                  setHoveredDropSlot(null);
                                }}
                                onClick={() => {
                                  if (textParagraphs.length >= 2) {
                                    setPlacementPickerDiagram(diag);
                                  } else {
                                    insertDiagramAtCursor(diag);
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-grab active:cursor-grabbing transition-all select-none group shadow-2xs shrink-0",
                                  isAlreadyAdded
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                                    : "border-border/80 bg-card hover:bg-primary/10 hover:border-primary/50 text-foreground",
                                )}
                                title="Drag to place in any paragraph, or click to choose paragraph position"
                              >
                                <GripVertical className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                <span>{diag.title}</span>
                                {isAlreadyAdded ? (
                                  <Check className="size-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <Plus className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Paragraph Drop Target Slots when Dragging a Diagram */}
                  {draggingDiagram && (
                    <div className="rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-500/[0.04] p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <GripVertical className="size-4 animate-bounce text-emerald-400" />
                          <span>Drag &amp; drop "{draggingDiagram.title}" into your desired paragraph position:</span>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono">
                          Active Drop Targets
                        </Badge>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoveredDropSlot(0);
                          }}
                          onDragLeave={() => setHoveredDropSlot(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDropAtSlot(0, draggingDiagram.title, draggingDiagram.id);
                          }}
                          className={cn(
                            "p-2.5 rounded-xl border border-dashed text-xs text-center font-medium transition-all cursor-pointer select-none",
                            hoveredDropSlot === 0
                              ? "border-emerald-500 bg-emerald-500/25 text-emerald-300 font-bold scale-[1.01] shadow-md ring-2 ring-emerald-500/50"
                              : "border-border/70 bg-card hover:border-emerald-500/50 text-muted-foreground",
                          )}
                        >
                          {hoveredDropSlot === 0
                            ? `📍 Release to place (Diagram: ${draggingDiagram.title}) at the very beginning`
                            : `＋ Drop at beginning (Before Paragraph 1)`}
                        </div>

                        {textParagraphs.map((para, pIdx) => (
                          <div key={pIdx} className="space-y-2">
                            <div className="p-3 rounded-xl bg-card border border-border/60 text-xs text-foreground/80 leading-relaxed shadow-2xs">
                              <span className="font-bold text-primary mr-1.5">Paragraph {pIdx + 1}:</span>
                              <span className="line-clamp-2 text-muted-foreground">{para.raw}</span>
                            </div>

                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setHoveredDropSlot(pIdx + 1);
                              }}
                              onDragLeave={() => setHoveredDropSlot(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDropAtSlot(pIdx + 1, draggingDiagram.title, draggingDiagram.id);
                              }}
                              className={cn(
                                "p-2.5 rounded-xl border border-dashed text-xs text-center font-medium transition-all cursor-pointer select-none",
                                hoveredDropSlot === pIdx + 1
                                  ? "border-emerald-500 bg-emerald-500/25 text-emerald-300 font-bold scale-[1.01] shadow-md ring-2 ring-emerald-500/50"
                                  : "border-border/70 bg-card hover:border-emerald-500/50 text-muted-foreground",
                              )}
                            >
                              {hoveredDropSlot === pIdx + 1
                                ? `📍 Release to place (Diagram: ${draggingDiagram.title}) after Paragraph ${pIdx + 1}`
                                : `＋ Drop after Paragraph ${pIdx + 1} ${pIdx + 1 < textParagraphs.length ? `(Before Paragraph ${pIdx + 2})` : "(At end of essay)"}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Candidate Essay Response Area */}
                  <div className="space-y-3 pt-1 w-full min-w-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-foreground shrink-0">
                        <FileText className="size-3.5 text-primary" /> Candidate Essay Response
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {result && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingAfterGrade((prev) => !prev)}
                            className="h-7 px-2.5 rounded-lg text-xs font-medium gap-1.5 cursor-pointer hover:bg-muted"
                          >
                            {isEditingAfterGrade ? (
                              <>
                                <MessageSquare className="size-3 text-primary" />
                                <span>View Pass 4 Comments ({pass4Comments.length})</span>
                              </>
                            ) : (
                              <>
                                <PenLine className="size-3 text-muted-foreground" />
                                <span>Edit Script</span>
                              </>
                            )}
                          </Button>
                        )}

                        {/* Writing Font Selector (Cambridge Serif vs Clean Modern Sans) */}
                        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-0.5 text-[10.5px]">
                          <button
                            type="button"
                            onClick={() => setEssayFont("serif")}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                              essayFont === "serif"
                                ? "bg-background text-foreground shadow-xs font-serif font-bold"
                                : "text-muted-foreground hover:text-foreground font-serif"
                            )}
                            title="Authentic Cambridge Examination Serif"
                          >
                            Serif
                          </button>
                          <button
                            type="button"
                            onClick={() => setEssayFont("sans")}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                              essayFont === "sans"
                                ? "bg-background text-foreground shadow-xs font-sans font-bold"
                                : "text-muted-foreground hover:text-foreground font-sans"
                            )}
                            title="Clean Modern Sans font"
                          >
                            Sans
                          </button>
                        </div>

                        {words >= 60 && textParagraphs.length <= 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const formatted = autoParagraphText(essayText);
                              if (formatted !== essayText) {
                                setEssayText(formatted);
                                toast.success("Structured candidate script into distinct paragraphs!");
                              } else {
                                toast.info("No natural paragraph splits found.");
                              }
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            title="Format monolithic text into Cambridge paragraphs"
                          >
                            <Sparkles className="size-3 text-primary" /> Format Paragraphs
                          </button>
                        )}
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                          {words} words · {result ? "Graded" : "Ctrl+Enter to grade"}
                        </span>
                      </div>
                    </div>

                    {/* Sleek Minimalist Cambridge IGCSE 0455 Score Ribbon (Auto-scroll target) */}
                    {result && !isEditingAfterGrade && (
                      <div
                        id="candidate-report-header"
                        className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:p-5 space-y-3 animate-in fade-in shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-sm shrink-0 shadow-xs">
                              <Award className="size-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base text-foreground">
                                  Cambridge IGCSE 0455 Diagnostic Verdict
                                </span>
                                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs">
                                  {result.grading.band}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Evaluated by dual Cambridge examiners across Assessment Objectives &amp; diagrammatic integration
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-black text-base shadow-xs flex items-center gap-1.5">
                              <span>{result.grading.total_mark}</span>
                              <span className="text-xs opacity-80">/ {result.grading.max_mark}</span>
                              <span className="text-[11px] font-normal uppercase tracking-wider ml-1">Marks</span>
                            </div>
                          </div>
                        </div>

                        {/* Clean Minimalist AO Breakdown Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs">
                          <div className="px-3 py-2 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">AO1 Knowledge</span>
                            <span className="font-mono font-bold text-foreground">
                              {result.grading.ao_breakdown?.knowledge?.awarded ?? 0} / {result.grading.ao_breakdown?.knowledge?.out_of ?? 3}
                            </span>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">AO2 Analysis</span>
                            <span className="font-mono font-bold text-foreground">
                              {result.grading.ao_breakdown?.analysis?.awarded ?? 0} / {result.grading.ao_breakdown?.analysis?.out_of ?? 6}
                            </span>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground font-medium">AO3 Evaluation</span>
                            <span className="font-mono font-bold text-foreground">
                              {result.grading.ao_breakdown?.evaluation?.awarded ?? 0} / {result.grading.ao_breakdown?.evaluation?.out_of ?? 3}
                            </span>
                          </div>
                        </div>

                        {/* One-Sentence Examiner Summary */}
                        {(result.grading.examiner_summary || (result.grading as any).overall_comment) && (
                          <p className="text-xs text-foreground/80 italic pt-1 border-t border-border/40 leading-relaxed">
                            "{stripScoreFractionsFromText(stripStars(result.grading.examiner_summary || (result.grading as any).overall_comment || ""))}"
                          </p>
                        )}

                        {/* Clear Guide to Full Candidate Diagnostic Report Below */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/50 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Sparkles className="size-3.5 text-primary shrink-0" />
                            <span>
                              {showDetailedReport
                                ? "Full Cambridge criteria report is displayed below."
                                : "Complete criteria matrix, strengths, weaknesses & model exemplars available on demand."}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setDetailedBreakdownOpen(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-foreground font-semibold text-[11px] border border-border/80 transition-all cursor-pointer shadow-xs"
                            >
                              <Eye className="size-3 text-muted-foreground" />
                              <span>Quick Dialog ↗</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!showDetailedReport) {
                                  setShowDetailedReport(true);
                                  setTimeout(() => {
                                    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }, 100);
                                } else {
                                  setShowDetailedReport(false);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                            >
                              {showDetailedReport ? (
                                <>
                                  <ChevronUp className="size-3" />
                                  <span>Hide Report ↑</span>
                                </>
                              ) : (
                                <>
                                  <SlidersHorizontal className="size-3" />
                                  <span>Detailed Report Below ↓</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Single Integrated Manuscript Mode: Interactive Pass 4 Review when graded, Pure Writing Surface when drafting */}
                    {result && !isEditingAfterGrade ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px] gap-6 items-start">
                        {/* Left Column: Annotated Candidate Manuscript with Google Docs in-situ highlights */}
                        <div className="rounded-2xl border border-border/70 bg-card/40 dark:bg-card/20 p-5 sm:p-7 shadow-xs space-y-4">
                          <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider font-sans">
                              <BookOpenCheck className="size-3.5 text-primary" /> Annotated Candidate Manuscript
                            </span>
                            <span className="text-[11px] text-muted-foreground/80 font-mono">
                              Click any passage or comment to inspect
                            </span>
                          </div>

                          <div
                            className={cn(
                              "space-y-4 text-base sm:text-[18px] md:text-[19px] leading-[1.95] text-foreground/95 min-h-[460px]",
                              essayFont === "serif" ? "font-serif" : "font-sans",
                            )}
                            style={{
                              fontFamily:
                                essayFont === "serif"
                                  ? '"Newsreader", Georgia, Cambria, "Times New Roman", serif'
                                  : '"Outfit", "Inter Tight", system-ui, -apple-system, sans-serif',
                              fontOpticalSizing: "none",
                              letterSpacing: "0px",
                              lineHeight: essayFont === "serif" ? "1.9" : "1.75",
                            }}
                          >
                            {paragraphBlocks.length > 0 ? (
                              paragraphBlocks.map((block) => {
                                const isDiag = block.isDiagram;
                                const paraComments = pass4Comments.filter((c) => c.paragraphIndex === block.index);
                                const isParaActive = paraComments.some((c) => c.id === activeCommentId);

                                if (isDiag) {
                                  const diagComment = pass4Comments.find(
                                    (c) => c.category === "diagram" && c.paragraphIndex === block.index,
                                  );
                                  const isDiagActive = diagComment && activeCommentId === diagComment.id;

                                  return (
                                    <div
                                      key={block.index}
                                      id={`pass4-para-${block.index}`}
                                      onClick={() => {
                                        if (diagComment) {
                                          setActiveCommentId(diagComment.id);
                                          document
                                            .getElementById(`pass4-card-${diagComment.id}`)
                                            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                        }
                                      }}
                                      className={cn(
                                        "my-3 py-3 px-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-between gap-3 font-sans",
                                        isDiagActive
                                          ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-400/80 shadow-md scale-[1.01]"
                                          : "border-emerald-500/40 bg-emerald-500/[0.08] dark:bg-emerald-950/30 hover:border-emerald-400 hover:bg-emerald-500/15",
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Images
                                          className={cn(
                                            "size-4 shrink-0",
                                            isDiagActive ? "text-emerald-300 animate-pulse" : "text-emerald-400",
                                          )}
                                        />
                                        <span className="font-mono font-bold text-xs sm:text-sm text-emerald-300">
                                          {block.diagramTitle || block.text.replace(/^\[DIAGRAM:\s*/i, "").replace(/\]$/, "").slice(0, 50)}
                                        </span>
                                        <span className="text-[11px] text-emerald-400/80 font-sans hidden sm:inline">
                                          · Cambridge IGCSE 0455 Integrated Figure · {block.label}
                                        </span>
                                      </div>
                                      {diagComment && (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[10px] gap-1 cursor-pointer transition-colors",
                                            isDiagActive
                                              ? "border-emerald-400 bg-emerald-400/30 text-white font-bold"
                                              : "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
                                          )}
                                        >
                                          <MessageSquare className="size-2.5" />
                                          <span>Decoded by Pass 4</span>
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={block.index}
                                    id={`pass4-para-${block.index}`}
                                    onClick={() => {
                                      if (paraComments.length > 0) {
                                        const nextComment = isParaActive
                                          ? paraComments[0]
                                          : paraComments.find((c) => c.id !== activeCommentId) || paraComments[0];
                                        setActiveCommentId(nextComment.id);
                                        document
                                          .getElementById(`pass4-card-${nextComment.id}`)
                                          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                      }
                                    }}
                                    className={cn(
                                      "relative rounded-xl transition-all duration-200 leading-[1.95] tracking-tight p-3 sm:p-4",
                                      paraComments.length > 0 ? "cursor-pointer group border-l-2" : "border-l-2 border-transparent",
                                      isParaActive
                                        ? "border-primary bg-primary/[0.03] dark:bg-primary/[0.06] shadow-xs"
                                        : paraComments.length > 0
                                          ? "border-border/80 hover:border-primary/50 hover:bg-muted/10"
                                          : "",
                                    )}
                                  >
                                    {paraComments.length > 0 && (
                                      <div className="flex items-center justify-between gap-2 pb-1.5 text-xs select-none">
                                        <div className="flex items-center gap-1.5 text-[11px] font-sans text-muted-foreground group-hover:text-foreground transition-colors">
                                          <span
                                            className={cn(
                                              "inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[9px] font-mono font-bold transition-all",
                                              isParaActive
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary",
                                            )}
                                          >
                                            {paraComments.length}
                                          </span>
                                          <span className="font-medium text-[11px] text-muted-foreground">
                                            {block.label}
                                          </span>
                                        </div>
                                        {isParaActive && (
                                          <span className="text-[10px] font-mono font-semibold text-primary/90 flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                                            Active Passage
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {(() => {
                                      const activeComment = paraComments.find((c) => c.id === activeCommentId);

                                      if (isParaActive && activeComment) {
                                        const span = findHighlightSpanInText(block.text, activeComment.highlightText);
                                        const category = activeComment.category;
                                        return (
                                          <p className="text-foreground/95">
                                            <span>{span.before}</span>
                                            <span
                                              className={cn(
                                                "font-bold text-foreground transition-all duration-150 inline rounded-sm px-1 py-0.5",
                                                category === "diagram"
                                                  ? "bg-emerald-500/15 dark:bg-emerald-500/25 underline decoration-emerald-500 decoration-2 underline-offset-4 ring-1 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                                                  : category === "evaluation"
                                                    ? "bg-sky-500/15 dark:bg-sky-500/25 underline decoration-sky-500 decoration-2 underline-offset-4 ring-1 ring-sky-500/30 text-sky-950 dark:text-sky-100"
                                                    : category === "knowledge"
                                                      ? "bg-indigo-500/15 dark:bg-indigo-500/25 underline decoration-indigo-500 decoration-2 underline-offset-4 ring-1 ring-indigo-500/30 text-indigo-950 dark:text-indigo-100"
                                                      : "bg-amber-500/15 dark:bg-amber-500/25 underline decoration-amber-500 decoration-2 underline-offset-4 ring-1 ring-amber-500/30 text-amber-950 dark:text-amber-100",
                                              )}
                                            >
                                              {span.match}
                                            </span>
                                            <span>{span.after}</span>
                                          </p>
                                        );
                                      }

                                      if (paraComments.length > 0) {
                                        const firstComment = paraComments[0];
                                        const span = findHighlightSpanInText(block.text, firstComment.highlightText);
                                        return (
                                          <p className="text-foreground/95">
                                            <span>{span.before}</span>
                                            <span className="font-semibold text-foreground/90 underline decoration-muted-foreground/35 decoration-dashed underline-offset-4 hover:decoration-primary transition-colors cursor-pointer">
                                              {span.match}
                                            </span>
                                            <span>{span.after}</span>
                                          </p>
                                        );
                                      }

                                      return <p className="text-foreground/95">{block.text}</p>;
                                    })()}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-muted-foreground/40 italic font-sans text-sm">
                                Candidate script is empty.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Pass 4 Google Docs Comment Cards Stream (No inner scrollbar) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground uppercase tracking-wider">
                              <MessageSquare className="size-4 text-primary" />
                              <span>Pass 4 Examiner Comments</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                              {pass4Comments.length} {pass4Comments.length === 1 ? "Comment" : "Comments"}
                            </Badge>
                          </div>

                          {pass4Comments.length === 0 ? (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center space-y-1">
                              <CheckCircle2 className="size-5 text-emerald-400 mx-auto" />
                              <p className="text-xs font-semibold text-emerald-400">Exemplar Integration</p>
                              <p className="text-[11px] text-muted-foreground">
                                All diagrams, causal mechanisms, and evaluation criteria meet Cambridge standards.
                              </p>
                            </div>
                          ) : (
                            pass4Comments.map((comment) => {
                              const isActive = activeCommentId === comment.id;
                              const categoryColor =
                                comment.category === "diagram"
                                  ? "border-emerald-500/40 bg-emerald-500/[0.05] hover:border-emerald-500/70"
                                  : comment.category === "evaluation"
                                    ? "border-sky-500/40 bg-sky-500/[0.05] hover:border-sky-500/70"
                                    : comment.category === "knowledge"
                                      ? "border-indigo-500/40 bg-indigo-500/[0.05] hover:border-indigo-500/70"
                                      : "border-amber-500/40 bg-amber-500/[0.05] hover:border-amber-500/70";

                              const activeColor =
                                comment.category === "diagram"
                                  ? "ring-2 ring-emerald-400 border-emerald-500 bg-emerald-500/15 shadow-md"
                                  : comment.category === "evaluation"
                                    ? "ring-2 ring-sky-400 border-sky-500 bg-sky-500/15 shadow-md"
                                    : comment.category === "knowledge"
                                      ? "ring-2 ring-indigo-400 border-indigo-500 bg-indigo-500/15 shadow-md"
                                      : "ring-2 ring-amber-400 border-amber-500 bg-amber-500/15 shadow-md";

                              const badgeColor =
                                comment.category === "diagram"
                                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                                  : comment.category === "evaluation"
                                    ? "border-sky-500/40 bg-sky-500/20 text-sky-400"
                                    : comment.category === "knowledge"
                                      ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-400"
                                      : "border-amber-500/40 bg-amber-500/20 text-amber-400";

                              return (
                                <div
                                  key={comment.id}
                                  id={`pass4-card-${comment.id}`}
                                  onClick={() => {
                                    setActiveCommentId(comment.id);
                                    document
                                      .getElementById(`pass4-para-${comment.paragraphIndex}`)
                                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }}
                                  className={cn(
                                    "rounded-xl border p-3.5 space-y-2.5 transition-all duration-200 cursor-pointer text-xs",
                                    categoryColor,
                                    isActive && activeColor,
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                    <span className={cn("px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border", badgeColor)}>
                                      {comment.badge}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                      <span>{comment.paragraphLabel || `¶ Paragraph ${comment.paragraphIndex + 1}`}</span>
                                    </span>
                                  </div>

                                  <h5 className="font-bold text-xs text-foreground leading-snug">
                                    {comment.title}
                                  </h5>

                                  {comment.highlightText && (
                                    <div className="text-[11px] font-serif italic text-muted-foreground/90 bg-muted/30 border-l-2 border-primary/60 pl-2.5 py-1 rounded-r-md">
                                      "{comment.highlightText.length > 130 ? `${comment.highlightText.slice(0, 127)}…` : comment.highlightText}"
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                                      <span className="size-1.5 rounded-full bg-amber-400" /> Examiner Diagnostic:
                                    </span>
                                    <p className="text-[11.5px] text-foreground/90 leading-relaxed">
                                      {comment.critique}
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-border/40 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                                      <Sparkles className="size-3 text-primary" /> Exemplar Fix:
                                    </span>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      {comment.suggestion}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground/70">
                                    <span>Click to highlight in script</span>
                                    {isActive && <span className="font-semibold text-primary">● Active Pin</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        id="tour-essay"
                        onClick={(e) => {
                          if (e.target === e.currentTarget && essayInputRef.current) {
                            essayInputRef.current.focus();
                          }
                        }}
                        className={cn(
                          "relative rounded-2xl border border-border/70 bg-card/40 dark:bg-card/20 p-5 sm:p-7 transition-all w-full min-w-0 shadow-xs focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/10 cursor-text",
                          isDraggingOverTextarea && "ring-2 ring-emerald-500 bg-emerald-500/[0.03]",
                        )}
                      >
                        {isDraggingOverTextarea && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 backdrop-blur-xs rounded-2xl border-2 border-dashed border-emerald-500 pointer-events-none animate-in fade-in">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-card border border-emerald-500/40 px-4 py-2.5 rounded-xl shadow-lg">
                              <GripVertical className="size-4 animate-bounce" />
                              <span>Drop diagram anywhere here to position in candidate script</span>
                            </div>
                          </div>
                        )}
                        <textarea
                          ref={essayInputRef}
                          id="essay"
                          spellCheck={true}
                          rows={18}
                          className={cn(
                            "block w-full resize-none border-0 bg-transparent p-0 focus:outline-none focus:ring-0 shadow-none text-foreground selection:bg-primary/25 overflow-hidden min-h-[520px] placeholder:text-muted-foreground/35 leading-[1.9]",
                            essayFont === "serif" ? "font-serif text-[18px] sm:text-[19px]" : "font-sans text-[17px] sm:text-[18px]",
                          )}
                          style={{
                            fontFamily:
                              essayFont === "serif"
                                ? '"Newsreader", Georgia, Cambria, "Times New Roman", serif'
                                : '"Outfit", "Inter Tight", system-ui, -apple-system, sans-serif',
                            fontOpticalSizing: "none",
                            letterSpacing: "0px",
                            wordSpacing: "0px",
                            lineHeight: essayFont === "serif" ? "1.9" : "1.75",
                          }}
                          placeholder="Type or paste your candidate essay here... (Drag diagrams anywhere, paste images with Ctrl+V, or press Ctrl+Enter to grade)"
                          value={essayText}
                          onChange={(event) => {
                            setEssayText(event.target.value);
                            setWritingCheck(null);
                          }}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (items) {
                            for (const item of items) {
                              if (item.type.startsWith("image/")) {
                                const file = item.getAsFile();
                                if (file) {
                                  e.preventDefault();
                                  handleDiagramFiles([file]);
                                  toast.success("Pasting diagram image from clipboard into essay...");
                                  return;
                                }
                              }
                            }
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                          if (!isDraggingOverTextarea) setIsDraggingOverTextarea(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingOverTextarea(false);
                        }}
                        onDrop={(e) => {
                          setIsDraggingOverTextarea(false);
                          const diagramId = e.dataTransfer.getData("application/marginal-diagram");
                          const diagramTitle = e.dataTransfer.getData("application/marginal-diagram-title");
                          const entry = diagramId ? (DIAGRAM_BY_ID[diagramId] ?? DIAGRAMS.find((d) => d.id === diagramId)) : null;
                          const titleToInsert = entry?.title ?? diagramTitle ?? (diagramId || null);
                          if (titleToInsert) {
                            e.preventDefault();
                            const textarea = essayInputRef.current;
                            const tagToInsert = `\n\n(Diagram: ${titleToInsert})\n\n`;
                            if (textarea) {
                              let caretPos = textarea.selectionStart ?? essayText.length;
                              if ((document as any).caretRangeFromPoint) {
                                const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
                                if (range && range.startOffset !== undefined) {
                                  caretPos = range.startOffset;
                                }
                              } else if ((document as any).caretPositionFromPoint) {
                                const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
                                if (pos && pos.offset !== undefined) {
                                  caretPos = pos.offset;
                                }
                              }
                              const newText = essayText.slice(0, caretPos) + tagToInsert + essayText.slice(caretPos);
                              setEssayText(cleanMathDollarSigns(newText));
                              setTimeout(() => {
                                textarea.focus();
                                textarea.setSelectionRange(caretPos + tagToInsert.length, caretPos + tagToInsert.length);
                              }, 50);
                            } else {
                              setEssayText((prev: string) => `${cleanMathDollarSigns(prev)}\n\n(Diagram: ${titleToInsert})\n\n`);
                            }
                            toast.success(`Positioned (Diagram: ${titleToInsert}) in candidate script.`);
                            setDiagramDrawerOpen(false);
                            return;
                          }
                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            e.preventDefault();
                            handleDiagramFiles(files);
                          }
                        }}
                        onKeyDown={(event) => {
                          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                            event.preventDefault();
                            handleMarkClick();
                          }
                        }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Visual Embedded Diagram Figure Cards in Candidate Script */}
                  {inTextDiagrams.matches.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                          <Images className="size-4 text-primary" />
                          Embedded Diagram Figures ({inTextDiagrams.matches.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Positioned in analytical flow · Cambridge IGCSE 0455 Standard
                        </span>
                      </div>

                      <div className="space-y-4">
                        {inTextDiagrams.matches.map((m, idx) => {
                          const attachedImg = diagrams.find((d) => d.label.toLowerCase() === m.title.toLowerCase())?.imageUrl;
                          const posInfo = getDiagramPlacementDescription(m.matchText);
                          return (
                            <div
                              key={`${m.entry.id}-${idx}`}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/marginal-diagram", m.entry.id);
                                e.dataTransfer.setData("application/marginal-diagram-title", m.title);
                                e.dataTransfer.setData("text/plain", `\n\n${m.matchText}\n\n`);
                                setDraggingDiagram({ id: m.entry.id, title: m.title });
                              }}
                              onDragEnd={() => {
                                setDraggingDiagram(null);
                                setHoveredDropSlot(null);
                              }}
                              className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3 animate-in fade-in transition-all hover:border-primary/50 shadow-sm"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="size-4 text-muted-foreground hover:text-primary cursor-grab shrink-0" />
                                  <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                      <span>Figure {idx + 1}: {m.isCustom ? `Custom Diagram (${m.title})` : m.title}</span>
                                      <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary font-mono">
                                        {m.isCustom ? "Candidate Drawn" : "Cambridge IGCSE 0455"}
                                      </Badge>
                                    </h4>
                                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                                      <span>{posInfo.description}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveDiagramEarlier(m.matchText)}
                                    disabled={!posInfo.canMoveEarlier}
                                    className="h-7 px-2 text-xs rounded-lg gap-1 cursor-pointer hover:bg-primary/10 disabled:opacity-40"
                                    title="Move diagram earlier in essay (before previous paragraph)"
                                  >
                                    <ArrowUp className="size-3" />
                                    <span className="hidden sm:inline">Move Earlier</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveDiagramLater(m.matchText)}
                                    disabled={!posInfo.canMoveLater}
                                    className="h-7 px-2 text-xs rounded-lg gap-1 cursor-pointer hover:bg-primary/10 disabled:opacity-40"
                                    title="Move diagram later in essay (after next paragraph)"
                                  >
                                    <ArrowDown className="size-3" />
                                    <span className="hidden sm:inline">Move Later</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewDiagram(m.entry)}
                                    className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg gap-1 cursor-pointer"
                                    title="View graph specifications and examiner criteria"
                                  >
                                    <Eye className="size-3" />
                                    <span className="hidden sm:inline">Inspect</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDiagramFromEssay(m.matchText)}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1 cursor-pointer"
                                    title="Remove diagram from script"
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Visual Graph Preview inside the Figure Card */}
                              {attachedImg ? (
                                <div className="rounded-xl border border-border/70 bg-card p-3 max-w-xl mx-auto flex flex-col items-center gap-2">
                                  <img
                                    src={attachedImg}
                                    alt={m.title}
                                    className="max-h-56 rounded-lg object-contain border border-border/60"
                                  />
                                  <span className="text-[11px] text-muted-foreground font-mono">Candidate Uploaded Diagram Image</span>
                                </div>
                              ) : !m.isCustom && m.entry.spec ? (
                                <div className="rounded-xl border border-border/70 bg-card p-3 shadow-inner max-w-xl mx-auto">
                                  <EconomicsDiagram spec={m.entry.spec} title={m.title} className="w-full max-h-48" />
                                </div>
                              ) : null}

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                <span className="italic">{m.entry.represents || "Candidate referenced economics diagram"}</span>
                                <span className="text-primary font-medium text-[10px] uppercase tracking-wider">
                                  Examiner evaluates diagram integration at this position
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Proofreading Suggestions (when available) */}
                  {spellCheckEnabled && writingCheck && !checkIsStale && (
                    <WritingCheckPanel
                      check={writingCheck}
                      onAccept={() => {
                        const corrected = writingCheck.correctedText;
                        setEssayText(corrected);
                        setCheckedTextSnapshot(corrected);
                        setWritingCheck({ issues: [], correctedText: corrected, clean: true });
                        toast.success("Corrections applied to candidate script.");
                      }}
                    />
                  )}

                  {/* Document Footer */}
                  <div className="pt-6 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                    <span className="font-mono text-[11px]">
                      End of Candidate Script · Cambridge IGCSE 0455 Standard
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePasteEssay}
                        className="text-xs hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <ClipboardPaste className="size-3.5" /> Paste
                      </button>
                      {(question.trim() || essayText.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuestion("");
                            setEssayText("");
                            setDiagrams([]);
                            setResult(null);
                            try {
                              localStorage.removeItem(DRAFT_STORAGE_KEY);
                            } catch {}
                            toast.info("Document cleared.");
                          }}
                          className="text-xs text-muted-foreground/60 hover:text-destructive cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsed Candidate Diagnostic Report Teaser (Default View) */}
                {result && !showDetailedReport && (
                  <div className="pt-4 border-t border-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Award className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">
                              Official Cambridge IGCSE 0455 Diagnostic Criteria Breakdown
                            </h4>
                            <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary">
                              Full Matrix Available
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Full criteria matrix, Level boundaries, detailed AO feedback, and missing syllabus elements.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setShowDetailedReport(true);
                            setTimeout(() => {
                              reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 100);
                          }}
                          className="h-8 px-3 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                        >
                          <ChevronDown className="size-3.5" />
                          <span>Show Full Report</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Full Cambridge Candidate Diagnostic Report (Opened On Demand) */}
                {result && showDetailedReport && (
                  <div ref={reportRef} id="detailed-report-section" className="space-y-6 pt-6 border-t border-border/70 w-full min-w-0 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-primary/[0.08] via-card to-card border border-primary/25 shadow-xs">
                      <div className="flex items-center gap-3.5">
                        <div className="size-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-base shadow-xs shrink-0">
                          <Award className="size-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-bold text-base sm:text-lg text-foreground">
                              Complete Cambridge IGCSE 0455 Candidate Diagnostic Report
                            </h3>
                            <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-0.5 shadow-xs">
                              {result.grading.total_mark} / {result.grading.max_mark} Marks
                            </Badge>
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs">
                              {result.grading.band}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Detailed criteria breakdown across Knowledge (AO1), Analysis (AO2), Evaluation (AO3), syllabus missing elements &amp; model exemplars.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailedBreakdownOpen(true)}
                          className="gap-1.5 text-xs font-semibold border-border/80 hover:bg-muted cursor-pointer"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span>Popout Dialog ↗</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowDetailedReport(false);
                            document.getElementById("candidate-report-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="gap-1.5 text-xs font-semibold border-border/80 hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <ChevronUp className="size-3.5" />
                          <span>Hide Report</span>
                        </Button>
                      </div>
                    </div>

                    {/* Teacher Direct Grading Action */}
                    {isDirectGradingMode && (
                      <div className="rounded-2xl border border-purple-500/40 bg-purple-950/40 p-4 sm:p-5 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-300 text-sm">Teacher Classroom Sync</span>
                          <Badge className="bg-purple-600 text-white text-[10px]">Ready to Submit</Badge>
                        </div>
                        <p className="text-xs text-purple-200">
                          Sync this official examiner grade ({result.grading.total_mark}/{maxMark}) and diagnostic report directly back to the student.
                        </p>
                        <Button
                          size="sm"
                          disabled={isReturningGrade}
                          onClick={handleReturnToClassroom}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 shadow-md cursor-pointer"
                        >
                          {isReturningGrade ? "Returning Grade..." : "Save & Return to Student"}
                        </Button>
                      </div>
                    )}

                    {/* Full Comprehensive Candidate Report */}
                    <div id="report-section" className="rounded-3xl border border-border/80 bg-card p-5 sm:p-8 shadow-xs">
                      <MarkBreakdown grading={result.grading} question={question} />
                    </div>

                    {/* Bottom Hide Report Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-mono">Cambridge IGCSE 0455 Diagnostic Report</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDetailedReport(false);
                          document.getElementById("candidate-report-header")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ChevronUp className="size-3.5" />
                        <span>Hide Report &amp; Return to Manuscript</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slide-out Curate Diagram Drawer */}
          {diagramDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Images className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Curate Cambridge IGCSE 0455 Diagram</h3>
                      <p className="text-xs text-muted-foreground">Drag into candidate script or click to embed</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDiagramDrawerOpen(false)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="relative">
                  <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search 30+ Cambridge diagrams (e.g. minimum price, tariff, monopoly, J-curve)..."
                    value={diagramSearch}
                    onChange={(e) => setDiagramSearch(e.target.value)}
                    className="pl-9 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["all", "Microeconomics", "Macroeconomics", "custom"] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDiagramFilterSection(sec)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border",
                        diagramFilterSection === sec
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {sec === "all" ? "All (30+)" : sec === "custom" ? "+ Custom / Upload" : sec}
                    </button>
                  ))}
                </div>

                {/* Drag & Type Instruction Banner */}
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">Position diagrams directly where you want:</p>
                    <p className="text-[11.5px] leading-relaxed">
                      Drag any card directly onto your essay, click <strong>+ Insert at Cursor</strong>, or simply type <strong>(Diagram: Name)</strong> e.g. <span className="font-mono text-primary font-medium">(Diagram: Maximum Price)</span> or <span className="font-mono text-primary font-medium">(Diagram: Lorenz Curve)</span> anywhere in your text.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {diagramFilterSection === "custom" ? (
                    <div className="space-y-4 pt-2">
                      {/* Insert Non-Catalog Diagram by Name */}
                      <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          <h4 className="font-bold text-xs text-foreground">Insert Non-Catalog or Custom Diagram</h4>
                        </div>
                        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                          Referencing a diagram not in the catalog (e.g. Lorenz Curve, Monopsony Labour Market, Circular Flow, Harrod-Domar, or custom graph)? Type its name to position it directly at your cursor.
                        </p>
                        <div className="space-y-2">
                          <Input
                            placeholder="Diagram Name (e.g. Lorenz Curve, Monopsony Labour Market)..."
                            value={customDiagramTitle}
                            onChange={(e) => setCustomDiagramTitle(e.target.value)}
                            className="text-xs rounded-xl"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                insertCustomDiagram(customDiagramTitle, customDiagramNotes);
                              }
                            }}
                          />
                          <Input
                            placeholder="Optional notes or key curves (e.g. 45° line of equality, Gini area)..."
                            value={customDiagramNotes}
                            onChange={(e) => setCustomDiagramNotes(e.target.value)}
                            className="text-xs rounded-xl"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                insertCustomDiagram(customDiagramTitle, customDiagramNotes);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!customDiagramTitle.trim()}
                            onClick={() => insertCustomDiagram(customDiagramTitle, customDiagramNotes)}
                            className="w-full text-xs font-semibold rounded-xl bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            Insert (Diagram: {customDiagramTitle.trim() || "Custom"}) at Cursor
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Camera className="size-4 text-primary" />
                          <h4 className="font-bold text-xs text-foreground">Or Upload Hand-Drawn Diagram Photo</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload or snap a photo of your hand-drawn economics diagram. Cambridge examiners will mark it as drawn on the candidate script.
                        </p>
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
                          onClick={() => diagramFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center hover:bg-muted/30 cursor-pointer"
                        >
                          <Upload className="size-6 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Click to upload diagram photo</span>
                          <span className="text-[11px] text-muted-foreground">PNG, JPEG, WebP, HEIC</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => diagramCameraInputRef.current?.click()}
                            className="h-8 gap-1.5 text-xs font-medium rounded-xl"
                          >
                            <Camera className="size-3.5 text-primary" /> Take Photo
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : filteredDiagrams.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <p className="text-xs text-muted-foreground">
                        No catalog diagram matching "{diagramSearch}".
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => insertCustomDiagram(diagramSearch)}
                        className="text-xs bg-primary text-primary-foreground font-semibold rounded-xl gap-1.5 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        Insert (Diagram: {diagramSearch}) as Custom Diagram
                      </Button>
                    </div>
                  ) : (
                    filteredDiagrams.map((entry) => {
                      const isAlreadyAdded =
                        inTextDiagrams.matches.some((m) => m.entry.id === entry.id) ||
                        diagrams.some((d) => d.catalogId === entry.id);
                      return (
                        <div
                          key={entry.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/marginal-diagram", entry.id);
                            e.dataTransfer.setData("application/marginal-diagram-title", entry.title);
                            e.dataTransfer.setData("text/plain", ` (Diagram: ${entry.title}) `);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          className={cn(
                            "rounded-2xl border p-3.5 space-y-2.5 transition-all bg-muted/10 hover:bg-muted/30 hover:border-primary/50 group cursor-grab active:cursor-grabbing",
                            isAlreadyAdded ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/70",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="size-3.5 text-muted-foreground group-hover:text-primary cursor-grab" />
                                <h4 className="font-bold text-xs text-foreground">{entry.title}</h4>
                              </div>
                              <p className="text-[11px] text-muted-foreground pl-5 font-mono">
                                {entry.section} · {entry.topic}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => insertDiagramAtCursor(entry)}
                              className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1 cursor-pointer"
                            >
                              {isAlreadyAdded ? (
                                <>
                                  <Check className="size-3 text-emerald-300" /> Inserted
                                </>
                              ) : (
                                <>
                                  <Plus className="size-3" /> Insert at Cursor
                                </>
                              )}
                            </Button>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-card p-2 pointer-events-none">
                            <EconomicsDiagram spec={entry.spec} title={entry.title} className="w-full max-h-36" />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="italic line-clamp-1">{entry.represents}</span>
                            <span className="text-[10px] text-primary/70 font-mono shrink-0">Drag to position ↗</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Slide-out Handwriting OCR Drawer */}
          {ocrDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Import Handwriting Scanner</h3>
                      <p className="text-xs text-muted-foreground">Transcribe handwritten pages directly into script</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOcrDrawerOpen(false)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <HandwritingUpload
                    hint={question}
                    onText={(text) => {
                      const formatted = autoParagraphText(cleanMathDollarSigns(text));
                      setEssayText((current: string) => (current.trim() ? `${current.trim()}\n\n${formatted}` : formatted));
                      setWritingCheck(null);
                      setOcrDrawerOpen(false);
                      toast.success("Handwriting transcribed into candidate script!");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Slide-out Mark Scheme Vision Drawer */}
          {markSchemeDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Vision Mark Scheme</h3>
                      <p className="text-xs text-muted-foreground">Attach screenshots of official Cambridge mark scheme</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMarkSchemeDrawerOpen(false)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste a screenshot of the official mark scheme page. The examiner will read it directly during evaluation alongside the Cambridge Knowledge Base.
                  </p>
                  <MarkSchemeScreenshots
                    images={markSchemeImages}
                    onAdd={(img) => setMarkSchemeImages((current) => [...current, img])}
                    onRemove={(id) =>
                      setMarkSchemeImages((current) => current.filter((img) => img.id !== id))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Slide-out Preferences Drawer */}
          {settingsDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl p-6 space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Examiner Preferences</h3>
                      <p className="text-xs text-muted-foreground">Audit pass and proofreading engine</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsDrawerOpen(false)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  <Toggle
                    label="Independent audit pass"
                    hint="A second examiner re-checks the mark to correct clustering around middle bands."
                    checked={auditPass}
                    onChange={setAuditPass}
                  />
                  <Toggle
                    label="Spelling & grammar check"
                    hint="Quick proofreading pass before marking. Never alters economic marks."
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
              </div>
            </div>
          )}

          {/* In-Text Diagram SVG Preview Modal */}
          {previewDiagram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Images className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-base text-foreground">{previewDiagram.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {previewDiagram.section} · {previewDiagram.topic} · Cambridge IGCSE 0455 Standard
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDiagram(null)}
                    className="size-8 rounded-xl cursor-pointer"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {previewDiagram.id.startsWith("custom-") || (previewDiagram.spec as any)?.type === "custom" ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-primary" />
                      <span className="font-bold text-sm text-foreground">Candidate-Drawn Custom Diagram</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This diagram was referenced directly in the candidate script. Cambridge IGCSE 0455 examiners award full AO2 analysis marks for candidate-drawn diagrams based on:
                    </p>
                    <ul className="list-disc list-inside text-xs text-foreground/90 space-y-1.5 pl-1">
                      <li>Correct labelling of vertical and horizontal axes</li>
                      <li>Accurate curve trajectories, initial equilibria, and shifts</li>
                      <li>Directional shift arrows and equilibrium points (e.g. P1 to P2, Q1 to Q2)</li>
                      <li>Direct integration with analytical chains of reasoning in surrounding text</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-inner overflow-hidden">
                      <EconomicsDiagram spec={previewDiagram.spec} title={previewDiagram.title} className="w-full max-h-72" />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="rounded-xl bg-muted/30 border border-border/60 p-3 space-y-1">
                        <span className="font-semibold text-foreground">Economic Representation:</span>
                        <p className="text-muted-foreground leading-relaxed">{previewDiagram.represents}</p>
                      </div>
                      <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-3 space-y-1">
                        <span className="font-semibold text-primary">Cambridge Examiner Criteria:</span>
                        <p className="text-muted-foreground leading-relaxed">{previewDiagram.whyUsed}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDiagram(null)}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      insertDiagramAtCursor(previewDiagram);
                      setPreviewDiagram(null);
                    }}
                    className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Insert into Script Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Full Detailed Breakdown Dialog / Modal */}
          {detailedBreakdownOpen && result && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="size-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-base text-foreground">Complete Cambridge Diagnostic Report</h3>
                      <p className="text-xs text-muted-foreground">Score: {result.grading.total_mark} / {result.grading.max_mark} · {result.grading.band}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailedBreakdownOpen(false)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <MarkBreakdown grading={result.grading} />
              </div>
            </div>
          )}

          {/* 1-Click Diagram Paragraph Placement Modal */}
          {placementPickerDiagram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Images className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Choose Paragraph Placement</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        Positioning (Diagram: {placementPickerDiagram.title})
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPlacementPickerDiagram(null)}
                    className="size-8 rounded-xl"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Select where in your analytical flow this diagram should be placed and evaluated:
                </p>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => handleDropAtSlot(0, placementPickerDiagram.title, placementPickerDiagram.id)}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                      ＋ Place at Beginning (Before Paragraph 1)
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                      Beginning
                    </Badge>
                  </button>

                  {textParagraphs.map((para, pIdx) => (
                    <div key={pIdx} className="space-y-1.5 pt-1">
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground line-clamp-2 italic">
                        Paragraph {pIdx + 1}: "{para.raw}"
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDropAtSlot(pIdx + 1, placementPickerDiagram.title, placementPickerDiagram.id)}
                        className="w-full text-left p-2.5 rounded-xl border border-dashed border-border/70 hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-foreground group-hover:text-emerald-400">
                          ＋ Insert after Paragraph {pIdx + 1} {pIdx + 1 < textParagraphs.length ? `(Before Paragraph ${pIdx + 2})` : "(At end of essay)"}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-emerald-400/80 font-mono">
                          After Para {pIdx + 1}
                        </Badge>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DiagramCheckDialog
            open={diagramPromptOpen}
            onOpenChange={setDiagramPromptOpen}
            question={question}
            essayText={essayText}
            onAddDiagram={() => {
              setDiagramPromptOpen(false);
              setDiagramDrawerOpen(true);
            }}
            onProceedAnyway={() => handleMarkClick({ skipDiagramCheck: true })}
          />

      <InSituTour
        isOpen={isTourOpen}
        onClose={() => {
          setIsTourOpen(false);
          try {
            localStorage.setItem("marginal_grade_tour_seen", "true");
            localStorage.setItem("marginal_grade_tour_seen_v2", "true");
          } catch {}
        }}
        onComplete={() => {
          setIsTourOpen(false);
          try {
            localStorage.setItem("marginal_grade_tour_seen", "true");
            localStorage.setItem("marginal_grade_tour_seen_v2", "true");
          } catch {}
        }}
        steps={tourSteps}
        onActionClick={() => {
          handleSelectSample(SAMPLE_ESSAYS[0]);
          setIsTourOpen(false);
          try {
            localStorage.setItem("marginal_grade_tour_seen", "true");
            localStorage.setItem("marginal_grade_tour_seen_v2", "true");
          } catch {}
        }}
        actionButtonLabel="⚡ Load 8M Sample Essay"
      />
    </>
  );
}

function WritingCheckPanel({ check, onAccept }: { check: WritingCheck; onAccept: () => void }) {
  const isClean = check.clean || check.issues.length === 0;

  if (isClean) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            {check.engine === "in_house" ? "In-House Engine: " : "AI Proofread: "}
            No spelling, grammar, or terminology issues found — ready to mark.
          </span>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px] font-mono">
          {check.engine === "in_house" ? "0ms Verified" : "AI Clean"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            {check.issues.length} {check.engine === "in_house" ? "In-House" : "AI"} suggestion{check.issues.length === 1 ? "" : "s"} found
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-background/80 font-mono">
          {check.engine === "in_house" ? "⚡ Cambridge Whitelisted" : "✨ AI Proofreader"}
        </Badge>
      </div>

      <ul className="max-h-56 space-y-2 overflow-y-auto text-xs pr-1">
        {check.issues.map((issue, index) => (
          <li key={index} className="rounded-md border border-border bg-background p-2.5 space-y-1 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize font-mono">
                {issue.type}
              </Badge>
              <span className="text-destructive font-mono line-through font-medium">{issue.original}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{issue.suggestion}</span>
            </div>
            {issue.explanation && (
              <p className="text-[11px] text-foreground font-medium">{issue.explanation}</p>
            )}
            {issue.context ? (
              <p className="text-[11px] text-muted-foreground italic">"{issue.context}"</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <Button type="button" size="sm" onClick={onAccept} className="h-8 text-xs font-semibold">
          Apply corrections ({check.issues.length})
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Economics content &amp; marks are never altered.
        </span>
      </div>
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
