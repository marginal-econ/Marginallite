import type {
  DiagramDrill,
  DiagramMetrics,
  DiagramPreset,
  DiagramState,
  ShadedPolygon,
} from "./types";

export const DEFAULT_DIAGRAM_STATES: Record<DiagramPreset, DiagramState> = {
  tax: {
    preset: "tax",
    demandIntercept: 90,
    demandSlope: 0.8,
    demandShift: 0,
    supplyIntercept: 10,
    supplySlope: 0.8,
    supplyShift: 0,
    taxAmount: 18,
    subsidyAmount: 0,
    priceControl: null,
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 0,
  },
  price_floor: {
    preset: "price_floor",
    demandIntercept: 90,
    demandSlope: 0.8,
    demandShift: 0,
    supplyIntercept: 10,
    supplySlope: 0.8,
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: 65, // Minimum price above equilibrium (~50)
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 0,
  },
  price_ceiling: {
    preset: "price_ceiling",
    demandIntercept: 90,
    demandSlope: 0.8,
    demandShift: 0,
    supplyIntercept: 10,
    supplySlope: 0.8,
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: 35, // Maximum price below equilibrium (~50)
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 0,
  },
  tariff: {
    preset: "tariff",
    demandIntercept: 95,
    demandSlope: 0.75,
    demandShift: 0,
    supplyIntercept: 10,
    supplySlope: 0.9,
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: null,
    worldPrice: 28,
    tariffAmount: 14,
    externalityCost: 0,
  },
  monopoly: {
    preset: "monopoly",
    demandIntercept: 95,
    demandSlope: 0.9,
    demandShift: 0,
    supplyIntercept: 20, // MC intercept
    supplySlope: 0.4, // MC slope
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: null,
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 0,
  },
  externality: {
    preset: "externality",
    demandIntercept: 90,
    demandSlope: 0.8,
    demandShift: 0,
    supplyIntercept: 10, // MPC
    supplySlope: 0.7,
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: null,
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 22, // MSC = MPC + 22
  },
  macro_ad_as: {
    preset: "macro_ad_as",
    demandIntercept: 95, // AD
    demandSlope: 0.8,
    demandShift: 10,
    supplyIntercept: 15, // SRAS
    supplySlope: 0.8,
    supplyShift: 0,
    taxAmount: 0,
    subsidyAmount: 0,
    priceControl: null,
    worldPrice: 30,
    tariffAmount: 0,
    externalityCost: 0,
  },
};

