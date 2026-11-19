import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Info, Loader2, RotateCw, Sparkles, Terminal, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProgressStage = {
  label: string;
  /** Roughly how long this stage takes relative to the others — weights, not seconds. */
  weight: number;
  shortTitle?: string;
  backendDetails?: string[];
};

const DEFAULT_STAGE_DETAILS: Record<number, { title: string; bullets: string[] }> = {
  0: {
    title: "Cambridge IGCSE 0455 Knowledge Base & Vector Retrieval",
    bullets: [
      "Vector Embeddings: Executing cosine similarity search against official Cambridge mark schemes, coursebooks, and examiner reports in Supabase pgvector.",
      "Syllabus Grounding: Retrieving specific AS/IGCSE 0455 0455 learning objectives and syllabus criteria corresponding to the essay prompt.",
      "Relevance Pre-flight: Verifying question alignment (unrelated essays receive zero marks with no grace marks).",
    ],
  },
  1: {
    title: "Dual-Examiner Parallel Evaluation (Pass 1 Error Audit & Pass 2 Holistic)",
    bullets: [
      "Examiner Pass 1 (Temp 0.0): Rigorous analytical check of economic transmission mechanisms, curve shifts, and key-term definitions.",
      "Examiner Pass 2 (Temp 0.2): Holistic Cambridge assessment of overall argument quality, positive marking, and level descriptors.",
      "Diagram Policy: Full credit for developed written analysis without diagrams; positive credit for diagram integration.",
    ],
  },
  2: {
    title: "AO2 Real-World Application & Theoretical Models",
    bullets: [
      "Real-World Application: Crediting detailed, context-specific applications (e.g. named markets or concrete empirical examples).",
      "Guiding Theoretical Models: Evaluating theoretical demonstrations that provide a good show of the mechanism rather than empty one-liners.",
      "Filtering Superficial References: Rejecting weak, passing one-liners that lack economic explanation.",
    ],
  },
  3: {
    title: "AO3 Multi-Perspective Evaluation & Policy Trade-offs",
    bullets: [
      "Multi-Perspective Weighing: Testing short-run vs long-run impacts, conflicting stakeholder outcomes, and elasticity conditions.",
      "Policy Trade-offs & Opportunity Costs: Comparing the policy against alternatives on stated criteria without artificial numeric caps.",
      "Synthesis: Ensuring conclusions directly address the prompt's command directive.",
    ],
  },
  4: {
    title: "Principal Examiner Synthesis & Diagnostic Report",
    bullets: [
      "Authoritative Concluding Pass: Reconciling dual-examiner findings and evidence density into final AO marks.",
      "Actionable Rewrite Steps: Producing clear, constructive, human examiner recommendations to elevate the grade.",
      "Diagnostic Breakdown: Finalizing comprehensive summary and verified Cambridge band classification.",
    ],
  },
};

const LIVE_BACKEND_OPERATIONS = [
  { atSec: 0, title: "Query Ingestion & Vector Retrieval", detail: "Querying Supabase pgvector across official 0455 mark schemes and coursebooks..." },
  { atSec: 3, title: "Syllabus Grounding & Level Descriptors", detail: "Grounding criteria against official Cambridge level descriptors and past exam benchmarks..." },
  { atSec: 7, title: "Dual Examiner Execution (Pass 1 & Pass 2)", detail: "Simultaneously running Pass 1 (0.0 error audit) and Pass 2 (0.2 holistic Cambridge assessment)..." },
  { atSec: 12, title: "AO1 Knowledge & Relevance Verification", detail: "Verifying precision of economic terms and checking topical relevance (unrelated essays receive 0)..." },
  { atSec: 16, title: "AO2 Analytical Transmission & Application Audit", detail: "Tracing causal chains; rewarding detailed real-world applications and rejecting weak one-liners..." },
  { atSec: 20, title: "AO3 Multi-Perspective Evaluation Weighing", detail: "Testing short-run vs long-run trade-offs, stakeholder impacts, and justified conclusions without caps..." },
  { atSec: 24, title: "Principal Examiner Synthesis & Report Assembly", detail: "Concluding dual-examiner findings into authoritative marks, diagnostic feedback, and rewrite steps..." },
];

/**
 * Simulates staged progress calibrated to optimized dual-examiner completion speeds (~22–28s).
 * Holds at 96% until the network request completes so it is never prematurely "done".
 */
