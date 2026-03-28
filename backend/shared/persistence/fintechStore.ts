import type mysql from "mysql2/promise";
import { db } from "../databaseRuntime";
import { findUserById } from "./authStore";

type RemittanceTransactionStatus = "pending" | "processing" | "completed" | "failed";
type AirtimeTransactionStatus = "pending" | "completed" | "failed";
type RemittanceRecipientType = "mobile_money" | "cash_pickup" | "bank_transfer";

type RemittanceTransactionRecord = {
  id: number;
  user_id: number;
  recipient_name: string;
  recipient_type: RemittanceRecipientType;
  provider: string;
  payout_channel: string | null;
  amount_sent: number;
  amount_received: number | null;
  currency_from: string;
  currency_to: string;
  exchange_rate: number | null;
  status: RemittanceTransactionStatus;
  provider_reference: string | null;
  idempotency_key: string | null;
  completion_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type AirtimeTransactionRecord = {
  id: number;
  user_id: number;
  provider: string;
  phone_number: string;
  operator_id: string | null;
  amount: number;
  currency: string | null;
  provider_reference: string | null;
  reloadly_reference: string | null;
  idempotency_key: string | null;
  status: AirtimeTransactionStatus;
  completion_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const memoryRemittanceTransactions: RemittanceTransactionRecord[] = [];
const memoryAirtimeTransactions: AirtimeTransactionRecord[] = [];
let memoryRemittanceTransactionIdCounter = 0;
let memoryAirtimeTransactionIdCounter = 0;

export async function getUserFinancialProfile(userId: number): Promise<{
  id: number;
  full_name: string;
  email: string;
  kyc_verified: boolean;
} | null> {
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    const user = await findUserById(normalizedUserId);
    if (!user) return null;
    return {
      id: Number(user.id),
      full_name: String(user.full_name ?? ""),
      email: String(user.email ?? ""),
      kyc_verified: Boolean(user.kyc_verified),
    };
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, full_name, email, COALESCE(kyc_verified, 0) AS kyc_verified
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [normalizedUserId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      kyc_verified: Boolean(Number(row.kyc_verified ?? 0)),
    };
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_BAD_FIELD_ERROR") {
      throw error;
    }

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, full_name, email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [normalizedUserId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      kyc_verified: false,
    };
  }
}

