import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { rateLimiter } from "../../core/rateLimiter";
import { getAdminAuthUser } from "../../shared/admin";
import { ok } from "../../shared/responseFormatter";
import { AppError } from "../../core/errorHandler";
import { NewsletterService } from "./service";

export const subscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  // Email-only requests from previously deployed signup forms remain supported.
  consent: z.literal(true).optional(),
});
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });
const draftSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine(s => !/[\r\n]/.test(s), "Subject must be one line."),
  body: z.string().trim().min(1).max(20000),
  version: z.number().int().positive().optional(),
});
const versionSchema = z.object({ version: z.number().int().positive() });
const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().trim().max(255).default(""),
  status: z
    .enum(["all", "subscribed", "pending", "unsubscribed"])
    .default("all"),
});
export function parseNewsletter<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      400,
      "NEWSLETTER_VALIDATION_FAILED",
      parsed.error.issues[0]?.message || "Check your input."
    );
  return parsed.data;
}
const id = (req: Request) =>
  parseNewsletter(z.coerce.number().int().positive(), req.params.id);
const handle =
  (run: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(run(req, res))
      .then(data => res.json(ok(data)))
      .catch(next);
  };
export function createNewsletterPublicRouter(
  service = new NewsletterService()
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(
    rateLimiter({
      keyPrefix: "newsletter:preferences",
      windowMs: 60000,
      maxRequests: 20,
    })
  );
  router.post(
    "/confirm",
    handle(async req =>
      service.confirm(parseNewsletter(tokenSchema, req.body).token)
    )
  );
  router.post(
    "/unsubscribe",
    handle(async req =>
      service.unsubscribe(parseNewsletter(tokenSchema, req.body).token)
    )
  );
  return router;
}
// Mount ONLY behind the existing JWT + database-backed admin allowlist guard.
export function createNewsletterAdminRouter(service = new NewsletterService()) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get(
    "/subscribers",
    handle(async req =>
      service.subscribers(parseNewsletter(listSchema, req.query))
    )
  );
  router.post(
    "/subscribers/:id/unsubscribe",
    handle(async req => service.removeSubscriber(id(req)))
  );
  router.get(
    "/campaigns",
    handle(async () => service.campaigns())
  );
  router.post(
    "/campaigns",
    handle(async (req, res) =>
      service.saveDraft(
        parseNewsletter(draftSchema, req.body),
        getAdminAuthUser(res)!.id
      )
    )
  );
  router.put(
    "/campaigns/:id",
    handle(async (req, res) =>
      service.saveDraft(
        parseNewsletter(draftSchema, req.body),
        getAdminAuthUser(res)!.id,
        id(req)
      )
    )
  );
  router.post(
    "/campaigns/:id/test",
    rateLimiter({
      keyPrefix: "newsletter:test",
      windowMs: 60000,
      maxRequests: 3,
    }),
    handle(async (req, res) =>
      service.testDraft(
        id(req),
        getAdminAuthUser(res)!.email,
        parseNewsletter(versionSchema, req.body).version
      )
    )
  );
  router.post(
    "/campaigns/:id/send",
    rateLimiter({
      keyPrefix: "newsletter:send",
      windowMs: 60000,
      maxRequests: 3,
    }),
    handle(async req => {
      const input = parseNewsletter(
        versionSchema.extend({ confirm: z.literal(true) }),
        req.body
      );
      return service.queueCampaign(id(req), input.version);
    })
  );
  router.get(
    "/deliveries",
    handle(async req =>
      service.deliveries(parseNewsletter(listSchema, req.query).page)
    )
  );
  router.post(
    "/deliveries/:id/retry",
    rateLimiter({
      keyPrefix: "newsletter:retry",
      windowMs: 60000,
      maxRequests: 10,
    }),
    handle(async req => service.retryDelivery(id(req)))
  );
  return router;
}
