import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safeRedirect";

describe("sign-in return path", () => {
  it.each([
    null,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\n/example.com",
    "javascript:alert(1)",
  ])("rejects unsafe return paths: %s", value => {
    expect(safeRedirectPath(value)).toBe("/");
  });
  it("preserves internal paths, filters and anchors", () => {
    expect(safeRedirectPath("/shop/products?category=gifts#cart")).toBe(
      "/shop/products?category=gifts#cart"
    );
  });
});
