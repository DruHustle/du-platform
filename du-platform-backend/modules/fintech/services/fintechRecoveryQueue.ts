import fs from "fs/promises";
import path from "path";
import type mysql from "mysql2/promise";
import { logger } from "../../../core/logger";
import { getNotifyAlertEmails, getNotifyFromEmail, sendEmailMessageSafe } from "../../../shared/email";
import { db } from "../../../shared/databaseRuntime";

type RecoveryFlow = "remittance" | "airtime";

export type RecoveryRecord = {
  flow: RecoveryFlow;
  provider: string;
  userId: number;
  idempotencyKey: string | null;
  providerReference: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  recordedAt: string;
  reason: string;
  metadata?: Record<string, unknown>;
};

function resolveRecoveryFilePath(flow: RecoveryFlow) {
  const configuredDir = String(process.env.FINTECH_RECOVERY_DIR ?? "").trim();
  const baseDir = configuredDir
    ? path.resolve(configuredDir)
    : path.resolve(process.cwd(), ".runtime", "fintech-recovery");
  return {
    baseDir,
    filePath: path.join(baseDir, `${flow}.jsonl`),
  };
}

async function appendRecoveryFileFallback(record: RecoveryRecord) {
  const { baseDir, filePath } = resolveRecoveryFilePath(record.flow);
  // Emergency-only fallback when the shared database is unavailable.
  // This file is local to the current server instance and is therefore not
  // multi-instance safe. The DB-backed recovery table remains the primary path.
  await fs.mkdir(baseDir, { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

async function insertRecoveryRecord(record: RecoveryRecord) {
  if (!db) return false;

  await db.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO fintech_recovery_records
    (flow, provider, user_id, idempotency_key, provider_reference, status, amount, currency, reason, metadata_json, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.flow,
      record.provider,
      record.userId,
      record.idempotencyKey,
      record.providerReference,
      record.status,
      record.amount,
      record.currency,
      record.reason,
      JSON.stringify(record.metadata ?? {}),
      record.recordedAt,
    ]
  );

  return true;
}

async function alertRecoveryRecord(record: RecoveryRecord) {
  const recipients = await getNotifyAlertEmails();
  if (recipients.length === 0) return;

  const from = await getNotifyFromEmail();
  const subject = `[Fintech recovery] ${record.flow} persistence failed after provider success`;
  const html = `<p><strong>Fintech recovery record created</strong></p>
<p>Flow: ${record.flow}</p>
<p>Provider: ${record.provider}</p>
<p>User ID: ${record.userId}</p>
<p>Provider reference: ${record.providerReference ?? "-"}</p>
<p>Idempotency key: ${record.idempotencyKey ?? "-"}</p>
<p>Status: ${record.status ?? "-"}</p>
<p>Amount: ${record.amount ?? "-"} ${record.currency ?? ""}</p>
<p>Reason: ${record.reason}</p>
<p>Recorded at: ${record.recordedAt}</p>`;
  const text =
    `Fintech recovery record created. Flow: ${record.flow}. Provider: ${record.provider}. ` +
    `User ID: ${record.userId}. Provider reference: ${record.providerReference ?? "-"}. ` +
    `Idempotency key: ${record.idempotencyKey ?? "-"}. Status: ${record.status ?? "-"}. ` +
    `Amount: ${record.amount ?? "-"} ${record.currency ?? ""}. Reason: ${record.reason}. ` +
    `Recorded at: ${record.recordedAt}.`;

  await sendEmailMessageSafe({ to: recipients, from, subject, html, text }, "fintech-recovery-alert");
}

export async function appendFintechRecoveryRecord(record: RecoveryRecord) {
  let persistedToDatabase = false;

  try {
    persistedToDatabase = await insertRecoveryRecord(record);
  } catch (error) {
    logger.error("fintech_recovery_db_write_failed", {
      flow: record.flow,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (!persistedToDatabase) {
    logger.warn("fintech_recovery_local_file_fallback", {
      flow: record.flow,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      note: "Recovery record persisted to instance-local disk fallback because the shared database path was unavailable.",
    });
    await appendRecoveryFileFallback(record);
  }

  void alertRecoveryRecord(record).catch((error) => {
    logger.error("fintech_recovery_alert_failed", {
      flow: record.flow,
      providerReference: record.providerReference,
      idempotencyKey: record.idempotencyKey,
      reason: error instanceof Error ? error.message : String(error),
    });
  });
}
