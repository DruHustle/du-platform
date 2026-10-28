import { Router } from "express";
import { z } from "zod";
import { ProductInterestService } from "./interestService";
import { parseNewsletter } from "../newsletter/routes";
import { ok } from "../../lib/responseFormatter";
import { rateLimiter } from "../../core/rateLimiter";
export function createInterestRouter(
  admin = false,
  service = new ProductInterestService()
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  if (admin) {
    router.get("/", async (req, res, next) => {
      try {
        const date = z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine(
            s =>
              !Number.isNaN(Date.parse(s)) &&
              new Date(s).toISOString().slice(0, 10) === s
          );
        const input = parseNewsletter(
          z
            .object({
              from: date.default(
                new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10)
              ),
              to: date.default(new Date().toISOString().slice(0, 10)),
            })
            .refine(v => v.from <= v.to),
          req.query
        );
        res.json(ok(await service.demand(input.from, input.to)));
      } catch (error) {
        next(error);
      }
    });
  } else {
    router.use(
      rateLimiter({
        keyPrefix: "product-interest:preferences",
        windowMs: 60000,
        maxRequests: 20,
      })
    );
    for (const action of ["confirm", "cancel"] as const)
      router.post(`/${action}`, async (req, res, next) => {
        try {
          const { token } = parseNewsletter(
            z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }),
            req.body
          );
          res.json(ok(await service[action](token)));
        } catch (error) {
          next(error);
        }
      });
  }
  return router;
}
