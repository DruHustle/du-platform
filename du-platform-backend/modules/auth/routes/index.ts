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
    rateLimiter({ keyPrefix: "api:auth:profile", windowMs: 60_000, maxRequests: 10, keyByUser: true }),
    validateProfile,
    controller.updateProfile
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
