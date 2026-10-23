import crypto from "node:crypto";
import { resolveJwtSecret } from "../../utils/jwtSecret";
function key() {
  return crypto
    .createHash("sha256")
    .update(`du-order-access-v1:${resolveJwtSecret()}`)
    .digest();
}
export function sealOrderAccess(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url"
  );
}
export function openOrderAccess(sealed: string) {
  const bytes = Buffer.from(sealed, "base64url");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    bytes.subarray(0, 12)
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
