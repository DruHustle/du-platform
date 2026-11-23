import { createStaticRoute } from "../core/routing";
import CareHomePage from "./CareHomePage";

export const careRoutes = [createStaticRoute("/care", CareHomePage)];
