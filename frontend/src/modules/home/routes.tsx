import { createLazyRoute } from "../core/routing";

export const homeRoutes = [createLazyRoute("/", () => import("./pages/HomePage"))];
