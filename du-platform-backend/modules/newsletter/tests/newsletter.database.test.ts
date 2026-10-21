import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NewsletterService } from "../service";
import { initializeNewsletterDatabase } from "../schema";
import { processNewsletterBatch } from "../worker";
import type { NewsletterEmail } from "../provider";

const url = process.env.NEWSLETTER_TEST_DATABASE_URL;
// Never run destructive fixture cleanup against an application database.
if (url && !new URL(url).pathname.endsWith("_test"))
  throw new Error("Newsletter test database name must end in _test.");
describe.skipIf(!url)("newsletter MySQL integration", () => {
  let pool: Pool, service: NewsletterService;
  const query = async (sql: string, values: unknown[] = []) => {
    const [rows] = await pool.query<RowDataPacket[]>(sql, values);
    return rows;
  };
  const token = async (email: string) => {
    const [row] = await query(
      `SELECT payload FROM newsletter_deliveries WHERE recipient = ? AND kind = 'confirmation' ORDER BY id DESC LIMIT 1`,
      [email]
    );
    return JSON.parse(row.payload).text.match(/token=([a-f0-9]{48})/)[1];
  };
  const subscribe = async (email: string) => {
    await service.subscribe(email);
    await service.confirm(await token(email));
  };
  const campaign = async () => {
    const { id } = await service.saveDraft(
      {
        subject: "Zimbabwe news",
        body: "Real opportunities.\nRead more on the site.",
      },
      1
    );
    return id;
  };
  beforeAll(async () => {
    process.env.RESEND_API_KEY = "test-key-not-used";
    process.env.FROM_EMAIL = "news@example.com";
    pool = mysql.createPool(url!);
    service = new NewsletterService(pool);
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS newsletter_subscriptions (id BIGINT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) NOT NULL UNIQUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
    );
    await pool.execute(
      `INSERT IGNORE INTO newsletter_subscriptions (email) VALUES ('legacy@example.com')`
    );
    await initializeNewsletterDatabase(pool);
    await initializeNewsletterDatabase(pool);
    expect(
      (
        await query(
          `SELECT status FROM newsletter_subscriptions WHERE email='legacy@example.com'`
        )
      )[0].status
    ).toBe("subscribed");
  });
  beforeEach(async () => {
    await pool.execute("DELETE FROM newsletter_deliveries");
    await pool.execute("DELETE FROM newsletter_campaigns");
    await pool.execute("DELETE FROM newsletter_subscriptions");
  });
  afterAll(async () => {
    await pool?.end();
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
  });
  it("stores signups durably and deduplicates concurrent requests without alert emails", async () => {
    await Promise.all([
      service.subscribe("reader@example.com"),
      service.subscribe("reader@example.com"),
    ]);
    expect(await query("SELECT * FROM newsletter_subscriptions")).toHaveLength(
      1
    );
    const [row] = await query("SELECT * FROM newsletter_deliveries");
    expect(row.kind).toBe("confirmation");
    expect(
      (
        await service.subscribers({
          page: 1,
          search: "reader",
          status: "pending",
        })
      ).total
    ).toBe(1);
    const freshService = new NewsletterService(pool);
    expect(
      (await freshService.subscribers({ page: 1, search: "", status: "all" }))
        .total
    ).toBe(1);
  });
  it("accepts confirmation once and rejects expired tokens", async () => {
    await service.subscribe("reader@example.com");
    const link = await token("reader@example.com");
    await service.confirm(link);
    await expect(service.confirm(link)).rejects.toMatchObject({
      statusCode: 400,
    });
    await service.subscribe("expired@example.com");
    const expired = await token("expired@example.com");
    await pool.execute(
      `UPDATE newsletter_subscriptions SET confirmation_expires_at=DATE_SUB(NOW(),INTERVAL 1 HOUR) WHERE email='expired@example.com'`
    );
    await expect(service.confirm(expired)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("queues only subscribed recipients and freezes the campaign snapshot", async () => {
    await subscribe("active@example.com");
    await service.subscribe("pending@example.com");
    await subscribe("gone@example.com");
    const [gone] = await query(
      `SELECT unsubscribe_token FROM newsletter_subscriptions WHERE email='gone@example.com'`
    );
    await service.unsubscribe(gone.unsubscribe_token);
    const id = await campaign();
    await service.queueCampaign(id, 1);
    const rows = await query(
      `SELECT * FROM newsletter_deliveries WHERE kind='campaign'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].recipient).toBe("active@example.com");
    const payload = JSON.parse(rows[0].payload);
    expect(payload.to).toBe("active@example.com");
    expect(payload.html).toContain("Unsubscribe</a>");
    await expect(
      service.saveDraft(
        { subject: "Changed", body: "Changed", version: 1 },
        1,
        id
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("serializes double-click sends so recipients receive one job each", async () => {
    await subscribe("active@example.com");
    const id = await campaign();
    await Promise.all([
      service.queueCampaign(id, 1),
      service.queueCampaign(id, 1),
    ]);
    expect(
      await query(`SELECT * FROM newsletter_deliveries WHERE kind='campaign'`)
    ).toHaveLength(1);
  });
  it("rejects stale draft edits and stale send previews", async () => {
    await subscribe("active@example.com");
    const id = await campaign();
    await service.saveDraft(
      { subject: "Updated", body: "Updated", version: 1 },
      1,
      id
    );
    await expect(
      service.saveDraft({ subject: "Old", body: "Old", version: 1 }, 1, id)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.queueCampaign(id, 1)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
  it("never queues a campaign or pretends it sent when the provider is missing", async () => {
    await subscribe("active@example.com");
    const id = await campaign();
    delete process.env.RESEND_API_KEY;
    try {
      await expect(service.queueCampaign(id, 1)).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(
        await query(`SELECT * FROM newsletter_deliveries WHERE kind='campaign'`)
      ).toHaveLength(0);
    } finally {
      process.env.RESEND_API_KEY = "test-key-not-used";
    }
  });
  it("sends test jobs only to the requesting administrator", async () => {
    const id = await campaign();
    await service.testDraft(id, "admin@example.com", 1);
    const [job] = await query("SELECT * FROM newsletter_deliveries");
    expect(job.recipient).toBe("admin@example.com");
    expect(job.kind).toBe("test");
  });
  it("makes unsubscribe idempotent and suppresses queued campaigns", async () => {
    await subscribe("active@example.com");
    const id = await campaign();
    await service.queueCampaign(id, 1);
    const [row] = await query(
      `SELECT unsubscribe_token FROM newsletter_subscriptions WHERE email='active@example.com'`
    );
    await service.unsubscribe(row.unsubscribe_token);
    await service.unsubscribe(row.unsubscribe_token);
    expect(
      (await query(`SELECT status FROM newsletter_subscriptions`))[0].status
    ).toBe("unsubscribed");
    expect(
      (
        await query(
          `SELECT status FROM newsletter_deliveries WHERE kind='campaign'`
        )
      )[0].status
    ).toBe("skipped");
    await expect(
      service.queueCampaign(await campaign(), 1)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("recovers interrupted jobs with the same provider key and immutable payload", async () => {
    const id = await campaign();
    await service.testDraft(id, "admin@example.com", 1);
    const [row] = await query("SELECT * FROM newsletter_deliveries");
    await pool.execute(
      `UPDATE newsletter_deliveries SET status='processing',locked_at=DATE_SUB(NOW(),INTERVAL 6 MINUTE),first_attempt_at=NOW(),attempts=1 WHERE id=?`,
      [row.id]
    );
    const send = vi.fn(
      async (_email: NewsletterEmail, _key: string) => "accepted-id"
    );
    await processNewsletterBatch(pool, send, 1);
    expect(send).toHaveBeenCalledWith(
      JSON.parse(row.payload),
      `du-newsletter/${row.id}`
    );
    expect(
      (await query("SELECT status,provider_id FROM newsletter_deliveries"))[0]
    ).toMatchObject({ status: "sent", provider_id: "accepted-id" });
  });
  it("persists transient failure and safely retries using the same idempotency key", async () => {
    const id = await campaign();
    await service.testDraft(id, "admin@example.com", 1);
    const failed = vi.fn(async () => {
      throw { response: { status: 429 } };
    });
    await processNewsletterBatch(pool, failed, 1);
    expect(
      (await query("SELECT status,attempts FROM newsletter_deliveries"))[0]
    ).toMatchObject({ status: "pending", attempts: 1 });
    await pool.execute("UPDATE newsletter_deliveries SET available_at=NOW()");
    const success = vi.fn(async () => "accepted-id");
    await processNewsletterBatch(pool, success, 1);
    expect(failed.mock.calls[0]).toEqual(success.mock.calls[0]);
  });
  it("never retries uncertain messages after the provider deduplication window", async () => {
    const id = await campaign();
    await service.testDraft(id, "admin@example.com", 1);
    await pool.execute(
      `UPDATE newsletter_deliveries SET first_attempt_at=DATE_SUB(NOW(),INTERVAL 24 HOUR)`
    );
    const send = vi.fn(async () => "never");
    await processNewsletterBatch(pool, send, 1);
    expect(send).not.toHaveBeenCalled();
    const [row] = await query("SELECT * FROM newsletter_deliveries");
    expect(row.status).toBe("failed");
    expect(row.retry_safe).toBe(0);
    await expect(service.retryDelivery(row.id)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
  it("keeps concurrent workers from claiming the same delivery", async () => {
    const id = await campaign();
    await service.testDraft(id, "admin@example.com", 1);
    const send = vi.fn(async () => "accepted-id");
    await Promise.all([
      processNewsletterBatch(pool, send, 1),
      processNewsletterBatch(pool, send, 1),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("requires a fresh confirmation when someone rejoins after opting out", async () => {
    await subscribe("returning@example.com");
    const [row] = await query(
      "SELECT unsubscribe_token FROM newsletter_subscriptions"
    );
    await service.unsubscribe(row.unsubscribe_token);
    await service.subscribe("returning@example.com");
    expect(
      (await query("SELECT status FROM newsletter_subscriptions"))[0].status
    ).toBe("pending");
    await service.confirm(await token("returning@example.com"));
    expect(
      (await query("SELECT status FROM newsletter_subscriptions"))[0].status
    ).toBe("subscribed");
  });
  it("does not revive a job skipped by an opt-out between selection and claim", async () => {
    await subscribe("race@example.com");
    const id = await campaign();
    await service.queueCampaign(id, 1);
    await pool.execute(
      "UPDATE newsletter_deliveries SET status='skipped' WHERE kind='confirmation'"
    );
    const [subscriber] = await query(
      "SELECT unsubscribe_token FROM newsletter_subscriptions"
    );
    const connection = await pool.getConnection();
    let optedOut = false;
    const wrapped = new Proxy(connection, {
      get(target, property) {
        if (property === "query")
          return async (...args: any[]) => {
            const result = await (target.query as any)(...args);
            if (
              !optedOut &&
              String(args[0]).includes(
                "AS retry_expired FROM newsletter_deliveries"
              )
            ) {
              optedOut = true;
              await service.unsubscribe(subscriber.unsubscribe_token);
            }
            return result;
          };
        const value = (target as any)[property];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const send = vi.fn(async () => "never");
    await processNewsletterBatch(
      { getConnection: async () => wrapped } as unknown as Pool,
      send,
      1
    );
    expect(optedOut).toBe(true);
    expect(send).not.toHaveBeenCalled();
    expect(
      (
        await query(
          "SELECT status FROM newsletter_deliveries WHERE kind='campaign'"
        )
      )[0].status
    ).toBe("skipped");
  });
});
