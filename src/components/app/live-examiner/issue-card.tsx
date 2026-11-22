import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IssueV2, SentenceSpan, AoTag } from "@/lib/live-examiner/types";
import { cleanSuggestion, stripStars } from "@/lib/live-examiner/clean-suggestion";
import { cn } from "@/lib/utils";

export type IssueCardProps = {
  issue?: IssueV2;
  sentence?: SentenceSpan;
  anchorRect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  onAccept?: (issueId: string) => void;
  onDismiss?: (issueId: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onClose: () => void;
};

const AO_LABELS: Record<AoTag, { label: string; code: string; tone: string }> = {
  ao1: {
    label: "Knowledge & Understanding",
    code: "AO1",
    tone: "border-ao1/40 bg-ao1/15 text-ao1",
  },
  ao2: {
    label: "Analysis & Causal Chains",
    code: "AO2",
    tone: "border-ao2/40 bg-ao2/15 text-ao2",
  },
  ao3: {
    label: "Evaluation & Judgement",
    code: "AO3",
    tone: "border-ao3/40 bg-ao3/15 text-ao3",
  },
  no_credit: {
    label: "No Credit / Assertion",
    code: "No credit",
    tone: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
};

export function IssueCard({
  issue,
  sentence,
  anchorRect,
  onAccept,
  onDismiss,
  onNext,
  onPrev,
  onClose,
}: IssueCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showTeachMe, setShowTeachMe] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; flipped: boolean }>({
    left: anchorRect.left,
    top: anchorRect.bottom + 8,
    flipped: false,
  });

  // Calculate safe viewport position with collision detection
  useEffect(() => {
    if (!cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = anchorRect.left;
    let top = anchorRect.bottom + 8;
    let flipped = false;

    // Flip vertically if overflowing bottom
    if (top + card.height > viewportH - 16 && anchorRect.top - card.height - 8 > 16) {
      top = anchorRect.top - card.height - 8;
      flipped = true;
    }

    // Shift horizontally if overflowing right or left
    if (left + card.width > viewportW - 16) {
      left = Math.max(16, viewportW - card.width - 16);
    }
    if (left < 16) {
      left = 16;
    }

    setPos({ left, top, flipped });
  }, [anchorRect, showTeachMe]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const aoMeta = sentence?.ao ? AO_LABELS[sentence.ao.tag] : null;

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 9999,
      }}
      className={cn(
        "w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-popover/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-foreground",
      )}
      role="dialog"
      aria-label="Examiner suggestion details"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {aoMeta ? (
            <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 shrink-0", aoMeta.tone)}>
              {aoMeta.code}
            </Badge>
          ) : null}
          {issue ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold capitalize text-foreground truncate">
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  issue.severity === "high"
                    ? "bg-rose-500"
                    : issue.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-500",
                )}
              />
              <span className="truncate">{issue.category.replace(/_/g, " ")}</span>
            </span>
          ) : sentence?.ao ? (
            <span className="text-xs font-medium text-muted-foreground truncate">{aoMeta?.label}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onPrev ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={onPrev}
              title="Previous issue (Alt+K)"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
          ) : null}
          {onNext ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={onNext}
              title="Next issue (Alt+J)"
            >
              <ArrowRight className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Body: Explanation & Evidence */}
      <div className="space-y-3 py-3 text-xs leading-relaxed">
        {issue ? (
          <div>
            <p className="font-medium text-foreground">{stripStars(issue.explanation)}</p>
            {issue.evidence ? (
              <div className="mt-2 rounded-md border border-border/60 bg-muted/40 p-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Syllabus evidence: </span>
                <span className="italic">"{stripStars(issue.evidence)}"</span>
              </div>
            ) : null}
          </div>
        ) : sentence?.ao ? (
          <div>
            <p className="text-foreground">{stripStars(sentence.ao.reason)}</p>
            {sentence.ao.sub ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Role: {stripStars(sentence.ao.sub.replace(/_/g, " "))}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Diff Rewrite or Insertion Ghost Text */}
        {issue?.suggestion ? (
          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Suggested replacement
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 font-sans">
              <span className="rounded bg-rose-500/15 px-1 py-0.5 text-rose-600 line-through dark:text-rose-400">
                {stripStars(issue.original)}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                {cleanSuggestion(issue.suggestion)}
              </span>
            </div>
          </div>
        ) : issue?.insertAfter ? (
          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Add after this sentence
            </span>
            <p className="mt-1 italic text-muted-foreground">"{cleanSuggestion(issue.insertAfter)}"</p>
          </div>
        ) : null}

        {/* Mark Impact chip */}
        {issue?.aoImpact ? (
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3.5" />
            <span>{stripStars(issue.aoImpact)}</span>
          </div>
        ) : null}

        {/* Expandable "Why?" pedagogical explanation */}
        {issue && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              onClick={() => setShowTeachMe((prev) => !prev)}
            >
              <Info className="size-3" />
              {showTeachMe ? "Hide explanation" : "Why is this flagged?"}
              {showTeachMe ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {showTeachMe ? (
              <p className="mt-1.5 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                In Cambridge IGCSE 0455, high-scoring responses prioritize precise technical terminology and
                unbroken chains of causal reasoning. Ensuring clarity here guards your AO marks.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {issue && (
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss?.(issue.id)}
          >
            Dismiss
          </Button>

          {issue.suggestion ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => onAccept?.(issue.id)}
            >
              <Check className="size-3.5" />
              Accept
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
