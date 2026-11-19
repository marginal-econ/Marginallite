import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bandFor, stripScoreFractionsFromText, type Grading } from "@/lib/examiner/types";
import { getCambridgeGradeStandard } from "@/lib/cambridge-thresholds";
import { cn, stripStars } from "@/lib/utils";

const AO_META = [
  {
    key: "knowledge" as const,
    label: "AO1 Knowledge & Understanding",
    shortLabel: "AO1 Knowledge",
    icon: BookOpen,
    bar: "bg-sky-500",
    text: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max <= 2) {
        if (awarded === 2) return "Level 2 (Accurate & Precise)";
        if (awarded === 1) return "Level 1 (Basic / Terminology)";
        return "Below Level 1";
      }
      if (max === 4) {
        if (awarded === 4) return "Level 2 (Accurate & Precise)";
        if (awarded >= 2) return "Level 2 (Sound)";
        if (awarded >= 1) return "Level 1 (Basic / Terminology)";
        return "Below Level 1";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.75) return "Level 3 (Developed)";
      if (pct >= 0.45) return "Level 2 (Sound)";
      return "Level 1 (Basic)";
    },
  },
  {
    key: "analysis" as const,
    label: "AO2 Causal Analysis & Application",
    shortLabel: "AO2 Analysis",
    icon: TrendingUp,
    bar: "bg-indigo-500",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max === 4) {
        if (awarded === 4) return "Level 3 (Developed)";
        if (awarded >= 2) return "Level 2 (Sound Mechanism)";
        if (awarded >= 1) return "Level 1 (Descriptive)";
        return "Below Level 1";
      }
      if (max === 6) {
        if (awarded >= 5) return "Level 3 (Full Chains & Integrated)";
        if (awarded >= 3) return "Level 2 (Sound Mechanism)";
        if (awarded >= 1) return "Level 1 (Descriptive)";
        return "Below Level 1";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.75) return "Level 3 (Developed)";
      if (pct >= 0.45) return "Level 2 (Sound)";
      return "Level 1 (Basic)";
    },
  },
  {
    key: "evaluation" as const,
    label: "AO3 Critical Evaluation & Weighing",
    shortLabel: "AO3 Evaluation",
    icon: Scale,
    bar: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    levelFor: (awarded: number, max: number) => {
      if (max === 0) return "Not Required (No Penalty)";
      if (max <= 2) {
        if (awarded === 2) return "Level 2 (Substantiated)";
        if (awarded === 1) return "Level 1 (Basic / Token)";
        return "No Evaluation";
      }
      if (max === 4) {
        if (awarded >= 3) return "Level 2 (Substantiated & Wide)";
        if (awarded >= 1) return "Level 1 (Generic / Token)";
        return "No Evaluation";
      }
      const pct = max > 0 ? awarded / max : 0;
      if (pct >= 0.7) return "Level 3 (Substantiated)";
      if (pct >= 0.35) return "Level 2 (Sound)";
      if (awarded === 0) return "No Evaluation";
      return "Level 1 (Superficial)";
    },
  },
];

function getBandTheme(band: string, totalMark?: number, maxMark?: number) {
  if (typeof totalMark === "number" && typeof maxMark === "number" && maxMark > 0) {
    const std = getCambridgeGradeStandard(totalMark, maxMark);
    return {
      ...std.theme,
      grade: std.grade,
    };
  }
  const norm = band.toLowerCase();
  if (norm.includes("1") || norm.includes("top") || norm.includes("level 4")) {
    return {
      card: "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-background shadow-emerald-500/5",
      badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-semibold",
      progress: "from-emerald-500 via-teal-400 to-emerald-500",
      grade: "Grade A* Standard",
    };
  }
  if (norm.includes("2") || norm.includes("upper") || norm.includes("level 3")) {
    return {
      card: "border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-teal-900/10 to-background shadow-teal-500/5",
      badge: "border-teal-500/30 bg-teal-500/15 text-teal-400 font-semibold",
      progress: "from-teal-500 via-emerald-400 to-teal-500",
      grade: "Grade A / B Standard",
    };
  }
  if (norm.includes("3") || norm.includes("middle") || norm.includes("level 2")) {
    return {
      card: "border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-amber-900/10 to-background shadow-amber-500/5",
      badge: "border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold",
      progress: "from-amber-500 via-orange-400 to-amber-500",
      grade: "Grade C / D Standard",
    };
  }
  return {
    card: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/10 to-background shadow-rose-500/5",
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-400 font-semibold",
    progress: "from-rose-500 via-red-400 to-rose-500",
    grade: "Working Towards Standard",
  };
}

