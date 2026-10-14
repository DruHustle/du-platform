import { createLazyRoute } from "../core/routing";

export const tourismRoutes = [
  createLazyRoute("/tourism", () => import("./pages/TourismModulePage")),
];
