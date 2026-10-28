import type express from "express";
import { AppError } from "../../../core/errorHandler";
import { error, ok } from "../../../lib/responseFormatter";
import {
  NotificationService,
  NotificationServiceError,
} from "../services/notificationService";

export class NotificationController {
  constructor(private readonly service = new NotificationService()) {}

  createFeatureNotification = async (
    req: express.Request,
    res: express.Response
  ) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
    }

    try {
      return res.json(
        ok(
          await this.service.createFeatureNotification(
            userId,
            req.body?.feature
          )
        )
      );
    } catch (err) {
      if (err instanceof AppError)
        return res.status(err.statusCode).json(error(err.code, err.message));
      if (err instanceof NotificationServiceError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res
        .status(500)
        .json(
          error("FEATURE_NOTIFICATION_FAILED", "Unable to save notify request.")
        );
    }
  };

  createContactInquiry = async (
    req: express.Request,
    res: express.Response
  ) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const data = await this.service.createContactInquiry(req.body);
      return res.status(201).json(ok(data));
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 409)
        return res.status(409).json(error(err.code, err.message));
      if (err instanceof NotificationServiceError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res
        .status(503)
        .json(
          error(
            "CONTACT_INQUIRY_FAILED",
            "Your enquiry could not be confirmed as saved. Keep your message and retry with the same request ID."
          )
        );
    }
  };
}
