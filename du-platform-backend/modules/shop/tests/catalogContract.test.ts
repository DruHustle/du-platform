import { describe, expect, it, vi } from "vitest";
import { SHOP_SEED_PRODUCTS } from "../../../domain/shopCatalog";
import { ShopService } from "../services/shopService";
import apiSpec from "../../../openapi.json";

vi.mock("../shopReadiness", () => ({
  publicShopReadiness: vi.fn().mockResolvedValue({ mode: "prelaunch", commercialReady: false }),
  assertOrderRequestReadiness: vi.fn(),
}));

describe("catalogue API contract", () => {
  it("returns backend-owned pricing and translates only unedited seed descriptions", async () => {
    const original = SHOP_SEED_PRODUCTS[0];
    const products = [original, { ...original, id: 999, description: "Edited by owner" }];
    const repository = { list: vi.fn().mockResolvedValue({ products, source: "db", cached: false }) };
    const result = await new ShopService(repository as any).listProducts();
    for (const field of apiSpec.components.schemas.Catalogue.required)
      expect(result).toHaveProperty(field);
    for (const field of apiSpec.components.schemas.Catalogue.properties.pricing.required)
      expect(result.pricing).toHaveProperty(field);
    expect(result.pricing.revision).toBeTruthy();
    expect(result.pricing.ratesPerEur.EUR).toBe(1);
    expect(result.pricing.shipping.normalCents).toBeGreaterThanOrEqual(0);
    expect(result.products[0].image_api_url).toMatch(/^\/api\/shop\/assets\//);
    expect(result.products[0].translation_key).toBe(`shop.products.descriptions.${original.slug}`);
    expect(result.products[1].translation_key).toBeNull();
  });
});
