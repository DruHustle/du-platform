import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

const memoryCareReferrals: Array<{
  id: number;
  user_id: number | null;
  provider: string;
  timestamp: string;
}> = [];

export async function createCareReferral(input: { userId: number | null; provider: string }) {
  const provider = String(input.provider ?? "").trim().toLowerCase();
  if (!provider) throw new Error("Provider is required.");

  const normalizedUserId =
    input.userId == null || !Number.isFinite(Number(input.userId))
      ? null
      : Math.max(1, Math.floor(Number(input.userId)));

  if (!db) {
    const record = {
      id: memoryCareReferrals.length + 1,
      user_id: normalizedUserId,
      provider,
      timestamp: new Date().toISOString(),
    };
    memoryCareReferrals.push(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO care_referrals (user_id, provider) VALUES (?, ?)",
      [normalizedUserId, provider]
    );
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, provider, `timestamp` FROM care_referrals WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: memoryCareReferrals.length + 1,
      user_id: normalizedUserId,
      provider,
      timestamp: new Date().toISOString(),
    };
    memoryCareReferrals.push(record);
    return record;
  }
}
