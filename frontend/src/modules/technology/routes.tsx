import { createLazyRoute } from "../core/routing";

export const technologyRoutes = [createLazyRoute("/technology", () => import("./pages/TechnologyPage"))];
