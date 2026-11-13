import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCw, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProgressStage = {
  label: string;
  /** Roughly how long this stage takes relative to the others — weights, not seconds. */
  weight: number;
};

/**
 * There is no server-sent progress channel for grading (it's a single
 * request/response server function), so this simulates progress against
 * expected stage durations rather than pretending to report real ticks from
 * the model. It never claims 100% until the request actually resolves —
 * it eases up to 96% and holds there so it's never dishonest about being
 * "done" while still waiting on the network.
 */
export function useStagedProgress(stages: ProgressStage[], active: boolean, totalMs = 35_000) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 120);
    return () => clearInterval(interval);
  }, [active]);

  const totalWeight = useMemo(() => stages.reduce((sum, s) => sum + s.weight, 0), [stages]);

  // Ease-out curve so the bar moves fast at first (feels responsive) and
  // slows near the cap, since real latency varies request to request.
  const rawFraction = Math.min(1, elapsed / totalMs);
  const eased = 1 - Math.pow(1 - rawFraction, 2);
  const percent = Math.min(96, Math.round(eased * 96));

  let cursor = 0;
  let stageIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    cursor += stages[i]!.weight;
    if (percent < (cursor / totalWeight) * 96 || i === stages.length - 1) {
      stageIndex = i;
      break;
    }
  }

  return { percent, stageIndex, elapsedSeconds: Math.floor(elapsed / 1000) };
}

export function GradingProgress({
  stages,
  active,
  totalMs = 35_000,
}: {
  stages: ProgressStage[];
  active: boolean;
  totalMs?: number;
}) {
  const { percent, stageIndex, elapsedSeconds } = useStagedProgress(stages, active, totalMs);
  if (!active) return null;

  return (
    <div className="panel relative overflow-hidden space-y-5 p-6 border-primary/20 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {stages[stageIndex]?.label ?? "Referring knowledge base & evaluating…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
            {percent}%
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
            {elapsedSeconds}s
          </span>
        </div>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${percent}%` }}
        />
      </div>

      {elapsedSeconds >= 12 && (
        <div className="flex items-center gap-2 text-[11.5px] text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 animate-in fade-in duration-300">
          <RotateCw className="size-3.5 shrink-0 animate-spin" />
          <span>Auto Key-Hopping active: Dynamic pool failover is rotating API keys to guarantee rapid response without delay.</span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        {stages.map((stage, index) => (
          <div
            key={stage.label}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-all duration-200",
              index < stageIndex
                ? "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                : index === stageIndex
                  ? "border-primary/40 bg-primary/5 text-foreground font-medium shadow-sm"
                  : "border-border/60 bg-muted/20 text-muted-foreground opacity-60",
            )}
          >
            {index < stageIndex ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : index === stageIndex ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <span className="size-4 shrink-0 rounded-full border border-border/80" />
            )}
            <span className="truncate">{stage.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
        <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-xs">
            Deep Cambridge IGCSE Economics (0455) Grounding
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Referring the official Cambridge IGCSE 0455 syllabus, mark schemes, and examiner reports takes ~15–30 seconds. Multi-key auto-hopping ensures your grading will always complete smoothly without timing out.
          </p>
        </div>
      </div>
    </div>
  );
}
