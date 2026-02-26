import { ProductRepository } from '../repositories/productRepository';
import { OrderRepository } from '../repositories/orderRepository';
import { InventoryRepository } from '../repositories/inventoryRepository';
import { PaymentRepository } from '../repositories/paymentRepository';
import { ShippingRepository } from '../repositories/shippingRepository';

export class ShopService {
  constructor(
    private readonly products = new ProductRepository(),
    private readonly orders = new OrderRepository(),
    private readonly inventory = new InventoryRepository(),
    private readonly payments = new PaymentRepository(),
    private readonly shipping = new ShippingRepository()
  ) {}

  listProducts(category?: string) {
    return this.products.list(category);
  }

  async createOrder(userId: number, payload: {
    items: Array<{ slug: string; quantity: number }>;
    customer: { fullName: string; email: string; phone: string };
    shippingAddress: string;
  }) {
    await this.inventory.reserve(payload.items);
    const shippingQuote = await this.shipping.quote(payload.shippingAddress);

    const order = await this.orders.create({
      ...payload,
      userId,
      shippingFee: shippingQuote.feeUsd,
    } as any);

    return {
      order,
      shippingQuote,
    };
  }

  getOrder(orderRef: string) {
    return this.orders.findByRef(orderRef);
  }

  confirmPayment(orderRef: string, paymentReference: string) {
    return this.payments.confirm(orderRef, paymentReference);
  }
}
