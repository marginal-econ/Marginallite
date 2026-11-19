import React from "react";
import { cn } from "@/lib/utils";

interface CosmicAtmosphereProps {
  className?: string;
  variant?: "hero" | "emerald" | "purple" | "cyan" | "amber" | "default";
  sparkles?: boolean;
  density?: "low" | "medium" | "high";
  shootingStars?: boolean;
  birds?: boolean;
  comets?: boolean; // backwards compatibility alias
}

/**
 * 4-point twinkling star SVG with native CSS twinkle animation.
 */
function TwinkleStar({
  top,
  left,
  size = 14,
  delay = "0s",
  duration = "3.5s",
  color = "currentColor",
  className,
}: {
  top: string;
  left: string;
  size?: number;
  delay?: string;
  duration?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("pointer-events-none absolute", className)}
      style={{
        top,
        left,
        animation: `twinkle ${duration} ease-in-out infinite`,
        animationDelay: delay,
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
      >
        <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
      </svg>
    </div>
  );
}

/**
 * Grand Bluish-White Celestial Comet with a long, luminous ethereal tail.
 * Glides majestically across the sky on the start page (Night Theme only).
 */
function GrandBluishComet() {
  return (
    <div className="grand-celestial-comet" aria-hidden="true">
      <div className="grand-comet-container">
        {/* Soft ethereal outer ion vapor plume */}
        <div className="grand-comet-plume" />

        {/* Dense luminous inner tail */}
        <div className="grand-comet-tail">
          {/* Stardust particles trailing behind along the tail stream */}
          <span
            className="grand-comet-stardust size-1.5"
            style={{ right: "80px", top: "-4px" }}
          />
          <span
            className="grand-comet-stardust size-1"
            style={{ right: "160px", top: "5px" }}
          />
          <span
            className="grand-comet-stardust size-1"
            style={{ right: "260px", top: "-3px" }}
          />
          <span
            className="grand-comet-stardust size-0.5"
            style={{ right: "370px", top: "4px" }}
          />
          <span
            className="grand-comet-stardust size-0.5"
            style={{ right: "470px", top: "-2px" }}
          />
        </div>

        {/* Radiant celestial coma and nucleus head */}
        <div className="grand-comet-head">
          <div className="grand-comet-coma" />
          <div className="grand-comet-nucleus" />
          <svg
            viewBox="0 0 24 24"
            className="grand-comet-diffraction"
            fill="#ffffff"
          >
            <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Aerodynamic swallow/hawk bird silhouette with harmonic wing flapping animation.
 * Glides serenely across daytime skies.
 */
function SoaringBird({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 0.44}
      viewBox="0 0 44 20"
      className={cn("overflow-visible bird-wings-silhouette", className)}
      aria-hidden="true"
    >
      <path
        d="M 0,8 C 7,2 14,0 22,7 C 30,0 37,2 44,8 C 36,6 29,9 23,17 C 21,11 15,7 7,7 C 4,7 2,8 0,8 Z"
        fill="currentColor"
      />
    </svg>
  );
}

const STAR_CONFIGS = [
  { top: "6%", left: "8%", size: 13, delay: "0s", duration: "3.2s", color: "text-amber-400/80 dark:text-amber-400/90" },
  { top: "12%", left: "85%", size: 16, delay: "1.0s", duration: "4.0s", color: "text-primary/75 dark:text-primary/90" },
  { top: "18%", left: "42%", size: 10, delay: "2.4s", duration: "2.8s", color: "text-emerald-500/70 dark:text-emerald-400/75" },
  { top: "24%", left: "15%", size: 12, delay: "1.8s", duration: "3.6s", color: "text-violet-500/75 dark:text-violet-400/85" },
  { top: "28%", left: "72%", size: 15, delay: "0.5s", duration: "4.4s", color: "text-amber-500/75 dark:text-amber-300/80" },
  { top: "36%", left: "92%", size: 11, delay: "2.1s", duration: "3.5s", color: "text-cyan-500/75 dark:text-cyan-400/80" },
  { top: "44%", left: "5%", size: 13, delay: "1.3s", duration: "3.9s", color: "text-primary/75 dark:text-primary/85" },
  { top: "52%", left: "48%", size: 10, delay: "3.0s", duration: "3.1s", color: "text-emerald-500/70 dark:text-emerald-300/75" },
  { top: "62%", left: "6%", size: 12, delay: "0.7s", duration: "4.2s", color: "text-violet-500/75 dark:text-violet-300/85" },
  { top: "65%", left: "88%", size: 12, delay: "2.5s", duration: "3.8s", color: "text-amber-500/75 dark:text-amber-400/80" },
  { top: "74%", left: "12%", size: 15, delay: "1.1s", duration: "4.5s", color: "text-primary/80 dark:text-primary/90" },
  { top: "78%", left: "62%", size: 10, delay: "2.8s", duration: "3.0s", color: "text-cyan-500/70 dark:text-cyan-300/75" },
  { top: "85%", left: "38%", size: 13, delay: "1.6s", duration: "4.1s", color: "text-violet-500/75 dark:text-violet-400/85" },
  { top: "90%", left: "82%", size: 11, delay: "0.2s", duration: "3.4s", color: "text-amber-500/75 dark:text-amber-400/80" },
  { top: "94%", left: "20%", size: 10, delay: "2.9s", duration: "3.2s", color: "text-emerald-500/65 dark:text-emerald-400/70" },
  { top: "32%", left: "34%", size: 8, delay: "1.4s", duration: "2.9s", color: "text-primary/60 dark:text-white/80" },
  { top: "68%", left: "75%", size: 9, delay: "3.3s", duration: "3.3s", color: "text-amber-500/65 dark:text-white/85" },
  { top: "15%", left: "25%", size: 8, delay: "0.9s", duration: "3.7s", color: "text-primary/65 dark:text-amber-200/70" },
];

/**
 * Flock of birds gracefully soaring across the day sky on gentle thermal updrafts.
 */
const SOARING_BIRDS = [
  {
    id: "bird-lead",
    top: "11%",
    size: 26,
    scale: 0.85,
    flightDuration: "25s",
    flightDelay: "0s",
    flapSpeed: "1.9s",
    className: "text-slate-600/40 dark:text-slate-400/20",
  },
  {
    id: "bird-wingman",
    top: "15%",
    size: 22,
    scale: 0.68,
    flightDuration: "27s",
    flightDelay: "2.0s",
    flapSpeed: "2.3s",
    className: "text-slate-600/35 dark:text-slate-400/20",
  },
  {
    id: "bird-trailing",
    top: "8%",
    size: 18,
    scale: 0.52,
    flightDuration: "30s",
    flightDelay: "3.6s",
    flapSpeed: "2.1s",
    className: "text-slate-500/30 dark:text-slate-400/15",
  },
  {
    id: "bird-wave2-lead",
    top: "22%",
    size: 24,
    scale: 0.74,
    flightDuration: "26s",
    flightDelay: "13.0s",
    flapSpeed: "2.0s",
    className: "text-slate-600/38 dark:text-slate-400/20",
  },
  {
    id: "bird-wave2-companion",
    top: "19%",
    size: 19,
    scale: 0.58,
    flightDuration: "29s",
    flightDelay: "15.0s",
    flapSpeed: "2.5s",
    className: "text-slate-500/32 dark:text-slate-400/15",
  },
];

export function CosmicAtmosphere({
  className,
  variant = "default",
  sparkles = true,
  density = "medium",
  shootingStars,
  birds,
  comets,
}: CosmicAtmosphereProps) {
  // Support shootingStars / legacy comets toggle (enabled by default on hero)
  const showShootingStars = shootingStars ?? comets ?? (variant === "hero");
  const showBirds = birds ?? (variant === "hero");

  const gradientStyles = {
    hero: (
      <>
        {/* Night space orbs */}
        <div className="absolute top-[-10%] left-[10%] size-[550px] rounded-full bg-primary/14 blur-[120px] dark:bg-primary/28" />
        <div className="absolute top-[20%] right-[5%] size-[500px] rounded-full bg-violet-600/14 blur-[130px] dark:bg-violet-600/28" />
        <div className="absolute bottom-[5%] left-[25%] size-[450px] rounded-full bg-amber-500/10 blur-[110px] dark:bg-amber-500/20" />
      </>
    ),
    emerald: (
      <>
        <div className="absolute top-[5%] left-[15%] size-[480px] rounded-full bg-emerald-500/12 blur-[120px] dark:bg-emerald-500/20" />
        <div className="absolute bottom-[10%] right-[10%] size-[420px] rounded-full bg-primary/12 blur-[110px] dark:bg-primary/20" />
      </>
    ),
    purple: (
      <>
        <div className="absolute top-[10%] right-[15%] size-[520px] rounded-full bg-purple-600/15 blur-[130px] dark:bg-purple-600/25" />
        <div className="absolute bottom-[5%] left-[10%] size-[420px] rounded-full bg-indigo-500/12 blur-[110px] dark:bg-indigo-500/20" />
      </>
    ),
    cyan: (
      <>
        <div className="absolute top-[5%] left-[20%] size-[450px] rounded-full bg-cyan-500/12 blur-[120px] dark:bg-cyan-500/20" />
        <div className="absolute bottom-[10%] right-[15%] size-[450px] rounded-full bg-primary/12 blur-[120px] dark:bg-primary/20" />
      </>
    ),
    amber: (
      <>
        <div className="absolute top-[10%] left-[15%] size-[420px] rounded-full bg-amber-500/12 blur-[110px] dark:bg-amber-500/20" />
        <div className="absolute bottom-[5%] right-[20%] size-[480px] rounded-full bg-primary/12 blur-[120px] dark:bg-primary/20" />
      </>
    ),
    default: (
      <>
        <div className="absolute top-[10%] left-[12%] size-[460px] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/20" />
        <div className="absolute bottom-[10%] right-[8%] size-[480px] rounded-full bg-violet-600/10 blur-[130px] dark:bg-violet-600/20" />
      </>
    ),
  }[variant];

  const starsToRender =
    density === "low"
      ? STAR_CONFIGS.slice(0, 6)
      : density === "high"
      ? STAR_CONFIGS
      : STAR_CONFIGS.slice(0, 12);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-0 overflow-hidden select-none",
        className,
      )}
      aria-hidden="true"
    >
      {/* 1. Ambient Background Gradients */}
      <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-1000">
        {gradientStyles}
      </div>

      {/* 2. Daytime Sky Atmosphere (Active in Light Mode) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden dark:hidden">
        {/* Morning Sunbeam in Top-Right Corner */}
        <div className="daylight-sun-prism absolute -top-28 -right-16 size-[560px] rounded-full bg-gradient-to-br from-amber-300/22 via-orange-200/12 to-transparent blur-[110px]" />
        {/* Soft Sky Blue Breeze in Upper-Left Corner */}
        <div className="absolute -top-20 left-[6%] size-[520px] rounded-full bg-gradient-to-br from-sky-400/16 via-indigo-200/10 to-transparent blur-[120px]" />
        {/* Subtle Warm Prismatic Horizon Glow */}
        <div className="absolute bottom-[-15%] right-[20%] size-[480px] rounded-full bg-gradient-to-tr from-amber-200/15 via-emerald-100/10 to-transparent blur-[100px]" />

        {/* Soaring Birds Flying Across the Daytime Sky */}
        {showBirds && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {SOARING_BIRDS.map((bird) => (
              <div
                key={bird.id}
                className="bird-flight-track"
                style={
                  {
                    top: bird.top,
                    "--flight-duration": bird.flightDuration,
                    "--flight-delay": bird.flightDelay,
                  } as React.CSSProperties
                }
              >
                <div style={{ transform: `scale(${bird.scale})` }}>
                  <div
                    style={
                      {
                        "--flap-speed": bird.flapSpeed,
                      } as React.CSSProperties
                    }
                  >
                    <SoaringBird size={bird.size} className={bird.className} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Deep-Space Starfield Mesh (Night / Dark Theme) */}
      <div className="starfield pointer-events-none absolute inset-0 hidden dark:block" />

      {/* 4. One Grand Bluish-White Celestial Comet with Long Tail (Start page - Night Theme only) */}
      {showShootingStars && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden hidden dark:block">
          <GrandBluishComet />
        </div>
      )}

      {/* 5. Floating Sparkle Stars / Daylight Sun Motes */}
      {sparkles && (
        <div className="pointer-events-none absolute inset-0">
          {starsToRender.map((star, idx) => (
            <TwinkleStar
              key={idx}
              top={star.top}
              left={star.left}
              size={star.size}
              delay={star.delay}
              duration={star.duration}
              className={star.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
