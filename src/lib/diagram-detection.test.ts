import { describe, it, expect } from "vitest";
import { extractDiagramReferences } from "@/lib/diagram-detection";
import { autoParagraphText } from "@/lib/utils";

describe("extractDiagramReferences", () => {
  it("does NOT match generic economic vocabulary without explicit diagram prefix", () => {
    const text1 = "The free market equilibrium (market equilibrium) leads to deadweight loss.";
    const res1 = extractDiagramReferences(text1);
    expect(res1.matches).toHaveLength(0);

    const text2 = "Costs of production rise, shifting the supply curve (supply curve) left.";
    const res2 = extractDiagramReferences(text2);
    expect(res2.matches).toHaveLength(0);

    const text3 = "Consumer preferences change, shifting the demand curve (demand curve).";
    const res3 = extractDiagramReferences(text3);
    expect(res3.matches).toHaveLength(0);

    const text4 = "Inequality exists where (Qm > Qopt) and (PEDx + PEDm > 1).";
    const res4 = extractDiagramReferences(text4);
    expect(res4.matches).toHaveLength(0);
  });

  it("DOES match generic vocabulary when explicitly prefixed as a diagram", () => {
    const text1 = "When supply shifts (Diagram: Market Equilibrium), price adjusts.";
    const res1 = extractDiagramReferences(text1);
    expect(res1.matches).toHaveLength(1);
    expect(res1.matches[0].title).toBe("Market Equilibrium");

    const text2 = "As illustrated in (Figure: Supply Curve), quantity rises.";
    const res2 = extractDiagramReferences(text2);
    expect(res2.matches).toHaveLength(1);
    expect(res2.matches[0].title).toBe("Supply Curve");
  });

  it("matches built-in Cambridge diagrams with or without explicit prefix", () => {
    const text1 = "The government implements a price ceiling (Maximum price).";
    const res1 = extractDiagramReferences(text1);
    expect(res1.matches).toHaveLength(1);
    expect(res1.matches[0].title).toBe("Maximum Price");
    expect(res1.matches[0].isCustom).toBe(false);

    const text2 = "This causes lags (Diagram: The J-Curve Effect) in trade.";
    const res2 = extractDiagramReferences(text2);
    expect(res2.matches).toHaveLength(1);
    expect(res2.matches[0].title).toBe("The J-Curve Effect");

    const text3 = "Trade improves later (J-curve).";
    const res3 = extractDiagramReferences(text3);
    expect(res3.matches).toHaveLength(1);
    expect(res3.matches[0].title).toBe("The J-Curve Effect");
  });

  it("matches catalog Lorenz Curve when referenced", () => {
    const text = "Income distribution is analysed using (Diagram: Lorenz Curve).";
    const res = extractDiagramReferences(text);
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].title).toBe("Lorenz Curve and the Gini Coefficient");
  });

  it("supports non-catalog custom diagrams with accurate examiner tags and inline replacements", () => {
    const essay = [
      "Economic development requires savings and capital investment.",
      "(Diagram: Harrod-Domar Growth Model)",
      "As shown in the Harrod-Domar Model above, the savings ratio determines growth rate g = s / k.",
    ].join("\n\n");

    const res = extractDiagramReferences(essay);
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].title).toBe("Harrod-Domar Growth Model");
    expect(res.matches[0].isCustom).toBe(true);
    expect(res.detectedTags[0]).toContain("Harrod-Domar Growth Model (Custom Student Diagram)");
    expect(res.inlineReplacements).toHaveLength(1);
    expect(res.inlineReplacements[0].matchText).toBe("(Diagram: Harrod-Domar Growth Model)");

    let scriptForExaminer = essay;
    for (const rep of res.inlineReplacements) {
      scriptForExaminer = scriptForExaminer.replace(rep.matchText, `\n\n${rep.tag}\n\n`);
    }
    expect(scriptForExaminer).toContain("[DIAGRAM: Harrod-Domar Growth Model (Custom Student Diagram)");
    expect(scriptForExaminer.indexOf("Economic development")).toBeLessThan(scriptForExaminer.indexOf("[DIAGRAM:"));
    expect(scriptForExaminer.indexOf("[DIAGRAM:")).toBeLessThan(scriptForExaminer.indexOf("As shown in the Harrod-Domar Model above"));
  });

  it("supports (Figure: Monopsony Labour Market) as custom diagram", () => {
    const text = "A single buyer of labour exercises wage-setting power (Figure: Monopsony Labour Market).";
    const res = extractDiagramReferences(text);
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].title).toBe("Monopsony Labour Market");
    expect(res.matches[0].isCustom).toBe(true);
  });

  it("accurately detects and expands (Diagram: Subsidy) in Siyonah Shyam merit goods script", () => {
    const script = [
      "However, subsidies and grants may not be enough. Though subsidies can be beneficial, incidence of subsidies matters. If demand is inelastic for merit goods like education in developed economies, incidence of subsidies causes subsidies to benefit firms more.",
      "(Diagram: Subsidy)",
      "Finally, the government may need to use intervention to ensure that merit goods like education and healthcare remain affordable.",
    ].join("\n\n");

    const res = extractDiagramReferences(script);
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].title).toBe("Subsidy");
    expect(res.matches[0].isCustom).toBe(false);
    expect(res.detectedTags[0]).toContain("DIAGRAM: Subsidy");
    expect(res.detectedTags[0]).toContain("axes: Price (y) / Quantity (x)");
    expect(res.detectedTags[0]).toContain("curves: D, S, S+subsidy");

    let expanded = script;
    for (const rep of res.inlineReplacements) {
      expanded = expanded.replace(rep.matchText, `\n\n${rep.tag}\n\n`);
    }
    expect(expanded).toContain("[DIAGRAM: Subsidy");
    expect(expanded).not.toContain("(Diagram: Subsidy)");
  });
});

describe("autoParagraphText", () => {
  it("splits a monolithic essay block into paragraphs using Cambridge discourse markers", () => {
    const raw =
      "A tariff is an indirect tax on imported goods designed to raise domestic prices and reduce import expenditure. In theory, imposing a tariff increases the relative price of foreign imports compared to domestically produced substitutes, causing domestic consumers to switch expenditure away from foreign imports towards home goods. However, whether the current account actually improves depends crucially on the price elasticity of demand for imports and exports as described by the Marshall-Lerner condition. In evaluation, supply-side policies are undeniably superior for securing non-inflationary long-run growth because they expand the physical capacity ceiling of the economy. In conclusion, a tariff may offer temporary protection but risks retaliation from trading partners.";

    const formatted = autoParagraphText(raw);
    const paras = formatted.split(/\n\s*\n/);
    expect(paras.length).toBeGreaterThanOrEqual(4);
    expect(paras[0]).toContain("A tariff is an indirect tax");
    expect(paras[1]).toContain("However, whether the current account");
    expect(paras[2]).toContain("In evaluation, supply-side policies");
    expect(paras[3]).toContain("In conclusion, a tariff may offer");
  });

  it("leaves already properly paragraphed essays untouched", () => {
    const existing = "Paragraph one with sufficient analysis.\n\nParagraph two with counter analysis.";
    expect(autoParagraphText(existing)).toBe(existing);
  });

  it("leaves very short essays (<60 words) untouched", () => {
    const short = "This is a brief answer with only twenty words explaining an economics definition.";
    expect(autoParagraphText(short)).toBe(short);
  });
});
