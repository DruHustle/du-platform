import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
// Node's default scrypt maxmem is too low for this work factor, which causes
// registrations and logins to fail with ERR_CRYPTO_INVALID_SCRYPT_PARAMS.
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;
const SCRYPT_OPTIONS = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM };

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, originalHash] = String(storedHash ?? "").split(":");
  if (!salt || !originalHash) return false;

  const checkHash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  try {
    return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), checkHash);
  } catch {
    return false;
  }
}
