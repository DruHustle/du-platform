import TradeModulePage from "./pages/TradeModulePage";
import { createStaticRoute } from "../core/routing";

export const tradeRoutes = [createStaticRoute("/trade", TradeModulePage)];
