import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdmin, isMarginalAdmin } from "./auth-admin";

describe("Marginalite Admin Security Authorization", () => {
  const origEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com, marginal.econ.ai@gmail.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = origEnv;
  });

  it("authorizes designated administrators by configured email", () => {
    expect(isAdmin({ email: "admin@example.com" })).toBe(true);
    expect(isAdmin({ email: " marginal.econ.ai@gmail.com " })).toBe(true);
    expect(isAdmin("admin@example.com")).toBe(true);
  });

  it("authorizes when role claim is admin", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isAdmin({ claims: { user_metadata: { role: "admin" } } })).toBe(true);
  });

  it("authorizes via JWT claims email", () => {
    expect(isAdmin({ claims: { email: "admin@example.com" } })).toBe(true);
  });

  it("rejects non-admin emails and IDs", () => {
    expect(isAdmin("some-random-user-id")).toBe(false);
    expect(isAdmin("student@example.com")).toBe(false);
    expect(isAdmin({ email: "teacher@school.org" })).toBe(false);
  });

  it("rejects empty, null, or undefined context", () => {
    expect(isAdmin({})).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin({ email: "" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("maintains backwards compatibility alias isMarginalAdmin", () => {
    expect(isMarginalAdmin({ email: "admin@example.com" })).toBe(true);
  });
});
