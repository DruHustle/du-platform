import PaymentsPage from "./pages/PaymentsPage";
import { createStaticRoute } from "../core/routing";

export const fintechRoutes = [createStaticRoute("/payments", PaymentsPage)];
