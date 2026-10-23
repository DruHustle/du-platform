import { db } from "../../shared/databaseRuntime";
import { productDetailsSchema } from "../../../shared/productDetails";
import { ShopRequestError } from "../../shared/persistence/shopStore";

// This capability exposes only owner-published product information. It accepts a
// catalogue ID, never SQL or a model-selected URL, and has no write operations.
export async function readPublishedProductDetails(productId: number) {
  if (!Number.isSafeInteger(productId) || productId < 1) return null;
  if (!db) throw new ShopRequestError("Product details unavailable.", 503);
  const [rows] = await db.query<any[]>(
    "SELECT d.details,d.updated_at FROM shop_products p LEFT JOIN shop_product_details d ON d.product_id=p.id WHERE p.id=? AND p.is_active=1",
    [productId]
  );
  if (!rows[0]) return null;
  return {
    details: productDetailsSchema.parse(
      rows[0].details ? JSON.parse(rows[0].details) : {}
    ),
    updatedAt: rows[0].updated_at,
  };
}
