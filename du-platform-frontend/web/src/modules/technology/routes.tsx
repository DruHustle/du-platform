import { createStaticRoute } from "../core/routing";
import TechnologyPage from "./pages/TechnologyPage";

export const technologyRoutes = [
  createStaticRoute("/technology", TechnologyPage),
];
