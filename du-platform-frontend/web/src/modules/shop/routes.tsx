import { createLazyRoute, createStaticRoute } from "../core/routing";
import ShopHomePage from "./pages/ShopHomePage";

export const shopRoutes = [
  createLazyRoute(
    "/shop/interest",
    () => import("./pages/ProductInterestPage")
  ),
  createLazyRoute("/shop/product/:slug", () => import("./pages/ProductPage")),
  createLazyRoute(
    "/shop/order-status",
    () => import("./pages/OrderStatusPage")
  ),
  createStaticRoute("/shop", ShopHomePage),
  createLazyRoute("/shop/products", () => import("./pages/ShopProductsPage")),
];
