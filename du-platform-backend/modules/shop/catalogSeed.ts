import type mysql from "mysql2/promise";
import { SHOP_SEED_PRODUCTS } from "../../../shared/shopCatalog";
import { LEGACY_SHOP_PRICES } from "./legacySeedPrices";

/** Seed each SKU once. The history survives deletion, so owner edits and
 * removals remain authoritative across restarts and future deployments. */
export async function synchronizeShopCatalog(pool: mysql.Pool): Promise<void> {
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_catalog_seed_history (
    slug VARCHAR(160) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const product of SHOP_SEED_PRODUCTS) {
      const [history] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT slug FROM shop_catalog_seed_history WHERE slug = ?",
        [product.slug]
      );
      if (history.length) continue;
      await connection.execute(
        `INSERT IGNORE INTO shop_products
        (slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.slug,
          product.name,
          product.category,
          product.description,
          product.image_url,
          product.price_cents,
          product.currency,
          product.stock_qty,
          product.is_active,
        ]
      );
      // Correct only unchanged legacy EUR defaults. Never replace owner prices,
      // visibility, stock, images, descriptions or names with repository values.
      await connection.execute(
        `UPDATE shop_products SET price_cents = ?
        WHERE slug = ? AND price_cents = ? AND currency = 'EUR'`,
        [
          product.price_cents,
          product.slug,
          LEGACY_SHOP_PRICES[product.slug] ?? product.price_cents,
        ]
      );
      await connection.execute(
        "INSERT INTO shop_catalog_seed_history (slug) VALUES (?)",
        [product.slug]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
