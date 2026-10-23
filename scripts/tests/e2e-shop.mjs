import { getPublicShopSeedProducts } from "../../shared/shopCatalog.ts";
import assert from "node:assert/strict";
import { calculateShopShippingCents } from "../../shared/shopCheckout.ts";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";

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
const engine = process.env.SHOP_BROWSER_ENGINE === "webkit" ? webkit : chromium;
const browser = await engine.launch({
  ...(engine === chromium && channel !== "chromium" ? { channel } : {}),
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
    colorScheme: "dark",
  });
  contexts.push(context);
  await context.addInitScript(() =>
    localStorage.setItem("du_cookie_consent_v1", "rejected")
  );
  let catalogRequests = 0;
  let failCatalog = options.failCatalog;
  let failOrder = false;
  let submittedOrder;
  let loseOrderResponse = false;
  let orderRequests = 0;
  const savedOrders = new Map();
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
      orderRequests++;
      submittedOrder = route.request().postDataJSON();
      if (failOrder)
        return route.fulfill({
          status: 503,
          json: { message: "Please retry checkout" },
        });
      const key = submittedOrder.requestToken;
      if (!savedOrders.has(key)) {
        const items = submittedOrder.items.map(item => {
          const p = products.find(p => p.id === item.productId);
          return {
            ...item,
            productName: p.name,
            lineTotalCents: p.price_cents * item.quantity,
          };
        });
        const subtotalCents = items.reduce(
          (sum, item) => sum + item.lineTotalCents,
          0
        );
        const shippingCents = calculateShopShippingCents(
          subtotalCents,
          submittedOrder.deliverySpeed
        );
        savedOrders.set(key, {
          orderRef: `DU-LOCAL-TEST-${savedOrders.size + 1}`,
          status: "awaiting_payment",
          paymentMethod: "manual_assisted",
          manageToken: key,
          currency: "EUR",
          deliverySpeed: submittedOrder.deliverySpeed,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          items,
        });
      }
      if (loseOrderResponse) {
        loseOrderResponse = false;
        return route.abort("connectionreset");
      }
      return route.fulfill({ json: { order: savedOrders.get(key) } });
    }
    if (url.pathname.endsWith("/workflow"))
      return route.fulfill({
        json: {
          stage: "request_received",
          version: 0,
          quotes: [],
          history: [],
          quoteExpired: false,
        },
      });
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
    orderRequests: () => orderRequests,
    savedOrders: () => savedOrders.size,
    loseOrderResponse: () => {
      loseOrderResponse = true;
    },
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
    assert.equal(
      await page.locator(".shop-landing .discovery-hero").count(),
      1
    );
    assert.equal(
      await page
        .locator('.discovery-hero a[href="/shop/products?category=all"]')
        .count(),
      1
    );
    await page
      .getByRole("link", { name: "Explore categories", exact: true })
      .click();
    await page.waitForFunction(() => {
      const top = document
        .getElementById("collections")
        .getBoundingClientRect().top;
      return top >= 50 && top <= 90;
    });
    const cartLink = page.locator("#collections .shop-cart-link");
    assert.doesNotMatch(
      await cartLink.textContent(),
      /shop\./,
      "Cart action must display a translated label"
    );
    assert(
      await cartLink.evaluate(el => {
        const luminance = color =>
          color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map(value => value / 255)
            .map(value =>
              value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4
            )
            .reduce(
              (sum, value, index) =>
                sum + value * [0.2126, 0.7152, 0.0722][index],
              0
            );
        const style = getComputedStyle(el),
          foreground = luminance(style.color),
          background = luminance(style.backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05) >=
          4.5
        );
      }),
      "Cart label must have accessible contrast on the discovery section"
    );
    const mazoe = products.find(p => p.slug === "mazoe-orange-2l-case-6");
    const rail = page.locator(".swipe-rail");
    assert.equal(
      await rail.count(),
      1,
      "Featured products use one swipeable row"
    );
    assert.equal(await rail.locator("[data-shop-product-card]").count(), 8);
    const viewport = rail.locator(".swipe-rail-viewport");
    await viewport.scrollIntoViewIfNeeded();
    const bounds = await viewport.boundingBox();
    const screenWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    assert(
      Math.abs(bounds.x) <= 1 && Math.abs(bounds.width - screenWidth) <= 1,
      "Shop rail spans the screen edges"
    );
    const tops = await rail
      .locator("[data-shop-product-card]")
      .evaluateAll(cards =>
        cards.map(card => card.getBoundingClientRect().top)
      );
    assert(
      tops.every(top => Math.abs(top - tops[0]) < 1),
      "Products remain in one row"
    );
    await viewport.focus();
    await viewport.press("End");
    await page.waitForFunction(
      el => el.disabled,
      await rail.getByRole("button", { name: /^Next:/ }).elementHandle()
    );
    const last = await rail.locator(".swipe-rail-item").last().boundingBox();
    assert(
      last.x >= 0 && last.x + last.width <= screenWidth + 1,
      "Last product is fully reachable"
    );
    const lastProduct = products.find(p => p.slug === "sables-rugby-home-kit");
    await card(lastProduct.slug)
      .getByRole("button", { name: /^Add to Cart:/ })
      .click();
    assert.deepEqual(await cart(), [
      { productId: lastProduct.id, quantity: 1 },
    ]);
    await card(lastProduct.slug)
      .getByRole("button", { name: /^Remove one/ })
      .click();
    assert.deepEqual(await cart(), []);
    await viewport.press("Home");
    await rail.getByRole("button", { name: /^Next:/ }).click();
    await page.waitForFunction(
      el => el.scrollLeft > 5,
      await viewport.elementHandle()
    );
    await viewport.focus();
    await viewport.press("Home");
    // Repeat the immediate drag-to-Home handoff to catch pending WebKit snap races.
    for (let gesture = 0; gesture < 3; gesture++) {
      const dragBounds = await viewport.boundingBox();
      const dragX = Math.min(screenWidth - 30, 280);
      const dragY = dragBounds.y + 80;
      await page.mouse.move(dragX, dragY);
      await page.mouse.down();
      await page.mouse.move(24, dragY, { steps: 16 });
      await page.mouse.up();
      await page.waitForFunction(
        el => el.scrollLeft > 30,
        await viewport.elementHandle()
      );
      assert.deepEqual(
        await cart(),
        [],
        "Dragging product cards must not add items"
      );
      await viewport.focus();
      await viewport.press("Home");
      await page.waitForFunction(
        el => el.disabled,
        await rail.getByRole("button", { name: /^Previous:/ }).elementHandle()
      );
      await viewport.evaluate(el => el.blur());
    }
    await page.screenshot({ path: `${output}/shop-rail-${width}.png` });
    pass(
      `${width}: one edge-to-edge product row; arrows, keyboard, drag and final-product cart controls`
    );
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
    await card("shona-stone-sculpture")
      .getByRole("button", { name: /Notify Me/i })
      .click();
    await dialog.locator("input[type=email]").fill("test@example.test");
    await dialog
      .getByRole("button", { name: "Notify Me", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await page.locator("[data-sonner-toast]").waitFor();
    // Notifications follow the app theme even when the OS prefers dark mode.
    assert.equal(
      await page
        .locator("[data-sonner-toaster]")
        .getAttribute("data-sonner-theme"),
      "light"
    );
    // Checkout is fully mocked; no orders, email, or production writes occur.
    if (width < 1024)
      await page
        .getByRole("button", { name: "Review basket", exact: true })
        .click();
    const checkoutPanel = page.getByRole("form", {
      name: "Cart & order request",
      exact: true,
    });
    await page
      .locator("#shop-cart-checkout")
      .evaluate(element =>
        element.scrollIntoView({ block: "start", behavior: "instant" })
      );
    if (width >= 1024) {
      const pageScroll = await page.evaluate(() => scrollY);
      await checkoutPanel.hover({ position: { x: 16, y: 16 } });
      await page.mouse.wheel(0, 400);
      await page.waitForFunction(
        element => element.scrollTop > 100,
        await checkoutPanel.elementHandle()
      );
      assert.equal(
        await page.evaluate(() => scrollY),
        pageScroll,
        "Scrolling the checkout panel must leave the product page stationary"
      );
      await checkoutPanel.evaluate(element => {
        element.scrollTop = element.scrollHeight;
      });
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => scrollY),
        pageScroll,
        "Reaching the end of checkout must not chain scrolling to the page"
      );
      const sendRequest = checkoutPanel.getByRole("button", {
        name: "Send order request",
        exact: true,
      });
      assert(await sendRequest.isVisible());
      const submitBounds = await sendRequest.boundingBox();
      assert(
        submitBounds.y >= 56 && submitBounds.y + submitBounds.height <= 900
      );
      await checkoutPanel.evaluate(element => {
        element.scrollTop = 0;
      });
      await checkoutPanel.focus();
      await page.keyboard.press("PageDown");
      await page.waitForFunction(
        element => element.scrollTop > 50,
        await checkoutPanel.elementHandle()
      );
      assert.equal(await page.evaluate(() => scrollY), pageScroll);
      pass(`${width}px checkout scrolls independently with mouse and keyboard`);
      await checkoutPanel.evaluate(element => {
        element.scrollTop = 0;
      });
    } else {
      assert.equal(
        await checkoutPanel.evaluate(
          element => getComputedStyle(element).overflowY
        ),
        "visible"
      );
      const sendRequest = checkoutPanel.getByRole("button", {
        name: "Send order request",
        exact: true,
      });
      await sendRequest.scrollIntoViewIfNeeded();
      const bounds = await sendRequest.boundingBox();
      assert(bounds.y >= 56 && bounds.y + bounds.height <= 900);
      await checkoutPanel.locator("input").first().focus();
      await page.keyboard.press("PageDown");
      assert.equal(
        await checkoutPanel.evaluate(element => element.scrollTop),
        0,
        "Mobile must scroll the page, without a nested form scroller"
      );
      pass(
        `${width}px checkout scrolls naturally with reachable submit controls`
      );
      await checkoutPanel.scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: `${output}/cart-panel-${width}.png` });
    assert.equal(
      await page.locator("#shop-payment-dummy_gateway").count(),
      0,
      "Production builds must not offer simulated payment even with a local development environment file"
    );
    await page.getByLabel("Full Name", { exact: true }).fill("Local Test");
    await page
      .getByLabel("Email Address", { exact: true })
      .fill("test@example.test");
    await page.getByLabel("Country", { exact: true }).fill("Zimbabwe");
    await page.getByLabel("City", { exact: true }).fill("Harare");
    await page
      .getByLabel("Shipping Address", { exact: true })
      .fill("Local mock address");
    // Native form constraints block malformed identity and support Enter submission.
    await page.getByLabel("Email Address", { exact: true }).fill("invalid");
    await page
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    assert.equal(t.orderRequests(), 0, "Invalid email must not reach the API");
    await page
      .getByLabel("Email Address", { exact: true })
      .fill("test@example.test");
    await page.getByLabel("City", { exact: true }).fill("   ");
    await page
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    assert.equal(
      t.orderRequests(),
      0,
      "Whitespace-only delivery details must not reach the API"
    );
    await page.getByLabel("City", { exact: true }).fill("Berlin");
    t.failOrder(true);
    await page
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Please retry checkout" })
      .waitFor();
    assert.equal((await cart())[0].quantity, 2);
    t.failOrder(false);
    t.loseOrderResponse();
    await page
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: /could not be saved/i })
      .waitFor();
    const lostToken = t.submitted().requestToken;
    assert.equal((await cart())[0].quantity, 2);
    await page
      .getByRole("button", { name: "Send order request", exact: true })
      .click();
    await page.getByText("LOCAL-TEST", { exact: false }).first().waitFor();
    assert.deepEqual(await cart(), []);
    assert.equal(
      t.submitted().requestToken,
      lostToken,
      "Lost responses must retry the same private grant"
    );
    assert.equal(t.savedOrders(), 1, "A retry must not create another order");
    assert.deepEqual(t.submitted().items, [{ productId: 1, quantity: 2 }]);
    await page.reload();
    await page.getByText("DU-LOCAL-TEST-1", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Full Name", { exact: true }).count(),
      0,
      "A restored receipt must replace the empty checkout form"
    );
    assert.equal(
      await page.getByText("€0.00", { exact: true }).count(),
      0,
      "A receipt must not show empty-basket totals"
    );
    assert.equal(
      await page.locator('main a[href^="https://wa.me/4915147416152"]').count(),
      1
    );
    assert(
      await page
        .locator('main a[href^="mailto:info@diasporaunlocked.com"]')
        .getAttribute("href")
        .then(href => href.includes("DU-LOCAL-TEST-1"))
    );
    if (width < 1024) {
      await page
        .getByRole("button", { name: "Back to Products", exact: true })
        .click();
      assert(!new URL(page.url()).searchParams.has("cart"));
      await page.goBack();
      await page.getByText("DU-LOCAL-TEST-1", { exact: true }).waitFor();
    }
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      )),
      "No horizontal overflow"
    );
    await page.screenshot({ path: `${output}/checkout-${width}.png` });
    pass(
      `${width}px item click, +/−, shared cart, all products, inventory, reload, notify dialog, validation, lost-response retry, receipt reload, support handoff and checkout navigation`
    );
    await t.context.close();
  }
  for (const width of [375, 1440]) {
    const short = await setup(width);
    await short.context.addInitScript(() =>
      localStorage.setItem("shop_cart_v1", '[{"productId":1,"quantity":1}]')
    );
    await short.page.setViewportSize({ width, height: 600 });
    await short.page.goto(`${base}/shop/products?cart=1`);
    const panel = short.page.getByRole("form", {
      name: "Cart & order request",
      exact: true,
    });
    await panel.waitFor();
    if (width >= 1024) {
      await short.page.waitForFunction(
        element => {
          const bounds = element.getBoundingClientRect();
          return bounds.top >= 56 && bounds.bottom <= innerHeight;
        },
        await panel.elementHandle()
      );
      const initialBounds = await panel.boundingBox();
      assert(
        initialBounds.y >= 56 && initialBounds.y + initialBounds.height <= 600,
        "Checkout must fit below the page heading before the surrounding page scrolls"
      );
      const initialPageScroll = await short.page.evaluate(() => scrollY);
      await panel.hover({ position: { x: 16, y: 16 } });
      await short.page.mouse.wheel(0, 400);
      await short.page.waitForFunction(
        element => element.scrollTop > 100,
        await panel.elementHandle()
      );
      assert.equal(await short.page.evaluate(() => scrollY), initialPageScroll);
      await short.page
        .locator("#shop-cart-checkout")
        .evaluate(element =>
          element.scrollIntoView({ block: "start", behavior: "instant" })
        );
      await panel.hover({ position: { x: 16, y: 16 } });
      // Let the viewport-height observer settle after programmatic positioning.
      await short.page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );
      const y = await short.page.evaluate(() => scrollY);
      await short.page.mouse.wheel(0, 1000);
      await short.page.waitForFunction(
        element => element.scrollTop > 100,
        await panel.elementHandle()
      );
      assert.equal(await short.page.evaluate(() => scrollY), y);
    } else {
      assert.equal(
        await panel.evaluate(element => getComputedStyle(element).overflowY),
        "visible"
      );
    }
    const button = panel.getByRole("button", {
      name: "Send order request",
      exact: true,
    });
    await button.scrollIntoViewIfNeeded();
    const bounds = await button.boundingBox();
    assert(bounds.y >= 56 && bounds.y + bounds.height <= 600);
    await short.page.screenshot({ path: `${output}/cart-short-${width}.png` });
    pass(
      `${width}×600px checkout remains scrollable and its submit button reachable`
    );
    await short.context.close();
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
