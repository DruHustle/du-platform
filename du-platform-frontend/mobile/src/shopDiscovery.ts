import type { Catalog, Product } from "./api";

export const shopCategories = {
  all: "All products", sports: "Sportswear", crafts: "Crafts", food: "Food and drinks", beverage: "Drinks",
} as const;

export type ShopFilters = { q: string; category: keyof typeof shopCategories; availableOnly: boolean };
export const defaultShopFilters: ShopFilters = { q: "", category: "all", availableOnly: false };
const drinkAliases = ["beverage", "beverages", "drink", "drinks"];

export function isSitePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !/[\\\u0000-\u001f\u007f]/u.test(path);
}

function isProductSlug(value: string) {
  return !!value.trim() && value !== "." && value !== ".." && !/[/\\\u0000-\u001f\u007f]/u.test(value);
}

export type ShopDestination =
  | { screen: "Product"; params: { slug: string } }
  | { screen: "Shop"; params: ShopFilters }
  | { screen: "External"; params: { path: string; title: string } };

export function shopDestination(path: string, title?: string): ShopDestination | undefined {
  if (!isSitePath(path) || !/^\/shop(?:[/?#]|$)/.test(path)) return;
  const base = path.split(/[?#]/, 1)[0];
  const siteTitle = base === "/shop/order-status" ? "Order status" : base === "/shop/interest" ? "Product availability updates" : "Shop";
  const website: ShopDestination = { screen: "External", params: { path, title: title || siteTitle } };
  if (path.includes("#")) return website;
  const search = path.slice(base.length);
  const params = new URLSearchParams(search);
  const product = base.match(/^\/shop\/product\/([^/]+)\/?$/);
  if (product && !search) {
    try {
      const slug = decodeURIComponent(product[1]);
      if (isProductSlug(slug)) return { screen: "Product", params: { slug } };
    } catch { /* Retain the original URL for the website. */ }
    return website;
  }
  if (!["/shop", "/shop/", "/shop/products", "/shop/products/"].includes(base)) return website;
  const keys = Array.from(params.keys());
  const slug = params.get("product");
  if (slug && keys.length === 1 && isProductSlug(slug)) return { screen: "Product", params: { slug } };
  if (keys.some(k => !["q", "category", "available", "segment"].includes(k) || params.getAll(k).length !== 1)) return website;
  const rawCategory = params.get("category") || "all";
  const segment = params.get("segment");
  if (segment !== null && !(segment === "beverages" && rawCategory === "food")) return website;
  const category = segment === "beverages" || drinkAliases.includes(rawCategory) ? "beverage" : rawCategory;
  const available = params.get("available");
  if (!Object.hasOwn(shopCategories, category) || (available !== null && !["0", "1"].includes(available))) return website;
  return { screen: "Shop", params: { q: params.get("q") || "", category: category as ShopFilters["category"], availableOnly: available === "1" } };
}

export function canRequestProduct(catalog: Catalog, product: Product) {
  const r = catalog.readiness;
  return catalog.source === "db" && r?.commercialReady === true && r.mode === "pilot" &&
    r.enforcement === "enforced" && Array.isArray(r.approvedProductIds) &&
    r.approvedProductIds.includes(product.id) && product.stock_qty > 0;
}

function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
}

export function filterShopProducts(catalog: Catalog, filters: ShopFilters) {
  const words = searchText(filters.q).trim().split(/\s+/).filter(Boolean);
  return catalog.products.filter(product => {
    const category = product.category.toLowerCase().trim();
    const description = searchText(`${product.name} ${product.description}`);
    const drink = drinkAliases.includes(category) || (category === "food" && (
      /mazoe|maheu|drink|pfuko|beverage|cordial|juice/.test(description) ||
      product.image_url?.startsWith("/images/pages/shop/beverage_")
    ));
    const categoryMatches = filters.category === "all" || category === filters.category ||
      (drink && (filters.category === "food" || filters.category === "beverage"));
    return categoryMatches && words.every(word => description.includes(word)) &&
      (!filters.availableOnly || canRequestProduct(catalog, product));
  });
}
