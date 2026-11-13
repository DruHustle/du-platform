import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
} from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyAwinReport,
  initializeAwinLedger,
  recordAwinHandoff,
} from "../awinLedger";

const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!new URL(url).pathname.endsWith("_test") ||
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
)
  throw new Error("Use a disposable localhost *_test database");
describe.skipIf(!url)("Awin referral and financial evidence in MySQL", () => {
  const schema = "du_awin_" + randomUUID().replaceAll("-", "") + "_test";
  const clickRef = randomUUID(),
    publisherId = 21,
    advertiserId = 17;
  const base = {
    id: 78,
    publisherId,
    advertiserId,
    type: "Sale",
    clickRefs: { clickRef },
    commissionStatus: "pending",
    commissionAmount: { amount: 3.15, currency: "GBP" },
    paidToPublisher: false,
    paymentId: 0,
  };
  let pool: Pool, connection: PoolConnection;
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    try {
      await admin.query(`CREATE DATABASE ${schema}`);
    } finally {
      await admin.end();
    }
    const target = new URL(url!);
    target.pathname = "/" + schema;
    pool = mysql.createPool(target.toString());
    connection = await pool.getConnection();
    await initializeAwinLedger(pool);
    await initializeAwinLedger(pool);
  });
  afterAll(async () => {
    connection?.release();
    await pool?.end();
    const admin = mysql.createPool(url!);
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${schema}`);
    } finally {
      await admin.end();
    }
  });
  it("separates outbound, pending, earned, network payout and reversal, including replay", async () => {
    const handoff = {
      clickRef,
      publisherId,
      advertiserId,
      channel: "web" as const,
    };
    await Promise.all([
      recordAwinHandoff(pool, handoff),
      recordAwinHandoff(pool, handoff),
    ]);
    await expect(
      recordAwinHandoff(pool, { ...handoff, channel: "ios" }),
    ).rejects.toThrow("different placement");
    const approved = { ...base, commissionStatus: "approved" };
    const paid = { ...approved, paidToPublisher: true, paymentId: 123 };
    const reversed = {
      ...base,
      commissionStatus: "declined",
      commissionAmount: { amount: 0, currency: "GBP" },
    };
    const run = (rows: unknown[]) =>
      applyAwinReport(connection, rows, publisherId, advertiserId);
    for (const row of [base, approved, paid, reversed]) {
      expect(await run([row, row])).toMatchObject({
        recorded: 1,
        unchanged: 1,
      });
    }
    expect(
      await run([{ ...base, id: 79, clickRefs: { clickRef: randomUUID() } }]),
    ).toMatchObject({ unmatched: 1 });
    expect(await run([{ ...base, id: 80, type: "Lead" }])).toMatchObject({
      otherTypes: 1,
    });
    await expect(run([{ ...paid, paymentId: 0 }])).rejects.toThrow(
      "payment ID",
    );
    await expect(run([{ ...base, publisherId: 900 }])).rejects.toThrow(
      "different publisher",
    );
    const [history] = await connection.query<RowDataPacket[]>(
      "SELECT status, commission, payment_id FROM travel_awin_observations WHERE transaction_id=? ORDER BY sequence_id",
      [base.id],
    );
    expect(
      history.map((r) => [r.status, Number(r.commission), r.payment_id]),
    ).toEqual([
      ["pending", 3.15, null],
      ["approved", 3.15, null],
      ["approved", 3.15, 123],
      ["declined", 0, null],
    ]);
  });
  it("matches later adjustments without a click reference only to an attributed transaction in the same account", async () => {
    const ref = randomUUID();
    await recordAwinHandoff(pool, {
      clickRef: ref,
      publisherId,
      advertiserId,
      channel: "android",
    });
    const sale = {
      ...base,
      id: 81,
      clickRefs: { clickRef: ref },
      commissionStatus: "approved",
    };
    const paid = {
      ...sale,
      clickRefs: null,
      paidToPublisher: true,
      paymentId: 789,
    };
    const cancelled = {
      ...sale,
      clickRefs: {},
      commissionStatus: "declined",
      commissionAmount: { amount: 0, currency: "GBP" },
    };
    const run = (rows: unknown[]) =>
      applyAwinReport(connection, rows, publisherId, advertiserId);

    // A previously unseen sale cannot bootstrap attribution from its partner ID alone.
    expect(await run([paid])).toMatchObject({ recorded: 0, unmatched: 1 });
    expect(await run([sale])).toMatchObject({ recorded: 1 });
    expect(await run([paid, paid])).toMatchObject({
      recorded: 1,
      unchanged: 1,
    });
    expect(
      await run([
        { ...cancelled, clickRefs: { clickRef: "unrecognized-reference" } },
      ]),
    ).toMatchObject({ recorded: 0, unmatched: 1 });
    expect(
      await applyAwinReport(
        connection,
        [{ ...cancelled, advertiserId: 91 }],
        publisherId,
        91,
      ),
    ).toMatchObject({ recorded: 0, unmatched: 1 });
    expect(
      await applyAwinReport(
        connection,
        [{ ...cancelled, publisherId: 92 }],
        92,
        advertiserId,
      ),
    ).toMatchObject({ recorded: 0, unmatched: 1 });
    expect(await run([cancelled, cancelled])).toMatchObject({
      recorded: 1,
      unchanged: 1,
    });
    const [history] = await connection.execute<RowDataPacket[]>(
      "SELECT click_ref, status, payment_id FROM travel_awin_observations WHERE transaction_id=? ORDER BY sequence_id",
      [sale.id],
    );
    expect(
      history.map((row) => [row.click_ref, row.status, row.payment_id]),
    ).toEqual([
      [ref, "approved", null],
      [ref, "approved", 789],
      [ref, "declined", null],
    ]);
  });
});
