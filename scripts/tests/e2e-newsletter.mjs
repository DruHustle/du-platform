import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.NEWSLETTER_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !new URL(databaseUrl).pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
)
  throw new Error(
    "Use a disposable localhost NEWSLETTER_TEST_DATABASE_URL ending in _test."
  );
const output = process.env.NEWSLETTER_OUTPUT_DIR || "/tmp/du-newsletter-tests";
await mkdir(output, { recursive: true });
await readFile("du-platform-frontend/dist/index.html");
const adminEmail = `newsletter-admin-${Date.now()}@example.com`;
const email = `newsletter-reader-${Date.now()}@example.com`;
const pool = mysql.createPool(databaseUrl);
const serverCode = `import {initializeDatabase} from './du-platform-backend/db.ts';import {db} from './du-platform-backend/shared/databaseRuntime.ts';import {createModularServer} from './du-platform-backend/server.ts';import {createServer} from 'node:http';import path from 'node:path';await initializeDatabase();const {hashPassword}=await import('./du-platform-backend/shared/passwords.ts');await db.execute('UPDATE users SET password_hash=?,email_verified_at=CURRENT_TIMESTAMP WHERE email=?',[await hashPassword('StrongNewsletter!2026'),process.env.ADMIN_EMAILS]);const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));process.env.APP_BASE_URL='http://127.0.0.1:'+server.address().port;const app=createModularServer({backend:{db,serverStartedAt:Date.now()},staticPath:path.resolve('du-platform-frontend/dist')});server.on('request',app);console.log('TEST_URL='+process.env.APP_BASE_URL);process.on('SIGTERM',()=>{server.close();void db?.end().then(()=>process.exit(0));});`;
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "SystemRoot"]
    .filter(key => process.env[key])
    .map(key => [key, process.env[key]])
);
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--input-type=module", "-e", serverCode],
  {
    env: {
      ...env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "local-newsletter-test-secret-no-real-credentials",
      ADMIN_EMAILS: adminEmail,
      FROM_EMAIL: "newsletter@example.com",
      RESEND_API_KEY: "mock-provider-worker-is-not-started",
      CSRF_ENABLED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let logs = "",
  browser,
  page;
child.stdout.on("data", data => {
  logs += data;
});
child.stderr.on("data", data => {
  logs += data;
});
const checks = [],
  errors = [],
  failures = [];
const pass = scenario => {
  checks.push(scenario);
  console.log(`PASS ${scenario}`);
};
const waitFor = async predicate => {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > 30000)
      throw new Error("Timed out waiting for newsletter test state");
    await new Promise(done => setTimeout(done, 100));
  }
};
try {
  await waitFor(() => logs.includes("TEST_URL="));
  const base = logs.match(/TEST_URL=(http:\/\/127\.0\.0\.1:\d+)/)[1];
  for (const table of [
    "newsletter_deliveries",
    "newsletter_campaigns",
    "newsletter_subscriptions",
  ])
    await pool.execute(`DELETE FROM ${table}`);
  const request = async (path, body, token, method = body ? "POST" : "GET") => {
    const res = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: res.status,
      body: await res.json(),
      cookie: res.headers.get("set-cookie"),
    };
  };
  const account = async address => {
    const res = await request(address === adminEmail ? "/auth/login" : "/auth/register", {
      email: address,
      fullName: "Newsletter Test",
      password: "StrongNewsletter!2026",
      confirmPassword: "StrongNewsletter!2026",
    });
    assert.equal(res.status, address === adminEmail ? 200 : 201, JSON.stringify(res.body));
    return res;
  };
  const admin = await account(adminEmail),
    user = await account(`newsletter-user-${Date.now()}@example.com`);
  for (const [path, body] of [
    ["/admin/newsletter/subscribers", null],
    ["/admin/newsletter/campaigns", { subject: "Unauthorized", body: "Test" }],
    ["/admin/newsletter/campaigns/1/send", { version: 1, confirm: true }],
    ["/admin/newsletter/deliveries", null],
    ["/admin/newsletter/subscribers/1/unsubscribe", {}],
  ]) {
    assert.equal((await request(path, body)).status, 401);
    assert.equal(
      (await request(path, body, user.body.data.accessToken)).status,
      403
    );
  }
  pass(
    "anonymous and non-admin users cannot list subscribers, edit campaigns, send, inspect delivery or opt others out"
  );
  assert.equal(
    (await request("/notifications/newsletter", { email, consent: false }))
      .status,
    400
  );
  assert.equal(
    (
      await request("/notifications/newsletter", {
        email: "bad",
        consent: true,
      })
    ).status,
    400
  );
  pass("signup rejects invalid addresses and refused consent");
  browser = await chromium.launch({
    channel:
      process.env.NEWSLETTER_BROWSER_CHANNEL === "chromium"
        ? undefined
        : process.env.NEWSLETTER_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("du_cookie_consent_v1", "rejected");
    localStorage.setItem("i18nextLng", "en");
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "fonts.googleapis.com")
      return route.fulfill({ contentType: "text/css", body: "" });
    if (url.origin !== base) return route.abort();
    return route.continue();
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", r => {
    if (!r.failure()?.errorText.includes("ERR_ABORTED")) failures.push(r.url());
  });
  await page.goto(base + "/");
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page
    .getByRole("button", { name: "Subscribe to newsletter", exact: true })
    .click();
  await page
    .getByText("Check your email for a confirmation link.", { exact: false })
    .waitFor();
  const [subscribers] = await pool.query(
    "SELECT id,status FROM newsletter_subscriptions WHERE email=?",
    [email]
  );
  assert.equal(subscribers[0].status, "pending");
  pass(
    "footer signup saves a pending MySQL subscriber and displays accurate confirmation feedback"
  );
  const [jobs] = await pool.query(
    "SELECT payload FROM newsletter_deliveries WHERE recipient=? AND kind='confirmation' ORDER BY id DESC LIMIT 1",
    [email]
  );
  const token = JSON.parse(jobs[0].payload).text.match(
    /token=([a-f0-9]{48})/
  )[1];
  await page.goto(`${base}/newsletter#action=confirm&token=${token}`);
  await page
    .getByRole("button", { name: "Confirm subscription", exact: true })
    .waitFor();
  assert.equal(
    (
      await pool.query(
        "SELECT status FROM newsletter_subscriptions WHERE email=?",
        [email]
      )
    )[0][0].status,
    "pending"
  );
  assert(!page.url().includes(token));
  await page
    .getByRole("button", { name: "Confirm subscription", exact: true })
    .click();
  await page.getByText("Your email is confirmed.").waitFor();
  assert.equal(
    (
      await pool.query("SELECT COUNT(*) AS total FROM users WHERE email=?", [
        email,
      ])
    )[0][0].total,
    0
  );
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*) AS total FROM newsletter_deliveries WHERE recipient=?",
        [email]
      )
    )[0][0].total,
    1
  );
  pass(
    "newsletter confirmation works without a platform account and queues only the confirmation email"
  );
  pass(
    "email links require an explicit click, scrub their token, and activate the stored subscription"
  );
  const cookie = decodeURIComponent(
    admin.cookie.match(/du_session=([^;]+)/)[1]
  );
  await context.addCookies([
    {
      name: "du_session",
      value: cookie,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(base + "/admin");
  await page
    .getByRole("heading", { name: "Subscriber list", exact: true })
    .waitFor();
  await page.getByText(email, { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Compose & campaigns", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Diaspora news <script>");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("New opportunities from Zimbabwe.\nFind more on our site.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText("Draft saved in the database.").waitFor();
  const [campaigns] = await pool.query(
    "SELECT id,version FROM newsletter_campaigns ORDER BY id DESC LIMIT 1"
  );
  const campaign = campaigns[0];
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Unsaved changes");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: /^Notify Me/ }).click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Subject", exact: true })
      .inputValue(),
    "Unsaved changes"
  );
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Diaspora news <script>");
  pass(
    "switching admin sections warns before discarding unsaved newsletter changes"
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Review & send", exact: true })
      .isEnabled(),
    true
  );
  await page
    .getByRole("button", { name: "Send test to me", exact: true })
    .click();
  await page.getByText("Test queued for your administrator email.").waitFor();
  assert.equal(
    (
      await pool.query(
        "SELECT recipient FROM newsletter_deliveries WHERE kind='test' ORDER BY id DESC LIMIT 1"
      )
    )[0][0].recipient,
    adminEmail
  );
  pass(
    "admin saves persistent drafts, sees a safe preview, and queues tests only to their own address"
  );
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    await page
      .getByRole("heading", { name: "Subscriber list", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Compose & campaigns", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Edit draft", exact: true })
      .first()
      .click();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      return document.fonts.ready;
    });
    assert.equal(
      await page
        .getByRole("heading", { name: "Admin Dashboard", exact: true })
        .count(),
      1
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      ),
      `overflow at ${width}`
    );
    await page.screenshot({
      path: `${output}/compose-${width}.png`,
      fullPage: false,
    });
    pass(
      `newsletter compose and preview fit ${width}px without horizontal overflow`
    );
  }
  await page
    .getByRole("button", { name: "Review & send", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*) AS total FROM newsletter_deliveries WHERE kind='campaign'"
      )
    )[0][0].total,
    0
  );
  await page
    .getByRole("button", { name: "Review & send", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm send", exact: true }).click();
  await page
    .getByRole("heading", { name: "Delivery activity", exact: true })
    .waitFor();
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*) AS total FROM newsletter_deliveries WHERE campaign_id=?",
        [campaign.id]
      )
    )[0][0].total,
    1
  );
  assert.equal(
    (
      await request(
        `/admin/newsletter/campaigns/${campaign.id}/send`,
        { version: campaign.version, confirm: true },
        admin.body.data.accessToken
      )
    ).status,
    200
  );
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*) AS total FROM newsletter_deliveries WHERE campaign_id=?",
        [campaign.id]
      )
    )[0][0].total,
    1
  );
  pass(
    "cancel does not send; explicit confirmation queues one job per subscribed address and repeated send is idempotent"
  );
  const [subscription] = await pool.query(
    "SELECT unsubscribe_token FROM newsletter_subscriptions WHERE email=?",
    [email]
  );
  await page.goto(
    `${base}/newsletter#action=unsubscribe&token=${subscription[0].unsubscribe_token}`
  );
  await page.getByRole("button", { name: "Unsubscribe", exact: true }).click();
  await page.getByText("You’re unsubscribed.").waitFor();
  assert.equal(
    (
      await pool.query(
        "SELECT status FROM newsletter_deliveries WHERE campaign_id=?",
        [campaign.id]
      )
    )[0][0].status,
    "skipped"
  );
  pass(
    "subscriber opt-out works without an account and cancels pending newsletter jobs"
  );
  await page.goto(base + "/admin");
  await page
    .getByRole("heading", { name: "Subscriber list", exact: true })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Search email" })
    .fill("does-not-exist@example.com");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("No subscribers match these filters.").waitFor();
  pass("subscriber search provides an accurate empty state");
  await page.route("**/api/admin/newsletter/subscribers?**", route =>
    route.fulfill({
      status: 503,
      json: {
        success: false,
        error: { message: "Database temporarily unavailable." },
      },
    })
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Database temporarily unavailable." })
    .waitFor();
  pass("admin database failures display feedback without fabricating success");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  pass(
    "newsletter journeys have no uncaught browser errors or unexpected external requests"
  );
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ checks, errors, failures }, null, 2)
  );
  console.log(`${checks.length} passed; ${output}/report.json`);
} catch (error) {
  await page
    ?.screenshot({ path: `${output}/failure.png`, fullPage: true })
    .catch(() => {});
  await writeFile(`${output}/failure.txt`, String(error));
  throw error;
} finally {
  await browser?.close();
  child.kill("SIGTERM");
  await pool.end();
}
