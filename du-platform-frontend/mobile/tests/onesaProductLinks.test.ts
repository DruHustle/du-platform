import { describe, expect, it } from "vitest";
import { onesaProductLinks } from "../src/onesaProductLinks";

describe("Onesa product links", () => {
  it("keeps text, prices and newlines around native products and website availability forms", () => {
    const content = "- [Mazoe](/shop/product/mazoe) · EUR 12.00\n[Request an update](/shop/product/mazoe#interest) — One-time email.";
    expect(onesaProductLinks(content)).toEqual([
      { text: "- " }, { text: "Mazoe", destination: { screen: "Product", params: { slug: "mazoe" } } },
      { text: " · EUR 12.00\n" }, { text: "Request an update", destination: { screen: "External", params: { path: "/shop/product/mazoe#interest", title: "Request an update" } } },
      { text: " — One-time email." },
    ]);
  });
  it("opens the prior product-link format and Onesa’s catalogue fallback", () => {
    const parts = onesaProductLinks("[Café](/shop/products?product=caf%C3%A9) or [Catalogue](/shop/products)");
    expect(parts[0].destination).toEqual({ screen: "Product", params: { slug: "café" } });
    expect(parts[2].destination?.screen).toBe("Shop");
  });
  it.each([
    "Plain text\nwith a new line", "[Outside](https://example.org/shop/product/a)",
    "[Other page](/travel)", "[Wrong anchor](/shop/product/a#other)", "[Malformed](/shop/product/%XX)",
    "[Incomplete](/shop/product/a", "[ ](/shop/product/a)", "[Bad](/shop/product/%2F#interest)",
    "![Image](/shop/product/a)", "\\[Escaped](/shop/product/a)", "`[Code](/shop/product/a)`",
    "[Unknown](/shop/interest?token=example)", "[Link](//example.org/shop/product/a)",
  ])("keeps unsupported input unchanged and inert", content => {
    expect(onesaProductLinks(content)).toEqual([{ text: content }]);
  });
});
