import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { db } from "../../lib/databaseRuntime";
import { AppError } from "../../core/errorHandler";
import { getNotifyAlertEmails, getNotifyFromEmail } from "../../lib/email";
import { sealOrderAccess, openOrderAccess } from "../shop/orderAccess";
import { NewsletterService } from "../newsletter/service";
import { newsletterOrigin, renderNewsletter } from "../newsletter/content";
import type { NewsletterEmail } from "../newsletter/provider";
import { customerLanguage } from "../../contracts/customerLanguage";
import { contactInquirySchema } from "./dto/notification.dto";
import copy from "../../lib/copy/transactionalEmailCopy.json";

export async function enqueueTransactional(
  c: PoolConnection,
  input: {
    key: string;
    kind: string;
    entity: string;
    mail: NewsletterEmail;
    userId?: number;
    resetHash?: string;
    authVersion?: number;
  }
) {
  await c.execute(
    `INSERT INTO transactional_messages
    (intent_key,kind,entity_id,user_id,reset_hash,auth_version,encrypted_payload) VALUES (?,?,?,?,?,?,?)`,
    [
      input.key,
      input.kind,
      input.entity,
      input.userId ?? null,
      input.resetHash ?? null,
      input.authVersion ?? null,
      sealOrderAccess(JSON.stringify(input.mail)),
    ]
  );
}
export class TransactionalService extends NewsletterService {
  constructor(pool: Pool | null = db) {
    super(pool);
  }
  async contact(value: unknown) {
    const input = contactInquirySchema.parse(value);
    const { requestId, ...details } = input;
    const canonical = JSON.stringify(details);
    const hash = createHash("sha256").update(canonical).digest("hex");
    const language = customerLanguage(input.language),
      text = copy[language];
    const from = await getNotifyFromEmail(),
      operators = await getNotifyAlertEmails();
    await this.transaction(async c => {
      const [created] = await c.execute<ResultSetHeader>(
        `INSERT IGNORE INTO contact_enquiries(request_id,payload_hash,encrypted_details,language) VALUES (?,?,?,?)`,
        [requestId, hash, sealOrderAccess(canonical), language]
      );
      // Contact details are immutable. Duplicate INSERT IGNORE holds a shared
      // unique-key lock; upgrading it in concurrent retries can deadlock.
      const [rows] = await c.query<RowDataPacket[]>(
        "SELECT payload_hash FROM contact_enquiries WHERE request_id=?",
        [requestId]
      );
      if (!rows.length) throw new Error("Contact receipt unavailable");
      if (rows[0].payload_hash !== hash)
        throw new AppError(
          409,
          "CONTACT_REQUEST_CONFLICT",
          "This request ID belongs to a different message. Retry the original message or start a new enquiry."
        );
      if (!created.affectedRows) return;
      const operatorBody = `Reference: ${requestId}\nModule: ${input.module}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nSubject: ${input.subject}\n\n${input.message}`;
      await enqueueTransactional(c, {
        key: `contact/${requestId}/operator`,
        kind: "contact_operator",
        entity: requestId,
        mail: {
          from,
          to: operators,
          subject: "New contact enquiry",
          ...renderNewsletter(
            "New contact enquiry",
            operatorBody,
            undefined,
            "Service enquiry; no marketing consent.",
            language
          ),
        },
      });
      await enqueueTransactional(c, {
        key: `contact/${requestId}/ack`,
        kind: "contact_ack",
        entity: requestId,
        mail: {
          from,
          to: input.email,
          subject: text.contact_subject,
          ...renderNewsletter(
            text.contact_subject,
            `${text.contact_body}\n\n${text.reference}: ${requestId}`,
            undefined,
            text.service_footer,
            language
          ),
        },
      });
    });
    return { received: true, requestId, message: text.contact_body };
  }
  async passwordReset(userId: number, requestedLanguage = "en") {
    const language = customerLanguage(requestedLanguage),
      text = copy[language];
    const from = await getNotifyFromEmail();
    const token = randomBytes(48).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const link = `${newsletterOrigin()}/reset-password?lng=${language}#token=${token}`;
    return this.transaction(async c => {
      // Same lock order as reset consumption and login: user, token, delivery.
      const [users] = await c.query<RowDataPacket[]>(
        "SELECT id,email,auth_version FROM users WHERE id=? FOR UPDATE",
        [userId]
      );
      const user = users[0];
      if (!user) return;
      await c.execute(
        "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
        [hash, userId]
      );
      await enqueueTransactional(c, {
        key: `reset/${randomUUID()}`,
        kind: "password_reset",
        entity: String(userId),
        userId,
        resetHash: hash,
        authVersion: Number(user.auth_version),
        mail: {
          from,
          to: user.email,
          subject: text.reset_subject,
          ...renderNewsletter(
            text.reset_subject,
            `${text.reset_body}\n\n${link}`,
            undefined,
            text.reset_footer,
            language
          ),
        },
      });
    });
  }
  async feature(userId: number, feature: string) {
    const from = await getNotifyFromEmail(),
      operators = await getNotifyAlertEmails();
    return this.transaction(async c => {
      const [users] = await c.query<RowDataPacket[]>(
        "SELECT id,email FROM users WHERE id=? FOR UPDATE",
        [userId]
      );
      const user = users[0];
      if (!user)
        throw new AppError(401, "AUTH_USER_NOT_FOUND", "User not found.");
      const [created] = await c.execute<ResultSetHeader>(
        "INSERT IGNORE INTO feature_notifications(user_id,email,feature) VALUES (?,?,?)",
        [userId, user.email, feature]
      );
      if (created.affectedRows) {
        const body = `Your feature notification request has been saved: ${feature}`;
        await enqueueTransactional(c, {
          key: `feature/${created.insertId}/ack`,
          kind: "feature_ack",
          entity: String(created.insertId),
          userId,
          mail: {
            from,
            to: user.email,
            subject: "Feature request received",
            ...renderNewsletter(
              "Feature request received",
              body,
              undefined,
              "Service message; not a newsletter subscription."
            ),
          },
        });
        await enqueueTransactional(c, {
          key: `feature/${created.insertId}/operator`,
          kind: "feature_operator",
          entity: String(created.insertId),
          userId,
          mail: {
            from,
            to: operators,
            subject: "New feature request",
            ...renderNewsletter(
              "New feature request",
              `Feature: ${feature}\nUser: ${user.email}`,
              undefined,
              "Service message; not a newsletter subscription."
            ),
          },
        });
      }
      return {
        created: Boolean(created.affectedRows),
        feature,
        email: user.email,
        message: created.affectedRows
          ? "Notify request saved."
          : "Notify request already exists.",
      };
    });
  }
  async inbox(page = 1) {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      "SELECT request_id,encrypted_details,language,created_at FROM contact_enquiries ORDER BY created_at DESC,request_id LIMIT 25 OFFSET ?",
      [25 * (page - 1)]
    );
    return rows.map(({ encrypted_details, ...row }) => ({
      ...row,
      details: JSON.parse(openOrderAccess(encrypted_details)),
    }));
  }
  async messageDeliveries(page = 1) {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT id,kind,entity_id,status,attempts,first_attempt_at,accepted_at,provider_id,CONCAT('du-service/',intent_key) AS provider_key,acceptance_uncertain,error_message,created_at,
      (status='failed' AND (first_attempt_at IS NULL OR first_attempt_at>DATE_SUB(NOW(),INTERVAL 23 HOUR))) AS can_retry
      FROM transactional_messages ORDER BY id DESC LIMIT 50 OFFSET ?`,
      [50 * (page - 1)]
    );
    // No recipients, encrypted payloads, reset hashes/links or provider keys.
    return rows.map(r => ({
      ...r,
      entity_id: r.kind === "password_reset" ? undefined : r.entity_id,
    }));
  }
  async act(
    id: number,
    action: "retry" | "accepted" | "close",
    actor: number,
    providerId?: string
  ) {
    return this.transaction(async c => {
      const [rows] = await c.query<RowDataPacket[]>(
        "SELECT *, first_attempt_at<=DATE_SUB(NOW(),INTERVAL 23 HOUR) AS expired FROM transactional_messages WHERE id=? FOR UPDATE",
        [id]
      );
      const row = rows[0];
      if (!row)
        throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
      if (
        !(
          action === "close"
            ? ["pending", "failed", "reconcile"]
            : ["failed", "reconcile"]
        ).includes(row.status)
      )
        throw new AppError(
          409,
          "MESSAGE_CHANGED",
          "Review the current delivery status before continuing."
        );
      if (action === "retry") {
        if (row.expired || row.status === "reconcile")
          throw new AppError(
            409,
            "MESSAGE_RECONCILIATION_REQUIRED",
            "The safe replay window expired. Reconcile provider acceptance; do not create a replacement."
          );
        await c.execute(
          "UPDATE transactional_messages SET status='pending',manual_retry=TRUE,available_at=NOW(),locked_at=NULL,error_message=NULL,last_retry_by=?,last_retry_at=NOW() WHERE id=?",
          [actor, id]
        );
      } else {
        if (action === "accepted" && !providerId)
          throw new AppError(
            400,
            "PROVIDER_REFERENCE_REQUIRED",
            "A verified provider reference is required."
          );
        await c.execute(
          "UPDATE transactional_messages SET status=?,provider_id=COALESCE(?,provider_id),acceptance_uncertain=IF(?='accepted',FALSE,acceptance_uncertain),accepted_at=IF(?='accepted',COALESCE(accepted_at,NOW()),accepted_at),reconciled_by=?,reconciled_at=NOW(),locked_at=NULL,error_message='Operator reconciled delivery; no replacement sent.' WHERE id=?",
          [
            action === "accepted" ? "accepted" : "cancelled",
            providerId ?? null,
            action,
            action,
            actor,
            id,
          ]
        );
      }
      return { saved: true };
    });
  }
}
