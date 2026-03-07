import InvestmentModulePage from "./pages/InvestmentModulePage";
import InvestmentOpportunitiesPage from "./pages/InvestmentOpportunitiesPage";
import NTIRSearchPage from "./pages/NTIRSearchPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import { createStaticRoute } from "../core/routing";

export const investmentRoutes = [
  createStaticRoute("/investment", InvestmentModulePage),
  createStaticRoute("/investment/opportunities", InvestmentOpportunitiesPage),
  createStaticRoute("/investment/projects/:id", ProjectDetailsPage),
  createStaticRoute("/ntir", NTIRSearchPage),
];