export function calculateMetrics(state: DiagramState): DiagramMetrics {
  const {
    demandIntercept,
    demandSlope,
    demandShift,
    supplyIntercept,
    supplySlope,
    supplyShift,
    taxAmount,
    priceControl,
    worldPrice,
    tariffAmount,
  } = state;

  // Base equilibrium (without tax/tariff/price control)
  const effDemandIntercept = demandIntercept + demandShift;
  const effSupplyIntercept = supplyIntercept + supplyShift;

  const initialQ = Math.max(
    0,
    (effDemandIntercept - effSupplyIntercept) / (demandSlope + supplySlope),
  );
  const initialP = effSupplyIntercept + supplySlope * initialQ;

  // Equilibrium with tax: Supply shifts up by taxAmount
  const taxedSupplyIntercept = effSupplyIntercept + taxAmount;
  const eqQ = Math.max(
    0,
    (effDemandIntercept - taxedSupplyIntercept) / (demandSlope + supplySlope),
  );
  const eqP = effDemandIntercept - demandSlope * eqQ; // Consumer price
  const producerP = eqP - taxAmount; // Producer price received

  // Surpluses with tax
  const consumerSurplus = 0.5 * (effDemandIntercept - eqP) * eqQ;
  const producerSurplus = 0.5 * (producerP - effSupplyIntercept) * eqQ;
  const taxRevenue = taxAmount > 0 ? taxAmount * eqQ : 0;
  const deadweightLoss =
    taxAmount > 0 ? 0.5 * taxAmount * Math.max(0, initialQ - eqQ) : 0;

  // Incidence ratio
  const priceRise = eqP - initialP;
  const consumerTaxBurdenPct =
    taxAmount > 0 ? Math.min(100, Math.max(0, (priceRise / taxAmount) * 100)) : 50;
  const producerTaxBurdenPct = 100 - consumerTaxBurdenPct;

  // Price control analysis
  let shortageOrSurplus = 0;
  if (priceControl !== null) {
    const qDemandedAtControl = Math.max(
      0,
      (effDemandIntercept - priceControl) / demandSlope,
    );
    const qSuppliedAtControl = Math.max(
      0,
      (priceControl - effSupplyIntercept) / supplySlope,
    );
    shortageOrSurplus = qSuppliedAtControl - qDemandedAtControl; // positive = surplus, negative = shortage
  }

  // Tariff analysis
  const qdFree = Math.max(0, (effDemandIntercept - worldPrice) / demandSlope);
  const qsFree = Math.max(0, (worldPrice - effSupplyIntercept) / supplySlope);
  const importsWithoutTariff = Math.max(0, qdFree - qsFree);

  const tariffP = worldPrice + tariffAmount;
  const qdTariff = Math.max(0, (effDemandIntercept - tariffP) / demandSlope);
  const qsTariff = Math.max(0, (tariffP - effSupplyIntercept) / supplySlope);
  const importsWithTariff = Math.max(0, qdTariff - qsTariff);
  const tariffRevenue = tariffAmount * importsWithTariff;

  return {
    eqQ,
    eqP,
    initialQ,
    initialP,
    consumerSurplus,
    producerSurplus,
    taxRevenue,
    deadweightLoss,
    consumerTaxBurdenPct,
    producerTaxBurdenPct,
    shortageOrSurplus,
    importsWithoutTariff,
    importsWithTariff,
    tariffRevenue,
  };
}

