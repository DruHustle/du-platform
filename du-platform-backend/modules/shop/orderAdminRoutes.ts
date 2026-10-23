import crypto from "node:crypto";
import { Router } from "express";
import { ZodError } from "zod";
import {
  applyOrderCommand,
  listOrderWorkspace,
  readOrderWorkspace,
} from "./orderWorkflowStore";
import { ShopRequestError } from "../../shared/persistence/shopStore";
import { getAdminAuthUser } from "../../shared/admin";
import { db } from "../../shared/databaseRuntime";
import { ok, error } from "../../shared/responseFormatter";
export const orderApiError = (res: any, err: unknown) =>
  res
    .status(
      err instanceof ShopRequestError
        ? err.status
        : err instanceof ZodError
          ? 400
          : 503
    )
    .json(
      error(
        "ORDER_WORKFLOW_FAILED",
        err instanceof ShopRequestError
          ? err.message
          : err instanceof ZodError
            ? "Check the submitted fields."
            : "Order management is temporarily unavailable."
      )
    );
// Mounted only behind the existing JWT + verified allowlisted admin middleware.
export function createOrderAdminRouter() {
  const router = Router();
  router.get("/funnel", async (_req, res) => {
    try {
      if (!db) return res.sendStatus(503);
      const [rows] = await db.query(
        "SELECT day,event,count FROM shop_funnel_daily WHERE day>=DATE_SUB(UTC_DATE(),INTERVAL 30 DAY) ORDER BY day DESC,event"
      );
      res.json(ok({ rows }));
    } catch (err) {
      orderApiError(res, err);
    }
  });
  router.get("/", async (req, res) => {
    try {
      res.json(
        ok({
          orders: await listOrderWorkspace(
            String(req.query.q || ""),
            String(req.query.stage || "")
          ),
        })
      );
    } catch (err) {
      orderApiError(res, err);
    }
  });
  router.get("/:ref", async (req, res) => {
    try {
      res.json(ok(await readOrderWorkspace(req.params.ref)));
    } catch (err) {
      orderApiError(res, err);
    }
  });
  router.post("/:ref/commands", async (req, res) => {
    try {
      const actor = getAdminAuthUser(res);
      if (!actor) return res.sendStatus(401);
      res.json(
        ok(await applyOrderCommand(req.params.ref, req.body, actor.email))
      );
    } catch (err) {
      orderApiError(res, err);
    }
  });
  router.post("/:ref/notifications/:id/retry", async (req, res) => {
    try {
      if (!db) throw new ShopRequestError("Database unavailable.", 503);
      const actor = getAdminAuthUser(res);
      if (!actor) return res.sendStatus(401);
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute<any>(
          `UPDATE shop_order_notifications n JOIN shop_orders o ON o.id=n.order_id SET n.status='pending', n.manual_retry=TRUE, n.available_at=NOW(), n.error_message=NULL WHERE o.order_ref=? AND n.id=? AND n.status='failed' AND (n.first_attempt_at IS NULL OR n.first_attempt_at>DATE_SUB(NOW(), INTERVAL 23 HOUR))`,
          [req.params.ref, req.params.id]
        );
        if (!result.affectedRows)
          throw new ShopRequestError(
            "This notification cannot safely retry. Review provider acceptance or retry limits.",
            409
          );
        await connection.execute(
          "INSERT INTO shop_order_events (order_id,request_id,action,actor,note,public_message) SELECT id,?,'notification_retry',?,? ,'' FROM shop_orders WHERE order_ref=?",
          [
            crypto.randomUUID(),
            actor.email,
            `Notification ${req.params.id} authorised for a safe retry.`,
            req.params.ref,
          ]
        );
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
      res.json(ok({ retried: true }));
    } catch (err) {
      orderApiError(res, err);
    }
  });
  return router;
}
