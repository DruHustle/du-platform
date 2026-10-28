import { Router } from "express";
import { z } from "zod";
import { parseNewsletter } from "../newsletter/routes";
import { TransactionalService } from "./transactionalService";
import { ok } from "../../lib/responseFormatter";
import { AppError } from "../../core/errorHandler";
import { rateLimiter } from "../../core/rateLimiter";

export function createTransactionalAdminRouter(
  service = new TransactionalService()
) {
  const router = Router();
  // Mounted inside the existing current-version, verified administrator guard.
  router.get("/", async (req, res, next) => {
    try {
      const { page } = parseNewsletter(
        z.object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
        }),
        req.query
      );
      const [enquiries, deliveries] = await Promise.all([
        service.inbox(page),
        service.messageDeliveries(page),
      ]);
      res.json(ok({ enquiries, deliveries, page }));
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              503,
              "SERVICE_INBOX_UNAVAILABLE",
              "The saved enquiry inbox is temporarily unavailable."
            )
      );
    }
  });
  router.post(
    "/:id/action",
    rateLimiter({
      keyPrefix: "service-inbox:actions",
      windowMs: 60000,
      maxRequests: 20,
    }),
    async (req, res, next) => {
      try {
        const id = parseNewsletter(
          z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          req.params.id
        );
        const input = parseNewsletter(
          z.object({
            action: z.enum(["retry", "accepted", "close"]),
            providerId: z
              .string()
              .trim()
              .regex(/^[a-zA-Z0-9_-]{1,100}$/)
              .optional(),
          }),
          req.body
        );
        res.json(
          ok(
            await service.act(
              id,
              input.action,
              Number(req.auth?.userId),
              input.providerId
            )
          )
        );
      } catch (error) {
        next(
          error instanceof AppError
            ? error
            : new AppError(
                503,
                "SERVICE_ACTION_UNAVAILABLE",
                "The action could not be confirmed. Reload the current status before retrying."
              )
        );
      }
    }
  );
  return router;
}
