import { SHOP_SEED_PRODUCTS } from "@shared/shopCatalog";
import { SHOP_CATEGORY_CONFIG } from "@/lib/shopCategories";
import type { ShopProduct } from "./useShopCatalog";

const seedDescriptions = new Map(
  SHOP_SEED_PRODUCTS.map(product => [product.slug, product.description])
);

export function shopProductDescription(
  product: Pick<ShopProduct, "slug" | "description">,
  translate: (key: string, fallback: string) => string
) {
  // Curated translations describe the original seed. Owner edits are the source
  // of truth and must not be silently replaced by an older translation.
  return seedDescriptions.get(product.slug) === product.description
    ? translate(
        `shop.products.descriptions.${product.slug}`,
        product.description
      )
    : product.description;
}

export function matchesShopSegment(
  product: Pick<ShopProduct, "name" | "description" | "category" | "image_url">,
  segment: string
) {
  if (!segment) return true;
  if (
    (segment === "beverages" && product.category === "beverage") ||
    (segment === "crafts" && product.category === "crafts") ||
    (segment === "apparel" && product.category === "sports")
  )
    return true;
  const config = SHOP_CATEGORY_CONFIG.find(item => item.key === segment);
  if (config?.images.includes(product.image_url)) return true;
  const haystack = `${product.name} ${product.description}`.toLowerCase();
  return (config?.keywords ?? [segment]).some(keyword =>
    haystack.includes(keyword)
  );
}
