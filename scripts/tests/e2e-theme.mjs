import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium, webkit } from "playwright";
import { createModularServer } from "../../du-platform-backend/server.ts";

// Local, anonymous browser checks: no .env, production services or account writes.
const app = createModularServer({
  backend: { db: null, serverStartedAt: Date.now() },
  staticPath: resolve("dist/public"),
});
const server = createServer(app);
await new Promise((done, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", done);
});
const base = `http://127.0.0.1:${server.address().port}`;
const output = join(tmpdir(), "du-theme-review");
await mkdir(output, { recursive: true });
const checks = [],
  errors = [];
async function appearance(page, preference, resolved) {
  await page.waitForFunction(
    ({ preference, resolved }) =>
      document.documentElement.dataset.themePreference === preference &&
      document.documentElement.classList.contains("dark") ===
        (resolved === "dark"),
    { preference, resolved }
  );
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme
    ),
    resolved
  );
  await page.evaluate(
    () =>
      new Promise(done =>
        requestAnimationFrame(() => requestAnimationFrame(done))
      )
  );
}
try {
  for (const [engineName, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch();
    try {
      for (const width of [375, 768, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 950 },
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        await context.addInitScript(() => {
          try {
            localStorage.setItem("du_cookie_consent_v1", "rejected");
            localStorage.setItem("du_cookie_consent_seen_v1", "shown");
          } catch {}
        });
        const page = await context.newPage();
        page.on("pageerror", e => errors.push(e.message));
        await page.goto(base + "/travel/flights?lng=en");
        await page
          .getByRole("heading", { name: "Flights", level: 1, exact: true })
          .waitFor();
        await appearance(page, "system", "dark");
        assert.equal(
          await page.locator(".travel-heading .discovery-eyebrow").count(),
          0
        );
        assert.deepEqual(
          await page.locator(".travel-nav a").allTextContents(),
          [
            "Overview",
            "Flights",
            "Stays",
            "Car Hire",
            "My Trips",
            "Weather",
            "Explore",
          ]
        );
        assert.equal(
          await page
            .locator(".travel-page")
            .evaluate(e => getComputedStyle(e).backgroundColor),
          "rgb(11, 19, 34)"
        );
        await page.emulateMedia({ colorScheme: "light" });
        await appearance(page, "system", "light");
        assert.equal(
          await page
            .locator(".travel-page")
            .evaluate(e => getComputedStyle(e).backgroundColor),
          "rgb(248, 250, 251)"
        );
        const control = page.getByLabel("Appearance", { exact: true });
        await control.selectOption("dark");
        await appearance(page, "dark", "dark");
        await page.reload();
        await appearance(page, "dark", "dark");
        await page
          .getByLabel("Appearance", { exact: true })
          .selectOption("light");
        await page.emulateMedia({ colorScheme: "dark" });
        await appearance(page, "light", "light");
        await page
          .getByLabel("Appearance", { exact: true })
          .selectOption("system");
        await appearance(page, "system", "dark");
        await page.locator(".travel-search").screenshot({
          path: join(output, `${engineName}-${width}-dark-search.png`),
        });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          `${engineName}/${width} overflow`
        );
        for (const path of [
          "/travel/stays",
          "/travel/car-hire",
          "/travel/my-trips",
        ]) {
          await page.goto(base + path + "?lng=en");
          await page.locator(".travel-heading h1").waitFor();
          assert.equal(
            await page.locator(".travel-heading .discovery-eyebrow").count(),
            0
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            ),
            path + " overflow"
          );
        }
        for (const path of [
          "/",
          "/shop",
          "/technology",
          "/investment",
          "/travel/explore",
        ]) {
          await page.goto(base + path + "?lng=en");
          await page.locator(".discovery-section").first().waitFor();
          await appearance(page, "system", "dark");
          assert.equal(
            await page
              .locator(".discovery-section")
              .first()
              .evaluate(e => getComputedStyle(e).backgroundColor),
            "rgb(11, 19, 34)"
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            ),
            path + " dark overflow"
          );
          if (path === "/")
            await page
              .locator(".discovery-section")
              .first()
              .screenshot({
                path: join(output, `${engineName}-${width}-home-discovery.png`),
              });
        }
        checks.push(
          `${engineName}/${width}: auto light/dark, live change, persistent override, System reset, Travel navigation/headings, five discovery pages and overflow`
        );
        if (width === 375) {
          const other = await context.newPage();
          await other.goto(base + "/travel/flights?lng=en");
          await appearance(other, "system", "dark");
          await page
            .getByLabel("Appearance", { exact: true })
            .selectOption("light");
          await appearance(other, "light", "light");
          await page.evaluate(() => localStorage.removeItem("theme"));
          await appearance(other, "system", "dark");
          await other.close();
          checks.push(`${engineName}: cross-tab preference change and removal`);
        }
        await context.close();
      }
      const blocked = await browser.newContext({
        colorScheme: "dark",
        viewport: { width: 375, height: 950 },
      });
      await blocked.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("Storage disabled", "SecurityError");
          },
        });
      });
      const page = await blocked.newPage();
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(base + "/travel/flights?lng=en");
      await page
        .getByRole("heading", { name: "Flights", level: 1, exact: true })
        .waitFor();
      await appearance(page, "system", "dark");
      await page
        .getByLabel("Appearance", { exact: true })
        .selectOption("light");
      await appearance(page, "light", "light");
      await blocked.close();
      checks.push(
        `${engineName}: blocked storage retains working System and manual choices`
      );
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    join(output, "report.json"),
    JSON.stringify({ checks, errors }, null, 2)
  );
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${checks.length} appearance browser scenarios; Chromium/WebKit at 375, 768, 1440; no runtime errors. Screenshots: ${output}`
  );
} finally {
  await new Promise(done => server.close(done));
}
