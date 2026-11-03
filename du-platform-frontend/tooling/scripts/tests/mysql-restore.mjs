// Deliberately restricted to a disposable localhost Docker MySQL database.
// This verifies the procedure, not the production provider's backup settings.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
const url = new URL(process.env.SHOP_TEST_DATABASE_URL || "http://invalid");
const database = url.pathname.slice(1);
assert(["localhost", "127.0.0.1"].includes(url.hostname));
assert(/^[a-z0-9_]+_test$/.test(database));
const container = process.env.MYSQL_TEST_CONTAINER;
assert(container && /^[a-zA-Z0-9_-]+$/.test(container));
const restore = `du_restore_${process.pid}_test`;
const dir = await mkdtemp(path.join(os.tmpdir(), "du-restore-"));
const pool = mysql.createPool({ uri: url.href, timezone: "Z" });
const quote = value => "`" + value.replaceAll("`", "``") + "`";
async function fingerprint(name) {
  const [tables] = await pool.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' ORDER BY table_name",
    [name]
  );
  const result = [];
  for (const { name: table } of tables) {
    const [rows] = await pool.query(
      `SELECT * FROM ${quote(name)}.${quote(table)}`
    );
    const [columns] = await pool.query(
      "SELECT column_name,column_type,is_nullable,column_default,extra FROM information_schema.columns WHERE table_schema=? AND table_name=? ORDER BY ordinal_position",
      [name, table]
    );
    result.push({
      table,
      rows: rows.length,
      sha256: createHash("sha256")
        .update(
          JSON.stringify(columns) +
            JSON.stringify(rows.map(row => JSON.stringify(row)).sort())
        )
        .digest("hex"),
    });
  }
  return result;
}
try {
  // Never run concurrently with schema changes or other test writers.
  const before = await fingerprint(database);
  const args = [
    "exec",
    "-e",
    `MYSQL_PWD=${decodeURIComponent(url.password)}`,
    container,
  ];
  const dump = execFileSync(
    "docker",
    [
      ...args,
      "mysqldump",
      "-u",
      decodeURIComponent(url.username),
      "--single-transaction",
      "--quick",
      "--routines",
      "--events",
      "--triggers",
      "--no-tablespaces",
      "--set-gtid-purged=OFF",
      "--hex-blob",
      database,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const file = path.join(dir, "fixture.sql");
  await writeFile(file, dump, { mode: 0o600 });
  await pool.query(`CREATE DATABASE ${quote(restore)}`);
  const imported = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      `MYSQL_PWD=${decodeURIComponent(url.password)}`,
      container,
      "mysql",
      "-u",
      decodeURIComponent(url.username),
      restore,
    ],
    { input: await readFile(file), maxBuffer: 1024 * 1024 }
  );
  assert.equal(imported.status, 0, imported.stderr?.toString());
  assert.deepEqual(await fingerprint(restore), before);
  console.log(
    JSON.stringify({
      procedure: "disposable MySQL logical backup and isolated restore",
      tables: before.length,
      rows: before.reduce((n, t) => n + t.rows, 0),
      schemaAndRowHashesMatch: true,
      productionRestoreVerified: false,
    })
  );
} finally {
  await pool.query(`DROP DATABASE IF EXISTS ${quote(restore)}`);
  await pool.end();
  await rm(dir, { recursive: true, force: true });
}
