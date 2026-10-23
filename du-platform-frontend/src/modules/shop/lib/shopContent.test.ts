import { describe, expect, it, vi } from "vitest";
import { SHOP_SEED_PRODUCTS } from "@shared/shopCatalog";
import { matchesShopSegment, shopProductDescription } from "./shopContent";

describe("owner-managed catalogue content", () => {
  it("keeps curated translations for unchanged seed descriptions", () => {
    const translate = vi.fn(() => "Translated description");
    expect(shopProductDescription(SHOP_SEED_PRODUCTS[0], translate)).toBe(
      "Translated description"
    );
  });
  it("shows an owner edit instead of the old seed translation", () => {
    const translate = vi.fn();
    expect(
      shopProductDescription(
        {
          ...SHOP_SEED_PRODUCTS[0],
          description: "Owner-confirmed size and material",
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
        SHOP_SEED_PRODUCTS.find(product => product.slug === "mama-dovi_750ml")!,
        "oils_spreads"
      )
    ).toBe(true);
  });
});
