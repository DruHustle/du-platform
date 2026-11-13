import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { AppError } from "../../core/errorHandler";
import { isAdminEmail } from "../../shared/adminIdentity";
import { verifyPassword } from "../../shared/passwords";
import { NewsletterService } from "../newsletter/service";

// Use the existing durable audit table. The reference contains no email or name.
export class AccountDeletionService extends NewsletterService {
  async request(userId: number, authVersion: number, password: string) {
    return this.transaction(async connection => {
      const [[user]] = await connection.execute<RowDataPacket[]>(
        "SELECT password_hash,auth_version FROM users WHERE id=? FOR UPDATE",
        [userId]
      );
      if (!user || Number(user.auth_version) !== authVersion)
        throw new AppError(
          401,
          "AUTH_SESSION_EXPIRED",
          "Please sign in again."
        );
      if (!(await verifyPassword(password, user.password_hash)))
        throw new AppError(
          403,
          "DELETION_PASSWORD_INVALID",
          "Please check your current password."
        );
      const [[pending]] = await connection.execute<RowDataPacket[]>(
        "SELECT resource FROM audit_events WHERE actor_id=? AND domain='account_deletion' AND action='requested' LIMIT 1",
        [userId]
      );
      if (pending)
        return { requestId: String(pending.resource), status: "requested" };
      const requestId = randomUUID();
      await connection.execute(
        "INSERT INTO audit_events(domain,action,actor_id,resource) VALUES ('account_deletion','requested',?,?)",
        [userId, requestId]
      );
      return { requestId, status: "requested" };
    });
  }

  async pending(page: number) {
    const [requests] = await this.pool().query<RowDataPacket[]>(
      `SELECT a.resource AS requestId,a.created_at AS receivedAt,u.id AS accountId,u.email,u.email_verified_at AS emailVerifiedAt
       FROM audit_events a JOIN users u ON u.id=a.actor_id
       WHERE a.domain='account_deletion' AND a.action='requested' ORDER BY a.id LIMIT 25 OFFSET ?`,
      [25 * (page - 1)]
    );
    return requests;
  }

  // The operator reviews separately held records before confirming this action.
  // A claimed registration email does not establish ownership of a guest order.
  async fulfill(requestId: string) {
    return this.transaction(async connection => {
      const [[receipt]] = await connection.execute<RowDataPacket[]>(
        "SELECT id,actor_id,action FROM audit_events WHERE domain='account_deletion' AND resource=? FOR UPDATE",
        [requestId]
      );
      if (!receipt)
        throw new AppError(
          404,
          "DELETION_UNKNOWN",
          "Deletion request not found."
        );
      if (receipt.action === "fulfilled")
        return { requestId, status: "fulfilled" };
      const userId = Number(receipt.actor_id);
      const [[user]] = await connection.execute<RowDataPacket[]>(
        "SELECT email FROM users WHERE id=? FOR UPDATE",
        [userId]
      );
      if (!user || isAdminEmail(user.email))
        throw new AppError(
          409,
          "DELETION_IDENTITY_REVIEW",
          "Review the account identity and remove any administrator reservation before fulfillment."
        );
      await connection.execute(
        "DELETE FROM transactional_messages WHERE user_id=?",
        [userId]
      );
      await connection.execute(
        "DELETE FROM audit_events WHERE actor_id=? AND id<>?",
        [userId, receipt.id]
      );
      // Foreign keys erase sessions, password-reset tokens, saved trips and user feature notices.
      await connection.execute("DELETE FROM users WHERE id=?", [userId]);
      await connection.execute(
        "UPDATE audit_events SET action='fulfilled',actor_id=NULL WHERE id=?",
        [receipt.id]
      );
      return { requestId, status: "fulfilled" };
    });
  }
}