export function getShadedPolygons(
  state: DiagramState,
  metrics: DiagramMetrics,
): ShadedPolygon[] {
  const { preset, taxAmount, worldPrice, tariffAmount, externalityCost } = state;
  const polygons: ShadedPolygon[] = [];

  const effDemandIntercept = state.demandIntercept + state.demandShift;
  const effSupplyIntercept = state.supplyIntercept + state.supplyShift;

  if (preset === "tax" && taxAmount > 0) {
    const pc = metrics.eqP;
    const pp = pc - taxAmount;
    const q = metrics.eqQ;
    const q0 = metrics.initialQ;

    // Consumer Surplus
    polygons.push({
      id: "cs",
      label: "Consumer Surplus (CS)",
      points: [
        { q: 0, p: pc },
        { q: 0, p: effDemandIntercept },
        { q, p: pc },
      ],
      fillClass: "fill-emerald-500/20",
      strokeClass: "stroke-emerald-600/60",
      areaValue: metrics.consumerSurplus,
      description: "Remaining economic benefit enjoyed by consumers after paying the higher price.",
    });

    // Producer Surplus
    polygons.push({
      id: "ps",
      label: "Producer Surplus (PS)",
      points: [
        { q: 0, p: effSupplyIntercept },
        { q: 0, p: pp },
        { q, p: pp },
      ],
      fillClass: "fill-amber-500/20",
      strokeClass: "stroke-amber-600/60",
      areaValue: metrics.producerSurplus,
      description: "Remaining benefit earned by producers above their marginal production cost.",
    });

    // Government Tax Revenue
    polygons.push({
      id: "tax_rev",
      label: "Tax Revenue (T × Q)",
      points: [
        { q: 0, p: pp },
        { q: 0, p: pc },
        { q, p: pc },
        { q, p: pp },
      ],
      fillClass: "fill-pink-500/25",
      strokeClass: "stroke-pink-600/70",
      areaValue: metrics.taxRevenue,
      description: "Direct tax yield collected by government (box between consumer price and producer price).",
    });

    // Deadweight Loss Triangle
    polygons.push({
      id: "dwl",
      label: "Deadweight Welfare Loss (DWL)",
      points: [
        { q, p: pc },
        { q: q0, p: metrics.initialP },
        { q, p: pp },
      ],
      fillClass: "fill-rose-500/30",
      strokeClass: "stroke-rose-600/80",
      areaValue: metrics.deadweightLoss,
      description: "Net loss of social welfare resulting from output contraction below social optimum.",
    });
  } else if (preset === "tariff" && tariffAmount > 0) {
    const pw = worldPrice;
    const pt = worldPrice + tariffAmount;
    const qs1 = Math.max(0, (pw - effSupplyIntercept) / state.supplySlope);
    const qs2 = Math.max(0, (pt - effSupplyIntercept) / state.supplySlope);
    const qd2 = Math.max(0, (effDemandIntercept - pt) / state.demandSlope);
    const qd1 = Math.max(0, (effDemandIntercept - pw) / state.demandSlope);

    // Tariff revenue
    polygons.push({
      id: "tariff_rev",
      label: "Government Tariff Revenue",
      points: [
        { q: qs2, p: pw },
        { q: qs2, p: pt },
        { q: qd2, p: pt },
        { q: qd2, p: pw },
      ],
      fillClass: "fill-pink-500/25",
      strokeClass: "stroke-pink-600/70",
      areaValue: metrics.tariffRevenue,
      description: "Revenue collected on imported quantity (Q3 to Q2) at the tariff rate.",
    });

    // Production deadweight loss
    polygons.push({
      id: "dwl_prod",
      label: "Production Inefficiency Loss",
      points: [
        { q: qs1, p: pw },
        { q: qs2, p: pt },
        { q: qs2, p: pw },
      ],
      fillClass: "fill-rose-500/30",
      strokeClass: "stroke-rose-600/80",
      areaValue: 0.5 * tariffAmount * (qs2 - qs1),
      description: "Welfare lost by using higher-cost domestic producers instead of cheap foreign imports.",
    });

    // Consumption deadweight loss
    polygons.push({
      id: "dwl_cons",
      label: "Consumption Distortion Loss",
      points: [
        { q: qd2, p: pw },
        { q: qd2, p: pt },
        { q: qd1, p: pw },
      ],
      fillClass: "fill-rose-500/30",
      strokeClass: "stroke-rose-600/80",
      areaValue: 0.5 * tariffAmount * (qd1 - qd2),
      description: "Welfare lost by consumers pricing out of mutually beneficial transactions.",
    });
  } else if (preset === "externality" && externalityCost > 0) {
    const qm = metrics.initialQ; // Market quantity (MPC = MPB)
    const pm = metrics.initialP;
    // Social optimum: MSC = MSB => (effSupplyIntercept + externalityCost) + supplySlope*Q = effDemandIntercept - demandSlope*Q
    const qs = Math.max(
      0,
      (effDemandIntercept - (effSupplyIntercept + externalityCost)) /
        (state.demandSlope + state.supplySlope),
    );
    const ps = effDemandIntercept - state.demandSlope * qs;
    const mscAtQm = effSupplyIntercept + externalityCost + state.supplySlope * qm;

    polygons.push({
      id: "dwl_externality",
      label: "Deadweight Welfare Loss Triangle",
      points: [
        { q: qs, p: ps },
        { q: qm, p: mscAtQm },
        { q: qm, p: pm },
      ],
      fillClass: "fill-rose-500/35",
      strokeClass: "stroke-rose-600/90",
      areaValue: 0.5 * externalityCost * (qm - qs),
      description: "Net welfare lost due to overproduction where MSC exceeds MSB between Q* and Qm.",
    });
  } else {
    // Standard CS & PS
    polygons.push({
      id: "cs",
      label: "Consumer Surplus (CS)",
      points: [
        { q: 0, p: metrics.eqP },
        { q: 0, p: effDemandIntercept },
        { q: metrics.eqQ, p: metrics.eqP },
      ],
      fillClass: "fill-emerald-500/20",
      strokeClass: "stroke-emerald-600/60",
      areaValue: metrics.consumerSurplus,
      description: "Difference between what consumers are willing to pay and market price.",
    });

    polygons.push({
      id: "ps",
      label: "Producer Surplus (PS)",
      points: [
        { q: 0, p: effSupplyIntercept },
        { q: 0, p: metrics.eqP },
        { q: metrics.eqQ, p: metrics.eqP },
      ],
      fillClass: "fill-amber-500/20",
      strokeClass: "stroke-amber-600/60",
      areaValue: metrics.producerSurplus,
      description: "Difference between what producers are willing to accept and market price.",
    });
  }

  return polygons;
}

