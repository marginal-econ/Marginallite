import * as React from "react";
import { Sparkles, Wand2, X, ChevronDown, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SAMPLE_ESSAYS, type SampleEssay } from "@/lib/sample-essays";
import { cn } from "@/lib/utils";

export function SampleEssayBanner({
  onSelectSample,
  onClear,
  activeSampleId,
  onStartTour,
  className,
}: {
  onSelectSample: (sample: SampleEssay) => void;
  onClear: () => void;
  activeSampleId?: string | null;
  onStartTour?: () => void;
  className?: string;
}) {
  const activeSample = SAMPLE_ESSAYS.find((s) => s.id === activeSampleId);

  return (
    <div
      id="sample-essay-banner"
      className={cn(
        "rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.08] via-card to-purple-500/[0.05] p-3 sm:p-4 shadow-xs text-left transition-all",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {activeSample ? "Demo Sample Active" : "New Here or Don't Have an Essay Ready?"}
              </span>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-semibold py-0">
                1-Click Sandbox
              </Badge>
              {activeSample && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  • {activeSample.shortLabel}
                </span>
              )}
            </div>
            <p className="text-[11.5px] sm:text-xs text-muted-foreground leading-relaxed">
              {activeSample ? (
                <>
                  Sample Cambridge 0455 essay loaded into editor. Scroll down and hit{" "}
                  <strong className="text-primary font-semibold">Grade Essay</strong> to see the AI
                  examiner live!
                </>
              ) : (
                "Load a pre-written Cambridge IGCSE 0455 past paper answer in 1 click to watch how official mark schemes & AO rubrics grade it."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
          {activeSample ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/80 rounded-xl cursor-pointer gap-1"
            >
              <X className="size-3.5" />
              Clear Sample
            </Button>
          ) : (
            <>
              {/* Primary 1-Click Button */}
              <Button
                type="button"
                size="sm"
                onClick={() => onSelectSample(SAMPLE_ESSAYS[0])}
                className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Wand2 className="size-3.5" />
                Load 8M Sample
              </Button>

              {/* Dropdown for other sample tariffs */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border-border/80 rounded-xl cursor-pointer"
                    title="Select another sample tariff"
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-1.5 z-50">
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                    Cambridge IGCSE 0455 Exemplar Answers
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SAMPLE_ESSAYS.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => onSelectSample(s)}
                      className="flex flex-col items-start gap-1 p-2 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-foreground">{s.title}</span>
                        <Badge variant="outline" className="text-[9.5px] font-mono px-1 py-0">
                          {s.maxMark} Marks
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 text-left leading-snug">
                        {s.examinerHighlight}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {onStartTour && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStartTour}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-primary rounded-xl cursor-pointer gap-1"
              title="Tour the marking workspace"
            >
              <HelpCircle className="size-3.5" />
              <span className="hidden md:inline">Tour</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
