import { db } from "../db";
import { sanitizeText } from "./sanitize";

type FailedAttemptInput = {
  userId?: number | null;
  flow: "remittance" | "airtime";
  reason: string;
  endpoint: string;
  ip?: string;
  payload?: unknown;
};

const FULL_REDACT_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "secret",
  "api_key",
  "client_secret",
  "cardnumber",
  "card_number",
  "pan",
  "cvv",
  "cvc",
  "pin",
]);

const PARTIAL_REDACT_KEYS = new Set([
  "phone",
  "phonenumber",
  "mobile",
  "mobilenumber",
  "recipientphone",
  "accountnumber",
]);

function maskPartial(value: string): string {
  const normalized = String(value ?? "");
  if (!normalized) return "";
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `${normalized.slice(0, 2)}${"*".repeat(Math.max(normalized.length - 4, 1))}${normalized.slice(-2)}`;
}

function redactPayload(value: unknown, keyHint = ""): unknown {
  if (value == null) return value;

  const normalizedKey = keyHint.trim().toLowerCase();
  if (FULL_REDACT_KEYS.has(normalizedKey)) return "[REDACTED]";
  if (PARTIAL_REDACT_KEYS.has(normalizedKey)) return maskPartial(String(value));

  if (Array.isArray(value)) {
    return value.map((entry) => redactPayload(entry, keyHint));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactPayload(entry, key);
    }
    return out;
  }

  return value;
}

function safeSerializePayload(payload: unknown): string | null {
  if (payload == null) return null;
  try {
    const redacted = redactPayload(payload);
    const serialized = JSON.stringify(redacted);
    if (!serialized) return null;
    const maxLength = 20_000;
    if (serialized.length <= maxLength) return serialized;
    return `${serialized.slice(0, maxLength)}...[truncated]`;
  } catch {
    return JSON.stringify({ error: "unserializable_payload" });
  }
}

export async function logFailedFinancialAttempt(input: FailedAttemptInput): Promise<void> {
  const reason = sanitizeText(input.reason, 500);
  const endpoint = sanitizeText(input.endpoint, 255);
  const ipAddress = sanitizeText(input.ip ?? "unknown", 80);
  const payloadJson = safeSerializePayload(input.payload);

  console.warn(
    `[financial:failed] flow=${input.flow} userId=${String(input.userId ?? "anonymous")} endpoint=${endpoint} reason=${reason}`
  );

  if (!db) return;

  try {
    await db.execute(
      `
      INSERT INTO financial_failed_attempts (user_id, flow, endpoint, reason, ip_address, payload)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId ?? null,
        input.flow,
        endpoint,
        reason,
        ipAddress,
        payloadJson,
      ]
    );
  } catch (error) {
    console.warn("[financial:failed] unable to persist failed attempt", error);
  }
}
