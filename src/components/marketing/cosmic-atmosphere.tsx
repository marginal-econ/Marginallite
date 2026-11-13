import React from "react";
import { cn } from "@/lib/utils";

interface CosmicAtmosphereProps {
  className?: string;
  variant?: "hero" | "emerald" | "pink" | "cyan" | "amber" | "default";
  sparkles?: boolean;
  density?: "low" | "medium" | "high";
  comets?: boolean;
}

type CometTheme = "aurora" | "solar" | "emerald" | "starlight";

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
        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
      >
        <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
      </svg>
    </div>
  );
}

/**
 * High-fidelity mystical celestial comet graphic.
 * Renders an ethereal multi-layer SVG with:
 * - A luminous starlight nucleus and glowing diamond starburst flare
 * - A sharp, energetic ion tail beam
 * - An expansive, soft billowing dust/vapor plume
 * - Trailing stardust sparkles that glint in deep space
 */
function MysticCometGraphic({
  id,
  theme,
  length = 360,
}: {
  id: string;
  theme: CometTheme;
  length?: number;
}) {
  const hx = length - 24;
  const hy = 30;

  // Theme palettes for chromatic dispersion
  const palette = {
    aurora: {
      ionStops: [
        { offset: "0%", color: "#f472b6", opacity: 0 },
        { offset: "32%", color: "#ec4899", opacity: 0.22 },
        { offset: "65%", color: "#f43f5e", opacity: 0.65 },
        { offset: "85%", color: "#fb7185", opacity: 0.92 },
        { offset: "96%", color: "#ffe4e6", opacity: 0.98 },
        { offset: "100%", color: "#ffffff", opacity: 1 },
      ],
      vaporStops: [
        { offset: "0%", color: "#db2777", opacity: 0 },
        { offset: "40%", color: "#e11d48", opacity: 0.1 },
        { offset: "78%", color: "#fb7185", opacity: 0.32 },
        { offset: "95%", color: "#fda4af", opacity: 0.55 },
        { offset: "100%", color: "#fecdd3", opacity: 0.7 },
      ],
      corona: ["#ffffff", "#fda4af", "#f43f5e"],
      sparks: ["#fb7185", "#f472b6"],
      filterGlow: "drop-shadow(0 0 10px rgba(251, 113, 133, 0.85)) drop-shadow(0 0 22px rgba(236, 72, 153, 0.5))",
    },
    solar: {
      ionStops: [
        { offset: "0%", color: "#f43f5e", opacity: 0 },
        { offset: "32%", color: "#f43f5e", opacity: 0.2 },
        { offset: "65%", color: "#f97316", opacity: 0.65 },
        { offset: "85%", color: "#fbbf24", opacity: 0.92 },
        { offset: "96%", color: "#fef08a", opacity: 0.98 },
        { offset: "100%", color: "#ffffff", opacity: 1 },
      ],
      vaporStops: [
        { offset: "0%", color: "#ea580c", opacity: 0 },
        { offset: "40%", color: "#f97316", opacity: 0.1 },
        { offset: "78%", color: "#f59e0b", opacity: 0.3 },
        { offset: "95%", color: "#fbbf24", opacity: 0.5 },
        { offset: "100%", color: "#fef08a", opacity: 0.7 },
      ],
      corona: ["#ffffff", "#fef08a", "#f59e0b"],
      sparks: ["#fbbf24", "#fb7185"],
      filterGlow: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.88)) drop-shadow(0 0 22px rgba(249, 115, 22, 0.45))",
    },
    emerald: {
      ionStops: [
        { offset: "0%", color: "#0d9488", opacity: 0 },
        { offset: "32%", color: "#0f766e", opacity: 0.2 },
        { offset: "65%", color: "#059669", opacity: 0.65 },
        { offset: "85%", color: "#34d399", opacity: 0.92 },
        { offset: "96%", color: "#a7f3d0", opacity: 0.98 },
        { offset: "100%", color: "#ffffff", opacity: 1 },
      ],
      vaporStops: [
        { offset: "0%", color: "#0f766e", opacity: 0 },
        { offset: "40%", color: "#059669", opacity: 0.1 },
        { offset: "78%", color: "#10b981", opacity: 0.3 },
        { offset: "95%", color: "#34d399", opacity: 0.5 },
        { offset: "100%", color: "#6ee7b7", opacity: 0.7 },
      ],
      corona: ["#ffffff", "#a7f3d0", "#10b981"],
      sparks: ["#34d399", "#2dd4bf"],
      filterGlow: "drop-shadow(0 0 10px rgba(52, 211, 153, 0.88)) drop-shadow(0 0 22px rgba(13, 148, 136, 0.45))",
    },
    starlight: {
      ionStops: [
        { offset: "0%", color: "#818cf8", opacity: 0 },
        { offset: "32%", color: "#818cf8", opacity: 0.18 },
        { offset: "65%", color: "#93c5fd", opacity: 0.6 },
        { offset: "85%", color: "#e0f2fe", opacity: 0.9 },
        { offset: "96%", color: "#f8fafc", opacity: 0.98 },
        { offset: "100%", color: "#ffffff", opacity: 1 },
      ],
      vaporStops: [
        { offset: "0%", color: "#60a5fa", opacity: 0 },
        { offset: "40%", color: "#93c5fd", opacity: 0.1 },
        { offset: "78%", color: "#bae6fd", opacity: 0.28 },
        { offset: "95%", color: "#e0f2fe", opacity: 0.45 },
        { offset: "100%", color: "#ffffff", opacity: 0.65 },
      ],
      corona: ["#ffffff", "#e0f2fe", "#38bdf8"],
      sparks: ["#bae6fd", "#c7d2fe"],
      filterGlow: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.6))",
    },
  }[theme];

  return (
    <svg
      viewBox={`0 0 ${length} 60`}
      className="size-full overflow-visible pointer-events-none"
      style={{ filter: palette.filterGlow }}
      aria-hidden="true"
    >
      <defs>
        {/* Primary Ion Beam Linear Gradient */}
        <linearGradient id={`ion-grad-${id}`} x1="0%" y1="50%" x2="100%" y2="50%">
          {palette.ionStops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>

        {/* Diffuse Vapor Dust Plume Gradient */}
        <linearGradient id={`vapor-grad-${id}`} x1="0%" y1="50%" x2="100%" y2="50%">
          {palette.vaporStops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>

        {/* Nucleus Corona Radial Gradient */}
        <radialGradient id={`corona-grad-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.corona[0]} stopOpacity="1" />
          <stop offset="30%" stopColor={palette.corona[1]} stopOpacity="0.85" />
          <stop offset="65%" stopColor={palette.corona[2]} stopOpacity="0.4" />
          <stop offset="100%" stopColor={palette.corona[2]} stopOpacity="0" />
        </radialGradient>

        {/* Soft Vapor Blur Filter */}
        <filter id={`vapor-blur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
      </defs>

      {/* 1. Ethereal Vapor Dust Plume (Expansive Astronomical Tail) */}
      <polygon
        points={`0,${hy} 110,${hy - 6} 220,${hy - 9} ${hx - 20},${hy - 6} ${hx},${hy} ${hx - 20},${hy + 6} 220,${hy + 9} 110,${hy + 6}`}
        fill={`url(#vapor-grad-${id})`}
        filter={`url(#vapor-blur-${id})`}
      />

      {/* 2. Energetic Ion Beam (Tapered Radiant Core Stream) */}
      <polygon
        points={`30,${hy} 170,${hy - 3} ${hx - 10},${hy - 2.5} ${hx},${hy} ${hx - 10},${hy + 2.5} 170,${hy + 3}`}
        fill={`url(#ion-grad-${id})`}
      />

      {/* 3. Incandescent Starlight Thread */}
      <line
        x1="100"
        y1={hy}
        x2={hx}
        y2={hy}
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* 4. Nucleus Corona Glow (Pulsing Plasma Halo) */}
      <circle
        cx={hx}
        cy={hy}
        r="20"
        fill={`url(#corona-grad-${id})`}
        className="mystic-comet-core-glow"
      />

      {/* 5. Mystical Diamond Starburst Glint (Razor 4-Point Glint on Head) */}
      <path
        d={`M ${hx},${hy - 14} Q ${hx},${hy} ${hx + 14},${hy} Q ${hx},${hy} ${hx},${hy + 14} Q ${hx},${hy} ${hx - 14},${hy} Q ${hx},${hy} ${hx},${hy - 14} Z`}
        fill="#ffffff"
        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]"
      />

      {/* 6. Celestial Diffraction Glint Spikes */}
      <line
        x1={hx - 24}
        y1={hy}
        x2={hx + 24}
        y2={hy}
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.85"
      />
      <line
        x1={hx}
        y1={hy - 18}
        x2={hx}
        y2={hy + 18}
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.85"
      />

      {/* 7. Super-Dense White Core Nucleus */}
      <circle cx={hx} cy={hy} r="3.6" fill="#ffffff" />

      {/* 8. Trailing Stardust Sparks (Incandescent Cosmic Particles) */}
      <g className="mystic-stardust-spark">
        <circle cx={hx - 35} cy={hy - 6} r={1.6} fill="#ffffff" opacity={0.9} />
        <circle cx={hx - 65} cy={hy + 7} r={1.4} fill={palette.sparks[0]} opacity={0.85} />
        <circle cx={hx - 105} cy={hy - 4} r={1.2} fill={palette.sparks[1]} opacity={0.75} />
        <circle cx={hx - 145} cy={hy + 6} r={1.5} fill="#ffffff" opacity={0.8} />
        <circle cx={hx - 190} cy={hy - 5} r={1.1} fill={palette.sparks[0]} opacity={0.65} />
        <circle cx={hx - 240} cy={hy + 4} r={0.9} fill={palette.sparks[1]} opacity={0.55} />
        <circle cx={hx - 285} cy={hy - 2} r={0.8} fill="#ffffff" opacity={0.45} />
      </g>
    </svg>
  );
}

