import SearchResultsPage from "./pages/SearchResultsPage";
import { createStaticRoute } from "../core/routing";

export const searchRoutes = [createStaticRoute("/search", SearchResultsPage)];
