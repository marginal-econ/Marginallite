import {
  BookmarkCheck,
  BookText,
  Clock,
  Flame,
  Infinity as InfinityIcon,
  LineChart,
  ListChecks,
  PenLine,
  Scale,
  Scan,
  Share2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Feature marquee ticker across the hero section.
 *
 * Displays key Cambridge IGCSE 0455 Economics capabilities in an infinite,
 * smooth kinetic loop with dual edge fade masks and assessment-objective-specific
 * glowing indicators.
 */

export interface RibbonChipConfig {
  icon: LucideIcon;
  tag: string;
  pillClass: string;
  iconBg: string;
  iconColor: string;
  tagClass: string;
  glowDot: string;
}

const DEFAULT_CONFIG: RibbonChipConfig = {
  icon: Sparkles,
  tag: "Cambridge",
  pillClass:
    "border-primary/30 bg-primary/5 hover:border-primary/50 text-foreground shadow-[0_0_12px_rgba(168,85,247,0.12)]",
  iconBg: "bg-primary/15 text-primary",
  iconColor: "text-primary",
  tagClass: "border-primary/30 bg-primary/10 text-primary",
  glowDot: "bg-primary shadow-[0_0_8px_rgba(168,85,247,0.7)]",
};

const CHIP_MAP: Record<string, RibbonChipConfig> = {
  "Data Response Studio": {
    icon: Sparkles,
    tag: "Real-Time AI",
    pillClass:
      "border-purple-500/40 bg-purple-500/10 hover:border-purple-500/60 text-purple-950 dark:text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.18)]",
    iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-300",
    iconColor: "text-purple-600 dark:text-purple-300",
    tagClass: "border-purple-500/35 bg-purple-500/15 text-purple-700 dark:text-purple-300",
    glowDot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
  },
  "Score Maximizer": {
    icon: Flame,
    tag: "Exam Tech",
    pillClass:
      "border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60 text-amber-950 dark:text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.18)]",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    tagClass: "border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    glowDot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  },
  "AO1 Knowledge": {
    icon: BookText,
    tag: "AO1",
    pillClass:
      "border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60 text-amber-950 dark:text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.2)]",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    tagClass: "border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black",
    glowDot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]",
  },
  "AO2 Analysis": {
    icon: Share2,
    tag: "AO2",
    pillClass:
      "border-sky-500/40 bg-sky-500/10 hover:border-sky-500/60 text-sky-950 dark:text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.2)]",
    iconBg: "bg-sky-500/20 text-sky-600 dark:text-sky-400",
    iconColor: "text-sky-600 dark:text-sky-400",
    tagClass: "border-sky-500/40 bg-sky-500/20 text-sky-700 dark:text-sky-300 font-black",
    glowDot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]",
  },
  "AO3 Evaluation": {
    icon: Scale,
    tag: "AO3",
    pillClass:
      "border-purple-500/40 bg-purple-500/10 hover:border-purple-500/60 text-purple-950 dark:text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.2)]",
    iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-600 dark:text-purple-400",
    tagClass: "border-purple-500/40 bg-purple-500/20 text-purple-700 dark:text-purple-300 font-black",
    glowDot: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.85)]",
  },
  "Paper 1 & 3 MCQs": {
    icon: ListChecks,
    tag: "MCQ Drill",
    pillClass:
      "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60 text-emerald-950 dark:text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.18)]",
    iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    tagClass: "border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    glowDot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  },
  "12h Exam Resume": {
    icon: Clock,
    tag: "Auto-Save",
    pillClass:
      "border-cyan-500/40 bg-cyan-500/10 hover:border-cyan-500/60 text-cyan-950 dark:text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.18)]",
    iconBg: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    tagClass: "border-cyan-500/35 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    glowDot: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
  },
  "Paper 2 & 4 Essays": {
    icon: PenLine,
    tag: "Official Mark Schemes",
    pillClass:
      "border-indigo-500/40 bg-indigo-500/10 hover:border-indigo-500/60 text-indigo-950 dark:text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.18)]",
    iconBg: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    tagClass: "border-indigo-500/35 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    glowDot: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]",
  },
  "Unlimited Essay Gradings": {
    icon: InfinityIcon,
    tag: "100% Free",
    pillClass:
      "border-emerald-500/50 bg-emerald-500/15 hover:border-emerald-500/70 text-emerald-950 dark:text-emerald-100 font-extrabold shadow-[0_0_18px_rgba(16,185,129,0.25)]",
    iconBg: "bg-emerald-500/25 text-emerald-600 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    tagClass: "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 font-black tracking-wider",
    glowDot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)] animate-pulse",
  },
  "Handwriting Vision OCR": {
    icon: Scan,
    tag: "OCR Engine",
    pillClass:
      "border-violet-400/45 bg-violet-500/10 hover:border-violet-400/70 text-violet-950 dark:text-violet-200 shadow-[0_0_14px_rgba(139,92,246,0.18)]",
    iconBg: "bg-violet-500/20 text-violet-600 dark:text-violet-300",
    iconColor: "text-violet-600 dark:text-violet-300",
    tagClass: "border-violet-400/35 bg-violet-500/15 text-violet-700 dark:text-violet-300",
    glowDot: "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.85)]",
  },
  "Diagram Studio": {
    icon: LineChart,
    tag: "SVG Shifts",
    pillClass:
      "border-sky-500/40 bg-sky-500/10 hover:border-sky-500/60 text-sky-950 dark:text-sky-200 shadow-[0_0_14px_rgba(14,165,233,0.18)]",
    iconBg: "bg-sky-500/20 text-sky-600 dark:text-sky-400",
    iconColor: "text-sky-600 dark:text-sky-400",
    tagClass: "border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    glowDot: "bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]",
  },
  "Definition Hub": {
    icon: BookmarkCheck,
    tag: "120+ Terms",
    pillClass:
      "border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60 text-amber-950 dark:text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.18)]",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
    tagClass: "border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    glowDot: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  },
  "Marked to 0455": {
    icon: ShieldCheck,
    tag: "Cambridge Rubrics",
    pillClass:
      "border-purple-500/40 bg-purple-500/10 hover:border-purple-500/60 text-purple-950 dark:text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.18)]",
    iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-600 dark:text-purple-400",
    tagClass: "border-purple-500/35 bg-purple-500/15 text-purple-700 dark:text-purple-300",
    glowDot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
  },
};