const STAR_CONFIGS = [
  { top: "6%", left: "8%", size: 14, delay: "0s", duration: "3.2s", color: "text-amber-400/90" },
  { top: "12%", left: "85%", size: 18, delay: "1.0s", duration: "4.0s", color: "text-primary/90" },
  { top: "18%", left: "42%", size: 10, delay: "2.4s", duration: "2.8s", color: "text-emerald-400/75" },
  { top: "24%", left: "15%", size: 12, delay: "1.8s", duration: "3.6s", color: "text-rose-400/85" },
  { top: "28%", left: "72%", size: 16, delay: "0.5s", duration: "4.4s", color: "text-amber-300/80" },
  { top: "36%", left: "92%", size: 12, delay: "2.1s", duration: "3.5s", color: "text-cyan-400/80" },
  { top: "44%", left: "5%", size: 14, delay: "1.3s", duration: "3.9s", color: "text-primary/85" },
  { top: "52%", left: "48%", size: 11, delay: "3.0s", duration: "3.1s", color: "text-emerald-300/75" },
  { top: "58%", left: "28%", size: 15, delay: "0.7s", duration: "4.2s", color: "text-pink-300/85" },
  { top: "65%", left: "88%", size: 13, delay: "2.5s", duration: "3.8s", color: "text-amber-400/80" },
  { top: "74%", left: "12%", size: 16, delay: "1.1s", duration: "4.5s", color: "text-primary/90" },
  { top: "78%", left: "62%", size: 10, delay: "2.8s", duration: "3.0s", color: "text-cyan-300/75" },
  { top: "85%", left: "38%", size: 14, delay: "1.6s", duration: "4.1s", color: "text-rose-400/85" },
  { top: "90%", left: "82%", size: 12, delay: "0.2s", duration: "3.4s", color: "text-amber-400/80" },
  { top: "94%", left: "20%", size: 10, delay: "2.9s", duration: "3.2s", color: "text-emerald-400/70" },
  { top: "32%", left: "34%", size: 8, delay: "1.4s", duration: "2.9s", color: "text-white/80" },
  { top: "68%", left: "75%", size: 9, delay: "3.3s", duration: "3.3s", color: "text-white/85" },
  { top: "15%", left: "25%", size: 8, delay: "0.9s", duration: "3.7s", color: "text-amber-200/70" },
];

