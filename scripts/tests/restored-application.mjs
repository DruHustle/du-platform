import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const value = process.env.SHOP_TEST_DATABASE_URL;
assert(value, "Disposable test database required");
const url = new URL(value);
assert(
  ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname.endsWith("_test")
);
const pool = mysql.createPool(value);
let created = false;
try {
  await pool.query("CREATE DATABASE du_restore_test");
  created = true;
  const env = Object.fromEntries(
    ["PATH", "HOME", "TMPDIR"]
      .filter(k => process.env[k])
      .map(k => [k, process.env[k]])
  );
  Object.assign(env, {
    NODE_ENV: "test",
    MYSQL_HOST: "127.0.0.1",
    MYSQL_PORT: url.port || "3306",
    MYSQL_USER: decodeURIComponent(url.username),
    MYSQL_PASSWORD: decodeURIComponent(url.password),
    MYSQL_DATABASE: "du_restore_test",
    JWT_SECRET: randomBytes(48).toString("hex"),
    APP_BASE_URL: "https://restore.example.test",
    FROM_EMAIL: "fixture@example.test",
    ADMIN_EMAILS: "recovery@example.test",
    SHOP_COMMERCIAL_MODE: "observe",
    RECOVERY_MODE: "true",
    OUTBOUND_MESSAGES_PAUSED: "true",
  });
  const code = `await (await import('./du-platform-backend/db.ts')).initializeDatabase();await import('./scripts/operations/restored-application.ts');`;
  console.log(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", code],
      { env, encoding: "utf8" }
    ).trim()
  );
} finally {
  if (created) await pool.query("DROP DATABASE du_restore_test");
  await pool.end();
}
