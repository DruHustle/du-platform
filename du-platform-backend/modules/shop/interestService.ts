import { escapeEmailHtml } from "../../shared/email";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import { AppError } from "../../core/errorHandler";
import { customerLanguage } from "../../../shared/customerLanguage";
import { NewsletterService } from "../newsletter/service";
import {
  hashNewsletterToken,
  newsletterToken,
  newsletterOrigin,
  renderNewsletter,
} from "../newsletter/content";
import { newsletterSender, type NewsletterEmail } from "../newsletter/provider";
import { publicShopReadiness } from "./shopReadiness";
import copy from "../../shared/copy/productInterestCopy.json";

export class ProductInterestService extends NewsletterService {
  constructor(pool: Pool | null = db) {
    super(pool);
  }
  async register(input: {
    email: string;
    productSlug: string;
    productId?: number | null;
    language?: string;
  }) {
    const language = customerLanguage(input.language),
      from = (await newsletterSender()).from;
    await this.transaction(async c => {
      // Fresh, authoritative publication check, independent of the public catalogue cache.
      const [products] = await c.query<RowDataPacket[]>(
        "SELECT id,slug,name FROM shop_products WHERE slug=? AND is_active=1",
        [input.productSlug]
      );
      const product = products[0];
      if (
        !product ||
        (input.productId != null && product.id !== input.productId)
      )
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
      await c.execute(
        `INSERT INTO shop_restock_notifications (product_id,product_slug,product_name,email,language) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
        [product.id, product.slug, product.name, input.email, language]
      );
      const [rows] = await c.query<RowDataPacket[]>(
        `SELECT *, last_confirmation_at > DATE_SUB(NOW(),INTERVAL 1 HOUR) AS recent FROM shop_restock_notifications WHERE product_slug=? AND email=? FOR UPDATE`,
        [product.slug, input.email]
      );
      const row = rows[0];
      if (row.status === "confirmed" || row.recent) return;
      const token = newsletterToken(),
        cancel = newsletterToken(),
        generation = row.generation + 1;
      await c.execute(
        `UPDATE shop_restock_notifications SET product_id=?, product_name=?, language=?, status='pending', consent_at=NOW(), confirmed_at=NULL, cancelled_at=NULL, notified_at=NULL, confirmation_hash=?, confirmation_expires_at=DATE_ADD(NOW(),INTERVAL 48 HOUR), last_confirmation_at=NOW(), cancel_token=?, generation=? WHERE id=?`,
        [
          product.id,
          product.name,
          language,
          hashNewsletterToken(token),
          cancel,
          generation,
          row.id,
        ]
      );
      await c.execute(
        `UPDATE newsletter_deliveries SET status='skipped', error_message='Replaced by a new request.' WHERE interest_id=? AND status='pending'`,
        [row.id]
      );
      await this.enqueueInterest(
        c,
        {
          ...row,
          product_name: product.name,
          language,
          generation,
          cancel_token: cancel,
        },
        "interest_confirm",
        from,
        token
      );
    });
    return {
      requiresConfirmation: true,
      message:
        "If confirmation is needed, an email link will be sent. No order or payment is created.",
    };
  }
  async confirm(token: string) {
    await this.transaction(async c => {
      const [rows] = await c.query<RowDataPacket[]>(
        `SELECT id FROM shop_restock_notifications WHERE confirmation_hash=? AND confirmation_expires_at>NOW() AND status='pending' FOR UPDATE`,
        [hashNewsletterToken(token)]
      );
      if (!rows.length)
        throw new AppError(
          400,
          "INTEREST_LINK_INVALID",
          "This link is invalid, expired or already used."
        );
      await c.execute(
        `UPDATE shop_restock_notifications SET status='confirmed', confirmed_at=NOW(), confirmation_hash=NULL, confirmation_expires_at=NULL WHERE id=?`,
        [rows[0].id]
      );
    });
    return { confirmed: true, message: "Product interest confirmed." };
  }
  async cancel(token: string) {
    await this.transaction(async c => {
      const [rows] = await c.query<RowDataPacket[]>(
        `SELECT id FROM shop_restock_notifications WHERE cancel_token=? FOR UPDATE`,
        [token]
      );
      if (!rows.length)
        throw new AppError(
          400,
          "INTEREST_LINK_INVALID",
          "This link is invalid."
        );
      await c.execute(
        `UPDATE shop_restock_notifications SET status='cancelled', cancelled_at=COALESCE(cancelled_at,NOW()), confirmation_hash=NULL, confirmation_expires_at=NULL WHERE id=?`,
        [rows[0].id]
      );
      await c.execute(
        `UPDATE newsletter_deliveries SET status='skipped', error_message='Product alert cancelled.' WHERE interest_id=? AND status='pending'`,
        [rows[0].id]
      );
    });
    return { cancelled: true };
  }
  async enqueueInterest(
    c: PoolConnection,
    row: RowDataPacket | Record<string, any>,
    kind: "interest_confirm" | "interest_available",
    from: string,
    token?: string
  ) {
    const language = customerLanguage(row.language),
      text = copy[language];
    const link = (action: string, value: string) =>
      `${newsletterOrigin()}/shop/interest?lng=${language}#action=${action}&token=${value}`;
    const cancel = link("cancel", row.cancel_token);
    const subject = `${kind === "interest_confirm" ? text.confirm_subject : text.available_subject}: ${String(row.product_name).replace(/[\r\n]/g, " ")}`;
    const body =
      kind === "interest_confirm"
        ? `${text.confirm_body}\n\n${link("confirm", token!)}\n\n${text.expiry}`
        : `${text.available_body}\n\n${newsletterOrigin()}/shop/product/${encodeURIComponent(row.product_slug)}`;
    const content = renderNewsletter(
      subject,
      body,
      undefined,
      `${text.scope}\n${text.cancel}: ${cancel}`,
      language
    );
    const primaryUrl =
      kind === "interest_confirm"
        ? link("confirm", token!)
        : `${newsletterOrigin()}/shop/product/${encodeURIComponent(row.product_slug)}`;
    content.html = content.html.replace(
      "</main>",
      `<p><a href="${escapeEmailHtml(primaryUrl)}" style="display:inline-block;padding:12px 20px;background:#facc15;color:#0f172a;border-radius:8px">${escapeEmailHtml(kind === "interest_confirm" ? text.confirm : text.view_product)}</a></p><p><a href="${escapeEmailHtml(cancel)}">${escapeEmailHtml(text.cancel)}</a></p></main>`
    );
    await c.execute(
      `INSERT IGNORE INTO newsletter_deliveries (interest_id,interest_generation,intent_key,kind,recipient,payload) VALUES (?,?,?,?,?,?)`,
      [
        row.id,
        row.generation,
        `interest/${row.id}/${row.generation}/${kind}`,
        kind,
        row.email,
        JSON.stringify({ from, to: row.email, subject, ...content }),
      ]
    );
  }
  // Sweep also covers an approval/mode change without relying on an admin edit.
  async queueAvailable() {
    const state = await publicShopReadiness();
    if (!state.commercialReady || !state.approvedProductIds?.length) return;
    const from = (await newsletterSender()).from;
    await this.transaction(async c => {
      const [rows] = await c.query<RowDataPacket[]>(
        `SELECT i.* FROM shop_restock_notifications i JOIN shop_products p ON p.id=i.product_id WHERE i.status='confirmed' AND p.is_active=1 AND p.stock_qty>0 AND p.id IN (?) AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.intent_key=CONCAT('interest/',i.id,'/',i.generation,'/interest_available')) ORDER BY i.id LIMIT 50 FOR UPDATE`,
        [state.approvedProductIds]
      );
      for (const row of rows)
        await this.enqueueInterest(c, row, "interest_available", from);
    });
  }
  async demand(from: string, to: string) {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT product_id,product_slug,MAX(product_name) AS product_name, COUNT(*) AS total, SUM(status='pending' AND confirmation_expires_at IS NOT NULL AND confirmation_expires_at>NOW()) AS pending, SUM(status='pending' AND (confirmation_expires_at IS NULL OR confirmation_expires_at<=NOW())) AS expired, SUM(status='confirmed') AS confirmed, SUM(status='cancelled') AS cancelled, SUM(status='notified') AS notified, SUM(status='legacy') AS legacy, SUM(confirmed_at IS NOT NULL) AS confirmed_unique FROM shop_restock_notifications WHERE consent_at>=? AND consent_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY product_id,product_slug ORDER BY confirmed DESC,confirmed_unique DESC,total DESC,product_slug`,
      [from, to]
    );
    const [deliveries] = await this.pool().query<RowDataPacket[]>(
      `SELECT d.id,i.product_name,d.kind,d.status,d.attempts,d.error_message,d.accepted_at,d.created_at FROM newsletter_deliveries d JOIN shop_restock_notifications i ON i.id=d.interest_id ORDER BY d.id DESC LIMIT 100`
    );
    const [legacy] = await this.pool().query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM shop_restock_notifications WHERE status='legacy'`
    );
    return { rows, deliveries, legacy: legacy[0].count, from, to };
  }
}

// Serialize cancellation/re-registration against delivery. Provider acceptance may
// precede a cancellation; stable outbox keys cover an interrupted DB commit.
export async function deliverProductInterest(
  c: PoolConnection,
  job: RowDataPacket,
  send: (email: NewsletterEmail, key: string) => Promise<string>
) {
  await c.beginTransaction();
  try {
    const [rows] = await c.query<RowDataPacket[]>(
      `SELECT i.*, confirmation_expires_at>NOW() AS valid, p.is_active, p.stock_qty FROM shop_restock_notifications i LEFT JOIN shop_products p ON p.id=i.product_id WHERE i.id=? FOR UPDATE`,
      [job.interest_id]
    );
    const row = rows[0],
      confirmation = job.kind === "interest_confirm";
    if (
      !row ||
      row.generation !== job.interest_generation ||
      row.status !== (confirmation ? "pending" : "confirmed") ||
      (confirmation && !row.valid)
    ) {
      await c.execute(
        `UPDATE newsletter_deliveries SET status='skipped', locked_at=NULL, error_message='Product interest is no longer eligible.' WHERE id=?`,
        [job.id]
      );
    } else {
      const state = confirmation ? null : await publicShopReadiness();
      if (
        !confirmation &&
        (!state?.commercialReady ||
          !state.approvedProductIds?.includes(row.product_id) ||
          !row.is_active ||
          row.stock_qty <= 0)
      ) {
        await c.execute(
          `UPDATE newsletter_deliveries SET status='pending', attempts=attempts-1, first_attempt_at=?, available_at=DATE_ADD(NOW(),INTERVAL 5 MINUTE),locked_at=NULL,error_message='Waiting for published, stocked and commercially approved product.' WHERE id=?`,
          [job.first_attempt_at, job.id]
        );
      } else {
        const providerId = await send(
          JSON.parse(job.payload),
          `du-newsletter/${job.id}`
        );
        await c.execute(
          `UPDATE newsletter_deliveries SET status='sent',accepted_at=NOW(),provider_id=?,locked_at=NULL,error_message=NULL WHERE id=?`,
          [providerId, job.id]
        );
        if (!confirmation)
          await c.execute(
            `UPDATE shop_restock_notifications SET status='notified',notified_at=NOW() WHERE id=?`,
            [row.id]
          );
      }
    }
    await c.commit();
  } catch (error) {
    await c.rollback();
    throw error;
  }
}
