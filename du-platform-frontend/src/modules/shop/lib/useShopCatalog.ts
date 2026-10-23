import { isShopCurrency } from "@shared/shopCurrency";
import { useEffect, useSyncExternalStore } from "react";
import { getPublicShopSeedProducts } from "@shared/shopCatalog";
import { api } from "@/lib/api";

export type ShopProduct = ReturnType<typeof getPublicShopSeedProducts>[number];
type Catalog = {
  products: ShopProduct[];
  status: "loading" | "ready" | "error";
  updatedAt: number;
};
let catalog: Catalog = {
  products: getPublicShopSeedProducts(),
  status: "loading",
  updatedAt: 0,
};
let request: Promise<void> | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => catalog;
function publish(next: Catalog) {
  catalog = next;
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function validateShopProducts(value: unknown): ShopProduct[] {
  if (!Array.isArray(value)) throw new Error("Invalid catalog response");
  const ids = new Set<number>();
  for (const p of value) {
    if (
      !Number.isSafeInteger(p?.id) ||
      p.id <= 0 ||
      ids.has(p.id) ||
      typeof p.slug !== "string" ||
      !p.slug ||
      typeof p.name !== "string" ||
      !p.name ||
      typeof p.description !== "string" ||
      typeof p.category !== "string" ||
      typeof p.image_url !== "string" ||
      typeof p.currency !== "string" ||
      !isShopCurrency(p.currency) ||
      !Number.isSafeInteger(p.price_cents) ||
      p.price_cents < 0 ||
      !Number.isSafeInteger(p.stock_qty) ||
      p.stock_qty < 0
    )
      throw new Error("Invalid catalog product");
    ids.add(p.id);
  }
  return value;
}

export function refreshShopCatalog(force = false): Promise<void> {
  if (request) return request;
  if (
    !force &&
    Date.now() - catalog.updatedAt <
      (catalog.status === "ready" ? 60_000 : 10_000)
  )
    return Promise.resolve();
  publish({ ...catalog, status: "loading" });
  request = api
    .get("/shop/products", { timeout: 15_000 })
    .then(({ data }) => {
      const products = validateShopProducts(data?.products);
      publish({ products, status: "ready", updatedAt: Date.now() });
    })
    .catch(() => {
      publish({ ...catalog, status: "error", updatedAt: Date.now() });
    })
    .finally(() => {
      request = undefined;
    });
  return request;
}
export function useShopCatalog() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void refreshShopCatalog();
  }, []);
  return { ...snapshot, refresh: () => refreshShopCatalog(true) };
}
