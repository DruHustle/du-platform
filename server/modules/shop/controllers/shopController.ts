import type express from 'express';
import { ShopService } from '../services/shopService';
import { ok, error } from '../../../shared/responseFormatter';

export class ShopController {
  constructor(private readonly service = new ShopService()) {}

  listProducts = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.listProducts(String(req.query.category ?? ''));
      return res.json(ok(data));
    } catch (err) {
      return res.status(500).json(error('SHOP_PRODUCTS_FAILED', err instanceof Error ? err.message : 'Unable to load products.'));
    }
  };

  createOrder = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0) || 1;
    try {
      const data = await this.service.createOrder(userId, req.body);
      return res.status(201).json(ok(data));
    } catch (err) {
      return res.status(400).json(error('SHOP_ORDER_FAILED', err instanceof Error ? err.message : 'Unable to create order.'));
    }
  };

  getOrder = async (req: express.Request, res: express.Response) => {
    const order = await this.service.getOrder(String(req.params.orderRef));
    if (!order) return res.status(404).json(error('NOT_FOUND', 'Order not found.'));
    return res.json(ok(order));
  };

  confirmPayment = async (req: express.Request, res: express.Response) => {
    try {
      const order = await this.service.confirmPayment(String(req.params.orderRef), String(req.body.paymentReference ?? ''));
      return res.json(ok(order));
    } catch (err) {
      return res.status(400).json(error('SHOP_PAYMENT_CONFIRM_FAILED', err instanceof Error ? err.message : 'Unable to confirm payment.'));
    }
  };
}
