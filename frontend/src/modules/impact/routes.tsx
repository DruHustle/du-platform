import { createLazyRoute } from "../core/routing";

export const impactRoutes = [createLazyRoute("/impact", () => import("./pages/ImpactPage"))];
