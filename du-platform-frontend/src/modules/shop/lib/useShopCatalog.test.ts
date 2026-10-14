import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicShopSeedProducts } from "@shared/shopCatalog";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get } }));

describe("shared catalog requests", () => {
  beforeEach(() => {
    vi.resetModules();
    get.mockReset();
  });

  it("accepts an empty catalog and rejects malformed prices, stock, identity and currency", async () => {
    const { validateShopProducts } = await import("./useShopCatalog");
    const products = getPublicShopSeedProducts();
    expect(validateShopProducts([])).toEqual([]);
    expect(validateShopProducts(products)).toBe(products);
    for (const invalid of [
      null,
      {},
      [null],
      [{ ...products[0], stock_qty: -1 }],
      [{ ...products[0], price_cents: "100" }],
      [{ ...products[0], currency: "EU" }],
      [products[0], products[0]],
    ]) {
      expect(() => validateShopProducts(invalid)).toThrow();
    }
  });

  it("deduplicates simultaneous requests and caches a successful catalog", async () => {
    let resolve!: (data: unknown) => void;
    get.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const { refreshShopCatalog } = await import("./useShopCatalog");
    const first = refreshShopCatalog();
    expect(refreshShopCatalog()).toBe(first);
    resolve({ data: { products: [] } });
    await first;
    await refreshShopCatalog();
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValue({ data: { products: [] } });
    await refreshShopCatalog(true);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("backs off after unavailable or invalid responses and permits explicit retry", async () => {
    get
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValue({ data: { products: [] } });
    const { refreshShopCatalog } = await import("./useShopCatalog");
    await refreshShopCatalog();
    await refreshShopCatalog();
    expect(get).toHaveBeenCalledTimes(1);
    await refreshShopCatalog(true);
    expect(get).toHaveBeenCalledTimes(2);
    get.mockResolvedValueOnce({ data: null });
    await expect(refreshShopCatalog(true)).resolves.toBeUndefined();
  });
});
