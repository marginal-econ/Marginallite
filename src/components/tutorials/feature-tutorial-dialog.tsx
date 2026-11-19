import * as React from "react";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Layers,
  HelpCircle,
  RotateCcw,
  Lightbulb,
  Trophy,
  Compass,
  Check,
} from "lucide-react";

import { useFeatureTutorial } from "@/components/tutorials/tutorial-context";
import { FEATURE_TUTORIALS, type FeatureTutorial } from "@/lib/tutorials-data";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Non-intrusive invite prompt shown on route entry.
 * Never blocks the screen, never steals focus, and politely asks if the user wants a tutorial.
 */
export function TutorialInviteBanner({
  tutorial,
  onAccept,
  onDismiss,
  onDisableAll,
}: {
  tutorial: FeatureTutorial;
  onAccept: () => void;
  onDismiss: () => void;
  onDisableAll: () => void;
}) {
  const Icon = tutorial.icon || GraduationCap;

  // Auto-dismiss after 25 seconds if untouched to prevent being an inconvenience
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 25000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <aside
      aria-label="Feature Tutorial Suggestion"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-[380px] p-4 rounded-2xl border border-purple-500/30 bg-card/95 backdrop-blur-md shadow-2xl text-left animate-in slide-in-from-bottom-4 duration-300 transition-all pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                Cambridge IGCSE 0455 Guide
              </span>
              {tutorial.paperTag && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  • {tutorial.paperTag}
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground mt-1 truncate">
              {tutorial.title}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Would you like a quick 1-minute walkthrough of this feature?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="size-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Dismiss for now"
        >
          <X className="size-3.5" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onAccept}
            className="h-7 px-3 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs gap-1 cursor-pointer"
          >
            <Sparkles className="size-3" />
            Start Guide
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
          >
            Not now
          </Button>
        </div>

        <button
          type="button"
          onClick={onDisableAll}
          className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground underline cursor-pointer shrink-0"
        >
          Don&apos;t show guides
        </button>
      </div>
    </aside>
  );
}

