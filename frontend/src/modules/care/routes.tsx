import { createStaticRoute } from "../core/routing";
import CareHomePage from "./pages/CareHomePage";

export const careRoutes = [createStaticRoute("/care", CareHomePage)];
