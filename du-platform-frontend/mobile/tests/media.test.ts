import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let productImageUrl: typeof import("../src/media").productImageUrl;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("EXPO_PUBLIC_API_URL", "https://catalogue-api.example.invalid/api");
  vi.stubEnv("EXPO_PUBLIC_WEB_URL", "https://public-site.example.invalid");
  ({ productImageUrl } = await import("../src/media"));
});
afterEach(() => vi.unstubAllEnvs());

describe("catalogue image URLs", () => {
  it("resolves site assets independently of the API origin", () => {
    expect(productImageUrl("/images/product.png", "/api/shop/assets/product.png")).toBe("https://catalogue-api.example.invalid/api/shop/assets/product.png");
    expect(productImageUrl("/images/product.png")).toBe("https://public-site.example.invalid/images/product.png");
    expect(productImageUrl("https://images.example.test/product.png")).toBe("https://images.example.test/product.png");
  });
  it("rejects protocol-relative, credentialed, and insecure remote URLs", () => {
    for (const url of ["//evil.example/x", "https://user:pass@example.test/x", "http://example.test/x", "javascript:alert(1)"])
      expect(productImageUrl(url)).toBeUndefined();
  });
});
