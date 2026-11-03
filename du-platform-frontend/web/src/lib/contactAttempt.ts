import { safeSessionStorage } from "./browserStorage";
const key = "du_contact_attempt_v1";
let attempt: { requestId: string; fingerprint: string } | null = null;
export async function prepareContactAttempt(payload: unknown) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const fingerprint = Array.from(new Uint8Array(hash), v =>
    v.toString(16).padStart(2, "0")
  ).join("");
  if (!attempt) {
    try {
      attempt = JSON.parse(safeSessionStorage.getItem(key) || "null");
    } catch {
      attempt = null;
    }
  }
  if (
    attempt &&
    (!/^[a-f0-9-]{36}$/.test(attempt.requestId) ||
      !/^[a-f0-9]{64}$/.test(attempt.fingerprint))
  )
    attempt = null;
  if (attempt && attempt.fingerprint !== fingerprint)
    throw new Error("CONTACT_MESSAGE_CHANGED");
  attempt ??= { requestId: crypto.randomUUID(), fingerprint };
  // Tab-scoped opaque ID and digest only. No name/email/phone/message is stored.
  safeSessionStorage.setItem(key, JSON.stringify(attempt));
  return attempt.requestId;
}
export function clearContactAttempt() {
  attempt = null;
  safeSessionStorage.removeItem(key);
}
