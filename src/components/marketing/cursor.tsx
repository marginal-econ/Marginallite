import { useEffect, useRef } from "react";

const INTERACTIVE = 'a, button, [role="button"], summary, label[for], .pop-press';

/**
 * A two-part pointer: a small dot that rides just behind the real cursor,
 * and a ring that lags further behind and — over anything clickable —
 * stretches to wrap that element rather than staying a circle. The wrap is
 * what makes it feel like the page is responding to you rather than a
 * decoration orbiting your hand.
 *
 * Deliberately an *additive* layer. The actual pointer is a real CSS cursor
 * image (`.cursor-marker` in styles.css), so precision, text selection and
 * the no-JavaScript case all keep working; if this component never mounts,
 * nobody is left without a cursor. That is the usual failure of custom
 * cursors, which set `cursor: none` and draw their own.
 *
 * Opts out entirely for coarse pointers and for anyone who asked for
 * reduced motion.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Marks the document so the CSS cursor image applies. Kept off by
    // default so a touch device never inherits a desktop cursor.
    document.documentElement.classList.add("cursor-marker");

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let dotX = pointerX;
    let dotY = pointerY;
    let ringX = pointerX;
    let ringY = pointerY;
    let magnet: Element | null = null;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      dot.dataset["visible"] = "true";
      ring.dataset["visible"] = "true";

      const target = event.target;
      magnet = target instanceof Element ? target.closest(INTERACTIVE) : null;
    };

    const onLeave = () => {
      dot.dataset["visible"] = "false";
      ring.dataset["visible"] = "false";
      magnet = null;
    };

    const onDown = () => {
      dot.dataset["pressed"] = "true";
    };
    const onUp = () => {
      dot.dataset["pressed"] = "false";
    };

    const tick = () => {
      // Read layout first, write after — interleaving the two is what turns
      // a cursor effect into a scroll stutter.
      const box = magnet?.isConnected ? magnet.getBoundingClientRect() : null;

      // The dot tracks tightly; the ring trails. 0.35 / 0.16 is the point
      // where the ring reads as attached but soft.
      dotX += (pointerX - dotX) * 0.35;
      dotY += (pointerY - dotY) * 0.35;
      dot.style.transform = `translate3d(${dotX.toFixed(1)}px, ${dotY.toFixed(1)}px, 0)`;

      if (box && box.width > 0) {
        // Wrap the hovered element. Padding it slightly means the ring sits
        // just outside the border rather than tracing it exactly.
        const pad = 6;
        const radius = parseFloat(getComputedStyle(magnet as Element).borderRadius) || 8;
        ring.dataset["magnetic"] = "true";
        ring.style.width = `${box.width + pad * 2}px`;
        ring.style.height = `${box.height + pad * 2}px`;
        ring.style.margin = `${-(box.height / 2 + pad)}px 0 0 ${-(box.width / 2 + pad)}px`;
        ring.style.borderRadius = `${radius + pad}px`;
        ringX = box.left + box.width / 2;
        ringY = box.top + box.height / 2;
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
      } else {
        ring.dataset["magnetic"] = "false";
        ring.style.width = "";
        ring.style.height = "";
        ring.style.margin = "";
        ring.style.borderRadius = "";
        ringX += (pointerX - ringX) * 0.16;
        ringY += (pointerY - ringY) * 0.16;
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
      }

      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("cursor-marker");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
