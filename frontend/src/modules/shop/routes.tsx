import ShopHomePage from "./pages/ShopHomePage";
import ShopProductsPage from "./pages/ShopProductsPage";
import { createStaticRoute } from "../core/routing";

export const shopRoutes = [
  createStaticRoute("/shop", ShopHomePage),
  createStaticRoute("/shop/products", ShopProductsPage),
];
