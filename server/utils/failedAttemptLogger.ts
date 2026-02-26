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

export async function logFailedFinancialAttempt(input: FailedAttemptInput): Promise<void> {
  const reason = sanitizeText(input.reason, 500);
  const endpoint = sanitizeText(input.endpoint, 255);
  const ipAddress = sanitizeText(input.ip ?? "unknown", 80);

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
        input.payload == null ? null : JSON.stringify(input.payload),
      ]
    );
  } catch (error) {
    console.warn("[financial:failed] unable to persist failed attempt", error);
  }
}
