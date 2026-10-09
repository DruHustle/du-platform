import { Router } from 'express';
import { ShopController } from '../controllers/shopController';
import {
  validateCreateOrder,
  validateProductQuery,
  validateRestockNotification,
} from '../validators';

export function createShopModuleRouter() {
  const router = Router();
  const controller = new ShopController();

  router.get('/products', validateProductQuery, controller.listProducts);
  router.post('/restock-notifications', validateRestockNotification, controller.createRestockNotification);
  router.use('/orders', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.post('/orders', validateCreateOrder, controller.createOrder);
  router.get('/orders/:orderRef', controller.getOrder);
  router.post('/orders/:orderRef/confirm-payment', controller.confirmPayment);

  return router;
}
