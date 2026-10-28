import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";
import { getPublicShopSeedProducts } from "../../du-platform-backend/contracts/shopCatalog.ts";

// UI fixtures only: no .env, database, provider, customer or production writes.
const root = resolve("du-platform-frontend/dist");
const output = process.env.UI_OUTPUT_DIR || "/tmp/du-ui-consistency";
const engine = process.env.UI_BROWSER || "chromium";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
await readFile(resolve(root, "index.html"));
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname
    );
    const file = resolve(
      root,
      "." + (extname(pathname) ? pathname : "/index.html")
    );
    assert(file.startsWith(root + sep));
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
});
await mkdir(output, { recursive: true });
const checks = [],
  failures = [],
  errors = [],
  network = [];
const products = getPublicShopSeedProducts();
const paths = [
  "/",
  "/shop",
  "/shop/products",
  "/shop/product/sables-rugby-home-kit",
  "/shop/interest",
  "/shop/order-status",
  "/technology",
  "/investment",
  "/investment/opportunities",
  "/investment/projects/masuwe",
  "/investment/projects/unknown",
  "/ntir",
  "/travel",
  "/login?next=/admin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/newsletter",
  "/regulations",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-settings",
  "/legal-notice",
  "/delivery-and-returns",
  "/search?q=tourism",
  "/onesa-ai-chat",
  "/travel/planner",
  "/travel/augmented-experience",
  "/travel/virtual-experience",
  "/not-a-real-route",
];
const pass = name => {
  checks.push(name);
  console.log("PASS " + name);
};
const assertFits = async page =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    ),
    "Page overflows horizontally"
  );
