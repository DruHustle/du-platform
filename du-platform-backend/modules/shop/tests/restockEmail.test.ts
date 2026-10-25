import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SHOP_READINESS_CHECKS } from "../../../../shared/shopReadiness";
let pool: Pool | null = null;
vi.mock("../../../shared/databaseRuntime", () => ({
  get db() {
    return pool;
  },
  isDbConnectionError: () => false,
  isTransientShopQueryError: () => false,
  isMemoryFallbackEnabled: () => false,
}));
vi.mock("../../../shared/email", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../shared/email")>()),
  getNotifyFromEmail: async () => "fixture@example.test",
  getNotifyAlertEmails: async () => [],
  isValidEmail: () => true,
}));
import { initializeNewsletterDatabase } from "../../newsletter/schema";
import { initializeProductInterest } from "../interestSchema";
import { ProductInterestService } from "../interestService";
import { processNewsletterBatch } from "../../newsletter/worker";
import { ShopService } from "../services/shopService";
const databaseName = `du_product_interest_${process.pid}_test`;
const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!new URL(url).pathname.endsWith("_test") ||
    !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
)
  throw new Error("Disposable localhost test database required.");
describe.skipIf(!url)(
  "confirmed product interest / existing durable queue",
  () => {
    let service: ProductInterestService, dir: string, productId: number;
    const query = async (sql: string, values: unknown[] = []) =>
      (await pool!.query<RowDataPacket[]>(sql, values))[0];
    const jobs = () => query("SELECT * FROM newsletter_deliveries ORDER BY id");
    const register = (email = "reader@example.test", language = "en") =>
      service.register({
        email,
        language,
        productSlug: "interest-fixture",
        productId,
      });
    const confirmToken = async () =>
      JSON.parse((await jobs())[0].payload).text.match(
        /action=confirm&token=([a-f0-9]{48})/
      )[1];
    const confirmed = async () => {
      await register();
      await service.confirm(await confirmToken());
    };
    const pilot = async () => {
      process.env.SHOP_COMMERCIAL_MODE = "pilot";
      process.env.SHOP_PILOT_APPROVAL_FILE = path.join(dir, "approval.json");
    };
    beforeAll(async () => {
      const config = new URL(url!);
      config.pathname = "/" + databaseName;
      const admin = mysql.createPool(url!);
      await admin.execute(`CREATE DATABASE ${databaseName}`);
      await admin.end();
      pool = mysql.createPool(config.toString());
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS shop_products(id INT AUTO_INCREMENT PRIMARY KEY,slug VARCHAR(255) UNIQUE,name VARCHAR(255),category VARCHAR(40),description TEXT,image_url VARCHAR(500),price_cents INT,currency VARCHAR(3),stock_qty INT,is_active TINYINT)`
      );
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS shop_restock_notifications(id INT AUTO_INCREMENT PRIMARY KEY,product_id INT NULL,product_slug VARCHAR(255),product_name VARCHAR(255),email VARCHAR(255),language VARCHAR(2) DEFAULT 'en',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uniq_shop_restock_slug_email(product_slug,email))`
      );
      await pool.execute(
        `INSERT INTO shop_restock_notifications(product_slug,product_name,email) VALUES ('old-product','Legacy fixture','legacy-migration@example.test')`
      );
      await initializeNewsletterDatabase(pool);
      await initializeProductInterest(pool);
      expect(
        (
          await query(
            "SELECT status FROM shop_restock_notifications WHERE email='legacy-migration@example.test'"
          )
        )[0].status
      ).toBe("legacy");
      expect(await jobs()).toHaveLength(0);

      const [p]: any = await pool.execute(
        `INSERT INTO shop_products(slug,name,category,description,image_url,price_cents,currency,stock_qty,is_active) VALUES ('interest-fixture','Fixture <product>','crafts','Synthetic only','/fixture.webp',1000,'EUR',0,1)`
      );
      productId = p.insertId;
      dir = await mkdtemp(path.join(tmpdir(), "du-interest-"));
      await writeFile(
        path.join(dir, "approval.json"),
        JSON.stringify({
          version: 1,
          market: "Europe",
          currency: "EUR",
          reviewedAt: new Date(Date.now() - 60000).toISOString(),
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          approvedBy: "fixture@example.test",
          destinationCountries: [{ code: "DE", names: ["Germany"] }],
          approvedProductIds: [productId],
          checks: Object.fromEntries(
            SHOP_READINESS_CHECKS.map(k => [
              k,
              { approved: true, evidence: "Synthetic fixture only" },
            ])
          ),
        })
      );
      service = new ProductInterestService(pool);
    });
    beforeEach(async () => {
      vi.stubEnv("SHOP_COMMERCIAL_MODE", "prelaunch");
      vi.stubEnv("SHOP_PILOT_APPROVAL_FILE", "");
      await pool!.execute("DELETE FROM newsletter_deliveries");
      await pool!.execute("DELETE FROM shop_restock_notifications");
      await pool!.execute(
        "UPDATE shop_products SET stock_qty=0,is_active=1 WHERE id=?",
        [productId]
      );
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      if (pool) {
        await pool.query(`DROP DATABASE ${databaseName}`);
        await pool.end();
      }
      if (dir) await rm(dir, { recursive: true, force: true });
    });
    it("keeps legacy records dormant through repeated migration", async () => {
      await pool!.execute(
        "INSERT INTO shop_restock_notifications(product_id,product_slug,product_name,email) VALUES (?,'interest-fixture','Fixture','legacy@example.test')",
        [productId]
      );
      await initializeProductInterest(pool!);
      await initializeProductInterest(pool!);
      expect(
        (await query("SELECT status FROM shop_restock_notifications"))[0].status
      ).toBe("legacy");
      await pilot();
      await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
        productId,
      ]);
      await service.queueAvailable();
      expect(await jobs()).toHaveLength(0);
    });
    it("deduplicates concurrent registration and returns neutral responses without a newsletter subscription", async () => {
      const results = await Promise.all([register(), register()]);
      expect(results[0]).toEqual(results[1]);
      expect(await jobs()).toHaveLength(1);
      expect(
        await query("SELECT * FROM shop_restock_notifications")
      ).toHaveLength(1);
      expect(
        await query("SELECT * FROM newsletter_subscriptions")
      ).toHaveLength(0);
      expect(JSON.parse((await jobs())[0].payload).html).not.toContain(
        "<product>"
      );
    });
    it("confirms once, expires links and scopes cancellation to one product", async () => {
      await register();
      const token = await confirmToken();
      await service.confirm(token);
      await expect(service.confirm(token)).rejects.toMatchObject({
        statusCode: 400,
      });
      const [row] = await query("SELECT * FROM shop_restock_notifications");
      await service.cancel(row.cancel_token);
      await service.cancel(row.cancel_token);
      expect(
        (await query("SELECT status FROM shop_restock_notifications"))[0].status
      ).toBe("cancelled");
      expect((await jobs())[0].status).toBe("skipped");
    });
    it("does not send an expired confirmation and rejects unpublished registration", async () => {
      await register();
      const token = await confirmToken();
      await pool!.execute(
        "UPDATE shop_restock_notifications SET confirmation_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)"
      );
      await expect(service.confirm(token)).rejects.toMatchObject({
        statusCode: 400,
      });
      const send = vi.fn();
      await processNewsletterBatch(pool!, send, 1);
      expect(send).not.toHaveBeenCalled();
      await pool!.execute("UPDATE shop_products SET is_active=0 WHERE id=?", [
        productId,
      ]);
      await expect(register("other@example.test")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
    it("persists provider failure and retries using the same idempotency key after restart", async () => {
      await register();
      const send = vi
        .fn()
        .mockRejectedValueOnce(new Error("provider outage"))
        .mockResolvedValue("accepted-fixture");
      await processNewsletterBatch(pool!, send, 1);
      expect((await jobs())[0]).toMatchObject({
        status: "pending",
        attempts: 1,
      });
      await pool!.execute(
        "UPDATE newsletter_deliveries SET available_at=NOW()"
      );
      await processNewsletterBatch(pool!, send, 1);
      expect(send.mock.calls[0][1]).toBe(send.mock.calls[1][1]);
      expect((await jobs())[0]).toMatchObject({ status: "sent", attempts: 2 });
    });
    it("requires commercial eligibility, rechecks withdrawal, then sends once despite repeated edits and sweeps", async () => {
      await confirmed();
      await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
        productId,
      ]);
      await service.queueAvailable();
      expect(await jobs()).toHaveLength(1);
      await pilot();
      await service.queueAvailable();
      expect(await jobs()).toHaveLength(2);
      await pool!.execute("UPDATE shop_products SET is_active=0 WHERE id=?", [
        productId,
      ]);
      const send = vi.fn().mockResolvedValue("accepted");
      await processNewsletterBatch(pool!, send, 2);
      expect(send).not.toHaveBeenCalled();
      expect((await jobs())[1]).toMatchObject({
        status: "pending",
        attempts: 0,
        first_attempt_at: null,
      });
      await pool!.execute("UPDATE shop_products SET is_active=1 WHERE id=?", [
        productId,
      ]);
      await pool!.execute(
        "UPDATE newsletter_deliveries SET available_at=NOW()"
      );
      await processNewsletterBatch(pool!, send, 2);
      expect(send).toHaveBeenCalledTimes(1);
      await new ProductInterestService(pool).queueAvailable();
      await pool!.execute("UPDATE shop_products SET stock_qty=4 WHERE id=?", [
        productId,
      ]);
      await service.queueAvailable();
      await processNewsletterBatch(pool!, send, 2);
      expect(send).toHaveBeenCalledTimes(1);
      expect(
        (await query("SELECT status FROM shop_restock_notifications"))[0].status
      ).toBe("notified");
      const demand = await service.demand("2020-01-01", "2099-01-01");
      expect(Number(demand.rows[0].confirmed_unique)).toBe(1);
      expect(demand.rows[0].email).toBeUndefined();
    });
    it("cancels a queued availability message and rejects prelaunch order requests", async () => {
      await confirmed();
      await pilot();
      await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
        productId,
      ]);
      await service.queueAvailable();
      const [row] = await query(
        "SELECT cancel_token FROM shop_restock_notifications"
      );
      await service.cancel(row.cancel_token);
      const send = vi.fn();
      await processNewsletterBatch(pool!, send, 3);
      expect(send).not.toHaveBeenCalled();
      process.env.SHOP_COMMERCIAL_MODE = "prelaunch";
      await expect(
        new ShopService().createOrder({
          customerName: "Fixture",
          customerEmail: "fixture@example.test",
          shippingCountry: "Germany",
          shippingCity: "Test",
          shippingAddress: "Test only",
          paymentMethod: "manual_assisted",
          items: [{ productId, quantity: 1 }],
        })
      ).rejects.toMatchObject({ status: 409 });
    });
    it("holds an existing alert when launch approval is revoked, stock disappears or the product is outside scope", async () => {
      await confirmed();
      await pilot();
      await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
        productId,
      ]);
      await service.queueAvailable();
      const send = vi.fn().mockResolvedValue("accepted");
      process.env.SHOP_COMMERCIAL_MODE = "prelaunch";
      await processNewsletterBatch(pool!, send, 3);
      expect(send).not.toHaveBeenCalled();
      await pilot();
      await pool!.execute("UPDATE shop_products SET stock_qty=0 WHERE id=?", [
        productId,
      ]);
      await pool!.execute(
        "UPDATE newsletter_deliveries SET available_at=NOW()"
      );
      await processNewsletterBatch(pool!, send, 3);
      expect(send).not.toHaveBeenCalled();
      await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
        productId,
      ]);
      const file = path.join(dir, "other.json");
      const approval = JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(path.join(dir, "approval.json"), "utf8")
      );
      approval.approvedProductIds = [productId + 1];
      await writeFile(file, JSON.stringify(approval));
      process.env.SHOP_PILOT_APPROVAL_FILE = file;
      await pool!.execute(
        "UPDATE newsletter_deliveries SET available_at=NOW()"
      );
      await processNewsletterBatch(pool!, send, 3);
      expect(send).not.toHaveBeenCalled();
    });
    it.each(["en", "de", "sn", "nd"])(
      "uses %s confirmation and cancellation copy",
      async language => {
        await register("reader@example.test", language);
        const payload = JSON.parse((await jobs())[0].payload);
        expect(payload.text).toContain("action=confirm&token=");
        expect(payload.text).toContain("action=cancel&token=");
        expect(payload.html).toContain(`lang="${language}"`);
      }
    );
  }
);
