import { describe, expect, it } from "vitest";

import { check } from "./rate-limit";

describe("local rate limiter", () => {
  it("rejects requests after the configured limit", () => {
    const identifier = `test-${crypto.randomUUID()}`;
    const rule = { limit: 2, windowMs: 60_000 };
    expect(check(identifier, [rule]).allowed).toBe(true);
    expect(check(identifier, [rule]).allowed).toBe(true);
    expect(check(identifier, [rule]).allowed).toBe(false);
  });
});
