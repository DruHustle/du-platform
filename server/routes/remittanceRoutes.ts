import { Router } from "express";
import {
  getCashPickupChannels,
  getRemittanceStatus,
  previewFxQuote,
  sendMoney,
} from "../controllers/remittanceController";
import { requireJwtAuth } from "../middleware/jwtAuth";
import { createRateLimiter } from "../middleware/rateLimiter";

export function createRemittanceRouter(): Router {
  const router = Router();

  const quoteLimiter = createRateLimiter({
    keyPrefix: "remittance:quote",
    windowMs: 60_000,
    maxRequests: 20,
  });

  const sendLimiter = createRateLimiter({
    keyPrefix: "remittance:send",
    windowMs: 60_000,
    maxRequests: 5,
  });

  router.get("/cash-pickup-channels", requireJwtAuth, getCashPickupChannels);
  router.post("/quote", quoteLimiter, previewFxQuote);
  router.post("/send", requireJwtAuth, sendLimiter, sendMoney);
  router.get("/:id", requireJwtAuth, getRemittanceStatus);

  return router;
}
