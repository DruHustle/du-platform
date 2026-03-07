import { createLazyRoute } from "../core/routing";

export const adminRoutes = [createLazyRoute("/admin", () => import("./pages/AdminDashboardPage"))];
