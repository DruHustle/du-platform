import { renderOrderEmail } from "../orderNotifications";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../shared/databaseRuntime", () => ({
  db: null,
  isDbConnectionError: () => false,
  isTransientShopQueryError: () => false,
  isMemoryFallbackEnabled: () => true,
}));
vi.mock("../../../shared/email", () => ({
  getNotifyFromEmail: vi.fn(async () => "shop@example.test"),
  getNotifyAlertEmails: vi.fn(async () => ["merchant@example.test"]),
  sendEmailMessageSafe: vi.fn(async () => true),
}));
import {
  shopOrderRequestSchema,
  calculateShopShippingCents,
} from "../../../../shared/shopCheckout";
import {
  createShopOrder,
  getShopOrderByRef,
  confirmShopOrderPayment,
  shopSeedProducts,
} from "../../../shared/persistence/shopStore";
import { ShopService } from "../services/shopService";
import { ShopController } from "../controllers/shopController";
import { sendEmailMessageSafe } from "../../../shared/email";
import crypto from "node:crypto";
import express from "express";
import { createShopModuleRouter } from "../routes";
const payload = () => ({
  customerName: "Test Customer",
  customerEmail: "customer@example.test",
  shippingCountry: "Zimbabwe",
  shippingCity: "Harare",
  shippingAddress: "Local test address",
  paymentMethod: "manual_assisted" as const,
  items: [{ productId: 1, quantity: 2 }],
  requestToken: crypto.randomBytes(32).toString("hex"),
});
let original: number;
beforeEach(() => {
  original = shopSeedProducts[0].stock_qty;
  shopSeedProducts[0].stock_qty = 3;
  vi.clearAllMocks();
});
afterEach(() => {
  shopSeedProducts[0].stock_qty = original;
});
describe("checkout reliability", () => {
  it("rejects an oversized basket before walking any item fields", () => {
    let visited = 0;
    const item = {
      get productId() {
        visited++;
        return -1;
      },
      quantity: 0,
    };
    const result = shopOrderRequestSchema.safeParse({
      ...payload(),
      items: Array(201).fill(item),
    });
    expect(result.success).toBe(false);
    expect(visited).toBe(0);
    if (!result.success)
      expect(result.error.issues).toMatchObject([
        { code: "too_big", path: ["items"] },
      ]);
  });
  it("refuses ephemeral production orders even if memory fallback was enabled", async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(createShopOrder(payload())).rejects.toMatchObject({
        status: 503,
      });
    } finally {
      process.env.NODE_ENV = before;
    }
  });
  it("rejects duplicate product rows, malformed identity and unsafe quantities", () => {
    const valid = payload();
    expect(shopOrderRequestSchema.safeParse(valid).success).toBe(true);
    for (const change of [
      { items: [...valid.items, ...valid.items] },
      { customerName: " " },
      { customerEmail: "invalid" },
      { shippingAddress: "  " },
      { items: [{ productId: 1, quantity: 0 }] },
      { items: [{ productId: 1, quantity: 0.5 }] },
      { items: [{ productId: 1, quantity: 2 ** 40 }] },
      { requestToken: "guessable" },
    ])
      expect(
        shopOrderRequestSchema.safeParse({ ...valid, ...change }).success
      ).toBe(false);
  });
  it("prices on the server, handles shipping thresholds and keeps requests unpaid", async () => {
    const order = await createShopOrder({
      ...payload(),
      subtotalCents: 1,
    } as any);
    expect(order.subtotalCents).toBe(shopSeedProducts[0].price_cents * 2);
    expect(order.totalCents).toBe(order.subtotalCents + order.shippingCents);
    expect(order.status).toBe("awaiting_payment");
    expect(shopSeedProducts[0].stock_qty).toBe(3);
    expect(calculateShopShippingCents(7499, "normal")).toBe(1200);
    expect(calculateShopShippingCents(7500, "normal")).toBe(0);
    expect(calculateShopShippingCents(7500, "express")).toBe(800);
    expect(calculateShopShippingCents(0, "express")).toBe(0);
    await expect(
      confirmShopOrderPayment(order.orderRef, "fake-payment", order.manageToken)
    ).rejects.toThrow("cannot be auto-confirmed");
    expect(await getShopOrderByRef(order.orderRef, "wrong-token")).toBeNull();
  });
  it("replays lost responses, rejects changed details under the same grant and conceals the bearer in references", async () => {
    const input = payload();
    const [first, second] = await Promise.all([
      createShopOrder(input),
      createShopOrder(input),
    ]);
    expect(second.orderRef).toBe(first.orderRef);
    expect(second.manageToken).toBe(input.requestToken);
    expect(first.orderRef).not.toContain(input.requestToken);
    await expect(
      createShopOrder({ ...input, shippingCity: "Bulawayo" })
    ).rejects.toThrow("different order details");
    expect(
      (await getShopOrderByRef(first.orderRef, first.manageToken))?.items
    ).toHaveLength(1);
  });
  it("checks stock, converts supported catalogue currencies and refuses overflowing totals", async () => {
    await expect(
      createShopOrder({ ...payload(), items: [{ productId: 1, quantity: 4 }] })
    ).rejects.toThrow("Insufficient stock");
    const currency = shopSeedProducts[0].currency,
      price = shopSeedProducts[0].price_cents;
    try {
      shopSeedProducts[0].currency = "USD";
      shopSeedProducts[0].price_cents = 11208;
      expect((await createShopOrder(payload())).subtotalCents).toBe(20000);
      shopSeedProducts[0].currency = "EUR";
      shopSeedProducts[0].price_cents = 2_147_483_647;
      await expect(createShopOrder(payload())).rejects.toThrow("too large");
    } finally {
      shopSeedProducts[0].currency = currency;
      shopSeedProducts[0].price_cents = price;
    }
  });
  it("defers email to the durable worker and escapes receipt content", async () => {
    const service = new ShopService();
    const input = {
      ...payload(),
      customerName: "<img src=x onerror=alert(1)>",
    };
    const first = await service.createOrder(input);
    await service.createOrder(input);
    expect(sendEmailMessageSafe).not.toHaveBeenCalled();
    const row = {
      order_ref: first.order.orderRef,
      total_cents: first.order.totalCents,
      currency: first.order.currency,
      language: "en",
      event_key: "request_received:operator",
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      shipping_address: input.shippingAddress,
      shipping_city: input.shippingCity,
      shipping_country: input.shippingCountry,
    };
    const merchant = renderOrderEmail(
      row,
      "shop@example.test",
      "",
      "merchant@example.test"
    );
    expect(merchant.text).toContain(first.order.orderRef);
    expect(merchant.html).not.toContain("<img");
    expect(merchant.html).toContain("&lt;img");
    expect(merchant.text).not.toContain(input.requestToken);
  });
  it("keeps a saved request retrievable when email delivery fails", async () => {
    vi.mocked(sendEmailMessageSafe).mockRejectedValueOnce(
      new Error("Mock email outage")
    );
    const { order } = await new ShopService().createOrder(payload());
    expect(sendEmailMessageSafe).not.toHaveBeenCalled();
    expect(
      await getShopOrderByRef(order.orderRef, order.manageToken)
    ).not.toBeNull();
  });
  it("uses catalogue content for restock emails and rejects unknown products", async () => {
    const service = new ShopService();
    const product = shopSeedProducts[0];
    await service.createRestockNotification({
      productId: product.id,
      productSlug: product.slug,
      productName: "Untrusted promotional message",
      email: "restock@example.test",
    });
    expect(vi.mocked(sendEmailMessageSafe).mock.calls[0][0].text).toContain(
      product.name
    );
    expect(vi.mocked(sendEmailMessageSafe).mock.calls[0][0].text).not.toContain(
      "Untrusted"
    );
    await expect(
      service.createRestockNotification({
        productSlug: "unknown",
        productName: "fake",
        email: "restock@example.test",
      })
    ).rejects.toThrow("Product not found");
  });
  it("does not report a saved restock request as failed during an email outage", async () => {
    vi.mocked(sendEmailMessageSafe).mockRejectedValueOnce(
      new Error("Local provider outage")
    );
    const product = shopSeedProducts[0];
    const result = await new ShopService().createRestockNotification({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      email: "outage@example.test",
    });
    expect(result.created).toBe(true);
    expect(result.record.product_slug).toBe(product.slug);
  });
  it("does not expose database or provider internals in public error responses", async () => {
    const createOrder = vi
      .fn()
      .mockRejectedValue(
        new Error("SELECT customer_email FROM private_schema: driver failure")
      );
    const controller = new ShopController({
      createOrder,
    } as unknown as ShopService);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await controller.createOrder({ body: payload() } as any, response as any);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      "private_schema"
    );
    expect(JSON.stringify(response.json.mock.calls)).toContain(
      "Unable to create order."
    );
  });
  it("cannot mark a legacy simulated order paid in production", async () => {
    const order = await createShopOrder({
      ...payload(),
      paymentMethod: "dummy_gateway",
    });
    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(
        confirmShopOrderPayment(order.orderRef, "FAKE", order.manageToken)
      ).rejects.toMatchObject({ status: 403 });
      expect(
        (await getShopOrderByRef(order.orderRef, order.manageToken))?.status
      ).toBe("awaiting_payment");
      expect(shopSeedProducts[0].stock_qty).toBe(3);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rate-limits public checkout attempts before they can create records or send email", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/shop", createShopModuleRouter());
    const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    try {
      const address = server.address() as { port: number };
      for (let i = 0; i < 11; i++) {
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/shop/orders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }
        );
        expect(response.status).toBe(i < 10 ? 400 : 429);
        await response.json();
      }
      expect(sendEmailMessageSafe).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      );
    }
  });
});

it.each([
  ["de", "Bestellanfrage"],
  ["sn", "Chikumbiro cheodha"],
  ["nd", "Isicelo se-oda"],
])(
  "uses %s for customer receipts without changing order amounts",
  async (language, label) => {
    const { order } = await new ShopService().createOrder({
      ...payload(),
      language,
    });
    const receipt = renderOrderEmail(
      {
        order_ref: order.orderRef,
        total_cents: order.totalCents,
        currency: order.currency,
        language,
        event_key: "request_received",
        customer_email: "customer@example.test",
      },
      "shop@example.test"
    );
    expect(receipt.subject).toContain(label);
    expect(receipt.text).toContain(order.orderRef);
    expect(receipt.text).toContain((order.totalCents / 100).toFixed(2));
    expect(receipt.text).not.toContain("Your order request is saved");
    expect(order.status).toBe("awaiting_payment");
  }
);