export async function createRemittanceTransactionRecord(
  input: {
    userId: number;
    recipientName: string;
    recipientType: RemittanceRecipientType;
    provider: string;
    payoutChannel: string | null;
    amountSent: number;
    amountReceived: number | null;
    currencyFrom: string;
    currencyTo: string;
    exchangeRate: number | null;
    status: RemittanceTransactionStatus;
    providerReference: string | null;
    idempotencyKey: string;
  },
  connection?: mysql.PoolConnection
) {
  const amountSent = Number(input.amountSent);
  if (!Number.isFinite(amountSent) || amountSent <= 0) {
    throw new Error(`Invalid amountSent: ${input.amountSent}`);
  }

  if (!db) {
    const duplicate = memoryRemittanceTransactions.find(
      (entry) =>
        entry.user_id === input.userId &&
        String(entry.idempotency_key ?? "").trim() === String(input.idempotencyKey ?? "").trim()
    );
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const row: RemittanceTransactionRecord = {
      id: ++memoryRemittanceTransactionIdCounter,
      user_id: input.userId,
      recipient_name: input.recipientName,
      recipient_type: input.recipientType,
      provider: input.provider,
      payout_channel: input.payoutChannel,
      amount_sent: input.amountSent,
      amount_received: input.amountReceived,
      currency_from: input.currencyFrom,
      currency_to: input.currencyTo,
      exchange_rate: input.exchangeRate,
      status: input.status,
      provider_reference: input.providerReference,
      idempotency_key: input.idempotencyKey,
      completion_email_sent_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryRemittanceTransactions.push(row);
    return row;
  }

  const activeConnection = connection ?? (await db.getConnection());
  const ownsConnection = !connection;
  try {
    if (ownsConnection) {
      await activeConnection.query("START TRANSACTION");
    }

    const [existingRows] = await activeConnection.query<mysql.RowDataPacket[]>(
      `
      SELECT *
      FROM remittance_transactions
      WHERE user_id = ? AND idempotency_key = ?
      LIMIT 1
      `,
      [input.userId, input.idempotencyKey]
    );
    if (existingRows[0]) {
      if (ownsConnection) {
        await activeConnection.query("COMMIT");
      }
      return existingRows[0];
    }

    const [inserted] = await activeConnection.execute<mysql.ResultSetHeader>(
      `
      INSERT IGNORE INTO remittance_transactions
      (user_id, recipient_name, recipient_type, provider, payout_channel, amount_sent, amount_received, currency_from, currency_to, exchange_rate, status, provider_reference, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.recipientName,
        input.recipientType,
        input.provider,
        input.payoutChannel,
        input.amountSent,
        input.amountReceived,
        input.currencyFrom,
        input.currencyTo,
        input.exchangeRate,
        input.status,
        input.providerReference,
        input.idempotencyKey,
      ]
    );

    // If INSERT IGNORE skipped the row (duplicate idempotency_key), return existing record
    if (inserted.affectedRows === 0) {
      const [conflict] = await activeConnection.query<mysql.RowDataPacket[]>(
        "SELECT * FROM remittance_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
        [input.userId, input.idempotencyKey]
      );
      if (ownsConnection) await activeConnection.query("COMMIT");
      return conflict[0] ?? null;
    }

    const [rows] = await activeConnection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM remittance_transactions WHERE id = ? LIMIT 1",
      [Number(inserted.insertId)]
    );

    if (ownsConnection) {
      await activeConnection.query("COMMIT");
    }
    return rows[0] ?? null;
  } catch (error) {
    if (ownsConnection) {
      await activeConnection.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsConnection) {
      activeConnection.release();
    }
  }
}

export async function getRemittanceTransactionById(transactionId: number, userId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    return (
      memoryRemittanceTransactions.find(
        (entry) => entry.id === normalizedId && entry.user_id === normalizedUserId
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM remittance_transactions WHERE id = ? AND user_id = ? LIMIT 1",
    [normalizedId, normalizedUserId]
  );
  return rows[0] ?? null;
}

export async function listRemittanceTransactionsByUser(userId: number, limit = 20) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return [];

  if (!db) {
    return memoryRemittanceTransactions
      .filter((entry) => entry.user_id === normalizedUserId)
      .slice()
      .sort((left, right) => Date.parse(String(right.created_at ?? "")) - Date.parse(String(left.created_at ?? "")))
      .slice(0, normalizedLimit);
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT *
    FROM remittance_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [normalizedUserId, normalizedLimit]
  );
  return rows;
}

export async function getRemittanceAmountTotalByUserSince(
  userId: number,
  sinceIso: string,
  statuses: RemittanceTransactionStatus[] = ["pending", "processing", "completed"]
) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedSince = String(sinceIso ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !normalizedSince) return 0;

  if (!db) {
    return memoryRemittanceTransactions
      .filter((entry) => {
        const createdAt = Date.parse(String(entry.created_at ?? ""));
        return (
          entry.user_id === normalizedUserId &&
          statuses.includes(entry.status) &&
          Number.isFinite(createdAt) &&
          createdAt >= Date.parse(normalizedSince)
        );
      })
      .reduce((sum, entry) => sum + Number(entry.amount_sent ?? 0), 0);
  }

  const placeholders = statuses.map(() => "?").join(", ");
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT COALESCE(SUM(amount_sent), 0) AS total
    FROM remittance_transactions
    WHERE user_id = ?
      AND status IN (${placeholders})
      AND created_at >= ?
    `,
    [normalizedUserId, ...statuses, normalizedSince]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function markRemittanceCompletionEmailSent(transactionId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false;

  if (!db) {
    const row = memoryRemittanceTransactions.find((entry) => entry.id === normalizedId) ?? null;
    if (!row || row.completion_email_sent_at) return false;
    row.completion_email_sent_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    return true;
  }

  const [result] = await db.execute<mysql.ResultSetHeader>(
    `
    UPDATE remittance_transactions
    SET completion_email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND completion_email_sent_at IS NULL
    `,
    [normalizedId]
  );
  return Number(result.affectedRows ?? 0) > 0;
}

export async function getRemittanceTransactionByIdempotencyKey(userId: number, idempotencyKey: string) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedKey = String(idempotencyKey ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;
  if (!normalizedKey) return null;

  if (!db) {
    return (
      memoryRemittanceTransactions.find(
        (entry) =>
          entry.user_id === normalizedUserId &&
          String(entry.idempotency_key ?? "").trim() === normalizedKey
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT *
    FROM remittance_transactions
    WHERE user_id = ? AND idempotency_key = ?
    LIMIT 1
    `,
    [normalizedUserId, normalizedKey]
  );
  return rows[0] ?? null;
}

export async function updateRemittanceTransactionStatusByProviderReference(
  providerReference: string,
  status: RemittanceTransactionStatus
) {
  const normalizedReference = String(providerReference ?? "").trim();
  if (!normalizedReference) return null;

  if (!db) {
    const row = memoryRemittanceTransactions.find((entry) => entry.provider_reference === normalizedReference) ?? null;
    if (!row) return null;
    row.status = status;
    row.updated_at = new Date().toISOString();
    return row;
  }

  await db.execute(
    "UPDATE remittance_transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE provider_reference = ?",
    [status, normalizedReference]
  );
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM remittance_transactions WHERE provider_reference = ? LIMIT 1",
    [normalizedReference]
  );
  return rows[0] ?? null;
}

export async function getAirtimeTransactionByIdempotencyKey(userId: number, idempotencyKey: string) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedKey = String(idempotencyKey ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !normalizedKey) return null;

  if (!db) {
    return memoryAirtimeTransactions.find(
      (entry) => entry.user_id === normalizedUserId && entry.idempotency_key === normalizedKey
    ) ?? null;
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM airtime_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
    [normalizedUserId, normalizedKey]
  );
  return rows[0] ?? null;
}

export async function createAirtimeTransactionRecord(
  input: {
    userId: number;
    provider: string;
    phoneNumber: string;
    operatorId: string | null;
    amount: number;
    currency: string | null;
    providerReference: string | null;
    idempotencyKey?: string | null;
    status: AirtimeTransactionStatus;
  },
  connection?: mysql.PoolConnection
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${input.amount}`);
  }

  if (!db) {
    const existing =
      input.idempotencyKey
        ? memoryAirtimeTransactions.find(
            (entry) => entry.user_id === input.userId && entry.idempotency_key === input.idempotencyKey
          )
        : null;
    if (existing) return existing;

    const now = new Date().toISOString();
    const row: AirtimeTransactionRecord = {
      id: ++memoryAirtimeTransactionIdCounter,
      user_id: input.userId,
      provider: input.provider,
      phone_number: input.phoneNumber,
      operator_id: input.operatorId,
      amount: input.amount,
      currency: input.currency,
      provider_reference: input.providerReference,
      reloadly_reference: input.provider.toLowerCase() === "reloadly" ? input.providerReference : null,
      idempotency_key: input.idempotencyKey ?? null,
      status: input.status,
      completion_email_sent_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryAirtimeTransactions.push(row);
    return row;
  }

  const activeConnection = connection ?? (await db.getConnection());
  const ownsConnection = !connection;
  try {
    if (ownsConnection) {
      await activeConnection.query("START TRANSACTION");
    }

    const [inserted] = await activeConnection.execute<mysql.ResultSetHeader>(
      `
      INSERT IGNORE INTO airtime_transactions
      (user_id, provider, phone_number, operator_id, amount, currency, provider_reference, reloadly_reference, idempotency_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.provider,
        input.phoneNumber,
        input.operatorId,
        input.amount,
        input.currency,
        input.providerReference,
        input.provider.toLowerCase() === "reloadly" ? input.providerReference : null,
        input.idempotencyKey ?? null,
        input.status,
      ]
    );

    if (inserted.affectedRows === 0 && input.idempotencyKey) {
      const [conflict] = await activeConnection.query<mysql.RowDataPacket[]>(
        "SELECT * FROM airtime_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
        [input.userId, input.idempotencyKey]
      );
      if (ownsConnection) await activeConnection.query("COMMIT");
      return conflict[0] ?? null;
    }

    const [rows] = await activeConnection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM airtime_transactions WHERE id = ? LIMIT 1",
      [Number(inserted.insertId)]
    );
    if (ownsConnection) {
      await activeConnection.query("COMMIT");
    }
    return rows[0] ?? null;
  } catch (error) {
    if (ownsConnection) {
      await activeConnection.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsConnection) {
      activeConnection.release();
    }
  }
}

export async function updateAirtimeTransactionStatusByProviderReference(
  providerReference: string,
  status: AirtimeTransactionStatus
) {
  const normalizedReference = String(providerReference ?? "").trim();
  if (!normalizedReference) return null;

  if (!db) {
    const row =
      memoryAirtimeTransactions.find(
        (entry) =>
          entry.provider_reference === normalizedReference || entry.reloadly_reference === normalizedReference
      ) ?? null;
    if (!row) return null;
    row.status = status;
    row.updated_at = new Date().toISOString();
    return row;
  }

  await db.execute(
    `
    UPDATE airtime_transactions
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider_reference = ? OR reloadly_reference = ?
    `,
    [status, normalizedReference, normalizedReference]
  );
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT *
    FROM airtime_transactions
    WHERE provider_reference = ? OR reloadly_reference = ?
    LIMIT 1
    `,
    [normalizedReference, normalizedReference]
  );
  return rows[0] ?? null;
}

export async function getAirtimeTransactionById(transactionId: number, userId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    return (
      memoryAirtimeTransactions.find(
        (entry) => entry.id === normalizedId && entry.user_id === normalizedUserId
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM airtime_transactions WHERE id = ? AND user_id = ? LIMIT 1",
    [normalizedId, normalizedUserId]
  );
  return rows[0] ?? null;
}

export async function listAirtimeTransactionsByUser(userId: number, limit = 20) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return [];

  if (!db) {
    return memoryAirtimeTransactions
      .filter((entry) => entry.user_id === normalizedUserId)
      .slice()
      .sort((left, right) => Date.parse(String(right.created_at ?? "")) - Date.parse(String(left.created_at ?? "")))
      .slice(0, normalizedLimit);
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT *
    FROM airtime_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [normalizedUserId, normalizedLimit]
  );
  return rows;
}

export async function markAirtimeCompletionEmailSent(transactionId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return false;

  if (!db) {
    const row = memoryAirtimeTransactions.find((entry) => entry.id === normalizedId) ?? null;
    if (!row || row.completion_email_sent_at) return false;
    row.completion_email_sent_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    return true;
  }

  const [result] = await db.execute<mysql.ResultSetHeader>(
    `
    UPDATE airtime_transactions
    SET completion_email_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND completion_email_sent_at IS NULL
    `,
    [normalizedId]
  );
  return Number(result.affectedRows ?? 0) > 0;
}
