import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, afterAll, beforeAll, vi } from "vitest";
import { createServer, type Server } from "node:http";
import {
  guestTravelDraftSchema,
  travelCriteriaSchema,
  defaultTravelCriteria,
  validateTravel,
  estimateTotals,
  savedTravelSchema,
  providerResources,
  isSafeTravelLink,
  travelCapabilities,
} from "../../../../shared/travel";
import { travelRedirects } from "../../../../shared/travelRoutes";
import { createModularServer } from "../../../server";
import { TravelRepository } from "../repository";
const criteria = () => ({
  ...defaultTravelCriteria(),
  departure: "2027-03-01",
  returnDate: "2027-03-10",
});
describe("Travel search validation and truthful capabilities", () => {
  it("accepts regional, international and small airport identifiers without claiming supply", () => {
    for (const [origin, destination] of [
      ["FRA", "HRE"],
      ["JNB", "VFA"],
      ["JNB", "BUQ"],
      ["CPT", "MSU"],
      ["LUN", "SHO"],
    ])
      expect(
        validateTravel(
          { ...criteria(), origin, destination },
          "flights",
          "2026-01-01"
        ).success
      ).toBe(true);
    expect(travelCapabilities.liveResults).toBe(false);
    expect(travelCapabilities.criteriaLinks).toBe(false);
  });
  it.each([
    { origin: "arbitrary" },
    { adults: 0 },
    { adults: 10 },
    { childAges: [-1] },
    { childAges: [18] },
    { pickupTime: "24:01" },
    { departure: "2027-02-30" },
    { currency: "BTC" },
    { secret: "no" },
  ])("rejects invalid criteria %j", patch =>
    expect(
      travelCriteriaSchema.safeParse({ ...criteria(), ...patch }).success
    ).toBe(false)
  );
  it("checks chronology, same airports, past dates and room occupancy", () => {
    for (const [patch, category, error] of [
      [{ returnDate: "2027-02-01" }, "flights", "dates"],
      [{ departure: "2020-01-01" }, "flights", "past"],
      [{ origin: "HRE" }, "flights", "route"],
      [{ rooms: 2 }, "stays", "occupancy"],
    ] as const)
      expect(
        validateTravel({ ...criteria(), ...patch }, category, "2026-01-01")
      ).toMatchObject({ success: false, error });
    expect(
      validateTravel(
        { ...criteria(), tripType: "one-way", returnDate: "" },
        "flights",
        "2026-01-01"
      ).success
    ).toBe(true);
    expect(
      validateTravel(
        { ...criteria(), tripType: "one-way", returnDate: "" },
        "stays",
        "2026-01-01"
      ).success
    ).toBe(false);
  });
  it("validates independent categories without requiring unrelated airport fields", () => {
    expect(
      validateTravel(
        { ...criteria(), origin: "", pickup: "", dropoff: "" },
        "stays",
        "2026-01-01"
      ).success
    ).toBe(true);
    expect(
      validateTravel(
        { ...criteria(), origin: "", destination: "" },
        "car-hire",
        "2026-01-01"
      ).success
    ).toBe(true);
    expect(
      validateTravel({ ...criteria(), origin: "" }, "flights", "2026-01-01")
        .success
    ).toBe(false);
  });
  it("permits same-day returns and timed rentals, while requiring overnight accommodation", () => {
    const sameDay = { ...criteria(), returnDate: criteria().departure };
    expect(validateTravel(sameDay, "flights", "2026-01-01").success).toBe(true);
    expect(
      validateTravel(
        { ...sameDay, pickupTime: "10:00", dropoffTime: "18:00" },
        "car-hire",
        "2026-01-01"
      ).success
    ).toBe(true);
    expect(validateTravel(sameDay, "car-hire", "2026-01-01")).toMatchObject({
      success: false,
      error: "time",
    });
    expect(validateTravel(sameDay, "stays", "2026-01-01").success).toBe(false);
  });
  it("never invents exchange rates or combine quote and deposit amounts", () => {
    const totals = estimateTotals([
      {
        id: crypto.randomUUID(),
        category: "flights",
        amount: 100,
        currency: "EUR",
      },
      {
        id: crypto.randomUUID(),
        category: "stays",
        amount: 50,
        currency: "USD",
      },
    ]);
    expect(totals).toEqual({ EUR: 100, USD: 50 });
    expect(totals.GBP).toBeUndefined();
  });
  it("does not accept supplier quotes or private fields through the draft API", () => {
    const base = {
      name: "Trip",
      kind: "trip",
      draft: { criteria: criteria(), searches: [], estimates: [] },
    };
    expect(savedTravelSchema.safeParse(base).success).toBe(true);
    expect(
      savedTravelSchema.safeParse({
        ...base,
        draft: { ...base.draft, quotes: [{ price: 0 }] },
      }).success
    ).toBe(false);
    expect(savedTravelSchema.safeParse({ ...base, owner: 2 }).success).toBe(
      false
    );
  });
  it("retains unfinished guest criteria but refuses them as saved searches", () => {
    const draft = {
      criteria: { ...criteria(), departure: "", childAges: [-1] },
      searches: [],
      estimates: [],
    };
    expect(guestTravelDraftSchema.safeParse(draft).success).toBe(true);
    expect(
      savedTravelSchema.safeParse({ name: "Draft", kind: "trip", draft })
        .success
    ).toBe(false);
  });
  it("constrains all public outbound resources without open redirects or credentials", () => {
    for (const url of Object.values(providerResources))
      expect(isSafeTravelLink(url)).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "https://evil.test",
      "https://www.kayak.com/flights?redirect=https://evil.test",
      "https://user:password@www.kayak.com/flights",
      "//www.kayak.com/flights",
    ])
      expect(isSafeTravelLink(url)).toBe(false);
  });
});
describe("Travel HTTP compatibility and disabled monitoring", () => {
  let server: Server;
  let base: string;
  let staticPath: string;
  beforeAll(async () => {
    staticPath = await mkdtemp(path.join(tmpdir(), "du-travel-static-"));
    await mkdir(path.join(staticPath, "travel"));
    await writeFile(
      path.join(staticPath, "index.html"),
      "<html><head><title>Fixture</title></head><body><div id='root'></div></body></html>"
    );
    await writeFile(
      path.join(staticPath, "travel.html"),
      "Travel guide fixture"
    );
    await writeFile(path.join(staticPath, "404.html"), "Missing page fixture");
    server = createServer(
      createModularServer({
        backend: { db: null, serverStartedAt: Date.now() },
        staticPath,
      })
    );
    await new Promise<void>((r, j) => {
      server.once("error", j);
      server.listen(0, "127.0.0.1", r);
    });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()));
    await rm(staticPath, { recursive: true, force: true });
  });
  it("redirects every old path once, preserves query and never points to an alias", async () => {
    for (const [old, target] of Object.entries(travelRedirects)) {
      const r = await fetch(base + old + "?lng=de&source=bookmark", {
        redirect: "manual",
      });
      expect(r.status).toBe(308);
      expect(r.headers.get("location")).toBe(
        target + "?lng=de&source=bookmark"
      );
      expect(travelRedirects[target]).toBeUndefined();
    }
  });
  it("serves the clean landing with its guide document despite child folders and keeps 404 status", async () => {
    const response = await fetch(base + "/travel", { redirect: "manual" });
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("Travel guide fixture");
    expect((await fetch(base + "/404")).status).toBe(404);
  });
  it("rejects anonymous access to private records", async () => {
    for (const method of ["GET", "POST", "DELETE"]) {
      const r = await fetch(
        base +
          "/api/travel/saved" +
          (method === "DELETE" ? "/00000000-0000-4000-8000-000000000001" : ""),
        { method }
      );
      expect(r.status).toBe(401);
      expect(r.headers.get("cache-control")).toContain("no-store");
    }
  });
  it.each(["false", "true"])(
    "cannot activate alerts, even with opt-in and recovery hold=%s",
    async hold => {
      vi.stubEnv("OUTBOUND_MESSAGES_PAUSED", hold);
      try {
        for (let n = 0; n < 2; n++) {
          const r = await fetch(base + "/api/travel/alerts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              consent: true,
              threshold: 100,
              currency: "EUR",
              email: "synthetic@example.test",
            }),
          });
          expect(r.status).toBe(503);
          expect((await r.json()).error.code).toBe(
            "TRAVEL_MONITORING_UNAVAILABLE"
          );
        }
      } finally {
        vi.unstubAllEnvs();
      }
    }
  );
});
describe("Travel repository ownership and transaction limits", () => {
  it("scopes reads and deletes by the authenticated owner", async () => {
    const pool: any = {
      query: vi.fn().mockResolvedValue([[]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
    };
    const repo = new TravelRepository(pool);
    expect(await repo.list(7)).toEqual([]);
    expect(pool.query.mock.calls[0][1]).toEqual([7]);
    expect(await repo.remove(8, "not-owned")).toBe(false);
    expect(pool.execute.mock.calls[0][1]).toEqual([8, "not-owned"]);
  });
  it("serializes per-owner saves and rolls back at the bounded storage limit", async () => {
    const c: any = {
      beginTransaction: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total: 30 }]]),
      rollback: vi.fn(),
      commit: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(),
    };
    await expect(
      new TravelRepository({ getConnection: async () => c } as any).save(7, {
        name: "test",
        kind: "trip",
        draft: { criteria: criteria(), searches: [], estimates: [] },
      })
    ).rejects.toThrow("TRAVEL_LIMIT");
    expect(c.query.mock.calls[0]).toEqual([
      "SELECT id FROM users WHERE id=? FOR UPDATE",
      [7],
    ]);
    expect(c.rollback).toHaveBeenCalledOnce();
    expect(c.commit).not.toHaveBeenCalled();
    expect(c.execute).not.toHaveBeenCalled();
    expect(c.release).toHaveBeenCalledOnce();
  });
});
