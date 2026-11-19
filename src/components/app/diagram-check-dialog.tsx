import {
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Images,
  LineChart,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectDiagramRequirement } from "@/lib/diagram-prompt";
import { cn } from "@/lib/utils";

export interface DiagramCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  essayText?: string;
  onAddDiagram: () => void;
  onProceedAnyway: () => void;
}

export function DiagramCheckDialog({
  open,
  onOpenChange,
  question,
  essayText = "",
  onAddDiagram,
  onProceedAnyway,
}: DiagramCheckDialogProps) {
  const req = detectDiagramRequirement(question, essayText);
  const isUrgent = req.isExplicitlyRequested || req.isMentionedInScript;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border/80 shadow-2xl bg-card">
        {/* Top vibrant header accent band */}
        <div
          className={cn(
            "h-1.5 w-full",
            isUrgent
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500",
          )}
        />

        <div className="p-5 sm:p-6 space-y-4">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              {isUrgent ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold uppercase tracking-wider gap-1.5 px-2.5 py-0.5"
                >
                  <AlertTriangle className="size-3.5" />
                  {req.isExplicitlyRequested ? "Diagram Explicitly Requested" : "Figure Mentioned in Text"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[11px] font-bold uppercase tracking-wider gap-1.5 px-2.5 py-0.5"
                >
                  <LineChart className="size-3.5" />
                  Cambridge Diagram Check
                </Badge>
              )}
            </div>

            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isUrgent ? "Check Your Diagrams Before Marking" : "Did you remember to add your diagram?"}
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isUrgent ? (
                <>
                  This exam prompt specifically instructs diagrammatic analysis{" "}
                  {req.matchedPhrase ? (
                    <strong className="text-foreground">(&ldquo;{req.matchedPhrase}&rdquo;)</strong>
                  ) : null}
                  , but no diagram is currently attached to your submission.
                </>
              ) : (
                "You are about to mark this essay without any attached diagrams. Cambridge IGCSE 0455 examiners reward accurate economic diagrams in AO2 analysis."
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Cambridge Marking Impact Box */}
          <div
            className={cn(
              "rounded-xl p-3.5 sm:p-4 text-xs leading-relaxed border space-y-2 transition-all",
              isUrgent
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                : "bg-muted/60 border-border/70 text-muted-foreground",
            )}
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {isUrgent
                    ? "Cambridge Examiner Tariff Penalty Warning"
                    : "Boost your AO2 Analysis Mark"}
                </p>
                <p>
                  {isUrgent ? (
                    <>
                      Under official Cambridge 0455 mark schemes, questions mandating a diagram allocate specific marks (typically 2 to 3 marks) to axes, equilibrium points, and curve shifts. Proceeding without one risks an automatic mark deduction.
                    </>
                  ) : (
                    <>
                      Attaching a photo of your hand-drawn graph or selecting one from the Cambridge Diagram Library demonstrates analytical clarity and helps anchor Level 3 reasoning.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onProceedAnyway();
              }}
              className="w-full sm:w-auto h-9 text-xs text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
            >
              Grade Without Diagram
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onAddDiagram();
              }}
              className="w-full sm:w-auto h-9 text-xs font-semibold bg-gradient-to-r from-primary via-indigo-600 to-primary text-white shadow-md hover:opacity-95 gap-1.5 cursor-pointer"
            >
              <Upload className="size-3.5" />
              Add Diagram Now
              <ArrowRight className="size-3.5 ml-0.5" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
