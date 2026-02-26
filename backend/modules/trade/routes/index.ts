import { Router } from "express";
import { TradeController } from "../controllers/tradeController";
import { validateTradeQuery } from "../validators";
export function createTradeModuleRouter() {
  const router = Router();
  const controller = new TradeController();
  router.get("/health", validateTradeQuery, controller.health);
  return router;
}
