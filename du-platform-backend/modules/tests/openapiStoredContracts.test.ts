import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTravelRouter } from "../travel/routes";
import { createShopModuleRouter } from "../shop/routes";
import { createNotificationsModuleRouter } from "../notifications/routes";
import { defaultTravelCriteria } from "../../domain/travel";
import { createJwtToken } from "../../utils/jwt";
import { sha256 } from "../../shared/persistence/authStore";
import { errorHandler } from "../../core/errorHandler";
import { expectApiRequest, expectApiResponse } from "./apiContract";

const fixture = vi.hoisted(() => ({
  pool: { query: vi.fn(), execute: vi.fn(), getConnection: vi.fn() },
}));
vi.mock("../../shared/databaseRuntime", () => ({
  db: fixture.pool,
  isMemoryFallbackEnabled: () => false,
  isDbConnectionError: () => false,
  isTransientShopQueryError: () => false,
}));
vi.mock("../../shared/email", async importOriginal => ({
  ...(await importOriginal<typeof import("../../shared/email")>()),
  getNotifyFromEmail: async () => "service@example.test",
  getNotifyAlertEmails: async () => ["operator@example.test"],
}));

// Only the SQL transport is replaced. Real routers, JWT/current-user guards,
// repository parsing, transactional receipt construction and serializers run.
// Real transactions, locking and migrations remain in the MySQL CI suites.
const saved = new Map<string, any>();
const contacts = new Map<string, string>();
const notificationIntents: unknown[] = [];
const orderToken = "a".repeat(64);
let server: Server;
let base: string;
let token: string;

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("JWT_SECRET", "synthetic-stored-contract-runtime-key");
  fixture.pool.query.mockImplementation(
    async (sql: string, values: any[] = []) => {
      if (sql.includes("FROM users WHERE id"))
        return [
          [
            {
              id: values[0],
              email: "fixture@example.test",
              full_name: "Fixture User",
              auth_version: 0,
            },
          ],
        ];
      if (sql.includes("COUNT(*) AS total FROM travel_saved"))
        return [[{ total: saved.size }]];
      if (sql.includes("FROM travel_saved"))
        return [[...saved.values()].filter(row => row.user_id === values[0])];
      if (sql.includes("FROM shop_products p LEFT JOIN shop_product_details"))
        return [
          Number(values[0]) === 1
            ? [
                {
                  details: JSON.stringify({
                    ingredients: "Published fixture ingredients",
                    photos: ["https://example.test/product.jpg"],
                  }),
                  updated_at: new Date("2026-11-01T12:00:00Z"),
                },
              ]
            : [],
        ];
      if (sql.startsWith("START TRANSACTION")) return [[]];
      if (sql.includes("FROM shop_orders WHERE order_ref"))
        return [
          values[0] === "DU-CONTRACT" && values[1] === sha256(orderToken)
            ? [
                {
                  id: 11,
                  order_ref: "DU-CONTRACT",
                  status: "awaiting_payment",
                  currency: "EUR",
                  shipping_cents: 1200,
                  total_cents: 5210,
                },
              ]
            : [],
        ];
      if (sql.includes("FROM shop_order_workflows"))
        return [
          [
            {
              stage: "quote_sent",
              version: 1,
              quote_version: 1,
              refund_cents: 0,
            },
          ],
        ];
      if (sql.includes("FROM shop_order_items"))
        return [
          [
            {
              product_id: 1,
              product_name: "Fixture product",
              quantity: 1,
              unit_price_cents: 4010,
            },
          ],
        ];
      if (sql.includes("FROM shop_quotes"))
        return [
          [
            {
              id: 20,
              order_id: 11,
              version: 1,
              currency: "EUR",
              total_cents: 5210,
              shipping_cents: 1200,
              valid_until: new Date("2027-01-01T12:00:00Z"),
              expired: 0,
              items: JSON.stringify([
                {
                  productId: 1,
                  productName: "Fixture product",
                  quantity: 1,
                  unitPriceCents: 4010,
                  lineTotalCents: 4010,
                  fulfilmentDetails: "Published delivery details",
                },
              ]),
            },
          ],
        ];
      if (sql.includes("FROM shop_order_events"))
        return [
          [
            {
              action: "quote_sent",
              public_message: "Review the quote.",
              created_at: new Date("2026-11-01T12:00:00Z"),
              command_id: null,
            },
          ],
        ];
      if (sql.includes("FROM shop_order_snapshots"))
        return [
          [
            {
              items: JSON.stringify([
                {
                  productId: 1,
                  name: "Fixture product",
                  quantity: 1,
                  unitPriceCents: 4010,
                  description: "Requested product description",
                  imageUrl: "/images/product.jpg",
                  currency: "EUR",
                },
              ]),
            },
          ],
        ];
      if (
        sql.includes("FROM shop_order_refunds") ||
        sql.includes("FROM shop_refund_legacy_balances")
      )
        return [[]];
      if (sql.includes("SELECT payload_hash FROM contact_enquiries"))
        return [[{ payload_hash: contacts.get(values[0]) }]];
      throw new Error(`Unexpected fixture query: ${sql}`);
    }
  );
  fixture.pool.execute.mockImplementation(
    async (sql: string, values: any[] = []) => {
      if (sql.startsWith("INSERT INTO travel_saved")) {
        const [id, user_id, name, kind, draft] = values;
        saved.set(id, {
          id,
          user_id,
          name,
          kind,
          draft,
          updated_at: new Date("2026-11-01T12:00:00Z"),
        });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("DELETE FROM travel_saved"))
        return [
          {
            affectedRows:
              saved.get(values[1])?.user_id === values[0] &&
              saved.delete(values[1])
                ? 1
                : 0,
          },
        ];
      if (sql.includes("INSERT IGNORE INTO contact_enquiries")) {
        const exists = contacts.has(values[0]);
        if (!exists) contacts.set(values[0], values[1]);
        return [{ affectedRows: exists ? 0 : 1 }];
      }
      if (sql.includes("INSERT INTO transactional_messages")) {
        notificationIntents.push(values);
        return [{ affectedRows: 1 }];
      }
      // Rate limiting deliberately falls back to its real in-process buckets.
      throw new Error(`Unexpected fixture write: ${sql}`);
    }
  );
  fixture.pool.getConnection.mockResolvedValue({
    query: fixture.pool.query,
    execute: fixture.pool.execute,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  });
  const app = express();
  app.use(express.json());
  app.use("/api/travel", createTravelRouter());
  app.use("/api/shop", createShopModuleRouter());
  app.use("/api/notifications", createNotificationsModuleRouter());
  app.use(errorHandler);
  token = createJwtToken({ sub: 7, av: 0 });
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

