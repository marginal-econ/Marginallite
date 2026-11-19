/**
 * The site footer — shared by the landing page and the legal pages so the
 * legal links, the Cambridge disclaimer and the wordmark can only ever say
 * one thing.
 *
 * It extends the current page surface rather than becoming a separate colour
 * band. The grid and wordmark provide a deliberate ending in either theme.
 */

import { Link } from "@tanstack/react-router";
import { Minimize2 } from "lucide-react";
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

const PRODUCT_LINKS = [
  { label: "Watch it mark", href: "/#try" },
  { label: "What you get back", href: "/#result" },
  { label: "What's inside", href: "/#tools" },
  { label: "Command-word drill", href: "/#drill" },
  { label: "FAQ", href: "/#faq" },
];

// One set of metrics shared by both layers of the wordmark, so the coloured
// copy sits exactly on top of the outlined one. Both are set in a single
// unwrapped line: the size is driven off the viewport, capped so it never
// outgrows the container it sits in.
//
// The tracking keeps neighbouring letters clear of each other; the negative
// right margin cancels the trailing space letter-spacing adds after the
// final L, which would otherwise pull the whole word left of centre.
const WORDMARK_TRACKING = "0.045em";

const WORDMARK_TYPE: CSSProperties = {
  fontSize: "min(13.5vw, 10rem)",
  lineHeight: 1,
  letterSpacing: WORDMARK_TRACKING,
  marginRight: `-${WORDMARK_TRACKING}`,
  fontKerning: "none",
};

/**
 * The wordmark as the page's last word — an outlined watermark that catches
 * the light where the pointer passes over it.
 *
 * Two stacked copies of the same word: the base is outline-only, the copy on
 * top is filled with a colour ramp and masked to a soft circle that follows
 * the pointer. Nothing re-renders on move — the handler writes two CSS
 * variables straight onto the node, which is what keeps it smooth.
 *
 * The outline is NOT `-webkit-text-stroke`. Display faces build a letter from
 * several overlapping pieces — the A's crossbar is its own rectangle, the R's
 * leg its own stroke — and text-stroke traces each piece separately, so the
 * seams inside a letter show up as stray lines crossing it. The filter below
 * instead takes the letters as one solid silhouette, shrinks a copy of it,
 * and knocks that copy out of the original: what's left is a single clean
 * edge around the shape people actually see, seams and all merged away.
 */
function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);

  const track = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--shine-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--shine-y", `${event.clientY - rect.top}px`);
    node.style.setProperty("--shine", "1");
  };

  const rest = () => ref.current?.style.setProperty("--shine", "0");

  return (
    <div
      ref={ref}
      onPointerMove={track}
      onPointerLeave={rest}
      onPointerCancel={rest}
      className="w-full overflow-hidden pb-8 select-none md:pb-10"
      style={
        {
          "--shine": 0,
          "--shine-x": "50%",
          "--shine-y": "50%",
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {/* Erode the silhouette by the outline width, then knock the eroded
          copy back out of it — the remainder is a uniform 1.5px edge around
          the union of every contour, with no internal seams. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <filter id="marginal-wordmark-outline" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="erode" radius="1.5" result="eroded" />
          <feComposite in="SourceGraphic" in2="eroded" operator="out" />
        </filter>
      </svg>

      <div className="mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        <div className="relative">
          {/* Base: the solid word, reduced to its own edge by the filter. */}
          <p
            className="m-0 block text-center font-bold whitespace-nowrap text-foreground opacity-15"
            style={{
              ...WORDMARK_TYPE,
              filter: "url(#marginal-wordmark-outline)",
            }}
          >
            MARGINAL
          </p>

          {/* Shine: the same word filled with a colour ramp, revealed only
              inside a soft circle centred on the pointer. */}
          <p
            className="pointer-events-none absolute inset-0 m-0 block text-center font-bold whitespace-nowrap transition-opacity duration-300 ease-out"
            style={{
              ...WORDMARK_TYPE,
              opacity: "var(--shine)",
              backgroundImage:
                "linear-gradient(100deg, #a78bfa 0%, #fb923c 22%, #fbbf24 40%, #34d399 58%, #38bdf8 78%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              maskImage:
                "radial-gradient(18rem circle at var(--shine-x) var(--shine-y), #000 0%, rgba(0,0,0,0.55) 45%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(18rem circle at var(--shine-x) var(--shine-y), #000 0%, rgba(0,0,0,0.55) 45%, transparent 72%)",
            }}
          >
            MARGINAL
          </p>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter({ onToggleMinimalist }: { onToggleMinimalist?: () => void } = {}) {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background text-foreground">
      <div
        className="paper-grid pointer-events-none absolute inset-0 opacity-[0.11] dark:opacity-[0.08]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.35fr_1.15fr_0.8fr_0.8fr] xl:gap-12">
          <div>
            <span className="flex items-center gap-2.5">
              <img
                src="/marginal-m-icon-clean.png"
                alt="Marginalite AI Cambridge Economics 0455 Prep logo"
                className="size-9 object-contain"
              />
              <span className="font-semibold">Marginalite</span>
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              IGCSE 0455 Economics (0455) essays, marked to the syllabus your school actually
              teaches — with the AO breakdown that says where the grade went.
            </p>
          </div>

          <section aria-labelledby="footer-about-title" className="max-w-sm">
            <p id="footer-about-title" className="eyebrow text-muted-foreground">
              About Marginalite
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Built by Saikrish and Suthir for one syllabus — IGCSE 0455 Economics (0455). We
              are closing the gap between writing an essay and knowing exactly how to improve it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Marginalite facts">
              <span className="rounded-full border border-border bg-surface/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Independent of Cambridge
              </span>
              <span className="rounded-full border border-border bg-surface/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                One syllabus, done carefully
              </span>
            </div>
          </section>

          <nav aria-label="Product">
            <p className="eyebrow text-muted-foreground">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="eyebrow text-muted-foreground">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms &amp; conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  hash="honesty"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Academic honesty
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help &amp; contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* The disclaimer is load-bearing rather than decorative: the syllabus
            code is used to describe what the tool marks, and nothing more. */}
        <div className="mt-12 border-t border-border pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Marginalite is an independent study tool. It is not affiliated with, endorsed by, connected
            to, or in partnership with Cambridge Assessment International Education, Cambridge
            University Press &amp; Assessment, or the University of Cambridge. “IGCSE 0455
            Economics (0455)” is used only to describe the syllabus this tool supports. Marks
            produced by Marginalite are a second opinion for revision; they are not official Cambridge
            marks and carry no weight in any qualification.
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Marginalite is powered by AI and can make mistakes — marks, feedback and text read from a
            photographed script included. Check anything that matters against the syllabus, the mark
            scheme and your teacher. Calibration of the marking standard is carried out by separate
            authorised teams with special access rights, not by teachers or schools.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Marginalite</span>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            {onToggleMinimalist ? (
              <button
                type="button"
                onClick={onToggleMinimalist}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Switch to Minimalist View (Zero animations, clean screen)"
              >
                <Minimize2 className="size-3 text-primary" />
                <span>Minimalist View</span>
              </button>
            ) : null}
            <span className="ml-auto">Built for one syllabus, and nothing else.</span>
          </div>
        </div>
      </div>

      <FooterWordmark />
    </footer>
  );
}
