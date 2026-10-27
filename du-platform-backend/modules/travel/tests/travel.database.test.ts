import crypto from "node:crypto";
import { createServer, type Server } from "node:http";
import mysql, { type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { defaultTravelCriteria } from "../../../../shared/travel";
import { initializeTravel } from "../schema";
import { TravelRepository } from "../repository";
import { PublicTravelSearch } from "../providers";
const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!new URL(url).pathname.endsWith("_test") ||
    !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
)
  throw new Error("Travel tests require disposable localhost *_test database");
describe.skipIf(!url)("private Travel persistence in MySQL", () => {
  let pool: Pool;
  let server: Server;
  let base: string;
  let alice: string, bob: string;
  let aliceId: number, bobId: number;
  const schema = `du_travel_${crypto.randomBytes(6).toString("hex")}_test`;
  const draft = {
    criteria: defaultTravelCriteria(),
    searches: [],
    estimates: [],
  };
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    await admin.execute(`CREATE DATABASE ${schema}`);
    await admin.end();
    const isolated = new URL(url!);
    isolated.pathname = "/" + schema;
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", isolated.toString());
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.resetModules();
    const runtime = await import("../../../shared/databaseRuntime");
    pool = runtime.db!;
    await (await import("../../../db")).initializeDatabase();
    await initializeTravel(pool);
    const store = await import("../../../shared/persistence/authStore");
    const a = await store.createUser(
      "Alice",
      "alice@example.test",
      "synthetic-hash"
    );
    const b = await store.createUser(
      "Bob",
      "bob@example.test",
      "synthetic-hash"
    );
    aliceId = Number(a.id);
    bobId = Number(b.id);
    const { createJwtToken } = await import("../../../utils/jwt");
    alice = createJwtToken({ sub: aliceId, av: 0 });
    bob = createJwtToken({ sub: bobId, av: 0 });
    const { createModularServer } = await import("../../../server");
    server = createServer(
      createModularServer({
        backend: { db: pool, serverStartedAt: Date.now() },
      })
    );
    await new Promise<void>((r, j) => {
      server.once("error", j);
      server.listen(0, "127.0.0.1", r);
    });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(r => server.close(() => r()));
    await pool?.end();
    const admin = mysql.createPool(url!);
    await admin.execute(`DROP DATABASE IF EXISTS ${schema}`);
    await admin.end();
    vi.unstubAllEnvs();
  });
  const request = (token: string, path = "", method = "GET", body?: unknown) =>
    fetch(base + "/api/travel/saved" + path, {
      method,
      headers: {
        authorization: "Bearer " + token,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  it("keeps private trips and searches across repository instances and prevents cross-user reads/deletes", async () => {
    const r = await request(alice, "", "POST", {
      name: "Private Harare trip",
      kind: "trip",
      draft,
    });
    expect(r.status).toBe(201);
    const { id } = (await r.json()).data;
    const a = await request(alice);
    expect((await a.json()).data).toHaveLength(1);
    const b = await request(bob);
    expect((await b.json()).data).toEqual([]);
    expect((await request(bob, "/" + id, "DELETE")).status).toBe(404);
    expect((await new TravelRepository(pool).list(aliceId))[0].id).toBe(id);
    expect((await request(alice, "/" + id, "DELETE")).status).toBe(200);
    const search = await request(bob, "", "POST", {
      name: "Saved search",
      kind: "search",
      draft: {
        ...draft,
        searches: [{ category: "flights", criteria: draft.criteria }],
      },
    });
    expect(search.status).toBe(201);
    expect((await new TravelRepository(pool).list(bobId))[0].kind).toBe(
      "search"
    );
  });
  it("rejects foreign ownership fields, unknown data and SQL-shaped identifiers", async () => {
    expect(
      (
        await request(alice, "", "POST", {
          name: "no",
          kind: "trip",
          draft,
          userId: bobId,
        })
      ).status
    ).toBe(400);
    expect((await request(alice, "/invalid-sql", "DELETE")).status).toBe(400);
  });
  it("persists signed supplier observations and rejects forged prices without losing the trip", async () => {
    const c = draft.criteria;
    const leg = {
      route: [c.origin, c.destination],
      departureTime: c.departure + "T10:00:00",
      arrivalTime: c.departure + "T18:00:00",
      durationSeconds: 28800,
      stops: 0,
      segments: [{ carrierName: "Synthetic airline", flightNumber: "XX1" }],
    };
    const provider = new PublicTravelSearch(
      async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              structuredContent: {
                currency: c.currency,
                passengers: { adults: 1, children: 0, infants: 0 },
                itineraries: [
                  {
                    id: "synthetic",
                    price: 700,
                    bookingUrl: "https://kiwi.com/u/synthetic",
                    outbound: leg,
                    inbound: {
                      ...leg,
                      route: [c.destination, c.origin],
                      departureTime: c.returnDate + "T10:00:00",
                      arrivalTime: c.returnDate + "T18:00:00",
                    },
                  },
                ],
              },
            },
          })
        )
    );
    const quote = (await provider.search("flights", c)).quotes[0];
    const input = {
      name: "Signed supplier observation",
      kind: "trip",
      draft: { ...draft, quotes: [quote] },
    };
    const saved = await request(alice, "", "POST", input);
    expect(saved.status).toBe(201);
    const { id } = (await saved.json()).data;
    expect(
      (await new TravelRepository(pool).list(aliceId))[0].draft.quotes?.[0]
    ).toEqual(quote);
    expect((await request(bob, "/" + id, "DELETE")).status).toBe(404);
    const forged = await request(alice, "", "POST", {
      ...input,
      draft: { ...draft, quotes: [{ ...quote, price: 1 }] },
    });
    expect(forged.status).toBe(400);
    expect(
      (await new TravelRepository(pool).list(aliceId))[0].draft.quotes?.[0]
        .price
    ).toBe(700);
    expect((await request(alice, "/" + id, "DELETE")).status).toBe(200);
  });
  it("serializes concurrent saves at the 30-record account quota without partial inserts", async () => {
    const repo = new TravelRepository(pool);
    await pool.query(
      "INSERT INTO travel_saved (id,user_id,name,kind,draft) VALUES ?",
      [
        Array.from({ length: 29 }, () => [
          crypto.randomUUID(),
          aliceId,
          "Synthetic",
          "trip",
          JSON.stringify(draft),
        ]),
      ]
    );
    const results = await Promise.allSettled([
      repo.save(aliceId, { name: "A", kind: "trip", draft }),
      repo.save(aliceId, { name: "B", kind: "trip", draft }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await repo.list(aliceId)).toHaveLength(30);
  });
  it("never queues alerts or mixes newsletter consent with saved travel", async () => {
    const [queueBefore] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM transactional_messages"
    );
    const [before] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM newsletter_subscriptions"
    );
    const response = await fetch(base + "/api/travel/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent: true, email: "synthetic@example.test" }),
    });
    expect(response.status).toBe(503);
    const [after] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM newsletter_subscriptions"
    );
    expect(after[0].n).toBe(before[0].n);
    const [queueAfter] = await pool.query<any[]>(
      "SELECT COUNT(*) AS n FROM transactional_messages"
    );
    expect(queueAfter[0].n).toBe(queueBefore[0].n);
  });
});
