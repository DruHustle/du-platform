import { rateLimiter } from "../../../core/rateLimiter";
import { Router } from "express";
import { ShopController } from "../controllers/shopController";
import {
  validateCreateOrder,
  validateProductQuery,
  validateRestockNotification,
} from "../validators";

export function createShopModuleRouter() {
  const router = Router();
  const controller = new ShopController();

  router.get("/products", validateProductQuery, controller.listProducts);
  router.post(
    "/restock-notifications",
    rateLimiter({
      keyPrefix: "api:shop:restock",
      windowMs: 60_000,
      maxRequests: 10,
    }),
    validateRestockNotification,
    controller.createRestockNotification
  );
  router.use("/orders", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.post(
    "/orders",
    rateLimiter({
      keyPrefix: "api:shop:orders",
      windowMs: 60_000,
      maxRequests: 10,
    }),
    validateCreateOrder,
    controller.createOrder
  );
  router.get("/orders/:orderRef", controller.getOrder);
  router.post(
    "/orders/:orderRef/confirm-payment",
    rateLimiter({
      keyPrefix: "api:shop:payment",
      windowMs: 60_000,
      maxRequests: 20,
    }),
    controller.confirmPayment
  );

  return router;
}
