import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!new URL(url).pathname.endsWith("_test") ||
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
) {
  throw new Error(
    "Password reset tests require a disposable localhost *_test database."
  );
}
describe.skipIf(!url)("atomic password reset in MySQL", () => {
  let pool: Pool;
  const databaseName = `du_auth_${crypto.randomBytes(6).toString("hex")}_test`;
  let store: typeof import("../../../lib/persistence/authStore");
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    try {
      await admin.execute(`CREATE DATABASE ${databaseName}`);
    } finally {
      await admin.end();
    }
    const isolatedUrl = new URL(url!);
    isolatedUrl.pathname = "/" + databaseName;
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", isolatedUrl.toString());
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.resetModules();
    const runtime = await import("../../../lib/databaseRuntime");
    pool = runtime.db!;
    await (await import("../../../db")).initializeDatabase();
    store = await import("../../../lib/persistence/authStore");
  });
  afterAll(async () => {
    await pool?.end();
    const admin = mysql.createPool(url!);
    try {
      await admin.execute(`DROP DATABASE IF EXISTS ${databaseName}`);
    } finally {
      await admin.end();
    }
    vi.unstubAllEnvs();
  });
  async function fixture() {
    const user = await store.createUser(
      "Reset fixture",
      `reset-${crypto.randomUUID()}@example.test`,
      "original-hash"
    );
    const id = Number(user.id);
    const session = await store.createSession(id);
    const first = await store.createPasswordResetToken(id);
    const second = await store.createPasswordResetToken(id);
    return { id, session, first, second };
  }
  async function state(id: number) {
    const [[user]] = await pool.query<any[]>(
      "SELECT password_hash,auth_version FROM users WHERE id=?",
      [id]
    );
    const [[sessions]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS total FROM auth_sessions WHERE user_id=?",
      [id]
    );
    const [[tokens]] = await pool.query<any[]>(
      "SELECT COUNT(*) AS unused FROM password_reset_tokens WHERE user_id=? AND used_at IS NULL",
      [id]
    );
    return { ...user, sessions: sessions.total, unused: tokens.unused };
  }
  it("commits the password and revokes sessions and every older reset link", async () => {
    const f = await fixture();
    expect(await store.resetPasswordWithToken(f.first.token, "new-hash")).toBe(
      true
    );
    expect(await state(f.id)).toEqual({
      password_hash: "new-hash",
      auth_version: 1,
      sessions: 0,
      unused: 0,
    });
    expect(await store.resetPasswordWithToken(f.first.token, "replay")).toBe(
      false
    );
    expect(
      await store.resetPasswordWithToken(f.second.token, "older-link")
    ).toBe(false);
  });
  it("rolls back token, password and version when session revocation fails, then permits retry", async () => {
    const f = await fixture();
    const connection = await pool.getConnection();
    const execute = connection.execute.bind(connection);
    const injected = new Proxy(connection, {
      get(target, property) {
        if (property === "execute")
          return async (sql: string, values: any) => {
            if (sql.startsWith("DELETE FROM auth_sessions"))
              throw new Error("Synthetic session-store failure");
            return execute(sql, values);
          };
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as PoolConnection;
    const getConnection = vi
      .spyOn(pool, "getConnection")
      .mockResolvedValueOnce(injected);
    try {
      await expect(
        store.resetPasswordWithToken(f.first.token, "new-hash")
      ).rejects.toThrow("Synthetic");
    } finally {
      getConnection.mockRestore();
    }
    expect(await state(f.id)).toEqual({
      password_hash: "original-hash",
      auth_version: 0,
      sessions: 1,
      unused: 2,
    });
    expect(await store.resetPasswordWithToken(f.first.token, "new-hash")).toBe(
      true
    );
  });
  it.each([false, true])(
    "serializes concurrent reset requests (different links: %s)",
    async different => {
      const f = await fixture();
      const outcomes = await Promise.all([
        store.resetPasswordWithToken(f.first.token, "first-hash"),
        store.resetPasswordWithToken(
          different ? f.second.token : f.first.token,
          "second-hash"
        ),
      ]);
      expect(outcomes.filter(Boolean)).toHaveLength(1);
      expect(await state(f.id)).toMatchObject({
        auth_version: 1,
        sessions: 0,
        unused: 0,
      });
    }
  );
  it("rejects expired tokens without modifying account state", async () => {
    const f = await fixture();
    await pool.execute(
      "UPDATE password_reset_tokens SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE token_hash=?",
      [f.first.tokenHash]
    );
    expect(await store.resetPasswordWithToken(f.first.token, "new-hash")).toBe(
      false
    );
    expect(await state(f.id)).toEqual({
      password_hash: "original-hash",
      auth_version: 0,
      sessions: 1,
      unused: 2,
    });
  });
  it("does not create a session when password verification raced with a completed reset", async () => {
    const f = await fixture();
    await store.resetPasswordWithToken(f.first.token, "new-hash");
    await expect(store.createSession(f.id, 24, 0)).rejects.toThrow(
      "credentials changed"
    );
    expect(await state(f.id)).toMatchObject({ sessions: 0, auth_version: 1 });
    await store.createSession(f.id, 24, 1);
    expect(await state(f.id)).toMatchObject({ sessions: 1 });
  });
  it("rejects old JWTs on ordinary account routes after reset and never falls back from bearer to cookie", async () => {
    const f = await fixture();
    const { issueAccessTokenForUser } = await import(
      "../../../lib/authSession"
    );
    const { createModularServer } = await import("../../../server");
    const server = createModularServer({
      backend: { db: pool, serverStartedAt: Date.now() },
    }).listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const authorization = `Bearer ${issueAccessTokenForUser({ id: f.id, auth_version: 0 })}`;
    try {
      expect(
        (await fetch(base + "/api/auth/me", { headers: { authorization } }))
          .status
      ).toBe(200);
      const refresh = await fetch(base + "/api/auth/token/refresh", {
        method: "POST",
        headers: {
          authorization: "Bearer invalid.jwt.value",
          cookie: `du_session=${f.session.token}`,
          origin: "https://untrusted.example.test",
        },
      });
      expect(refresh.status).toBe(401);
      await store.resetPasswordWithToken(f.first.token, "new-hash");
      expect(
        (await fetch(base + "/api/auth/me", { headers: { authorization } }))
          .status
      ).toBe(401);
      expect(
        (
          await fetch(base + "/api/notifications/features", {
            method: "POST",
            headers: { authorization, "content-type": "application/json" },
            body: JSON.stringify({ feature: "synthetic" }),
          })
        ).status
      ).toBe(401);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
