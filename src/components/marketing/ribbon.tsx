/**
 * The ribbon across the foot of the hero.
 *
 * It is an actual ribbon, not a band running off both edges of the screen:
 * a printed centre panel inset from the viewport, with two folded tails
 * falling behind it and a swallowtail cut in each outer end. The tails are
 * drawn as SVG so the ink outline follows the notch — a CSS clip-path would
 * shear the border off along exactly the edge that needs one most.
 *
 * The scrolling text holds the phrase list twice and translates exactly
 * -50%, so the loop is seamless with no visible reset.
 *
 * Decorative throughout: aria-hidden, pointer-transparent, and the
 * reduced-motion block in styles.css stops the scroll dead (leaving a
 * legible static band rather than removing it).
 */

/** One folded tail: a rectangle with a V cut out of its outer end. */
function Tail({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 88 52"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M88 3H6l19 23L6 49h82z"
        fill="var(--plum-deep)"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Ribbon({ items, className }: { items: string[]; className?: string }) {
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      className={"ribbon pointer-events-none absolute z-20 select-none " + (className ?? "")}
    >
      <Tail className="ribbon-tail ribbon-tail-left" />
      <Tail className="ribbon-tail ribbon-tail-right" />

      <div className="ribbon-band">
        <div className="marquee-track">
          {doubled.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex shrink-0 items-center gap-6 px-6 text-sm font-semibold tracking-wide"
            >
              {item}
              <span className="opacity-55">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
