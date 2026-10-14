import { getPublicShopSeedProducts } from "../../shared/shopCatalog.ts";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Serve the production build without loading .env or contacting any service.
const root = resolve("dist/public");
const output = process.env.SHOP_OUTPUT_DIR || "/tmp/du-shop-tests";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname
    );
    const file = resolve(
      root,
      `.${extname(pathname) ? pathname : "/index.html"}`
    );
    if (!file.startsWith(root + sep)) throw new Error("Invalid path");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await readFile(resolve(root, "index.html"));
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base =
  process.env.SHOP_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const channel = process.env.SHOP_BROWSER_CHANNEL || "chrome";
const browser = await chromium.launch({
  channel: channel === "chromium" ? undefined : channel,
  headless: true,
});
const products = getPublicShopSeedProducts().map(product => ({
  ...product,
  stock_qty: product.slug === "shona-stone-sculpture" ? 0 : 3,
}));
const checks = [];
const errors = [];
const pass = name => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const contexts = [];
let currentPage;
await mkdir(output, { recursive: true });
const setup = async (width, options = {}) => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  contexts.push(context);
  await context.addInitScript(() =>
    localStorage.setItem("du_cookie_consent_v1", "rejected")
  );
  let catalogRequests = 0;
  let failCatalog = options.failCatalog;
  let failOrder = false;
  let submittedOrder;
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com")
      return route.fulfill({ contentType: "text/css", body: "" });
    if (url.pathname === "/api/shop/products") {
      catalogRequests++;
      // Expose the loading state, but never fabricate purchasable seed stock.
      await new Promise(done => setTimeout(done, 200));
      return route.fulfill(
        failCatalog
          ? { status: 503, json: { message: "Unavailable" } }
          : { json: { products } }
      );
    }
    if (url.pathname === "/api/shop/orders") {
      submittedOrder = route.request().postDataJSON();
      return route.fulfill(
        failOrder
          ? { status: 503, json: { message: "Please retry checkout" } }
          : {
              json: {
                order: {
                  orderRef: "LOCAL-TEST",
                  status: "pending",
                  totalCents: 6900,
                  paymentStatus: "pending",
                  paymentMethod: "manual_assisted",
                },
              },
            }
      );
    }
    if (url.pathname === "/api/shop/restock-notifications")
      return route.fulfill({ json: { message: "Notification saved" } });
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({ json: { user: null } });
    if (url.origin !== new URL(base).origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  currentPage = page;
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  const card = slug => page.locator(`[data-shop-product-card="${slug}"]`);
  const cart = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("shop_cart_v1") || "[]")
    );
  return {
    context,
    page,
    card,
    cart,
    requests: () => catalogRequests,
    recover: () => {
      failCatalog = false;
    },
    failOrder: value => {
      failOrder = value;
    },
    submitted: () => submittedOrder,
  };
};
try {
  for (const width of [375, 768, 1440]) {
    const t = await setup(width);
    const { page, card, cart } = t;
    await page.goto(`${base}/shop`);
    await card("mazoe-orange-2l-case-6")
      .locator('[data-slot="instant-image"]')
      .count();
    await card("mazoe-orange-2l-case-6")
      .getByRole("button", { name: /^Add to Cart:/ })
      .waitFor();
    await page.waitForFunction(() =>
      document.querySelector('[data-stock-state="in"]')
    );
    assert.equal(
      await page.getByText("How The Shop Works", { exact: true }).count(),
      0
    );
    const mazoe = products.find(p => p.slug === "mazoe-orange-2l-case-6");
    assert.equal(
      await card(mazoe.slug)
        .getByRole("button", { name: /^Remove one/ })
        .count(),
      0
    );
    await card(mazoe.slug)
      .getByRole("button", { name: `Add ${mazoe.name} to cart`, exact: true })
      .click();
    await card(mazoe.slug)
      .getByRole("button", { name: /^Remove one/ })
      .waitFor();
    assert.deepEqual(await cart(), [{ productId: mazoe.id, quantity: 1 }]);
    assert.equal(new URL(page.url()).pathname, "/shop");
    await card(mazoe.slug)
      .getByRole("button", { name: /^Add to Cart:/ })
      .click();
    await card(mazoe.slug)
      .getByRole("button", { name: /^Remove one/ })
      .click();
    assert.equal((await cart())[0].quantity, 1);
    await card(mazoe.slug)
      .getByRole("link", { name: /^Discover/ })
      .click();
    await page.waitForURL(/\/shop\/products\?/);
    await card(mazoe.slug).waitFor();
    assert.equal(
      (await cart())[0].quantity,
      1,
      "Discovering a category must not add a hidden SKU"
    );
    assert.equal(
      t.requests(),
      1,
      "Both shop routes must share one catalog request"
    );
    await card(mazoe.slug)
      .getByRole("button", { name: /^Remove one/ })
      .click();
    assert.deepEqual(await cart(), []);
    assert.equal(
      await card(mazoe.slug)
        .getByRole("button", { name: /^Remove one/ })
        .count(),
      0
    );
    await page.getByRole("link", { name: /Back to Shop/i }).click();
    await page.locator('main a[href="/shop/products?category=all"]').click();
    await page.locator("[data-shop-product-card]").nth(27).waitFor();
    assert.equal(await page.locator("[data-shop-product-card]").count(), 28);
    assert.equal(
      await page
        .locator("[data-shop-product-card]")
        .getByRole("button", { name: /^Add to Cart:/ })
        .count(),
      28
    );
    const rugby = card("sables-rugby-home-kit");
    for (let i = 0; i < 3; i++)
      await rugby.getByRole("button", { name: /^Add to Cart:/ }).click();
    assert(
      await rugby.getByRole("button", { name: /^Add to Cart:/ }).isDisabled()
    );
    assert.equal((await cart())[0].quantity, 3);
    await page.reload();
    await rugby.getByRole("button", { name: /^Remove one/ }).waitFor();
    assert.equal((await cart())[0].quantity, 3);
    await rugby.getByRole("button", { name: /^Remove one/ }).click();
    assert.equal((await cart())[0].quantity, 2);
    assert(
      await card("shona-stone-sculpture")
        .getByRole("button", { name: /^Add to Cart:/ })
        .isDisabled()
    );
    await card("shona-stone-sculpture")
      .getByRole("button", { name: /Notify Me/i })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    // Checkout is fully mocked; no orders, email, or production writes occur.
    if (width < 1024)
      await page.getByRole("button", { name: "Checkout", exact: true }).click();
    await page.getByLabel("Full Name", { exact: true }).fill("Local Test");
    await page
      .getByLabel("Email Address", { exact: true })
      .fill("test@example.test");
    await page.getByLabel("City", { exact: true }).fill("Berlin");
    await page
      .getByLabel("Shipping Address", { exact: true })
      .fill("Local mock address");
    t.failOrder(true);
    await page
      .getByRole("button", { name: "Place Order", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Please retry checkout" })
      .waitFor();
    assert.equal((await cart())[0].quantity, 2);
    t.failOrder(false);
    await page
      .getByRole("button", { name: "Place Order", exact: true })
      .click();
    await page.getByText("LOCAL-TEST", { exact: false }).first().waitFor();
    assert.deepEqual(await cart(), []);
    assert.deepEqual(t.submitted().items, [{ productId: 1, quantity: 2 }]);
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      )),
      "No horizontal overflow"
    );
    await page.screenshot({ path: `${output}/checkout-${width}.png` });
    pass(
      `${width}px item click, +/−, shared cart, all products, inventory, reload, notify dialog, failed and successful checkout`
    );
    await t.context.close();
  }
  const t = await setup(375, { failCatalog: true });
  await t.page.goto(`${base}/shop`);
  await t.page
    .getByRole("button", { name: "Try again", exact: true })
    .waitFor();
  assert(
    await t
      .card("sables-rugby-home-kit")
      .getByRole("button", { name: /^Add to Cart:/ })
      .isDisabled()
  );
  t.recover();
  await t.page.getByRole("button", { name: "Try again", exact: true }).click();
  await t.page.waitForFunction(() =>
    document.querySelector('[data-stock-state="in"]')
  );
  await t
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Add to Cart:/ })
    .click();
  assert.equal((await t.cart())[0].quantity, 1);
  pass(
    "availability failure preserves display, blocks purchases, and retries successfully"
  );
  const sync = await setup(375);
  await sync.page.goto(`${base}/shop`);
  await sync.page.waitForFunction(() =>
    document.querySelector('[data-stock-state="in"]')
  );
  const otherTab = await sync.context.newPage();
  await otherTab.goto(`${base}/privacy-policy`);
  await otherTab.evaluate(() =>
    localStorage.setItem("shop_cart_v1", '[{"productId":1,"quantity":2}]')
  );
  await sync
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .waitFor();
  await sync
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .click();
  assert.equal(
    await otherTab.evaluate(
      () => JSON.parse(localStorage.getItem("shop_cart_v1"))[0].quantity
    ),
    1
  );
  await otherTab.evaluate(() => localStorage.removeItem("shop_cart_v1"));
  await sync
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .waitFor({ state: "hidden" });
  pass(
    "cart updates immediately between browser tabs, including storage removal"
  );
  await sync.context.close();

  const blocked = await setup(375);
  await blocked.context.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "shop_cart_v1") throw new Error("Storage denied");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_cart_v1") throw new Error("Storage denied");
      return set.call(this, key, value);
    };
  });
  await blocked.page.goto(`${base}/shop`);
  await blocked.page.waitForFunction(() =>
    document.querySelector('[data-stock-state="in"]')
  );
  await blocked
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Add to Cart:/ })
    .click();
  await blocked
    .card("sables-rugby-home-kit")
    .getByRole("link", { name: /^Discover/ })
    .click();
  await blocked
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .waitFor();
  await blocked
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .click();
  await blocked
    .card("sables-rugby-home-kit")
    .getByRole("button", { name: /^Remove one/ })
    .waitFor({ state: "hidden" });
  pass(
    "blocked browser storage still permits a shared in-memory cart across routes"
  );
  await blocked.context.close();
  assert.deepEqual(errors, []);
  pass("zero browser runtime errors");
} catch (error) {
  await currentPage
    ?.screenshot({ path: `${output}/failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
  await new Promise(done => server.close(done));
}
