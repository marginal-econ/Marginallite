import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
   Shared scroll ticker
   Every doodle drifting on scroll shares one passive listener and one rAF
   frame. Registering a listener per element is the usual way parallax turns
   a smooth page into a janky one.
   ────────────────────────────────────────────────────────────────────────── */

type Subscriber = (scrollY: number) => void;

const subscribers = new Set<Subscriber>();
let ticking = false;
let listening = false;

function notify() {
  const y = window.scrollY;
  for (const subscriber of subscribers) subscriber(y);
  ticking = false;
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(notify);
}

function subscribe(subscriber: Subscriber) {
  subscribers.add(subscriber);
  if (!listening) {
    window.addEventListener("scroll", onScroll, { passive: true });
    listening = true;
  }
  subscriber(window.scrollY);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && listening) {
      window.removeEventListener("scroll", onScroll);
      listening = false;
    }
  };
}

/**
 * Drifts its child vertically as the page scrolls. `speed` is a fraction of
 * the scroll distance: positive drifts down (slower than the page), negative
 * drifts up (faster). Keep it under ~0.15 — anything more and decoration
 * starts racing the text it sits behind.
 */
export function Drift({
  children,
  speed = 0.08,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Measured against the element's own centre, not absolute scrollY, so
    // the offset is zero when the doodle sits mid-viewport and only ever
    // reaches about (viewport height x speed) at the extremes. Anchoring to
    // raw scrollY instead flings anything low on the page hundreds of pixels
    // out of place before you have even scrolled to it.
    const box = element.getBoundingClientRect();
    const centre = box.top + box.height / 2 + window.scrollY;

    return subscribe((scrollY) => {
      const offset = (scrollY + window.innerHeight / 2 - centre) * speed;
      element.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  }, [speed]);

  return (
    <span ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute", className)}>
      {children}
    </span>
  );
}

/** A thin bar across the top of the page showing how far down you are. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return subscribe((scrollY) => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0;
      element.style.transform = `scaleX(${progress})`;
    });
  }, []);

  return <div ref={ref} className="scroll-progress" aria-hidden="true" />;
}

/* ──────────────────────────────────────────────────────────────────────────
   The scribbles
   Hand-drawn marginalia — the kind of thing a teacher leaves in the margin.
   All original, all stroke-only so they inherit colour from the parent.
   ────────────────────────────────────────────────────────────────────────── */

export function Star({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
    </svg>
  );
}

/** A loose looping curl, like an absent-minded doodle in the margin. */
export function Curl({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 82c8-30 24-52 44-58 16-5 28 4 26 17-2 12-16 18-25 12-11-7-6-24 8-32 12-7 30-7 46 3"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="draw-in"
        style={{ "--draw-length": "230" } as React.CSSProperties}
      />
    </svg>
  );
}

/** Three stacked waves — the "double underline" of a marked-up script. */
export function Waves({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 54" fill="none" className={className} aria-hidden="true">
      {[6, 24, 42].map((y, index) => (
        <path
          key={y}
          d={`M4 ${y}c8-10 16 10 24 0s16 10 24 0 16 10 24 0`}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="draw-in"
          style={
            {
              "--draw-length": "120",
              "--draw-delay": `${index * 140}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}

/**
 * A dotted arc with an arrowhead — "look over here".
 *
 * The head is built off the curve's actual end tangent, so the two barbs sit
 * symmetrically behind the tip instead of splaying at whatever angle happens
 * to look right in the editor; and `--draw-length` matches the head's real
 * path length (~41 units), which is what makes the draw-on animation finish
 * exactly as the stroke completes rather than part-way through.
 */
export function DottedArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 116 84" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 14C44 8 78 28 96 66"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="0.5 12"
      />
      <path
        d="M79 55 96 66 97 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="draw-in"
        style={{ "--draw-length": "41", "--draw-delay": "420ms" } as React.CSSProperties}
      />
    </svg>
  );
}

/** A circled scribble, like something ringed for attention. */
export function CircleScribble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 76" fill="none" className={className} aria-hidden="true">
      <path
        d="M62 8C34 2 10 14 7 33c-3 20 20 37 48 35 24-2 42-16 41-32C95 20 79 9 58 7"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="draw-in"
        style={{ "--draw-length": "240" } as React.CSSProperties}
      />
    </svg>
  );
}
