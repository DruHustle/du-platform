import { createLazyRoute } from "../core/routing";

export const careRoutes = [createLazyRoute("/care", () => import("./pages/CareHomePage"))];
