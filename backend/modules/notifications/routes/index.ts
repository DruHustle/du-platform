import { Router } from "express";
import { rateLimiter } from "../../../core/rateLimiter";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { NotificationController } from "../controllers/notificationController";
import { validateNewsletterSubscription } from "../validators";

export function createNotificationsModuleRouter() {
  const router = Router();
  const controller = new NotificationController();

  router.post(
    "/newsletter",
    rateLimiter({ keyPrefix: "api:notifications:newsletter", windowMs: 60_000, maxRequests: 10 }),
    validateNewsletterSubscription,
    controller.createNewsletterSubscription
  );

  router.post(
    "/features",
    requireJwtAuth,
    rateLimiter({ keyPrefix: "api:notifications:features", windowMs: 60_000, maxRequests: 20 }),
    controller.createFeatureNotification
  );

  return router;
}
