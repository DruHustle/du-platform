// Synthetic catalogue/details only; no production integrations or email provider.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";
import { getPublicShopSeedProducts } from "../../shared/shopCatalog.ts";
import { readyShop } from "./shop-readiness-fixture.mjs";
const root = path.resolve("du-platform-frontend/dist"),
  out = process.env.SHOP_FOLLOWUP_OUTPUT || "/tmp/du-shop-followup";
await fs.mkdir(out, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = path.resolve(
      root,
      "." +
        (pathname === "/"
          ? "/index.html"
          : path.extname(pathname)
            ? pathname
            : pathname + ".html")
    );
    assert(file.startsWith(root + path.sep));
    const body = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + server.address().port;
const seeds = getPublicShopSeedProducts(),
  jersey = { ...seeds.find(p => p.id === 2), price_cents: 4460, stock_qty: 3 },
  other = { ...seeds.find(p => p.id === 1), stock_qty: 3 };
const prelaunch = {
  mode: "prelaunch",
  enforcement: "enforced",
  commercialReady: false,
  missing: [],
};
const results = [];
try {
  for (const [engine, driver] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await driver.launch();
    try {
      for (const language of ["en", "de", "sn", "nd"]) {
        const locale = JSON.parse(
          await fs.readFile(
            `du-platform-frontend/public/locales/${language}/translation.json`,
            "utf8"
          )
        );
        for (const width of [320, 375, 1440])
          for (const state of [
            "prelaunch-zero",
            "prelaunch-positive",
            "pilot-zero",
            "pilot-partial",
            "pilot-valid",
          ]) {
            if (width === 320 && state !== "prelaunch-zero") continue;
            const valid = state === "pilot-valid",
              products = [
                {
                  ...jersey,
                  stock_qty:
                    state.endsWith("zero") || state === "pilot-partial" ? 0 : 3,
                },
                other,
              ];
            const saved = [
              { productId: jersey.id, quantity: 1 },
              ...(state === "pilot-partial"
                ? [{ productId: other.id, quantity: 1 }]
                : []),
            ];
            const context = await browser.newContext({
              viewport: { width, height: 900 },
              reducedMotion: "reduce",
            });
            await context.addInitScript(
              ({ language, saved }) => {
                localStorage.setItem("i18nextLng", language);
                localStorage.setItem("du_cookie_consent_v1", "rejected");
                localStorage.setItem("shop_cart_v1", JSON.stringify(saved));
              },
              { language, saved }
            );
            const errors = [];
            const page = await context.newPage();
            page.setDefaultTimeout(10000);
            page.on("pageerror", e => errors.push(e.message));
            await context.route("**/api/**", route => {
              const p = new URL(route.request().url()).pathname;
              if (p === "/api/shop/products")
                return route.fulfill({
                  json: {
                    products,
                    readiness: state.startsWith("prelaunch")
                      ? prelaunch
                      : readyShop(products.map(p => p.id)),
                  },
                });
              return route.fulfill({
                json: { user: null, ready: false, profile: null, products: [] },
              });
            });
            await page.goto(
              base + "/shop/products?category=all&lng=" + language
            );
            await page.locator("[data-shop-product-card]").first().waitFor();
            if (width < 1024) {
              const summary = page.locator("[data-mobile-basket-summary]");
              await summary.waitFor();
              if (valid) assert((await summary.innerText()).includes("€56.60"));
              else {
                assert(
                  (await summary.innerText()).includes(
                    locale.product_interest.saved_basket
                  )
                );
                assert(!/[€$]|56[.,]60/.test(await summary.innerText()));
              }
              if (!valid) {
                const count = summary.locator("[data-mobile-basket-count]");
                assert(
                  await count.evaluate(e => {
                    const item = e.getBoundingClientRect(),
                      line = e.parentElement.getBoundingClientRect();
                    return (
                      item.left >= line.left && item.right <= line.right + 1
                    );
                  }),
                  "Saved-item count must be visible before the truncated label"
                );
              }
              if (state === "prelaunch-zero" && width < 1024)
                await page.screenshot({
                  path: `${out}/${engine}-${language}-${width}-summary.png`,
                });
              await summary.getByRole("button").click();
            }
            const cart = page.locator("#shop-cart-checkout");
            await cart.waitFor();
            if (valid) {
              await cart.locator("input[type=email]").waitFor();
              assert.equal(await cart.locator(".cart-totals").count(), 1);
              assert(
                (await cart.locator(".cart-totals").innerText()).includes(
                  "€56.60"
                )
              );
            } else {
              assert.equal(await cart.locator("input[type=email]").count(), 0);
              assert.equal(await cart.locator(".cart-totals").count(), 0);
              assert(
                (await cart.innerText()).includes(
                  locale.product_interest.saved_basket
                )
              );
            }
            assert.deepEqual(
              await page.evaluate(() =>
                JSON.parse(localStorage.getItem("shop_cart_v1"))
              ),
              saved
            );
            if (products[0].stock_qty === 0) {
              const remove = cart.getByRole("button", {
                name: locale.product_interest.remove_item,
                exact: true,
              });
              await remove.focus();
              assert(await remove.evaluate(e => e === document.activeElement));
              await page.keyboard.press("Enter");
              assert.deepEqual(
                await page.evaluate(() =>
                  JSON.parse(localStorage.getItem("shop_cart_v1"))
                ),
                saved.filter(i => i.productId !== jersey.id)
              );
            }
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1
              )
            );
            assert(
              !/shop\.products\.|product_interest\./.test(
                await cart.innerText()
              )
            );
            assert.deepEqual(errors, []);
            if (language === "en" && width === 375)
              await page.screenshot({ path: `${out}/${engine}-${state}.png` });
            results.push({ engine, language, width, state });
            await context.close();
          }
        // Hold information independently of catalogue; fail, retry, empty and route races.
        const context = await browser.newContext({
          viewport: { width: 375, height: 900 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(language => {
          localStorage.setItem("i18nextLng", language);
          localStorage.setItem("du_cookie_consent_v1", "rejected");
        }, language);
        let mode = "slow",
          release,
          started;
        const startedPromise = new Promise(r => (started = r));
        let held = new Promise(r => (release = r));
        await context.route("**/api/**", async route => {
          const p = new URL(route.request().url()).pathname;
          if (p === "/api/shop/products")
            return route.fulfill({
              json: { products: [jersey, other], readiness: prelaunch },
            });
          if (p.endsWith("/details")) {
            if (mode === "slow") {
              started();
              await held;
            }
            try {
              return await route.fulfill(
                mode === "failed"
                  ? { status: 503, json: { message: "Synthetic unavailable" } }
                  : mode === "unavailable"
                    ? { status: 404, json: { message: "Not found" } }
                    : {
                        json: {
                          details:
                            mode === "empty"
                              ? {}
                              : {
                                  materials: p.includes("/" + other.id + "/")
                                    ? "CURRENT PRODUCT"
                                    : "OLD RESPONSE",
                                },
                        },
                      }
              );
            } catch {
              return;
            }
          }
          return route.fulfill({ json: { user: null, ready: false } });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        await page.goto(
          base + "/shop/product/" + jersey.slug + "?lng=" + language
        );
        await startedPromise;
        await page
          .getByText(locale.pilot.details_loading, { exact: true })
          .waitFor();
        assert.equal(
          await page
            .getByText(locale.pilot.missing_details, { exact: true })
            .count(),
          0
        );
        mode = "failed";
        release();
        await page
          .getByText(locale.pilot.details_failed, { exact: true })
          .waitFor();
        mode = "empty";
        const retry = page.getByRole("button", {
          name: locale.pilot.details_retry,
          exact: true,
        });
        await retry.focus();
        await page.keyboard.press("Enter");
        await page
          .getByText(locale.pilot.missing_details, { exact: true })
          .waitFor();
        mode = "populated";
        await page.reload();
        await page.getByText("OLD RESPONSE", { exact: true }).waitFor();
        mode = "unavailable";
        await page.reload();
        await page
          .getByText(locale.pilot.product_unavailable, { exact: true })
          .waitFor();
        held = new Promise(r => (release = r));
        mode = "slow";
        await page.reload({ waitUntil: "domcontentloaded" });
        await page
          .getByText(locale.pilot.details_loading, { exact: true })
          .waitFor();
        // Browser history navigation preserves the React instance rather than remounting a new document.
        mode = "populated";
        await page.evaluate(slug => {
          history.pushState(null, "", "/shop/product/" + slug);
          dispatchEvent(new PopStateEvent("popstate"));
        }, other.slug);
        await page.getByText("CURRENT PRODUCT", { exact: true }).waitFor();
        release();
        await page.waitForTimeout(100);
        assert.equal(
          await page.getByText("OLD RESPONSE", { exact: true }).count(),
          0
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          )
        );
        await page.screenshot({
          path: `${out}/${engine}-${language}-details.png`,
        });
        results.push({
          engine,
          language,
          state: "details-loading-empty-failure-retry-unavailable-navigation",
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  await fs.writeFile(out + "/report.json", JSON.stringify(results, null, 2));
  console.log(
    `PASS ${results.length} focused shop scenarios: basket totals, explicit removal, product information and keyboard access`
  );
} finally {
  await new Promise(done => server.close(done));
}
