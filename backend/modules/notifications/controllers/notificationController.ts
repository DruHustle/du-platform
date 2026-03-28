import type express from "express";
import { error, ok } from "../../../shared/responseFormatter";
import {
  NotificationService,
  NotificationServiceError,
} from "../services/notificationService";

export class NotificationController {
  constructor(private readonly service = new NotificationService()) {}

  createNewsletterSubscription = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.createNewsletterSubscription(req.body?.email);
      return res.status(data.created ? 201 : 200).json(ok(data));
    } catch (err) {
      if (err instanceof NotificationServiceError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res
        .status(500)
        .json(error("NEWSLETTER_SUBSCRIPTION_FAILED", "Unable to save newsletter subscription."));
    }
  };

  createFeatureNotification = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
    }

    try {
      return res.json(ok(await this.service.createFeatureNotification(userId, req.body?.feature)));
    } catch (err) {
      if (err instanceof NotificationServiceError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res
        .status(500)
        .json(error("FEATURE_NOTIFICATION_FAILED", "Unable to save notify request."));
    }
  };

  createContactInquiry = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.createContactInquiry(req.body);
      return res.status(201).json(ok(data));
    } catch (err) {
      if (err instanceof NotificationServiceError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res
        .status(500)
        .json(error("CONTACT_INQUIRY_FAILED", "Unable to send your message. Please try again."));
    }
  };
}
