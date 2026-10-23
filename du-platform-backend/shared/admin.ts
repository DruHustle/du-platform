import { isAdminEmail } from "./adminIdentity";
export { isAdminEmail } from "./adminIdentity";
import type express from "express";
import { findUserById } from "./persistence/authStore";
import { error } from "./responseFormatter";

export type AdminAuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export async function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const userId = Number(req.auth?.userId ?? 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
    }

    const user = await findUserById(Math.floor(userId));
    if (!user) {
      return res
        .status(401)
        .json(error("AUTH_USER_NOT_FOUND", "User not found."));
    }

    const email = String(user.email ?? "")
      .trim()
      .toLowerCase();
    if (!isAdminEmail(email) || !user.email_verified_at) {
      return res
        .status(403)
        .json(error("AUTH_FORBIDDEN", "Admin access required."));
    }

    if (Number(req.auth?.claims?.av ?? -1) !== Number(user.auth_version ?? 0)) {
      return res
        .status(401)
        .json(
          error(
            "AUTH_SESSION_EXPIRED",
            "Please sign in again after verifying your email."
          )
        );
    }

    (res.locals as { authUser?: AdminAuthUser }).authUser = {
      id: Number(user.id),
      fullName: String(user.full_name ?? ""),
      email,
    };

    return next();
  } catch {
    return res
      .status(503)
      .json(
        error(
          "ADMIN_AUTH_UNAVAILABLE",
          "Administrator access is temporarily unavailable. Please try again."
        )
      );
  }
}

export function getAdminAuthUser(res: express.Response): AdminAuthUser | null {
  return ((res.locals as { authUser?: AdminAuthUser }).authUser ??
    null) as AdminAuthUser | null;
}
