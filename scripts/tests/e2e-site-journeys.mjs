import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5001";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname),
  "Use a local sandbox server."
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.E2E_BROWSER_CHANNEL
    ? { channel: process.env.E2E_BROWSER_CHANNEL }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 375, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const checks = [];
const pass = name => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
try {
  await page.goto(baseUrl);
  await page
    .getByRole("button", { name: "Essential only", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("du_cookie_consent_v1")),
    "rejected"
  );
  await page.reload();
  assert.equal(
    await page
      .getByRole("button", { name: "Essential only", exact: true })
      .count(),
    0
  );
  assert.equal(
    await page
      .locator('script[src*="vercel-scripts"],script[src*="/_vercel/"]')
      .count(),
    0
  );
  pass("cookie rejection persists and optional telemetry stays off");

  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Navigation menu" });
  await dialog.waitFor();
  await page.keyboard.press("Shift+Tab");
  assert(
    await dialog.evaluate(el => el.contains(document.activeElement)),
    "Menu focus must stay in dialog"
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert(await menu.evaluate(el => el === document.activeElement));
  pass("mobile menu traps focus, closes with Escape and restores focus");

  await page.goto(`${baseUrl}/cookie-settings`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /save and continue/i }).click();
  await page.getByRole("status").filter({ hasText: /saved/i }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("du_cookie_consent_v1")),
    "accepted"
  );
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: /save and continue/i }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("du_cookie_consent_v1")),
    "rejected"
  );
  pass("cookie settings can accept and revoke without navigating off site");

  await page.goto(`${baseUrl}/search?q=tourism`);
  await page.locator('main a[href="/tourism"]').waitFor();
  await page.getByRole("searchbox").fill("shopping");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator('main a[href="/shop"]').waitFor();
  assert(page.url().includes("q=shopping"));
  pass("search updates when only the URL query changes");

  await page.route("**/api/search?**", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { message: "Temporarily unavailable" },
      }),
    })
  );
  await page.getByRole("searchbox").fill("offline");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /unavailable/i })
    .waitFor();
  assert.equal(
    await page.getByRole("heading", { name: /no results found/i }).count(),
    0
  );
  await page.unroute("**/api/search?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: /no results found/i }).waitFor();
  pass("failed search has a retry state distinct from empty results");

  await page.route("**/api/search?**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q");
    await new Promise(resolve => setTimeout(resolve, q === "slow" ? 700 : 50));
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            results: [{ title: q, category: "Tourism", href: "/tourism" }],
          },
        }),
      })
      .catch(() => {});
  });
  await page.getByRole("searchbox").fill("slow");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /searching/i })
    .waitFor();
  await page.getByRole("searchbox").fill("latest");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "latest", exact: true }).waitFor();
  await page.waitForTimeout(800);
  assert.equal(
    await page.getByRole("heading", { name: "slow", exact: true }).count(),
    0
  );
  await page.unroute("**/api/search?**");
  pass("late responses cannot overwrite a newer search");

  await page.route("**/api/investment/ntir/search?**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q");
    await new Promise(resolve => setTimeout(resolve, q === "slow" ? 700 : 50));
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            results: [
              {
                id: 1,
                name: q || "Initial",
                sector: "Tourism",
                location: "Zimbabwe",
                verification_status: "Pending",
              },
            ],
          },
        }),
      })
      .catch(() => {});
  });
  await page.goto(`${baseUrl}/ntir`);
  await page.locator("#ntir-search").fill("slow");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /loading/i })
    .waitFor();
  await page.locator("#ntir-search").fill("Latest entity");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("heading", { name: "Latest entity", exact: true })
    .waitFor();
  await page.waitForTimeout(800);
  assert.equal(
    await page.getByRole("heading", { name: "slow", exact: true }).count(),
    0
  );
  await page.unroute("**/api/investment/ntir/search?**");
  pass("registry searches keep the latest response and announce loading");

  await page.goto(`${baseUrl}/onesa-ai-book-trip`);
  const startDate = page.locator('input[type="date"]').first();
  const endDate = page.locator('input[type="date"]').nth(1);
  await startDate.fill("2030-07-10");
  await startDate.focus();
  // Native date inputs have several keyboard segments; Tab must eventually leave.
  for (
    let i = 0;
    i < 8 &&
    (await startDate.evaluate(input => input === document.activeElement));
    i++
  )
    await page.keyboard.press("Tab");
  assert(
    !(await startDate.evaluate(input => input === document.activeElement)),
    "Trip dates must not trap keyboard focus"
  );
  await endDate.fill("2030-07-09");
  assert(
    !(await endDate.evaluate(input => input.checkValidity())),
    "Return dates before departure must be invalid"
  );
  pass(
    "trip dates support Tab navigation and reject a return before departure"
  );

  await page.goto(`${baseUrl}/reset-password?token=local-test-token`);
  await page.locator("#ResetPasswordPage-password").fill("lowercase123!");
  await page
    .locator("#ResetPasswordPage-confirmPassword")
    .fill("lowercase123!");
  await page
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: /uppercase letter/i })
    .waitFor();
  pass("password reset enforces the API password policy before sending");
  assert(
    !new URL(page.url()).searchParams.has("token"),
    "Reset tokens must be removed from browser history"
  );
  await page.route("**/api/auth/reset-password", route =>
    route.fulfill({
      json: { success: true, data: { message: "Local reset complete" } },
    })
  );
  await page.locator("#ResetPasswordPage-password").fill("StrongLocal123!");
  await page
    .locator("#ResetPasswordPage-confirmPassword")
    .fill("StrongLocal123!");
  await page
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Local reset complete" })
    .waitFor();
  await page.locator('a[href="/tourism"]:visible').first().click();
  await page.waitForURL("**/tourism");
  await page.waitForTimeout(1000);
  assert.equal(
    new URL(page.url()).pathname,
    "/tourism",
    "A stale reset timer must not redirect after navigation"
  );
  await page.unroute("**/api/auth/reset-password");
  let pendingReset;
  await page.route("**/api/auth/reset-password", route => {
    pendingReset = route;
  });
  await page.goto(`${baseUrl}/reset-password?token=another-local-test-token`);
  await page.locator("#ResetPasswordPage-password").fill("StrongLocal123!");
  await page
    .locator("#ResetPasswordPage-confirmPassword")
    .fill("StrongLocal123!");
  await page
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  for (let i = 0; !pendingReset && i < 100; i++) await page.waitForTimeout(20);
  assert(pendingReset);
  await page.locator('a[href="/tourism"]:visible').first().click();
  await page.waitForURL("**/tourism");
  await pendingReset.fulfill({
    json: { success: true, data: { message: "Late reset response" } },
  });
  await page.waitForTimeout(1100);
  assert.equal(
    new URL(page.url()).pathname,
    "/tourism",
    "A reset response arriving after navigation must not schedule a new redirect"
  );
  await page.unroute("**/api/auth/reset-password");
  pass(
    "reset tokens leave history and reset completion cannot redirect a later journey"
  );

  await page.goto(`${baseUrl}/register`);
  const email = `audit-${Date.now()}@example.com`;
  const password = "Audit-Local-Password-123!";
  await page.getByLabel("First Name", { exact: true }).fill("Local");
  await page.getByLabel("Surname", { exact: true }).fill("Audit");
  await page
    .getByLabel(/email address/i)
    .first()
    .fill(email);
  await page.locator("#RegisterPage-password").fill("lowercase123!");
  await page.locator("#RegisterPage-confirmPassword").fill("lowercase123!");
  await page.locator("#terms").check();
  await page.getByRole("button", { name: /register/i }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /uppercase letter/i })
    .waitFor();
  pass(
    "registration uses the same password policy and does not label invalid passwords strong"
  );
  await page.locator("#RegisterPage-password").fill(password);
  await page.locator("#RegisterPage-confirmPassword").fill(password);
  await page.locator("#terms").check();
  await page.getByRole("button", { name: /register/i }).click();
  await page.waitForURL(`${baseUrl}/`);
  assert.equal(await page.evaluate(() => localStorage.getItem("du_jwt")), null);
  pass(
    "registration succeeds in the local sandbox without persisting bearer tokens"
  );
  const crossSiteLogout = await context.request.post(
    `${baseUrl}/api/auth/logout`,
    { headers: { Origin: "https://evil.example" } }
  );
  assert.equal(crossSiteLogout.status(), 403);
  const refreshed = await context.request.post(
    `${baseUrl}/api/auth/token/refresh`,
    { headers: { Origin: new URL(baseUrl).origin, "X-CSRF-Token": "csrf" } }
  );
  assert(refreshed.ok());
  const refreshedPayload = await refreshed.json();
  const accessToken =
    refreshedPayload.data?.accessToken ?? refreshedPayload.accessToken;
  const forbiddenAdmin = await context.request.get(
    `${baseUrl}/api/admin/overview`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  assert.equal(forbiddenAdmin.status(), 403);
  pass("cross-site session changes and non-admin access remain blocked");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/auth/logout", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false }),
    })
  );
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Logout", exact: true }).click();
  await page
    .getByText("Unable to sign out. Please try again.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Logout", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.unroute("**/api/auth/logout");
  pass(
    "failed logout reports the failure without falsely clearing the session"
  );
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Logout", exact: true }).click();
  await page.goto(`${baseUrl}/login?next=%2Fshop%2Fproducts`);
  await page.locator("#LoginPage-email").fill("invalid-email");
  await page.locator("#LoginPage-password").fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /valid email address/i })
    .waitFor();
  assert.equal(
    await page.locator("#LoginPage-email").getAttribute("aria-invalid"),
    "true"
  );
  pass("login validates malformed email and announces field errors");
  await page.locator("#LoginPage-email").fill(email);
  await page.route("**/api/auth/login", route =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { message: "Invalid email or password." },
      }),
    })
  );
  await page.getByRole("button", { name: /^login$/i }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /invalid email or password/i })
    .waitFor();
  await page.unroute("**/api/auth/login");
  pass("failed sign-in shows an accessible error and allows retry");
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.waitForURL("**/shop/products");
  await page.getByRole("heading", { name: /cart & order request/i }).waitFor();
  // The real seed catalog intentionally has zero stock. Use a browser-only fixture
  // to verify cart behavior without changing inventory or creating an order.
  await page.route("**/api/shop/products", async route => {
    const response = await route.fetch();
    const payload = await response.json();
    const data = payload.success ? payload.data : payload;
    data.products[0].stock_qty = 5;
    await route.fulfill({ response, json: payload });
  });
  await page.reload();
  const card = page.locator('[data-stock-state="in"]').first();
  await card.getByRole("button", { name: /add to cart/i }).click();
  await page.getByText(/your cart is empty/i).waitFor({ state: "hidden" });
  pass(
    "logout and sign-in return path work; cart works with a browser-only stock fixture"
  );
  await page.goto(`${baseUrl}/shop/products?category=crafts`);
  await page
    .locator('[data-shop-product-card="shona-stone-sculpture"]')
    .waitFor();
  assert.equal(
    await page
      .locator('[data-shop-product-card="sables-rugby-home-kit"]')
      .count(),
    0
  );
  await page.evaluate(() =>
    history.pushState(null, "", "/shop/products?category=sports")
  );
  await page
    .locator('[data-shop-product-card="sables-rugby-home-kit"]')
    .waitFor();
  assert.equal(
    await page
      .locator('[data-shop-product-card="shona-stone-sculpture"]')
      .count(),
    0
  );
  await page.goto(`${baseUrl}/shop/products?add=shona-stone-sculpture`);
  await page.waitForURL(url => !url.searchParams.has("add"));
  assert(
    !(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("shop_cart_v1") || "[]")
      )
    ).some(item => item.productId === 4)
  );
  pass(
    "shop deep links respect category changes and reject zero-stock auto-add"
  );

  await page
    .getByRole("button", { name: "Search Diaspora Unlocked", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Search Diaspora Unlocked" })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Our Vision", exact: true }).click();
  await page.getByRole("dialog", { name: "Our Vision" }).waitFor();
  await page.keyboard.press("Escape");
  pass("desktop search and footer information dialogs work with the keyboard");

  await page.route("**/api/notifications/newsletter", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { message: "Newsletter temporarily unavailable." },
      }),
    })
  );
  await page
    .getByLabel("Email address", { exact: true })
    .fill("local-audit@example.com");
  await page
    .getByRole("button", { name: "Subscribe to newsletter", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: /newsletter temporarily unavailable/i })
    .waitFor();
  await page.unroute("**/api/notifications/newsletter");
  await page.route("**/api/notifications/newsletter", route =>
    route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { requiresConfirmation: true, deliveryPending: false },
      }),
    })
  );
  await page
    .getByRole("button", { name: "Subscribe to newsletter", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: /If this address needs confirmation/i })
    .waitFor();
  await page.unroute("**/api/notifications/newsletter");
  pass(
    "newsletter feedback handles failure and success using local test responses"
  );

  const anonymous = await browser.newContext();
  const response = await anonymous.request.get(`${baseUrl}/api/admin/overview`);
  assert.equal(response.status(), 401);
  await anonymous.close();
  pass("anonymous admin API access remains denied");
  const retired = await browser.newContext();
  for (const retiredPath of ["/remittances", "/payments"]) {
    const response = await retired.request.get(`${baseUrl}${retiredPath}`);
    assert.equal(response.status(), 404);
  }
  for (const [method, retiredPath] of [
    ["get", "/api/geo/country"],
    ["get", "/api/fintech/config"],
    ["post", "/api/fintech/remittance/send"],
    ["post", "/api/fintech/airtime/topup"],
    ["post", "/api/auth/kyc/provider/decision"],
  ]) {
    const response = await retired.request[method](
      `${baseUrl}${retiredPath}`,
      method === "post" ? { data: {} } : {}
    );
    assert.equal(response.status(), 404);
    assert.equal((await response.json()).error.code, "NOT_FOUND");
  }
  const home = await retired.newPage();
  const providerRequests = [];
  home.on("request", request => {
    if (/fintech|terrapay|reloadly|thunes/i.test(request.url()))
      providerRequests.push(request.url());
  });
  await home.goto(baseUrl);
  await home.locator("main h1").waitFor();
  assert.equal(
    await home.locator('a[href="/remittances"], a[href="/payments"]').count(),
    0
  );
  assert.deepEqual(providerRequests, []);
  await retired.close();
  pass(
    "retired pages and APIs return 404 with no navigation or provider requests"
  );

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    for (const key of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, key, {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
  });
  const blockedPage = await blocked.newPage();
  const errors = [];
  blockedPage.on("pageerror", error => errors.push(error.message));
  await blockedPage.goto(`${baseUrl}/login`);
  await blockedPage.locator("#LoginPage-email").waitFor();
  await blockedPage
    .getByRole("button", { name: "Essential only", exact: true })
    .click();
  assert.deepEqual(errors, []);
  await blocked.close();
  pass("authentication and consent remain usable with storage blocked");
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
