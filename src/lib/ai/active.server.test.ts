import { describe, expect, it } from "vitest";
import {
  buildOrderedKeyPool,
  getPrioritizedKeyOrder,
  normaliseConfig,
} from "./active.server";

describe("active.server provider key configuration and tiered pooling", () => {
  it("normalises JSON config with freeKeys and paidKeys correctly", () => {
    const rawJson = JSON.stringify({
      freeKeys: ["AIza_free_1", "AIza_free_2", "AIza_free_3"],
      paidKeys: ["AIza_emergency_paid"],
      paidPrimary: "AIza_emergency_paid",
      budgetPool: [
        { key: "AIza_free_1", label: "Free 1", priority: 1 },
        { key: "AIza_free_2", label: "Free 2", priority: 2 },
      ],
    });

    const config = normaliseConfig({
      provider: "google",
      api_key: rawJson,
      base_url: null,
      model: "gemini-3.8-flash",
      label: "Test Config",
    });

    expect(config.freeKeys).toEqual(["AIza_free_1", "AIza_free_2", "AIza_free_3"]);
    expect(config.paidKeys).toEqual(["AIza_emergency_paid"]);
    expect(config.paidPrimaryKey).toBe("AIza_emergency_paid");
  });

  it("normalises legacy budgetPool structure and prevents paid key from being in freeKeys", () => {
    const rawJson = JSON.stringify({
      paidPrimary: "AIza_paid_VIP",
      paidSecondary: "AIza_paid_backup",
      budgetPool: [
        { key: "AIza_free_A", priority: 1 },
        { key: "AIza_paid_VIP", priority: 2 }, // accidentally included in budgetPool
        { key: "AIza_free_B", priority: 3 },
      ],
    });

    const config = normaliseConfig({
      provider: "google",
      api_key: rawJson,
      base_url: null,
      model: "gemini-3.8-flash",
      label: "Legacy Config",
    });

    expect(config.paidKeys).toEqual(["AIza_paid_VIP", "AIza_paid_backup"]);
    // Paid VIP key must be stripped from free keys
    expect(config.freeKeys).toEqual(["AIza_free_A", "AIza_free_B"]);
  });

  it("normalises raw plaintext comma/newline keys into freeKeys pool", () => {
    const raw = "AIza_free_1\nAIza_free_2, AIza_free_3; AIza_free_4";
    const config = normaliseConfig({
      provider: "google",
      api_key: raw,
      base_url: null,
      model: "gemini-3.8-flash",
      label: "Plaintext Config",
    });

    expect(config.freeKeys).toEqual([
      "AIza_free_1",
      "AIza_free_2",
      "AIza_free_3",
      "AIza_free_4",
    ]);
    expect(config.paidKeys).toEqual([]);
  });

  it("buildOrderedKeyPool places all free keys first and paid keys strictly last", () => {
    const config = normaliseConfig({
      provider: "google",
      api_key: JSON.stringify({
        freeKeys: ["free_1", "free_2", "free_3"],
        paidPrimary: "paid_emergency",
      }),
      base_url: null,
      model: "gemini-3.8-flash",
      label: "Test",
    });

    const { freeKeys, paidKeys, allOrderedKeys } = buildOrderedKeyPool(config);

    expect(freeKeys).toEqual(["free_1", "free_2", "free_3"]);
    expect(paidKeys).toEqual(["paid_emergency"]);
    expect(allOrderedKeys).toEqual(["free_1", "free_2", "free_3", "paid_emergency"]);
  });

  it("getPrioritizedKeyOrder respects cooldowns and exhausts all free keys before touching paid fallback", () => {
    const config = normaliseConfig({
      provider: "google",
      api_key: JSON.stringify({
        freeKeys: ["free_1", "free_2", "free_3"],
        paidPrimary: "paid_emergency",
      }),
      base_url: null,
      model: "gemini-3.8-flash",
      label: "Test",
    });

    const cooldowns = new Map<string, number>();
    const now = Date.now();

    // Case 1: All keys healthy. free_1, free_2, free_3 tried first, paid strictly last.
    const order1 = getPrioritizedKeyOrder(config, cooldowns);
    expect(order1).toEqual(["free_1", "free_2", "free_3", "paid_emergency"]);

    // Case 2: free_1 is in cooldown (hit rate limit).
    // Order must be free_2, free_3 (healthy free), then free_1 (cooled free), and paid_emergency STILL last.
    cooldowns.set("free_1", now + 60_000);
    const order2 = getPrioritizedKeyOrder(config, cooldowns);
    expect(order2).toEqual(["free_2", "free_3", "free_1", "paid_emergency"]);

    // Case 3: Both free_1 and free_2 in cooldown.
    cooldowns.set("free_2", now + 60_000);
    const order3 = getPrioritizedKeyOrder(config, cooldowns);
    expect(order3).toEqual(["free_3", "free_1", "free_2", "paid_emergency"]);

    // Case 4: ALL free keys in cooldown.
    // Cooled free keys are still tried before paid fallback!
    cooldowns.set("free_3", now + 60_000);
    const order4 = getPrioritizedKeyOrder(config, cooldowns);
    expect(order4).toEqual(["free_1", "free_2", "free_3", "paid_emergency"]);
  });
});
