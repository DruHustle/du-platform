import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseStartupMode, verifyDatabaseSchema } from "../../shared/databaseStartup";
import type { Pool } from "mysql2/promise";

afterEach(() => vi.unstubAllEnvs());

describe("database startup selection", () => {
  it("preserves initialization by default and rejects unknown modes", () => {
    vi.stubEnv("DATABASE_STARTUP_MODE", undefined);
    expect(databaseStartupMode()).toBe("initialize");
    expect(databaseStartupMode("verify")).toBe("verify");
    for (const value of ["", "VERIFY", "skip", " true "]) {
      expect(() => databaseStartupMode(value)).toThrow("DATABASE_STARTUP_MODE");
    }
  });

  it("releases the connection and rolls back after an incomplete schema without leaking provider errors", async () => {
    const calls: string[] = [];
    const release = vi.fn();
    const pool = { getConnection: async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        if (sql.startsWith("SELECT")) throw new Error("private-provider-detail");
      }, release,
    }) } as unknown as Pick<Pool, "getConnection">;
    await expect(verifyDatabaseSchema(pool)).rejects.toThrow("verify-only startup made no changes");
    expect(calls[0]).toBe("START TRANSACTION READ ONLY");
    expect(calls.at(-1)).toBe("ROLLBACK");
    expect(calls.some(sql => /^(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP)/.test(sql))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });
});
