import { createShopApprovalFixture } from "./shop-readiness-fixture.mjs";
import assert from "node:assert/strict";
import express from "express";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

// Isolated process: no .env, database, email credentials or production writes.
// Exercise the real HTTP router, validators, service, repository and email path.
for (const key of Object.keys(process.env)) {
  if (
    /^(DATABASE_URL|MYSQL_|AIVEN_|RESEND_API_KEY|ADMIN_EMAILS|FROM_EMAIL)/.test(
      key
    )
  )
    delete process.env[key];
}
process.env.NODE_ENV = "test";
process.env.ALLOW_MEMORY_FALLBACK = "true";
process.env.RESET_EMAIL_PROVIDER = "resend";
process.env.ADMIN_EMAILS = "merchant@example.test";
process.env.FROM_EMAIL = "shop@example.test";
const { db } = await import(
  "../../du-platform-backend/shared/databaseRuntime.ts"
);
assert.equal(
  db,
  null,
  "Integrated browser tests must never connect to a database"
);
const { createShopModuleRouter } = await import(
  "../../du-platform-backend/modules/shop/routes/index.ts"
);
const { shopSeedProducts } = await import(
  "../../du-platform-backend/shared/persistence/shopStore.ts"
);
const product = shopSeedProducts.find(
  item => item.slug === "sables-rugby-home-kit"
);
assert(product);
product.stock_qty = 3;
const approval = await createShopApprovalFixture([product.id]);
Object.assign(process.env, approval.env);
const app = express();
app.use(express.json());
app.use("/api/shop", createShopModuleRouter());
app.use(express.static(resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(resolve("dist/public/index.html")));
const server = await new Promise(done => {
  const listening = app.listen(0, "127.0.0.1", () => done(listening));
});
const base = "http://127.0.0.1:" + server.address().port;
const output =
  process.env.SHOP_INTEGRATED_OUTPUT_DIR || "/tmp/du-shop-integrated";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel:
    process.env.SHOP_BROWSER_CHANNEL === "chromium"
      ? undefined
      : process.env.SHOP_BROWSER_CHANNEL || "chrome",
  headless: true,
});
const emailLogs = [];
const originalLog = console.log;
console.log = (...args) => {
  if (String(args[0]).startsWith("[email:dry-run]"))
    emailLogs.push(String(args[0]));
  else originalLog(...args);
};
try {
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
  await page.getByLabel("Country", { exact: true }).fill("Zimbabwe");
  await page.getByLabel("City", { exact: true }).fill("Harare");
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
    product.stock_qty,
    3,
    "An unpaid request must not consume stock"
  );
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("shop_cart_v1") || "[]")
    ),
    []
  );
  assert.equal(
    emailLogs.length,
    0,
    "The memory fixture must not bypass the durable database outbox"
  );

  const replay = await context.request.post(base + "/api/shop/orders", {
    data: submitted,
  });
  assert.equal(replay.status(), 201);
  assert.equal((await replay.json()).data.order.orderRef, order.orderRef);
  assert.equal(
    emailLogs.length,
    0,
    "Retrying must not send synchronous receipt emails"
  );
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
  originalLog(
    "PASS real shop HTTP workflow: catalogue, shared cart, request validation, server pricing, saved receipt, deferred notifications (durable worker covered by disposable MySQL tests), idempotent retry and protected order retrieval"
  );
} finally {
  console.log = originalLog;
  await browser.close();
  await approval.close();
  await new Promise(done => server.close(done));
}
