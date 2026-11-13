/**
 * WCAG 2.1 AA Contrast Ratio Verification Script
 * Validates chromatic contrast ratios for Marginalite's pink theme across light and dark modes.
 */

interface OklchColor {
  name: string;
  l: number;
  c: number;
  h: number;
}

interface ContrastPair {
  name: string;
  fg: OklchColor;
  bg: OklchColor;
  minRatio: number;
  type: "text" | "ui";
}

function oklchToLinearRgb(L: number, C: number, h: number): { r: number; g: number; b: number } {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, bl)),
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function calculateContrast(c1: OklchColor, c2: OklchColor): number {
  const l1 = relativeLuminance(oklchToLinearRgb(c1.l, c1.c, c1.h));
  const l2 = relativeLuminance(oklchToLinearRgb(c2.l, c2.c, c2.h));
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

// Light Mode Theme Tokens
const lightTokens = {
  bg: { name: "Light Background", l: 0.985, c: 0.003, h: 350 },
  fg: { name: "Light Foreground", l: 0.2, c: 0.03, h: 350 },
  primary: { name: "Light Primary (Pink)", l: 0.58, c: 0.22, h: 358 },
  primaryFg: { name: "Light Primary Foreground", l: 0.995, c: 0.005, h: 350 },
  card: { name: "Light Card", l: 1.0, c: 0.0, h: 0 },
  cardFg: { name: "Light Card Foreground", l: 0.2, c: 0.03, h: 350 },
  muted: { name: "Light Muted", l: 0.94, c: 0.015, h: 350 },
  mutedFg: { name: "Light Muted Foreground", l: 0.48, c: 0.04, h: 350 },
  plum: { name: "Light Plum", l: 0.38, c: 0.14, h: 358 },
  plumFg: { name: "Light Plum Foreground", l: 0.98, c: 0.01, h: 358 },
  destructive: { name: "Light Destructive", l: 0.58, c: 0.22, h: 27 },
  destructiveFg: { name: "Light Destructive Foreground", l: 0.99, c: 0.0, h: 0 },
};

// Dark Mode Theme Tokens
const darkTokens = {
  bg: { name: "Dark Background", l: 0.12, c: 0.03, h: 350 },
  fg: { name: "Dark Foreground", l: 0.95, c: 0.01, h: 350 },
  primary: { name: "Dark Primary (Pink)", l: 0.76, c: 0.17, h: 354 },
  primaryFg: { name: "Dark Primary Foreground", l: 0.12, c: 0.03, h: 350 },
  card: { name: "Dark Card", l: 0.16, c: 0.03, h: 350 },
  cardFg: { name: "Dark Card Foreground", l: 0.95, c: 0.01, h: 350 },
  muted: { name: "Dark Muted", l: 0.2, c: 0.03, h: 350 },
  mutedFg: { name: "Dark Muted Foreground", l: 0.7, c: 0.03, h: 350 },
  plum: { name: "Dark Plum", l: 0.32, c: 0.12, h: 354 },
  plumFg: { name: "Dark Plum Foreground", l: 0.98, c: 0.01, h: 354 },
  destructive: { name: "Dark Destructive", l: 0.55, c: 0.22, h: 27 },
  destructiveFg: { name: "Dark Destructive Foreground", l: 0.99, c: 0.0, h: 0 },
};

const PAIRS: ContrastPair[] = [
  // Light Mode Pairs
  { name: "Light: Body Text (fg on bg)", fg: lightTokens.fg, bg: lightTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Light: Button Text (primaryFg on primary)", fg: lightTokens.primaryFg, bg: lightTokens.primary, minRatio: 4.5, type: "text" },
  { name: "Light: Primary Accent on Background", fg: lightTokens.primary, bg: lightTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Light: Card Text (cardFg on card)", fg: lightTokens.cardFg, bg: lightTokens.card, minRatio: 4.5, type: "text" },
  { name: "Light: Muted Text (mutedFg on bg)", fg: lightTokens.mutedFg, bg: lightTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Light: Plum Headline (plumFg on plum)", fg: lightTokens.plumFg, bg: lightTokens.plum, minRatio: 4.5, type: "text" },
  { name: "Light: Destructive Button (destructiveFg on destructive)", fg: lightTokens.destructiveFg, bg: lightTokens.destructive, minRatio: 4.5, type: "text" },

  // Dark Mode Pairs
  { name: "Dark: Body Text (fg on bg)", fg: darkTokens.fg, bg: darkTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Dark: Button Text (primaryFg on primary)", fg: darkTokens.primaryFg, bg: darkTokens.primary, minRatio: 4.5, type: "text" },
  { name: "Dark: Primary Accent on Background", fg: darkTokens.primary, bg: darkTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Dark: Card Text (cardFg on card)", fg: darkTokens.cardFg, bg: darkTokens.card, minRatio: 4.5, type: "text" },
  { name: "Dark: Muted Text (mutedFg on bg)", fg: darkTokens.mutedFg, bg: darkTokens.bg, minRatio: 4.5, type: "text" },
  { name: "Dark: Plum Headline (plumFg on plum)", fg: darkTokens.plumFg, bg: darkTokens.plum, minRatio: 4.5, type: "text" },
  { name: "Dark: Destructive Button (destructiveFg on destructive)", fg: darkTokens.destructiveFg, bg: darkTokens.destructive, minRatio: 4.5, type: "text" },
];

export function runContrastCheck(): boolean {
  console.log("=== Marginalite WCAG 2.1 AA Contrast Verification ===\n");
  let passed = true;

  for (const pair of PAIRS) {
    const ratio = calculateContrast(pair.fg, pair.bg);
    const pass = ratio >= pair.minRatio;
    const mark = pass ? "✓ PASS" : "✗ FAIL";
    console.log(
      `${mark} [${pair.name}] -> ${ratio.toFixed(2)}:1 (required: >= ${pair.minRatio.toFixed(1)}:1)`
    );

    if (!pass) {
      passed = false;
      console.error(
        `   Error: ${pair.fg.name} against ${pair.bg.name} failed WCAG AA ratio ${pair.minRatio}:1!`
      );
    }
  }

  console.log("\n-----------------------------------------------------");
  if (passed) {
    console.log("✓ ALL WCAG 2.1 AA CONTRAST RATIO CHECKS PASSED SUCCESSFULLY.");
  } else {
    console.error("✗ ONE OR MORE CONTRAST CHECKS FAILED.");
  }
  return passed;
}

// Run directly
const success = runContrastCheck();
if (!success) {
  process.exit(1);
}
