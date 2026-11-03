import { createLazyRoute } from "../core/routing";

export const searchRoutes = [
  createLazyRoute("/search", () => import("./pages/SearchResultsPage")),
];
