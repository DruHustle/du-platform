import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Run against a local sandbox only. Screenshots and metrics are written outside Git.
const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5001";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname),
  "Use a local sandbox server."
);
const output = process.env.E2E_OUTPUT_DIR || "/tmp/du-platform-audit";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.E2E_BROWSER_CHANNEL
    ? { channel: process.env.E2E_BROWSER_CHANNEL }
    : {}),
});
const routes = [
  "/",
  "/shop",
  "/shop/products",
  "/technology",
  "/investment",
  "/investment/opportunities",
  "/investment/projects/masuwe",
  "/investment/projects/unknown",
  "/ntir",
  "/tourism",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/regulations",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-settings",
  "/search?q=tourism",
  "/onesa-ai-chat",
  "/onesa-ai-book-trip",
  "/onesa-ai-tourism-augmented-experience",
  "/onesa-ai-tourism-virtual-experience",
  "/not-a-real-route",
];
const report = [];
const failures = [];
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      ignoreHTTPSErrors: true,
    });
    await context.addInitScript(() =>
      localStorage.setItem("du_cookie_consent_v1", "rejected")
    );
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    let errors = [];
    let network = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (
        response.status() >= 400 &&
        !/\/auth\/(me|token\/refresh)/.test(response.url())
      )
        network.push(`${response.status()} ${response.url()}`);
    });
    for (const route of routes) {
      errors = [];
      network = [];
      try {
        await page.goto(`${baseUrl}${route}`, {
          waitUntil: "domcontentloaded",
        });
        await page.locator("main").waitFor();
        await page.waitForTimeout(650);
        const result = await page.evaluate(() => ({
          title: document.title,
          heading: document.querySelector("main h1")?.textContent,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images]
            .filter(img => img.complete && img.currentSrc && !img.naturalWidth)
            .map(img => img.currentSrc),
          jsBytes: performance
            .getEntriesByType("resource")
            .filter(item => /\.js(?:$|\?)/.test(item.name))
            .reduce((sum, item) => sum + item.encodedBodySize, 0),
        }));
        report.push({
          width,
          route,
          ...result,
          errors: [...errors],
          network: [...network],
        });
        console.log(`Checked ${width} ${route}`);
        assert(!result.overflow, `Horizontal overflow at ${width}: ${route}`);
        assert.equal(
          errors.length,
          0,
          `Page errors at ${width}: ${route}: ${errors.join("; ")}`
        );
        assert.equal(
          result.brokenImages.length,
          0,
          `Broken images at ${width}: ${route}: ${result.brokenImages.join("; ")}`
        );
        if (
          [
            "/",
            "/tourism",
            "/shop/products",
            "/login",
            "/privacy-policy",
            "/search?q=tourism",
          ].includes(route)
        ) {
          // Reveal scroll-triggered content before taking a full-page screenshot.
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 750) {
              scrollTo(0, y);
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            scrollTo(0, 0);
          });
          await page.waitForTimeout(900);
          await page.screenshot({
            path: path.join(
              output,
              `${width}-${route.replace(/[^a-z0-9]/gi, "_") || "home"}.png`
            ),
            fullPage: true,
          });
        }
      } catch (error) {
        failures.push(error.message);
      }
    }
    await context.close();
  }
  await fs.writeFile(
    path.join(output, "report.json"),
    JSON.stringify({ report, failures }, null, 2)
  );
  console.log(
    JSON.stringify(
      {
        routes: routes.length,
        viewports: [375, 768, 1440],
        checks: report.length,
        failures,
        output,
      },
      null,
      2
    )
  );
  assert.equal(
    failures.length,
    0,
    "Responsive route audit failed; inspect report.json"
  );
} finally {
  await browser.close();
}
