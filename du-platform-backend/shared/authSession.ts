import type express from "express";
import {
  deleteSession,
  findUserById,
  getSession,
} from "./persistence/authStore";
import { createJwtToken } from "../utils/jwt";

export const SESSION_COOKIE = "du_session";
function getCookie(req: express.Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;

  const entries = raw.split(";").map(value => value.trim());
  for (const entry of entries) {
    const [cookieKey, ...cookieValue] = entry.split("=");
    if (cookieKey === key) {
      try {
        return decodeURIComponent(cookieValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function setSessionCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
}

export function resolveSessionToken(req: express.Request): string | null {
  const authHeader = String(req.headers.authorization ?? "").trim();
  if (req.headers.authorization !== undefined) {
    // An explicit credential must never fall back to the ambient cookie. Core
    // CSRF middleware exempts bearer requests on the basis of that credential.
    if (!authHeader.startsWith("Bearer ")) return null;
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    return bearerToken && !bearerToken.includes(".") ? bearerToken : null;
  }

  return getCookie(req, SESSION_COOKIE);
}

export async function resolveSessionUser(req: express.Request) {
  const token = resolveSessionToken(req);
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  const user = await findUserById(Number(session.user_id));
  if (!user) return null;

  return user;
}

export async function destroyResolvedSession(req: express.Request) {
  const token = resolveSessionToken(req);
  if (!token) return;
  await deleteSession(token);
}

export function issueAccessTokenForUser(user: {
  id: number;
  email?: string | null;
  full_name?: string | null;
  auth_version?: number;
}) {
  const ttl = Math.max(
    60,
    Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "3600")
  );
  return createJwtToken(
    {
      sub: Number(user.id),
      email: user.email ? String(user.email) : undefined,
      name: user.full_name ? String(user.full_name) : undefined,
      scope: "user",
      av: Number(user.auth_version ?? 0),
    },
    {
      expiresInSeconds: ttl,
      issuer: "du-platform",
      audience: "du-web",
    }
  );
}
