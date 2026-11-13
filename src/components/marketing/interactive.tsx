import * as React from "react";
import { CheckCircle2, HelpCircle, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DrillQuestion {
  question: string;
  options: {
    command: string;
    isCorrect: boolean;
    tariff: string;
    explanation: string;
  }[];
}

const DRILL_QUESTIONS: DrillQuestion[] = [
  {
    question: "“...whether a subsidy on solar panels will benefit an economy.” (8 marks)",
    options: [
      {
        command: "Explain",
        isCorrect: false,
        tariff: "4–6 marks",
        explanation: "Explain only requires one-sided economic reasoning and transmission mechanisms. 8-mark questions demand two sides.",
      },
      {
        command: "Discuss",
        isCorrect: true,
        tariff: "8 marks",
        explanation: "Correct! 'Discuss' questions in 0455 Paper 2 require a balanced, two-sided argument (advantages vs disadvantages/opportunity costs) and an evaluative judgment.",
      },
      {
        command: "Define",
        isCorrect: false,
        tariff: "2 marks",
        explanation: "Define is a 2-mark recall command, not an evaluative discussion.",
      },
    ],
  },
  {
    question: "“...how a decrease in the rate of interest affects consumer spending.” (4 marks)",
    options: [
      {
        command: "Explain",
        isCorrect: true,
        tariff: "4 marks",
        explanation: "Correct! 'Explain' asks for economic causes and consequences (cheaper borrowing, lower incentive to save, higher consumption).",
      },
      {
        command: "Discuss",
        isCorrect: false,
        tariff: "8 marks",
        explanation: "Discuss is reserved for 8-mark questions requiring evaluation and counter-arguments.",
      },
      {
        command: "Calculate",
        isCorrect: false,
        tariff: "2 marks",
        explanation: "Calculate is a quantitative command using numerical data.",
      },
    ],
  },
  {
    question: "“...what is meant by an 'opportunity cost'.” (2 marks)",
    options: [
      {
        command: "Analyse",
        isCorrect: false,
        tariff: "6 marks",
        explanation: "Analyse is for deeper cause-and-effect chain analysis, not standard definition recall.",
      },
      {
        command: "Discuss",
        isCorrect: false,
        tariff: "8 marks",
        explanation: "Discuss requires a balanced evaluation, not a definition.",
      },
      {
        command: "Define",
        isCorrect: true,
        tariff: "2 marks",
        explanation: "Correct! 'Define' requires a precise Cambridge specification definition: the next best alternative foregone.",
      },
    ],
  },
];

export function CommandWordDrill() {
  const [index, setIndex] = React.useState(0);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  const current = DRILL_QUESTIONS[index];

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
  };

  const handleNext = () => {
    setSelectedIdx(null);
    setIndex((prev) => (prev + 1) % DRILL_QUESTIONS.length);
  };

  const selectedOption = selectedIdx !== null ? current.options[selectedIdx] : null;

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-ink/15 bg-card/80 p-6 md:p-8 backdrop-blur shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Interactive Command Word Drill
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Question {index + 1} of {DRILL_QUESTIONS.length}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Which command word belongs with this prompt?
        </p>
        <p className="mt-2 text-base md:text-lg font-medium text-foreground">
          {current.question}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {current.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          let variantStyle = "border-ink/15 hover:border-primary/50 hover:bg-muted/40";
          if (selectedIdx !== null) {
            if (opt.isCorrect) {
              variantStyle = "border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-600";
            } else if (isSelected) {
              variantStyle = "border-rose-500 bg-rose-50/70 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-600";
            } else {
              variantStyle = "border-ink/10 opacity-50";
            }
          }

          return (
            <button
              key={opt.command}
              type="button"
              disabled={selectedIdx !== null}
              onClick={() => handleSelect(i)}
              className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${variantStyle}`}
            >
              <span className="text-base font-semibold">{opt.command}</span>
              <span className="mt-1 text-xs text-muted-foreground font-mono">{opt.tariff}</span>
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div
          className={`mt-6 rounded-xl border p-4 text-sm ${
            selectedOption.isCorrect
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {selectedOption.isCorrect ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {selectedOption.isCorrect ? "Correct Command Word" : "Incorrect Command Word"}
              </p>
              <p className="mt-1 leading-relaxed opacity-90">{selectedOption.explanation}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={handleNext}>
              Next Drill →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
