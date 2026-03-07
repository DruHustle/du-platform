import { createLazyRoute } from "../core/routing";

export const investmentRoutes = [
  createLazyRoute("/investment", () => import("./pages/InvestmentModulePage")),
  createLazyRoute("/investment/opportunities", () => import("./pages/InvestmentOpportunitiesPage"), {
    prefetchOnIdle: true,
  }),
  createLazyRoute("/investment/projects/:id", () => import("./pages/ProjectDetailsPage")),
  createLazyRoute("/ntir", () => import("./pages/NtirDatabasePage")),
];
