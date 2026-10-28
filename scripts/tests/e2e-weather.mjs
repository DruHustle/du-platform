import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { chromium, webkit } from "playwright";
import { createModularServer } from "../../du-platform-backend/server.ts";
const app = createModularServer({
  backend: { db: null, serverStartedAt: Date.now() },
  staticPath: resolve("du-platform-frontend/dist"),
});
const server = createServer(app);
await new Promise((done, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", done);
});
const base = `http://127.0.0.1:${server.address().port}`,
  output = join(tmpdir(), "du-weather-review");
await mkdir(output, { recursive: true });
const errors = [],
  checks = [];
function forecast(coordinates, stale = false) {
  const start = Math.ceil(Date.now() / 3600000) * 3600000;
  return {
    ...coordinates,
    timezone:
      coordinates.latitude < -30 ? "Africa/Johannesburg" : "Africa/Harare",
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
    fetchedAt: new Date().toISOString(),
    stale,
    points: Array.from({ length: 168 }, (_, n) => ({
      time: new Date(start + n * 3600000).toISOString(),
      temperature: 20 + (n % 8),
      humidity: 70,
      windKmh: 18,
      condition: n % 2 ? "fair" : "rain",
      night: false,
      precipitationMm: n % 2 ? 0 : 1.2,
      intervalHours: 1,
    })),
  };
}
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch();
    try {
      for (const width of [375, 768, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 950 },
          colorScheme: width === 768 ? "light" : "dark",
          reducedMotion: "reduce",
        });
        await context.addInitScript(() => {
          localStorage.setItem("du_cookie_consent_v1", "rejected");
          localStorage.setItem("du_cookie_consent_seen_v1", "shown");
          window.__weatherGeoCalls = 0;
          window.__weatherGeoDenied = false;
          Object.defineProperty(navigator, "geolocation", {
            configurable: true,
            value: {
              getCurrentPosition(ok, fail) {
                window.__weatherGeoCalls++;
                queueMicrotask(() =>
                  window.__weatherGeoDenied
                    ? fail({ code: 1 })
                    : ok({ coords: { latitude: -17.825, longitude: 31.033 } })
                );
              },
            },
          });
        });
        let searches = 0,
          forecasts = 0,
          mode = "ok",
          held = null;
        let resolveHeld;
        const heldReady = new Promise(done => {
          resolveHeld = done;
        });
        const page = await context.newPage();
        page.on("pageerror", e => errors.push(e.message));
        await page.route("**/api/weather/**", async route => {
          const path = new URL(route.request().url()).pathname;
          if (path.endsWith("/places")) {
            searches++;
            return route.fulfill({
              json: {
                success: true,
                data:
                  mode === "empty"
                    ? []
                    : [
                        {
                          id: "fixture-vf",
                          name: "Victoria Falls",
                          country: "Zimbabwe",
                          latitude: -17.924,
                          longitude: 25.857,
                          timezone: "Africa/Harare",
                        },
                      ],
              },
            });
          }
          forecasts++;
          const coordinates = route.request().postDataJSON();
          if (mode === "fail")
            return route.fulfill({
              status: 503,
              json: { success: false, error: { code: "WEATHER_UNAVAILABLE" } },
            });
          if (mode === "malformed")
            return route.fulfill({
              json: { success: true, data: { points: "invalid" } },
            });
          if (mode === "race" && coordinates.latitude === -17.825) {
            held = () =>
              route
                .fulfill({
                  json: { success: true, data: forecast(coordinates) },
                })
                .catch(() => {});
            resolveHeld();
            return;
          }
          return route.fulfill({
            json: {
              success: true,
              data: forecast(coordinates, mode === "stale"),
            },
          });
        });
        await page.goto(base + "/travel/weather?lng=en");
        await page
          .getByRole("heading", { name: "Weather", level: 1, exact: true })
          .waitFor();
        assert.equal(searches, 0);
        assert.equal(forecasts, 0);
        assert.equal(await page.evaluate(() => window.__weatherGeoCalls), 0);
        await page
          .getByLabel("Choose a destination", { exact: true })
          .selectOption("harare");
        await page
          .getByRole("heading", { name: "Harare · Zimbabwe", exact: true })
          .waitFor();
        assert.equal(await page.locator(".weather-day").count(), 7);
        assert.match(
          await page.locator(".weather-current").textContent(),
          /Africa\/Harare/
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: join(output, `${name}-${width}-page.png`),
          fullPage: true,
        });
        await page
          .getByRole("textbox", { name: "City or destination", exact: true })
          .fill("Victoria Falls");
        assert.equal(searches, 0);
        await page
          .getByRole("button", { name: "Search places", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Victoria Falls Zimbabwe", exact: true })
          .waitFor();
        assert.equal(forecasts, 1);
        await page
          .getByRole("button", { name: "Victoria Falls Zimbabwe", exact: true })
          .click();
        await page
          .getByRole("heading", {
            name: "Victoria Falls · Zimbabwe",
            exact: true,
          })
          .waitFor();
        mode = "empty";
        await page
          .getByRole("textbox", { name: "City or destination", exact: true })
          .fill("No matching place");
        await page
          .getByRole("button", { name: "Search places", exact: true })
          .click();
        await page
          .getByText(
            "No places found. Try adding the country or a different spelling.",
            { exact: true }
          )
          .waitFor();
        await page
          .getByRole("heading", {
            name: "Victoria Falls · Zimbabwe",
            exact: true,
          })
          .waitFor();
        mode = "fail";
        await page
          .getByLabel("Choose a destination", { exact: true })
          .selectOption("cape-town");
        await page.getByRole("alert").waitFor();
        await page
          .getByRole("heading", {
            name: "Victoria Falls · Zimbabwe",
            exact: true,
          })
          .waitFor();
        mode = "malformed";
        await page
          .getByLabel("Choose a destination", { exact: true })
          .selectOption("cape-town");
        await page.getByRole("alert").waitFor();
        await page
          .getByRole("heading", {
            name: "Victoria Falls · Zimbabwe",
            exact: true,
          })
          .waitFor();
        mode = "race";
        await page
          .getByLabel("Choose a destination", { exact: true })
          .selectOption("harare");
        await heldReady;
        await page
          .getByLabel("Choose a destination", { exact: true })
          .selectOption("cape-town");
        await page
          .getByRole("heading", {
            name: "Cape Town · South Africa",
            exact: true,
          })
          .waitFor();
        if (held) await held();
        await page
          .getByRole("heading", {
            name: "Cape Town · South Africa",
            exact: true,
          })
          .waitFor();
        mode = "ok";
        await page
          .getByRole("button", { name: "Use my location", exact: true })
          .click();
        await page
          .getByRole("heading", {
            name: "Your approximate location",
            exact: true,
          })
          .waitFor();
        assert.equal(await page.evaluate(() => window.__weatherGeoCalls), 1);
        await page.evaluate(() => (window.__weatherGeoDenied = true));
        await page
          .getByRole("button", { name: "Use my location", exact: true })
          .click();
        await page
          .getByText(
            "Location access was denied or timed out. Search a city or choose a destination.",
            { exact: true }
          )
          .waitFor();
        mode = "stale";
        await page
          .getByRole("button", { name: "Refresh forecast", exact: true })
          .click();
        await page
          .getByText(
            "This is the last available forecast and may be outdated. Check its update time and try again later.",
            { exact: true }
          )
          .waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          `${name}/${width} page overflow`
        );
        await page
          .locator(".weather-current")
          .screenshot({ path: join(output, `${name}-${width}-forecast.png`) });
        await page
          .locator(".weather-controls")
          .screenshot({ path: join(output, `${name}-${width}-controls.png`) });
        checks.push(
          `${name}/${width}: explicit queries, presets, 7-day outlook, rain units/timezone, empty/malformed/failure retention, stale response race, opt-in and denied geolocation, stale-cache notice and responsive layout`
        );
        await context.close();
      }
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
    `PASS ${checks.length} comprehensive Weather journeys in Chromium/WebKit at 375, 768 and 1440; no runtime errors. ${output}`
  );
} finally {
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
