import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import { AppError } from "../../core/errorHandler";
import {
  hashNewsletterToken,
  newsletterToken,
  preferenceLink,
  renderNewsletter,
} from "./content";
import {
  newsletterSender,
  requireNewsletterSender,
  type NewsletterEmail,
} from "./provider";

type Queryable = Pool | PoolConnection;
export class NewsletterService {
  constructor(private readonly database: Pool | null = db) {}
  pool() {
    if (!this.database)
      throw new AppError(
        503,
        "NEWSLETTER_DATABASE_UNAVAILABLE",
        "Newsletter storage is temporarily unavailable. Please try again later."
      );
    return this.database;
  }
  async transaction<T>(run: (connection: PoolConnection) => Promise<T>) {
    const connection = await this.pool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await run(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async enqueue(
    connection: Queryable,
    input: {
      campaignId?: number;
      subscriptionId?: number;
      kind: string;
      payload: NewsletterEmail;
    }
  ) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO newsletter_deliveries (campaign_id, subscription_id, kind, recipient, payload) VALUES (?, ?, ?, ?, ?)`,
      [
        input.campaignId ?? null,
        input.subscriptionId ?? null,
        input.kind,
        input.payload.to,
        JSON.stringify(input.payload),
      ]
    );
    return result.insertId;
  }
  async subscribe(email: string) {
    this.pool();
    const sender = await newsletterSender();
    const from = sender.from;
    await this.transaction(async connection => {
      // The unique email and row lock serialize concurrent/duplicate signups.
      await connection.execute(
        `INSERT INTO newsletter_subscriptions (email, status, consent_at, unsubscribe_token) VALUES (?, 'pending', NOW(), ?) ON DUPLICATE KEY UPDATE email = email`,
        [email, newsletterToken()]
      );
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT *, last_confirmation_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) AS recently_requested FROM newsletter_subscriptions WHERE email = ? FOR UPDATE`,
        [email]
      );
      const row = rows[0];
      if (
        row.status === "subscribed" ||
        (row.status === "pending" && row.recently_requested)
      )
        return;
      await connection.execute(
        `UPDATE newsletter_deliveries SET status = 'skipped', error_message = 'Replaced by a newer confirmation request.' WHERE subscription_id = ? AND kind = 'confirmation' AND status = 'pending'`,
        [row.id]
      );
      const token = newsletterToken();
      await connection.execute(
        `UPDATE newsletter_subscriptions SET status = 'pending', consent_at = NOW(), confirmation_hash = ?, confirmation_expires_at = DATE_ADD(NOW(), INTERVAL 48 HOUR), last_confirmation_at = NOW(), unsubscribe_token = COALESCE(unsubscribe_token, ?) WHERE id = ?`,
        [hashNewsletterToken(token), newsletterToken(), row.id]
      );
      const url = preferenceLink("confirm", token);
      const content = renderNewsletter(
        "Confirm your newsletter subscription",
        `Please confirm that you want to receive news and opportunities from Diaspora Unlocked.\n\nConfirm your email: ${url}\n\nThis link expires in 48 hours. If you did not request this, ignore this email.`,
        undefined,
        "You requested email updates from Diaspora Unlocked. No newsletters will be sent until you confirm."
      );
      // Include a real clickable link while escaping all other content.
      content.html = content.html.replace(
        "<hr ",
        `<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#facc15;color:#0f172a;border-radius:8px">Confirm subscription</a></p><hr `
      );
      await this.enqueue(connection, {
        subscriptionId: row.id,
        kind: "confirmation",
        payload: {
          from,
          to: email,
          subject: "Confirm your Diaspora Unlocked subscription",
          ...content,
        },
      });
    });
    // Same response for existing and new addresses; do not expose membership.
    return {
      message:
        "If this address needs confirmation, we’ll email a link. Already confirmed? You’re on the list.",
      requiresConfirmation: true,
      deliveryPending: !sender.ready,
    };
  }
  async confirm(token: string) {
    const [result] = await this.pool().execute<ResultSetHeader>(
      `UPDATE newsletter_subscriptions SET status = 'subscribed', confirmed_at = NOW(), confirmation_hash = NULL, confirmation_expires_at = NULL, unsubscribed_at = NULL WHERE confirmation_hash = ? AND confirmation_expires_at > NOW() AND status = 'pending'`,
      [hashNewsletterToken(token)]
    );
    if (!result.affectedRows)
      throw new AppError(
        400,
        "NEWSLETTER_LINK_INVALID",
        "This confirmation link is invalid, expired or already used. You can request another confirmation using the newsletter form in the footer."
      );
    return {
      message:
        "Your email is confirmed. You’re subscribed to Diaspora Unlocked.",
    };
  }
  async unsubscribe(token: string) {
    await this.transaction(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM newsletter_subscriptions WHERE unsubscribe_token = ? FOR UPDATE`,
        [token]
      );
      if (!rows.length)
        throw new AppError(
          400,
          "NEWSLETTER_LINK_INVALID",
          "This unsubscribe link is invalid."
        );
      await connection.execute(
        `UPDATE newsletter_subscriptions SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, NOW()), confirmation_hash = NULL, confirmation_expires_at = NULL WHERE id = ?`,
        [rows[0].id]
      );
      await connection.execute(
        `UPDATE newsletter_deliveries SET status = 'skipped', error_message = 'Subscriber opted out.' WHERE subscription_id = ? AND status = 'pending'`,
        [rows[0].id]
      );
    });
    return {
      message: "You’re unsubscribed. You won’t receive future newsletters.",
    };
  }
  async subscribers(input: { page: number; search: string; status: string }) {
    const pool = this.pool();
    const conditions = ["email LIKE ?"],
      values: unknown[] = [`%${input.search.replace(/[\\%_]/g, "\\$&")}%`];
    if (input.status !== "all") {
      conditions.push("status = ?");
      values.push(input.status);
    }
    const where = conditions.join(" AND ");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, status, source, created_at, consent_at, confirmed_at, unsubscribed_at FROM newsletter_subscriptions WHERE ${where} ORDER BY id DESC LIMIT 25 OFFSET ?`,
      [...values, (input.page - 1) * 25]
    );
    const [totals] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM newsletter_subscriptions WHERE ${where}`,
      values
    );
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS total FROM newsletter_subscriptions GROUP BY status`
    );
    return {
      rows,
      total: Number(totals[0].total),
      page: input.page,
      counts: Object.fromEntries(counts.map(r => [r.status, Number(r.total)])),
      sender: await newsletterSender(),
    };
  }
  async removeSubscriber(id: number) {
    await this.transaction(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM newsletter_subscriptions WHERE id = ? FOR UPDATE`,
        [id]
      );
      if (!rows.length)
        throw new AppError(
          404,
          "NEWSLETTER_NOT_FOUND",
          "Subscriber not found."
        );
      await connection.execute(
        `UPDATE newsletter_subscriptions SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, NOW()), confirmation_hash = NULL, confirmation_expires_at = NULL WHERE id = ?`,
        [id]
      );
      await connection.execute(
        `UPDATE newsletter_deliveries SET status = 'skipped', error_message = 'Subscriber opted out.' WHERE subscription_id = ? AND status = 'pending'`,
        [id]
      );
    });
    return {
      message: "Subscriber opted out. Pending messages will be skipped.",
    };
  }
  async campaigns() {
    const [rows] = await this.pool().query<
      RowDataPacket[]
    >(`SELECT c.*, COUNT(d.id) AS recipients,
      COALESCE(SUM(d.status = 'sent'),0) AS accepted, COALESCE(SUM(d.status = 'failed'),0) AS failed,
      COALESCE(SUM(d.status = 'skipped'),0) AS skipped, COALESCE(SUM(d.status IN ('pending','processing')),0) AS remaining
      FROM newsletter_campaigns c LEFT JOIN newsletter_deliveries d ON d.campaign_id = c.id GROUP BY c.id ORDER BY c.id DESC LIMIT 100`);
    return { rows };
  }
  async saveDraft(
    input: { subject: string; body: string; version?: number },
    userId: number,
    id?: number
  ) {
    if (!id) {
      const [result] = await this.pool().execute<ResultSetHeader>(
        `INSERT INTO newsletter_campaigns (subject, body, created_by) VALUES (?, ?, ?)`,
        [input.subject, input.body, userId]
      );
      return { id: result.insertId };
    }
    const [result] = await this.pool().execute<ResultSetHeader>(
      `UPDATE newsletter_campaigns SET subject = ?, body = ?, version = version + 1 WHERE id = ? AND status = 'draft' AND version = ?`,
      [input.subject, input.body, id, input.version ?? 0]
    );
    if (!result.affectedRows)
      throw new AppError(
        409,
        "NEWSLETTER_DRAFT_CHANGED",
        "This draft has changed or has already been queued. Reload it before editing."
      );
    return { id };
  }
  async testDraft(id: number, adminEmail: string, version: number) {
    const from = await requireNewsletterSender();
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT * FROM newsletter_campaigns WHERE id = ? AND version = ? AND status = 'draft'`,
      [id, version]
    );
    if (!rows.length)
      throw new AppError(
        409,
        "NEWSLETTER_DRAFT_CHANGED",
        "Save and reload the draft before sending a test."
      );
    const row = rows[0];
    await this.enqueue(this.pool(), {
      kind: "test",
      payload: {
        from,
        to: adminEmail,
        subject: `[Preview] ${row.subject}`,
        ...renderNewsletter(row.subject, row.body),
      },
    });
    return {
      message:
        "Test queued for your administrator email. Check delivery activity for its status.",
    };
  }
  async queueCampaign(id: number, version: number) {
    const from = await requireNewsletterSender();
    return this.transaction(async connection => {
      const [campaigns] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM newsletter_campaigns WHERE id = ? FOR UPDATE`,
        [id]
      );
      const campaign = campaigns[0];
      if (!campaign)
        throw new AppError(404, "NEWSLETTER_NOT_FOUND", "Campaign not found.");
      if (campaign.status !== "draft")
        return {
          message: "This campaign is already queued.",
          alreadyQueued: true,
        };
      if (campaign.version !== version)
        throw new AppError(
          409,
          "NEWSLETTER_DRAFT_CHANGED",
          "The draft changed. Review it again before sending."
        );
      await connection.execute(
        `UPDATE newsletter_subscriptions SET unsubscribe_token = LOWER(HEX(RANDOM_BYTES(24))) WHERE status = 'subscribed' AND unsubscribe_token IS NULL`
      );
      const marker = newsletterToken();
      const content = renderNewsletter(
        campaign.subject,
        campaign.body,
        preferenceLink("unsubscribe", marker)
      );
      const [textBefore, textAfter] = content.text.split(marker);
      const [htmlBefore, htmlAfter] = content.html.split(marker);
      // Snapshot the entire eligible audience in one atomic database operation.
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO newsletter_deliveries (campaign_id, subscription_id, kind, recipient, payload)
        SELECT ?, id, 'campaign', email, JSON_OBJECT('from', ?, 'to', email, 'subject', ?, 'text', CONCAT(?, unsubscribe_token, ?), 'html', CONCAT(?, unsubscribe_token, ?))
        FROM newsletter_subscriptions WHERE status = 'subscribed'`,
        [
          id,
          from,
          campaign.subject,
          textBefore,
          textAfter,
          htmlBefore,
          htmlAfter,
        ]
      );
      if (!result.affectedRows)
        throw new AppError(
          409,
          "NEWSLETTER_NO_SUBSCRIBERS",
          "There are no subscribed addresses to send to."
        );
      await connection.execute(
        `UPDATE newsletter_campaigns SET status = 'queued', queued_at = NOW() WHERE id = ?`,
        [id]
      );
      return {
        message: "Campaign queued for subscribed addresses.",
        recipients: result.affectedRows,
      };
    });
  }
  async deliveries(page: number) {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT id, campaign_id, recipient, kind, status, attempts, accepted_at, error_message, created_at, (retry_safe AND (first_attempt_at IS NULL OR first_attempt_at > DATE_SUB(NOW(), INTERVAL 23 HOUR))) AS retry_safe FROM newsletter_deliveries ORDER BY id DESC LIMIT 25 OFFSET ?`,
      [(page - 1) * 25]
    );
    const [totals] = await this.pool().query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM newsletter_deliveries`
    );
    return { rows, page, total: Number(totals[0].total) };
  }
  async retryDelivery(id: number) {
    await requireNewsletterSender();
    const [result] = await this.pool().execute<ResultSetHeader>(
      `UPDATE newsletter_deliveries SET status = 'pending', attempts = 0, available_at = NOW(), error_message = NULL WHERE id = ? AND status = 'failed' AND retry_safe = TRUE AND (first_attempt_at IS NULL OR first_attempt_at > DATE_SUB(NOW(), INTERVAL 23 HOUR))`,
      [id]
    );
    if (!result.affectedRows)
      throw new AppError(
        409,
        "NEWSLETTER_RETRY_UNSAFE",
        "This delivery cannot be retried safely. Review it with the email provider before sending again."
      );
    return { message: "Delivery queued for retry." };
  }
}
