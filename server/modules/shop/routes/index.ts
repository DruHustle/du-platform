import { Router } from 'express';
import { ShopController } from '../controllers/shopController';
import { validateCreateOrder, validateProductQuery } from '../validators';

export function createShopModuleRouter() {
  const router = Router();
  const controller = new ShopController();

  router.get('/products', validateProductQuery, controller.listProducts);
  router.post('/orders', validateCreateOrder, controller.createOrder);
  router.get('/orders/:orderRef', controller.getOrder);
  router.post('/orders/:orderRef/confirm-payment', controller.confirmPayment);

  return router;
}
