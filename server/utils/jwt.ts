import crypto from "crypto";
import { resolveJwtSecret } from "./jwtSecret";

type JwtPayload = Record<string, unknown>;

function base64UrlEncode(value: string | Buffer): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createJwtToken(
  payload: JwtPayload,
  options?: {
    expiresInSeconds?: number;
    issuer?: string;
    audience?: string;
  }
): string {
  const secret = resolveJwtSecret();

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, Number(options?.expiresInSeconds ?? 3600));

  const claims: JwtPayload = {
    ...payload,
    iat: now,
    exp,
    ...(options?.issuer ? { iss: options.issuer } : {}),
    ...(options?.audience ? { aud: options.audience } : {}),
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}
