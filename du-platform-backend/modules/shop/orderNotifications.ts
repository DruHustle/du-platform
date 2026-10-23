import { ORDER_STATUS_PAGE_MARKER } from "../../../shared/orderStatusProtocol";
import nextCopy from "../../../shared/orderNextCopy.json";
import emailLabels from "../../../shared/orderEmailLabels.json";
import stageCopy from "../../../shared/orderStatusCopy.json";
import { openOrderAccess, sealOrderAccess } from "./orderAccess";
import { getNotifyAlertEmails } from "../../shared/email";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import {
  sendNewsletterEmail,
  newsletterSender,
  type NewsletterEmail,
} from "../newsletter/provider";
import { deliveryFailure } from "../newsletter/worker";
import { emailText } from "../../../shared/customerEmailCopy";

const statusLabels: Record<string, string> = {
  en: "Order update",
  de: "Aktualisierung Ihrer Anfrage",
  sn: "Mashoko matsva eodha",
  nd: "Isaziso se-oda",
};
export function renderOrderEmail(
  row: any,
  from: string,
  link = "",
  to: string | string[] = row.customer_email
): NewsletterEmail {
  const isInitial = String(row.event_key).startsWith("request_received");
  const event =
    String(row.event_key)
      .split(":")
      .filter(part => part !== "operator")
      .at(-1) || "request_received";
  const labels = (emailLabels as any)[row.language] || emailLabels.en;
  const text = [
    emailText(row.language, "order_ref", { ref: row.order_ref }),
    `${statusLabels[row.language] || statusLabels.en}: ${(stageCopy as any)[row.language]?.[event] || (stageCopy.en as any)[event] || statusLabels[row.language] || statusLabels.en}`,
    ...(Array.isArray(row.items)
      ? row.items.map(
          (item: any) =>
            `${item.productName ?? item.product_name} × ${item.quantity}: ${((item.lineTotalCents ?? item.line_total_cents) / 100).toFixed(2)} ${row.quote_currency ?? row.currency}`
        )
      : []),
    ...(!isInitial && row.quote_version
      ? [
          `${labels.final_quote} ${row.quote_version}`,
          `${labels.valid_until}: ${new Date(row.valid_until).toISOString().replace("T", " ").slice(0, 16)} UTC`,
          `${labels.delivery_charge}: ${(row.shipping_cents / 100).toFixed(2)} ${row.quote_currency}`,
        ]
      : []),
    ...(isInitial && Number.isFinite(row.shipping_cents)
      ? [
          emailText(row.language, "delivery", {
            amount: `${(row.shipping_cents / 100).toFixed(2)} ${row.currency}`,
          }),
        ]
      : []),
    emailText(row.language, "total", {
      amount: `${((row.quote_total ?? row.total_cents) / 100).toFixed(2)} ${row.quote_currency ?? row.currency}`,
    }),
    isInitial
      ? emailText(row.language, "order_next")
      : (nextCopy as any)[row.language]?.[event] ||
        emailText(row.language, "contact"),
    row.carrier && row.tracking ? `${row.carrier}: ${row.tracking}` : "",
    row.refund_cents
      ? `${labels.refund_recorded}: ${(row.refund_cents / 100).toFixed(2)} ${row.quote_currency ?? row.currency}`
      : "",
    row.public_message || "",
    link,
    String(row.event_key).endsWith(":operator")
      ? `Customer: ${row.customer_name} (${row.customer_email})\nDestination: ${row.shipping_address}, ${row.shipping_city}, ${row.shipping_country}`
      : "",
    emailText(row.language, "contact"),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    from,
    to,
    subject: isInitial
      ? emailText(row.language, "order_subject", { ref: row.order_ref })
      : `${statusLabels[row.language] || statusLabels.en}: ${row.order_ref}`,
    text,
    html: `<p>${text.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!).replace(/\n/g, "<br>")}</p>${link ? `<p><a href="${link.replace(/&/g, "&amp;")}">${statusLabels[row.language] || statusLabels.en}</a></p>` : ""}`,
  };
}
// Oracle is released before the frontend. Hold customer mail until its private
// status page is deployed, rather than sending a link to an unavailable route.
export async function customerStatusFrontendReady() {
  try {
    const response = await fetch(
      "https://www.diasporaunlocked.com/shop/order-status",
      {
        signal: AbortSignal.timeout(6000),
        headers: { "Cache-Control": "no-cache" },
      }
    );
    return (
      response.ok && (await response.text()).includes(ORDER_STATUS_PAGE_MARKER)
    );
  } catch {
    return false;
  }
}
export async function processOrderNotifications(
  pool: Pool,
  send: (
    mail: NewsletterEmail,
    key: string
  ) => Promise<string> = sendNewsletterEmail,
  limit = 8,
  frontendReady: (() => Promise<boolean>) | null = send === sendNewsletterEmail
    ? customerStatusFrontendReady
    : null
) {
  const c = await pool.getConnection();
  let locked = false;
  let frontendAvailable: boolean | undefined;
  try {
    const [locks] = await c.query<RowDataPacket[]>(
      "SELECT GET_LOCK('du_order_notifications',0) AS acquired"
    );
    if (!Number(locks[0].acquired)) return;
    locked = true;
    for (let n = 0; n < limit; n++) {
      const [rows] = await c.query<RowDataPacket[]>(
        `SELECT n.*, o.order_ref, o.customer_email, o.customer_name, o.shipping_address, o.shipping_city, o.shipping_country, o.currency, o.total_cents, w.access_grant, q.total_cents AS quote_total, q.currency AS quote_currency FROM shop_order_notifications n JOIN shop_orders o ON o.id=n.order_id LEFT JOIN shop_order_workflows w ON w.order_id=o.id LEFT JOIN shop_quotes q ON q.order_id=o.id AND q.version=w.quote_version WHERE (n.status='pending' AND n.available_at<=NOW()) OR (n.status='processing' AND n.locked_at<DATE_SUB(NOW(), INTERVAL 5 MINUTE)) ORDER BY n.id LIMIT 1`
      );
      const row = rows[0];
      if (!row) break;
      if (
        row.first_attempt_at &&
        Date.now() - new Date(row.first_attempt_at).getTime() >= 23 * 3600000
      ) {
        await c.execute(
          "UPDATE shop_order_notifications SET status='failed', error_message='Safe provider retry window expired. Review provider acceptance before sending again.' WHERE id=?",
          [row.id]
        );
        continue;
      }
      if (Number(row.attempts) >= 5 && !row.manual_retry) {
        await c.execute(
          "UPDATE shop_order_notifications SET status='failed',error_message='Automatic retry limit reached. Review provider acceptance before an authorised retry.' WHERE id=?",
          [row.id]
        );
        continue;
      }
      const sender = await newsletterSender();
      if (!sender.ready && send === sendNewsletterEmail) {
        await c.execute(
          "UPDATE shop_order_notifications SET status='failed',locked_at=NULL,error_message='Transactional email is not configured. The saved request is safe.' WHERE id=?",
          [row.id]
        );
        continue;
      }
      const operator = String(row.event_key).endsWith(":operator");
      if (frontendReady && !operator) {
        frontendAvailable ??= await frontendReady();
        if (!frontendAvailable) {
          await c.execute(
            "UPDATE shop_order_notifications SET status='pending',locked_at=NULL,available_at=DATE_ADD(NOW(),INTERVAL 60 SECOND),error_message='Waiting for the compatible customer status page to be deployed.' WHERE id=?",
            [row.id]
          );
          continue;
        }
      }
      await c.execute(
        "UPDATE shop_order_notifications SET status='processing', attempts=attempts+1, manual_retry=FALSE, locked_at=NOW(), first_attempt_at=COALESCE(first_attempt_at,NOW()) WHERE id=?",
        [row.id]
      );
      try {
        if (row.event_data) Object.assign(row, JSON.parse(row.event_data));
        const to = operator ? await getNotifyAlertEmails() : row.customer_email;
        if (Array.isArray(to) && !to.length) {
          await c.execute(
            "UPDATE shop_order_notifications SET status='skipped', error_message='No operator notification recipients configured.' WHERE id=?",
            [row.id]
          );
          continue;
        }
        const link =
          !operator && row.access_grant
            ? `https://www.diasporaunlocked.com/shop/order-status#ref=${encodeURIComponent(row.order_ref)}&access=${openOrderAccess(row.access_grant)}`
            : "";
        let mail: NewsletterEmail;
        if (row.payload) mail = JSON.parse(openOrderAccess(row.payload));
        else {
          mail = renderOrderEmail(row, sender.from, link, to);
          await c.execute(
            "UPDATE shop_order_notifications SET payload=? WHERE id=?",
            [sealOrderAccess(JSON.stringify(mail)), row.id]
          );
        }
        const providerId = await send(mail, `du-order/${row.id}`);
        await c.execute(
          "UPDATE shop_order_notifications SET status='sent', accepted_at=NOW(), provider_id=?, locked_at=NULL, error_message=NULL WHERE id=?",
          [providerId, row.id]
        );
      } catch (err) {
        const failure = deliveryFailure(err, Number(row.attempts) + 1);
        await c.execute(
          "UPDATE shop_order_notifications SET status=?, available_at=DATE_ADD(NOW(), INTERVAL ? SECOND), locked_at=NULL, error_message=? WHERE id=?",
          [
            failure.retry ? "pending" : "failed",
            failure.delaySeconds,
            failure.message,
            row.id,
          ]
        );
      }
    }
  } finally {
    if (locked)
      await c
        .query("SELECT RELEASE_LOCK('du_order_notifications')")
        .catch(() => {});
    c.release();
  }
}
export function startOrderNotificationWorker(pool: Pool | null = db) {
  if (!pool) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processOrderNotifications(pool);
    } catch {
      console.error("[shop-outbox] Delivery batch failed.");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 15000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