/**
 * Celestial comets configured with realistic cosmic angles and staggered orbital periods.
 * Because tracks are rotated in the flight direction, comets travel naturally head-first
 * with their glorious tails trailing behind them.
 */
const CELESTIAL_COMETS = [
  {
    id: "aurora-prime",
    theme: "aurora" as const,
    top: "6%",
    left: "2%",
    angle: 32,
    duration: "7.8s",
    delay: "0.4s",
    scale: 1.12,
  },
  {
    id: "solar-phoenix",
    theme: "solar" as const,
    top: "20%",
    left: "30%",
    angle: 35,
    duration: "9.2s",
    delay: "3.2s",
    scale: 0.96,
  },
  {
    id: "emerald-nebula",
    theme: "emerald" as const,
    top: "4%",
    left: "54%",
    angle: 29,
    duration: "8.6s",
    delay: "5.8s",
    scale: 1.04,
  },
  {
    id: "starlight-drift",
    theme: "starlight" as const,
    top: "36%",
    left: "14%",
    angle: 30,
    duration: "10.5s",
    delay: "2.2s",
    scale: 0.88,
  },
];

/**
 * Deep-space micro-meteors adding multi-layer cosmic depth.
 */
const MICRO_METEORS = [
  { top: "12%", left: "42%", angle: 33, duration: "4.8s", delay: "1.4s" },
  { top: "5%", left: "76%", angle: 38, duration: "6.2s", delay: "3.6s" },
  { top: "46%", left: "6%", angle: 27, duration: "5.4s", delay: "6.8s" },
  { top: "26%", left: "84%", angle: 36, duration: "5.8s", delay: "2.6s" },
];

