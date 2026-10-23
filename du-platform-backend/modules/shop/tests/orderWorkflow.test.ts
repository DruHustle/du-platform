import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import mysql, { type Pool } from "mysql2/promise";
import crypto from "node:crypto";
const url = process.env.SHOP_TEST_DATABASE_URL;
let pool: Pool | null = null;
vi.mock("../../../shared/databaseRuntime", () => ({
  get db() {
    return pool;
  },
  isDbConnectionError: () => false,
  isTransientShopQueryError: () => false,
  isMemoryFallbackEnabled: () => true,
}));
vi.mock("../../../shared/email", () => ({
  getNotifyFromEmail: async () => "shop@example.test",
  getNotifyAlertEmails: async () => ["operator@example.test"],
  isValidEmail: () => true,
}));
import { initializeShopPilot } from "../pilotSchema";
import {
  createShopOrder,
  listShopProducts,
  updateShopProductAdmin,
} from "../../../shared/persistence/shopStore";
import { applyOrderCommand, readOrderWorkspace } from "../orderWorkflowStore";
import { processOrderNotifications } from "../orderNotifications";
const test = describe.skipIf(!url);
let productId: number;
const refs: string[] = [];
const payload = () => ({
  language: "de",
  postalCode: "10115",
  customerNotes: "Fixture requested sealed pack; confirm before quoting",
  customerName: "Pilot Fixture",
  customerEmail: "fixture@example.test",
  shippingCountry: "Germany",
  shippingCity: "Berlin",
  shippingAddress: "Isolated test address",
  paymentMethod: "manual_assisted" as const,
  requestToken: crypto.randomBytes(32).toString("hex"),
  items: [{ productId, quantity: 1 }],
});
const command = (version: number, action: string, extra: any = {}) => ({
  requestId: crypto.randomUUID(),
  version,
  action,
  ...extra,
});
async function request() {
  const p = payload();
  const order = await createShopOrder(p);
  refs.push(order.orderRef);
  return { order, p };
}
async function quote(ref: string) {
  await applyOrderCommand(
    ref,
    command(0, "under_review"),
    "admin@example.test"
  );
  await applyOrderCommand(
    ref,
    command(1, "quote_sent", {
      quote: {
        currency: "EUR",
        unitPrices: [1234],
        fulfilmentDetails: ["Fixture sealed pack; customer confirmed"],
        shippingCents: 600,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
    }),
    "admin@example.test"
  );
}
async function paidRequest() {
  await pool!.execute("UPDATE shop_products SET stock_qty=30 WHERE id=?", [
    productId,
  ]);
  const result = await request();
  await quote(result.order.orderRef);
  await applyOrderCommand(
    result.order.orderRef,
    command(2, "quote_accepted"),
    "customer",
    result.order.manageToken
  );
  await applyOrderCommand(
    result.order.orderRef,
    command(3, "payment_confirmed", { paymentReference: "FIXTURE-PAID" }),
    "admin@example.test"
  );
  return result;
}
test("assisted-order transactional workflow", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
      !parsed.pathname.endsWith("_test")
    )
      throw new Error("Disposable localhost *_test database required");
    pool = mysql.createPool({ uri: url!, timezone: "Z" });
    // Own base tables support running this regression independently; never run against live data.
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS shop_products (id INT PRIMARY KEY AUTO_INCREMENT,slug VARCHAR(160) UNIQUE,name VARCHAR(255),category VARCHAR(60),description TEXT,image_url VARCHAR(500),price_cents INT,currency VARCHAR(10),stock_qty INT,is_active TINYINT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`
    );
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS shop_orders (id INT PRIMARY KEY AUTO_INCREMENT,order_ref VARCHAR(64) UNIQUE,customer_name VARCHAR(255),customer_email VARCHAR(255),shipping_country VARCHAR(120),shipping_city VARCHAR(120),shipping_address VARCHAR(500),delivery_speed VARCHAR(20),payment_method VARCHAR(40),manage_token_hash CHAR(64),payment_reference VARCHAR(255),status VARCHAR(30),currency VARCHAR(10),subtotal_cents INT,shipping_cents INT,total_cents INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`
    );
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS shop_order_items (id INT PRIMARY KEY AUTO_INCREMENT,order_id INT,product_id INT,product_name VARCHAR(255),unit_price_cents INT,quantity INT,line_total_cents INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
    );
    await initializeShopPilot(pool);
    await initializeShopPilot(pool);
    const [r] = await pool.execute<any>(
      "INSERT INTO shop_products (slug,name,category,description,image_url,price_cents,currency,stock_qty,is_active) VALUES (?, 'Fixture Mazoe','food','Owner description','/fixture.jpg',999,'EUR',10,1)",
      [crypto.randomUUID()]
    );
    productId = r.insertId;
  });
  afterAll(async () => {
    if (!pool) return;
    for (const ref of refs) {
      const [o] = await pool.query<any[]>(
        "SELECT id FROM shop_orders WHERE order_ref=?",
        [ref]
      );
      if (o[0]) {
        await pool.execute("DELETE FROM shop_order_items WHERE order_id=?", [
          o[0].id,
        ]);
        await pool.execute("DELETE FROM shop_orders WHERE id=?", [o[0].id]);
      }
    }
    await pool.execute("DELETE FROM shop_products WHERE id=?", [productId]);
    await pool.end();
    pool = null;
  });
  it("persists one enquiry and notification, preserves description, and does not reserve stock", async () => {
    const { order, p } = await request();
    expect(((await createShopOrder(p)) as any).replayed).toBe(true);
    const detail = (await readOrderWorkspace(order.orderRef)) as any;
    expect(detail.notifications).toHaveLength(2);
    expect(detail.snapshots[0].description).toBe("Owner description");
    expect(detail.state.postal_code).toBe("10115");
    const [rows] = await pool!.query<any[]>(
      "SELECT stock_qty FROM shop_products WHERE id=?",
      [productId]
    );
    expect(rows[0].stock_qty).toBe(10);
  });
  it("runs enquiry to delivered with immutable quote history and private customer status", async () => {
    const { order } = await request();
    await quote(order.orderRef);
    const detail = (await readOrderWorkspace(
      order.orderRef,
      order.manageToken
    )) as any;
    expect(detail.stage).toBe("quote_sent");
    expect(detail.order).toBeUndefined();
    expect(detail.quotes[0].total_cents).toBe(1834);
    await expect(
      readOrderWorkspace(order.orderRef, "invalid")
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(2, "payment_confirmed", { paymentReference: "FAKE" }),
        "customer",
        order.manageToken
      )
    ).rejects.toMatchObject({ status: 403 });
    await applyOrderCommand(
      order.orderRef,
      command(2, "quote_accepted"),
      "customer",
      order.manageToken
    );
    const paid = command(3, "payment_confirmed", {
      paymentReference: "FIXTURE-RECEIVED",
    });
    await applyOrderCommand(order.orderRef, paid, "admin@example.test");
    await applyOrderCommand(order.orderRef, paid, "admin@example.test");
    await expect(
      applyOrderCommand(
        order.orderRef,
        { ...paid, paymentReference: "different" },
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(3, "payment_confirmed", { paymentReference: "again" }),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await applyOrderCommand(
      order.orderRef,
      command(4, "dispatched", { carrier: "DHL", tracking: "FIXTURE" }),
      "admin@example.test"
    );
    await applyOrderCommand(
      order.orderRef,
      command(5, "delivered"),
      "admin@example.test"
    );
    const final = (await readOrderWorkspace(
      order.orderRef,
      order.manageToken
    )) as any;
    expect(final.stage).toBe("delivered");
    expect(final.tracking).toBe("FIXTURE");
    const workspace = (await readOrderWorkspace(order.orderRef)) as any;
    expect(workspace.history).toHaveLength(6);
    expect(workspace.quotes).toHaveLength(1);
    expect(workspace.order.total_cents).not.toBe(1834);
  });
  it("rejects expired quotes, skips invalid transitions, and requires cancellation reasons", async () => {
    const { order } = await request();
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(0, "dispatched"),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await quote(order.orderRef);
    await pool!.execute(
      "UPDATE shop_quotes SET valid_until=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE order_id=(SELECT id FROM shop_orders WHERE order_ref=?)",
      [order.orderRef]
    );
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(2, "quote_accepted"),
        "customer",
        order.manageToken
      )
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(2, "cancelled"),
        "admin@example.test"
      )
    ).rejects.toThrow("reason");
  });
  it("arbitrates concurrent confirmations and restocks cancelled goods only once", async () => {
    await pool!.execute("UPDATE shop_products SET stock_qty=1 WHERE id=?", [
      productId,
    ]);
    const a = await request(),
      b = await request();
    for (const x of [a, b]) {
      await quote(x.order.orderRef);
      await applyOrderCommand(
        x.order.orderRef,
        command(2, "quote_accepted"),
        "customer",
        x.order.manageToken
      );
    }
    const outcomes = await Promise.allSettled(
      [a, b].map(x =>
        applyOrderCommand(
          x.order.orderRef,
          command(3, "payment_confirmed", { paymentReference: "RECEIVED" }),
          "admin@example.test"
        )
      )
    );
    expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const winner = outcomes[0].status === "fulfilled" ? a : b;
    const cancellation = command(4, "cancelled", {
      note: "Goods available for restock",
      restock: true,
    });
    await applyOrderCommand(
      winner.order.orderRef,
      cancellation,
      "admin@example.test"
    );
    await applyOrderCommand(
      winner.order.orderRef,
      cancellation,
      "admin@example.test"
    );
    await applyOrderCommand(
      winner.order.orderRef,
      command(5, "refund", {
        refundCents: 1834,
        refundReference: "REFUND-FIXTURE",
      }),
      "admin@example.test"
    );
    const [rows] = await pool!.query<any[]>(
      "SELECT stock_qty FROM shop_products WHERE id=?",
      [productId]
    );
    expect(rows[0].stock_qty).toBe(1);
  });
  it("retries a transient provider failure with the same provider key and preserves language", async () => {
    await pool!.execute("UPDATE shop_order_notifications SET status='sent'");
    const { order } = await request();
    const send = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValue("provider-fixture");
    await processOrderNotifications(pool!, send, 1);
    let detail = (await readOrderWorkspace(order.orderRef)) as any;
    expect(detail.notifications[0].status).toBe("pending");
    await pool!.execute(
      "UPDATE shop_order_notifications SET available_at=NOW() WHERE id=?",
      [detail.notifications[0].id]
    );
    await pool!.execute(
      "UPDATE shop_orders SET customer_email='changed@example.test',total_cents=1 WHERE order_ref=?",
      [order.orderRef]
    );
    await processOrderNotifications(pool!, send, 1);
    detail = (await readOrderWorkspace(order.orderRef)) as any;
    expect(detail.notifications[0].status).toBe("sent");
    expect(send.mock.calls[0][1]).toBe(send.mock.calls[1][1]);
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
    expect(send.mock.calls[1][0].subject).toContain("Bestellanfrage");
    expect(send.mock.calls[1][0].to).toBe("fixture@example.test");
  });
  it("rolls back the enquiry if durable notification intent cannot be persisted", async () => {
    const p = payload();
    const ref = `DU-${crypto.createHash("sha256").update(p.requestToken).digest("hex").slice(0, 32).toUpperCase()}`;
    await pool!.query(
      "CREATE TRIGGER du_pilot_outbox_failure BEFORE INSERT ON shop_order_notifications FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture outbox failure'"
    );
    try {
      await expect(createShopOrder(p)).rejects.toThrow(
        "fixture outbox failure"
      );
      const [rows] = await pool!.query<any[]>(
        "SELECT id FROM shop_orders WHERE order_ref=?",
        [ref]
      );
      expect(rows).toHaveLength(0);
    } finally {
      await pool!.query("DROP TRIGGER du_pilot_outbox_failure");
    }
  });
  it("stops uncertain retries before the provider retention window expires", async () => {
    await pool!.execute("UPDATE shop_order_notifications SET status='sent'");
    const { order } = await request();
    const detail = (await readOrderWorkspace(order.orderRef)) as any;
    await pool!.execute(
      "UPDATE shop_order_notifications SET first_attempt_at=DATE_SUB(NOW(),INTERVAL 24 HOUR) WHERE id=?",
      [detail.notifications[0].id]
    );
    const send = vi.fn();
    await processOrderNotifications(pool!, send, 1);
    expect(send).not.toHaveBeenCalled();
    expect(
      ((await readOrderWorkspace(order.orderRef)) as any).notifications[0]
        .status
    ).toBe("failed");
  });
  it("counts only successful consented outcomes and deduplicates order retries", async () => {
    const before = async (event: string) => {
      const [rows] = await pool!.query<any[]>(
        "SELECT COALESCE(SUM(count),0) AS total FROM shop_funnel_daily WHERE event=?",
        [event]
      );
      return Number(rows[0].total);
    };
    await pool!.execute("UPDATE shop_products SET stock_qty=3 WHERE id=?", [
      productId,
    ]);
    const initial = await before("request_saved");
    const p = { ...payload(), analyticsConsent: true };
    const order = await createShopOrder(p);
    refs.push(order.orderRef);
    await createShopOrder(p);
    expect(await before("request_saved")).toBe(initial + 1);
    const qBefore = await before("quote_sent");
    await quote(order.orderRef);
    expect(await before("quote_sent")).toBe(qBefore + 1);
    await pool!.execute(
      "UPDATE shop_order_workflows SET analytics_consent=FALSE WHERE order_id=(SELECT id FROM shop_orders WHERE order_ref=?)",
      [order.orderRef]
    );
    await applyOrderCommand(
      order.orderRef,
      command(2, "quote_accepted"),
      "customer",
      order.manageToken
    );
    await applyOrderCommand(
      order.orderRef,
      command(3, "payment_confirmed", { paymentReference: "fixture-paid" }),
      "admin@example.test"
    );
    await applyOrderCommand(
      order.orderRef,
      command(4, "dispatched", { carrier: "DHL", tracking: "fixture" }),
      "admin@example.test"
    );
    const fulfilled = await before("fulfilled");
    await applyOrderCommand(
      order.orderRef,
      command(5, "delivered"),
      "admin@example.test"
    );
    expect(await before("fulfilled")).toBe(fulfilled);
  });
  it("bounds crash recovery attempts and keeps sealed payloads out of plaintext storage", async () => {
    await pool!.execute("UPDATE shop_order_notifications SET status='sent'");
    const { order } = await request();
    const detail = (await readOrderWorkspace(order.orderRef)) as any;
    await pool!.execute(
      "UPDATE shop_order_notifications SET status='processing',attempts=5,locked_at=DATE_SUB(NOW(),INTERVAL 6 MINUTE),first_attempt_at=NOW() WHERE id=?",
      [detail.notifications[0].id]
    );
    const send = vi.fn();
    await processOrderNotifications(pool!, send, 1);
    expect(send).not.toHaveBeenCalled();
    expect(
      ((await readOrderWorkspace(order.orderRef)) as any).notifications[0]
        .status
    ).toBe("failed");
  });

  it("records an actual received payment when stock changed, without overselling, and supports its refund", async () => {
    await pool!.execute("UPDATE shop_products SET stock_qty=1 WHERE id=?", [
      productId,
    ]);
    const { order } = await request();
    await quote(order.orderRef);
    await applyOrderCommand(
      order.orderRef,
      command(2, "quote_accepted"),
      "customer",
      order.manageToken
    );
    await pool!.execute("UPDATE shop_products SET stock_qty=0 WHERE id=?", [
      productId,
    ]);
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(3, "payment_confirmed", {
          paymentReference: "ACTUAL-RECEIVED",
        }),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await applyOrderCommand(
      order.orderRef,
      command(3, "payment_issue", {
        paymentReference: "ACTUAL-RECEIVED",
        note: "Payment arrived after available stock changed",
      }),
      "admin@example.test"
    );
    const status = (await readOrderWorkspace(
      order.orderRef,
      order.manageToken
    )) as any;
    expect(status.paymentReviewRequired).toBe(true);
    expect(status.stage).toBe("quote_accepted");
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(4, "under_review"),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    expect(
      ((await readOrderWorkspace(order.orderRef)) as any).quotes
    ).toHaveLength(1);
    await applyOrderCommand(
      order.orderRef,
      command(4, "refund", {
        refundCents: 1834,
        refundReference: "ACTUAL-REFUND",
      }),
      "admin@example.test"
    );
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(5, "payment_confirmed", {
          paymentReference: "ACTUAL-RECEIVED",
        }),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await applyOrderCommand(
      order.orderRef,
      command(5, "cancelled", {
        note: "Unavailable item, full refund recorded",
        restock: false,
      }),
      "admin@example.test"
    );
    const [rows] = await pool!.query<any[]>(
      "SELECT stock_qty FROM shop_products WHERE id=?",
      [productId]
    );
    expect(rows[0].stock_qty).toBe(0);
  });

  it("preserves an owner-selected beverage category while including it in food filters", async () => {
    await updateShopProductAdmin(productId, { category: "beverage" });
    const result = await listShopProducts("food");
    expect(result.products.find(p => p.id === productId)?.category).toBe(
      "beverage"
    );
  });
  it("holds customer mail during an Oracle-first rollout without consuming provider retry attempts", async () => {
    await pool!.execute("UPDATE shop_order_notifications SET status='sent'");
    await pool!.execute("UPDATE shop_products SET stock_qty=2 WHERE id=?", [
      productId,
    ]);
    const { order } = await request();
    const send = vi.fn().mockResolvedValue("fixture-provider");
    await processOrderNotifications(pool!, send, 1, async () => false);
    let detail = (await readOrderWorkspace(order.orderRef)) as any;
    expect(send).not.toHaveBeenCalled();
    expect(detail.notifications[0].status).toBe("pending");
    expect(detail.notifications[0].attempts).toBe(0);
    expect(detail.notifications[0].first_attempt_at).toBeNull();
    await pool!.execute(
      "UPDATE shop_order_notifications SET available_at=NOW() WHERE id=?",
      [detail.notifications[0].id]
    );
    await processOrderNotifications(pool!, send, 1, async () => true);
    detail = (await readOrderWorkspace(order.orderRef)) as any;
    expect(detail.notifications[0].status).toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("keeps two partial refunds immutable, replays safely, redacts private reconciliation data and rejects over-refunds", async () => {
    const { order } = await paidRequest();
    const first = command(4, "refund", {
      refundCents: 400,
      refundReference: "PARTIAL-ONE",
      refundProvider: "Bank",
    });
    await applyOrderCommand(order.orderRef, first, "admin@example.test");
    await applyOrderCommand(order.orderRef, first, "admin@example.test");
    await applyOrderCommand(
      order.orderRef,
      command(5, "refund", {
        refundCents: 500,
        refundReference: "PARTIAL-TWO",
        refundProvider: "Bank",
      }),
      "admin@example.test"
    );
    const workspace: any = await readOrderWorkspace(order.orderRef);
    expect(
      workspace.refunds.map((r: any) => [
        r.amount_cents,
        r.currency,
        r.external_reference,
        r.reference_provider,
        r.actor,
      ])
    ).toEqual([
      [400, "EUR", "PARTIAL-ONE", "bank", "admin@example.test"],
      [500, "EUR", "PARTIAL-TWO", "bank", "admin@example.test"],
    ]);
    expect(workspace.refunds[0].command_id).toBe(first.requestId);
    expect(workspace.refunds[0].created_at).toBeInstanceOf(Date);
    expect(workspace.state.refundCents).toBe(900);
    expect(workspace.state.remainingPaidCents).toBe(934);
    expect(workspace.state.unreconciledRefundCents).toBe(0);
    expect(
      workspace.history.filter((e: any) => e.action === "refund")
    ).toHaveLength(2);
    expect(
      workspace.notifications.filter((n: any) =>
        n.event_key.endsWith(":refund")
      )
    ).toHaveLength(2);
    const customer: any = await readOrderWorkspace(
      order.orderRef,
      order.manageToken
    );
    expect(customer.refunds.map((r: any) => r.amountCents)).toEqual([400, 500]);
    expect(JSON.stringify(customer)).not.toMatch(
      /PARTIAL-ONE|PARTIAL-TWO|admin@example/
    );
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(6, "refund", { refundCents: 1000, refundReference: "OVER" }),
        "admin@example.test"
      )
    ).rejects.toThrow("within the paid quote total");
    expect(
      ((await readOrderWorkspace(order.orderRef)) as any).refunds
    ).toHaveLength(2);
  });
  it("scopes duplicate external references to the order and payment channel, not globally", async () => {
    const { order } = await paidRequest();
    await applyOrderCommand(
      order.orderRef,
      command(4, "refund", {
        refundCents: 100,
        refundReference: "SHARED-EXTERNAL",
        refundProvider: "bank",
      }),
      "admin@example.test"
    );
    await applyOrderCommand(
      order.orderRef,
      command(5, "refund", {
        refundCents: 100,
        refundReference: "SHARED-EXTERNAL",
        refundProvider: "cash",
      }),
      "admin@example.test"
    );
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(6, "refund", {
          refundCents: 100,
          refundReference: "SHARED-EXTERNAL",
          refundProvider: " BANK ",
        }),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    const other = await paidRequest();
    await applyOrderCommand(
      other.order.orderRef,
      command(4, "refund", {
        refundCents: 100,
        refundReference: "SHARED-EXTERNAL",
        refundProvider: "bank",
      }),
      "admin@example.test"
    );
    expect(
      ((await readOrderWorkspace(order.orderRef)) as any).state.refundCents
    ).toBe(200);
  });
  it("serializes concurrent refunds, preserves stock, and keeps the total within the paid amount", async () => {
    const { order } = await paidRequest();
    const commands = ["A", "B"].map(reference =>
      command(4, "refund", { refundCents: 1100, refundReference: reference })
    );
    const result = await Promise.allSettled(
      commands.map(cmd =>
        applyOrderCommand(order.orderRef, cmd, "admin@example.test")
      )
    );
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (result.find(r => r.status === "rejected") as PromiseRejectedResult)
        .reason.status
    ).toBe(409);
    const won = result[0].status === "fulfilled" ? commands[0] : commands[1];
    await applyOrderCommand(order.orderRef, won, "admin@example.test");
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(5, "refund", { refundCents: 1100, refundReference: "NEXT" }),
        "admin@example.test"
      )
    ).rejects.toThrow("within the paid quote total");
    const workspace: any = await readOrderWorkspace(order.orderRef);
    expect(workspace.refunds).toHaveLength(1);
    expect(workspace.state.refundCents).toBe(1100);
    const [[product]] = await pool!.query<any[]>(
      "SELECT stock_qty FROM shop_products WHERE id=?",
      [productId]
    );
    expect(product.stock_qty).toBe(29);
  });
  it("rolls back ledger, balance and event when refund notification intent fails", async () => {
    const { order } = await paidRequest();
    const before: any = await readOrderWorkspace(order.orderRef);
    await pool!.query(
      "CREATE TRIGGER du_refund_outbox_failure BEFORE INSERT ON shop_order_notifications FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='refund outbox fixture failure'"
    );
    try {
      await expect(
        applyOrderCommand(
          order.orderRef,
          command(4, "refund", {
            refundCents: 100,
            refundReference: "ROLLED-BACK",
          }),
          "admin@example.test"
        )
      ).rejects.toThrow("refund outbox fixture failure");
    } finally {
      await pool!.query("DROP TRIGGER du_refund_outbox_failure");
    }
    const after: any = await readOrderWorkspace(order.orderRef);
    expect(after.refunds).toHaveLength(0);
    expect(after.state.refundCents).toBe(0);
    expect(after.state.version).toBe(4);
    expect(after.history).toHaveLength(before.history.length);
    expect(after.notifications).toHaveLength(before.notifications.length);
  });
  it("preserves legacy aggregates and last-known references across migration without fabricating ledger records", async () => {
    const { order } = await paidRequest();
    await pool!.execute(
      "UPDATE shop_order_workflows SET refund_cents=250,refund_reference='LEGACY-LAST-KNOWN' WHERE order_id=(SELECT id FROM shop_orders WHERE order_ref=?)",
      [order.orderRef]
    );
    await initializeShopPilot(pool!);
    let workspace: any = await readOrderWorkspace(order.orderRef);
    expect(workspace.refunds).toHaveLength(0);
    expect(workspace.state.unreconciledRefundCents).toBe(250);
    expect(workspace.legacyRefundBalance).toMatchObject({
      amount_cents: 250,
      last_known_reference: "LEGACY-LAST-KNOWN",
      currency: "EUR",
    });
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(4, "refund", {
          refundCents: 100,
          refundReference: "LEGACY-LAST-KNOWN",
        }),
        "admin@example.test"
      )
    ).rejects.toMatchObject({ status: 409 });
    await applyOrderCommand(
      order.orderRef,
      command(4, "refund", {
        refundCents: 100,
        refundReference: "NEW-RECORDED",
      }),
      "admin@example.test"
    );
    await initializeShopPilot(pool!);
    workspace = await readOrderWorkspace(order.orderRef);
    expect(workspace.state.refundCents).toBe(350);
    expect(workspace.state.unreconciledRefundCents).toBe(250);
    expect(workspace.refunds).toHaveLength(1);
    expect(workspace.legacyRefundBalance.last_known_reference).toBe(
      "LEGACY-LAST-KNOWN"
    );
  });
  it("freezes postal code, requested notes, exact quote details and individual refund amounts into notifications", async () => {
    await pool!.execute("UPDATE shop_order_notifications SET status='sent'");
    const { order } = await paidRequest();
    await applyOrderCommand(
      order.orderRef,
      command(4, "refund", {
        refundCents: 200,
        refundReference: "PRIVATE-REF",
      }),
      "admin@example.test"
    );
    await pool!.execute(
      "UPDATE shop_order_workflows SET postal_code='CHANGED',customer_notes='CHANGED' WHERE order_id=(SELECT id FROM shop_orders WHERE order_ref=?)",
      [order.orderRef]
    );
    const send = vi.fn().mockResolvedValue("mock-provider-only");
    await processOrderNotifications(pool!, send, 8);
    const operator = send.mock.calls
      .map(c => c[0])
      .find(mail => Array.isArray(mail.to));
    expect(operator.text).toContain("10115");
    expect(operator.text).toContain("Fixture requested sealed pack");
    expect(operator.text).not.toContain("CHANGED");
    const quoteMail = send.mock.calls
      .map(c => c[0])
      .find(mail =>
        mail.text.includes("Fixture sealed pack; customer confirmed")
      );
    expect(quoteMail).toBeTruthy();
    const refundMail = send.mock.calls
      .map(c => c[0])
      .find(mail => mail.text.includes("2.00 EUR"));
    expect(refundMail).toBeTruthy();
    expect(refundMail.text).not.toContain("PRIVATE-REF");
  });
  it("requires explicit details on new quote lines, preserves accepted details after catalogue edits, and reads legacy quotes", async () => {
    const { order } = await request();
    await applyOrderCommand(
      order.orderRef,
      command(0, "under_review"),
      "admin@example.test"
    );
    const proposal = {
      currency: "EUR",
      unitPrices: [1234],
      shippingCents: 600,
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    };
    await expect(
      applyOrderCommand(
        order.orderRef,
        command(1, "quote_sent", { quote: proposal }),
        "admin@example.test"
      )
    ).rejects.toThrow("confirmed fulfilment details");
    await applyOrderCommand(
      order.orderRef,
      command(1, "quote_sent", {
        quote: {
          ...proposal,
          fulfilmentDetails: ["Fixture agreed exact sealed pack"],
        },
      }),
      "admin@example.test"
    );
    await applyOrderCommand(
      order.orderRef,
      command(2, "quote_accepted"),
      "customer",
      order.manageToken
    );
    await updateShopProductAdmin(productId, {
      name: "Edited later",
      description: "Later description",
      price_cents: 2222,
    });
    const status: any = await readOrderWorkspace(
      order.orderRef,
      order.manageToken
    );
    expect(status.quotes[0].items[0]).toMatchObject({
      productName: "Fixture Mazoe",
      fulfilmentDetails: "Fixture agreed exact sealed pack",
      unitPriceCents: 1234,
    });
    const legacy = await request();
    await quote(legacy.order.orderRef);
    const workspace: any = await readOrderWorkspace(legacy.order.orderRef);
    const oldItems = workspace.quotes[0].items.map(
      ({ fulfilmentDetails, ...item }: any) => item
    );
    await pool!.execute("UPDATE shop_quotes SET items=? WHERE order_id=?", [
      JSON.stringify(oldItems),
      workspace.order.id,
    ]);
    await applyOrderCommand(
      legacy.order.orderRef,
      command(2, "quote_accepted"),
      "customer",
      legacy.order.manageToken
    );
    expect(
      (
        (await readOrderWorkspace(
          legacy.order.orderRef,
          legacy.order.manageToken
        )) as any
      ).stage
    ).toBe("quote_accepted");
  });
});
