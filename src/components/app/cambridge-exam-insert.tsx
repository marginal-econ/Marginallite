import React from "react";
import {
  FileText,
  Copy,
  Search,
  ExternalLink,
  BookOpen,
  Info,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import type { DataResponsePaper, DataResponseQuestion } from "@/lib/data-response/types";
import { cn } from "@/lib/utils";

interface CambridgeExamInsertProps {
  paper: DataResponsePaper;
  activeQuestion?: DataResponseQuestion | null;
  onInsertQuote?: (text: string) => void;
  searchFilter?: string;
  className?: string;
}

export function CambridgeExamInsert({
  paper,
  activeQuestion,
  onInsertQuote,
  searchFilter = "",
  className,
}: CambridgeExamInsertProps) {
  const extract = paper.extract;

  // Helper to highlight matching text in paragraphs
  const renderParagraphWithHighlight = (text: string) => {
    if (!searchFilter.trim()) return text;

    const regex = new RegExp(`(${searchFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-600/60 text-foreground px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-background shadow-md overflow-hidden text-foreground flex flex-col",
        className
      )}
    >
      {/* CAMBRIDGE OFFICIAL EXAMINATION INSERT HEADER */}
      <div className="bg-muted/40 p-4 border-b border-border/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-foreground text-background flex items-center justify-center font-serif font-black text-xs">
                C
              </div>
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-foreground">
                Cambridge Assessment International Education
              </span>
            </div>
            <p className="text-[11px] font-serif text-muted-foreground">
              {paper.subjectTitle || "Cambridge IGCSE Economics (0455)"}
            </p>
          </div>

          <div className="text-right sm:text-right shrink-0">
            <div className="font-mono font-bold text-sm text-foreground tracking-tight">
              {paper.originalExamCode || `${paper.subjectCode}/${paper.paperNumber}`}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {paper.seriesLabel || "Official Examination Series"}
            </div>
          </div>
        </div>

        {/* CAMBRIDGE OFFICIAL BLACK BANNER */}
        <div className="bg-foreground text-background p-2 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px] font-black uppercase tracking-widest bg-background text-foreground">
              INSERT
            </Badge>
            <span className="text-xs font-serif font-bold tracking-wide">
              INFORMATION FOR CANDIDATES
            </span>
          </div>
          <span className="text-[10px] opacity-80 hidden sm:inline font-mono">
            Section A: Data Response
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-normal italic">
          • This insert contains the case study extract and statistical data referred to in Question 1. You may annotate this insert and quote specific figures in your written answers.
        </p>
      </div>

      {/* DOCUMENT BODY: TYPESET CAMBRIDGE CASE STUDY */}
      <div
        className="flex-1 overflow-y-auto max-h-[700px] overscroll-contain focus:outline-none scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 transition-colors"
        style={{ overscrollBehavior: "contain" }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 space-y-6 max-w-3xl mx-auto font-serif">
          {/* CASE STUDY TITLE */}
          <div className="text-center space-y-1.5 pb-3 border-b-2 border-foreground/80">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground block">
              Section A: Data Response
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
              {extract.title}
            </h2>
          </div>

          {/* PARAGRAPHS */}
          <div className="space-y-4 text-[13px] sm:text-sm leading-relaxed text-foreground/90">
            {extract.paragraphs.map((para, idx) => (
              <div
                key={idx}
                className="group relative flex items-start gap-3 pl-1 pr-1 py-1 rounded transition-colors hover:bg-muted/30"
              >
                {/* Paragraph Number Marker [1], [2], etc. */}
                <span className="font-mono font-bold text-xs text-muted-foreground shrink-0 mt-0.5 select-none w-6 text-right">
                  [{idx + 1}]
                </span>

                <div className="flex-1 space-y-1">
                  <p className="text-justify leading-relaxed">
                    {renderParagraphWithHighlight(para)}
                  </p>
                </div>

                {/* Quick Quote Action */}
                {onInsertQuote && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onInsertQuote(para)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-1.5 text-[10px] font-sans text-primary hover:bg-primary/10 gap-1 shrink-0"
                    title="Insert this extract passage into your answer box"
                  >
                    <Copy className="h-3 w-3" />
                    Quote
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* AUTHENTIC CAMBRIDGE TABLE 1.1 */}
          {extract.tables && extract.tables.length > 0 && (
            <div className="space-y-4 pt-4">
              {extract.tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2">
                  <div className="font-serif font-bold text-sm text-foreground">
                    {table.title || `Table 1.${tIdx + 1}`}
                  </div>

                  <div className="overflow-x-auto rounded-none border-y-2 border-foreground/90">
                    <table className="w-full text-left font-serif border-collapse">
                      <thead>
                        <tr className="border-b-2 border-foreground/60 bg-muted/40">
                          {table.headers.map((header, hIdx) => {
                            const isNumericHeader = hIdx > 0;
                            return (
                              <th
                                key={hIdx}
                                className={cn(
                                  "py-2 px-3 text-xs font-bold text-foreground",
                                  isNumericHeader ? "text-right" : "text-left"
                                )}
                              >
                                {header}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs">
                        {table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={cn(
                              "transition-colors hover:bg-muted/30",
                              rIdx % 2 === 1 ? "bg-muted/15" : "bg-transparent"
                            )}
                          >
                            {row.map((cell, cIdx) => {
                              const isNumeric = cIdx > 0;
                              return (
                                <td
                                  key={cIdx}
                                  className={cn(
                                    "py-2 px-3",
                                    isNumeric
                                      ? "text-right font-mono tabular-nums font-medium text-foreground"
                                      : "text-left font-serif font-semibold text-foreground"
                                  )}
                                >
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {table.notes && (
                    <p className="text-[11px] font-serif text-muted-foreground italic text-right pt-0.5">
                      {table.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FIGURE 1.1 (IF ACTIVE QUESTION REQUIRES A DIAGRAM) */}
          {activeQuestion?.diagramSpec && (
            <div className="pt-4 space-y-2">
              <div className="font-serif font-bold text-sm text-foreground flex items-center justify-between">
                <span>Figure 1.1: {activeQuestion.diagramGuidance?.diagramName || "Economic Model Illustration"}</span>
                <Badge variant="outline" className="font-sans text-[10px] font-mono">
                  Vector Model
                </Badge>
              </div>

              <div className="p-3 rounded-lg border border-border/80 bg-background shadow-xs flex items-center justify-center">
                <div className="w-full max-w-[420px]">
                  <EconomicsDiagram
                    spec={activeQuestion.diagramSpec}
                    title={activeQuestion.diagramGuidance?.diagramName || activeQuestion.title}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SOURCES FOOTNOTE */}
          {extract.sources && (
            <div className="pt-4 border-t border-border/60 text-[11px] font-serif text-muted-foreground italic">
              {extract.sources}
            </div>
          )}

          {/* CAMBRIDGE COPYRIGHT NOTICE */}
          <div className="pt-6 border-t border-border/40 text-[10px] font-sans text-muted-foreground text-center space-y-1">
            <p>© Cambridge University Press & Assessment {paper.seriesLabel?.slice(-4) || "2024"}</p>
            <p className="opacity-75">
              Cambridge IGCSE Economics (0455). Prepared for candidate examination standardisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
