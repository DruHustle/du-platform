import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registerCoreMiddleware } from "../../core/middleware";
import { errorHandler } from "../../core/errorHandler";
import { registerBackendApiRoutes } from "../../api/backend";
import { createAuthModuleRouter } from "../auth/routes";
import { createShopModuleRouter } from "../shop/routes";
import { createSearchModuleRouter } from "../search/routes";
import { SearchRepository } from "../search/repositories/searchRepository";
import { createNotificationsModuleRouter } from "../notifications/routes";
import { createTravelRouter } from "../travel/routes";
import { PublicTravelSearch, publicTravelSearch } from "../travel/providers";
import { defaultTravelCriteria } from "../../domain/travel";
import { SHOP_SEED_PRODUCTS } from "../../domain/shopCatalog";
import { shopSeedProducts } from "../../shared/persistence/shopStore";
import { registerOnesaAIRoutes } from "../ai/runtime/onesaRoutes";
import { getOnesaRouteDeps } from "../ai/runtime/onesaRuntime";
import {
  expectApiRequest,
  expectApiResponse,
  validateApiSchema,
} from "./apiContract";

vi.mock("../../shared/databaseRuntime", () => ({
  db: null,
  isMemoryFallbackEnabled: () => true,
  isDbConnectionError: () => false,
  isTransientShopQueryError: () => false,
}));

let server: Server;
let base: string;
let originalStock: number;
const generatedReply = vi.fn(async () => ({
  reply: "I am Onesa. How can I help?",
  truncated: false,
}));
const criteria = {
  ...defaultTravelCriteria(),
  departure: "2027-01-15",
  returnDate: "2027-01-22",
};

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SHOP_COMMERCIAL_MODE", "observe");
  vi.stubEnv("SHOP_PILOT_APPROVAL_FILE", "");
  vi.stubEnv("CORS_ORIGINS", "http://localhost:3000");
  vi.stubEnv("CSRF_ENABLED", "true");
  vi.stubEnv("JWT_SECRET", "synthetic-openapi-contract-runtime-key");
  originalStock = shopSeedProducts[0].stock_qty;
  shopSeedProducts[0].stock_qty = 3;
  // Substitute only the external transport. Parsing, signing, revalidation and
  // HTTP serialization use the real provider adapter and route implementation.
  const provider = new PublicTravelSearch(
    async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            structuredContent: {
              currency: "EUR",
              passengers: { adults: 1, children: 0, infants: 0 },
              itineraries: [
                {
                  id: "contract-fixture",
                  price: 800,
                  bookingUrl: "https://kiwi.com/u/synthetic",
                  outbound: {
                    route: [criteria.origin, criteria.destination],
                    departureTime: "2027-01-15T10:00:00",
                    arrivalTime: "2027-01-15T18:00:00",
                    durationSeconds: 28800,
                    stops: 0,
                    segments: [
                      { carrierName: "Fixture airline", flightNumber: "XX1" },
                    ],
                  },
                  inbound: {
                    route: [criteria.destination, criteria.origin],
                    departureTime: "2027-01-22T10:00:00",
                    arrivalTime: "2027-01-22T18:00:00",
                    durationSeconds: 28800,
                    stops: 0,
                    segments: [
                      { carrierName: "Fixture airline", flightNumber: "XX2" },
                    ],
                  },
                },
              ],
            },
          },
        })
      ),
    () => Date.parse("2026-11-03T12:00:00Z")
  );
  vi.spyOn(publicTravelSearch, "search").mockImplementation(
    provider.search.bind(provider)
  );
  vi.spyOn(publicTravelSearch, "revalidate").mockImplementation(
    provider.revalidate.bind(provider)
  );
  // Search's publication boundary requires DB-sourced products. Fixtures stand
  // in for that repository; the controller, result mapping and route index run.
  vi.spyOn(SearchRepository.prototype, "publishedProducts").mockResolvedValue([
    ...SHOP_SEED_PRODUCTS,
  ]);
  const app = express();
  registerCoreMiddleware(app);
  registerBackendApiRoutes(app, { db: null, serverStartedAt: Date.now() });
  app.use("/api/auth", createAuthModuleRouter());
  app.use("/api/shop", createShopModuleRouter());
  app.use("/api/search", createSearchModuleRouter());
  app.use("/api/travel", createTravelRouter());
  app.use("/api/notifications", createNotificationsModuleRouter());
  registerOnesaAIRoutes(app, {
    ...getOnesaRouteDeps(),
    generateOnesaReply: generatedReply,
    getOnesaReadiness: async () => ({ ready: false }),
  });
  app.use(errorHandler);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

afterAll(async () => {
  server?.closeAllConnections();
  if (server?.listening)
    await new Promise<void>(resolve => server.close(() => resolve()));
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  shopSeedProducts[0].stock_qty = originalStock;
});