afterAll(async () => {
  server?.closeAllConnections();
  if (server?.listening)
    await new Promise<void>(resolve => server.close(() => resolve()));
  vi.unstubAllEnvs();
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
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("storage-backed client contract serialization", () => {
  it("round trips complete saved search drafts and documents create/list/delete/errors", async () => {
    const criteria = defaultTravelCriteria();
    const input = {
      name: "Harare search",
      kind: "search",
      draft: {
        criteria,
        searches: [{ category: "flights", criteria }],
        estimates: [],
      },
    };
    expectApiRequest("/travel/saved", "post", input);
    const created = await expectApiResponse(
      "/travel/saved",
      "post",
      await send("/travel/saved", "POST", input),
      201
    );
    const listed = await expectApiResponse(
      "/travel/saved",
      "get",
      await send("/travel/saved"),
      200
    );
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]).toMatchObject({
      ...input,
      id: created.data.id,
      updatedAt: "2026-11-01T12:00:00.000Z",
    });
    await expectApiResponse(
      "/travel/saved",
      "post",
      await send("/travel/saved", "POST", {
        ...input,
        draft: { searches: [], estimates: [] },
      }),
      400
    );
    await expectApiResponse(
      "/travel/saved/{id}",
      "delete",
      await send(`/travel/saved/${created.data.id}`, "DELETE"),
      200
    );
    await expectApiResponse(
      "/travel/saved/{id}",
      "delete",
      await send(`/travel/saved/${created.data.id}`, "DELETE"),
      404
    );
    await expectApiResponse(
      "/travel/saved/{id}",
      "delete",
      await send("/travel/saved/invalid", "DELETE"),
      400
    );
  });

  it("normalizes owner-published product details including defaults and timestamps", async () => {
    const result = await expectApiResponse(
      "/shop/products/{id}/details",
      "get",
      await send("/shop/products/1/details"),
      200
    );
    expect(result.data.details.ingredients).toBe(
      "Published fixture ingredients"
    );
    expect(result.data.details.allergens).toBe("");
    expect(result.data.updatedAt).toBe("2026-11-01T12:00:00.000Z");
    await expectApiResponse(
      "/shop/products/{id}/details",
      "get",
      await send("/shop/products/2/details"),
      404
    );
  });

  it("describes the nonempty customer quote and requested-item snapshots used by both clients", async () => {
    const result = await expectApiResponse(
      "/shop/orders/{orderRef}/workflow",
      "get",
      await send("/shop/orders/DU-CONTRACT/workflow", "GET", undefined, {
        "x-order-access-token": orderToken,
      }),
      200
    );
    expect(result.data.quotes[0].items[0]).toMatchObject({
      productId: 1,
      productName: "Fixture product",
      lineTotalCents: 4010,
      fulfilmentDetails: "Published delivery details",
    });
    expect(result.data.requestedItems[0].description).toBe(
      "Requested product description"
    );
  });

  it("returns a durable contact receipt, replays the same ID, and rejects changed payloads", async () => {
    const input = {
      requestId: randomUUID(),
      name: "Fixture User",
      email: "fixture@example.test",
      subject: "Contract enquiry",
      message: "Keep this exact message on retry.",
    };
    expectApiRequest("/notifications/contact", "post", input);
    const receipt = await expectApiResponse(
      "/notifications/contact",
      "post",
      await send("/notifications/contact", "POST", input),
      201
    );
    expect(receipt.data.requestId).toBe(input.requestId);
    expect(notificationIntents).toHaveLength(2);
    await expectApiResponse(
      "/notifications/contact",
      "post",
      await send("/notifications/contact", "POST", input),
      201
    );
    expect(notificationIntents).toHaveLength(2);
    await expectApiResponse(
      "/notifications/contact",
      "post",
      await send("/notifications/contact", "POST", {
        ...input,
        message: "Changed payload",
      }),
      409
    );
  });
});
