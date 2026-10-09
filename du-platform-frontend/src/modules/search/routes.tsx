import { createStaticRoute } from "../core/routing";
import SearchResultsPage from "./pages/SearchResultsPage";

export const searchRoutes = [createStaticRoute("/search", SearchResultsPage)];
