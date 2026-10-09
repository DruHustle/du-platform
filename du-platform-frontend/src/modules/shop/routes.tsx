import { createLazyRoute, createStaticRoute } from "../core/routing";
import ShopHomePage from "./pages/ShopHomePage";

export const shopRoutes = [
  createStaticRoute("/shop", ShopHomePage),
  createLazyRoute("/shop/products", () => import("./pages/ShopProductsPage")),
];
