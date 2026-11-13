import { useEffect, useRef } from "react";
import type { ElementType, ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

/**
 * Wraps content in a scroll-triggered entrance. `delay` staggers siblings;
 * keep it under ~250ms across a group, or the last card arrives long after
 * the reader's eye has already moved on.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "pop";
  as?: ElementType;
}) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={cn(variant === "pop" ? "reveal-pop" : "reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts up to `value` the first time it scrolls into view. Renders the
 * final number immediately for reduced motion (and as the SSR output), so
 * the real figure is never withheld from anyone.
 */
export function CountUp({
  value,
  suffix = "",
  duration = 1100,
  delay = 0,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      element.textContent = `${value}${suffix}`;
      return;
    }

    let frame = 0;
    let timer = 0;

    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        // easeOutCubic — fast first, settles gently on the real number.
        const eased = 1 - Math.pow(1 - t, 3);
        element.textContent = `${Math.round(eased * value)}${suffix}`;
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    element.textContent = `0${suffix}`;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            timer = window.setTimeout(run, delay);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [value, suffix, duration, delay]);

  return <span ref={ref}>{`${value}${suffix}`}</span>;
}
