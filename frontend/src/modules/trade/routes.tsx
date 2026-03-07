import { createLazyRoute } from "../core/routing";

export const tradeRoutes = [createLazyRoute("/trade", () => import("./pages/TradeModulePage"))];
