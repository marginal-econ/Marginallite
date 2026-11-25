import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Images,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { DiagramRefMatch } from "@/lib/diagram-detection";
import type { DiagramEntry } from "@/lib/diagrams/types";
import {
  buildParagraphHighlightSegments,
  type ParagraphBlock,
  type Pass4Comment,
} from "@/lib/pass4-comments";
import { cn } from "@/lib/utils";

type CategoryKey = Pass4Comment["category"];

const CATEGORY_STYLES: Record<
  CategoryKey,
  {
    shortLabel: string;
    dot: string;
    accentBar: string;
    badge: string;
    activeCard: string;
    activeHighlight: string;
    inactiveHighlight: string;
    pillActive: string;
  }
> = {
  diagram: {
    shortLabel: "Diagram",
    dot: "bg-emerald-500",
    accentBar: "bg-emerald-500",
    badge:
      "border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300",
    activeCard:
      "border-emerald-500/50 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] ring-1 ring-emerald-500/25",
    activeHighlight:
      "bg-emerald-500/15 dark:bg-emerald-500/25 underline decoration-emerald-600 dark:decoration-emerald-400 decoration-2 underline-offset-[3px]",
    inactiveHighlight:
      "bg-emerald-500/[0.06] hover:bg-emerald-500/15 underline decoration-emerald-600/45 dark:decoration-emerald-400/45 decoration-dotted underline-offset-[3px]",
    pillActive:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  },
  analysis: {
    shortLabel: "AO2",
    dot: "bg-amber-500",
    accentBar: "bg-amber-500",
    badge:
      "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300",
    activeCard:
      "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/25",
    activeHighlight:
      "bg-amber-500/18 dark:bg-amber-500/25 underline decoration-amber-600 dark:decoration-amber-400 decoration-2 underline-offset-[3px]",
    inactiveHighlight:
      "bg-amber-500/[0.07] hover:bg-amber-500/15 underline decoration-amber-600/45 dark:decoration-amber-400/45 decoration-dotted underline-offset-[3px]",
    pillActive:
      "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  evaluation: {
    shortLabel: "AO3",
    dot: "bg-sky-500",
    accentBar: "bg-sky-500",
    badge:
      "border-sky-600/25 bg-sky-500/10 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300",
    activeCard:
      "border-sky-500/50 bg-sky-500/[0.04] dark:bg-sky-500/[0.08] ring-1 ring-sky-500/25",
    activeHighlight:
      "bg-sky-500/15 dark:bg-sky-500/25 underline decoration-sky-600 dark:decoration-sky-400 decoration-2 underline-offset-[3px]",
    inactiveHighlight:
      "bg-sky-500/[0.06] hover:bg-sky-500/15 underline decoration-sky-600/45 dark:decoration-sky-400/45 decoration-dotted underline-offset-[3px]",
    pillActive:
      "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300",
  },
  knowledge: {
    shortLabel: "AO1",
    dot: "bg-indigo-500",
    accentBar: "bg-indigo-500",
    badge:
      "border-indigo-600/25 bg-indigo-500/10 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300",
    activeCard:
      "border-indigo-500/50 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] ring-1 ring-indigo-500/25",
    activeHighlight:
      "bg-indigo-500/15 dark:bg-indigo-500/25 underline decoration-indigo-600 dark:decoration-indigo-400 decoration-2 underline-offset-[3px]",
    inactiveHighlight:
      "bg-indigo-500/[0.06] hover:bg-indigo-500/15 underline decoration-indigo-600/45 dark:decoration-indigo-400/45 decoration-dotted underline-offset-[3px]",
    pillActive:
      "border-indigo-500/40 bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  },
};

function formatCompactAnchor(comment: Pass4Comment, blocks: ParagraphBlock[]): string {
  const block = blocks.find((b) => b.index === comment.paragraphIndex);
  if (block) {
    if (block.isDiagram) return block.label;
    if (block.textParagraphNumber != null) return `¶${block.textParagraphNumber}`;
  }
  return comment.paragraphLabel?.replace(/^¶\s*Paragraph\s*/i, "¶") || `¶${comment.paragraphIndex + 1}`;
}

export interface Pass4ReviewWorkspaceProps {
  paragraphBlocks: ParagraphBlock[];
  comments: Pass4Comment[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string | null) => void;
  essayFont: "serif" | "sans";
  isFullMarks?: boolean;
  diagramMatches?: DiagramRefMatch[];
  onInspectDiagram?: (entry: DiagramEntry) => void;
}

export function Pass4ReviewWorkspace({
  paragraphBlocks,
  comments,
  activeCommentId,
  onSelectComment,
  essayFont,
  isFullMarks = false,
  diagramMatches = [],
  onInspectDiagram,
}: Pass4ReviewWorkspaceProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "all">("all");

  // Order comments naturally by manuscript paragraph order so stepping feels sequential
  const orderedComments = useMemo(() => {
    return [...comments].sort((a, b) => a.paragraphIndex - b.paragraphIndex);
  }, [comments]);

  const availableCategories = useMemo(() => {
    const seen = new Set<CategoryKey>();
    for (const c of orderedComments) seen.add(c.category);
    return Array.from(seen);
  }, [orderedComments]);

  const visibleComments = useMemo(() => {
    if (categoryFilter === "all") return orderedComments;
    return orderedComments.filter((c) => c.category === categoryFilter);
  }, [orderedComments, categoryFilter]);

  // Reset filter if comments change and selected category no longer exists
  useEffect(() => {
    if (categoryFilter !== "all" && !availableCategories.includes(categoryFilter)) {
      setCategoryFilter("all");
    }
  }, [availableCategories, categoryFilter]);

  // Auto-select the first comment on mount / new grading result so the review feels immediately alive
  useEffect(() => {
    if (orderedComments.length > 0 && (!activeCommentId || !orderedComments.some((c) => c.id === activeCommentId))) {
      onSelectComment(orderedComments[0].id);
    }
  }, [orderedComments, activeCommentId, onSelectComment]);

  const textParagraphCount = useMemo(
    () => paragraphBlocks.filter((b) => !b.isDiagram).length,
    [paragraphBlocks],
  );

  const activeVisibleIndex = useMemo(
    () => visibleComments.findIndex((c) => c.id === activeCommentId),
    [visibleComments, activeCommentId],
  );

  const selectFromManuscript = (comment: Pass4Comment) => {
    if (categoryFilter !== "all" && comment.category !== categoryFilter) {
      setCategoryFilter("all");
    }
    onSelectComment(comment.id);
    requestAnimationFrame(() => {
      document
        .getElementById(`pass4-card-${comment.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const selectFromRail = (comment: Pass4Comment) => {
    onSelectComment(comment.id);
    requestAnimationFrame(() => {
      document
        .getElementById(`pass4-para-${comment.paragraphIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const stepComment = (direction: -1 | 1) => {
    if (visibleComments.length === 0) return;
    const currentIdx = activeVisibleIndex >= 0 ? activeVisibleIndex : 0;
    const nextIdx = (currentIdx + direction + visibleComments.length) % visibleComments.length;
    const next = visibleComments[nextIdx];
    selectFromRail(next);
    requestAnimationFrame(() => {
      document
        .getElementById(`pass4-card-${next.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px] gap-5 items-start">
      {/* Left: Unified Continuous Candidate Manuscript */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden min-w-0">
        {/* Compact Manuscript Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60 bg-muted/20 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground tracking-tight">
              Annotated Script
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              · {textParagraphCount} {textParagraphCount === 1 ? "paragraph" : "paragraphs"}
            </span>
          </div>

          {availableCategories.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {availableCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", CATEGORY_STYLES[cat].dot)} />
                  <span>{CATEGORY_STYLES[cat].shortLabel}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Continuous Paper Surface */}
        <div className="px-4 py-5 sm:px-7 sm:py-6 space-y-4">
          {paragraphBlocks.length > 0 ? (
            paragraphBlocks.map((block) => {
              const paraComments = orderedComments.filter((c) => c.paragraphIndex === block.index);
              const activeInPara = paraComments.find((c) => c.id === activeCommentId);
              const isParaActive = Boolean(activeInPara);

              if (block.isDiagram) {
                const diagComment = paraComments[0];
                const matchedDiag = diagramMatches.find(
                  (m) =>
                    block.text.includes(m.matchText) ||
                    m.matchText.includes(block.text) ||
                    (block.diagramTitle && m.title.toLowerCase() === block.diagramTitle.toLowerCase()),
                );
                const displayTitle =
                  block.diagramTitle ||
                  matchedDiag?.title ||
                  block.text
                    .replace(/^[\[\(\{]\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:\s*/i, "")
                    .replace(/[\]\)\}]$/, "")
                    .trim()
                    .slice(0, 60);

                return (
                  <div
                    key={block.index}
                    id={`pass4-para-${block.index}`}
                    onClick={() => {
                      if (diagComment) {
                        selectFromManuscript(diagComment);
                      } else if (matchedDiag && onInspectDiagram) {
                        onInspectDiagram(matchedDiag.entry);
                      }
                    }}
                    className={cn(
                      "ml-0 sm:ml-8 rounded-xl border px-3.5 py-2.5 transition-all flex items-center justify-between gap-3 flex-wrap",
                      diagComment || (matchedDiag && onInspectDiagram) ? "cursor-pointer" : "",
                      isParaActive
                        ? "border-emerald-500 bg-emerald-500/12 dark:bg-emerald-500/15 ring-2 ring-emerald-500/25 shadow-xs"
                        : "border-emerald-500/30 bg-emerald-500/[0.05] dark:bg-emerald-950/25 hover:border-emerald-500/55",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <Images className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                          Figure: {displayTitle}
                        </div>
                        <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/75">
                          {block.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {matchedDiag && onInspectDiagram && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectDiagram(matchedDiag.entry);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                        >
                          <Eye className="size-3" />
                          <span>Inspect</span>
                        </button>
                      )}
                      {diagComment && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono gap-1",
                            CATEGORY_STYLES.diagram.badge,
                          )}
                        >
                          <MessageSquare className="size-2.5" />
                          <span>Note</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }

              const segments = buildParagraphHighlightSegments(
                block.text,
                paraComments,
                activeCommentId,
              );

              return (
                <div
                  key={block.index}
                  id={`pass4-para-${block.index}`}
                  className={cn(
                    "group relative flex items-start gap-2.5 sm:gap-3.5 rounded-xl px-2.5 py-2 -mx-2.5 transition-colors duration-150",
                    isParaActive
                      ? "bg-primary/[0.035] dark:bg-primary/[0.06]"
                      : paraComments.length > 0
                        ? "hover:bg-muted/35"
                        : "",
                  )}
                >
                  {/* Quiet Left Gutter Paragraph Number */}
                  <div
                    className={cn(
                      "w-6 sm:w-7 shrink-0 pt-[0.38em] text-right font-mono text-[11px] tabular-nums select-none transition-colors",
                      isParaActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground/50 group-hover:text-muted-foreground",
                    )}
                    title={`Paragraph ${block.textParagraphNumber ?? block.index + 1}`}
                  >
                    ¶{block.textParagraphNumber ?? block.index + 1}
                  </div>

                  {/* Continuous Manuscript Paragraph Text */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "whitespace-pre-line text-foreground/95 break-words",
                        essayFont === "serif"
                          ? "font-serif text-[16.5px] sm:text-[17.5px] leading-[1.85]"
                          : "font-sans text-[15.5px] sm:text-[16px] leading-[1.75]",
                      )}
                      style={{
                        fontFamily:
                          essayFont === "serif"
                            ? '"Newsreader", Georgia, Cambria, "Times New Roman", serif'
                            : '"Outfit", "Inter Tight", system-ui, -apple-system, sans-serif',
                        fontOpticalSizing: "none",
                        letterSpacing: "0px",
                      }}
                    >
                      {segments.map((seg, segIdx) => {
                        if (!seg.comment) {
                          return <span key={segIdx}>{seg.text}</span>;
                        }
                        const style = CATEGORY_STYLES[seg.comment.category];
                        return (
                          <span
                            key={`${seg.comment.id}-${segIdx}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectFromManuscript(seg.comment!)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                selectFromManuscript(seg.comment!);
                              }
                            }}
                            title={`${seg.comment.badge}: ${seg.comment.title}`}
                            className={cn(
                              "inline rounded-[3px] px-0.5 -mx-0.5 transition-colors duration-150 cursor-pointer text-foreground",
                              seg.isActive ? style.activeHighlight : style.inactiveHighlight,
                            )}
                          >
                            {seg.text}
                          </span>
                        );
                      })}
                    </p>
                  </div>

                  {/* Unobtrusive Right Margin Comment Indicator */}
                  {paraComments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const target =
                          isParaActive && paraComments.length > 1
                            ? paraComments[
                                (paraComments.findIndex((c) => c.id === activeCommentId) + 1) %
                                  paraComments.length
                              ]
                            : paraComments[0];
                        selectFromManuscript(target);
                      }}
                      title={`${paraComments.length} Pass 4 ${paraComments.length === 1 ? "note" : "notes"} on this paragraph`}
                      className={cn(
                        "mt-1 shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-mono font-semibold transition-all cursor-pointer",
                        isParaActive
                          ? CATEGORY_STYLES[activeInPara!.category].pillActive
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          CATEGORY_STYLES[(activeInPara || paraComments[0]).category].dot,
                        )}
                      />
                      <span>{paraComments.length}</span>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground/50 italic text-sm py-4 text-center">
              Candidate script is empty.
            </p>
          )}
        </div>
      </div>

      {/* Right: Sticky Compact Pass 4 Examiner Feedback Rail */}
      <aside className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)]">
        {/* Rail Header + Stepper */}
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground tracking-tight">
                Pass 4 Feedback
              </span>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-mono border-primary/30 text-primary bg-primary/5"
              >
                {orderedComments.length}
              </Badge>
            </div>

            {visibleComments.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepComment(-1)}
                  className="size-6 rounded-md border border-border/70 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Previous feedback comment"
                  title="Previous comment"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums px-1">
                  {activeVisibleIndex >= 0 ? activeVisibleIndex + 1 : 1}/{visibleComments.length}
                </span>
                <button
                  type="button"
                  onClick={() => stepComment(1)}
                  className="size-6 rounded-md border border-border/70 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Next feedback comment"
                  title="Next comment"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Compact Category Filter Chips (only when multiple categories exist) */}
          {availableCategories.length >= 2 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                  categoryFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                All ({orderedComments.length})
              </button>
              {availableCategories.map((cat) => {
                const count = orderedComments.filter((c) => c.category === cat).length;
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : CATEGORY_STYLES[cat].dot,
                      )}
                    />
                    <span>
                      {CATEGORY_STYLES[cat].shortLabel} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Compact Feedback Cards */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          {visibleComments.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center space-y-1.5">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Exemplar Integration
              </p>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                All diagrams, causal mechanisms, and evaluation criteria meet Cambridge 0455 standards.
              </p>
            </div>
          ) : (
            visibleComments.map((comment) => {
              const isActive = activeCommentId === comment.id;
              const style = CATEGORY_STYLES[comment.category];
              const anchor = formatCompactAnchor(comment, paragraphBlocks);

              return (
                <div
                  key={comment.id}
                  id={`pass4-card-${comment.id}`}
                  onClick={() => selectFromRail(comment)}
                  className={cn(
                    "relative rounded-xl border overflow-hidden transition-all duration-150 cursor-pointer",
                    isActive
                      ? style.activeCard
                      : "border-border/70 bg-background/60 hover:bg-muted/35 hover:border-border",
                  )}
                >
                  {/* Crisp 3px Left Semantic Accent Bar */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-[3px] transition-opacity",
                      style.accentBar,
                      isActive ? "opacity-100" : "opacity-45",
                    )}
                  />

                  <div className="pl-3.5 pr-3 py-2.5 space-y-2">
                    {/* Top Meta Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0",
                            style.badge,
                          )}
                        >
                          {comment.badge}
                        </span>
                        <span className="text-[10.5px] font-mono text-muted-foreground truncate">
                          {anchor}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-3.5 text-muted-foreground/70 shrink-0 transition-transform duration-150",
                          isActive && "rotate-180 text-foreground",
                        )}
                      />
                    </div>

                    {/* Concise Title */}
                    <h4 className="text-[12.5px] font-semibold text-foreground leading-snug">
                      {comment.title}
                    </h4>

                    {isActive ? (
                      <div className="space-y-2.5 pt-0.5 animate-in fade-in duration-150">
                        {/* Examiner Diagnostic */}
                        <p className="text-[12px] text-foreground/90 leading-relaxed">
                          {comment.critique}
                        </p>

                        {/* Actionable Fix / Distinction Callout */}
                        <div className="rounded-lg bg-muted/55 dark:bg-muted/30 border border-border/60 px-2.5 py-2 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <Sparkles className="size-3 shrink-0" />
                            <span>{isFullMarks ? "Distinction Tip" : "How to Improve"}</span>
                          </div>
                          <p className="text-[11.5px] text-foreground/85 leading-relaxed">
                            {comment.suggestion}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Compact 2-line scannable preview when collapsed */
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                        {comment.critique}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