export const CAMBRIDGE_DIAGRAM_DRILLS: DiagramDrill[] = [
  {
    id: "drill-tax-inelastic",
    title: "1. Specific Indirect Tax on Inelastic Good",
    paperReference: "Cambridge 0455/22/M/J/23 Q2(a)",
    prompt:
      "A government introduces an indirect specific tax on cigarettes, where demand is price inelastic (PED < 1). Adjust the Demand Slope to make it steep (inelastic) and apply a specific tax of at least 15. Verify that the consumer tax burden is significantly higher than the producer burden.",
    hint: "Increase Demand Slope above 1.1 to make the demand curve steep and inelastic. Apply Tax Amount > 15.",
    preset: "tax",
    targetCheck: (state, metrics) => {
      const isSteep = state.demandSlope >= 1.0;
      const hasTax = state.taxAmount >= 14;
      const consumerBurdenHigh = metrics.consumerTaxBurdenPct >= 58;

      if (!hasTax) {
        return {
          passed: false,
          score: 1,
          feedback: "Specific tax is too low. Increase the Tax slider to at least 15.",
        };
      }
      if (!isSteep) {
        return {
          passed: false,
          score: 2,
          feedback:
            "Demand curve is currently too elastic. Make the Demand Slope steeper (above 1.0) so PED is inelastic.",
        };
      }
      if (consumerBurdenHigh) {
        return {
          passed: true,
          score: 3,
          feedback: `Exemplary Cambridge execution! Consumer incidence is ${metrics.consumerTaxBurdenPct.toFixed(0)}% vs Producer ${metrics.producerTaxBurdenPct.toFixed(0)}%. Equilibrium price increased sharply from ${metrics.initialP.toFixed(1)} to ${metrics.eqP.toFixed(1)}.`,
        };
      }
      return {
        passed: false,
        score: 2,
        feedback: "Make demand even steeper to clearly illustrate the heavy consumer incidence.",
      };
    },
  },
  {
    id: "drill-min-price",
    title: "2. Minimum Guaranteed Price (Price Floor)",
    paperReference: "Cambridge 0455/21/O/N/22 Q3(a)",
    prompt:
      "A government sets a Minimum Guaranteed Price (Pmin) above market equilibrium to support grain farmers. Set the Price Floor control to at least 60 (above initial equilibrium). Verify the resulting excess supply (surplus) that the government must purchase.",
    hint: "Switch to Minimum Price mode and slide Pmin above 60.",
    preset: "price_floor",
    targetCheck: (state, metrics) => {
      const isAbove = (state.priceControl ?? 0) >= 58;
      const hasSurplus = metrics.shortageOrSurplus > 10;

      if (!isAbove) {
        return {
          passed: false,
          score: 1,
          feedback:
            "A minimum price must be set ABOVE market equilibrium (~50) to be binding. Increase Pmin.",
        };
      }
      if (hasSurplus) {
        return {
          passed: true,
          score: 3,
          feedback: `Perfect Cambridge representation! Pmin = ${state.priceControl} creates an excess supply (surplus) of ${metrics.shortageOrSurplus.toFixed(1)} units, creating government storage or intervention purchase costs.`,
        };
      }
      return {
        passed: false,
        score: 2,
        feedback: "Raise Pmin higher to clearly show the excess supply gap between Qs and Qd.",
      };
    },
  },
  {
    id: "drill-tariff",
    title: "3. Import Tariff and Welfare Loss",
    paperReference: "Cambridge 0455/22/M/J/24 Q4",
    prompt:
      "A country imposes a specific tariff on imported steel. Adjust the Tariff slider to 14+. Observe the reduction in imports and identify both the Government Tariff Revenue and the two deadweight loss triangles (production inefficiency and consumer surplus loss).",
    hint: "Set Tariff Amount to 14 or higher and observe how domestic supply expands while imports contract.",
    preset: "tariff",
    targetCheck: (state, metrics) => {
      const hasTariff = state.tariffAmount >= 12;
      const contractedImports = metrics.importsWithTariff < metrics.importsWithoutTariff;

      if (!hasTariff) {
        return {
          passed: false,
          score: 1,
          feedback: "Increase the Tariff slider to at least 14 to see a clear domestic contraction.",
        };
      }
      if (contractedImports && metrics.tariffRevenue > 0) {
        return {
          passed: true,
          score: 3,
          feedback: `Accurately calibrated! Tariff reduced imports from ${metrics.importsWithoutTariff.toFixed(1)} to ${metrics.importsWithTariff.toFixed(1)}. Generates ${metrics.tariffRevenue.toFixed(1)} tariff revenue and generates 2 distinct deadweight welfare loss triangles.`,
        };
      }
      return {
        passed: false,
        score: 2,
        feedback: "Adjust world price and tariff so domestic demand exceeds domestic supply.",
      };
    },
  },
  {
    id: "drill-negative-externality",
    title: "4. Negative Production Externality (MSC > MPC)",
    paperReference: "Cambridge 0455/22/F/M/23 Q2",
    prompt:
      "A chemical plant emits toxic waste during manufacture. The Marginal External Cost (MEC) creates a divergence where MSC = MPC + MEC. Set External Cost to 20+. Observe the Deadweight Welfare Loss triangle pointing toward the social optimum.",
    hint: "Increase Marginal External Cost slider above 20 to view the social welfare loss triangle.",
    preset: "externality",
    targetCheck: (state, metrics) => {
      const hasMEC = state.externalityCost >= 18;
      if (!hasMEC) {
        return {
          passed: false,
          score: 1,
          feedback: "Increase Marginal External Cost (MEC) above 18 to create a clear MSC shift.",
        };
      }
      return {
        passed: true,
        score: 3,
        feedback: `Full Cambridge credit! The divergence between MPC and MSC creates market overproduction (Qm > Q*). The shaded deadweight loss triangle demonstrates the net welfare loss to society from over-allocation of resources.`,
      };
    },
  },
  {
    id: "drill-demand-shift",
    title: "5. Demand Shift & Price Elasticity of Supply",
    paperReference: "Cambridge 0455/21/M/J/22 Q1",
    prompt:
      "Consumer incomes rise for a normal good. Shift Demand to the right (Demand Shift > 15) and set Supply to be price inelastic (steep). Observe the major price surge compared to quantity expansion.",
    hint: "Set Demand Shift > 15 and Supply Slope > 1.1.",
    preset: "tax", // Base S&D
    targetCheck: (state, metrics) => {
      const dShifted = state.demandShift >= 12;
      const sInelastic = state.supplySlope >= 1.0;

      if (!dShifted) {
        return {
          passed: false,
          score: 1,
          feedback: "Increase Demand Shift above 12 to show an outward shift in demand.",
        };
      }
      if (!sInelastic) {
        return {
          passed: false,
          score: 2,
          feedback: "Make Supply Slope steeper (inelastic, slope >= 1.0) to demonstrate supply responsiveness.",
        };
      }
      return {
        passed: true,
        score: 3,
        feedback: `Cambridge Level 4 demonstration! Inelastic supply caused the demand shift to translate primarily into a price surge (P* rose from ${metrics.initialP.toFixed(1)} to ${metrics.eqP.toFixed(1)}) with a relatively small quantity expansion.`,
      };
    },
  },
];
