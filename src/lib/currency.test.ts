import { describe, it, expect } from "vitest";
import {
  convertFromUsd,
  formatCurrencyAmount,
  getAllCurrencyBreakdowns,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "./currency";

describe("Multi-Currency Engine", () => {
  it("supports all major Cambridge international student currencies", () => {
    const requiredCurrencies: CurrencyCode[] = ["USD", "INR", "GBP", "EUR", "SGD", "AED"];
    requiredCurrencies.forEach((code) => {
      expect(SUPPORTED_CURRENCIES[code]).toBeDefined();
      expect(SUPPORTED_CURRENCIES[code].symbol).toBeTruthy();
      expect(SUPPORTED_CURRENCIES[code].rateAgainstUsd).toBeGreaterThan(0);
    });
  });

  it("converts USD amounts accurately into INR with charm pricing", () => {
    // $19 * 85 = 1615 -> rounded to 1599 charm price
    const inr19 = convertFromUsd(19, "INR");
    expect(inr19).toBe(1599);

    // $59 * 85 = 5015 -> rounded to 4999
    const inr59 = convertFromUsd(59, "INR");
    expect(inr59).toBe(4999);
  });

  it("converts USD amounts accurately into GBP, EUR, SGD, AED", () => {
    const gbp19 = convertFromUsd(19, "GBP");
    expect(gbp19).toBe(15); // Math.round(19 * 0.79 = 15.01)

    const eur19 = convertFromUsd(19, "EUR");
    expect(eur19).toBe(17); // Math.round(19 * 0.92 = 17.48) -> 17

    const sgd19 = convertFromUsd(19, "SGD");
    expect(sgd19).toBe(26); // Math.round(19 * 1.35 = 25.65) -> 26
  });

  it("formats currency amounts with proper symbols", () => {
    expect(formatCurrencyAmount(19, "USD")).toBe("$19");
    expect(formatCurrencyAmount(19, "INR")).toBe("₹1,599");
    expect(formatCurrencyAmount(19, "GBP")).toBe("£15");
    expect(formatCurrencyAmount(19, "EUR")).toBe("€17");
    expect(formatCurrencyAmount(0, "USD", { showFree: true })).toBe("Free");
  });

  it("returns multi-currency breakdown for Admin across all currencies", () => {
    const breakdowns = getAllCurrencyBreakdowns(59);
    expect(breakdowns.length).toBeGreaterThanOrEqual(6);
    const usd = breakdowns.find((b) => b.code === "USD");
    const inr = breakdowns.find((b) => b.code === "INR");
    const gbp = breakdowns.find((b) => b.code === "GBP");

    expect(usd?.formatted).toBe("$59");
    expect(inr?.formatted).toBe("₹4,999");
    expect(gbp?.formatted).toBe("£47");
  });
});
