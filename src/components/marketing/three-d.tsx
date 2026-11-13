/**
 * The CSS-3D toolkit used across the marketing page.
 *
 * Everything here writes CSS custom properties and lets the compositor do
 * the work — no element is ever re-laid-out by these components, and every
 * one of them is inert (children render exactly as given) on touch devices
 * and under prefers-reduced-motion, where a pointer-driven lean has nothing
 * to respond to.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** True when a pointer-driven effect is worth wiring up at all. */
function wantsPointerMotion() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * A card that leans toward the pointer with a specular sheen tracking the
 * cursor. `max` is the lean in degrees; keep it under about 12 or text on
 * the face starts to shear noticeably.
 */
export function TiltCard({
  children,
  className,
  max = 9,
  lift = 14,
  sheen = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number;
  sheen?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !wantsPointerMotion()) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      const { x, y } = pending;
      node.style.setProperty("--ry", `${(x * 2 - 1) * max}deg`);
      node.style.setProperty("--rx", `${(1 - y * 2) * max}deg`);
      node.style.setProperty("--tz", `${lift}px`);
      node.style.setProperty("--px", `${x * 100}%`);
      node.style.setProperty("--py", `${y * 100}%`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      pending = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      // One write per frame at most. Setting custom properties straight from
      // pointermove fires far more often than the screen refreshes.
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onEnter = () => {
      node.dataset.active = "true";
    };

    const onLeave = () => {
      node.dataset.active = "false";
      node.style.setProperty("--ry", "0deg");
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--tz", "0px");
    };

    node.addEventListener("pointerenter", onEnter);
    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave);

    return () => {
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [max, lift]);

  return (
    <div className="scene">
      <div ref={ref} className={cn("tilt relative", className)}>
        {children}
        {sheen ? <span className="tilt-sheen" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

/**
 * Pulls its child a few pixels toward the pointer when the pointer is near.
 * Wraps rather than clones, so the child keeps whatever element it already
 * is — a Link stays a Link, and its own focus and hover styles are
 * untouched.
 */
export function Magnetic({
  children,
  className,
  strength = 12,
  radius = 90,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !wantsPointerMotion()) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        const reach = Math.max(rect.width, rect.height) / 2 + radius;

        if (distance > reach) {
          node.dataset.active = "false";
          node.style.setProperty("--magnet-x", "0px");
          node.style.setProperty("--magnet-y", "0px");
          return;
        }
        const pull = (1 - distance / reach) * strength;
        node.dataset.active = "true";
        node.style.setProperty("--magnet-x", `${(dx / reach) * pull}px`);
        node.style.setProperty("--magnet-y", `${(dy / reach) * pull}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [strength, radius]);

  return (
    <span ref={ref} className={cn("magnetic inline-flex", className)}>
      {children}
    </span>
  );
}
