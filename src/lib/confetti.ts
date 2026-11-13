/**
 * The celebration burst.
 *
 * Deliberately not a confetti library. Everything it throws is drawn from
 * this product's own vocabulary — the ribbon's ✦, the three assessment-
 * objective colours, the "m" tile from the wordmark, an examiner's tick, an
 * A* — with a handful of party symbols mixed in. Generic paper rectangles
 * would celebrate anything; these celebrate *this*.
 *
 * Plain DOM rather than React: a burst is ~70 nodes living for two seconds,
 * and reconciling that through a component tree 60 times a second is work for
 * nothing. One container is appended to <body>, animated on a single rAF
 * loop, and removed when the last piece has fallen.
 *
 * Nothing happens at all under `prefers-reduced-motion`. The success state
 * is fully readable without it, which is the test any decoration has to pass.
 */

type Piece = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  rotation: number;
  scale: number;
  life: number;
  ttl: number;
};

/** Emoji get thrown as-is; token pieces are built from the design system. */
type Shape =
  | { kind: "text"; value: string; size: number }
  | { kind: "tile"; value: string; color: string }
  | { kind: "chip"; value: string; color: string; ink?: boolean };

const SHAPES: Shape[] = [
  { kind: "text", value: "🎉", size: 22 },
  { kind: "text", value: "🎊", size: 20 },
  { kind: "text", value: "✨", size: 18 },
  { kind: "text", value: "🥳", size: 20 },
  { kind: "text", value: "✦", size: 20 },
  { kind: "text", value: "✦", size: 14 },
  { kind: "tile", value: "m", color: "var(--primary)" },
  { kind: "tile", value: "✓", color: "var(--success, var(--ao3))" },
  { kind: "chip", value: "AO1", color: "var(--ao1)" },
  { kind: "chip", value: "AO2", color: "var(--ao2)" },
  { kind: "chip", value: "AO3", color: "var(--ao3)" },
  { kind: "chip", value: "A*", color: "var(--plum)" },
];

const GRAVITY = 1500; // px/s², tuned so pieces arc rather than drop
const DRAG = 0.86; // per second, horizontal only — keeps the spread tight

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function makeElement(shape: Shape): HTMLSpanElement {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.willChange = "transform, opacity";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";
  el.style.lineHeight = "1";

  if (shape.kind === "text") {
    el.textContent = shape.value;
    el.style.fontSize = `${shape.size}px`;
    // ✦ is a glyph, not an emoji — it needs a colour or it inherits black.
    if (shape.value === "✦") el.style.color = "var(--primary)";
    return el;
  }

  el.textContent = shape.value;
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.border = "1.5px solid var(--ink)";
  el.style.background = shape.color;
  el.style.color = "var(--background)";
  el.style.fontWeight = "700";
  el.style.fontFamily = "var(--font-sans, system-ui)";

  if (shape.kind === "tile") {
    el.style.width = "22px";
    el.style.height = "22px";
    el.style.borderRadius = "7px";
    el.style.fontSize = "12px";
  } else {
    el.style.padding = "2px 7px";
    el.style.borderRadius = "999px";
    el.style.fontSize = "10px";
    el.style.letterSpacing = "0.02em";
  }
  return el;
}

/**
 * Throws a burst from a point on screen.
 *
 * @param origin viewport coordinates; defaults to just above centre.
 * @param count  number of pieces. 70 is festive; 20 is a click acknowledgement.
 * @param spread half-angle of the cone in radians.
 */
export function fireConfetti(origin?: { x: number; y: number }, count = 70, spread = 1.05): void {
  if (typeof document === "undefined" || prefersReducedMotion()) return;

  const x0 = origin?.x ?? window.innerWidth / 2;
  const y0 = origin?.y ?? window.innerHeight * 0.42;

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;contain:strict";
  document.body.appendChild(container);

  const pieces: Piece[] = [];
  for (let i = 0; i < count; i += 1) {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)] as Shape;
    const el = makeElement(shape);
    container.appendChild(el);

    // Upward cone. -Math.PI / 2 is straight up; the spread fans it either side.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 * spread;
    const speed = 480 + Math.random() * 620;

    pieces.push({
      el,
      x: x0 + (Math.random() - 0.5) * 24,
      y: y0 + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 900,
      rotation: Math.random() * 360,
      scale: 0.72 + Math.random() * 0.55,
      life: 0,
      ttl: 1.5 + Math.random() * 1.1,
    });
  }

  let previous = performance.now();
  let frame = 0;

  const step = (now: number) => {
    // Clamped so a backgrounded tab returning after ten seconds does not
    // teleport every piece off-screen in one integration step.
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;

    let alive = 0;
    for (const p of pieces) {
      p.life += dt;
      if (p.life > p.ttl) {
        if (p.el.style.opacity !== "0") p.el.style.opacity = "0";
        continue;
      }
      alive += 1;

      p.vy += GRAVITY * dt;
      p.vx *= Math.pow(DRAG, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;

      // Fades over the last third of its life rather than blinking out.
      const t = p.life / p.ttl;
      const opacity = t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34;

      p.el.style.opacity = opacity.toFixed(2);
      p.el.style.transform =
        `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) ` +
        `rotate(${p.rotation.toFixed(1)}deg) scale(${p.scale.toFixed(2)})`;
    }

    if (alive > 0) {
      frame = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(frame);
      container.remove();
    }
  };

  frame = requestAnimationFrame(step);

  // Belt and braces: if the tab is hidden the rAF loop pauses, and the
  // container would otherwise sit in the DOM until the tab is looked at again.
  window.setTimeout(() => {
    if (container.isConnected) {
      cancelAnimationFrame(frame);
      container.remove();
    }
  }, 6000);
}

/** The small acknowledgement fired the instant the button is pressed. */
export function fireSpark(origin: { x: number; y: number }): void {
  fireConfetti(origin, 14, 0.7);
}

/** Viewport centre of an element, for aiming a burst at the button pressed. */
export function centreOf(element: HTMLElement | null): { x: number; y: number } | undefined {
  if (!element) return undefined;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