export function FeatureTutorialDialog() {
  const {
    isOpen,
    activeTutorial,
    activeStep,
    viewMode,
    seenTutorials,
    autoTutorialsEnabled,
    inviteTutorial,
    closeTutorial,
    nextStep,
    prevStep,
    goToStep,
    setViewMode,
    completeCurrentTutorial,
    openTutorial,
    resetSeenStatus,
    toggleAutoTutorials,
    acceptInvite,
    dismissInvite,
    disableAllAutoTutorials,
  } = useFeatureTutorial();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const tutorial = activeTutorial || FEATURE_TUTORIALS[0];
  const steps = tutorial.steps;
  const currentStepData = steps[activeStep] || steps[0];
  const totalSteps = steps.length;
  const isLastStep = activeStep === totalSteps - 1;

  // Filtered list for the All Features Directory tab
  const filteredFeatures = useMemo(() => {
    return FEATURE_TUTORIALS.filter((f) => {
      const matchesSearch =
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.navLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.paperTag && f.paperTag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === "All" || f.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const categories = [
    "All",
    "Exam Practice",
    "Syllabus Resources",
    "Classroom & Diagnostics",
    "Dashboard",
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeTutorial()}>
        <DialogContent
          className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[720px] max-h-[92vh] flex flex-col p-0 rounded-3xl border border-border bg-card shadow-2xl overflow-hidden text-left z-50 focus:outline-none [&>button.absolute]:hidden"
          onEscapeKeyDown={closeTutorial}
      >
        {/* Pinned Top Navigation Bar */}
        <div className="p-4 sm:p-5 pb-3 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] font-semibold gap-1.5 py-0.5">
                <GraduationCap className="size-3 text-purple-600 dark:text-purple-400" />
                Cambridge IGCSE 0455 Tutorial
              </Badge>
              {tutorial.paperTag && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium border-border/80 text-muted-foreground"
                >
                  {tutorial.paperTag}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
                • {tutorial.estimatedTime}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={closeTutorial}
              className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              title="Close guide"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
                <tutorial.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  {tutorial.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {tutorial.category} • Official Cambridge Syllabus Guide
                </DialogDescription>
              </div>
            </div>

            {/* Mode Toggle (Walkthrough vs All Features) */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("walkthrough")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  viewMode === "walkthrough"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Compass className="size-3.5" />
                <span className="hidden sm:inline">Walkthrough</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("directory")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  viewMode === "directory"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="size-3.5" />
                <span className="hidden sm:inline">All Features</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-purple-500/10 text-purple-600 font-bold">
                  {FEATURE_TUTORIALS.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {viewMode === "walkthrough" ? (
            /* ─────────────────────────────────────────────────────────── */
            /* VIEW 1: STEP-BY-STEP INTERACTIVE WALKTHROUGH                */
            /* ─────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              {/* Step Progress Header */}
              <div className="bg-muted/30 border border-border/80 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                  <span className="flex items-center gap-1.5 text-foreground font-bold">
                    <span className="flex size-5 rounded-full bg-purple-600 text-white items-center justify-center text-[10px]">
                      {currentStepData.step}
                    </span>
                    Step {currentStepData.step} of {totalSteps}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {Math.round(((activeStep + 1) / totalSteps) * 100)}% complete
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${((activeStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Step Content Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    {currentStepData.title}
                  </h3>
                  {currentStepData.badge && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 shrink-0"
                    >
                      {currentStepData.badge}
                    </Badge>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Cambridge Examiner Pro-Tip Callout */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Cambridge IGCSE 0455 Examiner Tip</span>
                  </div>
                  <p className="text-xs text-foreground/80 dark:text-amber-100/90 leading-relaxed pl-5 font-medium">
                    {currentStepData.proTip}
                  </p>
                </div>
              </div>

              {/* Feature Capabilities Quick List */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-purple-500" />
                  What you can do with this feature
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {tutorial.whatItDoes.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* VIEW 2: ALL FEATURES DIRECTORY                              */
            /* ─────────────────────────────────────────────────────────── */
            <div className="space-y-3.5">
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search feature (e.g. Essays, MCQ, Data Response, Diagrams)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-xl text-xs bg-background"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
                        selectedCategory === cat
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs font-semibold"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredFeatures.map((feat) => {
                  const isSeen = Boolean(seenTutorials[feat.id]);
                  const isCurrent = feat.id === tutorial.id;

                  return (
                    <div
                      key={feat.id}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5",
                        isCurrent
                          ? "border-purple-500/50 bg-purple-500/5 shadow-xs"
                          : "border-border/80 bg-card hover:border-border hover:shadow-xs",
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <feat.icon className="size-4" />
                            </div>
                            <span className="font-bold text-xs text-foreground truncate">
                              {feat.navLabel}
                            </span>
                          </div>

                          {isSeen ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0 gap-1 px-1.5 py-0"
                            >
                              <Check className="size-2.5" />
                              Seen
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-medium border-purple-500/30 text-purple-600 bg-purple-500/10 shrink-0 px-1.5 py-0"
                            >
                              New
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {feat.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => {
                            openTutorial(feat.id, 0);
                            setViewMode("walkthrough");
                          }}
                          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          View Tutorial
                          <ChevronRight className="size-3" />
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            closeTutorial();
                            navigate({ to: feat.directUrl });
                          }}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                        >
                          Open Page
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset all tutorials button */}
              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/70">
                <span>Want to see all first-time intros again?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetSeenStatus()}
                  className="h-7 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  Reset Seen History
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Bottom Footer with Controls */}
        <div className="p-3.5 sm:p-4 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground order-2 sm:order-1">
            <Switch
              id="auto-tutorials-switch"
              checked={autoTutorialsEnabled}
              onCheckedChange={toggleAutoTutorials}
              className="scale-75"
            />
            <Label
              htmlFor="auto-tutorials-switch"
              className="text-[11px] cursor-pointer text-muted-foreground"
            >
              Auto-show tutorial when visiting new features
            </Label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            {viewMode === "walkthrough" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="h-8 px-3 text-xs rounded-xl gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>

                {/* Step dots */}
                <div className="flex items-center gap-1 px-1">
                  {steps.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToStep(idx)}
                      className={cn(
                        "size-2 rounded-full transition-all",
                        idx === activeStep
                          ? "bg-purple-600 w-4"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
                      )}
                      title={`Go to step ${idx + 1}`}
                    />
                  ))}
                </div>

                {isLastStep ? (
                  <Button
                    size="sm"
                    onClick={completeCurrentTutorial}
                    className="h-8 px-4 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Finish Tutorial
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="h-8 px-4 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-sm"
                  >
                    Next Step
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={closeTutorial}
                className="h-8 px-4 text-xs font-semibold rounded-xl"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {inviteTutorial && !isOpen && (
      <TutorialInviteBanner
        tutorial={inviteTutorial}
        onAccept={acceptInvite}
        onDismiss={dismissInvite}
        onDisableAll={disableAllAutoTutorials}
      />
    )}
  </>
  );
}

/**
 * Top Tutorial Button Component
 * Can be placed in headers, app shell, and page headers.
 */
export function TopTutorialButton({
  className,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: {
  className?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  showLabel?: boolean;
}) {
  const { openTutorial } = useFeatureTutorial();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => openTutorial()}
      className={cn(
        "h-8 gap-1.5 rounded-lg border-purple-500/25 bg-purple-500/8 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0",
        className,
      )}
      title="Open tutorial for this feature"
    >
      <GraduationCap className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
      {showLabel && <span className="hidden sm:inline">Tutorial</span>}
    </Button>
  );
}
