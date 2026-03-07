import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

const memoryFeatureNotifications: Array<{
  id: number;
  user_id: number;
  email: string;
  feature: string;
  created_at: string;
}> = [];

export async function createFeatureNotification(userId: number, email: string, feature: string) {
  const normalizedFeature = feature.trim();
  if (!normalizedFeature) {
    throw new Error("Feature is required.");
  }

  if (!db) {
    const existing = memoryFeatureNotifications.find(
      (row) =>
        row.user_id === userId &&
        row.email.toLowerCase() === email.toLowerCase() &&
        row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email,
      feature: normalizedFeature,
      created_at: new Date().toISOString(),
    };
    memoryFeatureNotifications.push(record);
    return { created: true, record };
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO feature_notifications (user_id, email, feature) VALUES (?, ?, ?)",
      [userId, email, normalizedFeature]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, email, feature, created_at FROM feature_notifications WHERE email = ? AND feature = ? LIMIT 1",
      [email, normalizedFeature]
    );
    return {
      created: Number(result.affectedRows ?? 0) > 0,
      record: rows[0] ?? null,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;

    const existing = memoryFeatureNotifications.find(
      (row) =>
        row.user_id === userId &&
        row.email.toLowerCase() === email.toLowerCase() &&
        row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email,
      feature: normalizedFeature,
      created_at: new Date().toISOString(),
    };
    memoryFeatureNotifications.push(record);
    return { created: true, record };
  }
}

export async function getFeatureNotifications() {
  if (!db) {
    return [...memoryFeatureNotifications].sort((left, right) => right.id - left.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, email, feature, created_at FROM feature_notifications ORDER BY id DESC LIMIT 500"
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...memoryFeatureNotifications].sort((left, right) => right.id - left.id);
  }
}
