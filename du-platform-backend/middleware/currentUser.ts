import type express from "express";
import { findUserById } from "../shared/persistence/authStore";
import { error } from "../shared/responseFormatter";

// JWT signature validation alone cannot revoke a token after password reset.
// Use after requireJwtAuth on ordinary account routes; admin routes already
// enforce the same version check alongside their verified allowlist check.
export async function requireCurrentUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const user = req.auth ? await findUserById(req.auth.userId) : null;
    const version = req.auth?.claims.av;
    if (
      !user ||
      !Number.isSafeInteger(version) ||
      version !== Number(user.auth_version ?? 0)
    ) {
      return res
        .status(401)
        .json(error("AUTH_SESSION_EXPIRED", "Please sign in again."));
    }
    return next();
  } catch {
    return res
      .status(503)
      .json(
        error("AUTH_UNAVAILABLE", "Account access is temporarily unavailable.")
      );
  }
}
