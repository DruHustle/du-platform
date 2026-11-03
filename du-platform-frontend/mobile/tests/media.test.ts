import { describe, expect, it } from "vitest";
import { productImageUrl } from "../src/media";
describe("catalogue image URLs", () => {
  it("resolves site assets independently of the API origin", () => {
    expect(productImageUrl("/images/product.png", "/api/shop/assets/product.png")).toBe("https://www.diasporaunlocked.com/api/shop/assets/product.png");
    expect(productImageUrl("/images/product.png")).toBe("https://www.diasporaunlocked.com/images/product.png");
    expect(productImageUrl("https://images.example.test/product.png")).toBe("https://images.example.test/product.png");
  });
  it("rejects protocol-relative, credentialed, and insecure remote URLs", () => {
    for (const url of ["//evil.example/x", "https://user:pass@example.test/x", "http://example.test/x", "javascript:alert(1)"])
      expect(productImageUrl(url)).toBeUndefined();
  });
});
