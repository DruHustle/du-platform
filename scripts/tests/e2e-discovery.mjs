import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Serve the production build without loading .env or contacting any service.
const root = resolve("dist/public");
const output = process.env.DISCOVERY_OUTPUT_DIR || "/tmp/du-discovery-tests";
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
const base = `http://127.0.0.1:${server.address().port}`;
const channel = process.env.DISCOVERY_BROWSER_CHANNEL || "chrome";
const browser = await chromium.launch({
  channel: channel === "chromium" ? undefined : channel,
  headless: true,
});
const checks = [],
  errors = [],
  failures = [];
const record = check => {
  checks.push(check);
  console.log(`PASS ${check.width || ""} ${check.scenario}`);
};
let page;
await mkdir(output, { recursive: true });
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await context.addInitScript(() => {
      localStorage.setItem("du_cookie_consent_v1", "rejected");
      localStorage.setItem("i18nextLng", "en");
    });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname === "fonts.googleapis.com")
        return route.fulfill({ contentType: "text/css", body: "" });
      if (url.pathname.startsWith("/api/"))
        return route.fulfill({ json: { user: null, products: [] } });
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("requestfailed", r => {
      if (!r.failure()?.errorText.includes("ERR_ABORTED"))
        failures.push(r.url());
    });
    for (const path of [
      "/technology",
      "/investment",
      "/tourism",
      "/investment/opportunities",
      "/regulations",
    ]) {
      await page.goto(base + path);
      await page.locator(".swipe-rail").first().waitFor();
      if (path === "/technology") {
        const tools = page.locator("#onesa-intro");
        assert.equal(await tools.locator("article").count(), 4);
        assert.deepEqual(
          await tools
            .locator("article a")
            .evaluateAll(links => links.map(link => link.getAttribute("href"))),
          [
            "/onesa-ai-chat",
            "/onesa-ai-book-trip",
            "/onesa-ai-tourism-virtual-experience",
            "/onesa-ai-tourism-augmented-experience",
          ]
        );
        assert.match(await tools.textContent(), /Sample City/);
        assert.equal(
          await page.locator("#technology-diaspora-use-cases ol > li").count(),
          3
        );
        const about = page.locator("#technology-onesa-vision details");
        await about.locator("summary").focus();
        await page.keyboard.press("Enter");
        assert((await about.getAttribute("open")) !== null);
        assert.match(await about.textContent(), /Onesa.*platform/);
        await page.keyboard.press("Space");
        await page
          .getByRole("link", { name: "Explore the tools", exact: true })
          .click();
        await page.waitForFunction(() => {
          const top = document
            .getElementById("onesa-intro")
            .getBoundingClientRect().top;
          return top >= 50 && top <= 90;
        });
      }
      if (path === "/tourism") {
        assert.equal(await page.locator("#plan-visit").count(), 0);
        assert.equal(
          await page
            .getByRole("heading", {
              name: "Essential Planning Information",
              exact: true,
            })
            .count(),
          0
        );
      }
      if (path === "/investment") {
        assert.equal(
          await page
            .getByRole("heading", {
              name: "Crowdfunding Opportunities",
              exact: true,
            })
            .count(),
          0
        );
        assert(await page.locator("#collective-model h2").isVisible());
        const ideas = page.locator("#investment-innovation-opportunities");
        const cards = ideas.locator("article");
        assert.equal(await cards.count(), 5);
        assert.doesNotMatch(
          await ideas.textContent(),
          /Dariusmutamba|Mulavu123|CC BY-SA|Optimised; cropped for display/
        );
        const creditsLink = page.getByRole("link", {
          name: "Image credits",
          exact: true,
        });
        const creditsResponse = await context.request.get(
          base + (await creditsLink.getAttribute("href"))
        );
        assert.equal(creditsResponse.status(), 200);
        const credits = await creditsResponse.text();
        for (const requiredCredit of [
          "Dariusmutamba",
          "Mulavu123",
          "https://creativecommons.org/licenses/by-sa/4.0/",
          "Construction_in_harare_01.jpg",
          "Solar_panel_installation.jpg",
          "cropped responsively",
        ]) {
          assert(credits.includes(requiredCredit));
        }
        const sources = [
          "www.chamines.co.zw",
          "tradezimbabwe.com",
          "www.hararecity.co.zw",
          "tradezimbabwe.com",
          "www.get-invest.eu",
        ];
        for (const [index, card] of (await cards.all()).entries()) {
          // Each idea provides a usable starting plan and a direct primary source,
          // rather than an investment/payment action or an unverified offer.
          assert.equal(
            await card.locator(".business-idea-basics dt").count(),
            2
          );
          assert(
            (await card.locator("dl dd").allTextContents()).every(
              text => text.trim().length > 0
            )
          );
          const source = card.locator("[data-business-source]");
          assert.equal(
            new URL(await source.getAttribute("href")).hostname,
            sources[index]
          );
          assert.equal(await source.getAttribute("target"), "_blank");
          assert.match(await source.getAttribute("rel"), /noopener/);
          assert.match(await source.getAttribute("rel"), /noreferrer/);
          const photo = card.locator(".discovery-tile-image img");
          assert(await photo.getAttribute("alt"));
          assert.equal(await photo.getAttribute("loading"), "lazy");
          assert.equal(await card.locator("details[open]").count(), 0);
          assert.equal(await card.locator("details dd").count(), 5);
          assert.equal(await card.locator("form").count(), 0);
        }
        assert.equal(
          await page.locator("#collective-model ol > li").count(),
          4
        );
        for (const [name, id] of [
          ["Explore business ideas", "investment-innovation-opportunities"],
          ["Plan your first step", "collective-model"],
        ]) {
          await page.getByRole("link", { name, exact: true }).click();
          await page.waitForFunction(targetId => {
            const top = document
              .getElementById(targetId)
              .getBoundingClientRect().top;
            return top >= 50 && top <= 90;
          }, id);
        }
        assert.deepEqual(
          await page
            .locator(".investment-landing > section")
            .evaluateAll(sections => sections.map(section => section.id)),
          [
            "hero",
            "investment-innovation-opportunities",
            "collective-model",
            "active-projects",
            "eu-partnerships",
          ]
        );
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        ),
        `${path} overflows`
      );
      if (path === "/investment/opportunities") {
        // Unsubstantiated funding data must not be represented as measured progress.
        assert.equal(await page.getByRole("progressbar").count(), 0);
        const values = await page
          .locator(".discovery-project-metrics dd")
          .allTextContents();
        assert(values.length > 0);
        assert(values.every(value => !/[0-9%$€]/.test(value)));
      }
      const rails = page.locator(".swipe-rail");
      for (const rail of await rails.all()) {
        const viewport = rail.locator(".swipe-rail-viewport");
        if (["/technology", "/investment", "/tourism"].includes(path)) {
          const bounds = await viewport.boundingBox();
          const screenWidth = await page.evaluate(
            () => document.documentElement.clientWidth
          );
          assert(
            Math.abs(bounds.x) <= 1,
            `${path}: rail must start at the screen edge`
          );
          assert(
            Math.abs(bounds.x + bounds.width - screenWidth) <= 1,
            `${path}: rail must end at the screen edge`
          );
          const first = await rail
            .locator(".swipe-rail-item")
            .first()
            .boundingBox();
          assert(
            Math.abs(first.x - (width < 768 ? 24 : 32)) <= 1,
            "Leading tile uses Home's inset"
          );
          const rows = await rail
            .locator(".swipe-rail-item")
            .evaluateAll(items =>
              items.map(item => item.getBoundingClientRect().top)
            );
          assert(
            rows.every(top => Math.abs(top - rows[0]) < 1),
            "Tiles must stay in one row"
          );
        }
        const previous = rail.getByRole("button", { name: /^Previous:/ });
        const next = rail.getByRole("button", { name: /^Next:/ });
        assert(await previous.isDisabled());
        const count = await rail.locator(".swipe-rail-item").count();
        assert(count > 0);
        await viewport.focus();
        await viewport.press("End");
        await page.waitForFunction(
          el => el.disabled,
          await next.elementHandle()
        );
        assert(await next.isDisabled(), `${path} must reach final tile`);
        const last = await rail
          .locator(".swipe-rail-item")
          .last()
          .boundingBox();
        const view = await viewport.boundingBox();
        assert(
          last.x + last.width <= view.x + view.width + 3,
          "Final tile must be completely reachable"
        );
        await viewport.press("Home");
        await page.waitForTimeout(40);
        if (await next.isEnabled()) {
          await next.click();
          await page.waitForTimeout(60);
          assert((await viewport.evaluate(el => el.scrollLeft)) > 5);
          await previous.click();
          await page.waitForTimeout(60);
          assert((await viewport.evaluate(el => el.scrollLeft)) < 5);
          await viewport.focus();
          await viewport.press("ArrowRight");
          await page.waitForTimeout(60);
          assert((await viewport.evaluate(el => el.scrollLeft)) > 5);
          await viewport.press("Home");
        }
        const hit = await next.boundingBox();
        assert(hit.width >= 44 && hit.height >= 44);
      }
      if (path === "/investment") {
        const ideas = page.locator("#investment-innovation-opportunities");
        for (const card of await ideas.locator("article").all()) {
          const summary = card.locator("summary");
          await summary.focus();
          await summary.press("Enter");
          assert.equal(await card.locator("details[open]").count(), 1);
          assert(
            await card
              .getByText("Customers to approach", { exact: true })
              .isVisible()
          );
          const photo = card.locator(".discovery-tile-image img");
          await photo.evaluate(image => image.decode());
          assert(await photo.evaluate(image => image.naturalWidth > 0));
          await summary.press("Space");
          assert.equal(await card.locator("details[open]").count(), 0);
        }
        await ideas.locator(".swipe-rail-viewport").focus();
        await page.keyboard.press("Home");
      }
      record({
        width,
        path,
        scenario: `${path}: all rails, final tile, keyboard, arrows, touch targets, no overflow`,
      });
      await rails.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${output}/${path.slice(1).replaceAll("/", "_")}-${width}.png`,
      });
      if (path === "/technology") {
        for (const [href, selector] of [
          ["/onesa-ai-chat", "main textarea"],
          ["/onesa-ai-book-trip", "main form"],
          ["/onesa-ai-tourism-virtual-experience", "#vr-destination"],
          ["/onesa-ai-tourism-augmented-experience", "#aug-place"],
        ]) {
          await page.goto(base + "/technology");
          await page.locator(`#onesa-intro a[href="${href}"]`).click();
          await page.waitForURL(base + href);
          await page.locator(selector).first().waitFor();
        }
        record({
          width,
          scenario:
            "Technology opens Onesa chat, trip planning, VR demos and the AR guide",
        });
      }
    }
    await page.goto(base + "/tourism");
    const rail = page.locator(".swipe-rail").first();
    const viewport = rail.locator(".swipe-rail-viewport");
    await viewport.scrollIntoViewIfNeeded();
    await viewport.focus();
    await viewport.press("Home");
    const bounds = await viewport.boundingBox();
    const x = bounds.x + Math.min(bounds.width - 24, 280),
      y = Math.max(80, bounds.y + 90);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 24, y, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert(
      (await viewport.evaluate(el => el.scrollLeft)) > 30,
      "Mouse drag must move the collection"
    );
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "Dragging must not open an attraction"
    );
    await viewport.focus();
    await viewport.press("Home");
    await rail
      .getByRole("button", { name: "Victoria Falls", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog
      .getByRole("heading", { name: "Victoria Falls", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      el => el === document.activeElement,
      await rail
        .getByRole("button", { name: "Victoria Falls", exact: true })
        .elementHandle()
    );
    assert(
      await rail
        .getByRole("button", { name: "Victoria Falls", exact: true })
        .evaluate(el => el === document.activeElement)
    );
    record({
      width,
      scenario:
        "drag suppresses accidental activation; click opens details; Escape restores focus",
    });
    // Chromium's native touch protocol exercises scrolling, rather than dispatching synthetic JS pointer callbacks.
    if (width === 375) {
      await viewport.focus();
      await viewport.press("Home");
      const b = await viewport.boundingBox();
      const cdp = await context.newCDPSession(page);
      const start = b.x + b.width - 30,
        finish = b.x + 25,
        ty = b.y + 80;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: start, y: ty }],
      });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: start + ((finish - start) * i) / 12, y: ty }],
        });
        await page.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(300);
      assert(
        (await viewport.evaluate(el => el.scrollLeft)) > 30,
        "Native touch swipe must move the rail"
      );
      assert.equal(await page.getByRole("dialog").count(), 0);
      record({
        width,
        scenario: "native touch swipe scrolls without opening a tile",
      });
    }
    await page.goto(base + "/investment/opportunities");
    await page.locator(".swipe-rail-viewport").focus();
    await page.keyboard.press("End");
    await page.getByRole("button", { name: "Tourism", exact: true }).click();
    assert.equal(await page.locator(".swipe-rail-item").count(), 1);
    assert.equal(
      await page.locator(".swipe-rail-viewport").evaluate(el => el.scrollLeft),
      0
    );
    await page
      .getByLabel("Catalogue group", { exact: true })
      .selectOption("aggressive");
    await page
      .getByText("No projects match your current filters.", { exact: true })
      .waitFor();
    assert.equal(await page.locator(".swipe-rail").count(), 0);
    await page.getByRole("button", { name: /clear filters/i }).click();
    assert.equal(await page.locator(".swipe-rail-item").count(), 12);
    await page
      .locator('.swipe-rail-item a[href="/investment/projects/masuwe"]')
      .click();
    await page.waitForURL("**/investment/projects/masuwe");
    await page.locator("main h1").waitFor();
    record({
      width,
      scenario:
        "project filtering resets position; empty recovery and detail navigation work",
    });
    await page.goto(base + "/investment");
    await page
      .locator("#collective-model")
      .getByRole("link", {
        name: "Open the due diligence checklist",
        exact: true,
      })
      .click();
    await page.waitForURL("**/regulations#due-diligence-checklist");
    await page.locator("#due-diligence-checklist").waitFor();
    await page.waitForFunction(() => {
      const tile = document
        .getElementById("due-diligence-checklist")
        .getBoundingClientRect();
      const view = document
        .querySelector(".swipe-rail-viewport")
        .getBoundingClientRect();
      return tile.left >= view.left - 3 && tile.right <= view.right + 3;
    });
    await page.evaluate(() => {
      location.hash = "export-certification-and-labeling";
    });
    await page.waitForFunction(() => {
      const tile = document
        .getElementById("export-certification-and-labeling")
        .getBoundingClientRect();
      const view = document
        .querySelector(".swipe-rail-viewport")
        .getBoundingClientRect();
      return tile.left >= view.left - 3 && tile.right <= view.right + 3;
    });
    record({
      width,
      scenario:
        "regulation deep links and same-page anchors reveal the correct tile",
    });
    await page.goto(base + "/tourism");
    const companion = page.locator('[data-swipe-rail="Onesa AI Companion"]');
    assert.equal(await companion.locator(".swipe-rail-item").count(), 4);
    assert.equal(
      await page
        .locator("summary")
        .filter({ hasText: "Example conversation with Onesa" })
        .count(),
      0
    );
    const companionViewport = companion.locator(".swipe-rail-viewport");
    const arTile = companion.locator(".swipe-rail-item").nth(1);
    assert.equal(
      await arTile
        .getByRole("heading", { name: "Augmented Reality Guide", exact: true })
        .count(),
      1
    );
    const arLink = arTile.getByRole("link", {
      name: "Explore in AR",
      exact: true,
    });
    assert.equal(
      await arLink.getAttribute("href"),
      "/onesa-ai-tourism-augmented-experience"
    );
    await arLink.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/onesa-ar-tile-${width}.png` });
    await arLink.click();
    await page.waitForURL("**/onesa-ai-tourism-augmented-experience");
    await page.locator("#aug-place").waitFor();
    await page.getByRole("link", { name: /back to tourism/i }).click();
    await page.waitForURL("**/tourism");
    record({
      width,
      scenario:
        "AR companion tile names the feature and opens the augmented-reality guide",
    });
    await companionViewport.focus();
    await companionViewport.press("End");
    const fourth = companion.locator(".swipe-rail-item").last();
    const previewLink = fourth.getByRole("link", {
      name: "Explore virtual previews",
      exact: true,
    });
    await previewLink.scrollIntoViewIfNeeded();
    assert.equal(await fourth.locator(".discovery-tile-with-image").count(), 1);
    assert.equal(await fourth.locator(".onesa-chat-preview").count(), 0);
    assert.equal(
      await previewLink.getAttribute("href"),
      "/onesa-ai-tourism-virtual-experience"
    );
    const cardBounds = await fourth.boundingBox();
    assert(
      cardBounds.x >= 0 && cardBounds.x + cardBounds.width <= width + 1,
      "Fourth tile is fully reachable"
    );
    await companionViewport.evaluate(el => el.blur());
    await page.screenshot({ path: `${output}/onesa-companion-${width}.png` });
    await previewLink.click();
    await page.waitForURL("**/onesa-ai-tourism-virtual-experience");
    await page.locator("main h1").waitFor();
    record({
      width,
      scenario:
        "four matching companion tiles; static transcript removed; fourth tile opens virtual previews",
    });
    for (const language of ["de", "sn", "nd"]) {
      await page.goto(`${base}/investment?lng=${language}`);
      await page.waitForFunction(
        expected => document.documentElement.lang === expected,
        language
      );
      const ideas = page.locator("#investment-innovation-opportunities");
      assert.equal(await ideas.locator("article").count(), 5);
      const checklist = page.locator(
        '#collective-model a[href="/regulations#due-diligence-checklist"]'
      );
      await checklist.scrollIntoViewIfNeeded();
      const bounds = await checklist.boundingBox();
      assert(
        bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
        "Translated checklist action stays on screen"
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        ),
        `${language}/${width}: page overflow`
      );
      const summary = ideas.locator("summary").last();
      await summary.focus();
      await summary.press("Enter");
      assert.equal(await ideas.locator("details[open]").count(), 1);
      await summary.press("Space");
      assert.equal(await ideas.locator("details[open]").count(), 0);
      record({
        width,
        scenario: `${language}: five ideas, keyboard details and translated checklist fit`,
      });
      await page.goto(`${base}/technology?lng=${language}`);
      await page.waitForFunction(
        expected => document.documentElement.lang === expected,
        language
      );
      assert.equal(await page.locator("#onesa-intro article").count(), 4);
      assert.equal(
        await page.locator("#technology-industries article").count(),
        4
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        ),
        `${language}/${width}: Technology page overflow`
      );
      record({
        width,
        scenario: `${language}: translated Technology tools and ideas fit`,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  record({ scenario: "zero runtime errors or unexpected network failures" });
} catch (error) {
  await page?.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ checks, errors, failures }, null, 2)
  );
  await browser.close();
  await new Promise(done => server.close(done));
}
