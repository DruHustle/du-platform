import { createLazyRoute } from "../core/routing";

export const shopRoutes = [
  createLazyRoute("/shop", () => import("./pages/ShopHomePage")),
  createLazyRoute("/shop/products", () => import("./pages/ShopProductsPage"), {
    prefetchOnIdle: true,
  }),
];
