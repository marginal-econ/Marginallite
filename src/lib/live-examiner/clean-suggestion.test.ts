import { describe, it, expect } from "vitest";
import { cleanSuggestion } from "./clean-suggestion";

describe("cleanSuggestion", () => {
  it("removes e.g. prefixes", () => {
    expect(cleanSuggestion("e.g. suppliers are less incentivised")).toBe("suppliers are less incentivised");
    expect(cleanSuggestion("e.g., higher prices")).toBe("higher prices");
    expect(cleanSuggestion("eg: lower demand")).toBe("lower demand");
    expect(cleanSuggestion("eg lower demand")).toBe("lower demand");
  });

  it("removes for example / use / consider prefixes", () => {
    expect(cleanSuggestion("for example, demand falls")).toBe("demand falls");
    expect(cleanSuggestion("Use 'demerit goods' instead")).toBe("demerit goods");
    expect(cleanSuggestion("Change to: contraction in demand")).toBe("contraction in demand");
    expect(cleanSuggestion("Consider: negative externalities")).toBe("negative externalities");
  });

  it("CRITICAL: NEVER truncates real economics words starting with 'ex', 'like', 'use', 'try'", () => {
    expect(cleanSuggestion("Examples of monetary policy")).toBe("Examples of monetary policy");
    expect(cleanSuggestion("Externalities in consumption")).toBe("Externalities in consumption");
    expect(cleanSuggestion("Expansionary fiscal policy")).toBe("Expansionary fiscal policy");
    expect(cleanSuggestion("Excess demand")).toBe("Excess demand");
    expect(cleanSuggestion("Exchange rate fluctuations")).toBe("Exchange rate fluctuations");
    expect(cleanSuggestion("Exports and imports")).toBe("Exports and imports");
    expect(cleanSuggestion("Explicit costs")).toBe("Explicit costs");
    expect(cleanSuggestion("Likely to increase aggregate demand")).toBe("Likely to increase aggregate demand");
    expect(cleanSuggestion("Useful policy tool")).toBe("Useful policy tool");
    expect(cleanSuggestion("Trying to reduce unemployment")).toBe("Trying to reduce unemployment");
  });

  it("strips outer quotes", () => {
    expect(cleanSuggestion('"demerit goods"')).toBe("demerit goods");
    expect(cleanSuggestion("'because'")).toBe("because");
    expect(cleanSuggestion("e.g. 'information failure'")).toBe("information failure");
  });

  it("leaves already clean text intact", () => {
    expect(cleanSuggestion("because")).toBe("because");
    expect(cleanSuggestion("suppliers")).toBe("suppliers");
    expect(cleanSuggestion("Demerit goods")).toBe("Demerit goods");
  });

  it("handles null / undefined safely", () => {
    expect(cleanSuggestion(null)).toBe("");
    expect(cleanSuggestion(undefined)).toBe("");
    expect(cleanSuggestion("")).toBe("");
  });

  it("handles Mistral / Gemini asterisks, bullets, and command prefixes", () => {
    expect(cleanSuggestion("**contraction in demand**")).toBe("contraction in demand");
    expect(cleanSuggestion("*opportunity cost*")).toBe("opportunity cost");
    expect(cleanSuggestion("- **demerit goods**")).toBe("demerit goods");
    expect(cleanSuggestion("Correction: **allocative efficiency**")).toBe("allocative efficiency");
    expect(cleanSuggestion("Rewrite: 'marginal social cost'")).toBe("marginal social cost");
    expect(cleanSuggestion("• Use: price elasticity of demand")).toBe("price elasticity of demand");
    expect(cleanSuggestion("ex: higher interest rates")).toBe("higher interest rates");
    expect(cleanSuggestion("ex. higher interest rates")).toBe("higher interest rates");
  });
});
