import { publicShopReadiness } from "../shopReadiness";
import { SHOP_PRICING_REVISION, SHOP_RATES_PER_EUR, type ShopCurrency } from "../../../domain/shopCurrency";
import { SHOP_SHIPPING_POLICY } from "../../../domain/shopCheckout";
import { SHOP_SEED_PRODUCTS } from "../../../domain/shopCatalog";
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
    const seedDescriptions = new Map(SHOP_SEED_PRODUCTS.map(product => [product.slug, product.description]));
    return {
      readiness: await publicShopReadiness(),
      pricing: { revision: SHOP_PRICING_REVISION, ratesPerEur: SHOP_RATES_PER_EUR, shipping: SHOP_SHIPPING_POLICY },
      count: result.products.length,
      products: result.products.map(product => ({
        ...product,
        image_api_url: /^\/images\/pages\/shop\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(product.image_url)
          ? `/api/shop/assets/${product.image_url.split("/").at(-1)}`
          : null,
        translation_key: seedDescriptions.get(product.slug) === product.description
          ? `shop.products.descriptions.${product.slug}`
          : null,
      })),
      source: result.source,
      cached: result.cached,
    };
  }

  async createRestockNotification(payload: {
    language?: string;
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
    await this.restocks.create({
      language: payload.language,
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

    return {
      requiresConfirmation: true,
      message:
        "If confirmation is needed, an email link will be sent. No order or payment is created.",
    };
  }

  async createOrder(payload: {
    language?: string;
    currency?: ShopCurrency;
    pricingRevision?: string;
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
