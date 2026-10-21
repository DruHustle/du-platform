import {
  getNotifyAlertEmails,
  getNotifyFromEmail,
  sendEmailMessageSafe,
} from "../../../shared/email";

function escHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escSubject(str: string): string {
  return String(str ?? "")
    .replace(/[\r\n]/g, " ")
    .trim();
}
import { OrderRepository } from "../repositories/orderRepository";
import { PaymentRepository } from "../repositories/paymentRepository";
import { ProductRepository } from "../repositories/productRepository";
import { RestockRepository } from "../repositories/restockRepository";

export class ShopServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ShopServiceError";
  }
}

export class ShopService {
  constructor(
    private readonly products = new ProductRepository(),
    private readonly orders = new OrderRepository(),
    private readonly payments = new PaymentRepository(),
    private readonly restocks = new RestockRepository()
  ) {}

  async listProducts(category?: string) {
    const result = await this.products.list(category);
    return {
      count: result.products.length,
      products: result.products,
      source: result.source,
      cached: result.cached,
    };
  }

  async createRestockNotification(payload: {
    productId?: number | null;
    productSlug: string;
    productName: string;
    email: string;
  }) {
    const { products } = await this.products.list();
    const product = products.find(
      product =>
        product.slug === payload.productSlug &&
        (payload.productId == null || product.id === payload.productId)
    );
    if (!product)
      throw new ShopServiceError("NOT_FOUND", 404, "Product not found.");
    // Email content and product identity come from the catalogue, not public input.
    payload = {
      ...payload,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      email: payload.email.trim().toLowerCase(),
    };
    const result = await this.restocks.create({
      productId:
        payload.productId == null || !Number.isFinite(Number(payload.productId))
          ? null
          : Math.max(1, Math.floor(Number(payload.productId))),
      productSlug: String(payload.productSlug ?? "").trim(),
      productName: String(payload.productName ?? "").trim(),
      email: String(payload.email ?? "")
        .trim()
        .toLowerCase(),
    });

    if (result.created) {
      try {
        const fromEmail = await getNotifyFromEmail();
        const safeName = escHtml(payload.productName);
        const safeSlug = escHtml(payload.productSlug);
        const safeEmail = escHtml(payload.email);
        const userSubject = escSubject(
          `Notify request received: ${payload.productName}`
        );
        const userHtml = `<p>Hello,</p>
<p>Your notify request for <strong>${safeName}</strong> has been saved.</p>
<p>We will email you when stock is available.</p>`;
        const userText = `Your notify request for ${payload.productName} has been saved. We will email you when stock is available.`;
        await sendEmailMessageSafe(
          {
            to: payload.email,
            subject: userSubject,
            html: userHtml,
            text: userText,
            from: fromEmail,
          },
          "shop-restock-notifications:user-confirmation"
        );

        const alertEmails = await getNotifyAlertEmails();
        if (alertEmails.length > 0) {
          const adminSubject = escSubject(
            `New shop notify request: ${payload.productName}`
          );
          const adminHtml = `<p><strong>New shop restock notify request</strong></p>
<p>Product: ${safeName}</p>
<p>Slug: ${safeSlug}</p>
<p>Subscriber email: ${safeEmail}</p>`;
          const adminText = `New shop restock notify request. Product: ${payload.productName}. Slug: ${payload.productSlug}. Subscriber email: ${payload.email}.`;
          await sendEmailMessageSafe(
            {
              to: alertEmails,
              subject: adminSubject,
              html: adminHtml,
              text: adminText,
              from: fromEmail,
            },
            "shop-restock-notifications:admin-alert"
          );
        }
      } catch {
        console.error("[shop-restock] Saved request; notification failed", {
          productSlug: payload.productSlug,
        });
      }
    }

    return {
      created: result.created,
      message: result.created
        ? "Notify request saved. We will email you when stock is available."
        : "You are already subscribed for this product.",
      record: result.record,
    };
  }

  async createOrder(payload: {
    customerName: string;
    customerEmail: string;
    shippingCountry: string;
    shippingCity: string;
    shippingAddress: string;
    deliverySpeed?: "normal" | "express";
    paymentMethod: "manual_assisted" | "dummy_gateway";
    items: Array<{ productId: number; quantity: number }>;
    requestToken?: string;
  }) {
    const order = await this.orders.create(payload);
    if (!("replayed" in order && order.replayed)) {
      // Persistence is the source of truth. A mail outage must not turn a saved
      // request into an apparent checkout failure and encourage duplicate orders.
      try {
        const from = await getNotifyFromEmail();
        const summary = [
          `Order request: ${order.orderRef}`,
          ...order.items.map(
            item =>
              `${item.productName} x${item.quantity}: ${(item.lineTotalCents / 100).toFixed(2)} ${order.currency}`
          ),
          `Estimated delivery: ${(order.shippingCents / 100).toFixed(2)} ${order.currency}`,
          `Estimated total: ${(order.totalCents / 100).toFixed(2)} ${order.currency}`,
          "Request received. No payment has been taken. Availability, delivery and payment instructions must be agreed with the shop.",
          "Contact: info@diasporaunlocked.com",
        ].join("\n");
        const notifications = await Promise.allSettled([
          sendEmailMessageSafe(
            {
              to: payload.customerEmail,
              from,
              subject: `Order request received: ${order.orderRef}`,
              text: summary,
              html: `<p>${escHtml(summary).replace(/\n/g, "<br>")}</p>`,
            },
            "shop-order:customer-receipt"
          ),
          (async () => {
            const recipients = await getNotifyAlertEmails();
            if (!recipients.length) return true;
            const details = `${summary}\n\nCustomer: ${payload.customerName} (${payload.customerEmail})\nDelivery request: ${payload.shippingAddress}, ${payload.shippingCity}, ${payload.shippingCountry}\nPreference: ${order.deliverySpeed}`;
            return sendEmailMessageSafe(
              {
                to: recipients,
                from,
                subject: `New shop order request: ${order.orderRef}`,
                text: details,
                html: `<p>${escHtml(details).replace(/\n/g, "<br>")}</p>`,
              },
              "shop-order:merchant-alert"
            );
          })(),
        ]);
        if (
          notifications.some(
            result => result.status === "rejected" || result.value === false
          )
        ) {
          console.error("[shop-order] Saved order; notification failed", {
            orderRef: order.orderRef,
          });
        }
      } catch (error) {
        console.error("[shop-order] Saved order; notification failed", {
          orderRef: order.orderRef,
        });
      }
    }
    return { order };
  }

  async getOrder(orderRef: string, manageToken: string) {
    const order = await this.orders.findByRef(orderRef, manageToken);
    if (!order)
      throw new ShopServiceError("NOT_FOUND", 404, "Order not found.");
    return { order };
  }

  async confirmPayment(
    orderRef: string,
    paymentReference: string,
    manageToken: string
  ) {
    const order = await this.payments.confirm(
      orderRef,
      paymentReference,
      manageToken
    );
    if (!order)
      throw new ShopServiceError("NOT_FOUND", 404, "Order not found.");
    return { order };
  }
}
