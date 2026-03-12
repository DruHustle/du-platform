import type mysql from "mysql2/promise";
import { db } from "../databaseRuntime";
import { findUserById } from "./authStore";

type RemittanceTransactionStatus = "pending" | "processing" | "completed" | "failed";
type AirtimeTransactionStatus = "pending" | "completed" | "failed";
type UtilityTransactionStatus = "pending" | "completed" | "failed";
type RemittanceRecipientType = "mobile_money" | "cash_pickup" | "bank_transfer" | "visa_card";

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
  created_at: string;
  updated_at: string;
};

type AirtimeTransactionRecord = {
  id: number;
  user_id: number;
  phone_number: string;
  operator_id: string | null;
  amount: number;
  currency: string | null;
  reloadly_reference: string | null;
  status: AirtimeTransactionStatus;
  created_at: string;
};

type UtilityTransactionRecord = {
  id: number;
  user_id: number;
  meter_number: string;
  customer_name: string | null;
  biller_id: string | null;
  biller_name: string | null;
  amount: number;
  currency: string | null;
  reloadly_reference: string | null;
  token_code: string | null;
  idempotency_key: string | null;
  status: UtilityTransactionStatus;
  created_at: string;
};

const memoryRemittanceTransactions: RemittanceTransactionRecord[] = [];
const memoryAirtimeTransactions: AirtimeTransactionRecord[] = [];
const memoryUtilityTransactions: UtilityTransactionRecord[] = [];

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
  if (!db) {
    const duplicate = memoryRemittanceTransactions.find(
      (entry) =>
        entry.user_id === input.userId &&
        String(entry.idempotency_key ?? "").trim() === String(input.idempotencyKey ?? "").trim()
    );
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const row: RemittanceTransactionRecord = {
      id: memoryRemittanceTransactions.length + 1,
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
        "SELECT * FROM remittance_transactions WHERE idempotency_key = ? LIMIT 1",
        [input.idempotencyKey]
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

export async function getAirtimeTransactionByIdempotencyKey(userId: number, idempotencyKey: string) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedKey = String(idempotencyKey ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !normalizedKey) return null;

  if (!db) {
    return memoryAirtimeTransactions.find(
      (entry) => entry.user_id === normalizedUserId && (entry as any).idempotency_key === normalizedKey
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
    phoneNumber: string;
    operatorId: string | null;
    amount: number;
    currency: string | null;
    reloadlyReference: string | null;
    idempotencyKey?: string | null;
    status: AirtimeTransactionStatus;
  },
  connection?: mysql.PoolConnection
) {
  if (!db) {
    const row: AirtimeTransactionRecord = {
      id: memoryAirtimeTransactions.length + 1,
      user_id: input.userId,
      phone_number: input.phoneNumber,
      operator_id: input.operatorId,
      amount: input.amount,
      currency: input.currency,
      reloadly_reference: input.reloadlyReference,
      status: input.status,
      created_at: new Date().toISOString(),
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
      (user_id, phone_number, operator_id, amount, currency, reloadly_reference, idempotency_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.phoneNumber,
        input.operatorId,
        input.amount,
        input.currency,
        input.reloadlyReference,
        input.idempotencyKey ?? null,
        input.status,
      ]
    );

    if (inserted.affectedRows === 0 && input.idempotencyKey) {
      const [conflict] = await activeConnection.query<mysql.RowDataPacket[]>(
        "SELECT * FROM airtime_transactions WHERE idempotency_key = ? LIMIT 1",
        [input.idempotencyKey]
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

export async function getUtilityTransactionByIdempotencyKey(userId: number, idempotencyKey: string) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedKey = String(idempotencyKey ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0 || !normalizedKey) return null;

  if (!db) {
    return memoryUtilityTransactions.find(
      (entry) => entry.user_id === normalizedUserId && entry.idempotency_key === normalizedKey
    ) ?? null;
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM utility_transactions WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
    [normalizedUserId, normalizedKey]
  );
  return rows[0] ?? null;
}

export async function createUtilityTransactionRecord(
  input: {
    userId: number;
    meterNumber: string;
    customerName: string | null;
    billerId: string | null;
    billerName: string | null;
    amount: number;
    currency: string | null;
    reloadlyReference: string | null;
    tokenCode: string | null;
    idempotencyKey?: string | null;
    status: UtilityTransactionStatus;
  },
  connection?: mysql.PoolConnection
) {
  if (!db) {
    if (input.idempotencyKey) {
      const duplicate = memoryUtilityTransactions.find(
        (entry) => entry.user_id === input.userId && entry.idempotency_key === input.idempotencyKey
      );
      if (duplicate) return duplicate;
    }
    const row: UtilityTransactionRecord = {
      id: memoryUtilityTransactions.length + 1,
      user_id: input.userId,
      meter_number: input.meterNumber,
      customer_name: input.customerName,
      biller_id: input.billerId,
      biller_name: input.billerName,
      amount: input.amount,
      currency: input.currency,
      reloadly_reference: input.reloadlyReference,
      token_code: input.tokenCode,
      idempotency_key: input.idempotencyKey ?? null,
      status: input.status,
      created_at: new Date().toISOString(),
    };
    memoryUtilityTransactions.push(row);
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
      INSERT IGNORE INTO utility_transactions
      (user_id, meter_number, customer_name, biller_id, biller_name, amount, currency, reloadly_reference, token_code, idempotency_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.meterNumber,
        input.customerName,
        input.billerId,
        input.billerName,
        input.amount,
        input.currency,
        input.reloadlyReference,
        input.tokenCode,
        input.idempotencyKey ?? null,
        input.status,
      ]
    );

    if (inserted.affectedRows === 0 && input.idempotencyKey) {
      const [conflict] = await activeConnection.query<mysql.RowDataPacket[]>(
        "SELECT * FROM utility_transactions WHERE idempotency_key = ? LIMIT 1",
        [input.idempotencyKey]
      );
      if (ownsConnection) await activeConnection.query("COMMIT");
      return conflict[0] ?? null;
    }

    const [rows] = await activeConnection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM utility_transactions WHERE id = ? LIMIT 1",
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

export async function getUtilityTransactionById(transactionId: number, userId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    return (
      memoryUtilityTransactions.find(
        (entry) => entry.id === normalizedId && entry.user_id === normalizedUserId
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM utility_transactions WHERE id = ? AND user_id = ? LIMIT 1",
    [normalizedId, normalizedUserId]
  );
  return rows[0] ?? null;
}
