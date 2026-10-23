import { NewsletterService } from "../../newsletter/service";
import { parseNewsletter, subscriptionSchema } from "../../newsletter/routes";
import { ok } from "../../../shared/responseFormatter";
import { Router } from "express";
import { rateLimiter } from "../../../core/rateLimiter";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { NotificationController } from "../controllers/notificationController";
import { validateContactInquiry } from "../validators";

export function createNotificationsModuleRouter() {
  const router = Router();
  const controller = new NotificationController();

  router.post(
    "/newsletter",
    rateLimiter({
      keyPrefix: "api:notifications:newsletter",
      windowMs: 60_000,
      maxRequests: 10,
    }),
    (req, res, next) => {
      try {
        const input = parseNewsletter(subscriptionSchema, req.body);
        new NewsletterService()
          .subscribe(input.email, input.language)
          .then(data => res.status(202).json(ok(data)))
          .catch(next);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/features",
    requireJwtAuth,
    rateLimiter({
      keyPrefix: "api:notifications:features",
      windowMs: 60_000,
      maxRequests: 20,
    }),
    controller.createFeatureNotification
  );

  router.post(
    "/contact",
    rateLimiter({
      keyPrefix: "api:notifications:contact",
      windowMs: 5 * 60_000,
      maxRequests: 5,
    }),
    validateContactInquiry,
    controller.createContactInquiry
  );

  return router;
}
