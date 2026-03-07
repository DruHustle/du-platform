import AdminDashboardPage from "./pages/AdminDashboardPage";
import { createStaticRoute } from "../core/routing";

export const adminRoutes = [createStaticRoute("/admin", AdminDashboardPage)];
