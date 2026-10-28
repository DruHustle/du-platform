import crypto from "crypto";
import type express from "express";
import { error } from "../lib/responseFormatter";
import { resolveJwtSecret } from "../utils/jwtSecret";

type JwtClaims = {
  sub?: string | number;
  userId?: string | number;
  email?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        email?: string;
        claims: JwtClaims;
      };
    }
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function toBase64Url(data: Buffer): string {
  return data.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function timingSafeEqualText(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyToken(token: string, secret: string): JwtClaims {
  const parts = token.split(".");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (parts.length !== 3 || !encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Malformed token.");
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string; typ?: string };
  if (header.alg !== "HS256") {
    throw new Error("Unsupported JWT algorithm.");
  }

  const signaturePayload = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = toBase64Url(
    crypto.createHmac("sha256", secret).update(signaturePayload).digest()
  );

  if (!timingSafeEqualText(expectedSignature, encodedSignature)) {
    throw new Error("Invalid JWT signature.");
  }

  const claims = JSON.parse(decodeBase64Url(encodedPayload)) as JwtClaims;
  const now = Math.floor(Date.now() / 1000);

  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("Invalid JWT claims.");
  }
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || now >= claims.exp) {
    throw new Error("JWT expiry is missing, invalid, or expired.");
  }
  if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf))) {
    throw new Error("Invalid JWT activation time.");
  }
  if (typeof claims.nbf === "number" && now < claims.nbf) {
    throw new Error("JWT not active yet.");
  }

  return claims;
}

function resolveBearerToken(req: express.Request): string {
  const authHeader = String(req.headers.authorization ?? "").trim();
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing bearer token.");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("Bearer token is empty.");
  return token;
}

export function requireJwtAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    let secret = "";
    try {
      secret = resolveJwtSecret();
    } catch {
      return res.status(500).json(error("JWT_CONFIG_ERROR", "JWT secret is not configured."));
    }

    const token = resolveBearerToken(req);
    const claims = verifyToken(token, secret);

    const rawUserId = claims.sub ?? claims.userId;
    const userId = Number(rawUserId);
    if ((typeof rawUserId !== "number" && typeof rawUserId !== "string") || !Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json(error("JWT_INVALID_SUBJECT", "Token subject is invalid."));
    }

    req.auth = {
      userId,
      email: typeof claims.email === "string" ? claims.email : undefined,
      claims,
    };

    return next();
  } catch {
    return res.status(401).json(error("JWT_UNAUTHORIZED", "Invalid or expired token."));
  }
}
