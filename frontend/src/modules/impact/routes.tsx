import ImpactPage from "./pages/ImpactPage";
import { createStaticRoute } from "../core/routing";

export const impactRoutes = [createStaticRoute("/impact", ImpactPage)];
