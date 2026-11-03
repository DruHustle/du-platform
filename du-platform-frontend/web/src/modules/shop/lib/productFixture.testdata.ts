import type { ShopProduct } from "./useShopCatalog";
export const productFixture: ShopProduct = {
  id: 123,
  slug: "test-product",
  name: "Test product",
  category: "crafts",
  description: "Fixture description",
  image_url: "/images/test.png",
  price_cents: 100,
  currency: "EUR",
  stock_qty: 2,
  translation_key: "shop.products.descriptions.test-product",
};
