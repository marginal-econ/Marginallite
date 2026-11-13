export type DiagramPreset =
  | "tax"
  | "price_floor"
  | "price_ceiling"
  | "tariff"
  | "monopoly"
  | "externality"
  | "macro_ad_as";

export interface DiagramState {
  preset: DiagramPreset;
  // Supply & Demand Parameters
  demandIntercept: number; // A_d (e.g. 90)
  demandSlope: number; // B_d (elasticity control, e.g. 0.8)
  demandShift: number; // delta D (e.g. 0)
  supplyIntercept: number; // A_s (e.g. 10)
  supplySlope: number; // B_s (elasticity control, e.g. 0.8)
  supplyShift: number; // delta S (e.g. 0)
  // Policy parameters
  taxAmount: number; // specific indirect tax
  subsidyAmount: number;
  priceControl: number | null; // min or max price
  worldPrice: number; // for tariffs (e.g. 30)
  tariffAmount: number; // tariff on imports (e.g. 10)
  externalityCost: number; // for negative externalities (MEC)
}

export interface EquilibriumPoint {
  q: number;
  p: number;
  label: string;
}

export interface ShadedPolygon {
  id: string;
  label: string;
  points: { q: number; p: number }[];
  fillClass: string;
  strokeClass: string;
  areaValue: number;
  description: string;
}

export interface DiagramMetrics {
  eqQ: number;
  eqP: number;
  initialQ: number;
  initialP: number;
  consumerSurplus: number;
  producerSurplus: number;
  taxRevenue: number;
  deadweightLoss: number;
  consumerTaxBurdenPct: number;
  producerTaxBurdenPct: number;
  shortageOrSurplus: number; // for price controls
  importsWithoutTariff: number;
  importsWithTariff: number;
  tariffRevenue: number;
}

export interface DiagramDrill {
  id: string;
  title: string;
  paperReference: string;
  prompt: string;
  hint: string;
  preset: DiagramPreset;
  targetCheck: (state: DiagramState, metrics: DiagramMetrics) => {
    passed: boolean;
    feedback: string;
    score: number; // out of 3
  };
}
