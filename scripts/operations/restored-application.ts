// Runs only inside the network-isolated production-backup recovery drill.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../../du-platform-backend/shared/databaseRuntime";
import {
  createShopProductAdmin,
  createShopOrder,
} from "../../du-platform-backend/shared/persistence/shopStore";
import {
  applyOrderCommand,
  readOrderWorkspace,
} from "../../du-platform-backend/modules/shop/orderWorkflowStore";
import { NewsletterService } from "../../du-platform-backend/modules/newsletter/service";
assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.MYSQL_HOST, "127.0.0.1");
assert.equal(process.env.MYSQL_DATABASE, "du_restore_test");
assert(!process.env.DATABASE_URL);
assert(!process.env.AIVEN_MYSQL_URL);
assert(!process.env.RESEND_API_KEY);
assert(db);
const actor = "recovery@example.test";
const command = (version: number, action: string, extra: any = {}) => ({
  requestId: randomUUID(),
  version,
  action,
  ...extra,
});
try {
  const product: any = await createShopProductAdmin({
    slug: "recovery-" + randomUUID(),
    name: "Isolated recovery fixture",
    category: "crafts",
    description: "Synthetic fixture only",
    image_url: "/test.webp",
    price_cents: 1000,
    currency: "EUR",
    stock_qty: 3,
    is_active: 1,
  });
  const payload = {
    language: "en",
    postalCode: "00000",
    customerNotes: "Isolated recovery test",
    customerName: "Synthetic recovery fixture",
    customerEmail: actor,
    shippingCountry: "Germany",
    shippingCity: "Test city",
    shippingAddress: "Isolated fixture address",
    paymentMethod: "manual_assisted" as const,
    requestToken: randomBytes(32).toString("hex"),
    items: [{ productId: product.id, quantity: 1 }],
  };
  const order: any = await createShopOrder(payload);
  assert.equal(((await createShopOrder(payload)) as any).replayed, true);
  await assert.rejects(() => readOrderWorkspace(order.orderRef, "invalid"), {
    status: 404,
  });
  await applyOrderCommand(order.orderRef, command(0, "under_review"), actor);
  await applyOrderCommand(
    order.orderRef,
    command(1, "quote_sent", {
      quote: {
        currency: "EUR",
        unitPrices: [1000],
        fulfilmentDetails: ["Synthetic sealed test item"],
        shippingCents: 500,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
    }),
    actor
  );
  await assert.rejects(
    () =>
      applyOrderCommand(
        order.orderRef,
        command(2, "payment_confirmed", { paymentReference: "TEST-NO-MONEY" }),
        "customer",
        order.manageToken
      ),
    { status: 403 }
  );
  await applyOrderCommand(
    order.orderRef,
    command(2, "quote_accepted"),
    "customer",
    order.manageToken
  );
  const paid = command(3, "payment_confirmed", {
    paymentReference: "TEST-NO-MONEY",
  });
  await applyOrderCommand(order.orderRef, paid, actor);
  await applyOrderCommand(order.orderRef, paid, actor);
  const [stock]: any = await db.query(
    "SELECT stock_qty FROM shop_products WHERE id=?",
    [product.id]
  );
  assert.equal(stock[0].stock_qty, 2);
  const refund = command(4, "refund", {
    refundCents: 300,
    refundProvider: "TEST-ONLY",
    refundReference: "TEST-NO-REFUND",
    note: "Synthetic recovery ledger check; no money moved",
  });
  await applyOrderCommand(order.orderRef, refund, actor);
  await applyOrderCommand(order.orderRef, refund, actor);
  await applyOrderCommand(
    order.orderRef,
    command(5, "dispatched", {
      carrier: "TEST DHL",
      tracking: "TEST-NOT-A-SHIPMENT",
    }),
    actor
  );
  await applyOrderCommand(order.orderRef, command(6, "delivered"), actor);
  const workspace: any = await readOrderWorkspace(
    order.orderRef,
    order.manageToken
  );
  assert.equal(workspace.stage, "delivered");
  assert.equal(workspace.refundCents, 300);
  assert.equal(workspace.refunds.length, 1);
  assert.deepEqual(Object.keys(workspace.refunds[0]).sort(), [
    "amountCents",
    "createdAt",
    "currency",
  ]);
  const newsletter = new NewsletterService(db);
  await newsletter.subscribe(actor);
  const [queued]: any = await db.query(
    "SELECT d.payload,s.unsubscribe_token FROM newsletter_deliveries d JOIN newsletter_subscriptions s ON s.id=d.subscription_id WHERE s.email=? AND d.kind='confirmation' ORDER BY d.id DESC LIMIT 1",
    [actor]
  );
  const message =
    typeof queued[0].payload === "string"
      ? JSON.parse(queued[0].payload)
      : queued[0].payload;
  const token = message.text.match(/token=([a-f0-9]{48})/)[1];
  await newsletter.confirm(token);
  await assert.rejects(() => newsletter.confirm(token));
  await newsletter.unsubscribe(queued[0].unsubscribe_token);
  console.log(
    JSON.stringify({
      restoredApplicationJourney: true,
      orderReplay: true,
      privateAccess: true,
      customerCannotRecordPayment: true,
      paymentReplaySingleStockDeduction: true,
      refundReplaySingleLedgerEntry: true,
      deliveryTransition: true,
      newsletterConfirmOnceAndUnsubscribe: true,
      providerWorkersStarted: false,
      externalNetwork: false,
      productionWrites: false,
    })
  );
} finally {
  await db.end();
}
