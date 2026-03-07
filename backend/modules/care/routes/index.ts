import { Router } from "express";
import { rateLimiter } from "../../../core/rateLimiter";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { CareController } from "../controllers/careController";
import { validateCareReferral } from "../validators";

export function createCareModuleRouter() {
  const router = Router();
  const controller = new CareController();

  router.get("/health", controller.health);
  router.post(
    "/referrals",
    requireJwtAuth,
    rateLimiter({ keyPrefix: "api:care:referrals", windowMs: 60_000, maxRequests: 20 }),
    validateCareReferral,
    controller.logReferral
  );

  return router;
}
