import { describe, expect, it } from "vitest";
import {
  catalogQuery,
  emptyCatalogFilters,
  matchesCatalogQuery,
  readCatalogFilters,
} from "./catalogFilters";

const read = (search: string) =>
  readCatalogFilters(new URLSearchParams(search));

describe("catalogue discovery links", () => {
  it("round-trips the filtered collection through a detail link and checkout", () => {
    const filters = {
      category: "food" as const,
      segment: "beverages",
      query: "100% citrus & lime + péché",
      availableOnly: true,
      product: "citrus-lime",
    };
    const search = catalogQuery(filters, "de", true);
    const params = new URLSearchParams(search);
    expect(params.get("cart")).toBe("1");
    expect(params.get("lng")).toBe("de");
    expect(readCatalogFilters(params)).toEqual(filters);
    expect(catalogQuery(read(search))).not.toContain("cart=");
  });

  it("keeps legacy product links and ignores unrelated parameters on return", () => {
    expect(
      catalogQuery(read("?product=maheu&add=maheu&cart=1&returnTo=elsewhere")),
    ).toBe("?product=maheu");
    expect(catalogQuery(read("?add=maheu"))).toBe("");
    expect(catalogQuery(emptyCatalogFilters)).toBe("");
  });

  it("drops incompatible segments so the results match the visible selections", () => {
    expect(read("?category=crafts&segment=beverages")).toEqual({
      ...emptyCatalogFilters,
      category: "crafts",
    });
    expect(read("?category=beverage&segment=beverages")).toEqual({
      ...emptyCatalogFilters,
      category: "food",
      segment: "beverages",
    });
    expect(read("?category=drinks")).toEqual({
      ...emptyCatalogFilters,
      category: "food",
      segment: "beverages",
    });
    expect(read("?category=beverage&segment=cereals").segment).toBe("cereals");
    expect(read("?segment=snacks").segment).toBe("snacks");
    expect(read("?segment=typo").segment).toBe("");
  });

  it("matches words across a product name and its displayed local description", () => {
    expect(
      matchesCatalogQuery("Mazoe Orange", "Süßes Getränk", "  getrank  MAZOE "),
    ).toBe(true);
    expect(matchesCatalogQuery("Sables Rugby Kit", "", "kit—Sábles")).toBe(
      true,
    );
    expect(
      matchesCatalogQuery("Mazoe Orange", "Süßes Getränk", "mazoe cranberry"),
    ).toBe(false);
    expect(matchesCatalogQuery("Mazoe Orange", "Süßes Getränk", " ")).toBe(
      true,
    );
  });
});
