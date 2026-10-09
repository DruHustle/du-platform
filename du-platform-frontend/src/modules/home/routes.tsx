import HomePage from "./pages/HomePage";
import { createStaticRoute } from "../core/routing";

export const homeRoutes = [createStaticRoute("/", HomePage)];
