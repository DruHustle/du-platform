import type mysql from "mysql2/promise";
import { db, isDbConnectionError } from "../databaseRuntime";

const memoryAdminSettings: Record<string, string> = {};

export async function getAdminSetting(key: string): Promise<string | null> {
  const normalizedKey = String(key ?? "").trim().toLowerCase();
  if (!normalizedKey) return null;

  if (!db) {
    const value = memoryAdminSettings[normalizedKey];
    return value == null ? null : String(value);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT value_text FROM admin_settings WHERE key_name = ? LIMIT 1",
      [normalizedKey]
    );
    const value = rows[0]?.value_text;
    return value == null ? null : String(value);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const value = memoryAdminSettings[normalizedKey];
    return value == null ? null : String(value);
  }
}

export async function upsertAdminSetting(key: string, value: string | null) {
  const normalizedKey = String(key ?? "").trim().toLowerCase();
  if (!normalizedKey) {
    throw new Error("Setting key is required.");
  }

  const normalizedValue = value == null ? "" : String(value).trim();
  if (!db) {
    memoryAdminSettings[normalizedKey] = normalizedValue;
    return { key_name: normalizedKey, value_text: normalizedValue };
  }

  try {
    await db.execute(
      `
      INSERT INTO admin_settings (key_name, value_text)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)
      `,
      [normalizedKey, normalizedValue]
    );
    return { key_name: normalizedKey, value_text: normalizedValue };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    memoryAdminSettings[normalizedKey] = normalizedValue;
    return { key_name: normalizedKey, value_text: normalizedValue };
  }
}
