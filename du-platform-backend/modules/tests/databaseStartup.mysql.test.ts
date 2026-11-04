import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { requiredColumns, verifyDatabaseSchema } from "../../shared/databaseStartup";

const url = process.env.STARTUP_TEST_DATABASE_URL;
describe.skipIf(!url)("verify-only startup against real isolated MySQL", () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const database = `du_startup_${suffix}`;
  const reader = `du_reader_${suffix}`;
  let owner: Pool;
  let readonly: Pool;
  let application: Pool | null;
  let before: string;

  async function snapshot() {
    const result: Record<string, unknown> = {};
    for (const table of Object.keys(requiredColumns)) {
      const [rows] = await owner.query(`SELECT * FROM ${mysql.escapeId(database)}.${mysql.escapeId(table)}`);
      result[table] = rows;
    }
    return JSON.stringify(result);
  }

  beforeAll(async () => {
    const parsed = new URL(url!);
    if (parsed.protocol !== "mysql:" || parsed.hostname !== "127.0.0.1") {
      throw new Error("Startup qualification requires a loopback disposable MySQL instance");
    }
    owner = mysql.createPool(url!);
    await owner.query(`CREATE DATABASE ${mysql.escapeId(database)}`);
    parsed.pathname = `/${database}`;
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_PROVIDER", "mysql");
    vi.stubEnv("DATABASE_URL", parsed.toString());
    vi.stubEnv("DATABASE_STARTUP_MODE", "initialize");
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.stubEnv("FROM_EMAIL", "");
    vi.resetModules();
    const { initializeDatabase } = await import("../../db");
    application = (await import("../../shared/databaseRuntime")).db;
    await initializeDatabase();
    await owner.query(`INSERT INTO ${mysql.escapeId(database)}.users (full_name,email,password_hash) VALUES ('Preserved fixture','startup@example.test','existing-hash-bytes')`);
    await owner.query(`CREATE USER ${mysql.escape(reader)}@'%' IDENTIFIED BY 'isolated-startup-test-only'`);
    await owner.query(`GRANT SELECT ON ${mysql.escapeId(database)}.* TO ${mysql.escape(reader)}@'%'`);
    readonly = mysql.createPool({ host: parsed.hostname, port: Number(parsed.port || 3306), user: reader, password: "isolated-startup-test-only", database });
    before = await snapshot();
  }, 30_000);

  afterAll(async () => {
    if (readonly) await readonly.end();
    if (application) await application.end();
    if (owner) {
      await owner.query(`DROP USER IF EXISTS ${mysql.escape(reader)}@'%'`);
      await owner.query(`DROP DATABASE IF EXISTS ${mysql.escapeId(database)}`);
      await owner.end();
    }
    vi.unstubAllEnvs();
  });

  it("accepts the commissioned schema using a SELECT-only principal and preserves every row", async () => {
    await verifyDatabaseSchema(readonly);
    expect(await snapshot()).toBe(before);
  });

  it("the startup entry point in verify mode skips account bootstrap and catalog seeding", async () => {
    vi.stubEnv("DATABASE_STARTUP_MODE", "verify");
    vi.stubEnv("ADMIN_EMAILS", "must-not-be-created@example.test");
    const { initializeDatabase } = await import("../../db");
    await initializeDatabase();
    expect(await snapshot()).toBe(before);
  });

  it("missing required columns fail without repair or credential changes", async () => {
    await owner.query(`ALTER TABLE ${mysql.escapeId(database)}.users DROP COLUMN auth_version`);
    const missing = await snapshot();
    await expect(verifyDatabaseSchema(readonly)).rejects.toThrow("unavailable or incomplete");
    expect(await snapshot()).toBe(missing);
    const [columns] = await owner.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${mysql.escapeId(database)}.users LIKE 'auth_version'`);
    expect(columns).toHaveLength(0);
  });
});
