import { outboundMessagesPaused } from "../../shared/outboundMessages";
import {
  ProductInterestService,
  deliverProductInterest,
} from "../shop/interestService";
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { hashNewsletterToken } from "./content";
import { db } from "../../shared/databaseRuntime";
import {
  sendNewsletterEmail,
  newsletterSender,
  type NewsletterEmail,
} from "./provider";

// Provider keys are retained for 24 hours. Stop uncertain retries before expiry.
export const safeRetryWindowMs = 23 * 60 * 60 * 1000;
export function deliveryFailure(error: any, attempts: number) {
  const status = Number(error?.response?.status || 0);
  const transient =
    !status ||
    status === 429 ||
    status >= 500 ||
    (status === 409 &&
      error?.response?.data?.name === "concurrent_idempotent_requests");
  return {
    retry: transient && attempts < 5,
    message: status
      ? `Email provider returned HTTP ${status}.`
      : "Email provider could not confirm acceptance.",
    delaySeconds: Math.min(3600, 30 * 2 ** attempts),
  };
}

async function deliverSubscription(
  connection: PoolConnection,
  job: RowDataPacket,
  send: (email: NewsletterEmail, key: string) => Promise<string>
) {
  await connection.beginTransaction();
  try {
    // Serialize provider acceptance with opt-out and replacement confirmations,
    // just as product-interest deliveries do. No send starts after opt-out commits.
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT status, confirmation_hash, confirmation_expires_at > NOW() AS confirmation_valid FROM newsletter_subscriptions WHERE id = ? FOR UPDATE",
      [job.subscription_id]
    );
    const subscriber = rows[0];
    const payload = JSON.parse(job.payload) as NewsletterEmail;
    // Existing durable payloads already contain the exact confirmation token.
    // Check its hash too: a reclaimed processing job may belong to an older
    // signup even when the current subscription is pending with a valid expiry.
    const token =
      job.kind === "confirmation"
        ? payload.text.match(/token=([a-f0-9]{48})(?![a-f0-9])/)?.[1]
        : undefined;
    const eligible =
      subscriber &&
      ((job.kind === "campaign" && subscriber.status === "subscribed") ||
        (job.kind === "confirmation" &&
          subscriber.status === "pending" &&
          subscriber.confirmation_valid &&
          token &&
          hashNewsletterToken(token) === subscriber.confirmation_hash));
    if (!eligible) {
      await connection.execute(
        "UPDATE newsletter_deliveries SET status = 'skipped', locked_at = NULL, error_message = 'Subscription or confirmation is no longer eligible.' WHERE id = ?",
        [job.id]
      );
    } else {
      const providerId = await send(payload, `du-newsletter/${job.id}`);
      await connection.execute(
        "UPDATE newsletter_deliveries SET status = 'sent', accepted_at = NOW(), provider_id = ?, locked_at = NULL, error_message = NULL WHERE id = ?",
        [providerId, job.id]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
export async function processNewsletterBatch(
  pool: Pool,
  send = sendNewsletterEmail,
  limit = 8
) {
  if (outboundMessagesPaused()) return;
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [locks] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK(CONCAT('du_newsletter_delivery:', LEFT(SHA2(DATABASE(),256),32)), 0) AS acquired"
    );
    if (!Number(locks[0].acquired)) return;
    locked = true;
    for (let index = 0; index < limit; index++) {
      const [rows] = await connection.query<
        RowDataPacket[]
      >(`SELECT *, first_attempt_at <= DATE_SUB(NOW(), INTERVAL 23 HOUR) AS retry_expired FROM newsletter_deliveries WHERE
        (status = 'pending' AND available_at <= NOW()) OR (status = 'processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)) ORDER BY id LIMIT 1`);
      const row = rows[0];
      if (!row) break;
      // Claim conditionally before checking eligibility. Never resurrect an
      // opt-out that changed a pending job to skipped after our SELECT.
      const [claim] = await connection.execute<ResultSetHeader>(
        `UPDATE newsletter_deliveries SET status = 'processing', attempts = attempts + 1, locked_at = NOW(), first_attempt_at = COALESCE(first_attempt_at, NOW()) WHERE id = ? AND (status = 'pending' OR (status = 'processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)))`,
        [row.id]
      );
      if (!claim.affectedRows) continue;
      if (row.retry_expired) {
        await connection.execute(
          `UPDATE newsletter_deliveries SET status = 'failed', retry_safe = FALSE, error_message = 'Acceptance is uncertain and the safe retry window expired. Review with the provider.' WHERE id = ?`,
          [row.id]
        );
        continue;
      }
      try {
        if (row.interest_id) {
          await deliverProductInterest(connection, row, send);
        } else if (row.subscription_id) {
          await deliverSubscription(connection, row, send);
        } else {
          const providerId = await send(
            JSON.parse(row.payload) as NewsletterEmail,
            `du-newsletter/${row.id}`
          );
          await connection.execute(
            `UPDATE newsletter_deliveries SET status = 'sent', accepted_at = NOW(), provider_id = ?, locked_at = NULL, error_message = NULL WHERE id = ?`,
            [providerId, row.id]
          );
        }
      } catch (error) {
        const failure = deliveryFailure(error, Number(row.attempts) + 1);
        await connection.execute(
          `UPDATE newsletter_deliveries SET status = ?, available_at = DATE_ADD(NOW(), INTERVAL ? SECOND), locked_at = NULL, error_message = ? WHERE id = ?`,
          [
            failure.retry ? "pending" : "failed",
            failure.delaySeconds,
            failure.message,
            row.id,
          ]
        );
      }
      // Stay below the provider's usual two requests/second across this queue.
      await new Promise(done => setTimeout(done, 600));
    }
    await connection.execute(
      `UPDATE newsletter_campaigns c SET status = CASE WHEN EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id = c.id AND d.status IN ('pending','processing')) THEN 'queued' ELSE 'completed' END WHERE c.status <> 'draft'`
    );
  } finally {
    if (locked)
      await connection
        .query(
          "SELECT RELEASE_LOCK(CONCAT('du_newsletter_delivery:', LEFT(SHA2(DATABASE(),256),32)))"
        )
        .catch(() => {});
    connection.release();
  }
}
export function startNewsletterWorker(pool: Pool | null = db) {
  if (!pool) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (outboundMessagesPaused()) return;
      if ((await newsletterSender()).ready) {
        await new ProductInterestService(pool).queueAvailable();
        await processNewsletterBatch(pool);
      }
    } catch {
      console.error(
        "[newsletter] Delivery queue unavailable; saved deliveries will resume automatically."
      );
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 5000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
