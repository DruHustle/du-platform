import { createStaticRoute } from "../core/routing";
import TourismModulePage from "./pages/TourismModulePage";

export const tourismRoutes = [createStaticRoute("/tourism", TourismModulePage)];
