import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  badge?: string;
  actionHint?: string;
  onBeforeStep?: () => void;
}

export function InSituTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  onActionClick,
  actionButtonLabel,
}: {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onActionClick?: () => void;
  actionButtonLabel?: string;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Smooth scroll if element is outside comfortable viewport
      if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    if (currentStep?.onBeforeStep) {
      currentStep.onBeforeStep();
    }

    // Give DOM a microtask to settle before measuring
    const timer = setTimeout(updateTargetPosition, 100);
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (!isLastStep) setCurrentStepIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) setCurrentStepIndex((i) => i - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, currentStepIndex, currentStep, isLastStep, onClose, updateTargetPosition]);

  if (!isOpen || !currentStep) return null;

  // Tooltip position calculation
  const tooltipStyle: React.CSSProperties = (() => {
    const defaultCenter: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10000,
    };

    if (!targetRect) return defaultCenter;

    const margin = 14;
    const tooltipWidth = Math.min(window.innerWidth - 32, 420);
    const tooltipHeight = 240;

    let top = targetRect.bottom + margin;
    let left = Math.max(16, targetRect.left + (targetRect.width - tooltipWidth) / 2);

    // If bottom overflow, place above
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = Math.max(20, targetRect.top - tooltipHeight - margin);
    }

    // Keep within horizontal bounds
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10000,
    };
  })();

  const handleNext = () => {
    if (isLastStep) {
      if (onComplete) onComplete();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* Dimmed Background Overlay with cutout for target */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300"
        style={{ zIndex: 9998 }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 5, 12, 0.72)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Element Pulsing Border Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-2 border-primary shadow-[0_0_25px_rgba(168,85,247,0.45)] transition-all duration-300 animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            zIndex: 9999,
          }}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div
        style={tooltipStyle}
        className="rounded-2xl border border-primary/30 bg-card/98 backdrop-blur-xl p-4 sm:p-5 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10.5px] font-bold py-0.5">
              Step {currentStepIndex + 1} of {totalSteps}
            </Badge>
            {currentStep.badge && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                {currentStep.badge}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
            title="Skip tour (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          <h4 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="size-4 text-primary shrink-0" />
            {currentStep.title}
          </h4>
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
          {currentStep.actionHint && (
            <div className="flex items-center gap-1.5 text-[11px] text-primary/90 font-medium pt-1">
              <Sparkles className="size-3 text-primary shrink-0" />
              <span>{currentStep.actionHint}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            {onActionClick && actionButtonLabel && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onActionClick();
                  onClose();
                }}
                className="h-7 px-2.5 text-[11px] font-semibold border-primary/40 text-primary hover:bg-primary/10 rounded-lg cursor-pointer gap-1"
              >
                <Sparkles className="size-3" />
                {actionButtonLabel}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handlePrev}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <ChevronLeft className="size-3.5 mr-0.5" /> Back
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-7 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-xs cursor-pointer gap-1"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="size-3" />
                  Got it!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="size-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
