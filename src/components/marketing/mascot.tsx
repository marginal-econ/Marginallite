/**
 * Original flat-vector artwork for the marketing pages.
 *
 * Drawn in a bold-outline, flat-fill cartoon style: thick ink strokes, round
 * joins, saturated blocks of colour and a mint rim-light down one side. The
 * palette lives in CSS custom properties (--mascot-*) rather than hardcoded
 * hex, so the night theme can re-tint the whole character — cap, sweater,
 * lenses — without touching this file.
 *
 * Everything that moves is driven by CSS (see the "Mascot" block in
 * styles.css) and switches off under prefers-reduced-motion.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const LINE = "var(--mascot-line)";

/**
 * Wraps the mascot in a 3D stage: the character leans toward the pointer,
 * the panel behind it takes a matching perspective tilt, and both ease back
 * to centre when the pointer leaves. Touch devices get the idle animation
 * only — no lean, since there is no hover to lean toward.
 */
export function MascotStage({
  children,
  className,
  strength = 1,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    // Where the pointer wants the character (target) and where it currently
    // is (current). Lerping between them is what stops the head snapping.
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      node.style.setProperty("--mx", currentX.toFixed(4));
      node.style.setProperty("--my", currentY.toFixed(4));
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      // Normalised to roughly -1..1 across a generous area around the art,
      // so the lean starts before the pointer is actually over the panel.
      targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 1.6),
      );
      targetY = Math.max(
        -1,
        Math.min(1, ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 1.6),
      );
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [strength]);

  return (
    <div
      ref={ref}
      className={cn("mascot-stage", className)}
      style={{ "--lean": strength } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * The hero character: a boy in a backwards cap and oversized glasses, pencil
 * tucked into the brim, grinning at a script that just came back better than
 * he expected.
 */
export function StudentMascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={cn("mascot", className)}
      role="img"
      aria-label="Illustration of a smiling boy in a backwards cap and round glasses"
    >
      <defs>
        <linearGradient id="cap-grad" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="var(--mascot-cap)" />
          <stop offset="100%" stopColor="var(--mascot-cap-shade)" />
        </linearGradient>
        <linearGradient id="panel-grad" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="var(--mascot-panel)" />
          <stop offset="100%" stopColor="var(--mascot-panel-2)" />
        </linearGradient>
        <linearGradient id="sweater-grad" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--mascot-sweater)" />
          <stop offset="100%" stopColor="var(--mascot-sweater-2)" />
        </linearGradient>
        <clipPath id="mascot-panel-clip">
          <rect x="10" y="10" width="380" height="380" rx="34" />
        </clipPath>
        <pattern id="mascot-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0v34" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Hard offset shadow — the same "sticker" language as the cards. */}
      <rect x="16" y="16" width="380" height="380" rx="34" fill={LINE} opacity="0.9" />

      <g clipPath="url(#mascot-panel-clip)">
        <rect x="10" y="10" width="380" height="380" rx="34" fill="url(#panel-grad)" />
        <rect x="10" y="10" width="380" height="380" fill="url(#mascot-grid)" />

        {/* Halo behind the head, so the character separates from the panel. */}
        <circle cx="202" cy="188" r="136" fill="#fff" opacity="0.12" className="mascot-halo" />

        {/* Everything below is one figure, scaled about the centre of the
            panel so the character fills the frame instead of floating in the
            middle of it. */}
        <g transform="translate(200 210) scale(1.12) translate(-200 -200)">
          <g className="mascot-gear">
            <circle
              cx="62"
              cy="352"
              r="36"
              fill="var(--mascot-collar)"
              stroke={LINE}
              strokeWidth="7"
            />
            <circle
              cx="62"
              cy="352"
              r="18"
              fill="var(--mascot-panel-2)"
              stroke={LINE}
              strokeWidth="6"
            />
            <path
              d="M50 338a20 20 0 0 1 15-8"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.5"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* ── Body ────────────────────────────────────────────────────────
            Drawn before the head, so the jaw always sits cleanly in front
            of the neck no matter how far the head leans. */}
          <g className="mascot-body">
            {/* Neck — squarer and wider than a stylised female bust would be;
              it is doing a lot of the work of reading as a boy. */}
            <path
              d="M166 254h68v78h-68z"
              fill="var(--mascot-skin-shade)"
              stroke={LINE}
              strokeWidth="7"
            />

            {/* Jumper, on broad square shoulders */}
            <path
              d="M22 400c4-60 46-90 104-100h148c58 10 100 40 104 100z"
              fill="url(#sweater-grad)"
              stroke={LINE}
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M118 318c-15 21-22 48-23 82"
              fill="none"
              stroke={LINE}
              strokeWidth="6"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            {/* Mint rim-light down the left of the jumper */}
            <path
              d="M94 328c-23 17-38 42-42 72"
              fill="none"
              stroke="var(--mascot-mint)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />

            {/* Chunky ribbed collar */}
            <path
              d="M112 384c6-56 36-84 88-84s82 28 88 84z"
              fill="var(--mascot-collar)"
              stroke={LINE}
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M124 380c5-48 32-70 76-70s71 22 76 70"
              fill="none"
              stroke="var(--mascot-band)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <g stroke={LINE} strokeWidth="5" strokeLinecap="round" strokeOpacity="0.65">
              <path d="M143 382c3-34 10-51 17-61" />
              <path d="M172 384c1-36 4-55 7-66" />
              <path d="M200 385v-72" />
              <path d="M228 384c-1-36-4-55-7-66" />
              <path d="M257 382c-3-34-10-51-17-61" />
            </g>
            <ellipse
              cx="200"
              cy="308"
              rx="43"
              ry="14"
              fill="var(--mascot-skin-shade)"
              stroke={LINE}
              strokeWidth="7"
            />
          </g>

          {/* ── Head ────────────────────────────────────────────────────────
            Order matters: the hair goes down first and the face is laid over
            it, so what is left showing is a short rim of hair at the temples
            rather than a shape sitting on top of the cheeks. */}
          <g className="mascot-head">
            {/* Short crop. It reaches only to the cheekbone — below that the
              face covers it, which is what makes it read as cropped rather
              than as hair falling past the jaw. */}
            <path
              d="M98 182c0-76 44-112 102-112s102 36 102 112v56H98z"
              fill="var(--mascot-hair)"
              stroke={LINE}
              strokeWidth="7"
              strokeLinejoin="round"
            />

            {/* Face: straight temples into a square, rounded jaw. */}
            <path
              d="M114 172c0-58 36-90 86-90s86 32 86 90v46c0 46-36 74-86 74s-86-28-86-74z"
              fill="var(--mascot-skin)"
              stroke={LINE}
              strokeWidth="7"
              strokeLinejoin="round"
            />
            {/* Mint rim-light down the left cheek */}
            <path
              d="M130 152c-11 38-11 82 3 112"
              fill="none"
              stroke="var(--mascot-mint)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />
            {/* Warm shade along the right jaw */}
            <path
              d="M270 158c9 42 3 92-20 116"
              fill="none"
              stroke="var(--mascot-skin-shade)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />

            {/* Sideburns, in front of the face */}
            <path
              d="M115 182h22v46c0 12-6 20-16 22-5-14-7-32-6-68z"
              fill="var(--mascot-hair)"
              stroke={LINE}
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M285 182h-22v46c0 12 6 20 16 22 5-14 7-32 6-68z"
              fill="var(--mascot-hair)"
              stroke={LINE}
              strokeWidth="6"
              strokeLinejoin="round"
            />

            {/* Ears */}
            <g className="mascot-ears">
              <ellipse
                cx="102"
                cy="214"
                rx="18"
                ry="22"
                fill="var(--mascot-skin)"
                stroke={LINE}
                strokeWidth="7"
              />
              <path
                d="M102 206c7 3 8 15 1 19"
                fill="none"
                stroke={LINE}
                strokeWidth="5"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />
              <ellipse
                cx="298"
                cy="214"
                rx="18"
                ry="22"
                fill="var(--mascot-skin)"
                stroke={LINE}
                strokeWidth="7"
              />
              <path
                d="M298 206c-7 3-8 15-1 19"
                fill="none"
                stroke={LINE}
                strokeWidth="5"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />
            </g>

            {/* Cap, worn backwards */}
            <g className="mascot-cap">
              <path
                d="M294 112c40-8 72 6 74 28 2 20-30 30-62 22z"
                fill="var(--mascot-cap-shade)"
                stroke={LINE}
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <path
                d="M108 152c-6-72 42-114 100-114s106 42 100 114c-32-26-64-38-100-38s-68 12-100 38z"
                fill="url(#cap-grad)"
                stroke={LINE}
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <path
                d="M208 40c-2 26-2 52 0 74"
                fill="none"
                stroke={LINE}
                strokeWidth="5"
                strokeOpacity="0.4"
              />
              <circle
                cx="208"
                cy="44"
                r="9"
                fill="var(--mascot-cap-shade)"
                stroke={LINE}
                strokeWidth="6"
              />
              <path
                d="M148 90c14-20 34-32 56-34"
                fill="none"
                stroke="#fff"
                strokeOpacity="0.5"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </g>

            {/* Pencil, laid across the brim of the cap. */}
            <g className="mascot-pencil">
              <g transform="translate(30 30) rotate(-30 107 100)">
                <rect
                  x="94"
                  y="34"
                  width="25"
                  height="98"
                  rx="6"
                  fill="var(--mascot-pencil)"
                  stroke={LINE}
                  strokeWidth="6"
                />
                <path d="M94 58h25" stroke={LINE} strokeWidth="5" strokeOpacity="0.55" />
                <path
                  d="M94 34h25l-12.5-25z"
                  fill="var(--mascot-skin)"
                  stroke={LINE}
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                <path d="M101 20h11l-5.5-12z" fill={LINE} />
              </g>
            </g>

            {/* Brows — thick and level, sitting in the strip of forehead the
              cap leaves exposed. */}
            <g
              className="mascot-brows"
              stroke={LINE}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M137 160q23-11 45-3" />
              <path d="M263 160q-23-11-45-3" />
            </g>

            {/* Glasses */}
            <g className="mascot-glasses">
              <path
                d="M127 198l-24-4M273 198l24-4M197 200h6"
                fill="none"
                stroke="var(--mascot-frame)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <circle
                cx="162"
                cy="202"
                r="35"
                fill="var(--mascot-lens)"
                stroke="var(--mascot-frame)"
                strokeWidth="8"
              />
              <circle
                cx="238"
                cy="202"
                r="35"
                fill="var(--mascot-lens)"
                stroke="var(--mascot-frame)"
                strokeWidth="8"
              />
              <path
                d="M139 183a35 35 0 0 0 0 38"
                fill="none"
                stroke="var(--mascot-mint)"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <path
                d="M215 183a35 35 0 0 0 0 38"
                fill="none"
                stroke="var(--mascot-mint)"
                strokeWidth="11"
                strokeLinecap="round"
              />
              {/* Happy, creased-shut eyes */}
              <g
                className="mascot-eyes"
                stroke={LINE}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              >
                <path d="M147 210q15-23 30 0" />
                <path d="M223 210q15-23 30 0" />
              </g>
            </g>

            {/* Nose, and the little stud beside it */}
            <path
              d="M199 228q11 13-4 17"
              fill="none"
              stroke={LINE}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle
              cx="178"
              cy="236"
              r="5.5"
              fill="var(--mascot-mint)"
              stroke={LINE}
              strokeWidth="4"
            />

            {/* Freckles */}
            <g fill={LINE} opacity="0.34">
              <circle cx="146" cy="248" r="3.4" />
              <circle cx="134" cy="259" r="3" />
              <circle cx="155" cy="260" r="2.8" />
              <circle cx="254" cy="248" r="3.4" />
              <circle cx="266" cy="259" r="3" />
              <circle cx="245" cy="260" r="2.8" />
            </g>

            {/* Grin */}
            <g className="mascot-mouth">
              <path
                d="M158 250c29-12 55-12 84 2-7 44-77 46-84-2z"
                fill={LINE}
                stroke={LINE}
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <path
                d="M196 276c17-6 35-2 37 5-5 11-32 12-38 3z"
                fill="var(--mascot-tongue)"
                stroke={LINE}
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <rect x="177" y="251" width="25" height="29" rx="7" fill="#fff" />
              <rect x="205" y="253" width="22" height="25" rx="7" fill="#fff" />
            </g>
          </g>
        </g>

        {/* ── Sparkles ────────────────────────────────────────────────── */}
        <g fill="#fff" className="mascot-sparkles">
          <path
            d="M340 296c2 14 10 22 24 24-14 2-22 10-24 24-2-14-10-22-24-24 14-2 22-10 24-24Z"
            opacity="0.75"
            style={{ "--twinkle-delay": "0ms" } as React.CSSProperties}
          />
          <path
            d="M54 104c1.4 9 6.6 14.2 15.6 15.6-9 1.4-14.2 6.6-15.6 15.6-1.4-9-6.6-14.2-15.6-15.6 9-1.4 14.2-6.6 15.6-15.6Z"
            opacity="0.6"
            style={{ "--twinkle-delay": "700ms" } as React.CSSProperties}
          />
          <path
            d="M352 86c1.1 7 5.2 11.1 12.2 12.2-7 1.1-11.1 5.2-12.2 12.2-1.1-7-5.2-11.1-12.2-12.2 7-1.1 11.1-5.2 12.2-12.2Z"
            opacity="0.5"
            style={{ "--twinkle-delay": "1400ms" } as React.CSSProperties}
          />
        </g>
      </g>

      <rect
        x="10"
        y="10"
        width="380"
        height="380"
        rx="34"
        fill="none"
        stroke={LINE}
        strokeWidth="7"
      />
    </svg>
  );
}

