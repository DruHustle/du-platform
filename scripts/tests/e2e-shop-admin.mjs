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
  !new URL(databaseUrl).pathname.endsWith("_test") ||
  !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
)
  throw new Error(
    "Use a disposable localhost SHOP_TEST_DATABASE_URL ending in _test."
  );
const output = process.env.SHOP_ADMIN_OUTPUT_DIR || "/tmp/du-shop-admin";
await mkdir(output, { recursive: true });
const pool = mysql.createPool(databaseUrl);
const stamp = Date.now();
const adminEmail = `shop-admin-${stamp}@example.test`;
const password = "StrongAdmin!2026";
const slug = `admin-product-${stamp}`;
const name = `Admin product ${stamp}`;
const environment = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR"]
    .filter(key => process.env[key])
    .map(key => [key, process.env[key]])
);
const serverCode = `import {initializeDatabase} from './du-platform-backend/db.ts';import {db} from './du-platform-backend/shared/databaseRuntime.ts';import {createModularServer} from './du-platform-backend/server.ts';import {createServer} from 'node:http';import path from 'node:path';await initializeDatabase();const {default:axios}=await import('axios');axios.post=async(url,payload)=>{if(!String(url).startsWith('https://api.resend.com/'))throw new Error('Unexpected test provider request');const token=payload.html?.match(/token=([a-f0-9]+)/)?.[1];if(token&&(Array.isArray(payload.to)?payload.to.includes(process.env.ADMIN_EMAILS):payload.to===process.env.ADMIN_EMAILS))console.log('TEST_RESET_TOKEN='+token);return {data:{id:'local-reset-test'}};};const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));process.env.APP_BASE_URL='http://127.0.0.1:'+server.address().port;const {startTransactionalWorker}=await import('./du-platform-backend/modules/notifications/transactionalWorker.ts');const stopMessages=startTransactionalWorker(db);server.on('close',stopMessages);server.on('request',createModularServer({backend:{db,serverStartedAt:Date.now()},staticPath:path.resolve('du-platform-frontend/dist')}));console.log('TEST_URL='+process.env.APP_BASE_URL);process.on('SIGTERM',()=>{server.close();void db?.end().then(()=>process.exit(0));});`;
let child,
  browser,
  base,
  page,
  logs = "";
const checks = [],
  errors = [];
