import type { DiagramSpec } from "@/lib/diagrams/spec";

// 1. AD/AS Rightward Shift (Direct Income Support Stimulus / Fiscal Expansion)
export const adAsRightwardShiftDiagram: DiagramSpec = {
  xLabel: "Real Output / Real GDP (Y)",
  yLabel: "General Price Level (PL)",
  curves: [
    {
      points: [
        [15, 80],
        [85, 20],
      ],
      label: "AD₁",
      tone: "demand",
      labelAt: [87, 20],
    },
    {
      points: [
        [30, 85],
        [95, 30],
      ],
      label: "AD₂",
      tone: "demand",
      dashed: true,
      labelAt: [97, 30],
    },
    {
      points: [
        [15, 25],
        [50, 45],
        [80, 85],
      ],
      label: "SRAS",
      tone: "supply",
      labelAt: [82, 85],
    },
  ],
  arrows: [{ from: [50, 50], to: [63, 57], label: "+G / +C" }],
  markers: [
    { at: [48, 44], label: "E₁ (P₁, Y₁)", guides: "both" },
    { at: [64, 58], label: "E₂ (P₂, Y₂)", guides: "both" },
  ],
  xTicks: [
    { at: 48, label: "Y₁" },
    { at: 64, label: "Y₂" },
  ],
  yTicks: [
    { at: 44, label: "P₁" },
    { at: 58, label: "P₂" },
  ],
};

// 2. Supply Shift for Substitutes (EV Subsidy causing Petrol Cars Demand Fall)
export const evSubsidyDemandFallDiagram: DiagramSpec = {
  xLabel: "Quantity of Petrol Cars (Q)",
  yLabel: "Price of Petrol Cars (P)",
  curves: [
    {
      points: [
        [20, 80],
        [80, 20],
      ],
      label: "D₁",
      tone: "demand",
      labelAt: [82, 20],
    },
    {
      points: [
        [10, 70],
        [70, 10],
      ],
      label: "D₂",
      tone: "demand",
      dashed: true,
      labelAt: [72, 10],
    },
    {
      points: [
        [20, 20],
        [80, 80],
      ],
      label: "S",
      tone: "supply",
      labelAt: [82, 80],
    },
  ],
  arrows: [{ from: [50, 50], to: [40, 40], label: "Demand Shift" }],
  markers: [
    { at: [50, 50], label: "E₁", guides: "both" },
    { at: [40, 40], label: "E₂", guides: "both" },
  ],
  xTicks: [
    { at: 40, label: "Q₂" },
    { at: 50, label: "Q₁" },
  ],
  yTicks: [
    { at: 40, label: "P₂" },
    { at: 50, label: "P₁" },
  ],
};

// 3. Labour Market Minimum Wage Diagram (Wmin above We causing surplus)
export const minimumWageLabourDiagram: DiagramSpec = {
  xLabel: "Quantity of Labour (Q)",
  yLabel: "Wage Rate (W)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "DL (MRP)",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 85],
      ],
      label: "SL",
      tone: "supply",
      labelAt: [87, 85],
    },
    {
      points: [
        [10, 68],
        [90, 68],
      ],
      label: "Wmin",
      tone: "warn",
      dashed: true,
      labelAt: [92, 68],
    },
  ],
  markers: [
    { at: [50, 50], label: "We, Qe", guides: "both" },
    { at: [32, 68], label: "Qd", guides: "x" },
    { at: [68, 68], label: "Qs", guides: "x" },
  ],
  notes: [{ at: [50, 75], text: "Surplus of Labour / Unemployment (Qs - Qd)", align: "middle" }],
  xTicks: [
    { at: 32, label: "Qd" },
    { at: 50, label: "Qe" },
    { at: 68, label: "Qs" },
  ],
  yTicks: [
    { at: 50, label: "We" },
    { at: 68, label: "Wmin" },
  ],
};

