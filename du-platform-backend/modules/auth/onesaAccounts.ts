import type { RowDataPacket } from "mysql2/promise";
import { AppError } from "../../core/errorHandler";
import { db } from "../../shared/databaseRuntime";
import { findUserById } from "../../shared/persistence/authStore";
import { verifyOnesaAccess } from "./onesaIdentity";

export const linkTableSQL = `
CREATE TABLE IF NOT EXISTS onesa_account_links (
  stable_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;
const testLinks = new Map<string, number>();
export async function linkedUser(stableId: string) {
  let id: number | undefined;
  if (db) {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT user_id FROM onesa_account_links WHERE stable_id = ?",
      [stableId],
    );
    id = rows[0]?.user_id;
  } else if (process.env.NODE_ENV === "test") {
    id = testLinks.get(stableId);
  } else throw new Error("Onesa account linking requires durable storage");
  return id ? findUserById(Number(id)) : null;
}
export async function linkAccount(
  stableId: string,
  userId: number,
  version: number,
) {
  if (db) {
    // Both identifiers are unique. A race or a retry can never move an existing link.
    try {
      await db.execute(
        `INSERT INTO onesa_account_links (stable_id,user_id)
        SELECT ?, id FROM users WHERE id=? AND auth_version=?`,
        [stableId, userId, version],
      );
    } catch (e) {
      if ((e as { code?: string }).code !== "ER_DUP_ENTRY") throw e;
    }
  } else if (process.env.NODE_ENV === "test") {
    const user = await findUserById(userId);
    if (
      !testLinks.has(stableId) &&
      !Array.from(testLinks.values()).includes(userId) &&
      user &&
      Number(user.auth_version ?? 0) === version
    )
      testLinks.set(stableId, userId);
  } else throw new Error("Onesa account linking requires durable storage");
  const linked = await linkedUser(stableId);
  if (
    !linked ||
    Number(linked.id) !== userId ||
    Number(linked.auth_version ?? 0) !== version
  )
    throw new AppError(
      409,
      "ONESA_LINK_CONFLICT",
      "The accounts could not be linked. Verify both accounts and contact support if this continues.",
    );
  return linked;
}
export async function resolveOnesa(token: string) {
  let proof: Awaited<ReturnType<typeof verifyOnesaAccess>>;
  try {
    proof = await verifyOnesaAccess(token);
  } catch {
    throw new AppError(
      401,
      "ONESA_UNAUTHORIZED",
      "The Onesa sign-in has expired or lacks access.",
    );
  }
  return { proof, user: await linkedUser(proof.id) };
}
