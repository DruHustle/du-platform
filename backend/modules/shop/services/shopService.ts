import { getNotifyAlertEmails, getNotifyFromEmail, sendEmailMessageSafe } from "../../../shared/email";
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
    const result = await this.restocks.create({
      productId:
        payload.productId == null || !Number.isFinite(Number(payload.productId))
          ? null
          : Math.max(1, Math.floor(Number(payload.productId))),
      productSlug: String(payload.productSlug ?? "").trim(),
      productName: String(payload.productName ?? "").trim(),
      email: String(payload.email ?? "").trim().toLowerCase(),
    });

    if (result.created) {
      const fromEmail = await getNotifyFromEmail();
      const userSubject = `Notify request received: ${payload.productName}`;
      const userHtml = `<p>Hello,</p>
<p>Your notify request for <strong>${payload.productName}</strong> has been saved.</p>
<p>We will email you when stock is available.</p>`;
      const userText = `Your notify request for ${payload.productName} has been saved. We will email you when stock is available.`;
      await sendEmailMessageSafe(
        { to: payload.email, subject: userSubject, html: userHtml, text: userText, from: fromEmail },
        "shop-restock-notifications:user-confirmation"
      );

      const alertEmails = await getNotifyAlertEmails();
      if (alertEmails.length > 0) {
        const adminSubject = `New shop notify request: ${payload.productName}`;
        const adminHtml = `<p><strong>New shop restock notify request</strong></p>
<p>Product: ${payload.productName}</p>
<p>Slug: ${payload.productSlug}</p>
<p>Subscriber email: ${payload.email}</p>`;
        const adminText = `New shop restock notify request. Product: ${payload.productName}. Slug: ${payload.productSlug}. Subscriber email: ${payload.email}.`;
        await sendEmailMessageSafe(
          { to: alertEmails, subject: adminSubject, html: adminHtml, text: adminText, from: fromEmail },
          "shop-restock-notifications:admin-alert"
        );
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
  }) {
    return { order: await this.orders.create(payload) };
  }

  async getOrder(orderRef: string, manageToken: string) {
    const order = await this.orders.findByRef(orderRef, manageToken);
    if (!order) throw new ShopServiceError("NOT_FOUND", 404, "Order not found.");
    return { order };
  }

  async confirmPayment(orderRef: string, paymentReference: string, manageToken: string) {
    const order = await this.payments.confirm(orderRef, paymentReference, manageToken);
    if (!order) throw new ShopServiceError("NOT_FOUND", 404, "Order not found.");
    return { order };
  }
}
