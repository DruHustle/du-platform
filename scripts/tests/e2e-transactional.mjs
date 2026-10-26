// Real local HTTP/MySQL/browser workflows. Synthetic records; injected provider only.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { chromium, webkit } from "playwright";
const input = process.env.SHOP_TEST_DATABASE_URL;
assert(
  input &&
    ["localhost", "127.0.0.1"].includes(new URL(input).hostname) &&
    new URL(input).pathname.endsWith("_test"),
  "Disposable localhost *_test database required"
);
const database = "du_service_browser_" + Date.now() + "_test",
  url = new URL(input),
  out = process.env.TRANSACTIONAL_OUTPUT_DIR || "/tmp/du-transactional-browser";
await mkdir(out, { recursive: true });
const root = mysql.createPool(input);
await root.query(`CREATE DATABASE ${database}`);
url.pathname = "/" + database;
for (const key of Object.keys(process.env))
  if (
    /^(MYSQL_|AIVEN_|DATABASE_URL|RESEND_|ADMIN_EMAILS|SHOP_|JWT_SECRET|RECOVERY_MODE|OUTBOUND_MESSAGES_PAUSED)/.test(
      key
    )
  )
    delete process.env[key];
const adminEmail = "service-admin@example.test",
  password = "StrongService!2026";
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: url.toString(),
  JWT_SECRET: "synthetic-service-browser-fixture-only",
  ADMIN_EMAILS: adminEmail,
  FROM_EMAIL: "service@example.test",
  SHOP_COMMERCIAL_MODE: "prelaunch",
  CSRF_ENABLED: "true",
});
const { initializeDatabase } = await import("../../du-platform-backend/db.ts");
const { db } = await import(
  "../../du-platform-backend/shared/databaseRuntime.ts"
);
const { createModularServer } = await import(
  "../../du-platform-backend/server.ts"
);
const { hashPassword } = await import(
  "../../du-platform-backend/shared/passwords.ts"
);
const { processTransactionalMessages } = await import(
  "../../du-platform-backend/modules/notifications/transactionalWorker.ts"
);
const { openOrderAccess } = await import(
  "../../du-platform-backend/modules/shop/orderAccess.ts"
);
const { createUser } = await import(
  "../../du-platform-backend/shared/persistence/authStore.ts"
);
await initializeDatabase();
await db.execute(
  "UPDATE users SET password_hash=?,email_verified_at=NOW() WHERE email=?",
  [await hashPassword(password), adminEmail]
);
const server = createServer();
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
process.env.APP_BASE_URL = base;
server.on(
  "request",
  createModularServer({
    backend: { db, serverStartedAt: Date.now() },
    staticPath: path.resolve("dist/public"),
  })
);
const checks = [],
  errors = [];
