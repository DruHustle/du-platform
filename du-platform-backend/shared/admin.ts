import type express from "express";
import { findUserById } from "./persistence/authStore";
import { error } from "./responseFormatter";

export type AdminAuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export function isAdminEmail(email: string): boolean {
  const configured = String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length === 0) return false;
  return configured.includes(String(email ?? "").trim().toLowerCase());
}

export async function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const userId = Number(req.auth?.userId ?? 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
  }

  const user = await findUserById(Math.floor(userId));
  if (!user) {
    return res.status(401).json(error("AUTH_USER_NOT_FOUND", "User not found."));
  }

  const email = String(user.email ?? "").trim().toLowerCase();
  if (!isAdminEmail(email)) {
    return res.status(403).json(error("AUTH_FORBIDDEN", "Admin access required."));
  }

  (res.locals as { authUser?: AdminAuthUser }).authUser = {
    id: Number(user.id),
    fullName: String(user.full_name ?? ""),
    email,
  };

  return next();
}

export function getAdminAuthUser(res: express.Response): AdminAuthUser | null {
  return ((res.locals as { authUser?: AdminAuthUser }).authUser ?? null) as AdminAuthUser | null;
}
