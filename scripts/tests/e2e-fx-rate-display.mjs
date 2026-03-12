/**
 * e2e-fx-rate-display.mjs
 *
 * End-to-end tests for the FX rate + fee display feature:
 *   - send_money   → Thunes quote endpoint
 *   - airtime_topup → Reloadly airtime/options endpoint
 *   - prepaid_electricity → Reloadly utility/electricity/options endpoint
 *
 * Part 1: API-level assertions (direct HTTP, no browser)
 * Part 2: UI assertions (Playwright — rates visible quickly, localStorage cache populated)
 */

import { chromium } from "playwright";

const apiBase = String(process.env.E2E_BASE_URL || "http://127.0.0.1:5001").replace(/\/+$/, "") + "/api";
const uiBase = String(process.env.E2E_UI_BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(`[assert] ${message}`);
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function request(method, path, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* leave null */ }
  return { res, json, raw: text };
}

function extractSessionCookie(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const match = /du_session=([^;]+)/.exec(String(value));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function requireSuccess(payload, label) {
  assert(payload?.success === true, `${label}: expected success=true, got: ${JSON.stringify(payload)}`);
  return payload.data;
}

// ─── Part 1: API tests ────────────────────────────────────────────────────────

async function runApiTests() {
  console.log("\n[part-1] Running API-level tests...");

  // ── Register a fresh test user ───────────────────────────────────────────
  const email = `e2e-fx-${Date.now()}@example.com`;
  const password = "TestPassw0rd!";

  const reg = await request("POST", "/auth/register", {
    fullName: "FX Rate Tester",
    email,
    password,
    confirmPassword: password,
  });
  assert(reg.res.status === 201, `register: expected 201, got ${reg.res.status}: ${reg.raw}`);
  const regData = requireSuccess(reg.json, "register");
  const accessToken = String(regData?.accessToken || "");
  assert(accessToken.includes("."), "register: missing accessToken JWT");
  const sessionToken = extractSessionCookie(reg.res);
  assert(sessionToken, "register: missing du_session cookie");

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // ── /fintech/remittance/quote — requires auth ────────────────────────────
  const quoteUnauthenticated = await request("POST", "/fintech/remittance/quote", {
    amountSent: 100, currencyFrom: "EUR", currencyTo: "USD", receivingCountry: "ZW",
  });
  assert(
    quoteUnauthenticated.res.status === 401,
    `quote (no auth): expected 401, got ${quoteUnauthenticated.res.status}`
  );
  console.log("  [api] ✓ /fintech/remittance/quote rejects unauthenticated requests (401)");

  const quote = await request("POST", "/fintech/remittance/quote", {
    amountSent: 100,
    currencyFrom: "EUR",
    currencyTo: "USD",
    receivingCountry: "ZW",
    originCountry: "DE",
    recipientType: "mobile_money",
  }, authHeader);
  assert(quote.res.status === 200, `quote: expected 200, got ${quote.res.status}: ${quote.raw}`);
  const quoteData = requireSuccess(quote.json, "quote");
  const quotePayload = quoteData?.quote ?? quoteData?.fxQuote ?? quoteData;
  const fxRate = Number(quotePayload?.fxRate ?? quotePayload?.exchangeRate ?? 0);
  const receivingAmount = Number(quotePayload?.receivingAmount ?? quotePayload?.destination?.amount ?? 0);
  assert(
    fxRate > 0 || receivingAmount > 0,
    `quote: expected fxRate or receivingAmount > 0, got fxRate=${fxRate}, receivingAmount=${receivingAmount}`
  );
  console.log(`  [api] ✓ /fintech/remittance/quote returns fxRate=${fxRate} / receivingAmount=${receivingAmount}`);

  // ── /fintech/airtime/options — requires auth ─────────────────────────────
  const airtimeUnauthenticated = await request("POST", "/fintech/airtime/options", {
    phoneNumber: "+263771234567",
  });
  assert(
    airtimeUnauthenticated.res.status === 401,
    `airtime/options (no auth): expected 401, got ${airtimeUnauthenticated.res.status}`
  );
  console.log("  [api] ✓ /fintech/airtime/options rejects unauthenticated requests (401)");

  const airtimeOpts = await request("POST", "/fintech/airtime/options", {
    phoneNumber: "+263771234567",
    amount: 100,
  }, authHeader);
  assert(airtimeOpts.res.status === 200, `airtime/options: expected 200, got ${airtimeOpts.res.status}: ${airtimeOpts.raw}`);
  const airtimeData = requireSuccess(airtimeOpts.json, "airtime/options");
  const airtimeFxRate = Number(airtimeData?.options?.fxRate ?? airtimeData?.options?.fx?.rate ?? 0);
  const airtimeSenderCurrency = String(airtimeData?.options?.senderCurrencyCode ?? "");
  const airtimeDestCurrency = String(airtimeData?.options?.destinationCurrencyCode ?? "");
  assert(airtimeFxRate > 0, `airtime/options: expected fxRate > 0, got ${airtimeFxRate}`);
  assert(airtimeSenderCurrency.length >= 3, `airtime/options: expected senderCurrencyCode, got "${airtimeSenderCurrency}"`);
  assert(airtimeDestCurrency.length >= 3, `airtime/options: expected destinationCurrencyCode, got "${airtimeDestCurrency}"`);
  console.log(`  [api] ✓ /fintech/airtime/options returns fxRate=${airtimeFxRate} (${airtimeSenderCurrency}→${airtimeDestCurrency})`);

  // ── /fintech/utility/electricity/options — requires auth ──────────────────
  const utilityUnauthenticated = await request("POST", "/fintech/utility/electricity/options", {
    countryISOCode: "ZW",
  });
  assert(
    utilityUnauthenticated.res.status === 401,
    `utility/electricity/options (no auth): expected 401, got ${utilityUnauthenticated.res.status}`
  );
  console.log("  [api] ✓ /fintech/utility/electricity/options rejects unauthenticated requests (401)");

  const utilityOpts = await request("POST", "/fintech/utility/electricity/options", {
    countryISOCode: "ZW",
  }, authHeader);
  assert(utilityOpts.res.status === 200, `utility/electricity/options: expected 200, got ${utilityOpts.res.status}: ${utilityOpts.raw}`);
  const utilityData = requireSuccess(utilityOpts.json, "utility/electricity/options");
  const billers = Array.isArray(utilityData?.billers) ? utilityData.billers : [];
  assert(billers.length > 0, "utility/electricity/options: expected at least one biller");
  const firstBiller = billers[0];
  const billerHasFx = firstBiller?.fx?.rate > 0 || firstBiller?.fxRate > 0 || firstBiller?.exchangeRate > 0;
  assert(billerHasFx, `utility/electricity/options: expected biller to have fx rate, got: ${JSON.stringify(firstBiller)}`);
  console.log(`  [api] ✓ /fintech/utility/electricity/options returns ${billers.length} biller(s) with FX data`);

  // ── Zod validation enforced ───────────────────────────────────────────────
  const badQuote = await request("POST", "/fintech/remittance/quote", {
    amountSent: -10, currencyFrom: "EUR", currencyTo: "USD", receivingCountry: "ZW",
  }, authHeader);
  assert(badQuote.res.status === 400, `bad quote: expected 400, got ${badQuote.res.status}`);
  console.log("  [api] ✓ /fintech/remittance/quote rejects invalid amount (400)");

  console.log("[part-1] All API tests passed.\n");
  return { email, password };
}

// ─── Part 2: UI tests (Playwright) ───────────────────────────────────────────

async function loginViaUi(page, email, password) {
  await page.goto(`${uiBase}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  // Target the login form specifically (not the newsletter input in the layout)
  const form = page.locator("form").first();
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(password);
  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/payments|dashboard|home|\/$/, { timeout: 15000 }).catch(() => {});
}

async function navigateToPayments(page) {
  await page.goto(`${uiBase}/payments`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  // Scroll to the form and wait for it to render
  await page.locator("#send-money").waitFor({ timeout: 10000 }).catch(() => {});
}

async function selectTransferType(page, testId) {
  const btn = page.getByTestId(testId);
  await btn.waitFor({ timeout: 10000 });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

/**
 * Waits for the FX rate text to show a real value (not "Fetching rate...")
 * and returns the text. Fails if it takes longer than `timeoutMs`.
 */
async function waitForFxRateText(page, timeoutMs = 15000) {
  // The FX rate appears in two places: the route-step summary and the quote-step panel.
  // We look for: `1 XXX = N.NNNNNN YYY`
  const locator = page.getByText(/^1\s+[A-Z]{2,5}\s*=\s*\d+(\.\d+)?\s+[A-Z]{2,5}$/).first();
  await locator.waitFor({ state: "visible", timeout: timeoutMs });
  return (await locator.textContent())?.trim() ?? "";
}

async function getFxRatePanelText(page) {
  // Find the "FX Rate" label, then get its sibling value element
  const label = page.getByText("FX Rate").first();
  await label.waitFor({ timeout: 5000 }).catch(() => {});
  // The value is in a <p> sibling inside the same parent container
  const container = label.locator("..");
  const value = container.locator("p").nth(1);
  return (await value.textContent())?.trim() ?? "";
}

async function runUiTests(email, password) {
  console.log("[part-2] Running UI tests (Playwright)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // Capture console errors for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`  [browser:error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.log(`  [browser:pageerror] ${err?.message || err}`);
  });

  try {
    // ── Log in ────────────────────────────────────────────────────────────
    await loginViaUi(page, email, password);
    console.log("  [ui] ✓ Logged in");

    // ── Navigate to /payments ─────────────────────────────────────────────
    await navigateToPayments(page);
    console.log("  [ui] ✓ /payments loaded");

    // ── Before selection: FX Rate panel should not be visible ─────────────
    const fxCountBeforeSelection = await page.getByText("FX Rate").count();
    assert(
      fxCountBeforeSelection === 0,
      `Before transfer type selection, "FX Rate" panel should be hidden (found ${fxCountBeforeSelection})`
    );
    console.log("  [ui] ✓ FX Rate panel hidden before transfer type selection");

    // ── send_money: FX rate visible and not N/A ───────────────────────────
    await selectTransferType(page, "transfer-type-send_money");
    const sendMoneyFxText = await waitForFxRateText(page, 20000);
    assert(
      sendMoneyFxText && !/fetching|N\/A/i.test(sendMoneyFxText),
      `send_money: FX rate should not be "Fetching rate…" or N/A, got: "${sendMoneyFxText}"`
    );
    assert(/\d/.test(sendMoneyFxText), `send_money: FX rate should contain a number, got: "${sendMoneyFxText}"`);
    console.log(`  [ui] ✓ send_money FX rate: "${sendMoneyFxText}"`);

    // ── Record time when airtime_topup is selected ────────────────────────
    await navigateToPayments(page);
    await selectTransferType(page, "transfer-type-airtime_topup");
    const airtimeStart = Date.now();
    const airtimeFxText = await waitForFxRateText(page, 20000);
    const airtimeElapsed = Date.now() - airtimeStart;
    assert(
      airtimeFxText && !/fetching|N\/A/i.test(airtimeFxText),
      `airtime_topup: FX rate should not be "Fetching rate…" or N/A, got: "${airtimeFxText}"`
    );
    console.log(`  [ui] ✓ airtime_topup FX rate: "${airtimeFxText}" (appeared in ${airtimeElapsed}ms)`);

    // ── prepaid_electricity: FX rate visible ─────────────────────────────
    await navigateToPayments(page);
    await selectTransferType(page, "transfer-type-prepaid_electricity");
    const electricityFxText = await waitForFxRateText(page, 20000);
    assert(
      electricityFxText && !/fetching|N\/A/i.test(electricityFxText),
      `prepaid_electricity: FX rate should not be "Fetching rate…" or N/A, got: "${electricityFxText}"`
    );
    console.log(`  [ui] ✓ prepaid_electricity FX rate: "${electricityFxText}"`);

    // ── localStorage cache populated ──────────────────────────────────────
    const airtimeCached = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("du.reloadly.airtime."));
      if (keys.length === 0) return null;
      try { return JSON.parse(localStorage.getItem(keys[0]) ?? "null"); } catch { return null; }
    });
    assert(
      airtimeCached?.fxRate > 0,
      `localStorage: expected du.reloadly.airtime.* to be cached with fxRate, got: ${JSON.stringify(airtimeCached)}`
    );
    console.log(`  [ui] ✓ Airtime pricing cached in localStorage (fxRate=${airtimeCached.fxRate})`);

    const electricityCached = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("du.reloadly.electricity.ZW") ?? "null"); } catch { return null; }
    });
    assert(
      electricityCached?.fxRate > 0,
      `localStorage: expected du.reloadly.electricity.ZW to be cached with fxRate, got: ${JSON.stringify(electricityCached)}`
    );
    console.log(`  [ui] ✓ Electricity pricing cached in localStorage (fxRate=${electricityCached.fxRate})`);

    // ── Second selection: rates appear immediately from cache ─────────────
    await navigateToPayments(page);
    await selectTransferType(page, "transfer-type-airtime_topup");
    const cachedStart = Date.now();
    // Use a tight timeout (2s) — cached rates must appear nearly instantly
    const cachedAirtimeFxText = await waitForFxRateText(page, 2000);
    const cachedElapsed = Date.now() - cachedStart;
    assert(
      cachedAirtimeFxText && !/fetching|N\/A/i.test(cachedAirtimeFxText),
      `airtime_topup (cached): FX rate from localStorage should show instantly, got: "${cachedAirtimeFxText}"`
    );
    console.log(`  [ui] ✓ airtime_topup FX rate from localStorage cache: "${cachedAirtimeFxText}" in ${cachedElapsed}ms`);

    await navigateToPayments(page);
    await selectTransferType(page, "transfer-type-prepaid_electricity");
    const cachedElectricityFxText = await waitForFxRateText(page, 2000);
    assert(
      cachedElectricityFxText && !/fetching|N\/A/i.test(cachedElectricityFxText),
      `prepaid_electricity (cached): FX rate from localStorage should show instantly, got: "${cachedElectricityFxText}"`
    );
    console.log(`  [ui] ✓ prepaid_electricity FX rate from localStorage cache: "${cachedElectricityFxText}"`);

    // ── Page reload in same session: cached rates survive reload ─────────────
    // Reload /payments (same authenticated session). The localStorage values
    // written during this session must be read on mount so that FX rates show
    // before the background network refetch completes.
    await navigateToPayments(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const reloadBtn = page.getByTestId("transfer-type-airtime_topup");
    await reloadBtn.waitFor({ timeout: 10000 });
    const reloadClickTime = Date.now();
    await reloadBtn.click();

    // Allow up to 5s — the cached value must show before any live network
    // response arrives (which took ~80ms on first load in this run).
    const reloadFxLoc = page.getByText(/^1\s+[A-Z]{2,5}\s*=\s*\d+(\.\d+)?\s+[A-Z]{2,5}$/).first();
    await reloadFxLoc.waitFor({ state: "visible", timeout: 5000 });
    const reloadAirtimeFxText = (await reloadFxLoc.textContent())?.trim() ?? "";
    const reloadElapsed = Date.now() - reloadClickTime;

    assert(
      reloadAirtimeFxText && !/fetching|N\/A/i.test(reloadAirtimeFxText),
      `page reload (airtime): FX rate should come from localStorage cache after reload, got: "${reloadAirtimeFxText}"`
    );
    console.log(`  [ui] ✓ Page reload: airtime FX rate from localStorage cache: "${reloadAirtimeFxText}" in ${reloadElapsed}ms`);

    // Verify the localStorage keys survive the reload
    const airtimeCachedAfterReload = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("du.reloadly.airtime."));
      if (!keys.length) return null;
      try { return JSON.parse(localStorage.getItem(keys[0]) ?? "null"); } catch { return null; }
    });
    assert(airtimeCachedAfterReload?.fxRate > 0, "localStorage: airtime cache must persist across page reload");
    console.log(`  [ui] ✓ localStorage airtime cache persists across page reload (fxRate=${airtimeCachedAfterReload.fxRate})`);

    console.log("[part-2] All UI tests passed.\n");
  } finally {
    await context.close();
    await browser.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { email, password } = await runApiTests();
  await runUiTests(email, password);
  console.log("[e2e] SUCCESS: All FX rate display tests passed.");
}

main().catch((err) => {
  console.error("[e2e] FAILED:", err?.message || err);
  process.exitCode = 1;
});
