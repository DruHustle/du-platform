import type { CustomerLanguage } from "@/domain/customerLanguage";
import { SHOP_CATEGORY_CONFIG } from "@/lib/shopCategories";

export const catalogCategories = ["all", "sports", "crafts", "food"] as const;
export type CatalogCategory = (typeof catalogCategories)[number];

export interface CatalogFilters {
  category: CatalogCategory;
  segment: string;
  query: string;
  availableOnly: boolean;
  product: string;
}

export const emptyCatalogFilters: CatalogFilters = {
  category: "all",
  segment: "",
  query: "",
  availableOnly: false,
  product: "",
};

const drinkCategories = ["beverage", "beverages", "drink", "drinks"];

export function catalogCategory(raw: string | null): CatalogCategory {
  const value = raw?.trim().toLowerCase() ?? "";
  if (drinkCategories.includes(value)) return "food";
  return catalogCategories.find((category) => category === value) ?? "all";
}

export function readCatalogFilters(params: URLSearchParams): CatalogFilters {
  const rawCategory = params.get("category")?.trim().toLowerCase() ?? "";
  const category = catalogCategory(rawCategory);
  const requestedSegment = params.get("segment")?.trim().toLowerCase();
  const segment = SHOP_CATEGORY_CONFIG.find(
    (item) =>
      item.key === requestedSegment &&
      (category === "all" || item.baseCategory === category),
  );
  return {
    category,
    segment:
      segment?.key ??
      (drinkCategories.includes(rawCategory) ? "beverages" : ""),
    query: params.get("q") ?? "",
    availableOnly: params.get("available") === "1",
    product: params.get("product") ?? "",
  };
}

export function catalogQuery(
  filters: CatalogFilters,
  language?: CustomerLanguage,
  cart = false,
) {
  const params = new URLSearchParams();
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.segment) params.set("segment", filters.segment);
  if (filters.query) params.set("q", filters.query);
  if (filters.availableOnly) params.set("available", "1");
  if (filters.product) params.set("product", filters.product);
  if (language) params.set("lng", language);
  if (cart) params.set("cart", "1");
  return params.size ? `?${params}` : "";
}

const separators = new RegExp("[^\\p{L}\\p{N}]+", "gu");

function foldSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(separators, " ")
    .trim();
}

export function matchesCatalogQuery(
  name: string,
  description: string,
  query: string,
) {
  const terms = foldSearchText(query);
  if (!terms) return true;
  const text = foldSearchText(`${name} ${description}`);
  return terms.split(" ").every((term) => text.includes(term));
}
