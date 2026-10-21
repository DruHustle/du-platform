import assert from "node:assert/strict";
import crypto from "node:crypto";
const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  !url ||
  !new URL(url).pathname.endsWith("_test") ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
)
  throw new Error(
    "Use a disposable localhost SHOP_TEST_DATABASE_URL ending in _test."
  );
// No saved environment or providers are loaded; only the explicitly supplied
// disposable database is used. This script never sends email or takes payment.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = url;
const { initializeDatabase } = await import("../../du-platform-backend/db.ts");
const { db } = await import(
  "../../du-platform-backend/shared/databaseRuntime.ts"
);
const shop = await import(
  "../../du-platform-backend/shared/persistence/shopStore.ts"
);
const unique = crypto.randomUUID();
let product;
const createdRefs = [];
try {
  await initializeDatabase();
  product = await shop.createShopProductAdmin({
    slug: `checkout-test-${unique}`,
    name: "Local checkout fixture",
    category: "crafts",
    description: "Disposable local fixture",
    image_url: "/images/pages/shop/crafts_stone_sculptures_01.png",
    price_cents: 3000,
    currency: "EUR",
    stock_qty: 3,
    is_active: 1,
  });
  const payload = {
    customerName: "Local Test",
    customerEmail: "checkout@example.test",
    shippingCountry: "Zimbabwe",
    shippingCity: "Harare",
    shippingAddress: "Disposable local test address",
    deliverySpeed: "normal",
    paymentMethod: "manual_assisted",
    items: [{ productId: product.id, quantity: 2 }],
    requestToken: crypto.randomBytes(32).toString("hex"),
  };
  const requests = await Promise.all(
    Array.from({ length: 8 }, () => shop.createShopOrder(payload))
  );
  const first = requests[0];
  createdRefs.push(first.orderRef);
  assert.equal(new Set(requests.map(order => order.orderRef)).size, 1);
  const [counts] = await db.query(
    "SELECT COUNT(*) AS count FROM shop_orders WHERE order_ref=?",
    [first.orderRef]
  );
  assert.equal(Number(counts[0].count), 1);
  assert.equal(first.totalCents, 7200);
  assert.equal(
    (await shop.getShopOrderByRef(first.orderRef, first.manageToken)).items
      .length,
    1
  );
  assert.equal(
    await shop.getShopOrderByRef(first.orderRef, "wrong-token"),
    null
  );
  assert.equal(
    await shop.confirmShopOrderPayment(
      first.orderRef,
      "not-payment",
      "wrong-token"
    ),
    null
  );
  const connections = await Promise.all(
    Array.from({ length: 10 }, () => db.getConnection())
  );
  try {
    for (const connection of connections) {
      const [state] = await connection.query(
        "SELECT COUNT(*) AS active FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = CONNECTION_ID()"
      );
      assert.equal(
        Number(state[0].active),
        0,
        "Denied payment access must not leave a pooled transaction open"
      );
    }
  } finally {
    connections.forEach(connection => connection.release());
  }
  await assert.rejects(
    shop.createShopOrder({ ...payload, shippingCity: "Different city" }),
    /different order details/
  );
  await assert.rejects(
    shop.createShopOrder({
      ...payload,
      requestToken: crypto.randomBytes(32).toString("hex"),
      items: [...payload.items, ...payload.items],
    })
  );
  await assert.rejects(
    shop.confirmShopOrderPayment(
      first.orderRef,
      "not-payment",
      first.manageToken
    ),
    /cannot be auto-confirmed/
  );
  assert.equal(
    Number((await shop.getShopProductById(product.id)).stock_qty),
    3
  );
  const cached = await shop.listShopProducts();
  assert(cached.products.some(row => Number(row.id) === product.id));
  await shop.updateShopProductAdmin(product.id, { stock_qty: 2 });
  assert.equal(
    Number(
      (await shop.listShopProducts()).products.find(
        row => Number(row.id) === product.id
      ).stock_qty
    ),
    2
  );
  // Hold an already-read catalogue snapshot across an admin write. It must not
  // repopulate the cache after that write invalidates it.
  await shop.updateShopProductAdmin(product.id, { stock_qty: 3 });
  const originalQuery = db.query;
  let releaseSnapshot;
  const snapshotGate = new Promise(resolve => {
    releaseSnapshot = resolve;
  });
  let snapshotRead;
  const snapshotReady = new Promise(resolve => {
    snapshotRead = resolve;
  });
  let held = false;
  db.query = async function (...args) {
    const result = await originalQuery.apply(this, args);
    if (
      !held &&
      typeof args[0] === "string" &&
      args[0].includes("FROM shop_products") &&
      args[0].includes("WHERE is_active = 1")
    ) {
      held = true;
      snapshotRead();
      await snapshotGate;
    }
    return result;
  };
  try {
    const pendingCatalogue = shop.listShopProducts();
    await snapshotReady;
    await shop.updateShopProductAdmin(product.id, { stock_qty: 2 });
    releaseSnapshot();
    await pendingCatalogue;
  } finally {
    releaseSnapshot();
    db.query = originalQuery;
  }
  assert.equal(
    Number(
      (await shop.listShopProducts()).products.find(
        row => Number(row.id) === product.id
      ).stock_qty
    ),
    2,
    "A late pre-update snapshot must not repopulate the invalidated cache"
  );
  const paid = await shop.createShopOrder({
    ...payload,
    requestToken: crypto.randomBytes(32).toString("hex"),
    paymentMethod: "dummy_gateway",
  });
  createdRefs.push(paid.orderRef);
  await Promise.all(
    Array.from({ length: 4 }, () =>
      shop.confirmShopOrderPayment(
        paid.orderRef,
        "LOCAL-SIMULATION",
        paid.manageToken
      )
    )
  );
  assert.equal(
    Number((await shop.getShopProductById(product.id)).stock_qty),
    0,
    "Concurrent simulated confirmations decrement stock once"
  );
  assert.equal(
    Number(
      (await shop.listShopProducts()).products.find(
        row => Number(row.id) === product.id
      ).stock_qty
    ),
    0,
    "Committed stock invalidates the catalogue cache"
  );
  await assert.rejects(
    shop.createShopOrder({
      ...payload,
      requestToken: crypto.randomBytes(32).toString("hex"),
    }),
    /Insufficient stock/
  );
  console.log(
    "PASS MySQL: eight concurrent retries create one order; private access; changed payload rejected; manual payment protected; authoritative totals; admin/payment cache invalidation including a delayed-query race; concurrent dummy confirmations deduct once; exhausted stock rejected."
  );
} finally {
  for (const ref of createdRefs)
    await db.execute("DELETE FROM shop_orders WHERE order_ref=?", [ref]);
  if (product) await shop.deleteShopProductAdmin(product.id);
  await db?.end();
}
