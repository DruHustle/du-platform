import TourismModulePage from "./pages/TourismModulePage";
import { createStaticRoute } from "../core/routing";

export const tourismRoutes = [createStaticRoute("/tourism", TourismModulePage)];
