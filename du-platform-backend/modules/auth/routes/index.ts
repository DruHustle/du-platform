import { onesaRoutes } from "../onesaRoutes";
import { z } from "zod";
import { AppError } from "../../../core/errorHandler";
import { ok } from "../../../shared/responseFormatter";
import { parseNewsletter } from "../../newsletter/routes";
import { AccountDeletionService } from "../accountDeletion";
import { Router } from "express";
import { rateLimiter } from "../../../core/rateLimiter";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { requireCurrentUser } from "../../../middleware/currentUser";
import { AuthController } from "../controllers/authController";
import {
  validateForgotPassword,
  validateLogin,
  validateProfile,
  validateRegister,
  validateResetPassword,
} from "../validators";

export function createAuthModuleRouter() {
  const router = Router();
  const controller = new AuthController();

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.use("/onesa", onesaRoutes());
  router.post(
    "/register",
    rateLimiter({
      keyPrefix: "api:auth:register",
      windowMs: 5 * 60_000,
      maxRequests: 10,
    }),
    validateRegister,
    controller.register
  );
  router.post(
    "/login",
    rateLimiter({
      keyPrefix: "api:auth:login",
      windowMs: 5 * 60_000,
      maxRequests: 12,
    }),
    validateLogin,
    controller.login
  );
  // Use the same rate-limit buckets and validation as browser authentication.
  router.post(
    "/native/register",
    rateLimiter({
      keyPrefix: "api:auth:register",
      windowMs: 5 * 60_000,
      maxRequests: 10,
    }),
    validateRegister,
    controller.nativeRegister
  );
  router.post(
    "/native/login",
    rateLimiter({
      keyPrefix: "api:auth:login",
      windowMs: 5 * 60_000,
      maxRequests: 12,
    }),
    validateLogin,
    controller.nativeLogin
  );
  router.post("/logout", controller.logout);
  router.post(
    "/forgot-password",
    rateLimiter({
      keyPrefix: "api:auth:forgot-password",
      windowMs: 5 * 60_000,
      maxRequests: 8,
    }),
    validateForgotPassword,
    controller.forgotPassword
  );
  router.post(
    "/reset-password",
    rateLimiter({
      keyPrefix: "api:auth:reset-password",
      windowMs: 5 * 60_000,
      maxRequests: 12,
    }),
    validateResetPassword,
    controller.resetPassword
  );
  router.get(
    "/me",
    requireJwtAuth,
    requireCurrentUser,
    rateLimiter({
      keyPrefix: "api:auth:me",
      windowMs: 60_000,
      maxRequests: 60,
      keyByUser: true,
    }),
    controller.me
  );
  router.put(
    "/profile",
    requireJwtAuth,
    requireCurrentUser,
    rateLimiter({
      keyPrefix: "api:auth:profile",
      windowMs: 60_000,
      maxRequests: 10,
      keyByUser: true,
    }),
    validateProfile,
    controller.updateProfile
  );
  router.post(
    "/deletion-request",
    requireJwtAuth,
    requireCurrentUser,
    rateLimiter({
      keyPrefix: "api:auth:deletion-request",
      windowMs: 300000,
      maxRequests: 6,
      keyByUser: true,
    }),
    async (req, res, next) => {
      try {
        const input = parseNewsletter(
          z
            .object({
              accountId: z.number().int().positive(),
              password: z.string().min(1).max(1024),
              confirm: z.literal(true),
            })
            .strict(),
          req.body
        );
        if (input.accountId !== req.auth!.userId)
          throw new AppError(
            409,
            "DELETION_ACCOUNT_CHANGED",
            "Your account changed. Review the request again."
          );
        const result = await new AccountDeletionService().request(
          input.accountId,
          Number(req.auth!.claims.av),
          input.password
        );
        res.status(202).json(ok(result));
      } catch (error) {
        next(
          error instanceof AppError
            ? error
            : new AppError(
                503,
                "DELETION_UNAVAILABLE",
                "The request could not be confirmed. Retry to recover its reference."
              )
        );
      }
    }
  );
  router.post(
    "/token/refresh",
    rateLimiter({
      keyPrefix: "api:auth:token-refresh",
      windowMs: 60_000,
      maxRequests: 30,
    }),
    controller.refresh
  );

  return router;
}
