import { describe, expect, it, vi } from "vitest";
import { productFixture } from "./productFixture.testdata";
import { matchesShopSegment, shopProductDescription } from "./shopContent";

describe("owner-managed catalogue content", () => {
  it("keeps curated translations for unchanged seed descriptions", () => {
    const translate = vi.fn(() => "Translated description");
    expect(shopProductDescription(productFixture, translate)).toBe(
      "Translated description"
    );
  });
  it("shows an owner edit instead of the old seed translation", () => {
    const translate = vi.fn();
    expect(
      shopProductDescription(
        {
          ...productFixture,
          description: "Owner-confirmed size and material",
          translation_key: null,
        },
        translate
      )
    ).toBe("Owner-confirmed size and material");
    expect(translate).not.toHaveBeenCalled();
  });
  it("places new drinks in their category without requiring English keywords", () => {
    expect(
      matchesShopSegment(
        {
          name: "Chigadzirwa chitsva",
          description: "Chitsva",
          category: "beverage",
          image_url: "/new.png",
        },
        "beverages"
      )
    ).toBe(true);
  });
  it("keeps Mama Dovi discoverable in its existing spreads collection", () => {
    expect(
      matchesShopSegment(
        { ...productFixture, name: "Mama Dovi", description: "peanut spread", category: "food" },
        "oils_spreads"
      )
    ).toBe(true);
  });
});