const screenshot = async (page, name) => {
  if (!(await page.getByRole("dialog").count())) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(100);
  }
  return page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
};
const targetSize = async locator => {
  const box = await locator.boundingBox();
  assert(
    box && box.width >= 44 && box.height >= 44,
    "Touch control must be at least 44px in each dimension"
  );
};
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    let admin = false,
      searchFailed = false;
    await context.addInitScript(() => {
      localStorage.setItem("du_cookie_consent_v1", "rejected");
      localStorage.setItem("i18nextLng", "en");
    });
    await context.route("**/*", route => {
      const u = new URL(route.request().url());
      if (u.origin !== base) return route.abort();
      if (!u.pathname.startsWith("/api/")) return route.continue();
      // Reject unexpected mutations; these checks open forms without submitting data.
      assert.equal(
        route.request().method(),
        "GET",
        "Unexpected UI test mutation"
      );
      let json = {
        ready: false,
        online: false,
        user: null,
        rows: [],
        results: [],
        profile: null,
        products: [],
        stories: [],
      };
      if (u.pathname === "/api/shop/products")
        json = {
          products,
          readiness: {
            mode: "prelaunch",
            enforcement: "enforced",
            commercialReady: false,
            missing: ["stock"],
            destinationCountries: [],
            approvedProductIds: [],
          },
        };
      if (u.pathname.endsWith("/auth/me") && admin)
        json = {
          user: {
            id: 1,
            email: "ui-admin@example.test",
            fullName: "UI fixture",
            role: "admin",
          },
        };
      if (u.pathname.endsWith("/newsletter/subscribers"))
        json = {
          rows: [],
          counts: {},
          total: 0,
          sender: { ready: false, from: "" },
        };
      if (u.pathname.endsWith("/newsletter/deliveries"))
        json = { rows: [], total: 0 };
      if (u.pathname.endsWith("/admin/shop-products"))
        json = { rows: products };
      if (u.pathname === "/api/search") {
        if (searchFailed)
          return route.fulfill({
            status: 503,
            json: { message: "Search unavailable" },
          });
        json = {
          results: [
            {
              title: "Zimbabwe tourism",
              href: "/travel",
              category: "Tourism",
              summary: "Explore destinations and planning tools.",
            },
          ],
        };
      }
      return route.fulfill({ json });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", e => errors.push({ width, message: e.message }));
    page.on("response", r => {
      if (r.status() >= 400 && !r.url().includes("/api/search"))
        network.push({ width, url: r.url(), status: r.status() });
    });
    const goto = async path => {
      await page.goto(base + path);
      await page.locator("main h1").first().waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
    };
    for (const path of paths) {
      try {
        await goto(path);
        // Trigger lazy image/section observers before screenshots and image checks.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 750) {
            scrollTo(0, y);
            await new Promise(r => setTimeout(r, 40));
          }
          scrollTo(0, 0);
        });
        await page.waitForTimeout(150);
        await assertFits(page);
        for (const button of await page.locator("main button").all()) {
          if (await button.isVisible())
            assert(
              (await button.boundingBox()).height >= 44,
              "Main action is too short"
            );
        }
        for (const select of await page.locator("main select").all()) {
          if (await select.isVisible())
            assert(
              (await select.boundingBox()).height >= 44,
              "Native select is too short"
            );
        }
        assert.equal(
          await page.evaluate(
            () =>
              [...document.images].filter(
                i => i.complete && i.currentSrc && !i.naturalWidth
              ).length
          ),
          0,
          "Broken image"
        );
        await screenshot(page, `${width}-${path.replace(/[^a-z0-9]/gi, "_")}`);
        pass(`${width}px ${path}`);
      } catch (e) {
        failures.push(`${width}px ${path}: ${e.message}`);
      }
    }
    await goto("/shop");
    const currency = page.locator(".shop-currency-control");
    const contrast = await currency.evaluate(element => {
      const luminance = color => {
        const channels = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map(channel => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const background = luminance(
        getComputedStyle(element.closest("section")).backgroundColor
      );
      const label = luminance(
        getComputedStyle(element.querySelector("label")).color
      );
      const note = luminance(
        getComputedStyle(element.querySelector("p")).color
      );
      const select = getComputedStyle(element.querySelector("select"));
      return {
        label: ratio(label, background),
        note: ratio(note, background),
        field: ratio(
          luminance(select.color),
          luminance(select.backgroundColor)
        ),
        scheme: select.colorScheme,
      };
    });
    assert(
      contrast.label >= 4.5 && contrast.note >= 4.5 && contrast.field >= 4.5,
      "Currency controls need readable contrast"
    );
    assert.equal(contrast.scheme, "light");
    await currency.locator("select").selectOption("USD");
    await currency.locator("select").selectOption("EUR");
    pass(`${width}px readable light-surface currency preference`);
    if (width < 1024) {
      const menu = page.getByRole("button", { name: "Open menu", exact: true });
      await menu.click();
      const menuBox = await page.getByRole("dialog").boundingBox();
      assert(
        menuBox && menuBox.y + menuBox.height <= 900,
        "Menu is clipped below the viewport"
      );
      await screenshot(page, `${width}-navigation-menu`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector('[role="dialog"]')
      );
      pass(`${width}px navigation menu stays inside viewport`);
    }

    await goto("/login?next=/admin");
    const title = await page.locator("h1").boundingBox(),
      close = await page
        .getByRole("button", { name: "Cancel login" })
        .boundingBox();
    assert(
      title.y >= close.y + close.height || title.x + title.width <= close.x,
      "Auth heading overlaps close control"
    );
    pass(`${width}px admin heading clears close control`);

    await goto("/travel/planner");
    for (const name of [
      "Increase adults",
      "Decrease adults",
      "Increase infants",
      "Decrease infants",
    ])
      await targetSize(page.getByRole("button", { name, exact: true }));
    assert(
      await page
        .getByRole("button", { name: "Decrease adults", exact: true })
        .isDisabled()
    );
    await page
      .getByRole("button", { name: "Increase adults", exact: true })
      .click();
    assert(
      !(await page
        .getByRole("button", { name: "Decrease adults", exact: true })
        .isDisabled())
    );
    await page
      .getByRole("button", { name: "Decrease adults", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "Decrease adults", exact: true })
        .isDisabled()
    );
    const wildlife = page.getByRole("button", {
      name: "Wildlife",
      exact: true,
    });
    assert.equal(await wildlife.getAttribute("aria-pressed"), "true");
    await wildlife.click();
    assert.equal(await wildlife.getAttribute("aria-pressed"), "false");
    assert.equal(
      await page
        .locator('input[type="date"]')
        .first()
        .evaluate(e => getComputedStyle(e).colorScheme),
      "dark"
    );
    await assertFits(page);
    await screenshot(page, `${width}-planner-controls`);
    pass(
      `${width}px planner touch areas, passenger bounds and selected interests`
    );

    // Contact uses a portal: confirm it inherits the page's field/focus system.
    const contact = page.getByRole("button", {
      name: "Send a message",
      exact: true,
    });
    await contact.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const field = dialog.locator('input[type="email"]');
    // Filling alone does not wait for a portaled opening transform to settle.
    await field.click();
    await field.fill("reader@example.test");
    assert(
      (await field.boundingBox()).height >= 44,
      "Dialog field is too short"
    );
    if (width === 375)
      assert(
        await field.evaluate(
          e => parseFloat(getComputedStyle(e).fontSize) >= 16
        ),
        "Small-screen fields must avoid iOS auto-zoom"
      );
    assert((await dialog.boundingBox()).height <= 900 - 32);
    await field.focus();
    assert.notEqual(
      await field.evaluate(e => getComputedStyle(e).outlineStyle),
      "none"
    );
    await screenshot(page, `${width}-contact-dialog`);
    await page.keyboard.press("Escape");
    assert(await contact.evaluate(e => e === document.activeElement));
    pass(
      `${width}px scrollable contact dialog, readable fields and focus restoration`
    );

    await goto("/shop");
    await page
      .getByRole("button", { name: "Register interest", exact: true })
      .first()
      .click();
    await page.getByRole("dialog").waitFor();
    await assertFits(page);
    await screenshot(page, `${width}-product-interest-dialog`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    pass(`${width}px product interest dialog`);

    await goto("/travel");
    const destination = page.locator(".discovery-tile-target").first();
    await destination.click();
    await page.getByRole("dialog").waitFor();
    await screenshot(page, `${width}-destination-dialog`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      document.activeElement?.matches(".discovery-tile-target")
    );
    assert(await destination.evaluate(e => e === document.activeElement));
    pass(`${width}px destination dialog and keyboard return`);

    searchFailed = true;
    await goto("/search?q=tourism");
    await page
      .getByRole("button", { name: "Try again", exact: true })
      .waitFor();
    await assertFits(page);
    await screenshot(page, `${width}-search-error`);
    searchFailed = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByRole("link", { name: /Zimbabwe tourism/ }).waitFor();
    pass(`${width}px search error and recovery`);

    admin = true;
    await goto("/admin");
    await page
      .getByRole("heading", { name: "Admin Dashboard", exact: true })
      .waitFor();
    await assertFits(page);
    const subscriberSearch = page.getByPlaceholder("Find a subscriber");
    await subscriberSearch.waitFor();
    assert(
      (await subscriberSearch.boundingBox()).width >=
        (width === 375 ? 200 : 180),
      "Subscriber search field is squeezed"
    );
    await screenshot(page, `${width}-admin-newsletter`);
    await page.getByRole("button", { name: /Shop Products/ }).click();
    await page.locator("#admin-product-name").waitFor();
    await assertFits(page);
    await screenshot(page, `${width}-admin-shop`);
    pass(`${width}px synthetic admin newsletter and shop`);
    const links = page.locator(".footer-bottom-links a");
    for (const link of await links.all())
      assert((await link.boundingBox()).height >= 44);
    if (width === 1440) {
      const boxes = await links.evaluateAll(es =>
        es.map(e => e.getBoundingClientRect().y)
      );
      assert(
        Math.max(...boxes) - Math.min(...boxes) < 1,
        "Footer links are misaligned"
      );
    }
    pass(`${width}px consistent footer targets and alignment`);
    const phone = page.getByRole("button", {
      name: "+49 151 474 16152",
      exact: true,
    });
    await phone.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Call", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      document.activeElement?.textContent?.includes("+49 151 474 16152")
    );
    pass(`${width}px footer contact keyboard menu and focus return`);

    await context.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(network.length, 0, JSON.stringify(network));
  assert.equal(failures.length, 0, JSON.stringify(failures));
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ engine, checks, failures, errors, network }, null, 2)
  );
  await browser.close();
  await new Promise(done => server.close(done));
}
console.log(JSON.stringify({ engine, passed: checks.length, output }));