/**
 * A quieter second illustration for the closing panel: a hand ticking a
 * script. Same drawing language, fewer moving parts, so it supports the CTA
 * rather than competing with it.
 */
export function MarkingHand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 220" className={className} role="img" aria-label="A hand marking a page">
      <rect
        x="16"
        y="22"
        width="152"
        height="176"
        rx="14"
        fill="var(--mascot-lens)"
        stroke={LINE}
        strokeWidth="7"
      />
      <path
        d="M40 56h104M40 80h104M40 104h74"
        stroke={LINE}
        strokeOpacity="0.35"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M46 146l20 20 44-48"
        fill="none"
        stroke="var(--mascot-sweater)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tick-draw"
      />

      <g transform="rotate(22 206 120)">
        <rect
          x="192"
          y="40"
          width="28"
          height="122"
          rx="8"
          fill="var(--mascot-pencil)"
          stroke={LINE}
          strokeWidth="7"
        />
        <path d="M192 66h28" stroke={LINE} strokeWidth="5" strokeOpacity="0.6" />
        <path
          d="M192 162h28l-14 28z"
          fill="var(--mascot-skin)"
          stroke={LINE}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path d="M199 180h14l-7 12z" fill={LINE} />
      </g>

      <rect
        x="164"
        y="86"
        width="94"
        height="78"
        rx="30"
        fill="var(--mascot-skin)"
        stroke={LINE}
        strokeWidth="7"
      />
      <path
        d="M180 110h58M180 128h58M180 146h44"
        stroke={LINE}
        strokeOpacity="0.35"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M170 104c10-18 34-24 50-13 9 6 7 19-4 22l-34 8z"
        fill="var(--mascot-skin-shade)"
        stroke={LINE}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M252 88h14a10 10 0 0110 10v54a10 10 0 01-10 10h-14z"
        fill="var(--mascot-collar)"
        stroke={LINE}
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
