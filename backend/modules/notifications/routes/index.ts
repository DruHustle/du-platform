import { Router } from "express";
import { rateLimiter } from "../../../core/rateLimiter";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { NotificationController } from "../controllers/notificationController";

export function createNotificationsModuleRouter() {
  const router = Router();
  const controller = new NotificationController();

  router.post(
    "/features",
    requireJwtAuth,
    rateLimiter({ keyPrefix: "api:notifications:features", windowMs: 60_000, maxRequests: 20 }),
    controller.createFeatureNotification
  );

  return router;
}
