import CareHomePage from "./pages/CareHomePage";
import { createStaticRoute } from "../core/routing";

export const careRoutes = [createStaticRoute("/care", CareHomePage)];
