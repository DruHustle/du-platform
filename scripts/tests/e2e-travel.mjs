import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { chromium, webkit } from "playwright";
import { createModularServer } from "../../du-platform-backend/server.ts";
import { travelRedirects } from "../../shared/travelRoutes.ts";
const engine = process.env.TRAVEL_BROWSER || "chromium";
const output =
  process.env.TRAVEL_OUTPUT_DIR || join(tmpdir(), `du-travel-${engine}`);
await mkdir(output, { recursive: true });
const app = createModularServer({
  backend: { db: null, serverStartedAt: Date.now() },
  staticPath: resolve("dist/public"),
});
const server = createServer(app);
await new Promise((r, j) => {
  server.once("error", j);
  server.listen(0, "127.0.0.1", r);
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const checks = [],
  errors = [];
let failure;
let lastPage;
const future = n =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      localStorage.setItem("du_cookie_consent_v1", "rejected");
      localStorage.setItem("du_cookie_consent_seen_v1", "shown");
    });
    await context.route("https://www.kayak.com/**", r =>
      r.fulfill({
        contentType: "text/html",
        body: "<h1>Public search resource fixture</h1>",
      })
    );
    await context.route("https://kiwi.com/**", r =>
      r.fulfill({
        contentType: "text/html",
        body: "<h1>Synthetic supplier handoff</h1>",
      })
    );
    let privateMode = false;
    let storageFails = false;
    let malformedSavedResponse = false;
    let supplierFails = false;
    let supplierEmpty = false;
    let offerExpires = false;
    let chatSends = 0;
    let savedRecords = [];
    const page = await context.newPage();
    lastPage = page;
    page.on("pageerror", e => errors.push(e.message));
    // No credentials or production services. APIs unrelated to this journey use
    // deterministic read-only fixtures; Travel endpoints remain the actual server.
    await page.route("**/api/**", async r => {
      const p = new URL(r.request().url()).pathname;
      if (p === "/api/ai/chat") chatSends++;
      if (p === "/api/travel/search") {
        if (supplierFails)
          return r.fulfill({
            status: 503,
            json: { error: { code: "TRAVEL_PROVIDER_UNAVAILABLE" } },
          });
        const { category, criteria } = r.request().postDataJSON();
        const flight = category === "flights";
        const quote = {
          id: crypto.randomUUID(),
          identity: (flight ? "a" : "b").repeat(64),
          provider: flight ? "Kiwi.com" : "Pilot",
          category,
          providerReference: "synthetic-provider-offer",
          criteria,
          title: flight ? "Synthetic flight option" : "Synthetic stay option",
          price: 500,
          currency: criteria.currency,
          priceBasis: flight ? "party-total" : "unspecified",
          retrievedAt: new Date().toISOString(),
          reviewAfter: new Date(Date.now() + 300000).toISOString(),
          bookingUrl: flight
            ? "https://kiwi.com/u/synthetic"
            : "https://pilotplans.com/stays/synthetic",
          legs: flight
            ? [
                {
                  route: [criteria.origin, criteria.destination],
                  departureTime: criteria.departure + "T23:00:00",
                  arrivalTime: future(31) + "T08:00:00",
                  durationSeconds: 32400,
                  stops: 0,
                  cabin: "Economy",
                  airlines: ["Synthetic airline"],
                },
              ]
            : [],
          baggage: null,
          address: null,
          reviewRating: null,
          reviewCount: null,
          signature: "c".repeat(64),
        };
        if (flight && criteria.tripType === "return")
          quote.legs.push({
            ...quote.legs[0],
            route: [criteria.destination, criteria.origin],
            departureTime: criteria.returnDate + "T10:00:00",
            arrivalTime: criteria.returnDate + "T19:00:00",
          });
        return r.fulfill({
          json: {
            success: true,
            data: {
              provider: quote.provider,
              category,
              retrievedAt: quote.retrievedAt,
              quotes: supplierEmpty ? [] : [quote],
              rejectedCount: flight ? 1 : 0,
            },
          },
        });
      }
      if (p === "/api/travel/revalidate") {
        if (offerExpires)
          return r.fulfill({
            status: 410,
            json: { error: { code: "TRAVEL_OFFER_EXPIRED" } },
          });
        const quote = r.request().postDataJSON();
        return r.fulfill({
          json: {
            success: true,
            data: {
              quote: {
                ...quote,
                price: quote.price + 50,
                retrievedAt: new Date().toISOString(),
                reviewAfter: new Date(Date.now() + 300000).toISOString(),
              },
              changed: true,
            },
          },
        });
      }
      if (privateMode && p.startsWith("/api/travel/saved")) {
        if (malformedSavedResponse)
          return r.fulfill({ json: { success: true, data: [{}] } });
        if (storageFails)
          return r.fulfill({
            status: 503,
            json: { error: { code: "TRAVEL_STORAGE_UNAVAILABLE" } },
          });
        const method = r.request().method();
        if (method === "POST") {
          const input = r.request().postDataJSON();
          const id = crypto.randomUUID();
          savedRecords.push({
            ...input,
            id,
            updatedAt: new Date().toISOString(),
          });
          return r.fulfill({
            status: 201,
            json: { success: true, data: { id } },
          });
        }
        if (method === "DELETE") {
          savedRecords = savedRecords.filter(record => !p.endsWith(record.id));
          return r.fulfill({
            json: { success: true, data: { removed: true } },
          });
        }
        return r.fulfill({ json: { success: true, data: savedRecords } });
      }
      if (p.startsWith("/api/travel/")) return r.continue();
      if (p === "/api/auth/me" && privateMode)
        return r.fulfill({
          json: {
            user: {
              id: 9001,
              fullName: "Synthetic Traveller",
              email: "synthetic@example.test",
            },
          },
        });
      if (p === "/api/auth/me")
        return r.fulfill({
          status: 401,
          json: { error: { code: "UNAUTHORIZED" } },
        });
      if (p === "/api/ai/ready")
        return r.fulfill({
          json: { ok: false, ready: false, provider: "none" },
        });
      return r.fulfill({
        json: {
          success: true,
          data: { products: [], ready: false },
          error: null,
        },
      });
    });
    async function goto(path) {
      await page.goto(base + path);
      await page.locator("main").waitFor();
    }
    async function fit(name) {
      const samples = await page
        .locator(
          ".travel-heading h1,.travel-guides article p,.travel-search>p,.travel-supplier-card p,.travel-supplier-card h3"
        )
        .evaluateAll(nodes =>
          nodes.map(el => ({
            foreground: getComputedStyle(el).color,
            background: getComputedStyle(
              el.closest(".travel-supplier-card,.content-panel") ||
                el.closest(".travel-page")
            ).backgroundColor,
          }))
        );
      const luminance = raw =>
        raw
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map(c => c / 255)
          .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
      for (const sample of samples) {
        const a = luminance(sample.foreground),
          b = luminance(sample.background);
        assert(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
          "Travel heading/editorial text must have readable contrast"
        );
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        ),
        name + " overflows"
      );
      checks.push(`${width}: ${name}`);
    }
    await goto("/travel");
    await page
      .getByRole("heading", { name: "Travel Southern Africa", exact: true })
      .waitFor();
    assert.equal(
      await page.locator("#hero .discovery-eyebrow").textContent(),
      "Journeys, stays & discovery"
    );
    await page
      .getByRole("heading", {
        name: "Places to explore in Zimbabwe",
        exact: true,
      })
      .waitFor();
    assert.equal(await page.locator('a[href="/tourism"]').count(), 0);
    await fit("landing");
    await page.screenshot({
      path: `${output}/${width}-landing-viewport.jpg`,
      type: "jpeg",
      quality: 80,
    });
    await writeFile(
      `${output}/landing-inspection.json`,
      JSON.stringify(
        await page
          .locator(".travel-search, .travel-guides")
          .evaluateAll(nodes =>
            nodes.map(n => ({
              text: n.innerText,
              fields: Array.from(n.querySelectorAll("select")).map(f => ({
                labels: Array.from(f.labels || []).map(l => l.textContent),
              })),
              headings: Array.from(n.querySelectorAll("h3,p"))
                .slice(0, 7)
                .map(e => ({
                  text: e.textContent,
                  color: getComputedStyle(e).color,
                  background: getComputedStyle(e.parentElement).backgroundColor,
                })),
            }))
          ),
        null,
        2
      )
    );
    await page.screenshot({
      path: `${output}/${width}-landing.png`,
      fullPage: true,
    });
    await page
      .locator(".travel-search")
      .screenshot({ path: `${output}/${width}-search-detail.png` });
    await page
      .locator(".travel-nav")
      .getByRole("link", { name: "Flights", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Flights", exact: true, level: 1 })
      .waitFor();
    const dest = page.getByRole("combobox", {
      name: "Destination airport / area",
    });
    await dest.fill("Victoria");
    await page.getByRole("option", { name: /Victoria Falls/ }).waitFor();
    await dest.press("Enter");
    assert.match(await dest.inputValue(), /VFA/);
    await page
      .getByLabel("Departure / pickup date", { exact: true })
      .fill(future(30));
    await page
      .getByLabel("Return / drop-off date", { exact: true })
      .fill(future(28));
    await page
      .getByRole("button", { name: "Review search details", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Choose an end date" })
      .waitFor();
    await page
      .getByLabel("Return / drop-off date", { exact: true })
      .fill(future(37));
    await page
      .getByRole("combobox", { name: "Children (0–17)", exact: true })
      .selectOption("1");
    await page.getByLabel("Child 1 age at travel", { exact: true }).fill("7");
    await page
      .getByRole("combobox", { name: "Currency", exact: true })
      .selectOption("GBP");
    await page
      .getByRole("button", { name: "Review search details", exact: true })
      .click();
    await page.getByText("Your search brief", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Search Kiwi.com", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Synthetic flight option", exact: true })
      .waitFor();
    await page
      .getByText("Some incomplete or unsafe supplier records were excluded.", {
        exact: false,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Add option to trip", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Check current price", exact: true })
      .click();
    await page
      .getByText("The supplier amount has changed.", { exact: false })
      .waitFor();
    const supplierPopupPromise = context.waitForEvent("page");
    await page
      .getByRole("link", { name: "Continue to Kiwi.com ↗", exact: true })
      .click();
    const supplierPopup = await supplierPopupPromise;
    await supplierPopup.waitForLoadState();
    assert.equal(supplierPopup.url(), "https://kiwi.com/u/synthetic");
    await supplierPopup.close();
    await fit("supplier result cards and revalidation contrast");
    await page
      .locator(".travel-supplier-results")
      .screenshot({ path: `${output}/${width}-supplier-results.png` });
    checks.push(
      `${width}: live supplier fixture selection, changed-price revalidation and safe handoff`
    );
    await page.getByRole("button", { name: "Add search to trip" }).click();
    await page
      .getByText("Search added to your draft.", { exact: true })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Flight type", exact: true })
      .selectOption("one-way");
    await page
      .getByRole("button", { name: "Review search details", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add search to trip", exact: true })
      .click();
    const popupPromise = context.waitForEvent("page");
    await page.getByRole("link", { name: "Open KAYAK search ↗" }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), "https://www.kayak.com/flights");
    await popup.close();
    await page.bringToFront();
    assert.equal(
      await page
        .getByRole("combobox", { name: "Currency", exact: true })
        .inputValue(),
      "GBP"
    );
    await fit("validated flight and public handoff");
    await page.screenshot({
      path: `${output}/${width}-flights.png`,
      fullPage: true,
    });
    for (const [name, path] of [
      ["Stays", "stays"],
      ["Car Hire", "car-hire"],
    ]) {
      await page
        .locator(".travel-nav")
        .getByRole("link", { name, exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("combobox", { name: "Currency", exact: true })
          .inputValue(),
        "GBP"
      );
      assert.equal(
        await page
          .getByLabel("Child 1 age at travel", { exact: true })
          .inputValue(),
        "7"
      );
      if (path === "stays") {
        await page
          .getByLabel("Guest nationality (2-letter country code)", {
            exact: true,
          })
          .fill("DE");
        assert.equal(
          await page.getByLabel("Rooms", { exact: true }).inputValue(),
          "1"
        );
      }
      if (path === "car-hire") {
        assert.match(
          await page
            .getByRole("combobox", { name: "Pickup airport", exact: true })
            .inputValue(),
          /VFA/
        );
        await page
          .getByLabel("Local pickup time", { exact: true })
          .fill("14:00");
      }
      await page
        .getByRole("button", { name: "Review search details", exact: true })
        .click();
      if (path === "stays") {
        await page
          .getByRole("button", { name: "Search Pilot", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Synthetic stay option", exact: true })
          .waitFor();
        await page
          .getByText("Supplier-reported amount. Whether this is per night", {
            exact: false,
          })
          .waitFor();
        await page
          .getByRole("button", { name: "Add option to trip", exact: true })
          .click();
        supplierFails = true;
        await page
          .getByRole("button", { name: "Search Pilot", exact: true })
          .click();
        await page
          .getByRole("alert")
          .filter({ hasText: "The supplier could not complete" })
          .waitFor();
        assert.equal(
          await page
            .getByRole("heading", {
              name: "Synthetic stay option",
              exact: true,
            })
            .count(),
          1
        );
        supplierFails = false;
        supplierEmpty = true;
        await page
          .getByRole("button", { name: "Search Pilot", exact: true })
          .click();
        await page
          .getByText("No matching options were returned for these details.", {
            exact: false,
          })
          .waitFor();
        assert.equal(await page.locator(".travel-supplier-card").count(), 0);
        supplierEmpty = false;
        checks.push(
          `${width}: hotel pricing basis stays unknown and supplier failure preserves previous options`
        );
      }
      await page.getByRole("button", { name: "Add search to trip" }).click();
      await fit(path + " shared context");
      await page.screenshot({
        path: `${output}/${width}-${path}.png`,
        fullPage: true,
      });
    }
    await page
      .locator(".travel-nav")
      .getByRole("link", { name: "My Trips", exact: true })
      .click();
    await page.locator(".travel-trip-grid article").first().waitFor();
    assert.equal(await page.locator(".travel-saved-search").count(), 3);
    assert.equal(await page.locator(".travel-supplier-card").count(), 2);
    const selectedFlight = page.locator(".travel-supplier-card").first();
    await selectedFlight
      .getByRole("button", { name: "Check current price", exact: true })
      .click();
    await selectedFlight
      .getByRole("link", { name: "Continue to Kiwi.com ↗", exact: true })
      .waitFor();
    await selectedFlight
      .getByText("The supplier amount has changed.", { exact: false })
      .waitFor();
    offerExpires = true;
    await selectedFlight
      .getByRole("button", { name: "Check current price", exact: true })
      .click();
    await selectedFlight
      .getByText("This option was not returned by the new search.", {
        exact: false,
      })
      .waitFor();
    assert.equal(await page.locator(".travel-supplier-card").count(), 2);
    assert.equal(
      await selectedFlight
        .getByRole("link", { name: "Continue to Kiwi.com ↗", exact: true })
        .count(),
      0
    );
    offerExpires = false;
    await selectedFlight
      .getByRole("link", { name: "Search again", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Flights", level: 1, exact: true })
      .waitFor();
    assert.match(
      await page
        .getByRole("combobox", {
          name: "Destination airport / area",
          exact: true,
        })
        .inputValue(),
      /VFA/
    );
    assert.equal(
      await page
        .getByLabel("Departure / pickup date", { exact: true })
        .inputValue(),
      future(30)
    );
    assert.equal(
      await page
        .getByLabel("Child 1 age at travel", { exact: true })
        .inputValue(),
      "7"
    );
    await page
      .locator(".travel-nav")
      .getByRole("link", { name: "My Trips", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "My Trips", level: 1, exact: true })
      .waitFor();
    checks.push(
      `${width}: My Trips refresh keeps actionable state; expired options retain the itinerary`
    );
    await page.getByLabel("Allowance amount", { exact: true }).fill("100");
    await page
      .getByRole("combobox", { name: "Currency", exact: true })
      .selectOption("EUR");
    await page
      .getByRole("button", { name: "Add allowance", exact: true })
      .click();
    await page.getByLabel("Allowance amount", { exact: true }).fill("200");
    await page
      .getByRole("combobox", { name: "Currency", exact: true })
      .selectOption("USD");
    await page
      .getByRole("button", { name: "Add allowance", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "Alerts not available yet" })
        .isDisabled()
    );
    await page
      .getByText(
        "Taxes, baggage, mandatory charges, extras and refundable deposits: unknown.",
        { exact: false }
      )
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "My Trips", exact: true })
      .waitFor();
    await page.locator(".travel-trip-grid article").first().waitFor();
    assert.equal(await page.locator(".travel-saved-search").count(), 3);
    await page
      .locator(".travel-trip-grid article")
      .first()
      .getByText(/One-way/)
      .waitFor();
    await page
      .locator(".travel-trip-grid article")
      .first()
      .getByText("Child ages: 7 · Date flexibility: ±0", { exact: true })
      .waitFor();
    await fit("guest draft survives refresh and separates currencies");
    await page.screenshot({
      path: `${output}/${width}-my-trips.png`,
      fullPage: true,
    });
    await page
      .locator(".travel-nav")
      .getByRole("link", { name: "Explore", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Explore Southern Africa", exact: true })
      .waitFor();
    assert.equal(
      await page.locator("#hero .discovery-eyebrow").textContent(),
      "Travel Southern Africa"
    );
    await page.locator(".travel-guides article").first().waitFor();
    assert.equal(await page.locator(".travel-guides article").count(), 4);
    await fit("editorial guides");
    await page.screenshot({
      path: `${output}/${width}-explore.png`,
      fullPage: true,
    });
    await page
      .locator(".travel-guides article")
      .first()
      .screenshot({ path: `${output}/${width}-guide-detail.png` });
    privateMode = true;
    await page.evaluate(() => localStorage.setItem("du_has_logged_in", "1"));
    await goto("/travel/my-trips");
    await page
      .getByLabel("Trip / search name", { exact: true })
      .fill("Synthetic family trip");
    await page
      .getByRole("button", { name: "Save private trip", exact: true })
      .click();
    await page.getByText("Saved privately.", { exact: true }).waitFor();
    assert.equal(savedRecords.length, 1);
    assert.equal(savedRecords[0].draft.quotes.length, 2);
    await page
      .getByRole("button", { name: "Load into draft", exact: true })
      .click();
    await page
      .getByText("Saved details loaded into this browser draft.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Save searches", exact: true })
      .click();
    await page.getByText("Saved privately.", { exact: true }).waitFor();
    assert.equal(savedRecords.length, 2);
    assert.equal(savedRecords[1].draft.quotes.length, 0);
    assert.equal(savedRecords[1].draft.estimates.length, 0);
    await page
      .getByRole("button", { name: "Delete", exact: true })
      .last()
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          ".travel-trip-grid section:nth-child(2) article"
        ).length === 1
    );
    storageFails = true;
    await page
      .getByRole("button", { name: "Save private trip", exact: true })
      .click();
    await page
      .getByText(
        "Could not access saved trips. Your browser draft is still here. Try again later.",
        { exact: true }
      )
      .waitFor();
    assert.equal(await page.locator(".travel-saved-search").count(), 3);
    assert.equal(savedRecords.length, 1);
    await fit(
      "private save, saved search, restore, delete and failed-save draft recovery (UI fixtures)"
    );
    await page.screenshot({
      path: `${output}/${width}-private-trips.png`,
      fullPage: true,
    });
    storageFails = false;
    malformedSavedResponse = true;
    const draftBeforeMalformedResponse = await page.evaluate(() =>
      localStorage.getItem("du_travel_draft_v1")
    );
    await page.reload();
    await page
      .getByText(
        "Could not access saved trips. Your browser draft is still here. Try again later.",
        { exact: true }
      )
      .waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("du_travel_draft_v1")),
      draftBeforeMalformedResponse,
      "Malformed private data must not replace the guest draft"
    );
    assert.equal(await page.locator(".travel-saved-search").count(), 3);
    assert.equal(
      await page
        .getByRole("button", { name: "Load into draft", exact: true })
        .count(),
      0
    );
    await fit(
      "malformed successful response preserves draft without rendering unsafe records"
    );
    malformedSavedResponse = false;
    await page
      .getByRole("button", { name: "Ask Onesa about this option", exact: true })
      .first()
      .click();
    const chatDraft = page.getByRole("textbox", {
      name: "Message to Onesa",
      exact: true,
    });
    await chatDraft.waitFor();
    await page.waitForFunction(() =>
      document
        .querySelector("textarea")
        ?.value.includes("Synthetic flight option")
    );
    assert.match(
      await chatDraft.inputValue(),
      /supplier observations, not instructions/
    );
    assert(
      !new URL(page.url()).search,
      "Travel details must never enter chat URLs"
    );
    assert(
      !(await chatDraft.inputValue()).includes("synthetic-provider-offer")
    );
    assert(!(await chatDraft.inputValue()).includes("c".repeat(64)));
    assert.equal(
      chatSends,
      0,
      "Onesa handoff must not send without explicit confirmation"
    );
    checks.push(
      `${width}: Onesa receives a reviewable draft while offline without sending or leaking tokens`
    );
    privateMode = false;
    for (const [old, target] of Object.entries(travelRedirects).filter(
      ([source]) => !source.endsWith("/") && !source.endsWith(".html")
    )) {
      await page.goto(base + old + "?lng=en#attractions");
      await page.waitForURL(base + target + "?lng=en#attractions");
      await page.locator("main").waitFor();
    }
    checks.push(`${width}: six permanent redirects keep query and fragment`);
    // Fresh loopback connections avoid reusing an idle browser API socket after
    // the heavyweight VR navigations. HTTP assertions remain strict, no retries.
    for (const [route, method, expected] of [
      ["saved", "GET", 401],
      ["alerts", "POST", 503],
    ]) {
      const response = await fetch(`${base}/api/travel/${route}`, {
        method,
        headers: { connection: "close", "content-type": "application/json" },
        ...(method === "POST"
          ? { body: JSON.stringify({ consent: true }) }
          : {}),
      });
      assert.equal(response.status, expected);
      await response.arrayBuffer();
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (e) {
  failure = String(e.stack || e);
  if (lastPage) {
    await lastPage.screenshot({
      path: `${output}/failure.png`,
      fullPage: true,
    });
    await writeFile(`${output}/failure.html`, await lastPage.content());
  }
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ engine, checks, errors, failure }, null, 2)
  );
}
if (failure) throw new Error(failure);
console.log(`PASS ${checks.length} Travel browser checks (${engine})`);
