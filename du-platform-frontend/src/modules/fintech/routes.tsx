import { createStaticRoute } from "../core/routing";
import PaymentsPage from "./pages/PaymentsPage";

// Payments landing is statically imported so it renders immediately on direct navigation/refresh.
export const fintechRoutes = [createStaticRoute("/remittances", PaymentsPage)];