export function useStagedProgress(stages: ProgressStage[], active: boolean, totalMs = 25_000) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(interval);
  }, [active]);

  const totalWeight = useMemo(() => stages.reduce((sum, s) => sum + s.weight, 0), [stages]);

  // Calibrated to real 22–28s dual-examiner completion speeds.
  // Smooth asymptotic ease curve that moves responsively, reaching ~94-96% around 23-25s,
  // and safely holds at 96% until the real network response completes.
  const t = elapsed / totalMs;
  const eased = 1 - Math.exp(-2.8 * t);
  const percent = Math.min(96, Math.max(4, Math.round(eased * 102)));

  let cursor = 0;
  let stageIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    cursor += stages[i]!.weight;
    if (percent < (cursor / totalWeight) * 96 || i === stages.length - 1) {
      stageIndex = i;
      break;
    }
  }

  const elapsedSeconds = Math.floor(elapsed / 1000);

  return { percent, stageIndex, elapsedSeconds };
}

export function GradingProgress({
  stages,
  active,
  totalMs = 25_000,
}: {
  stages: ProgressStage[];
  active: boolean;
  totalMs?: number;
}) {
  const { percent, stageIndex, elapsedSeconds } = useStagedProgress(stages, active, totalMs);
  const [inspectedStageIndex, setInspectedStageIndex] = useState<number | null>(null);

  if (!active) return null;

  const currentInspectorIndex = inspectedStageIndex ?? stageIndex;
  const currentInspectorStage = stages[currentInspectorIndex];
  const inspectorDetails = currentInspectorStage?.backendDetails
    ? {
        title: currentInspectorStage.shortTitle || currentInspectorStage.label,
        bullets: currentInspectorStage.backendDetails,
      }
    : DEFAULT_STAGE_DETAILS[currentInspectorIndex] ?? {
        title: currentInspectorStage?.label || "Backend Processing",
        bullets: [
          "Processing Cambridge IGCSE 0455 evaluation pipeline.",
          "Grounding student response with verified mark scheme criteria.",
          "Synthesizing structured examiner feedback and band marks.",
        ],
      };

  // Find the active live backend operation based on elapsed seconds
  const activeLiveOpIndex = LIVE_BACKEND_OPERATIONS.reduce((acc, op, idx) => {
    return elapsedSeconds >= op.atSec ? idx : acc;
  }, 0);
  const currentLiveOp = LIVE_BACKEND_OPERATIONS[activeLiveOpIndex]!;

  return (
    <div className="panel relative overflow-hidden space-y-4 p-5 sm:p-6 border-primary/20 shadow-md">
      {/* Top Status & Timer Row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground truncate">
            {stages[stageIndex]?.label ?? "Referring knowledge base & evaluating…"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary shadow-xs">
            <Clock className="size-3 text-primary shrink-0" />
            <span>Est: ~22–28s</span>
          </span>

          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
            {percent}%
          </span>
          <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-muted-foreground tabular-nums font-mono">
            {elapsedSeconds}s elapsed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground px-0.5">
          <span>Stage {stageIndex + 1} of {stages.length} in progress</span>
          <span>Click any stage below to inspect evaluation criteria</span>
        </div>
      </div>

      {/* Real-time Dynamic Backend Operations Stream */}
      <div className="rounded-xl border border-primary/20 bg-muted/30 p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="size-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground text-xs">Cambridge Examination Engine</span>
          </div>
          <span className="text-[10px] text-emerald-500 font-mono font-medium flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Dual-Pass Active
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-start gap-2">
            <Loader2 className="size-3.5 text-primary shrink-0 animate-spin mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground text-xs">{currentLiveOp.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">{currentLiveOp.detail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Extended evaluation notice */}
      {elapsedSeconds >= 35 && (
        <div className="flex items-center gap-2 text-[11.5px] text-primary font-medium bg-primary/10 border border-primary/20 rounded-md px-3 py-2 animate-in fade-in duration-300">
          <RotateCw className="size-3.5 shrink-0 animate-spin" />
          <span>Thorough Assessment In Progress: Principal examiner reconciling dual-pass evidence and synthesizing diagnostic report...</span>
        </div>
      )}

      {/* Interactive Stage Grid */}
      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        {stages.map((stage, index) => {
          const isInspected = currentInspectorIndex === index;
          const isDone = index < stageIndex;
          const isCurrent = index === stageIndex;

          return (
            <button
              key={stage.label}
              type="button"
              onClick={() => setInspectedStageIndex(index)}
              className={cn(
                "group flex items-center justify-between gap-2.5 rounded-lg border p-2.5 text-xs text-left transition-all duration-200 cursor-pointer select-none",
                isInspected
                  ? "ring-2 ring-primary/40 border-primary bg-primary/[0.08] shadow-sm"
                  : isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 text-foreground hover:border-emerald-500/60"
                    : isCurrent
                      ? "border-primary/40 bg-primary/5 text-foreground font-medium shadow-sm hover:border-primary"
                      : "border-border/60 bg-muted/20 text-muted-foreground opacity-70 hover:opacity-100 hover:border-border",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isDone ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border/80" />
                )}
                <span className="truncate">{stage.label}</span>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/80 group-hover:text-primary transition-colors">
                {isInspected ? "Active View" : "Click to view"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Backend Explanation Panel */}
      {inspectorDetails && (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="size-3.5 text-primary shrink-0" />
              <h4 className="text-xs font-bold text-foreground truncate">
                Backend Operations: {inspectorDetails.title}
              </h4>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              currentInspectorIndex < stageIndex
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : currentInspectorIndex === stageIndex
                  ? "bg-primary/10 text-primary border-primary/30 animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
            )}>
              {currentInspectorIndex < stageIndex
                ? "Completed in Backend"
                : currentInspectorIndex === stageIndex
                  ? "Running Now"
                  : "Queued in Pipeline"}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {inspectorDetails.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grounding & Guarantee Footer */}
      <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
        <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-xs">
            Free Community Access · Deep Cambridge IGCSE 0455 Grounding Guarantee
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Estimated completion time: <strong>22–28 seconds</strong>. Dual-examiner parallel execution evaluates the script across theoretical precision, real-world application, and multi-perspective evaluation grounded in official Cambridge IGCSE 0455 mark schemes.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable responsive staged progress bar for async AI, OCR, parsing, and
 * grading waits across the application. Backed by `useStagedProgress` so every
 * screen eases smoothly toward completion without getting stuck at 100%.
 */
export function CompactProgressBar({
  active,
  stages,
  totalMs = 20_000,
  title,
  subtitle,
  estimatedTimeLabel,
  statusBadge,
  showStages = false,
  className,
}: {
  active: boolean;
  stages: ProgressStage[];
  totalMs?: number;
  title?: string;
  subtitle?: string;
  estimatedTimeLabel?: string;
  statusBadge?: string;
  showStages?: boolean;
  className?: string;
}) {
  const { percent, stageIndex, elapsedSeconds } = useStagedProgress(stages, active, totalMs);

  if (!active || stages.length === 0) return null;

  const currentStage = stages[stageIndex] ?? stages[stages.length - 1];
  const roundedPercent = Math.round(percent);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-xl border border-primary/25 bg-card/95 p-3.5 sm:p-4 shadow-sm space-y-2.5 animate-in fade-in duration-200",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {title ?? currentStage?.label ?? "Working…"}
          </span>
          {statusBadge ? (
            <span className="hidden xs:inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {statusBadge}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
          {estimatedTimeLabel ? (
            <span className="hidden sm:inline text-muted-foreground">{estimatedTimeLabel}</span>
          ) : null}
          <span className="text-muted-foreground tabular-nums">{elapsedSeconds}s</span>
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-bold text-primary tabular-nums">
            {roundedPercent}%
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercent}
        className="h-2 w-full overflow-hidden rounded-full bg-primary/15"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
        <span className="min-w-0 flex-1 leading-snug">
          {subtitle ?? (title ? currentStage?.label : `Step ${stageIndex + 1} of ${stages.length}`)}
        </span>
        {stages.length > 1 ? (
          <span className="shrink-0 font-mono text-[10px]">
            Stage {stageIndex + 1}/{stages.length}
          </span>
        ) : null}
      </div>

      {showStages && stages.length > 1 ? (
        <div className="grid gap-1.5 sm:grid-cols-2 pt-1">
          {stages.map((stage, index) => {
            const isDone = index < stageIndex;
            const isCurrent = index === stageIndex;
            return (
              <div
                key={stage.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors",
                  isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                    : isCurrent
                      ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                      : "border-border/60 bg-muted/20 text-muted-foreground opacity-75",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border border-border/80" />
                )}
                <span className="truncate">{stage.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
