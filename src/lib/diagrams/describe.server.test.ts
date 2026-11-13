import { describe, expect, it } from "vitest";

import { assertSafeRemoteImageUrl } from "./describe.server";

describe("remote diagram URL validation", () => {
  it.each([
    "http://localhost/image.png",
    "http://127.0.0.1/image.png",
    "http://10.1.2.3/image.png",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/image.png",
    "http://metadata.google.internal/image.png",
  ])("blocks private or metadata address %s", (url) => {
    expect(() => assertSafeRemoteImageUrl(url)).toThrow();
  });

  it("blocks embedded credentials and unusual ports", () => {
    expect(() => assertSafeRemoteImageUrl("https://user:pass@example.com/image.png")).toThrow();
    expect(() => assertSafeRemoteImageUrl("https://example.com:8443/image.png")).toThrow();
  });

  it("accepts a normal public HTTPS image URL", () => {
    expect(assertSafeRemoteImageUrl("https://images.example.com/diagram.png").hostname).toBe(
      "images.example.com",
    );
  });
});
