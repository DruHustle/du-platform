// Isolated installed-client QA. Only the email transport is substituted.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const database = new URL(process.env.INSTALLED_TEST_DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/du_installed_test");
const origin = "http://127.0.0.1:18765";
const alertEmail = "visitor-alert@example.test";
const supportEmail = "visitor-support@example.test";
const operator = "operator@example.test";
for (const key of Object.keys(process.env))
  if (/^(MYSQL_|AIVEN_|DATABASE_URL|RESEND_|ADMIN_EMAILS|SHOP_|JWT_SECRET|RECOVERY_MODE|OUTBOUND_MESSAGES_PAUSED|NOTIFY_)/.test(key))
    delete process.env[key];
Object.assign(process.env, {
  DATABASE_URL: database.toString(), NODE_ENV: "test",
  JWT_SECRET: "isolated-installed-fixture-test-only",
  SHOP_COMMERCIAL_MODE: "prelaunch", ONESA_MOCK_MODE: "true",
  ADMIN_EMAILS: operator, FROM_EMAIL: "service@example.test", APP_BASE_URL: origin,
  RESEND_API_KEY: "test-only-no-delivery", CSRF_ENABLED: "true"
});
const { db } = await import("../shared/databaseRuntime.ts");

if (process.argv[2] === "serve") {
  const { initializeDatabase } = await import("../db.ts");
  const { createModularServer } = await import("../server.ts");
  await initializeDatabase();
  await db.execute(
    "INSERT INTO shop_products(slug,name,category,description,image_url,price_cents,currency,stock_qty,is_active) VALUES (?,?,?,?,?,1000,'EUR',0,1)",
    ["qa-visitor-product", "Installed QA product", "crafts", "For installed client QA.", "/qa-product.webp"]
  );
  const api = createModularServer({ backend: { db, serverStartedAt: Date.now() } });
  createServer((req, res) => {
    if (req.url === "/__qa/ready") return res.end("ready");
    api(req, res);
  }).listen(18765, "127.0.0.1");
} else if (process.argv[2] === "verify") {
  const { processNewsletterBatch } = await import("../modules/newsletter/worker.ts");
  const { processTransactionalMessages } = await import("../modules/notifications/transactionalWorker.ts");
  const id = (await readFile(process.argv[3], "utf8")).trim();
  assert.match(id, /^[a-f0-9-]{36}$/);
  const [contacts] = await db.query("SELECT request_id FROM contact_enquiries");
  assert.deepEqual(contacts.map(row => row.request_id), [id]);
  const mail = new Map();
  const capture = async (message, key) => {
    const recipients = [message.to].flat();
    assert.equal(recipients.length, 1);
    assert([alertEmail, supportEmail, operator].includes(recipients[0]));
    assert(!mail.has(recipients[0]));
    mail.set(recipients[0], message);
    return "captured/" + key;
  };
  await processNewsletterBatch(db, capture);
  await processTransactionalMessages(db, capture);
  assert.equal(mail.size, 3);
  assert(mail.get(supportEmail).text.includes(id));
  assert(mail.get(operator).text.includes(id));
  assert(mail.get(operator).text.includes("Installed QA"));
  const state = async () => {
    const [rows] = await db.query("SELECT status FROM shop_restock_notifications WHERE email=? AND product_slug='qa-visitor-product'", [alertEmail]);
    assert.equal(rows.length, 1);
    return rows[0].status;
  };
  assert.equal(await state(), "pending");
  for (const [action, expected] of [["confirm", "confirmed"], ["cancel", "cancelled"]]) {
    const link = new URL(mail.get(alertEmail).text.match(new RegExp("http[^\\s]+#action=" + action + "&token=[a-f0-9]+"))[0]);
    assert.equal(link.origin, origin);
    assert.equal(link.pathname, "/shop/interest");
    const token = new URLSearchParams(link.hash.slice(1)).get("token");
    const response = await fetch(origin + "/api/shop/interest/" + action, {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": "installed-test", Origin: origin },
      body: JSON.stringify({ token })
    });
    assert.equal(response.status, 200);
    assert.equal(await state(), expected);
  }
  const [marketing] = await db.query("SELECT id FROM newsletter_subscriptions WHERE email IN (?, ?)", [alertEmail, supportEmail]);
  assert.equal(marketing.length, 0);
  console.log("PASS installed support receipt matched both captured emails; product email links confirmed and cancelled one alert, with no newsletter subscription.");
  await db.end();
} else {
  throw new Error("Expected serve or verify <file containing displayed support reference>");
}
