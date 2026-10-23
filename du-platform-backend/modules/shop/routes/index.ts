import { z } from "zod";
import { db } from "../../../shared/databaseRuntime";
import { recordShopFunnel } from "../funnel";
import { sha256 } from "../../../shared/persistence/authStore";
import { createProductDetailsRouter } from "../productDetailsRoutes";
import { applyOrderCommand, readOrderWorkspace } from "../orderWorkflowStore";
import { orderApiError } from "../orderAdminRoutes";
import { ok } from "../../../shared/responseFormatter";
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

  router.use("/products", createProductDetailsRouter());
  router.post(
    "/funnel",
    rateLimiter({ keyPrefix: "shop:funnel", windowMs: 60000, maxRequests: 60 }),
    async (req, res) => {
      const input = z
        .object({
          event: z.enum(["product_discovery", "basket_add"]),
          consent: z.literal(true),
        })
        .strict()
        .safeParse(req.body);
      if (!input.success) return res.sendStatus(400);
      try {
        if (db) await recordShopFunnel(db, input.data.event);
        res.sendStatus(204);
      } catch {
        res.sendStatus(503);
      }
    }
  );
  router.post("/orders/:orderRef/analytics-consent", async (req, res) => {
    try {
      if (req.body?.consent !== false || !db) return res.sendStatus(400);
      const [result] = await db.execute<any>(
        "UPDATE shop_order_workflows w JOIN shop_orders o ON o.id=w.order_id SET w.analytics_consent=FALSE WHERE o.order_ref=? AND o.manage_token_hash=?",
        [
          req.params.orderRef,
          sha256(String(req.headers["x-order-access-token"] || "")),
        ]
      );
      res.sendStatus(result.affectedRows ? 204 : 404);
    } catch {
      res.sendStatus(503);
    }
  });
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
  router.get("/orders/:orderRef/workflow", async (req, res) => {
    try {
      res.json(
        ok(
          await readOrderWorkspace(
            req.params.orderRef,
            String(req.headers["x-order-access-token"] || "")
          )
        )
      );
    } catch (err) {
      orderApiError(res, err);
    }
  });
  router.post("/orders/:orderRef/accept-quote", async (req, res) => {
    try {
      res.json(
        ok(
          await applyOrderCommand(
            req.params.orderRef,
            { ...req.body, action: "quote_accepted" },
            "customer",
            String(req.headers["x-order-access-token"] || "")
          )
        )
      );
    } catch (err) {
      orderApiError(res, err);
    }
  });
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