const pass = scenario => {
  checks.push(scenario);
  console.log("PASS " + scenario);
};
const waitFor = async predicate => {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > 30000)
      throw new Error(
        "Timed out waiting for admin fixture: " + logs.slice(-2500)
      );
    await new Promise(done => setTimeout(done, 100));
  }
};
const approval = await createShopApprovalFixture([1]);
const startServer = async () => {
  logs = "";
  child = spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", serverCode],
    {
      env: {
        ...environment,
        ...approval.env,
        NODE_ENV: "test",
        DATABASE_URL: databaseUrl,
        JWT_SECRET: "local-shop-admin-test-only-no-real-credential",
        ADMIN_EMAILS: adminEmail,
        FROM_EMAIL: "shop@example.test",
        CSRF_ENABLED: "true",
        RESEND_API_KEY: "local-test-only-no-provider-call",
        RESET_EMAIL_PROVIDER: "resend",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  child.stdout.on("data", data => {
    logs += data;
  });
  child.stderr.on("data", data => {
    logs += data;
  });
  await waitFor(() => logs.includes("TEST_URL="));
  base = logs.match(/TEST_URL=(http:\/\/127\.0\.0\.1:\d+)/)[1];
};
const stopServer = async () => {
  if (child && child.exitCode === null) {
    const ended = once(child, "exit");
    child.kill("SIGTERM");
    await ended;
  }
};
const request = async (path, body, token, method = body ? "POST" : "GET") => {
  const res = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: await res.json() };
};
try {
  await startServer();
  // A fresh disposable fixture quota makes repeated local runs independent.
  // Production limit values and all request/authentication checks remain active.
  await pool.execute("DELETE FROM rate_limit_buckets");
  const register = async email => {
    const result = await request("/auth/register", {
      email,
      fullName: "Local admin fixture",
      password,
      confirmPassword: password,
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body.data.accessToken;
  };
  assert.equal(
    (
      await request("/auth/register", {
        email: adminEmail,
        fullName: "Unverified claimant",
        password,
        confirmPassword: password,
      })
    ).status,
    409
  );
  assert.equal(
    (await request("/auth/login", { email: adminEmail, password })).status,
    401
  );
  const { hashPassword } = await import(
    "../../du-platform-backend/shared/passwords.ts"
  );
  await pool.execute("UPDATE users SET password_hash=? WHERE email=?", [
    await hashPassword(password),
    adminEmail,
  ]);
  const unverifiedLogin = await request("/auth/login", {
    email: adminEmail,
    password,
  });
  assert.equal(unverifiedLogin.status, 200);
  const preVerificationToken = unverifiedLogin.body.data.accessToken;
  assert.equal(
    (await request("/admin/shop-products", null, preVerificationToken)).status,
    403
  );
  await request("/auth/forgot-password", { email: adminEmail });
  await waitFor(() => logs.includes("TEST_RESET_TOKEN="));
  const setupToken = logs.match(/TEST_RESET_TOKEN=([a-f0-9]+)/)[1];
  assert.equal(
    (
      await request("/auth/reset-password", {
        token: setupToken,
        password,
        confirmPassword: password,
      })
    ).status,
    200
  );
  assert.equal(
    (
      await request("/auth/reset-password", {
        token: setupToken,
        password,
        confirmPassword: password,
      })
    ).status,
    400
  );
  const adminLogin = await request("/auth/login", {
    email: adminEmail,
    password,
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(
    (await request("/admin/shop-products", null, preVerificationToken)).status,
    401
  );
  const adminToken = adminLogin.body.data.accessToken,
    userToken = await register(`shop-user-${stamp}@example.test`);
  pass(
    "first admin access requires a single-use emailed setup link; public registration cannot claim the admin identity"
  );
  for (const [path, body, method] of [
    ["/admin/shop-products", null, "GET"],
    ["/admin/shop-products", {}, "POST"],
    ["/admin/shop-products/1", {}, "PUT"],
    ["/admin/shop-products/1", null, "DELETE"],
  ]) {
    assert.equal((await request(path, body, null, method)).status, 401);
    assert.equal((await request(path, body, userToken, method)).status, 403);
  }
  pass(
    "anonymous and ordinary accounts cannot read, create, edit or delete admin products"
  );
  const engine =
    process.env.SHOP_ADMIN_BROWSER_ENGINE === "webkit" ? webkit : chromium;
  browser = await engine.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
    localStorage.setItem("du_cookie_consent_v1", "rejected");
  });
  await context.route("https://fonts.googleapis.com/**", route =>
    route.fulfill({ contentType: "text/css", body: "" })
  );
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/admin");
  await page.waitForURL(/\/login\?next=/);
  await page.getByRole("heading", { name: "Admin sign in" }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Create Account" }).count(),
    0
  );
  await page.getByLabel("Email Address", { exact: true }).fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(base + "/admin");
  await page
    .getByRole("heading", { name: "Admin Dashboard", exact: true })
    .waitFor();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await page.getByRole("button", { name: /^Shop Products/ }).click();
  const form = page.getByRole("form", { name: "Shop Products" });
  await form.getByLabel("Product name", { exact: true }).fill(name);
  await page.waitForFunction(
    expected =>
      document.querySelector("#admin-product-slug")?.value === expected,
    slug
  );
  await page
    .locator("#admin-product-image_url")
    .fill("/images/pages/shop/beverage_cascade_6.png");
  await page.locator("#admin-product-category").selectOption("beverage");
  await page.locator("#admin-product-price").fill("4.99");
  await page.locator("#admin-product-stock").fill("4");
  await page
    .locator("#admin-product-description")
    .fill("Local six-bottle test fixture");
  await form.getByRole("button", { name: "Add Product", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Product saved" }).waitFor();
  let [[product]] = await pool.query(
    "SELECT * FROM shop_products WHERE slug=?",
    [slug]
  );
  assert.equal(product.price_cents, 499);
  assert.equal(product.is_active, 0);
  assert(
    !(await request("/shop/products")).body.data.products.some(
      row => row.slug === slug
    )
  );
  pass(
    "protected mobile login creates a hidden drink product with 4.99 stored as 499 cents"
  );
  await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  await page.locator("#admin-product-price").fill("5.25");
  await page.locator("#admin-product-stock").fill("6");
  await page.getByLabel("Display product", { exact: true }).check();
  await form
    .getByRole("button", { name: "Update Product", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Product saved" }).waitFor();
  assert(
    (await request("/shop/products")).body.data.products.some(
      row => row.slug === slug && row.price_cents === 525 && row.stock_qty === 6
    )
  );
  await page.evaluate(() => scrollTo(0, 0));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      "Admin overflow " + width
    );
    await page.screenshot({
      path: `${output}/admin-${width}.png`,
      fullPage: false,
    });
  }
  pass(
    "edit, publish and catalogue cache invalidation work at 375, 768 and 1440px"
  );
  const duplicate = await request(
    "/admin/shop-products",
    { ...product, price_cents: 525 },
    adminToken
  );
  assert.equal(duplicate.status, 409);
  for (const invalid of [
    { price_cents: 0.9 },
    { stock_qty: -1 },
    { currency: "GBP" },
    { image_url: "javascript:alert(1)" },
    { name: " " },
  ])
    assert.equal(
      (
        await request(
          `/admin/shop-products/${product.id}`,
          invalid,
          adminToken,
          "PUT"
        )
      ).status,
      400
    );
  pass("duplicate URL keys and unsafe or invalid product fields fail safely");
  // Repeat real guest checkout with each currency; no provider credentials are
  // inherited and receipt emails use an isolated provider mock.
  const approved = JSON.parse(
    await readFile(approval.env.SHOP_PILOT_APPROVAL_FILE, "utf8")
  );
  approved.approvedProductIds = [product.id];
  await writeFile(
    approval.env.SHOP_PILOT_APPROVAL_FILE,
    JSON.stringify(approved)
  );
  for (const [currency, unitPrice, shipping] of [
    ["EUR", 525, 1200],
    ["USD", 588, 1345],
    ["ZAR", 9742, 22268],
  ]) {
    const guest = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
      timezoneId:
        currency === "USD"
          ? "Africa/Harare"
          : currency === "ZAR"
            ? "Africa/Johannesburg"
            : "Europe/Berlin",
    });
    await guest.addInitScript(() => {
      localStorage.setItem("i18nextLng", "en");
      localStorage.setItem("du_cookie_consent_v1", "rejected");
    });
    await guest.route("https://fonts.googleapis.com/**", route =>
      route.fulfill({ contentType: "text/css", body: "" })
    );
    const customer = await guest.newPage();
    customer.on("pageerror", error => errors.push(error.message));
    await customer.goto(
      base + `/shop/products?category=all&add=${slug}&cart=1`
    );
    assert.equal(
      await customer.getByLabel("Shop currency", { exact: true }).inputValue(),
      currency
    );
    if (currency === "EUR") {
      await customer
        .getByLabel("Shop currency", { exact: true })
        .selectOption("USD");
      await customer
        .getByRole("form", { name: "Cart & order request", exact: true })
        .getByText("$5.88", { exact: true })
        .first()
        .waitFor();
      await customer.waitForLoadState("networkidle");
      await customer.reload();
      assert.equal(
        await customer
          .getByLabel("Shop currency", { exact: true })
          .inputValue(),
        "USD"
      );
      await customer
        .getByLabel("Shop currency", { exact: true })
        .selectOption("EUR");
    }
    await customer
      .getByLabel("Full Name", { exact: true })
      .fill("Local currency test");
    await customer
      .getByLabel("Email Address", { exact: true })
      .fill("currency@example.test");
    await customer
      .getByLabel("Country", { exact: true })
      .fill(
        currency === "ZAR"
          ? "South Africa"
          : currency === "USD"
            ? "Zimbabwe"
            : "Germany"
      );
    await customer.getByLabel("City", { exact: true }).fill("Local test city");
    await customer
      .getByLabel("Shipping Address", { exact: true })
      .fill("Local test address");
    const responsePromise = customer.waitForResponse(
      response =>
        response.url().endsWith("/api/shop/orders") &&
        response.request().method() === "POST"
    );
    await customer
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    const response = await responsePromise;
    assert.equal(response.status(), 201, await response.text());
    const order = (await response.json()).data.order;
    assert.equal(order.currency, currency);
    assert.equal(order.items[0].unitPriceCents, unitPrice);
    assert.equal(order.shippingCents, shipping);
    assert.equal(order.totalCents, unitPrice + shipping);
    await customer.getByText(order.orderRef, { exact: true }).waitFor();
    await customer.reload();
    await customer.getByText(order.orderRef, { exact: true }).waitFor();
    const replay = response.request().postDataJSON();
    assert.equal(
      (
        await request("/shop/orders", {
          ...replay,
          currency: currency === "EUR" ? "USD" : "EUR",
        })
      ).status,
      400
    );
    if (currency === "ZAR")
      assert.equal(
        (
          await request("/shop/orders", {
            ...replay,
            requestToken: "f".repeat(64),
            pricingRevision: "old-rate",
          })
        ).status,
        409
      );
    await customer.waitForLoadState("networkidle");
    await guest.close();
    pass(
      `${currency} regional default, guest checkout, server totals and receipt recovery`
    );
  }
  const historyDelete = await request(
    `/admin/shop-products/${product.id}`,
    null,
    adminToken,
    "DELETE"
  );
  assert.equal(historyDelete.status, 409);
  await request(
    `/admin/shop-products/${product.id}`,
    { is_active: 0 },
    adminToken,
    "PUT"
  );
  const [[seed]] = await pool.query(
    "SELECT id FROM shop_products WHERE slug='mama-dovi_750ml'"
  );
  const deleteSeed = page.getByRole("button", {
    name: "Delete Mama Dovi 750ml",
    exact: true,
  });
  page.once("dialog", dialog => dialog.dismiss());
  await deleteSeed.click();
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*) AS total FROM shop_products WHERE id=?",
        [seed.id]
      )
    )[0][0].total,
    1
  );
  page.once("dialog", dialog => dialog.accept());
  const deletedResponse = page.waitForResponse(
    response =>
      response.request().method() === "DELETE" &&
      response.url().endsWith(`/admin/shop-products/${seed.id}`)
  );
  await deleteSeed.click();
  assert.equal((await deletedResponse).status(), 200);
  await page
    .getByRole("status")
    .filter({ hasText: "Product deleted" })
    .waitFor();
  pass(
    "cancelled deletion preserves the product; confirmed deletion removes it through the admin form"
  );
  // A deliberately restored previous default is corrected once, while another
  // customised price/name/visibility survives the same migration.
  await pool.execute(
    "DELETE FROM shop_catalog_seed_history WHERE slug IN ('mazoe-orange-2l','maputi-40g')"
  );
  await pool.execute(
    "UPDATE shop_products SET price_cents=1000 WHERE slug='mazoe-orange-2l'"
  );
  await pool.execute(
    "UPDATE shop_products SET price_cents=1234,name='Owner custom name',is_active=0 WHERE slug='maputi-40g'"
  );
  await page.waitForLoadState("networkidle");
  await browser.close();
  browser = null;
  await stopServer();
  await startServer();
  const [[persisted]] = await pool.query(
    "SELECT price_cents,stock_qty,is_active FROM shop_products WHERE id=?",
    [product.id]
  );
  assert.deepEqual(
    [persisted.price_cents, persisted.stock_qty, persisted.is_active],
    [525, 6, 0]
  );
  const [[deleted]] = await pool.query(
    "SELECT COUNT(*) AS total FROM shop_products WHERE slug='mama-dovi_750ml'"
  );
  assert.equal(deleted.total, 0);
  const [[corrected]] = await pool.query(
    "SELECT price_cents FROM shop_products WHERE slug='mazoe-orange-2l'"
  );
  assert.equal(corrected.price_cents, 485);
  const [[custom]] = await pool.query(
    "SELECT price_cents,name,is_active FROM shop_products WHERE slug='maputi-40g'"
  );
  assert.deepEqual(
    [custom.price_cents, custom.name, custom.is_active],
    [1234, "Owner custom name", 0]
  );
  pass(
    "restart preserves edits, hidden stock, order history and deleted seed products; old default prices migrate once"
  );
  // Restore disposable seed fixtures for other suites sharing this local DB.
  await pool.execute(
    "DELETE FROM shop_catalog_seed_history WHERE slug IN ('mama-dovi_750ml','maputi-40g')"
  );
  await pool.execute("DELETE FROM shop_products WHERE slug='maputi-40g'");
  assert.deepEqual(errors, []);
  pass("no browser runtime errors");
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: output + "/failure.png", fullPage: true })
      .catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await stopServer();
  await pool.end();
  await approval.close();
  await writeFile(
    output + "/report.json",
    JSON.stringify({ checks, errors }, null, 2)
  );
}
