import { Router } from "express";
import {
  createTopup,
  detectOperator,
  getAirtimeStatus,
  getTopupOptions,
} from "../controllers/airtimeController";
import { requireJwtAuth } from "../middleware/jwtAuth";
import { createRateLimiter } from "../middleware/rateLimiter";

export function createAirtimeRouter(): Router {
  const router = Router();

  const lookupLimiter = createRateLimiter({
    keyPrefix: "airtime:lookup",
    windowMs: 60_000,
    maxRequests: 30,
  });

  const topupLimiter = createRateLimiter({
    keyPrefix: "airtime:topup",
    windowMs: 60_000,
    maxRequests: 10,
  });

  router.post("/operator/detect", requireJwtAuth, lookupLimiter, detectOperator);
  router.post("/options", requireJwtAuth, lookupLimiter, getTopupOptions);
  router.post("/topup", requireJwtAuth, topupLimiter, createTopup);
  router.get("/:id", requireJwtAuth, getAirtimeStatus);

  return router;
}