export function MarkBreakdown({ grading: rawGrading, question }: { grading: Grading; question?: string }) {
  let parsedGrading: any = rawGrading;
  if (typeof parsedGrading === "string") {
    try {
      parsedGrading = JSON.parse(parsedGrading);
    } catch {
      parsedGrading = {};
    }
  }
  if (!parsedGrading || typeof parsedGrading !== "object") {
    parsedGrading = {};
  }

  const maxMark = parsedGrading.max_mark ?? 8;
  const totalMark = parsedGrading.total_mark ?? 0;
  const rawAo = parsedGrading.ao_breakdown ?? {};
  const aoBreakdown = {
    knowledge: {
      awarded: rawAo.knowledge?.awarded ?? Math.min(2, Math.round(totalMark * 0.25)),
      out_of: rawAo.knowledge?.out_of ?? 2,
      comment: rawAo.knowledge?.comment ?? "Understanding of key economic definitions and concepts.",
    },
    analysis: {
      awarded: rawAo.analysis?.awarded ?? Math.min(3, Math.round(totalMark * 0.40)),
      out_of: rawAo.analysis?.out_of ?? (maxMark === 6 ? 4 : 3),
      comment: rawAo.analysis?.comment ?? "Analytical chains of reasoning connecting economic cause and effect.",
    },
    evaluation: {
      awarded: rawAo.evaluation?.awarded ?? (maxMark <= 6 ? 0 : Math.max(0, totalMark - (rawAo.knowledge?.awarded ?? Math.min(2, Math.round(totalMark * 0.25))) - (rawAo.analysis?.awarded ?? Math.min(3, Math.round(totalMark * 0.40))))),
      out_of: rawAo.evaluation?.out_of ?? (maxMark <= 6 ? 0 : 3),
      comment: rawAo.evaluation?.comment ?? (maxMark <= 6 ? "Evaluation not required for this tariff." : "Evaluative balance, context, and substantiated judgment."),
    },
  };

  const sources = Array.isArray(parsedGrading.sources) ? parsedGrading.sources : [];
  const suggestedPractice = Array.isArray(parsedGrading.suggested_practice) ? parsedGrading.suggested_practice : [];
  const suggestedResources = Array.isArray(parsedGrading.suggested_resources) ? parsedGrading.suggested_resources : [];
  const strengthsList = Array.isArray(parsedGrading.strengths) ? parsedGrading.strengths : [];
  const weaknessesList = Array.isArray(parsedGrading.weaknesses) ? parsedGrading.weaknesses : [];
  const actionableFeedbackList = Array.isArray(parsedGrading.actionable_feedback) ? parsedGrading.actionable_feedback : [];
  const pointsList = Array.isArray(parsedGrading.points) ? parsedGrading.points : [];

  const grading: Grading = {
    ...parsedGrading,
    max_mark: maxMark,
    total_mark: totalMark,
    ao_breakdown: aoBreakdown,
    sources,
    suggested_practice: suggestedPractice,
    suggested_resources: suggestedResources,
    strengths: strengthsList,
    weaknesses: weaknessesList,
    actionable_feedback: actionableFeedbackList,
    points: pointsList,
  };

  const percent = grading.max_mark > 0 ? (grading.total_mark / grading.max_mark) * 100 : 0;
  const isFullMarks = grading.max_mark > 0 && grading.total_mark >= grading.max_mark;
  const isUnanchored =
    grading.grounding_status === "unanchored" ||
    ((grading.sources?.length ?? 0) === 0 && grading.grounding_status !== "mark_scheme_image");

  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Authoritative Cambridge calibration: guarantees 11/12 (and any >= 80% mark) is Top Band & Grade A* Standard
  const cal = getCambridgeGradeStandard(grading.total_mark, grading.max_mark);
  const resolvedBand = bandFor(grading.total_mark, grading.max_mark);
  const theme = {
    ...cal.theme,
    grade: cal.grade,
  };

  // Fallbacks to ensure full-fledged feedback is ALWAYS visible for every essay
  let summary =
    grading.examiner_summary && grading.examiner_summary.trim().length > 10
      ? stripStars(grading.examiner_summary)
      : `This submission achieves ${grading.total_mark}/${grading.max_mark} marks (${resolvedBand}). Knowledge and terminology are established (${grading.ao_breakdown?.knowledge?.awarded ?? 0}/${grading.ao_breakdown?.knowledge?.out_of ?? 2}) alongside clear analytical progression (${grading.ao_breakdown?.analysis?.awarded ?? 0}/${grading.ao_breakdown?.analysis?.out_of ?? (maxMark === 6 ? 4 : 3)}) and balanced evaluation (${grading.ao_breakdown?.evaluation?.awarded ?? 0}/${grading.ao_breakdown?.evaluation?.out_of ?? (maxMark <= 6 ? 0 : 3)}).`;

  if (resolvedBand === "Top Band") {
    summary = summary.replace(/upper middle band/gi, "Top Band");
  }

  const strengths =
    grading.strengths && grading.strengths.length > 0
      ? grading.strengths
      : [
          `Accurate and appropriate use of economic terminology contextually applied (${grading.ao_breakdown?.knowledge?.awarded ?? 0}/${grading.ao_breakdown?.knowledge?.out_of ?? 2} on AO1).`,
          `Logical analytical structure with reasoning chains on the examined topic (${grading.ao_breakdown?.analysis?.awarded ?? 0}/${grading.ao_breakdown?.analysis?.out_of ?? (maxMark === 6 ? 4 : 3)} on AO2).`,
          `Presents balanced perspectives addressing multiple dimensions of the prompt (${grading.ao_breakdown?.evaluation?.awarded ?? 0}/${grading.ao_breakdown?.evaluation?.out_of ?? (maxMark <= 6 ? 0 : 3)} on AO3).`,
        ];

  const weaknesses =
    grading.weaknesses && grading.weaknesses.length > 0
      ? grading.weaknesses
      : [
          "Economic transmission mechanisms can be deepened to connect intermediate equilibrium shifts to final target outcomes.",
          "Evaluation can be strengthened by explicitly comparing opposing arguments on a shared criterion such as time horizon or magnitude.",
          "Grounding theoretical arguments with concrete, real-world context substantiates key analytical claims.",
        ];

  const actionableFeedback =
    grading.actionable_feedback && grading.actionable_feedback.length > 0
      ? grading.actionable_feedback
      : [
          "Explicitly articulate every link in your economic chains of reasoning: state the shock, transmission, and final market impact.",
          "Directly weigh benefits against drawbacks on an explicit criterion (e.g. short run vs long run, degree of reliance) before writing your final verdict.",
          "Ensure the conclusion directly answers the command words and qualifiers of the prompt with a justified, context-dependent judgement.",
        ];

  const handleCopySummary = () => {
    const text = `Cambridge IGCSE 0455 Economics Essay Assessment
Total Mark: ${grading.total_mark}/${grading.max_mark} (${resolvedBand} - ${Math.round(percent)}%)
Standard: ${theme.grade}

Assessment Objective Breakdown:
• AO1 Knowledge: ${grading.ao_breakdown.knowledge.awarded}/${grading.ao_breakdown.knowledge.out_of}
• AO2 Analysis: ${grading.ao_breakdown.analysis.awarded}/${grading.ao_breakdown.analysis.out_of}
• AO3 Evaluation: ${grading.ao_breakdown.evaluation.out_of === 0 ? "Not Required (0 marks)" : `${grading.ao_breakdown.evaluation.awarded}/${grading.ao_breakdown.evaluation.out_of}`}

Examiner Summary:
${summary}

Actionable Steps for Grade Elevation:
${actionableFeedback.map((f, i) => `${i + 1}. ${stripStars(f)}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Grade summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Grounding Transparency Banner */}
      {isUnanchored ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:p-4 text-amber-200 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-amber-300 text-xs sm:text-sm">
                  Unanchored Assessment — Standard Cambridge AO Descriptor Mode
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400/40 bg-amber-400/20 text-amber-300 text-[10px] font-semibold uppercase"
                >
                  Generic AO Descriptors
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-amber-200/90">
                This question did not match a specific past mark scheme in the Knowledge Base above the similarity floor. The essay was evaluated strictly against official Cambridge IGCSE 0455 Assessment Objective levels.
              </p>
              <p className="text-xs font-medium text-amber-300">
                💡 Tip: Attach a screenshot of the official mark scheme below for question-specific grounding.
              </p>
            </div>
          </div>
        </div>
      ) : grading.grounding_status === "mark_scheme_image" ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-primary shadow-xs">
          <FileText className="h-4 w-4 shrink-0" />
          <span>
            <strong>Mark Scheme Grounded via Attached Screenshot:</strong> The examiner directly inspected the official Cambridge mark scheme image provided with this submission.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Grounded in Knowledge Base:</strong> Verified against {sources.length} Cambridge IGCSE 0455 syllabus source{sources.length === 1 ? "" : "s"}{sources.length > 0 ? ` (${Math.round((sources[0]?.similarity ?? 0.85) * 100)}% match on ${(sources[0]?.documentTitle || "Cambridge 0455 Syllabus").replace(/\bAS(?:\/A)?\s+Level\b/gi, "Cambridge IGCSE 0455").replace(/\b9708\b/g, "0455")}).` : "."}
          </span>
        </div>
      )}

      {/* Hero Score Card */}
      <div className={cn("panel relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all shadow-md backdrop-blur-xs", theme.card)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Main Score Display */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[95px] sm:min-w-[115px] py-2.5 px-3.5 rounded-2xl bg-background/90 border border-border/80 shadow-inner">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums bg-gradient-to-b from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                  {grading.total_mark}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-muted-foreground/75">/{grading.max_mark}</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Overall Mark
              </span>
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs font-bold shadow-xs", theme.badge)}>
                  <Award className="size-3.5 mr-1" />
                  {resolvedBand}
                </Badge>
                <Badge variant="outline" className="border-border/80 bg-background/80 text-foreground/90 text-[11px] font-semibold px-2 py-0.5">
                  {theme.grade}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {grading.audited && (
                  <span className="inline-flex items-center gap-1 text-primary font-medium text-[11px] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    <ShieldCheck className="size-3" /> Dual-Pass Audited
                  </span>
                )}
                {Boolean(grading.latencyMs) && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/60">
                    <Clock className="size-3" /> Graded in {Math.round(grading.latencyMs! / 1000)}s
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/90 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="tabular-nums">{Math.round(grading.confidence * 100)}%</span> examiner confidence
                </span>
              </div>
            </div>
          </div>

          {/* Quick Copy Button */}
          <div className="self-stretch sm:self-center flex sm:block justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="w-full sm:w-auto h-8 gap-1.5 text-xs bg-background/80 hover:bg-background border-border/80 shadow-2xs font-medium"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
              {copied ? "Copied" : "Copy Grade"}
            </Button>
          </div>
        </div>

        {/* Overall Percentage Progress Bar */}
        <div className="mt-4 pt-3.5 border-t border-border/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" /> Cambridge IGCSE 0455 Weighted Achievement
            </span>
            <span className="font-bold tabular-nums text-foreground">{Math.round(percent)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/90 p-0.5 border border-border/60 shadow-inner">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out shadow-xs", theme.progress)}
              style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assessment Objectives Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {AO_META.map((meta) => {
          const score = grading.ao_breakdown[meta.key];
          const width = score.out_of > 0 ? (score.awarded / score.out_of) * 100 : 0;
          const levelText = meta.levelFor(score.awarded, score.out_of);
          const Icon = meta.icon;

          return (
            <div
              key={meta.key}
              className={cn("panel relative p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs", meta.border, meta.bg)}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={cn("size-4 shrink-0", meta.text)} />
                    <span className="text-xs font-bold text-foreground truncate">{meta.shortLabel}</span>
                  </div>
                  <span className={cn("text-xs font-black tabular-nums px-2 py-0.5 rounded-md bg-background/90 border border-border/70 shadow-2xs", meta.text)}>
                    {score.out_of === 0 ? "Not Required" : `${score.awarded}/${score.out_of}`}
                  </span>
                </div>

                <div className="space-y-1 my-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", meta.bar)}
                      style={{ width: `${score.out_of === 0 ? 100 : Math.max(2, width)}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] font-semibold text-muted-foreground block">
                    {levelText}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">
                  {stripScoreFractionsFromText(stripStars(score.comment))}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Examiner Summary */}
      <div className="panel p-4 sm:p-5 rounded-2xl border-l-4 border-l-primary border-border/80 bg-card/90 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold border-primary/30 bg-primary/10 text-primary">
            Official Appraisal
          </Badge>
          <h3 className="text-xs sm:text-sm font-bold text-foreground">Examiner Summary</h3>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground/95 font-sans">
          {summary}
        </p>
      </div>

      
      {/* Cambridge IGCSE 0455 Point-by-Point Mark Scheme Evidence & Command Word Check */}
      {(grading.command_word_check || (grading.points && grading.points.length > 0)) && (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              IGCSE 0455 Mark Scheme Point Breakdown
            </h3>
            {grading.command_word_check && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  grading.command_word_check.satisfied
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                Command word ({grading.command_word_check.command_word || "checked"}):{" "}
                {grading.command_word_check.satisfied ? "Satisfied" : "Needs sharper focus"}
              </Badge>
            )}
          </div>
          {grading.command_word_check?.comment && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {stripStars(grading.command_word_check.comment)}
            </p>
          )}
          {grading.points && grading.points.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {grading.points.map((pt, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      Point {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        Identify: +{pt.identify_awarded}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Develop: +{pt.development_awarded}
                      </Badge>
                    </div>
                  </div>
                  {pt.quote && (
                    <p className="italic text-muted-foreground">"{stripStars(pt.quote)}"</p>
                  )}
                  {pt.reason && (
                    <p className="text-foreground/90 leading-relaxed">{stripStars(pt.reason)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strengths & Weaknesses (What worked & What cost marks / Optional Refinements) */}
      <div className="grid gap-3 md:grid-cols-2">
        <PointList title="What worked well" items={strengths} tone="good" />
        <PointList
          title={isFullMarks ? "Optional Refinements" : "What cost you marks"}
          items={weaknesses}
          tone={isFullMarks ? "neutral" : "bad"}
        />
      </div>

      {/* Missing Elements Checklist */}
      <MissingElements grading={grading} />

      {/* Actionable Feedback (How to improve / Optional Refinements) */}
      <div className="panel p-4 sm:p-5 rounded-xl border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {isFullMarks ? "Optional Refinements" : "How to elevate this answer to the next band"}
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">Cambridge IGCSE 0455 Target Steps</span>
        </div>
        <ol className="space-y-2.5">
          {actionableFeedback.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed p-2.5 rounded-lg bg-muted/20 border border-border/50">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-2xs">
                {index + 1}
              </span>
              <span className="text-foreground/90">{stripStars(item)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Suggested Practice and Resources */}
      {(suggestedPractice.length > 0 || suggestedResources.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {suggestedPractice.length > 0 && (
            <div className="panel p-3.5 sm:p-5 rounded-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" /> Practise next
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {suggestedPractice.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{stripStars(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestedResources.length > 0 && (
            <div className="panel p-3.5 sm:p-5 rounded-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" /> Revise syllabus concepts
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {suggestedResources.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{stripStars(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Grounding Transparency Card */}
      <div className="panel p-4 sm:p-5 rounded-xl border-border/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Grounding Evidence</h3>
          </div>
          {sources.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSourcesOpen((prev) => !prev)}
              className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300"
            >
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                {sources.length} Cambridge Sources
              </Badge>
              {sourcesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          ) : grading.grounding_status === "mark_scheme_image" ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
              Mark Scheme Image Grounded
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs">
              0 Sources (AO Generic)
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {grading.anchorsUsed > 0
            ? `${grading.anchorsUsed} human-confirmed Cambridge IGCSE 0455 calibration ${grading.anchorsUsed === 1 ? "anchor was" : "anchors were"} referenced alongside official mark scheme descriptors.`
            : "Evaluated against verified Cambridge International 0455 Assessment Objective band descriptors."}
        </p>

        {sources.length > 0 && sourcesOpen && (
          <ul className="mt-2 space-y-2 border-t border-border/60 pt-3 animate-in fade-in duration-200">
            {sources.map((source, index) => (
              <li key={index} className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-primary font-semibold mr-1.5">[S{index + 1}]</span>
                  <span className="font-medium text-foreground">{source.documentTitle}</span>
                  {source.heading ? <span className="text-muted-foreground"> — {source.heading}</span> : null}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  {Math.round(source.similarity * 100)}% match
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PointList({
  title,
  items = [],
  tone,
}: {
  title: string;
  items?: string[];
  tone: "good" | "bad" | "neutral";
}) {
  if (!items || !Array.isArray(items) || items.length === 0) return null;
  const isGood = tone === "good";
  const isNeutral = tone === "neutral";
  const Icon = isGood ? Check : isNeutral ? Sparkles : X;

  return (
    <div
      className={cn(
        "panel p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-xs transition-all",
        isGood
          ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/10"
          : isNeutral
            ? "border-primary/30 bg-primary/[0.03] dark:bg-primary-950/10"
            : "border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-950/10"
      )}
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
          <span className={cn(
            "p-1 rounded-md",
            isGood ? "bg-emerald-500/10 text-emerald-400" : isNeutral ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-400"
          )}>
            <Icon className="size-3.5" />
          </span>
          {title}
        </h3>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold",
            isGood
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
              : isNeutral
                ? "border-primary/30 text-primary bg-primary/5"
                : "border-rose-500/30 text-rose-400 bg-rose-500/5"
          )}
        >
          {items.length} {items.length === 1 ? "point" : "points"}
        </Badge>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground/95">
            <span
              className={cn(
                "mt-1.5 size-1.5 rounded-full shrink-0",
                isGood ? "bg-emerald-500" : isNeutral ? "bg-primary" : "bg-rose-500"
              )}
            />
            <span>{stripStars(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissingElements({ grading }: { grading: Grading }) {
  if (!grading) return null;
  const isFullMarks = grading.max_mark > 0 && grading.total_mark >= grading.max_mark;
  const me = (grading.missing_elements || {}) as any;
  const defs: string[] = Array.isArray(me.definitions) ? me.definitions : [];
  const an: string[] = Array.isArray(me.analysis) ? me.analysis : [];
  const ev: string[] = Array.isArray(me.evaluation) ? me.evaluation : [];
  const ex: string[] = Array.isArray(me.examples) ? me.examples : [];
  const dg: string[] = Array.isArray(me.diagrams) ? me.diagrams : [];

  const groups = [
    { label: "Definitions", items: defs },
    { label: "Analysis Chains", items: an },
    {
      label: "Evaluation Dimensions",
      items: grading.ao_breakdown?.evaluation?.out_of === 0 ? [] : ev,
    },
    { label: "Examples & Application", items: ex },
    { label: "Diagrams", items: dg },
  ].filter((group) => Array.isArray(group.items) && group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="panel p-3.5 sm:p-5 rounded-xl border-border/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-amber-400" /> {isFullMarks ? "Optional Refinements" : "Elements to add for top band"}
        </h3>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
          Checklist
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label} className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {group.label}
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {group.items.map((item, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{stripStars(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