function getConfig(item: string): RibbonChipConfig {
  return CHIP_MAP[item] ?? DEFAULT_CONFIG;
}

export function Ribbon({
  items,
  className,
  duration = "54s",
}: {
  items: string[];
  className?: string;
  duration?: string;
}) {
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "marquee-container group relative w-full overflow-hidden select-none transition-colors",
        "border-y border-purple-300/40 dark:border-purple-500/25",
        "bg-gradient-to-r from-purple-100/40 via-background/95 to-amber-100/30",
        "dark:from-purple-950/45 dark:via-zinc-950/90 dark:to-indigo-950/45",
        "backdrop-blur-2xl py-3 sm:py-3.5 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {/* Top & bottom vibrant cosmic ambient glow lines */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/45 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.35)]" />

      {/* Smooth gradient fade masks on both edges prevent harsh letter clipping */}
      <div className="marquee-mask w-full overflow-hidden">
        <div
          className="marquee-track flex items-center gap-3 sm:gap-4 py-0.5"
          style={{ "--marquee-duration": duration } as React.CSSProperties}
        >
          {doubled.map((item, index) => {
            const config = getConfig(item);
            const Icon = config.icon;

            return (
              <div key={`${item}-${index}`} className="flex shrink-0 items-center gap-3 sm:gap-4">
                {/* Luminous interactive-feeling badge pill */}
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 sm:px-3.5 py-1.5 transition-all duration-300",
                    "backdrop-blur-md border shadow-xs select-none",
                    "hover:scale-105 hover:shadow-md cursor-default",
                    config.pillClass,
                  )}
                >
                  {/* Left rounded icon with glowing micro-indicator */}
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full shrink-0 shadow-2xs",
                      config.iconBg,
                    )}
                  >
                    <Icon className="size-3 shrink-0" />
                  </span>

                  {/* Main Capability Label */}
                  <span className="font-display text-xs sm:text-[13px] font-bold tracking-tight whitespace-nowrap">
                    {item}
                  </span>

                  {/* Micro Category Tag */}
                  {config.tag && (
                    <span
                      className={cn(
                        "font-mono text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
                        config.tagClass,
                      )}
                    >
                      {config.tag}
                    </span>
                  )}
                </div>

                {/* Sparkling star divider between badges */}
                <div
                  className="flex items-center justify-center px-0.5 opacity-60 text-purple-400 dark:text-purple-300 select-none"
                  aria-hidden="true"
                >
                  <Sparkles className="size-3 text-purple-500/70 dark:text-purple-400/70 animate-pulse shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
