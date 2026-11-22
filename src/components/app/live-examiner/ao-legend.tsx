import { Eye, EyeOff, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AoTag, SentenceSpan } from "@/lib/live-examiner/types";
import { cn } from "@/lib/utils";

export type AoLegendProps = {
  sentences: SentenceSpan[];
  issuesCount: number;
  showAo: boolean;
  showIssues: boolean;
  onToggleAo: () => void;
  onToggleIssues: () => void;
  onSelectAo?: (tag: AoTag) => void;
  activeFilter?: AoTag | null;
  className?: string;
};

export function AoLegend({
  sentences,
  issuesCount,
  showAo,
  showIssues,
  onToggleAo,
  onToggleIssues,
  onSelectAo,
  activeFilter,
  className,
}: AoLegendProps) {
  // Count sentences by AO
  let ao1Count = 0;
  let ao2Count = 0;
  let ao3Count = 0;
  let noCreditCount = 0;

  for (const s of sentences) {
    if (!s.ao || s.ao.tag === "no_credit") noCreditCount++;
    else if (s.ao.tag === "ao1") ao1Count++;
    else if (s.ao.tag === "ao2") ao2Count++;
    else if (s.ao.tag === "ao3") ao3Count++;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs backdrop-blur-xs",
        className,
      )}
    >
      {/* AO Counters & Interactive Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">
          Objectives:
        </span>

        {/* AO1 */}
        <button
          type="button"
          onClick={() => onSelectAo?.("ao1")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors border",
            activeFilter === "ao1"
              ? "bg-[var(--ao1)]/20 border-[var(--ao1)] text-foreground font-bold"
              : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          )}
          title="Filter AO1 Knowledge sentences"
        >
          <span className="size-2 rounded-full bg-[var(--ao1)]" />
          <span>AO1</span>
          <span className="font-mono text-[11px] font-bold text-foreground">{ao1Count}</span>
        </button>

        {/* AO2 */}
        <button
          type="button"
          onClick={() => onSelectAo?.("ao2")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors border",
            activeFilter === "ao2"
              ? "bg-[var(--ao2)]/20 border-[var(--ao2)] text-foreground font-bold"
              : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          )}
          title="Filter AO2 Analysis sentences"
        >
          <span className="size-2 rounded-full bg-[var(--ao2)]" />
          <span>AO2</span>
          <span className="font-mono text-[11px] font-bold text-foreground">{ao2Count}</span>
        </button>

        {/* AO3 */}
        <button
          type="button"
          onClick={() => onSelectAo?.("ao3")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors border",
            activeFilter === "ao3"
              ? "bg-[var(--ao3)]/25 border-[var(--ao3)] text-foreground font-bold"
              : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          )}
          title="Filter AO3 Evaluation sentences"
        >
          <span className="size-2 rounded-full bg-[var(--ao3)]" />
          <span>AO3</span>
          <span className="font-mono text-[11px] font-bold text-foreground">{ao3Count}</span>
        </button>

        {/* No Credit */}
        {noCreditCount > 0 ? (
          <button
            type="button"
            onClick={() => onSelectAo?.("no_credit")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors border",
              activeFilter === "no_credit"
                ? "bg-muted border-foreground/30 text-foreground font-bold"
                : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
            title="Filter sentences with no credit"
          >
            <span className="size-2 rounded-full bg-muted-foreground/40" />
            <span>No credit</span>
            <span className="font-mono text-[11px] font-bold text-foreground">{noCreditCount}</span>
          </button>
        ) : null}
      </div>

      {/* Layer Toggles: AO Layer / Issues Layer */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={showAo ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-[11px] font-medium gap-1.5 px-2"
          onClick={onToggleAo}
          title="Toggle Assessment Objective highlights (Alt+1)"
        >
          <Layers className="size-3" />
          <span>AO Layer</span>
        </Button>

        <Button
          type="button"
          variant={showIssues ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-[11px] font-medium gap-1.5 px-2"
          onClick={onToggleIssues}
          title="Toggle Issue Underlines (Alt+2)"
        >
          {showIssues ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          <span>Issues ({issuesCount})</span>
        </Button>
      </div>
    </div>
  );
}
