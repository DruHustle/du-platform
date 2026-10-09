import NotFoundPage from "./pages/NotFoundPage";
import { createStaticRoute } from "./routing";

export const coreRoutes = [createStaticRoute("/404", NotFoundPage)];
