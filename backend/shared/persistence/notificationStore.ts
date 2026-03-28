import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

const memoryFeatureNotifications: Array<{
  id: number;
  user_id: number;
  email: string;
  feature: string;
  created_at: string;
}> = [];

const memoryNewsletterSubscriptions: Array<{
  id: number;
  email: string;
  created_at: string;
}> = [];

export async function createNewsletterSubscription(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!db) {
    const existing = memoryNewsletterSubscriptions.find(
      (row) => row.email.toLowerCase() === normalizedEmail
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryNewsletterSubscriptions.length + 1,
      email: normalizedEmail,
      created_at: new Date().toISOString(),
    };
    memoryNewsletterSubscriptions.push(record);
    return { created: true, record };
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO newsletter_subscriptions (email) VALUES (?)",
      [normalizedEmail]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, email, created_at FROM newsletter_subscriptions WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );
    return {
      created: Number(result.affectedRows ?? 0) > 0,
      record: rows[0] ?? null,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;

    const existing = memoryNewsletterSubscriptions.find(
      (row) => row.email.toLowerCase() === normalizedEmail
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryNewsletterSubscriptions.length + 1,
      email: normalizedEmail,
      created_at: new Date().toISOString(),
    };
    memoryNewsletterSubscriptions.push(record);
    return { created: true, record };
  }
}

export async function createFeatureNotification(userId: number, email: string, feature: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFeature = feature.trim();
  if (!normalizedEmail || !normalizedFeature) {
    throw new Error("Feature is required.");
  }

  if (!db) {
    const existing = memoryFeatureNotifications.find(
      (row) =>
        row.user_id === userId &&
        row.email.toLowerCase() === normalizedEmail &&
        row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email: normalizedEmail,
      feature: normalizedFeature,
      created_at: new Date().toISOString(),
    };
    memoryFeatureNotifications.push(record);
    return { created: true, record };
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO feature_notifications (user_id, email, feature) VALUES (?, ?, ?)",
      [userId, normalizedEmail, normalizedFeature]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, email, feature, created_at FROM feature_notifications WHERE email = ? AND feature = ? LIMIT 1",
      [normalizedEmail, normalizedFeature]
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
        row.email.toLowerCase() === normalizedEmail &&
        row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email: normalizedEmail,
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