// 4. Cost-Push Inflation AD/AS Diagram (SRAS shift left)
export const costPushInflationDiagram: DiagramSpec = {
  xLabel: "Real GDP (Y)",
  yLabel: "General Price Level (PL)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "AD",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 20],
        [50, 50],
        [85, 80],
      ],
      label: "SRAS₁",
      tone: "supply",
      labelAt: [87, 80],
    },
    {
      points: [
        [10, 40],
        [40, 65],
        [75, 90],
      ],
      label: "SRAS₂",
      tone: "supply",
      dashed: true,
      labelAt: [77, 90],
    },
  ],
  arrows: [{ from: [50, 50], to: [40, 60], label: "+Energy Costs" }],
  markers: [
    { at: [50, 50], label: "E₁ (P₁, Y₁)", guides: "both" },
    { at: [38, 62], label: "E₂ (P₂, Y₂)", guides: "both" },
  ],
  notes: [{ at: [55, 78], text: "Stagflation: Higher PL & Lower Real GDP", align: "start" }],
  xTicks: [
    { at: 38, label: "Y₂" },
    { at: 50, label: "Y₁" },
  ],
  yTicks: [
    { at: 50, label: "P₁" },
    { at: 62, label: "P₂" },
  ],
};

// 5. The J-Curve Effect Diagram (Depreciation Trade Balance Trajectory)
export const jCurveDiagram: DiagramSpec = {
  xLabel: "Time (Months after Currency Depreciation)",
  yLabel: "Current Account Balance (+ Surplus / - Deficit)",
  curves: [
    {
      points: [
        [10, 50],
        [20, 20],
        [35, 15],
        [50, 30],
        [65, 50],
        [85, 75],
        [95, 85],
      ],
      label: "Current Account Path",
      tone: "accent",
      labelAt: [96, 85],
    },
    {
      points: [
        [0, 50],
        [100, 50],
      ],
      label: "Zero Balance (X = M)",
      tone: "neutral",
      dashed: true,
      labelAt: [97, 50],
    },
  ],
  notes: [
    { at: [28, 12], text: "Short-run: Inelastic PED (Deficit worsens)", align: "middle" },
    { at: [80, 68], text: "Long-run: ML condition holds (Surplus)", align: "middle" },
  ],
  xTicks: [
    { at: 10, label: "Depreciation" },
    { at: 65, label: "Breakeven" },
  ],
  yTicks: [
    { at: 20, label: "Deficit" },
    { at: 50, label: "0" },
    { at: 80, label: "Surplus" },
  ],
};

// 6. Tax Incidence / Demerit Good Specific Indirect Tax
export const taxIncidenceDiagram: DiagramSpec = {
  xLabel: "Quantity (Q)",
  yLabel: "Price (P)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "Demand",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 85],
      ],
      label: "S₁",
      tone: "supply",
      labelAt: [87, 85],
    },
    {
      points: [
        [10, 35],
        [75, 95],
      ],
      label: "S₂ (Tax)",
      tone: "supply",
      dashed: true,
      labelAt: [77, 95],
    },
  ],
  markers: [
    { at: [50, 50], label: "E₁ (P₁, Q₁)", guides: "both" },
    { at: [40, 60], label: "E₂ (P₂, Q₂)", guides: "both" },
  ],
  arrows: [{ from: [45, 45], to: [38, 56], label: "+Tax" }],
  xTicks: [
    { at: 40, label: "Q₂" },
    { at: 50, label: "Q₁" },
  ],
  yTicks: [
    { at: 50, label: "P₁" },
    { at: 60, label: "P₂" },
  ],
};

// 7. Maximum Price / Price Ceiling (Rent Control / Food Price Cap with Shortage)
export const maxPriceCeilingDiagram: DiagramSpec = {
  xLabel: "Quantity (Q)",
  yLabel: "Price (P)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "Demand",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 85],
      ],
      label: "Supply",
      tone: "supply",
      labelAt: [87, 85],
    },
    {
      points: [
        [10, 35],
        [90, 35],
      ],
      label: "Pmax (Ceiling)",
      tone: "warn",
      dashed: true,
      labelAt: [92, 35],
    },
  ],
  markers: [
    { at: [50, 50], label: "Equilibrium (Pe, Qe)", guides: "both" },
    { at: [35, 35], label: "Qs", guides: "x" },
    { at: [65, 35], label: "Qd", guides: "x" },
  ],
  notes: [{ at: [50, 25], text: "Shortage / Excess Demand (Qd - Qs)", align: "middle" }],
  xTicks: [
    { at: 35, label: "Qs" },
    { at: 50, label: "Qe" },
    { at: 65, label: "Qd" },
  ],
  yTicks: [
    { at: 35, label: "Pmax" },
    { at: 50, label: "Pe" },
  ],
};

