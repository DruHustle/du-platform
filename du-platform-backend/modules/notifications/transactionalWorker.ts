import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import { PASSWORD_RESET_PAGE_MARKER } from "../../../shared/passwordResetProtocol";
import { newsletterOrigin } from "../newsletter/content";
import { outboundMessagesPaused } from "../../shared/outboundMessages";
import { getNotifyAlertEmails } from "../../shared/email";
import { openOrderAccess, sealOrderAccess } from "../shop/orderAccess";
import { deliveryFailure } from "../newsletter/worker";
import {
  newsletterSender,
  sendNewsletterEmail,
  type NewsletterEmail,
} from "../newsletter/provider";

export async function passwordResetFrontendReady() {
  try {
    const response = await fetch(`${newsletterOrigin()}/reset-password`, {
      signal: AbortSignal.timeout(6000),
      headers: { "Cache-Control": "no-cache" },
    });
    return (
      response.ok &&
      (await response.text()).includes(PASSWORD_RESET_PAGE_MARKER)
    );
  } catch {
    return false;
  }
}
export async function processTransactionalMessages(
  pool: Pool,
  send = sendNewsletterEmail,
  limit = 8,
  frontendReady: (() => Promise<boolean>) | null = send === sendNewsletterEmail
    ? passwordResetFrontendReady
    : null
) {
  if (outboundMessagesPaused()) return;
  const c = await pool.getConnection();
  let locked = false;
  let compatibleFrontend: boolean | undefined;
  try {
    const [locks] = await c.query<RowDataPacket[]>(
      "SELECT GET_LOCK(CONCAT('du_service_delivery:',LEFT(SHA2(DATABASE(),256),32)),0) AS acquired"
    );
    if (!Number(locks[0].acquired)) return;
    locked = true;
    for (let i = 0; i < limit; i++) {
      if (outboundMessagesPaused()) break;
      const [rows] = await c.query<
        RowDataPacket[]
      >(`SELECT *,first_attempt_at<=DATE_SUB(NOW(),INTERVAL 23 HOUR) AS expired
        FROM transactional_messages WHERE (status='pending' AND available_at<=NOW()) OR
        (status='processing' AND locked_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)) ORDER BY id LIMIT 1`);
      const job = rows[0];
      if (!job) break;
      if (job.expired) {
        await c.execute(
          "UPDATE transactional_messages SET status='reconcile',locked_at=NULL,error_message='Safe replay window expired. Reconcile provider acceptance; no replacement will be sent.' WHERE id=? AND status IN ('pending','processing')",
          [job.id]
        );
        continue;
      }
      if (Number(job.attempts) >= 5 && !job.manual_retry) {
        await c.execute(
          "UPDATE transactional_messages SET status='failed',locked_at=NULL,error_message='Automatic retry limit reached. Review before an authorised retry.' WHERE id=? AND status IN ('pending','processing')",
          [job.id]
        );
        continue;
      }
      if (send === sendNewsletterEmail && !(await newsletterSender()).ready) {
        await c.execute(
          "UPDATE transactional_messages SET status='failed',locked_at=NULL,error_message='Email provider is not configured. The saved request is retained.' WHERE id=? AND status IN ('pending','processing')",
          [job.id]
        );
        continue;
      }
      if (job.kind === "password_reset" && frontendReady) {
        const [tokens] = await c.query<RowDataPacket[]>(
          "SELECT 1 FROM password_reset_tokens WHERE token_hash=? AND user_id=? AND used_at IS NULL AND expires_at>NOW()",
          [job.reset_hash, job.user_id]
        );
        if (!tokens.length) {
          await c.execute(
            "UPDATE transactional_messages SET status='skipped',locked_at=NULL,error_message='Reset credential is expired or consumed.' WHERE id=? AND status IN ('pending','processing')",
            [job.id]
          );
          continue;
        }
        compatibleFrontend ??= await frontendReady();
        if (!compatibleFrontend) {
          await c.execute(
            "UPDATE transactional_messages SET status='pending',locked_at=NULL,available_at=DATE_ADD(NOW(),INTERVAL 60 SECOND),error_message='Waiting for the compatible password reset page.' WHERE id=? AND status IN ('pending','processing')",
            [job.id]
          );
          continue;
        }
      }
      // Route an operator snapshot once, before any provider request/key use.
      // After first_attempt_at is set the complete payload is immutable.
      try {
        const payload = JSON.parse(
          openOrderAccess(job.encrypted_payload)
        ) as NewsletterEmail;
        if (
          job.kind.endsWith("_operator") &&
          Array.isArray(payload.to) &&
          !payload.to.length &&
          !job.first_attempt_at
        ) {
          const to = await getNotifyAlertEmails();
          if (!to.length) {
            await c.execute(
              "UPDATE transactional_messages SET status='failed',error_message='No operator email destination configured. Enquiry remains in the protected inbox.' WHERE id=? AND status IN ('pending','processing')",
              [job.id]
            );
            continue;
          }
          job.encrypted_payload = sealOrderAccess(
            JSON.stringify({ ...payload, to })
          );
          await c.execute(
            "UPDATE transactional_messages SET encrypted_payload=? WHERE id=? AND first_attempt_at IS NULL AND status IN ('pending','processing')",
            [job.encrypted_payload, job.id]
          );
        }
      } catch {
        await c.execute(
          "UPDATE transactional_messages SET status='reconcile',locked_at=NULL,error_message='Saved payload could not be opened. Restore retained runtime key; do not replace delivery.' WHERE id=? AND status IN ('pending','processing')",
          [job.id]
        );
        continue;
      }
      const [claim] = await c.execute<ResultSetHeader>(
        `UPDATE transactional_messages SET status='processing',locked_at=NOW()
        WHERE id=? AND (status='pending' OR (status='processing' AND locked_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)))`,
        [job.id]
      );
      if (!claim.affectedRows) continue;
      try {
        await c.beginTransaction();
        let eligible = true;
        if (job.kind === "password_reset") {
          // User first, then reset token, then message: matches password reset/login.
          const [users] = await c.query<RowDataPacket[]>(
            "SELECT email,auth_version FROM users WHERE id=? FOR UPDATE",
            [job.user_id]
          );
          const [tokens] = await c.query<RowDataPacket[]>(
            "SELECT used_at,expires_at>NOW() AS valid FROM password_reset_tokens WHERE token_hash=? AND user_id=? FOR UPDATE",
            [job.reset_hash, job.user_id]
          );
          const payload = JSON.parse(openOrderAccess(job.encrypted_payload));
          eligible = Boolean(
            users[0] &&
              tokens[0]?.valid &&
              !tokens[0].used_at &&
              Number(users[0].auth_version) === Number(job.auth_version) &&
              users[0].email === payload.to
          );
        }
        const [current] = await c.query<RowDataPacket[]>(
          "SELECT status FROM transactional_messages WHERE id=? FOR UPDATE",
          [job.id]
        );
        if (current[0]?.status !== "processing") {
          await c.rollback();
          continue;
        }
        if (!eligible) {
          await c.execute(
            "UPDATE transactional_messages SET status='skipped',locked_at=NULL,error_message='Reset credential is expired, consumed or no longer applicable.' WHERE id=?",
            [job.id]
          );
          await c.commit();
          continue;
        }
        if (outboundMessagesPaused()) {
          await c.rollback();
          break;
        }
        // Persist uncertainty and the retry clock BEFORE the external operation.
        // A separate autocommit is essential: rollback after provider acceptance
        // must not erase the fact that the stable key may already have been used.
        await c.commit();
        await c.execute(
          "UPDATE transactional_messages SET attempts=attempts+1,manual_retry=FALSE,first_attempt_at=COALESCE(first_attempt_at,NOW()),acceptance_uncertain=TRUE WHERE id=?",
          [job.id]
        );
        // Reacquire user/token eligibility locks for the send itself. Password
        // changes cannot commit between this check and provider acceptance.
        await c.beginTransaction();
        if (job.kind === "password_reset") {
          const [u] = await c.query<RowDataPacket[]>(
            "SELECT email,auth_version FROM users WHERE id=? FOR UPDATE",
            [job.user_id]
          );
          const [t] = await c.query<RowDataPacket[]>(
            "SELECT used_at,expires_at>NOW() AS valid FROM password_reset_tokens WHERE token_hash=? AND user_id=? FOR UPDATE",
            [job.reset_hash, job.user_id]
          );
          const p = JSON.parse(openOrderAccess(job.encrypted_payload));
          if (
            !u[0] ||
            !t[0]?.valid ||
            t[0].used_at ||
            Number(u[0].auth_version) !== Number(job.auth_version) ||
            u[0].email !== p.to
          ) {
            await c.execute(
              "UPDATE transactional_messages SET status='skipped',locked_at=NULL,error_message='Reset credential is no longer eligible.' WHERE id=?",
              [job.id]
            );
            await c.commit();
            continue;
          }
        }
        const [live] = await c.query<RowDataPacket[]>(
          "SELECT status FROM transactional_messages WHERE id=? FOR UPDATE",
          [job.id]
        );
        if (live[0]?.status !== "processing") {
          await c.rollback();
          continue;
        }
        if (outboundMessagesPaused()) {
          await c.rollback();
          break;
        }
        const providerId = await send(
          JSON.parse(openOrderAccess(job.encrypted_payload)),
          `du-service/${job.intent_key}`
        );
        if (!providerId) throw new Error("Provider acceptance unconfirmed");
        await c.execute(
          "UPDATE transactional_messages SET status='accepted',accepted_at=NOW(),provider_id=?,locked_at=NULL,acceptance_uncertain=FALSE,error_message=NULL WHERE id=?",
          [providerId, job.id]
        );
        await c.commit();
      } catch (error: any) {
        await c.rollback();
        const failure = deliveryFailure(error, Number(job.attempts) + 1);
        const status = Number(error?.response?.status || 0);
        const uncertain = !status || status >= 500 || status === 409;
        await c.execute(
          "UPDATE transactional_messages SET status=?,available_at=DATE_ADD(NOW(),INTERVAL ? SECOND),locked_at=NULL,acceptance_uncertain=?,error_message=? WHERE id=? AND status='processing'",
          [
            failure.retry ? "pending" : "failed",
            failure.delaySeconds,
            uncertain,
            failure.message,
            job.id,
          ]
        );
      }
      await new Promise(done => setTimeout(done, 600));
    }
  } finally {
    if (locked)
      await c
        .query(
          "SELECT RELEASE_LOCK(CONCAT('du_service_delivery:',LEFT(SHA2(DATABASE(),256),32)))"
        )
        .catch(() => {});
    c.release();
  }
}
export function startTransactionalWorker(pool: Pool | null = db) {
  if (!pool) return () => {};
  let running = false;
  const tick = async () => {
    if (running || outboundMessagesPaused()) return;
    running = true;
    try {
      await processTransactionalMessages(pool);
    } catch {
      console.error("[service-outbox] Saved delivery batch unavailable.");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 5000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