function send(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {}
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("published client contracts over HTTP", () => {
  it("describes native and cookie sessions, current user, profile updates, refresh and revocation", async () => {
    const credentials = {
      email: `contract-${randomUUID()}@example.test`,
      password: "ContractPassword123!",
    };
    const registration = { ...credentials, fullName: "Contract User" };
    expectApiRequest("/auth/native/register", "post", registration);
    const native = (
      await expectApiResponse(
        "/auth/native/register",
        "post",
        await send("/auth/native/register", "POST", registration),
        201
      )
    ).data;
    const bearer = { authorization: `Bearer ${native.accessToken}` };
    const me = await expectApiResponse(
      "/auth/me",
      "get",
      await send("/auth/me", "GET", undefined, bearer),
      200
    );
    expect(me.data.user.email).toBe(credentials.email);
    const update = { fullName: "Updated Contract User" };
    expectApiRequest("/auth/profile", "put", update);
    const updated = await expectApiResponse(
      "/auth/profile",
      "put",
      await send("/auth/profile", "PUT", update, bearer),
      200
    );
    expect(updated.data.user.fullName).toBe(update.fullName);
    await expectApiResponse(
      "/auth/profile",
      "put",
      await send(
        "/auth/profile",
        "PUT",
        { ...update, email: "wrong@example.test" },
        bearer
      ),
      400
    );
    await expectApiResponse("/auth/me", "get", await send("/auth/me"), 401);
    await expectApiResponse(
      "/auth/token/refresh",
      "post",
      await send(
        "/auth/token/refresh",
        "POST",
        {},
        { authorization: `Bearer ${native.sessionToken}` }
      ),
      200
    );

    const browserResponse = await send("/auth/login", "POST", credentials);
    const cookie = browserResponse.headers.get("set-cookie")!.split(";")[0];
    const browser = await expectApiResponse(
      "/auth/login",
      "post",
      browserResponse,
      200
    );
    expect(browser.data.sessionToken).toBeUndefined();
    expect(browser.data.user.id).toBe(native.user.id);
    await expectApiResponse(
      "/auth/token/refresh",
      "post",
      await send(
        "/auth/token/refresh",
        "POST",
        {},
        { cookie, origin: "http://localhost:3000" }
      ),
      403
    );
    await expectApiResponse(
      "/auth/token/refresh",
      "post",
      await send(
        "/auth/token/refresh",
        "POST",
        {},
        {
          cookie,
          origin: "http://localhost:3000",
          "x-csrf-token": "contract-fixture",
        }
      ),
      200
    );
    await expectApiResponse(
      "/auth/native/login",
      "post",
      await send("/auth/native/login", "POST", credentials),
      200
    );
    await expectApiResponse(
      "/auth/logout",
      "post",
      await send(
        "/auth/logout",
        "POST",
        {},
        { authorization: `Bearer ${native.sessionToken}` }
      ),
      200
    );
    await expectApiResponse(
      "/auth/token/refresh",
      "post",
      await send(
        "/auth/token/refresh",
        "POST",
        {},
        { authorization: `Bearer ${native.sessionToken}` }
      ),
      401
    );
    await expectApiResponse(
      "/auth/login",
      "post",
      await send("/auth/login", "POST", { ...credentials, password: "wrong" }),
      401
    );
    await expectApiResponse(
      "/auth/native/register",
      "post",
      await send("/auth/native/register", "POST", {
        ...registration,
        password: "weak",
      }),
      400
    );
    expect(
      validateApiSchema(
        { $ref: "#/components/schemas/Registration" },
        { ...registration, password: "weak" }
      ).success
    ).toBe(false);
  });

  it("describes catalogue prices, readiness and the complete assisted order lifecycle payload", async () => {
    const catalogue = (
      await expectApiResponse(
        "/shop/products",
        "get",
        await send("/shop/products"),
        200
      )
    ).data;
    expect(catalogue.count).toBe(catalogue.products.length);
    await expectApiResponse(
      "/shop/readiness",
      "get",
      await send("/shop/readiness"),
      200
    );
    const product = catalogue.products.find((item: any) => item.stock_qty > 0);
    expect(product).toBeDefined();
    expect(
      validateApiSchema(
        { $ref: "#/components/schemas/Catalogue" },
        {
          ...catalogue,
          products: [{ ...product, price_cents: "not a number" }],
        }
      ).success
    ).toBe(false);
    const orderInput = {
      items: [{ productId: product.id, quantity: 1 }],
      customerName: "Contract Buyer",
      customerEmail: "buyer@example.test",
      shippingCountry: "Germany",
      shippingCity: "Berlin",
      shippingAddress: "Test Street 12",
      paymentMethod: "manual_assisted",
      requestToken: "1".repeat(64),
    };
    expectApiRequest("/shop/orders", "post", orderInput);
    const created = (
      await expectApiResponse(
        "/shop/orders",
        "post",
        await send("/shop/orders", "POST", orderInput),
        201
      )
    ).data.order;
    expect(created.totalCents).toBe(
      created.subtotalCents + created.shippingCents
    );
    const replayed = (
      await expectApiResponse(
        "/shop/orders",
        "post",
        await send("/shop/orders", "POST", orderInput),
        201
      )
    ).data.order;
    expect(replayed.orderRef).toBe(created.orderRef);
    expect(replayed.replayed).toBe(true);
    const headers = { "x-order-access-token": created.manageToken };
    const order = await expectApiResponse(
      "/shop/orders/{orderRef}",
      "get",
      await send(`/shop/orders/${created.orderRef}`, "GET", undefined, headers),
      200
    );
    expect(order.data.order.items[0].productId).toBe(product.id);
    await expectApiResponse(
      "/shop/orders/{orderRef}/workflow",
      "get",
      await send(
        `/shop/orders/${created.orderRef}/workflow`,
        "GET",
        undefined,
        headers
      ),
      200
    );
    await expectApiResponse(
      "/shop/orders/{orderRef}",
      "get",
      await send(`/shop/orders/${created.orderRef}`),
      404
    );
    await expectApiResponse(
      "/shop/orders/{orderRef}/confirm-payment",
      "post",
      await send(
        `/shop/orders/${created.orderRef}/confirm-payment`,
        "POST",
        {},
        headers
      ),
      400
    );
    await expectApiResponse(
      "/shop/orders",
      "post",
      await send("/shop/orders", "POST", { ...orderInput, items: [] }),
      400
    );
  });

  it("validates signed travel offers, revalidation and unavailable monitoring without a live supplier", async () => {
    const capabilities = (
      await expectApiResponse(
        "/travel/capabilities",
        "get",
        await send("/travel/capabilities"),
        200
      )
    ).data;
    expect(capabilities.locations.length).toBeGreaterThan(0);
    expect(capabilities.monitoring).toBe(false);
    const input = { category: "flights", criteria };
    expectApiRequest("/travel/search", "post", input);
    const results = (
      await expectApiResponse(
        "/travel/search",
        "post",
        await send("/travel/search", "POST", input),
        200
      )
    ).data;
    expect(results.quotes).toHaveLength(1);
    const quote = results.quotes[0];
    expectApiRequest("/travel/revalidate", "post", quote);
    await expectApiResponse(
      "/travel/revalidate",
      "post",
      await send("/travel/revalidate", "POST", quote),
      200
    );
    await expectApiResponse(
      "/travel/search",
      "post",
      await send("/travel/search", "POST", { ...input, category: "car-hire" }),
      400
    );
    await expectApiResponse(
      "/travel/alerts",
      "post",
      await send("/travel/alerts", "POST", {}),
      503
    );
    await expectApiResponse(
      "/travel/saved",
      "get",
      await send("/travel/saved"),
      401
    );
  });

  it("describes empty and populated search and durable contact failure responses", async () => {
    const empty = await expectApiResponse(
      "/search",
      "get",
      await send("/search"),
      200
    );
    expect(empty.data.results).toEqual([]);
    const found = (
      await expectApiResponse(
        "/search",
        "get",
        await send("/search?q=shop"),
        200
      )
    ).data;
    expect(found.count).toBe(found.results.length);
    expect(found.count).toBeGreaterThan(0);
    const input = {
      requestId: randomUUID(),
      name: "Contract User",
      email: "contract@example.test",
      subject: "Contract enquiry",
      message: "Test the saved receipt.",
    };
    expectApiRequest("/notifications/contact", "post", input);
    await expectApiResponse(
      "/notifications/contact",
      "post",
      await send("/notifications/contact", "POST", input),
      503
    );
    await expectApiResponse(
      "/notifications/contact",
      "post",
      await send("/notifications/contact", "POST", {
        ...input,
        requestId: "invalid",
      }),
      400
    );
  });

  it("preserves raw assistant replies/errors and structured fallback plans", async () => {
    const input = {
      language: "en",
      messages: [{ role: "user", content: "Hello" }],
    };
    expectApiRequest("/ai/chat", "post", input);
    const chat = await expectApiResponse(
      "/ai/chat",
      "post",
      await send("/ai/chat", "POST", input),
      200
    );
    expect(chat.reply).toContain("Onesa");
    expect(chat.data).toBeUndefined();
    await expectApiResponse(
      "/ai/chat",
      "post",
      await send("/ai/chat", "POST", { messages: [] }),
      400
    );
    generatedReply.mockResolvedValueOnce({ reply: "", truncated: false });
    await expectApiResponse(
      "/ai/chat",
      "post",
      await send("/ai/chat", "POST", input),
      502
    );
    const plan = await expectApiResponse(
      "/ai/trip-plan",
      "post",
      await send("/ai/trip-plan", "POST", {
        language: "en",
        origin: "Berlin",
        arrivalAttraction: "Victoria Falls",
        days: 5,
        travelers: 2,
      }),
      200
    );
    expect(plan.source).toBe("fallback");
    expect(plan.plan.itinerary).toHaveLength(5);
  });

  it("documents the raw system health format", async () => {
    await expectApiResponse("/ping", "get", await send("/ping"), 200);
    await expectApiResponse("/health/db", "get", await send("/health/db"), 503);
  });
});