// 8. Negative Production Externality (MSC > MPC, Deadweight Loss)
export const negativeExternalityDiagram: DiagramSpec = {
  xLabel: "Quantity (Q)",
  yLabel: "Cost / Benefit / Price",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "MPB = MSB",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 75],
      ],
      label: "MPC",
      tone: "supply",
      labelAt: [87, 75],
    },
    {
      points: [
        [10, 35],
        [75, 95],
      ],
      label: "MSC (MPC + MEC)",
      tone: "warn",
      dashed: true,
      labelAt: [77, 95],
    },
  ],
  markers: [
    { at: [53, 47], label: "Qm (Market)", guides: "both" },
    { at: [43, 57], label: "Qopt (Social)", guides: "both" },
  ],
  notes: [{ at: [55, 68], text: "Welfare Loss / Overproduction", align: "start" }],
  xTicks: [
    { at: 43, label: "Qopt" },
    { at: 53, label: "Qm" },
  ],
  yTicks: [
    { at: 47, label: "Pm" },
    { at: 57, label: "Popt" },
  ],
};

// 9. Monopoly Profit Maximization & Deadweight Loss
export const monopolyDeadweightDiagram: DiagramSpec = {
  xLabel: "Quantity (Q)",
  yLabel: "Revenue / Cost / Price",
  curves: [
    {
      points: [
        [10, 90],
        [90, 10],
      ],
      label: "AR (Demand)",
      tone: "demand",
      labelAt: [92, 10],
    },
    {
      points: [
        [10, 90],
        [50, 10],
      ],
      label: "MR",
      tone: "revenue",
      labelAt: [52, 10],
    },
    {
      points: [
        [15, 30],
        [85, 70],
      ],
      label: "MC",
      tone: "cost",
      labelAt: [87, 70],
    },
  ],
  markers: [
    { at: [33, 40], label: "MC=MR", guides: "none" },
    { at: [33, 67], label: "Pm, Qm", guides: "both" },
    { at: [52, 48], label: "Pc, Qc", guides: "both" },
  ],
  notes: [{ at: [45, 60], text: "Supernormal Profit & DWL", align: "start" }],
  xTicks: [
    { at: 33, label: "Qm" },
    { at: 52, label: "Qc" },
  ],
  yTicks: [
    { at: 48, label: "Pc" },
    { at: 67, label: "Pm" },
  ],
};

// 10. Monopsony Labour Market
export const monopsonyLabourDiagram: DiagramSpec = {
  xLabel: "Quantity of Labour (L)",
  yLabel: "Wage Rate / Labour Cost (W)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "MRP / DL",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 70],
      ],
      label: "ACL / Supply of Labour",
      tone: "supply",
      labelAt: [87, 70],
    },
    {
      points: [
        [15, 20],
        [60, 90],
      ],
      label: "MCL",
      tone: "warn",
      dashed: true,
      labelAt: [62, 90],
    },
  ],
  markers: [
    { at: [37, 54], label: "MCL = MRP", guides: "none" },
    { at: [37, 33], label: "Wm (Monopsony)", guides: "both" },
    { at: [50, 48], label: "Wc, Lc (Competitive)", guides: "both" },
  ],
  notes: [{ at: [42, 22], text: "Monopsony Exploitation: Wm < Wc and Lm < Lc", align: "middle" }],
  xTicks: [
    { at: 37, label: "Lm" },
    { at: 50, label: "Lc" },
  ],
  yTicks: [
    { at: 33, label: "Wm" },
    { at: 48, label: "Wc" },
  ],
};

