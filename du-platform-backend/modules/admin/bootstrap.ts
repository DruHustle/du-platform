import crypto from "node:crypto";
import type mysql from "mysql2/promise";
import { configuredAdminEmails } from "../../shared/adminIdentity";
import { hashPassword } from "../../shared/passwords";

/** Reserve configured admin identities before public registration is available.
 * No password is disclosed and no email is sent on startup. The owner proves
 * mailbox ownership through the existing single-use password recovery link. */
export async function initializeAdminAccounts(pool: mysql.Pool): Promise<void> {
  for (const email of configuredAdminEmails()) {
    const [existing] = await pool.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length) continue;
    const passwordHash = await hashPassword(
      crypto.randomBytes(48).toString("hex")
    );
    await pool.execute(
      "INSERT IGNORE INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
      ["DU Administrator", email, passwordHash]
    );
  }
}
