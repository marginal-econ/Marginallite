import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "@/lib/examiner/config";
import type { ScoreEstimate } from "@/lib/live-examiner/types";
import { stripStars } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

export type ScoreWidgetProps = {
  scoreEstimate: ScoreEstimate | null;
  wordCount: number;
  maxMark: number;
  checking?: boolean;
  status?: "provisional" | "verified" | "uncertain" | "complete";
  markRange?: [number, number];
  className?: string;
};

const WORD_TARGETS: Record<number, { min: number; target: number; label: string }> = {
  8: { min: 150, target: 250, label: "~200-300 words" },
  12: { min: 250, target: 450, label: "~400-550 words" },
  20: { min: 500, target: 800, label: "~750-1000 words" },
};

export function ScoreWidget({
  scoreEstimate,
  wordCount,
  maxMark,
  checking = false,
  status = "provisional",
  markRange,
  className,
}: ScoreWidgetProps) {
  const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
  const split = TARIFF_SPLITS[validTariff] || defaultSplitForMaxMark(validTariff);

  const [deltaChip, setDeltaChip] = useState<string | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  // Smooth delta animation
  useEffect(() => {
    if (!scoreEstimate) return;
    if (prevScore !== null && scoreEstimate.total > prevScore) {
      const diff = scoreEstimate.total - prevScore;
      setDeltaChip(`+${diff} mark${diff > 1 ? "s" : ""}`);
      const t = setTimeout(() => setDeltaChip(null), 2500);
      return () => clearTimeout(t);
    }
    setPrevScore(scoreEstimate.total);
  }, [scoreEstimate?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = scoreEstimate ? Math.min(validTariff, Math.max(0, scoreEstimate.total)) : 0;
  const ao1 = scoreEstimate ? Math.min(split.ao1_marks, Math.max(0, scoreEstimate.aoBreakdown.ao1)) : 0;
  const ao2 = scoreEstimate ? Math.min(split.ao2_marks, Math.max(0, scoreEstimate.aoBreakdown.ao2)) : 0;
  const ao3 = scoreEstimate ? Math.min(split.ao3_marks, Math.max(0, scoreEstimate.aoBreakdown.ao3)) : 0;

  const band = stripStars(scoreEstimate?.band || "No answer written yet");
  const targetInfo = WORD_TARGETS[validTariff] || { min: 200, target: 400, label: "~350 words" };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/90 p-5 shadow-lg backdrop-blur-md transition-all duration-200",
        className,
      )}
    >
      {/* Header & Big Score Display */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Running Mark
            </span>
            {status === "verified" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                <CheckCircle2 className="size-2.5" /> Verified
              </Badge>
            ) : status === "uncertain" ? (
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-semibold gap-1">
                <HelpCircle className="size-2.5" /> Early Draft
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1">
                <Clock className="size-2.5" /> Provisional
              </Badge>
            )}
            {checking && (
              <span className="size-2 animate-ping rounded-full bg-primary" title="AI verifying in background" />
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-black text-foreground">
              {total}
              <span className="text-xl font-normal text-muted-foreground"> / {validTariff}</span>
            </span>

            {deltaChip && (
              <Badge className="animate-in fade-in zoom-in-95 bg-emerald-500 text-white font-mono text-xs">
                {deltaChip}
              </Badge>
            )}

            {markRange && markRange[0] !== markRange[1] && (
              <span className="text-xs font-mono text-muted-foreground">
                (Range: {markRange[0]}–{markRange[1]})
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{band}</p>
        </div>

        {/* Word Count Indicator */}
        <div className="text-right">
          <span className="text-xs font-semibold text-foreground font-mono">
            {wordCount}{" "}
            <span className="text-[10px] font-normal text-muted-foreground">words</span>
          </span>
          <p className="text-[10px] text-muted-foreground">{targetInfo.label}</p>
        </div>
      </div>

      {/* AO Breakdown Meters */}
      <div className="mt-5 space-y-3">
        {/* AO1 Knowledge */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-ao1">AO1 Knowledge &amp; Definitions</span>
            <span className="font-mono text-muted-foreground">
              {ao1} / {split.ao1_marks}
            </span>
          </div>
          <Progress
            value={split.ao1_marks > 0 ? (ao1 / split.ao1_marks) * 100 : 100}
            className="h-2 bg-ao1/15"
          />
        </div>

        {/* AO2 Analysis */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-ao2">AO2 Causal Analysis &amp; Application</span>
            <span className="font-mono text-muted-foreground">
              {ao2} / {split.ao2_marks}
            </span>
          </div>
          <Progress
            value={split.ao2_marks > 0 ? (ao2 / split.ao2_marks) * 100 : 100}
            className="h-2 bg-ao2/15"
          />
        </div>

        {/* AO3 Evaluation */}
        {split.ao3_marks > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-ao3">AO3 Evaluation &amp; Judgement</span>
              <span className="font-mono text-muted-foreground">
                {ao3} / {split.ao3_marks}
              </span>
            </div>
            <Progress
              value={(ao3 / split.ao3_marks) * 100}
              className="h-2 bg-ao3/15"
            />
          </div>
        )}
      </div>
    </div>
  );
}
