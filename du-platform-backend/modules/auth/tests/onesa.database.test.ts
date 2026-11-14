import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import mysql, { type Pool } from "mysql2/promise";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { defaultTravelCriteria } from "../../../domain/travel";

const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test"))
)
  throw Error("Use a disposable localhost *_test database.");
describe.skipIf(!url)("Diaspora Unlocked migration in SQL", () => {
  const schema = "du_onesa_" + randomUUID().replace(/-/g, "") + "_test";
  let pool: Pool,
    server: Server,
    base: string,
    tokens: string[] = [];
  const legacyTokens: string[] = [];
  let tripId: string,
    legacyIds: number[] = [];
  const accounts = ["owner", "neighbor"].map((name) => ({
    fullName: name + " Traveler",
    email: name + "@example.test",
    password: "ExamplePassword1!",
  }));
  const post = (path: string, body: unknown, access?: string) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(access ? { authorization: "Bearer " + access } : {}),
      },
      body: JSON.stringify(body),
    });
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    try {
      await admin.execute("CREATE DATABASE " + schema);
    } finally {
      await admin.end();
    }
    const target = new URL(url!);
    target.pathname = "/" + schema;
    vi.stubEnv("DATABASE_URL", target.href);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.resetModules();
    pool = (await import("../../../shared/databaseRuntime")).db!;
    await (await import("../../../db")).initializeDatabase();
    const pair = await generateKeyPair("RS256", { extractable: true });
    vi.stubEnv("ONESA_IDENTITY_ENABLED", "true");
    vi.stubEnv("ONESA_ISSUER", "https://auth.fixture.test/");
    vi.stubEnv(
      "ONESA_JWKS_JSON",
      JSON.stringify({
        keys: [
          {
            ...(await exportJWK(pair.publicKey)),
            kid: "sql-test",
            alg: "RS256",
          },
        ],
      }),
    );
    const app = express();
    (await import("../../../core/middleware")).registerCoreMiddleware(app);
    app.use("/auth", (await import("../routes")).createAuthModuleRouter());
    app.use(
      "/travel",
      (await import("../../travel/routes")).createTravelRouter(),
    );
    app.use((await import("../../../core/errorHandler")).errorHandler);
    server = createServer(app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw Error("Missing port");
    base = "http://127.0.0.1:" + addr.port;
    for (const user of accounts) {
      const created = await post("/auth/native/register", user);
      expect(created.status).toBe(201);
      const { data } = await created.json();
      legacyIds.push(data.user.id);
      legacyTokens.push(data.accessToken);
      if (user === accounts[0]) {
        const saved = await post(
          "/travel/saved",
          {
            kind: "trip",
            name: "Existing family trip",
            draft: {
              criteria: defaultTravelCriteria(),
              estimates: [],
              searches: [],
            },
          },
          data.accessToken,
        );
        expect(saved.status).toBe(201);
        tripId = (await saved.json()).data.id;
      }
      tokens.push(
        await new SignJWT({
          "https://onesa.eu/claims/user_id": randomUUID(),
          "https://onesa.eu/claims/products": ["diaspora-unlocked"],
          "https://onesa.eu/claims/roles": ["user"],
          email: accounts[1].email,
        })
          .setProtectedHeader({ alg: "RS256", kid: "sql-test" })
          .setIssuedAt()
          .setExpirationTime("4m")
          .setSubject("fixture|" + user.fullName)
          .setAudience("https://api.diasporaunlocked.com")
          .setIssuer("https://auth.fixture.test/")
          .sign(pair.privateKey),
      );
    }
  });
  afterAll(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    await pool?.end();
    const admin = mysql.createPool(url!);
    try {
      await admin.execute("DROP DATABASE IF EXISTS " + schema);
    } finally {
      await admin.end();
    }
    vi.unstubAllEnvs();
  });
  it("preserves saved trips and ownership across reentrant migration and API module reload without Identity", async () => {
    for (const [index, account] of accounts.entries()) {
      const link = {
        client: "native",
        email: account.email,
        password: account.password,
        accessToken: tokens[index],
      };
      const both = await Promise.all([
        post("/auth/onesa/link", link),
        post("/auth/onesa/link", link),
      ]);
      for (const reply of both) {
        expect(reply.status).toBe(200);
        expect((await reply.json()).data.user.id).toBe(legacyIds[index]);
      }
    }
    const rows = await pool.query(
      "SELECT COUNT(*) AS total FROM onesa_account_links",
    );
    expect((rows[0] as { total: number }[])[0].total).toBe(2);
    const [owner, neighbor] = await Promise.all(
      tokens.map((token) =>
        fetch(base + "/travel/saved", {
          headers: { authorization: "Bearer " + token },
        }),
      ),
    );
    expect((await owner.json()).data[0]).toMatchObject({
      id: tripId,
      name: "Existing family trip",
    });
    expect((await neighbor.json()).data).toEqual([]);
    const postCutover = await post(
      "/travel/saved",
      {
        kind: "trip",
        name: "Trip added after linking",
        draft: {
          criteria: defaultTravelCriteria(),
          estimates: [],
          searches: [],
        },
      },
      tokens[0],
    );
    expect(postCutover.status).toBe(201);
    const newId = (await postCutover.json()).data.id;
    vi.stubEnv("ONESA_IDENTITY_ENABLED", "false");
    expect(
      (
        await fetch(base + "/travel/saved", {
          headers: { authorization: "Bearer " + tokens[0] },
        })
      ).status,
    ).toBe(401);
    const rolledBack = await fetch(base + "/travel/saved", {
      headers: { authorization: "Bearer " + legacyTokens[0] },
    });
    expect(
      (await rolledBack.json()).data.map((t: { id: string }) => t.id).sort(),
    ).toEqual([tripId, newId].sort());
    vi.stubEnv("ONESA_IDENTITY_ENABLED", "true");
    vi.resetModules();
    const verified = await (
      await import("../onesaAccounts")
    ).resolveOnesa(tokens[0]);
    expect(verified.user?.id).toBe(legacyIds[0]);
    await (await import("../../../shared/databaseRuntime")).db?.end();
  });
});
