import { Router } from "express";
import { db } from "../../lib/databaseRuntime";
import { productDetailsSchema } from "../../contracts/productDetails";
import { ShopRequestError } from "../../lib/persistence/shopStore";
import { orderApiError } from "./orderAdminRoutes";
import { ok } from "../../lib/responseFormatter";
import { readPublishedProductDetails } from "./productDetailsStore";
export function createProductDetailsRouter(admin = false) {
  const r = Router();
  r.get("/:id/details", async (req, res) => {
    try {
      if (!admin) {
        const published = await readPublishedProductDetails(
          Number(req.params.id)
        );
        if (!published) throw new ShopRequestError("Product not found.", 404);
        return res.json(ok(published));
      }
      if (!db) throw new ShopRequestError("Product details unavailable.", 503);
      const [rows] = await db.query<any[]>(
        "SELECT d.details,d.updated_at FROM shop_products p LEFT JOIN shop_product_details d ON d.product_id=p.id WHERE p.id=?",
        [req.params.id]
      );
      if (!rows[0]) throw new ShopRequestError("Product not found.", 404);
      res.json(
        ok({
          details: rows[0].details
            ? JSON.parse(rows[0].details)
            : productDetailsSchema.parse({}),
          updatedAt: rows[0].updated_at,
        })
      );
    } catch (e) {
      orderApiError(res, e);
    }
  });
  if (admin)
    r.put("/:id/details", async (req, res) => {
      try {
        const details = productDetailsSchema.parse(req.body);
        if (!db) throw new ShopRequestError("Database unavailable.", 503);
        const [products] = await db.query<any[]>(
          "SELECT id FROM shop_products WHERE id=?",
          [req.params.id]
        );
        if (!products.length)
          throw new ShopRequestError("Product not found.", 404);
        await db.execute(
          "INSERT INTO shop_product_details (product_id,details) VALUES (?,?) ON DUPLICATE KEY UPDATE details=VALUES(details)",
          [req.params.id, JSON.stringify(details)]
        );
        res.json(ok({ details }));
      } catch (e) {
        orderApiError(res, e);
      }
    });
  return r;
}
