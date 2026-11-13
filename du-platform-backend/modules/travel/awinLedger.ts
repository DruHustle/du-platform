import { z } from "zod";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

type Sql = Pick<Pool, "execute">;
type PartnerId = string | number;

export async function initializeAwinLedger(sql: Sql) {
  await sql.execute(`CREATE TABLE IF NOT EXISTS travel_awin_handoffs (
    click_ref CHAR(36) PRIMARY KEY, publisher_id BIGINT UNSIGNED NOT NULL, advertiser_id BIGINT UNSIGNED NOT NULL,
    channel ENUM('web','ios','android') NOT NULL, issued_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
  )`);
  await sql.execute(`CREATE TABLE IF NOT EXISTS travel_awin_observations (
    sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL, click_ref CHAR(36) NOT NULL,
    status ENUM('pending','approved','declined','deleted') NOT NULL, commission DECIMAL(20,8) NOT NULL,
    currency CHAR(3) NOT NULL, payment_id BIGINT UNSIGNED NULL, observed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (click_ref) REFERENCES travel_awin_handoffs(click_ref),
    INDEX transaction_history (transaction_id, sequence_id)
  )`);
}

export async function recordAwinHandoff(
  sql: Sql | null,
  handoff: {
    clickRef: string;
    publisherId: PartnerId;
    advertiserId: PartnerId;
    channel: "web" | "ios" | "android";
  },
) {
  if (!sql) throw new Error("Referral storage unavailable");
  const { clickRef, publisherId, advertiserId, channel } = handoff;
  await sql.execute(
    `INSERT INTO travel_awin_handoffs (click_ref,publisher_id,advertiser_id,channel)
    VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE click_ref=travel_awin_handoffs.click_ref`,
    [clickRef, publisherId, advertiserId, channel],
  );
  const [rows] = await sql.execute<RowDataPacket[]>(
    `SELECT 1 FROM travel_awin_handoffs
    WHERE click_ref=? AND publisher_id=? AND advertiser_id=? AND channel=?`,
    [clickRef, publisherId, advertiserId, channel],
  );
  if (!rows.length)
    throw new Error("Referral reference belongs to a different placement");
}

const safeId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const reportRow = z.object({
  id: safeId,
  publisherId: safeId,
  advertiserId: safeId,
  type: z.string(),
  clickRefs: z
    .object({ clickRef: z.string().optional().nullable() })
    .optional()
    .nullable(),
  commissionStatus: z.enum(["pending", "approved", "declined", "deleted"]),
  commissionAmount: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    amount: z
      .union([z.number().finite(), z.string()])
      .transform(String)
      .pipe(z.string().regex(/^-?\d{1,12}(\.\d{1,8})?$/)),
  }),
  paidToPublisher: z.boolean().optional(),
  paymentId: safeId.or(z.literal(0)).nullish(),
});

export async function applyAwinReport(
  connection: PoolConnection,
  raw: unknown,
  publisher: number,
  advertiser: number,
) {
  const results = { recorded: 0, unchanged: 0, unmatched: 0, otherTypes: 0 };
  const rows = z.array(reportRow).parse(raw);
  for (const row of rows) {
    if (row.publisherId !== publisher || row.advertiserId !== advertiser)
      throw new Error("Report contains a different publisher or advertiser");
    if (
      ![
        "sale",
        "mobile sale",
        "mobile app purchase",
        "commission group transaction",
      ].includes(row.type.toLowerCase())
    ) {
      results.otherTypes++;
      continue;
    }
    let ref = row.clickRefs?.clickRef;
    if (!ref) {
      // Later reports can omit the publisher click reference. A transaction
      // can inherit only attribution already established in this account.
      const [matched] = await connection.execute<RowDataPacket[]>(
        `SELECT h.click_ref FROM travel_awin_observations o
         JOIN travel_awin_handoffs h ON h.click_ref = o.click_ref
         WHERE o.transaction_id = ? AND h.publisher_id = ? AND h.advertiser_id = ?
         ORDER BY o.sequence_id DESC LIMIT 1`,
        [row.id, publisher, advertiser],
      );
      ref = matched[0]?.click_ref;
    }
    if (!ref || !z.string().uuid().safeParse(ref).success) {
      results.unmatched++;
      continue;
    }
    const [handoffs] = await connection.execute<RowDataPacket[]>(
      `SELECT click_ref FROM travel_awin_handoffs
      WHERE click_ref=? AND publisher_id=? AND advertiser_id=?`,
      [ref, publisher, advertiser],
    );
    if (!handoffs.length) {
      results.unmatched++;
      continue;
    }
    if (row.paidToPublisher && !row.paymentId)
      throw new Error("Paid transaction lacks a payment ID");
    const payment = row.paidToPublisher ? row.paymentId! : null;
    const [previous] = await connection.execute<RowDataPacket[]>(
      `SELECT click_ref,
      (status=? AND commission=CAST(? AS DECIMAL(20,8)) AND currency=? AND payment_id <=> ?) AS unchanged
      FROM travel_awin_observations WHERE transaction_id=? ORDER BY sequence_id DESC LIMIT 1`,
      [
        row.commissionStatus,
        row.commissionAmount.amount,
        row.commissionAmount.currency,
        payment,
        row.id,
      ],
    );
    if (previous.length && previous[0].click_ref !== ref)
      throw new Error("Transaction reference changed; review with Awin");
    if (previous[0]?.unchanged) {
      results.unchanged++;
      continue;
    }
    await connection.execute(
      `INSERT INTO travel_awin_observations (transaction_id,click_ref,status,commission,currency,payment_id)
      VALUES (?,?,?,?,?,?)`,
      [
        row.id,
        ref,
        row.commissionStatus,
        row.commissionAmount.amount,
        row.commissionAmount.currency,
        payment,
      ],
    );
    results.recorded++;
  }
  return results;
}
