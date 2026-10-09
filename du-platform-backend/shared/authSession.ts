import type express from "express";
import { deleteSession, findUserById, getSession } from "./persistence/authStore";
import { createJwtToken } from "../utils/jwt";

export const SESSION_COOKIE = "du_session";
function getCookie(req: express.Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;

  const entries = raw.split(";").map((value) => value.trim());
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
  if (authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    if (bearerToken && !bearerToken.includes(".")) return bearerToken;
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
}) {
  const ttl = Math.max(60, Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "3600"));
  return createJwtToken(
    {
      sub: Number(user.id),
      email: user.email ? String(user.email) : undefined,
      name: user.full_name ? String(user.full_name) : undefined,
      scope: "user",
    },
    {
      expiresInSeconds: ttl,
      issuer: "du-platform",
      audience: "du-web",
    }
  );
}
