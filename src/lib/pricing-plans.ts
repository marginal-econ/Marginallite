/**
 * Dynamic Pricing Plans configuration for Cambridge 0455 Economics.
 * Default tiers with prices, monthly essay quotas, live credits, and feature flags.
 */

export interface PricingTierConfig {
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualEquivalentMonthly: number;
  savePct: number;
  essaysPerMonth: number;
  liveCredits: number;
  hasExperimentalLabs: boolean;
  features: string[];
}

export interface PlatformPricingPlans {
  foundation: PricingTierConfig;
  scholar_plus: PricingTierConfig;
  pro: PricingTierConfig;
  mastery: PricingTierConfig;
  elite: PricingTierConfig;
}

export const DEFAULT_PRICING_PLANS: PlatformPricingPlans = {
  foundation: {
    name: "Foundation Scholar",
    tagline: "Accessible entry point: less than a coffee, flat ₹99/mo for 8 essays & 2 Live Examiner sessions.",
    monthlyPrice: 99,
    annualPrice: 1188,
    annualEquivalentMonthly: 99,
    savePct: 0,
    essaysPerMonth: 8,
    liveCredits: 2,
    hasExperimentalLabs: false,
    features: [
      "8 Cambridge Graded Essays / month",
      "2 Live Examiner Credits / month (25 min Real-time AI Coaching)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers",
    ],
  },
  scholar_plus: {
    name: "Scholar Plus",
    tagline: "Focused exam booster: flat ₹199/mo for 15 essays & 4 Live Examiner sessions.",
    monthlyPrice: 199,
    annualPrice: 1999,
    annualEquivalentMonthly: 166,
    savePct: 16,
    essaysPerMonth: 15,
    liveCredits: 4,
    hasExperimentalLabs: false,
    features: [
      "15 Cambridge Graded Essays / month",
      "4 Live Examiner Credits / month (30 min Real-time AI Coaching)",
      "Unlimited Instant In-Browser Grammar & Economics Terminology Checks (< 50ms)",
      "Full AO1, AO2, AO3 Diagnostic Reports & Mark Scheme Matching",
      "Cambridge Definitions Hub & Drills",
      "Exemplar Showcase & Past MCQ Papers with Explanations",
      "All Foundation features included",
    ],
  },
  pro: {
    name: "Pro Accelerator",
    tagline: "The benchmark for serious Cambridge candidates: 25 essays & 8 Live Examiner sessions.",
    monthlyPrice: 399,
    annualPrice: 3499,
    annualEquivalentMonthly: 291,
    savePct: 27,
    essaysPerMonth: 25,
    liveCredits: 8,
    hasExperimentalLabs: false,
    features: [
      "25 Cambridge Graded Essays / month",
      "8 Live Examiner Credits / month (35m timed exam drill AI coaching)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Sub-second Cambridge AO Sentence Diagnostics & Causal Chains",
      "Perfect Essay Generator (AI Model Answers)",
      "Dual-Model Principal Examiner Arbitration",
      "Real-time Diagram Integration Suggestions",
      "All Foundation features included",
    ],
  },
  mastery: {
    name: "A* Mastery Sprint",
    tagline: "Peak revision powerhouse for Oct/Nov & May/June exam series: 50 essays & 14 Live Examiner sessions.",
    monthlyPrice: 699,
    annualPrice: 5999,
    annualEquivalentMonthly: 499,
    savePct: 28,
    essaysPerMonth: 50,
    liveCredits: 14,
    hasExperimentalLabs: false,
    features: [
      "Multi-Paper Diagnostic Feedback & Evaluative Refinements",
      "50 Cambridge Graded Essays / month",
      "14 Live Examiner Credits / month (40m extended AI coaching, priority queue)",
      "Unlimited Instant In-Browser Grammar & Mechanics Checks",
      "Handwritten Essay OCR Scanning (Photo Uploads)",
      "Holistic Review Panel & Syllabus Weakness Heatmap",
      "Level 4 & 5 Evaluative Refinement Engine",
      "All Pro features included",
    ],
  },
  elite: {
    name: "Cambridge Elite Pass",
    tagline: "VIP all-inclusive pass for complete syllabus dominance: 75 essays & 22 Live Examiner sessions.",
    monthlyPrice: 999,
    annualPrice: 8999,
    annualEquivalentMonthly: 749,
    savePct: 25,
    essaysPerMonth: 75,
    liveCredits: 22,
    hasExperimentalLabs: false,
    features: [
      "Comprehensive Cambridge Evaluation Suite (Papers 1, 2, 3 & 4 Coverage)",
      "75 Cambridge Graded Essays / month & Reworks",
      "22 Live Examiner Credits / month (45m Cambridge exam timing)",
      "Unlimited Instant In-Browser Grammar & Terminology Checks",
      "Dedicated High-Speed Flash Acceleration Queue",
      "Bespoke Past Paper Exam Series Generation",
      "Direct 1-on-1 examiner support channel",
      "All Mastery features included",
    ],
  },
};

export const FREE_STARTER_TIER = {
  id: "free",
  name: "Free Starter",
  tagline: "Instant start: try Cambridge 0455 examiner marking risk-free.",
  price: "₹0",
  period: "Lifetime",
  quota: "2 Graded Essays (Lifetime) · 30-Day MCQ",
  badge: "Get Started Free",
  features: [
    "2 Full Cambridge Graded Essays (Lifetime)",
    "30-Day Full MCQ Past Paper Access with Explanations",
    "Unlimited Instant In-Browser Grammar & Economics Terminology Checks",
    "Full AO1, AO2, AO3 Diagnostic Reports",
    "Cambridge Definitions Hub & Drills",
  ],
};
