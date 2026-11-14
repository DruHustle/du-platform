import { createLazyRoute, createStaticRoute } from "../core/routing";
import InvestmentModulePage from "./pages/InvestmentModulePage";

export const investmentRoutes = [
  createStaticRoute("/investment", InvestmentModulePage),
  createStaticRoute("/business-guides", InvestmentModulePage),
  createLazyRoute("/business-guides/:guide", () => import("./pages/BusinessGuidePage")),
  createLazyRoute(
    "/investment/opportunities",
    () => import("./pages/InvestmentOpportunitiesPage")
  ),
  createLazyRoute(
    "/investment/projects/:id",
    () => import("./pages/ProjectDetailsPage")
  ),
  createLazyRoute("/ntir", () => import("./pages/NTIRSearchPage")),
];
