// Full HTTP + disposable MySQL + mocked providers. Never target a deployed site.
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { createServer } from "node:http";
import { chromium, webkit } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const input = process.env.SHOP_TEST_DATABASE_URL;
assert(
  input &&
    ["localhost", "127.0.0.1"].includes(new URL(input).hostname) &&
    new URL(input).pathname.endsWith("_test"),
  "Disposable localhost *_test database required"
);
const root = mysql.createPool(input),
  url = new URL(input);
url.pathname = "/du_prelaunch_browser_test";
await root.query("CREATE DATABASE IF NOT EXISTS du_prelaunch_browser_test");
await root.end();
for (const key of Object.keys(process.env))
  if (
    /^(MYSQL_|AIVEN_|DATABASE_URL|RESEND_|ADMIN_EMAILS|SHOP_PILOT_)/.test(key)
  )
    delete process.env[key];
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: url.toString(),
  JWT_SECRET: "synthetic-prelaunch-browser-key-only-2026",
  FROM_EMAIL: "fixture@example.test",
  RESEND_API_KEY: "synthetic-not-used",
  SHOP_COMMERCIAL_MODE: "prelaunch",
  ADMIN_EMAILS: "",
});
const { initializeDatabase } = await import("../../du-platform-backend/db.ts");
const { db } = await import(
  "../../du-platform-backend/shared/databaseRuntime.ts"
);
const { createModularServer } = await import(
  "../../du-platform-backend/server.ts"
);
const { processNewsletterBatch } = await import(
  "../../du-platform-backend/modules/newsletter/worker.ts"
);
await initializeDatabase();
const server = createServer();
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + server.address().port;
process.env.APP_BASE_URL = base;
server.on(
  "request",
  createModularServer({
    backend: { db, serverStartedAt: Date.now() },
    staticPath: path.resolve("dist/public"),
  })
);
const [[product]] = await db.query(
  "SELECT * FROM shop_products WHERE slug='chevrons-world-cup-jersey' OR id=2 ORDER BY id LIMIT 1"
);
assert(product);
const output = process.env.PRELAUNCH_OUTPUT_DIR || "/tmp/du-prelaunch-browser";
await mkdir(output, { recursive: true });
const reports = [];
let browser;
try {
  for (const [engineName, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    browser = await engine.launch({ headless: true });
    for (const width of [375, 768, 1440])
      for (const language of ["en", "de", "sn", "nd"]) {
        const locale = JSON.parse(
          await readFile(
            `du-platform-frontend/public/locales/${language}/translation.json`,
            "utf8"
          )
        );
        for (const state of ["low", "zero", "unpublished", "missing"]) {
          await db.execute(
            "UPDATE shop_products SET stock_qty=?,is_active=? WHERE id=?",
            [
              state === "low" ? 1 : 0,
              state === "unpublished" ? 0 : 1,
              product.id,
            ]
          );
          // The catalogue cache is intentionally bypassed only in this isolated fixture.
          const { updateShopProductAdmin } = await import(
            "../../du-platform-backend/shared/persistence/shopStore.ts"
          );
          await updateShopProductAdmin(product.id, {
            stock_qty: state === "low" ? 1 : 0,
            is_active: state === "unpublished" ? 0 : 1,
          });
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            reducedMotion: "reduce",
          });
          const id = state === "missing" ? 999999 : product.id;
          await context.addInitScript(
            ({ id }) => {
              localStorage.setItem("du_cookie_consent_v1", "rejected");
              if (!localStorage.getItem("shop_cart_v1"))
                localStorage.setItem(
                  "shop_cart_v1",
                  JSON.stringify([{ productId: id, quantity: 3 }])
                );
            },
            { id }
          );
          const page = await context.newPage(),
            errors = [];
          await page.route("**/api/auth/token/refresh", route =>
            route.fulfill({
              status: 401,
              json: { message: "Synthetic guest session" },
            })
          );
          page.on("response", r => {
            if (
              r.status() >= 400 &&
              !r.url().includes("/api/me") &&
              !r.url().includes("/api/auth/")
            )
              errors.push(`${r.status()} ${new URL(r.url()).pathname}`);
          });
          page.on("pageerror", e => errors.push(e.message));
          await page.goto(
            `${base}/shop/products?category=all&cart=1&lng=${language}`
          );
          const cart = page.locator("#shop-cart-checkout");
          await cart
            .getByText(locale.product_interest.saved_notice, { exact: true })
            .first()
            .waitFor();
          assert.equal(
            await cart.locator("input[type=email]").count(),
            0,
            "Invalid/prelaunch basket must not request an address"
          );
          assert.equal(
            await cart
              .getByRole("button", {
                name: locale.shop.products.actions.place_order,
                exact: true,
              })
              .count(),
            0
          );
          assert(
            !/shop\.products\.|product_interest\./.test(await cart.innerText()),
            "No raw translation keys"
          );
          assert.deepEqual(
            await page.evaluate(() =>
              JSON.parse(localStorage.getItem("shop_cart_v1"))
            ),
            [{ productId: id, quantity: 3 }]
          );
          await page.reload();
          await cart
            .getByText(locale.product_interest.saved_notice, { exact: true })
            .first()
            .waitFor();
          if (state === "zero") {
            await cart
              .locator(`[data-product-interest="${product.slug}"]`)
              .click();
            const dialog = page.getByRole("dialog");
            await dialog.waitFor();
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            await page.goto(
              `${base}/shop/product/${product.slug}?lng=${language}`
            );
            await page
              .locator(`[data-product-interest="${product.slug}"]`)
              .waitFor();
            await page.goBack();
            await cart.waitFor();
            assert.equal(
              (
                await page.evaluate(() =>
                  JSON.parse(localStorage.getItem("shop_cart_v1"))
                )
              )[0].quantity,
              3
            );
          }
          if (
            (width === 375 && language === "en") ||
            (width === 1440 && language === "de")
          )
            await page.screenshot({
              path: `${output}/${engineName}-${width}-${language}-${state}.png`,
              fullPage: false,
            });
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth
            ),
            "No horizontal overflow"
          );
          assert.deepEqual(errors, []);
          const actionKey =
            state === "low" || state === "zero"
              ? locale.shop.products.cart.update_stock
              : locale.shop.products.cart.remove_unavailable;
          await cart
            .getByRole("button", { name: actionKey, exact: true })
            .click();
          const expected =
            state === "low" ? [{ productId: id, quantity: 1 }] : [];
          assert.deepEqual(
            await page.evaluate(() =>
              JSON.parse(localStorage.getItem("shop_cart_v1"))
            ),
            expected
          );
          await page.reload();
          await cart.waitFor();
          assert.deepEqual(
            await page.evaluate(() =>
              JSON.parse(localStorage.getItem("shop_cart_v1"))
            ),
            expected,
            "Deliberate basket edits survive refresh"
          );
          assert.equal(
            await cart.locator("input[type=email]").count(),
            0,
            "Prelaunch blocks address collection even with a valid basket"
          );
          if (state === "low") {
            await page.evaluate(() => {
              localStorage.setItem("shop_cart_v1", "corrupt");
            });
            await page.reload();
            await cart.waitFor();
            await page.evaluate(id => {
              const value = JSON.stringify([{ productId: id, quantity: 3 }]);
              localStorage.setItem("shop_cart_v1", value);
              dispatchEvent(
                new StorageEvent("storage", {
                  key: "shop_cart_v1",
                  newValue: value,
                  storageArea: localStorage,
                })
              );
            }, id);
            await cart
              .getByText(locale.product_interest.saved_notice, { exact: true })
              .first()
              .waitFor();
            assert(!/shop\.products\./.test(await cart.innerText()));
          }
          reports.push({
            engine: engineName,
            width,
            language,
            state,
            passed: true,
          });
          await context.close();
        }
      }
    await db.execute(
      "UPDATE shop_products SET stock_qty=0,is_active=1 WHERE id=?",
      [product.id]
    );
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
      }),
      page = await context.newPage();
    await page.goto(`${base}/shop/product/${product.slug}`);
    await page.locator(`[data-product-interest="${product.slug}"]`).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .locator("input[type=email]")
      .fill(`${engineName}@example.test`);
    await dialog
      .getByRole("button", {
        name: "Email me a confirmation link",
        exact: true,
      })
      .click();
    await dialog.getByRole("status").waitFor();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const register = () =>
      context.request.post(`${base}/api/shop/restock-notifications`, {
        data: {
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          email: `${engineName}@example.test`,
          language: "en",
        },
      });
    const duplicate = await register();
    assert.equal(duplicate.status(), 200);
    assert((await duplicate.json()).data.requiresConfirmation);
    const [[job]] = await db.query(
      "SELECT * FROM newsletter_deliveries WHERE recipient=? AND kind='interest_confirm' ORDER BY id DESC LIMIT 1",
      [`${engineName}@example.test`]
    );
    const payload = JSON.parse(job.payload),
      confirm = payload.text.match(
        /http[^\s]+#action=confirm&token=[a-f0-9]+/
      )[0],
      cancel = payload.text.match(
        /http[^\s]+#action=cancel&token=[a-f0-9]+/
      )[0];
    let sends = 0;
    await processNewsletterBatch(
      db,
      async () => {
        sends++;
        throw new Error("Synthetic provider outage");
      },
      1
    );
    assert.equal(sends, 1);
    await db.execute(
      "UPDATE newsletter_deliveries SET available_at=NOW() WHERE id=?",
      [job.id]
    );
    await processNewsletterBatch(
      db,
      async () => {
        sends++;
        return "fixture-accepted";
      },
      1
    );
    assert.equal(sends, 2);
    await page.goto(confirm);
    await page
      .getByRole("button", { name: "Confirm product interest", exact: true })
      .click();
    await page.getByRole("status").waitFor();
    assert(!page.url().includes("token="));
    await page.goto(confirm);
    await page
      .getByRole("button", { name: "Confirm product interest", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await page.goto(cancel);
    await page
      .getByRole("button", { name: "Cancel this product alert", exact: true })
      .click();
    await page.getByRole("status").waitFor();
    assert.equal(
      (
        await context.request.get(`${base}/api/admin/product-interest`)
      ).status(),
      401
    );
    const blocked = await context.request.post(`${base}/api/shop/orders`, {
      data: {
        customerName: "Fixture",
        customerEmail: "fixture@example.test",
        shippingCountry: "Germany",
        shippingCity: "Berlin",
        shippingAddress: "Synthetic",
        paymentMethod: "manual_assisted",
        items: [{ productId: product.id, quantity: 1 }],
      },
    });
    assert.equal(blocked.status(), 409);
    reports.push({
      engine: engineName,
      confirmationCancellationDuplicateOutageRetryAndAdminProtection: true,
    });
    await context.close();
    await browser.close();
    browser = null;
  }
  await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  console.log(
    `PASS ${reports.length} prelaunch browser scenarios; no real services or subscribers`
  );
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
  await db.query("DROP DATABASE du_prelaunch_browser_test");
  await db.end();
}
