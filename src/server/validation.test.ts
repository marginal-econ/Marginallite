import { describe, expect, it } from "vitest";

import { validateSignup } from "./validation";

describe("waitlist signup validation", () => {
  it("requires a real city", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "-",
      country: "India",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts international city names", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "São Paulo",
      country: "Brazil",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.city).toBe("São Paulo");
  });

  it("rejects URLs in the city field", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "https://example.com",
      country: "India",
    });
    expect(result.ok).toBe(false);
  });

  it("requires a real country", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "Chennai",
      country: "-",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid optional referral code", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "Chennai",
      country: "India",
      referredBy: " abcd123 ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.referredBy).toBe("ABCD123");
  });

  it("rejects a malformed referral code instead of silently dropping it", () => {
    const result = validateSignup({
      email: "student@example.com",
      name: "Student",
      city: "Chennai",
      country: "India",
      referredBy: "bad!",
    });
    expect(result.ok).toBe(false);
  });
});
