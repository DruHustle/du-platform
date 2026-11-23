import { createRedirectRoute, createStaticRoute } from "../core/routing";
import TechnologyPage from "./pages/TechnologyPage";

export const technologyRoutes = [
  createStaticRoute("/onesa", TechnologyPage),
  createRedirectRoute("/technology", "/onesa"),
];