// 11. Tariff on Imports (World Price + Tariff)
export const tariffProtectionDiagram: DiagramSpec = {
  xLabel: "Quantity (Q)",
  yLabel: "Price (P)",
  curves: [
    {
      points: [
        [15, 85],
        [85, 15],
      ],
      label: "Domestic Demand",
      tone: "demand",
      labelAt: [87, 15],
    },
    {
      points: [
        [15, 15],
        [85, 85],
      ],
      label: "Domestic Supply",
      tone: "supply",
      labelAt: [87, 85],
    },
    {
      points: [
        [10, 30],
        [90, 30],
      ],
      label: "Pw (World Price)",
      tone: "neutral",
      dashed: true,
      labelAt: [92, 30],
    },
    {
      points: [
        [10, 45],
        [90, 45],
      ],
      label: "Pw + Tariff",
      tone: "warn",
      dashed: true,
      labelAt: [92, 45],
    },
  ],
  markers: [
    { at: [30, 30], label: "Q₁", guides: "x" },
    { at: [45, 45], label: "Q₂", guides: "x" },
    { at: [55, 45], label: "Q₃", guides: "x" },
    { at: [70, 30], label: "Q₄", guides: "x" },
  ],
  notes: [{ at: [50, 52], text: "Imports contract from (Q4-Q1) to (Q3-Q2)", align: "middle" }],
  xTicks: [
    { at: 30, label: "Q₁" },
    { at: 45, label: "Q₂" },
    { at: 55, label: "Q₃" },
    { at: 70, label: "Q₄" },
  ],
  yTicks: [
    { at: 30, label: "Pw" },
    { at: 45, label: "Pw+t" },
  ],
};

// 12. Floating Foreign Exchange Market (Interest rate hike causing currency appreciation)
export const forexAppreciationDiagram: DiagramSpec = {
  xLabel: "Quantity of Currency Traded (Q)",
  yLabel: "Exchange Rate (USD per Local Currency)",
  curves: [
    {
      points: [
        [20, 80],
        [80, 20],
      ],
      label: "D₁",
      tone: "demand",
      labelAt: [82, 20],
    },
    {
      points: [
        [35, 85],
        [95, 25],
      ],
      label: "D₂ (Hot Money)",
      tone: "demand",
      dashed: true,
      labelAt: [97, 25],
    },
    {
      points: [
        [20, 20],
        [80, 80],
      ],
      label: "S₁",
      tone: "supply",
      labelAt: [82, 80],
    },
  ],
  arrows: [{ from: [50, 50], to: [63, 62], label: "Higher Rates" }],
  markers: [
    { at: [50, 50], label: "E₁ (ER₁)", guides: "both" },
    { at: [64, 64], label: "E₂ (ER₂)", guides: "both" },
  ],
  notes: [{ at: [75, 75], text: "Currency Appreciates", align: "middle" }],
  xTicks: [
    { at: 50, label: "Q₁" },
    { at: 64, label: "Q₂" },
  ],
  yTicks: [
    { at: 50, label: "ER₁" },
    { at: 64, label: "ER₂" },
  ],
};

// 13. Production Possibility Curve (PPC) Outward Shift (Growth / Capital / AI Investment)
export const ppcOutwardShiftDiagram: DiagramSpec = {
  xLabel: "Manufactured Goods / Output (X)",
  yLabel: "Services / Other Goods (Y)",
  curves: [
    {
      points: [
        [15, 85],
        [45, 75],
        [75, 45],
        [85, 15],
      ],
      label: "PPC₁",
      tone: "neutral",
      labelAt: [87, 15],
    },
    {
      points: [
        [22, 95],
        [60, 85],
        [88, 55],
        [95, 22],
      ],
      label: "PPC₂",
      tone: "supply",
      dashed: true,
      labelAt: [97, 22],
    },
  ],
  arrows: [{ from: [50, 65], to: [66, 76], label: "Productive Capacity Expansion" }],
};

// 14. Production Possibility Curve (PPC) with Inward Point (Unemployment / Underutilization)
export const ppcUnemploymentPointDiagram: DiagramSpec = {
  xLabel: "Industrial Output (X)",
  yLabel: "Agricultural Goods (Y)",
  curves: [
    {
      points: [
        [15, 85],
        [45, 75],
        [75, 45],
        [85, 15],
      ],
      label: "PPC Frontier (Potential Capacity)",
      tone: "neutral",
      labelAt: [87, 15],
    },
    {
      points: [
        [12, 65],
        [34, 55],
        [55, 34],
        [65, 12],
      ],
      label: "Inner Locus (Underutilization)",
      tone: "demand",
      dashed: true,
      labelAt: [67, 12],
    },
  ],
  markers: [
    { at: [52, 65], label: "A (Full Capacity)", guides: "both" },
    { at: [34, 38], label: "B (Unemployment / Inefficient)", guides: "both" },
  ],
  arrows: [{ from: [52, 65], to: [34, 38], label: "Rising Unemployment Gap" }],
};
