import { createShopApprovalFixture } from "./shop-readiness-fixture.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { chromium, webkit } from "playwright";
const databaseUrl = process.env.SHOP_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname) ||
  !new URL(databaseUrl).pathname.endsWith("_test")
)
  throw new Error("Disposable localhost *_test database required");
const engine = process.env.PILOT_BROWSER || "chromium",
  output = process.env.PILOT_OUTPUT_DIR || `/tmp/du-pilot-${engine}`;
await mkdir(output, { recursive: true });
const adminEmail = `pilot-admin-${Date.now()}@example.test`,
  password = "StrongPilot!2026";
const pool = mysql.createPool({ uri: databaseUrl, timezone: "Z" });
const serverCode = `import {initializeDatabase} from './du-platform-backend/db.ts';import {db} from './du-platform-backend/shared/databaseRuntime.ts';import {hashPassword} from './du-platform-backend/shared/passwords.ts';import {createModularServer} from './du-platform-backend/server.ts';import path from 'node:path';import {createServer} from 'node:http';await initializeDatabase();await db.execute('UPDATE users SET password_hash=?,email_verified_at=NOW() WHERE email=?',[await hashPassword('${password}'),process.env.ADMIN_EMAILS]);const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));process.env.APP_BASE_URL='http://127.0.0.1:'+server.address().port;server.on('request',createModularServer({backend:{db,serverStartedAt:Date.now()},staticPath:path.resolve('dist/public')}));console.log('TEST_URL='+process.env.APP_BASE_URL);process.on('SIGTERM',()=>{server.close();void db.end().then(()=>process.exit(0));});`;
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR"]
    .filter(key => process.env[key])
    .map(key => [key, process.env[key]])
);
const approval = await createShopApprovalFixture([1]);
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--input-type=module", "-e", serverCode],
  {
    env: {
      ...env,
      ...approval.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "local-pilot-only-no-real-credentials",
      ADMIN_EMAILS: adminEmail,
      FROM_EMAIL: "shop@example.test",
      ONESA_MOCK_MODE: "true",
      CSRF_ENABLED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let logs = "",
  browser,
  ref,
  product,
  adminId;
const checks = [],
  errors = [],
  network = [];
child.stdout.on("data", chunk => (logs += chunk));
child.stderr.on("data", chunk => (logs += chunk));
const pass = s => {
  checks.push(s);
  console.log("PASS " + s);
};
try {
  const started = Date.now();
  while (!logs.includes("TEST_URL=")) {
    if (Date.now() - started > 30000)
      throw new Error("Fixture startup failed: " + logs.slice(-2500));
    await new Promise(done => setTimeout(done, 100));
  }
  const base = logs.match(/TEST_URL=(http:\/\/127\.0\.0\.1:\d+)/)[1];
  await pool.execute("DELETE FROM rate_limit_buckets");
  const call = async (path, method = "GET", body, token, grant) => {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(grant ? { "X-Order-Access-Token": grant } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const login = await call("/auth/login", "POST", {
    email: adminEmail,
    password,
  });
  assert.equal(login.status, 200);
  const token = login.body.data.accessToken;
  const [[admin]] = await pool.query("SELECT id FROM users WHERE email=?", [
    adminEmail,
  ]);
  adminId = admin.id;
  assert.equal((await call("/admin/orders")).status, 401);
  const create = await call(
    "/admin/shop-products",
    "POST",
    {
      slug: `pilot-mazoe-${Date.now()}`,
      name: "Pilot Mazoe fixture",
      category: "beverage",
      description: "Isolated browser fixture; no real product claims",
      image_url: "/images/pages/shop/beverage_mazoe_orange_1.png",
      price_cents: 485,
      currency: "EUR",
      stock_qty: 2,
      is_active: 1,
    },
    token
  );
  assert.equal(create.status, 201, JSON.stringify(create.body));
  product = create.body.data.row;
  const fixture = JSON.parse(
    await readFile(approval.env.SHOP_PILOT_APPROVAL_FILE, "utf8")
  );
  fixture.approvedProductIds = [product.id];
  await writeFile(
    approval.env.SHOP_PILOT_APPROVAL_FILE,
    JSON.stringify(fixture)
  );
  assert.equal(
    (
      await call(
        `/admin/shop-products/${product.id}/details`,
        "PUT",
        {
          ingredients: "Fixture ingredients — not a real specification",
          allergens: "Fixture review pending",
        },
        token
      )
    ).status,
    200
  );
  browser = await (engine === "webkit" ? webkit : chromium).launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
    localStorage.setItem("du_cookie_consent_v1", "rejected");
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com")
      return route.fulfill({ contentType: "text/css", body: "" });
    if (url.origin !== base)
      throw new Error("Unexpected external browser request " + url.origin);
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => {
    if (
      new URL(r.url()).origin === base &&
      r.status() >= 400 &&
      !/\/auth\/(me|token\/refresh)/.test(r.url())
    )
      network.push({ path: new URL(r.url()).pathname, status: r.status() });
  });
  await page.goto(base + "/search?q=Mazoe");
  await page
    .getByRole("heading", { name: product.name, exact: true })
    .waitFor();
  await page.getByRole("heading", { name: product.name, exact: true }).click();
  await page.waitForURL(/product=/);
  const card = page.locator(`[data-shop-product-card="${product.slug}"]`);
  await card.getByRole("button", { name: /^Add to Cart:/ }).click();
  await page
    .getByRole("button", { name: "Review basket", exact: true })
    .click();
  await page
    .getByLabel("Full Name", { exact: true })
    .fill("Pilot Browser Fixture");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("pilot-customer@example.test");
  await page.getByLabel("Country", { exact: true }).fill("Germany");
  await page.getByLabel("City", { exact: true }).fill("Berlin");
  await page
    .getByLabel("Shipping Address", { exact: true })
    .fill("Disposable local fixture address");
  await page
    .getByLabel("Postal code (where applicable)", { exact: true })
    .fill("10115");
  const saved = page.waitForResponse(
    r =>
      r.url() === base + "/api/shop/orders" && r.request().method() === "POST"
  );
  await page
    .getByRole("button", { name: "Send order request", exact: true })
    .click();
  const order = (await (await saved).json()).data.order;
  ref = order.orderRef;
  await page.getByText(ref, { exact: true }).first().waitFor();
  pass(
    "Mazoe discovery → correct filtered product → basket → guest request with postal address"
  );
  let workspace = await call(`/admin/orders/${ref}`, "GET", undefined, token);
  assert.equal(workspace.body.data.notifications.length, 2);
  assert.equal(
    workspace.body.data.snapshots[0].description,
    product.description
  );
  assert.equal(
    (
      await call(`/admin/orders/${ref}/commands`, "POST", {
        action: "delivered",
      })
    ).status,
    401
  );
  assert.equal(
    (
      await call(
        `/shop/orders/${ref}/workflow`,
        "GET",
        undefined,
        undefined,
        "invalid"
      )
    ).status,
    404
  );
  pass(
    "Private customer grant, server admin authorization and durable notification intent"
  );
  const adminContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await adminContext.addInitScript(() => {
    localStorage.setItem("du_cookie_consent_v1", "rejected");
    localStorage.setItem("i18nextLng", "en");
  });
  await adminContext.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com")
      return route.fulfill({ contentType: "text/css", body: "" });
    if (url.origin !== base)
      throw new Error("Unexpected operator external request");
    return route.continue();
  });
  const adminPage = await adminContext.newPage();
  adminPage.on("pageerror", e => errors.push(e.message));
  await adminPage.goto(base + "/login?next=%2Fadmin");
  await adminPage.getByLabel("Email Address", { exact: true }).fill(adminEmail);
  await adminPage.getByLabel("Password", { exact: true }).fill(password);
  await adminPage.getByRole("button", { name: "Login", exact: true }).click();
  await adminPage.waitForURL("**/admin");
  await adminPage.getByRole("button", { name: "Orders", exact: true }).click();
  await adminPage.getByRole("button").filter({ hasText: ref }).click();
  const loseAdminActions = new Set(["payment_confirmed", "refund"]);
  await adminPage.route("**/api/admin/orders/*/commands", async route => {
    const body = route.request().postDataJSON();
    if (!loseAdminActions.has(body.action)) return route.continue();
    loseAdminActions.delete(body.action);
    assert.equal((await route.fetch()).status(), 200);
    await route.abort("failed");
  });
  const action = adminPage.getByLabel("Action", { exact: true });
  const saveAction = async (value, lost = false) => {
    await action.selectOption(value);
    const response = adminPage.waitForResponse(r =>
      lost
        ? r.request().method() === "GET" &&
          r.url().endsWith(`/admin/orders/${ref}`)
        : r.url().endsWith("/commands")
    );
    await adminPage
      .getByRole("button", { name: "Save action", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await adminPage.waitForFunction(
      () =>
        document.querySelector('select[aria-label="Action"]')?.value === "note"
    );
    await page
      .getByRole("button", { name: "Refresh status", exact: true })
      .click();
  };
  await saveAction("under_review");
  await action.selectOption("quote_sent");
  await adminPage.getByLabel(/Unit price:/).fill("4.85");
  await adminPage
    .getByLabel(/Confirmed item details:/)
    .fill("Fixture sealed pack, agreed with customer");
  await adminPage
    .getByLabel("Confirmed delivery charge", { exact: true })
    .fill("6.50");
  await adminPage
    .getByLabel("Valid until (local time)", { exact: true })
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await saveAction("quote_sent");
  const acceptanceRequests = [];
  let failAcceptanceResponse = true,
    failReconciliation = false;
  await page.route("**/api/shop/orders/*/accept-quote", async route => {
    acceptanceRequests.push(route.request().postDataJSON());
    if (!failAcceptanceResponse) return route.continue();
    failAcceptanceResponse = false;
    assert.equal((await route.fetch()).status(), 200);
    failReconciliation = true;
    await route.abort("failed");
  });
  await page.route("**/api/shop/orders/*/workflow", async route => {
    if (!failReconciliation) return route.continue();
    failReconciliation = false;
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Accept this quote", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "The response could not be confirmed" })
    .waitFor();
  await page
    .getByRole("button", { name: "Accept this quote", exact: true })
    .click();
  await page.getByText("Quote accepted", { exact: true }).waitFor();
  assert.equal(acceptanceRequests.length, 2);
  assert.equal(
    acceptanceRequests[0].requestId,
    acceptanceRequests[1].requestId
  );
  pass(
    "Lost quote-acceptance response and failed reconciliation retry reuse one command ID"
  );
  // Reload the latest version after a customer action; stale admin commands must fail closed.
  await adminPage.getByRole("button").filter({ hasText: ref }).click();
  await action.selectOption("payment_confirmed");
  await adminPage
    .getByLabel("Received payment reference", { exact: true })
    .fill("LOCAL-RECEIVED");
  await saveAction("payment_confirmed", true);
  await adminPage
    .getByText(
      "The response was lost, but the action was saved. The current order is shown.",
      { exact: true }
    )
    .waitFor();
  pass(
    "Lost payment-confirmation response is reconciled before another action; stock consumed once"
  );
  await action.selectOption("dispatched");
  await adminPage.getByLabel("Carrier", { exact: true }).fill("DHL");
  await adminPage
    .getByLabel("Tracking reference", { exact: true })
    .fill("LOCAL-TRACKING");
  await saveAction("dispatched");
  await saveAction("delivered");
  await page.getByText("Delivered", { exact: true }).waitFor();
  const final = (await call(`/admin/orders/${ref}`, "GET", undefined, token))
    .body.data;
  assert.equal(final.history.length, 6);
  assert.equal(final.quotes[0].total_cents, 1135);
  assert.equal(final.order.total_cents, 1685);
  assert.equal(final.state.tracking, "LOCAL-TRACKING");
  const [[stock]] = await pool.query(
    "SELECT stock_qty FROM shop_products WHERE id=?",
    [product.id]
  );
  assert.equal(stock.stock_qty, 1);
  pass(
    "Admin review → final quote → secure customer acceptance → actual payment reference → dispatch/tracking → delivery; original estimate preserved"
  );
  for (const [amount, reference, lost] of [
    ["2.00", "LOCAL-REFUND-A", true],
    ["3.00", "LOCAL-REFUND-B", false],
  ]) {
    await action.selectOption("refund");
    await adminPage
      .getByLabel("Actual refund amount", { exact: true })
      .fill(amount);
    await adminPage
      .getByLabel("Refund reference", { exact: true })
      .fill(reference);
    await adminPage
      .getByLabel("Refund payment channel / provider", { exact: true })
      .fill("fixture bank");
    await saveAction("refund", lost);
  }
  const refunded = (await call(`/admin/orders/${ref}`, "GET", undefined, token))
    .body.data;
  assert.equal(refunded.refunds.length, 2);
  assert.equal(refunded.state.refundCents, 500);
  assert.equal(refunded.state.remainingPaidCents, 635);
  assert.equal(
    refunded.history.filter(e => e.action === "quote_accepted").length,
    1
  );
  assert.equal(
    refunded.history.filter(e => e.action === "payment_confirmed").length,
    1
  );
  assert.equal(
    refunded.notifications.filter(n => n.event_key.endsWith(":refund")).length,
    2
  );
  const customerRefund = (
    await call(
      `/shop/orders/${ref}/workflow`,
      "GET",
      undefined,
      undefined,
      order.manageToken
    )
  ).body.data;
  assert.equal(customerRefund.refunds.length, 2);
  assert(!JSON.stringify(customerRefund).includes("LOCAL-REFUND"));
  await page
    .getByText("Paid balance remaining after refunds", { exact: false })
    .waitFor();
  pass(
    "Two partial refunds retain individual records and paid balance; a lost response creates no duplicate ledger entry or notification"
  );
  await page.screenshot({
    path: output + "/customer-delivered-390.png",
    fullPage: true,
  });
  await adminPage.screenshot({
    path: output + "/operator-delivered-390.png",
    fullPage: true,
  });
  await page.goto(
    `${base}/shop/order-status#ref=${ref}&access=${order.manageToken}`
  );
  await page.getByText("Delivered", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, "");
  assert.equal(await page.locator(".onesa-bubble").count(), 0);
  pass(
    "Private email-style status link is consumed and stripped before rendering"
  );
  await page.reload();
  await page.getByText("Delivered", { exact: true }).waitFor();
  pass(
    "Private request status survives a same-tab refresh without a token in the URL"
  );
  await adminPage
    .getByRole("button", { name: "Shop Products", exact: true })
    .click();
  const information = adminPage
    .getByRole("heading", { name: "Product information", exact: true })
    .locator("..");
  await information
    .getByLabel("Product", { exact: true })
    .selectOption(String(product.id));
  await information
    .getByLabel("ingredients", { exact: true })
    .fill("Fixture ingredients — not a real specification");
  const sources = information.getByLabel(
    "sources (one HTTPS URL per line, up to 8)",
    { exact: true }
  );
  await sources.fill("https://example.test/fixture-source");
  await sources.press("End");
  await sources.press("Enter");
  await sources.pressSequentially("https://example.test/second-source");
  assert.equal((await sources.inputValue()).split("\n").length, 2);
  adminPage.once("dialog", dialog => dialog.dismiss());
  await adminPage.getByRole("button", { name: "Orders", exact: true }).click();
  assert(
    await information.isVisible(),
    "Dismissing discard keeps the product draft"
  );
  await information
    .getByRole("button", { name: "Save product information", exact: true })
    .click();
  await information
    .getByText("Product information saved.", { exact: true })
    .waitFor();
  pass(
    "Admin edits specifications with multiple source lines; cancelled discard preserves the draft"
  );
  await page.goto(base + `/shop/product/${product.slug}`);
  await page
    .getByText("Fixture ingredients — not a real specification", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Review basket", exact: true })
      .count(),
    1
  );
  pass(
    "Addressable product information displays verified fixture details and a checkout next step"
  );
  await page.waitForLoadState("networkidle");
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  await context.close();
} catch (error) {
  if (browser)
    for (const [i, page] of browser
      .contexts()
      .flatMap(c => c.pages())
      .entries()) {
      await page
        .screenshot({ path: `${output}/failure-${i}.png`, fullPage: true })
        .catch(() => {});
      await writeFile(
        `${output}/failure-${i}.txt`,
        await page.locator("body").innerText()
      ).catch(() => {});
    }
  await writeFile(output + "/server.log", logs);
  throw error;
} finally {
  if (browser) await browser.close();
  if (ref) {
    const [[row]] = await pool.query(
      "SELECT id FROM shop_orders WHERE order_ref=?",
      [ref]
    );
    if (row) {
      await pool.execute("DELETE FROM shop_order_items WHERE order_id=?", [
        row.id,
      ]);
      await pool.execute("DELETE FROM shop_orders WHERE id=?", [row.id]);
    }
  }
  if (product)
    await pool.execute("DELETE FROM shop_products WHERE id=?", [product.id]);
  if (adminId) {
    await pool
      .execute("DELETE FROM auth_sessions WHERE user_id=?", [adminId])
      .catch(() => {});
    await pool
      .execute("DELETE FROM users WHERE id=?", [adminId])
      .catch(() => {});
  }
  await pool.end();
  await approval.close();
  if (child.exitCode === null) {
    const ended = once(child, "exit");
    child.kill("SIGTERM");
    await ended;
  }
  await writeFile(
    output + "/report.json",
    JSON.stringify({ engine, checks, errors, network }, null, 2)
  );
}