export function CosmicAtmosphere({
  className,
  variant = "default",
  sparkles = true,
  density = "medium",
  comets,
}: CosmicAtmosphereProps) {
  const showComets = false;

  const gradientStyles = {
    hero: (
      <>
        <div className="absolute top-[-10%] left-[10%] size-[550px] rounded-full bg-primary/18 blur-[120px] dark:bg-primary/30" />
        <div className="absolute top-[20%] right-[5%] size-[500px] rounded-full bg-rose-500/18 blur-[130px] dark:bg-rose-500/30" />
        <div className="absolute bottom-[5%] left-[25%] size-[450px] rounded-full bg-amber-500/12 blur-[110px] dark:bg-amber-500/20" />
      </>
    ),
    emerald: (
      <>
        <div className="absolute top-[5%] left-[15%] size-[480px] rounded-full bg-emerald-500/12 blur-[120px] dark:bg-emerald-500/20" />
        <div className="absolute bottom-[10%] right-[10%] size-[420px] rounded-full bg-primary/12 blur-[110px] dark:bg-primary/20" />
      </>
    ),
    pink: (
      <>
        <div className="absolute top-[10%] right-[15%] size-[520px] rounded-full bg-primary/15 blur-[130px] dark:bg-primary/25" />
        <div className="absolute bottom-[5%] left-[10%] size-[420px] rounded-full bg-rose-500/12 blur-[110px] dark:bg-rose-500/20" />
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
        <div className="absolute bottom-[10%] right-[8%] size-[480px] rounded-full bg-rose-500/10 blur-[130px] dark:bg-rose-500/20" />
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
      {/* Background Mesh Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-1000">
        {gradientStyles}
      </div>

      {/* Subtle Starfield Mesh */}
      <div className="starfield pointer-events-none absolute inset-0" />

      {/* Mystical Celestial Comets & Stardust Engine */}
      {showComets && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Deep-Space Micro-Meteors */}
          {MICRO_METEORS.map((meteor, idx) => (
            <div
              key={`meteor-${idx}`}
              className="micro-meteor-track"
              style={{
                top: meteor.top,
                left: meteor.left,
                transform: `rotate(${meteor.angle}deg)`,
              }}
            >
              <div
                className="micro-meteor-streak"
                style={
                  {
                    "--meteor-duration": meteor.duration,
                    "--meteor-delay": meteor.delay,
                  } as React.CSSProperties
                }
              />
            </div>
          ))}

          {/* Full-Fidelity Mystical Comets */}
          {CELESTIAL_COMETS.map((comet) => (
            <div
              key={comet.id}
              className="mystic-comet-track"
              style={{
                top: comet.top,
                left: comet.left,
                transform: `rotate(${comet.angle}deg) scale(${comet.scale})`,
              }}
            >
              <div
                className="mystic-comet-body"
                style={
                  {
                    "--comet-duration": comet.duration,
                    "--comet-delay": comet.delay,
                  } as React.CSSProperties
                }
              >
                <MysticCometGraphic id={comet.id} theme={comet.theme} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Sparkle Stars */}
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
