import { describe, expect, it } from "vitest";
import type { Catalog, Product } from "../src/api";
import { defaultShopFilters, filterShopProducts, shopDestination } from "../src/shopDiscovery";
import { readSearchResponse } from "../src/searchResults";

const product: Product = { id: 2, slug: "mazoe-orange", name: "Mazöe", description: "Orange cordial",
  category: "beverage", stock_qty: 3, price_cents: 1200, currency: "EUR", is_active: 1, image_url: "" };
const other = { ...product, id: 3, name: "Peanut butter", description: "Peanut spread", category: "food", stock_qty: 0 };
const catalog: Catalog = { source: "db", products: [product, other], readiness: { mode: "pilot",
  enforcement: "enforced", commercialReady: true, approvedProductIds: [2, 3], destinationCountries: ["DE"] } };

describe("Shop discovery", () => {
  it.each(["/shop/product/mazoe-orange", "/shop/products?product=mazoe-orange"])("opens the specific product from %s", href => {
    expect(shopDestination(href)).toEqual({ screen: "Product", params: { slug: product.slug } });
  });
  it("decodes non-English product slugs without changing their spelling", () => {
    expect(shopDestination("/shop/product/caf%C3%A9")).toEqual({ screen: "Product", params: { slug: "café" } });
    expect(shopDestination("/shop/products?product=caf%C3%A9")).toEqual({ screen: "Product", params: { slug: "café" } });
  });
  it("carries text, category and approval filters into the native catalogue", () => {
    const destination = shopDestination("/shop/products?available=1&q=orange+mazoe&category=food");
    expect(destination).toEqual({ screen: "Shop", params: { q: "orange mazoe", category: "food", availableOnly: true } });
    if (destination?.screen !== "Shop") throw new Error("The native shop was not opened.");
    expect(filterShopProducts(catalog, destination.params)).toEqual([product]);
    expect(filterShopProducts(catalog, defaultShopFilters)).toEqual([product, other]);
    expect(filterShopProducts({ ...catalog, source: "memory" }, destination.params)).toEqual([]);
  });
  it.each(["/shop/products?category=food&segment=beverages", "/shop/products?category=drink", "/shop/products?category=beverages"])("keeps %s drink-specific", path => {
    const target = shopDestination(path);
    expect(target?.screen).toBe("Shop");
    if (target?.screen !== "Shop") throw new Error("Expected native catalogue");
    expect(filterShopProducts(catalog, target.params)).toEqual([product]);
    expect(filterShopProducts(catalog, { ...target.params, q: "ORANGE—Mázöe" })).toEqual([product]);
  });
  it("normalizes drink aliases and excludes unapproved products even when they are in stock", () => {
    const filters = { ...defaultShopFilters, category: "beverage" as const, availableOnly: true };
    expect(filterShopProducts({ ...catalog, products: [{ ...product, category: "drinks" }, { ...product, id: 88 }] }, filters)).toHaveLength(1);
  });
  it.each([
    "/shop/order-status#ref=EXAMPLE&access=example", "/shop/interest?lng=en#action=confirm&token=example",
    "/shop/products?segment=cereals", "/shop/products?category=crafts&product=sample",
    "/shop/products?q=first&q=second", "/shop/products?cart=1", "/shop/product/some-slug#details", "/shop/products?category=other",
  ])("preserves every part of website-only destinations such as %s", href => {
    expect(shopDestination(href, "Requested page")).toEqual({ screen: "External", params: { path: href, title: "Requested page" } });
  });
  it.each(["/shoplifting", "//foreign.example/shop", "/shop/\\example", "/travel"])("leaves unrelated or invalid paths out of the Shop flow", href => {
    expect(shopDestination(href)).toBeUndefined();
  });
});

describe("native search retries", () => {
  const item = { title: "Mazoe", href: "/shop/product/mazoe-orange", category: "Product" };
  const page = { title: "Shop", href: "/shop", category: "Shop" };
  it("retains known destinations when a retry returns another partial response and refreshes a repeated hit", () => {
    const previous = readSearchResponse({ results: [item, page], partial: true });
    expect(readSearchResponse({ partial: true, results: [{ ...page, summary: "Updated" }] }, previous).results)
      .toEqual([{ ...page, summary: "Updated" }, item]);
    expect(readSearchResponse({ results: [] }, previous)).toEqual({ results: [], partial: false });
  });
  it("rejects malformed results without mutating the displayed hits", () => {
    const previous = readSearchResponse({ results: [item], partial: true });
    expect(() => readSearchResponse({ results: [{ ...item, href: "//invalid.example/" }] }, previous)).toThrow();
    expect(previous.results).toEqual([item]);
  });
});
