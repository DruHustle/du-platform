import TechnologyPage from "./pages/TechnologyPage";
import { createStaticRoute } from "../core/routing";

export const technologyRoutes = [createStaticRoute("/technology", TechnologyPage)];
