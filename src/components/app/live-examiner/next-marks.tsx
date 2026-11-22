import { ArrowRight, Lightbulb, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NextMove, ScoreMaximizerOpportunity } from "@/lib/live-examiner/types";
import { stripStars } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

export type NextMarksProps = {
  nextMoves: NextMove[];
  opportunities?: ScoreMaximizerOpportunity[];
  strengths?: string[];
  areasForImprovement?: string[];
  onSelectMove?: (move: NextMove) => void;
  onOpenMaximizer?: () => void;
  maximizerLoading?: boolean;
  className?: string;
};

const AO_THEME = {
  ao1: {
    badge: "border-ao1/40 bg-ao1/15 text-ao1",
    label: "AO1 Knowledge",
  },
  ao2: {
    badge: "border-ao2/40 bg-ao2/15 text-ao2",
    label: "AO2 Analysis",
  },
  ao3: {
    badge: "border-ao3/40 bg-ao3/15 text-ao3",
    label: "AO3 Evaluation",
  },
  no_credit: {
    badge: "border-muted-foreground/40 bg-muted/20 text-muted-foreground",
    label: "Relevance",
  },
};

const PRIORITY_THEME = {
  critical: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function NextMarks({
  nextMoves,
  opportunities = [],
  strengths = [],
  areasForImprovement = [],
  onSelectMove,
  onOpenMaximizer,
  maximizerLoading,
  className,
}: NextMarksProps) {
  // Use rich opportunities if provided, else fall back to nextMoves
  const hasOpportunities = opportunities.length > 0;
  const hasMoves = nextMoves.length > 0;

  if (!hasOpportunities && !hasMoves && strengths.length === 0 && areasForImprovement.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1. Score Maximizer Prioritized Opportunities */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Score Maximizer · Next Moves
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
            Top Priority
          </Badge>
        </div>

        <div className="space-y-2">
          {hasOpportunities
            ? opportunities.map((opp) => {
                const theme = AO_THEME[opp.aoTarget] || AO_THEME.ao1;
                const pTheme = PRIORITY_THEME[opp.priority] || PRIORITY_THEME.high;

                return (
                  <div
                    key={opp.id}
                    onClick={() =>
                      onSelectMove?.({
                        id: opp.id,
                        aoTarget: opp.aoTarget,
                        title: opp.title,
                        detail: `${opp.whyItMatters} ${opp.suggestedAction}`,
                        potentialGain: opp.potentialGain,
                      })
                    }
                    className="group relative cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0.5", theme.badge)}>
                          {theme.label}
                        </Badge>
                        <Badge className={cn("text-[10px] font-bold px-1.5 py-0.5 uppercase", pTheme)}>
                          {opp.priority}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {stripStars(opp.title)}
                        </span>
                      </div>

                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border-emerald-500/30 shrink-0">
                        +{opp.potentialGain} Mark
                      </Badge>
                    </div>

                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground/90 font-medium">{stripStars(opp.suggestedAction)}</strong>{" "}
                      <span className="opacity-80">({stripStars(opp.whyItMatters)})</span>
                    </p>
                  </div>
                );
              })
            : nextMoves.map((move) => {
                const theme = AO_THEME[move.aoTarget] || AO_THEME.ao1;
                return (
                  <div
                    key={move.id}
                    onClick={() => onSelectMove?.(move)}
                    className="group relative cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0.5", theme.badge)}>
                          {theme.label}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {stripStars(move.title)}
                        </span>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border-emerald-500/30">
                        +{move.potentialGain} Mark
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {stripStars(move.detail)}
                    </p>
                  </div>
                );
              })}
        </div>
      </div>

      {/* 2. Recognized Strengths */}
      {strengths.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>Demonstrated Cambridge Strengths</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {strengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{stripStars(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Areas for Improvement */}
      {areasForImprovement.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3.5" />
            <span>Target Areas for Improvement</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {areasForImprovement.map((a, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold shrink-0">!</span>
                <span>{stripStars(a)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
