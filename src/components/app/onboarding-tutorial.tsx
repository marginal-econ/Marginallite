import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ListChecks, PenLine, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markTutorialSeen } from "@/lib/account.functions";
import { cn } from "@/lib/utils";

const TOUR_STEPS = [
  {
    icon: PenLine,
    title: "Essay marking",
    body: "Upload or paste a student's essay and get an examiner-style mark with a full breakdown, right against the mark scheme.",
  },
  {
    icon: Sparkles,
    title: "Diagnostic guidance",
    body: "Get actionable examiner feedback with official Cambridge 0455 tariffs and detailed point-by-point breakdowns.",
  },
  {
    icon: ListChecks,
    title: "Question bank & MCQ papers",
    body: "Practice with real past-paper questions, structured essay prompts, and server-timed MCQ papers.",
  },
  {
    icon: GraduationCap,
    title: "You're set",
    body: "Everything lives in the sidebar. You can always find your way back here from Settings if you want another look.",
  },
];

export function OnboardingTutorial({
  open,
  onFinished,
}: {
  open: boolean;
  onFinished: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);

  const finishTutorial = useServerFn(markTutorialSeen);
  const queryClient = useQueryClient();
  const { mutate: complete, isPending } = useMutation({
    mutationFn: () => finishTutorial(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onFinished();
    },
  });

  const isLastStep = step === TOUR_STEPS.length - 1;
  const current = TOUR_STEPS[step];

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {!started ? (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to Marginalite</DialogTitle>
              <DialogDescription>
                Want a 30-second tour of the essay marking, MCQ past papers, and syllabus tools
                before you dive in?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2">
              <Button variant="ghost" disabled={isPending} onClick={() => complete()}>
                Skip
              </Button>
              <Button onClick={() => setStarted(true)}>Start tutorial</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <current.icon className="size-4.5" />
              </div>
              <DialogTitle>{current.title}</DialogTitle>
              <DialogDescription>{current.body}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-center gap-1.5">
              {TOUR_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    index === step ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>

            <DialogFooter className="mt-2">
              <Button variant="ghost" disabled={isPending} onClick={() => complete()}>
                Skip
              </Button>
              {isLastStep ? (
                <Button disabled={isPending} onClick={() => complete()}>
                  Finish
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
