import { createShopApprovalFixture } from "./shop-readiness-fixture.mjs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import express from "express";
import mysql from "mysql2/promise";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

// Checkout requires a database-backed catalogue. Isolate its orders from the
// other CI suites and leave the email worker stopped for this browser test.
const input = process.env.SHOP_TEST_DATABASE_URL;
assert(
  input && ["localhost", "127.0.0.1"].includes(new URL(input).hostname) &&
    new URL(input).pathname.endsWith("_test"),
  "Disposable localhost *_test database required"
);
const databaseUrl = new URL(input);
const database = `du_integrated_shop_${randomBytes(8).toString("hex")}_test`;
const bootstrap = mysql.createPool(input);
await bootstrap.query(`CREATE DATABASE ${database}`);
databaseUrl.pathname = "/" + database;
let db, browser, approval, server;
try {
  for (const key of Object.keys(process.env)) {
    if (
      /^(DATABASE_URL|MYSQL_|AIVEN_|RESEND_API_KEY|ADMIN_EMAILS|FROM_EMAIL)/.test(
        key
      )
    )
      delete process.env[key];
  }
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl.href;
  process.env.ALLOW_MEMORY_FALLBACK = "false";
  process.env.JWT_SECRET = "synthetic-shop-integration-fixture-only";
  process.env.ADMIN_EMAILS = "merchant@example.test";
  process.env.FROM_EMAIL = "shop@example.test";
  ({ db } = await import("../../../../du-platform-backend/shared/databaseRuntime.ts"));
  const { initializeDatabase } = await import("../../../../du-platform-backend/db.ts");
  await initializeDatabase();
  const { createShopModuleRouter } = await import(
    "../../../../du-platform-backend/modules/shop/routes/index.ts"
  );
  const [[product]] = await db.query("SELECT id, price_cents FROM shop_products WHERE slug='sables-rugby-home-kit'");
  assert(product);
  await db.execute("UPDATE shop_products SET stock_qty=3, is_active=1 WHERE id=?", [product.id]);
  approval = await createShopApprovalFixture([product.id]);
  Object.assign(process.env, approval.env);
  const app = express();
  app.use(express.json());
  app.use("/api/shop", createShopModuleRouter());
  app.use(express.static(resolve("du-platform-frontend/web/dist")));
  app.get("*", (_req, res) => res.sendFile(resolve("du-platform-frontend/web/dist/index.html")));
  server = await new Promise(done => {
    const listening = app.listen(0, "127.0.0.1", () => done(listening));
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const output =
    process.env.SHOP_INTEGRATED_OUTPUT_DIR || "/tmp/du-shop-integrated";
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({
    channel:
      process.env.SHOP_BROWSER_CHANNEL === "chromium"
        ? undefined
        : process.env.SHOP_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("du_cookie_consent_v1", "rejected");
    localStorage.setItem("i18nextLng", "en");
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (
      url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/api/shop/")
    )
      return route.fulfill({ json: { user: null } });
    if (url.hostname === "fonts.googleapis.com")
      return route.fulfill({ contentType: "text/css", body: "" });
    if (url.origin !== base)
      throw new Error("Unexpected external request: " + url.origin);
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/shop");
  const card = page.locator('[data-shop-product-card="sables-rugby-home-kit"]');
  const add = card.getByRole("button", { name: /^Add to Cart:/ });
  await add.waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    document.querySelector('[data-stock-state="in"]')
  );
  await add.click();
  await add.click();
  await card.getByRole("button", { name: /^Remove one/ }).click();
  await page
    .locator('main a[href="/shop/products?category=all&cart=1"]')
    .click();
  await page
    .getByLabel("Full Name", { exact: true })
    .fill("Local Integrated Test");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("customer@example.test");
  await page.getByLabel("Country", { exact: true }).fill("Germany");
  await page.getByLabel("City", { exact: true }).fill("Berlin");
  await page
    .getByLabel("Shipping Address", { exact: true })
    .fill("Local test address");
  const savedResponse = page.waitForResponse(
    response =>
      response.url() === base + "/api/shop/orders" &&
      response.request().method() === "POST"
  );
  await page
    .getByRole("button", { name: "Send order request", exact: true })
    .click();
  const response = await savedResponse;
  assert.equal(response.status(), 201);
  const submitted = response.request().postDataJSON();
  const {
    data: { order },
  } = await response.json();
  await page.getByText(order.orderRef, { exact: true }).waitFor();
  assert.equal(order.status, "awaiting_payment");
  assert.equal(order.paymentMethod, "manual_assisted");
  assert.equal(order.subtotalCents, product.price_cents);
  assert.equal(order.items[0].quantity, 1);
  assert.equal(order.items[0].productId, product.id);
  assert.equal(
    (await db.query("SELECT stock_qty FROM shop_products WHERE id=?", [product.id]))[0][0].stock_qty,
    3,
    "An unpaid request must not consume stock"
  );
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("shop_cart_v1") || "[]")
    ),
    []
  );

  const replay = await context.request.post(base + "/api/shop/orders", {
    data: submitted,
  });
  assert.equal(replay.status(), 201);
  assert.equal((await replay.json()).data.order.orderRef, order.orderRef);
  const [notifications] = await db.query(
    "SELECT n.event_key, n.status FROM shop_order_notifications n JOIN shop_orders o ON n.order_id=o.id WHERE o.order_ref=? ORDER BY n.event_key",
    [order.orderRef]
  );
  assert.deepEqual(notifications.map(row => [row.event_key, row.status]), [
    ["request_received", "pending"],
    ["request_received:operator", "pending"],
  ], "A browser retry must leave exactly one queued notification for each recipient");
  const unauthorised = await context.request.get(
    base + "/api/shop/orders/" + order.orderRef
  );
  assert.equal(unauthorised.status(), 404);
  const authorised = await context.request.get(
    base + "/api/shop/orders/" + order.orderRef,
    { headers: { "x-order-access-token": order.manageToken } }
  );
  assert.equal(authorised.status(), 200);
  assert.equal((await authorised.json()).data.order.orderRef, order.orderRef);
  await page.reload();
  await page.getByText(order.orderRef, { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Full Name", { exact: true }).count(), 0);
  assert(
    await page
      .locator('main a[href^="mailto:info@diasporaunlocked.com"]')
      .getAttribute("href")
      .then(href => href.includes(order.orderRef))
  );
  await page.screenshot({ path: output + "/receipt.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS real shop HTTP workflow: database catalogue, shared cart, request validation, server pricing, saved receipt, deferred notifications, idempotent retry and protected order retrieval"
  );
} finally {
  try {
    await browser?.close();
    if (server) await new Promise(done => server.close(done));
    await approval?.close();
    await db?.end();
  } finally {
    try {
      await bootstrap.query(`DROP DATABASE ${database}`);
    } finally {
      await bootstrap.end();
    }
  }
}