let browser;
const pass = scenario => {
  checks.push(scenario);
  console.log("PASS " + scenario);
};
const call = async (route, { body, token, cookie } = {}) => {
  const response = await fetch(base + "/api" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": "synthetic-test",
      Origin: base,
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  return {
    status: response.status,
    data: value.data,
    error: value.error,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
};
try {
  for (const [engine, driver] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    browser = await driver.launch();
    for (const width of [375, 768, 1440])
      for (const language of ["en", "de", "sn", "nd"]) {
        // Quotas are reset only in this disposable fixture between independent cases.
        await db.execute("DELETE FROM rate_limit_buckets");
        const locale = JSON.parse(
          await readFile(
            `du-platform-frontend/public/locales/${language}/translation.json`,
            "utf8"
          )
        ).contact_enquiry;
        const context = await browser.newContext({
          viewport: { width, height: 950 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(language => {
          localStorage.setItem("i18nextLng", language);
          localStorage.setItem("du_cookie_consent_v1", "rejected");
        }, language);
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on("pageerror", e => errors.push(e.message));
        let submissions = 0,
          receipt;
        await context.route("**/api/notifications/contact", async route => {
          submissions++;
          const response = await route.fetch();
          assert.equal(response.status(), 201);
          const body = await response.json();
          receipt = body.data.requestId;
          if (submissions === 1) return route.abort("failed");
          return route.fulfill({ response });
        });
        await page.goto(base + "/?lng=" + language);
        await page
          .getByRole("button", { name: locale.open, exact: true })
          .click();
        const dialog = page.getByRole("dialog"),
          message = `Synthetic ${engine} ${width} ${language} enquiry`;
        await dialog.locator("[name=name]").fill("Browser fixture");
        await dialog
          .locator("[name=email]")
          .fill(`fixture-${randomUUID()}@example.test`);
        await dialog.locator("[name=subject]").fill("Browser enquiry <script>");
        await dialog.locator("[name=message]").fill(message);
        await dialog
          .getByRole("button", { name: locale.submit, exact: true })
          .click();
        await dialog.getByText(locale.failed, { exact: true }).waitFor();
        assert.equal(
          await dialog.locator("[name=message]").inputValue(),
          message
        );
        assert.equal(submissions, 1);
        await dialog.locator("[name=message]").fill(message + " changed");
        await dialog
          .getByRole("button", { name: locale.submit, exact: true })
          .click();
        await dialog.getByText(locale.changed, { exact: true }).waitFor();
        assert.equal(submissions, 1);
        await dialog.locator("[name=message]").fill(message);
        await dialog
          .getByRole("button", { name: locale.submit, exact: true })
          .click();
        await dialog.getByText(locale.received, { exact: true }).waitFor();
        assert.equal(submissions, 2);
        assert((await dialog.innerText()).includes(receipt));
        const [[saved]] = await db.query(
          "SELECT COUNT(*) AS n FROM contact_enquiries WHERE request_id=?",
          [receipt]
        );
        assert.equal(saved.n, 1);
        const [[jobs]] = await db.query(
          "SELECT COUNT(*) AS n FROM transactional_messages WHERE entity_id=?",
          [receipt]
        );
        assert.equal(jobs.n, 2);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          )
        );
        assert(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1));
        if (
          (width === 375 && ["en", "nd"].includes(language)) ||
          (width === 1440 && language === "de")
        )
          await page.screenshot({
            path: `${out}/${engine}-${width}-${language}-receipt.png`,
          });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(
          label => document.activeElement?.textContent === label,
          locale.open
        );
        assert(
          await page
            .getByRole("button", { name: locale.open, exact: true })
            .evaluate(e => e === document.activeElement)
        );
        pass(
          `${engine} ${width} ${language}: durable contact, lost response, retained draft, changed-payload guard and same-ID retry`
        );
        await context.close();
      }
    const ordinary = await createUser(
      "Ordinary fixture",
      randomUUID() + "@example.test",
      await hashPassword(password)
    );
    const login = await call("/auth/login", {
      body: { email: ordinary.email, password },
    });
    assert.equal(login.status, 200);
    const oldAccess = login.data.accessToken,
      oldCookie = login.cookie;
    for (const suffix of ["", "/1/action"]) {
      const args = suffix ? { body: { action: "retry" } } : {};
      assert.equal(
        (await call("/admin/service-inbox" + suffix, args)).status,
        401
      );
      assert.equal(
        (
          await call("/admin/service-inbox" + suffix, {
            ...args,
            token: oldAccess,
          })
        ).status,
        403
      );
    }
    // Keep only the latest synthetic contact eligible for the operator cases.
    await db.execute(
      "UPDATE transactional_messages SET status='cancelled' WHERE status='pending'"
    );
    for (const width of [375, 1440]) {
      await db.execute("DELETE FROM rate_limit_buckets");
      await call("/notifications/contact", {
        body: {
          requestId: randomUUID(),
          name: "Operator UI fixture",
          email: "fixture@example.test",
          subject: "Operator retry",
          message: "Synthetic operator workflow",
        },
      });
      const [[job]] = await db.query(
        "SELECT id,intent_key FROM transactional_messages ORDER BY id DESC LIMIT 1"
      );
      await db.execute(
        "UPDATE transactional_messages SET status='cancelled' WHERE status='pending'"
      );
      await db.execute(
        "UPDATE transactional_messages SET status='failed',first_attempt_at=NOW(),error_message='Synthetic provider rejection' WHERE id=?",
        [job.id]
      );
      const context = await browser.newContext({
        viewport: { width, height: 950 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(() => {
        localStorage.setItem("i18nextLng", "en");
        localStorage.setItem("du_cookie_consent_v1", "rejected");
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(base + "/login?next=%2Fadmin");
      const loginForm = page
        .locator("form")
        .filter({ has: page.locator("input[type=password]") });
      await loginForm.locator("input[type=email]").fill(adminEmail);
      await loginForm.locator("input[type=password]").fill(password);
      await loginForm.locator("button[type=submit]").click();
      await page
        .getByRole("button", { name: "Service inbox", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Received enquiries", exact: true })
        .waitFor();
      const failed = page.getByRole("button", {
        name: `Retry same delivery #${job.id}`,
        exact: true,
      });
      await failed.focus();
      assert(await failed.evaluate(e => e === document.activeElement));
      await page.keyboard.press("Enter");
      const refresh = page.getByRole("button", {
        name: "Refresh service inbox",
        exact: true,
      });
      await page
        .getByRole("button", {
          name: `Close queued notification #${job.id}`,
          exact: true,
        })
        .waitFor();
      const sent = [];
      await processTransactionalMessages(
        db,
        async (mail, key) => {
          sent.push({ mail, key });
          return "synthetic-provider-acceptance";
        },
        1
      );
      assert.equal(sent.length, 1);
      assert.equal(sent[0].key, `du-service/${job.intent_key}`);
      await refresh.click();
      await page
        .getByRole("heading", {
          name: new RegExp(`#${job.id} .*Accepted by provider`),
        })
        .waitFor();
      await db.execute(
        "UPDATE transactional_messages SET status='reconcile',first_attempt_at=DATE_SUB(NOW(),INTERVAL 24 HOUR),acceptance_uncertain=TRUE,error_message='Synthetic uncertain acceptance' WHERE id=?",
        [job.id]
      );
      await refresh.click();
      await page
        .getByLabel(`Verified provider reference for #${job.id}`, {
          exact: true,
        })
        .fill("synthetic-verified-reference");
      assert.equal(
        await page
          .getByRole("button", {
            name: `Retry same delivery #${job.id}`,
            exact: true,
          })
          .count(),
        0
      );
      await page
        .getByRole("button", {
          name: `Record provider acceptance #${job.id}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("heading", {
          name: new RegExp(`#${job.id} .*Accepted by provider`),
        })
        .waitFor();
      await page.route(
        "**/api/admin/service-inbox?*",
        route =>
          route.fulfill({
            status: 503,
            json: { error: { message: "Synthetic unavailable" } },
          }),
        { times: 1 }
      );
      await refresh.click();
      await page
        .getByText(
          "The service inbox could not be loaded. Retry to review saved enquiries.",
          { exact: true }
        )
        .waitFor();
      await refresh.click();
      await page
        .getByRole("heading", { name: "Received enquiries", exact: true })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      );
      await page.screenshot({ path: `${out}/${engine}-${width}-operator.png` });
      pass(
        `${engine} ${width}: protected service inbox, keyboard retry, provider reconciliation, failure and recovery`
      );
      await context.close();
    }
    await db.execute(
      "UPDATE transactional_messages SET status='cancelled' WHERE status='pending'"
    );
    await db.execute("DELETE FROM rate_limit_buckets");
    const known = await call("/auth/forgot-password", {
        body: { email: ordinary.email, language: "de" },
      }),
      unknown = await call("/auth/forgot-password", {
        body: { email: "missing@example.test", language: "de" },
      });
    assert.equal(known.status, 200);
    assert.deepEqual(known.data, unknown.data);
    const [[reset]] = await db.query(
      "SELECT encrypted_payload FROM transactional_messages WHERE kind='password_reset' AND user_id=? ORDER BY id DESC LIMIT 1",
      [ordinary.id]
    );
    const mail = JSON.parse(openOrderAccess(reset.encrypted_payload)),
      token = mail.text.match(/#token=([a-f0-9]{96})/)[1],
      link = mail.text.match(/https?:\/\/[^\s]+#token=[a-f0-9]+/)[0];
    const provider = async () => "synthetic-reset-provider";
    await processTransactionalMessages(db, provider, 1);
    const context = await browser.newContext({
        viewport: { width: 375, height: 950 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.setDefaultTimeout(15000);
    await context.addInitScript(() =>
      localStorage.setItem("du_cookie_consent_v1", "rejected")
    );
    await page.goto(link);
    await page.locator("input[type=password]").first().waitFor();
    await page.waitForFunction(
      () =>
        !location.hash.includes("token") && !location.search.includes("token")
    );
    assert(!page.url().includes(token));
    const legacy = await context.newPage();
    await legacy.goto(base + "/reset-password?token=" + token);
    await legacy.locator("input[type=password]").first().waitFor();
    await legacy.waitForFunction(() => !location.search.includes("token"));
    await legacy.close();
    const replacement = "NewStrongService!2026";
    await page.locator("input[type=password]").nth(0).fill(replacement);
    await page.locator("input[type=password]").nth(1).fill(replacement);
    await page
      .locator("form")
      .filter({ has: page.locator("input[type=password]").first() })
      .locator("button[type=submit]")
      .click();
    await page.waitForURL("**/login");
    assert.equal((await call("/auth/me", { token: oldAccess })).status, 401);
    assert.equal(
      (await call("/auth/token/refresh", { body: {}, cookie: oldCookie }))
        .status,
      401
    );
    assert.equal(
      (
        await call("/auth/reset-password", {
          body: { token, password: replacement },
        })
      ).status,
      400
    );
    const renewed = await call("/auth/login", {
      body: { email: ordinary.email, password: replacement },
    });
    assert.equal(renewed.status, 200);
    assert.equal(
      (await call("/auth/token/refresh", { body: {}, cookie: renewed.cookie }))
        .status,
      200
    );
    assert.equal(
      (
        await call("/auth/token/refresh", {
          body: {},
          cookie: renewed.cookie,
          token: "invalid.jwt.token",
        })
      ).status,
      401
    );
    assert.equal(
      (await call("/auth/logout", { body: {}, cookie: renewed.cookie })).status,
      200
    );
    assert.equal(
      (await call("/auth/token/refresh", { body: {}, cookie: renewed.cookie }))
        .status,
      401
    );
    pass(
      `${engine}: neutral durable reset, fragment consumption, session/JWT revocation, single use, normal cookie refresh/logout`
    );
    await context.close();
    await browser.close();
    browser = null;
  }
  await db.execute("DELETE FROM rate_limit_buckets");
  for (let i = 0; i < 6; i++)
    assert.equal(
      (
        await call("/notifications/contact", {
          body: {
            requestId: randomUUID(),
            name: "Rate fixture",
            email: "fixture@example.test",
            subject: "Rate test",
            message: "Synthetic",
          },
        })
      ).status,
      i < 5 ? 201 : 429
    );
  assert.equal(
    (
      await call("/notifications/contact", {
        body: {
          name: "No ID",
          email: "fixture@example.test",
          subject: "Missing ID",
          message: "Synthetic",
        },
      })
    ).status,
    429
  );
  await db.execute("DELETE FROM rate_limit_buckets");
  assert.equal(
    (
      await call("/notifications/contact", {
        body: {
          name: "No ID",
          email: "fixture@example.test",
          subject: "Missing ID",
          message: "Synthetic",
        },
      })
    ).status,
    400
  );
  pass(
    "contact requests require a stable UUID and retain the production five-per-five-minute rate limit"
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/report.json",
    JSON.stringify({ checks, errors, realProviderRequests: 0 }, null, 2)
  );
  console.log(
    `PASS ${checks.length} transactional customer/operator browser scenarios`
  );
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
  await db.end();
  await root.query(`DROP DATABASE ${database}`);
  await root.end();
}
