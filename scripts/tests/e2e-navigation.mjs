import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Serve the production build without loading .env or contacting any service.
const root = resolve("du-platform-frontend/dist");
const output = process.env.NAVIGATION_OUTPUT_DIR || "/tmp/du-navigation-tests";
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
  process.env.NAVIGATION_BASE_URL ||
  `http://127.0.0.1:${server.address().port}`;
const channel = process.env.NAVIGATION_BROWSER_CHANNEL || "chrome";
const browser = await chromium.launch({
  channel: channel === "chromium" ? undefined : channel,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const checks = [];
const record = check => {
  checks.push(check);
  console.log(`PASS ${check.width}px ${check.path || check.scenario}`);
};
let currentPage;
const errors = [];
const failures = [];
await mkdir(output, { recursive: true });

try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    currentPage = page;
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(10000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("requestfailed", request => {
      if (!request.failure()?.errorText?.includes("ERR_ABORTED"))
        failures.push(request.url());
    });
    let slowScripts = false;
    let holdPrivacy;
    const chunks = [];
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      // Keep this regression independent of the optional Google Fonts service.
      if (url.hostname === "fonts.googleapis.com") {
        return route.fulfill({ contentType: "text/css", body: "" });
      }
      if (url.pathname.startsWith("/api/")) {
        return route.fulfill({ json: { user: null, results: [] } });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      if (slowScripts && route.request().resourceType() === "script") {
        chunks.push(url.pathname);
        if (holdPrivacy && url.pathname.includes("PrivacyPolicyPage"))
          await holdPrivacy;
        else await new Promise(done => setTimeout(done, 600));
      }
      return route.continue();
    });
    const activeLink = path =>
      page
        .locator(`nav a[href="${path}"][aria-current="page"]`)
        .filter({ visible: true })
        .first();
    const navLink = path =>
      page.locator(`nav a[href="${path}"]`).filter({ visible: true }).first();
    await page.goto(base);
    await activeLink("/").waitFor();
    const reject = page.getByRole("button", {
      name: "Essential only",
      exact: true,
    });
    if (await reject.count()) await reject.click();
    await page
      .locator("main img")
      .first()
      .evaluate(image => image.decode().catch(() => {}));
    const homeHero = page.locator("#main-page-hero-wrapper");
    assert.equal(
      await homeHero
        .getByRole("link", { name: "Browse products", exact: true })
        .count(),
      0
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-waterfall-state]")
          ?.getAttribute("data-waterfall-state") === "playing"
    );
    assert.equal(
      await homeHero
        .getByRole("button", { name: /(?:pause|play) waterfall animation/i })
        .count(),
      0
    );
    assert.equal(
      await homeHero.getByRole("button").count(),
      1,
      "Only the Explore control belongs in the Home hero"
    );
    assert.equal(
      await homeHero.locator('img[aria-hidden="true"]').getAttribute("src"),
      "/images/pages/tourism/victoria_falls.webp"
    );
    // A moving decorative arrow must not move the mouse/keyboard hit target.
    const explore = homeHero.getByRole("button", {
      name: "Explore the platform",
      exact: true,
    });
    await explore.click();
    await page.waitForFunction(() => {
      const section = document.getElementById("explore-platform");
      return section && section.getBoundingClientRect().top < innerHeight / 2;
    });
    // Start keyboard activation independently of the previous native smooth scroll.
    await page.reload({ waitUntil: "domcontentloaded" });
    await explore.waitFor();
    await explore.focus();
    await explore.press("Enter");
    await page.waitForFunction(
      () =>
        document.getElementById("explore-platform").getBoundingClientRect()
          .top <
        innerHeight / 2
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    record({
      width,
      scenario:
        "continuously flowing Victoria Falls and stationary mouse/keyboard exploration control",
    });
    slowScripts = true;

    for (const path of [
      "/shop",
      "/technology",
      "/investment",
      "/travel",
      "/",
    ]) {
      await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
      await page.evaluate(path => {
        window.navigationResult = {
          missingMain: false,
          missingNavigation: false,
          elapsedMs: null,
        };
        let started;
        const capture = event => {
          if (event.target.closest(`nav a[href="${path}"]`))
            started = performance.now();
        };
        document.addEventListener("click", capture, true);
        const observer = new MutationObserver(() => {
          if (started === undefined) return;
          window.navigationResult.missingMain ||=
            !document.querySelector("main");
          window.navigationResult.missingNavigation ||=
            !document.querySelector("nav");
          if (
            document.querySelector(`nav a[href="${path}"][aria-current="page"]`)
          ) {
            window.navigationResult.elapsedMs = performance.now() - started;
            observer.disconnect();
            document.removeEventListener("click", capture, true);
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["aria-current"],
        });
      }, path);
      chunks.length = 0;
      await navLink(path).click();
      await activeLink(path).waitFor();
      const result = await page.evaluate(() => window.navigationResult);
      assert.equal(result.missingMain, false, `${path}: interrupted page`);
      assert.equal(
        result.missingNavigation,
        false,
        `${path}: interrupted navigation`
      );
      assert.equal(
        chunks.length,
        0,
        `${path}: click waited for page JavaScript`
      );
      assert(result.elapsedMs !== null, `${path}: destination did not commit`);
      assert.equal(
        await page.evaluate(() => scrollY),
        0,
        `${path}: old scroll position`
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      );
      if (path !== "/") {
        const hero = page.locator(".discovery-hero-media img");
        await hero.evaluate(image => image.decode());
        assert.equal(
          await hero.evaluate(image => getComputedStyle(image).opacity),
          "1"
        );
      }
      assert.equal(
        await page.locator("main h1").evaluate(heading => {
          for (let node = heading; node; node = node.parentElement) {
            if (Number(getComputedStyle(node).opacity) < 1) return false;
          }
          return true;
        }),
        true,
        `${path}: heading hidden behind an entrance fade`
      );
      await page.screenshot({
        path: `${output}/${path === "/" ? "home" : path.slice(1)}-${width}.png`,
      });
      record({ width, path, ...result, scriptRequests: chunks.length });
    }

    // Hold a real lazy chunk: the previous page and navigation must stay usable.
    let releasePrivacy;
    holdPrivacy = new Promise(done => {
      releasePrivacy = done;
    });
    const requestStarted = page.waitForRequest(/PrivacyPolicyPage.*\.js/);
    await page
      .locator("footer")
      .getByRole("link", { name: "Privacy Policy", exact: true })
      .click();
    await requestStarted;
    await page
      .getByRole("status")
      .filter({ hasText: "Loading page content" })
      .waitFor();
    await activeLink("/").waitFor();
    assert.equal(await page.locator("main").count(), 1);
    await page.screenshot({ path: `${output}/pending-${width}.png` });
    // A second click wins even while the first destination is still loading.
    await navLink("/technology").click();
    await activeLink("/technology").waitFor();
    releasePrivacy();
    holdPrivacy = null;
    await page.waitForTimeout(100);
    assert.equal(new URL(page.url()).pathname, "/technology");
    await activeLink("/technology").waitFor();
    record({
      width,
      scenario: "slow lazy destination remains interactive; latest click wins",
    });

    await page
      .locator("footer")
      .getByRole("link", { name: "Privacy Policy", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Privacy Policy", exact: true })
      .waitFor();
    await page.goBack();
    await activeLink("/technology").waitFor();
    await page.goForward();
    await page
      .getByRole("heading", { name: "Privacy Policy", exact: true })
      .waitFor();
    record({ width, scenario: "lazy destination and browser history" });

    await navLink("/shop").focus();
    await page.keyboard.press("Enter");
    await activeLink("/shop").waitFor();
    record({ width, scenario: "keyboard tab navigation" });

    if (width < 1024) {
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Search Diaspora Unlocked", exact: true })
        .click();
    }
    const searchBox = page.getByRole("dialog").getByRole("textbox");
    await searchBox.fill("Victoria Falls");
    await searchBox.press("Enter");
    await page.locator("#site-search").waitFor();
    assert.equal(
      await page.locator("#site-search").inputValue(),
      "Victoria Falls"
    );
    await page.locator("#site-search").fill("Zimbabwe crafts");
    await page.locator("#site-search").press("Enter");
    await page.waitForURL("**/search?q=Zimbabwe%20crafts");
    await page.goBack();
    await page.waitForFunction(
      () => document.querySelector("#site-search")?.value === "Victoria Falls"
    );
    record({
      width,
      scenario: "lazy search navigation and query history",
    });

    await navLink("/travel").click();
    await activeLink("/travel").waitFor();
    await page.screenshot({ path: `${output}/tourism-${width}.png` });
    assert(
      !chunks.some(path => /VirtualExperience|InteractiveGlobe/.test(path)),
      "Navigation downloaded the 3D experience"
    );
    await page.goto(base + "/coming-soon?lng=en#chat");
    await page.waitForURL("**/onesa-ai-chat?lng=en#chat");
    await page
      .getByRole("textbox", { name: "Message to Onesa", exact: true })
      .waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    record({
      width,
      scenario:
        "retired coming-soon URL opens live chat and preserves query/hash",
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ ok: true, checks, errors, failures }, null, 2)
  );
  console.log(JSON.stringify({ ok: true, checks, output }, null, 2));
} catch (error) {
  console.error(error);
  await currentPage
    ?.screenshot({ path: `${output}/failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
