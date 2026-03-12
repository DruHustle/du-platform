import { createStaticRoute } from "../core/routing";
import TradeModulePage from "./pages/TradeModulePage";

export const tradeRoutes = [createStaticRoute("/trade", TradeModulePage)];
