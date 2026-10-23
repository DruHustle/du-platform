import type { Pool } from "mysql2/promise";

// Additive tables leave catalogue edits and legacy receipts untouched. The
// database-wide startup lock in db.ts serialises these restart-safe changes.
export async function initializeShopPilot(pool: Pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_order_workflows (
    order_id INT PRIMARY KEY, stage VARCHAR(32) NOT NULL DEFAULT 'request_received',
    version INT NOT NULL DEFAULT 0, quote_version INT NOT NULL DEFAULT 0,
    assigned_to VARCHAR(254) NOT NULL DEFAULT '', inventory_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    payment_reference VARCHAR(255) NOT NULL DEFAULT '', carrier VARCHAR(120) NOT NULL DEFAULT '',
    tracking VARCHAR(255) NOT NULL DEFAULT '', refund_cents INT NOT NULL DEFAULT 0,
    refund_reference VARCHAR(255) NOT NULL DEFAULT '', language VARCHAR(5) NOT NULL DEFAULT 'en',
    postal_code VARCHAR(30) NOT NULL DEFAULT '', access_grant TEXT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  try {
    await pool.execute(
      "ALTER TABLE shop_order_workflows ADD COLUMN access_grant TEXT NULL"
    );
  } catch (err: any) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  for (const definition of [
    "analytics_consent BOOLEAN NOT NULL DEFAULT FALSE",
    "customer_notes TEXT NULL",
  ]) {
    try {
      await pool.execute(
        `ALTER TABLE shop_order_workflows ADD COLUMN ${definition}`
      );
    } catch (err: any) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS shop_funnel_daily (day DATE NOT NULL,event VARCHAR(30) NOT NULL,count BIGINT UNSIGNED NOT NULL DEFAULT 0,PRIMARY KEY(day,event))`
  );
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS research_profiles (kind VARCHAR(20) NOT NULL,subject_key VARCHAR(160) NOT NULL,details LONGTEXT NOT NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(kind,subject_key))`
  );
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, version INT NOT NULL,
    currency VARCHAR(3) NOT NULL, items LONGTEXT NOT NULL, shipping_cents INT NOT NULL,
    total_cents INT NOT NULL, valid_until DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY quote_version (order_id, version), FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_order_events (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, request_id VARCHAR(80) NOT NULL,
    action VARCHAR(40) NOT NULL, actor VARCHAR(254) NOT NULL, note TEXT NOT NULL,
    public_message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY order_command (order_id, request_id), FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_order_refunds (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, command_id VARCHAR(80) NOT NULL,
    amount_cents INT NOT NULL, currency VARCHAR(3) NOT NULL,
    external_reference VARCHAR(255) NOT NULL, reference_provider VARCHAR(80) NOT NULL,
    reference_hash CHAR(64) NOT NULL, actor VARCHAR(254) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY refund_command (order_id,command_id),
    UNIQUE KEY refund_reference (order_id,reference_provider,reference_hash),
    FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  // An aggregate is not evidence of individual refunds. Preserve the original
  // last-known reference separately; never manufacture historical ledger rows.
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_refund_legacy_balances (
    order_id INT PRIMARY KEY, amount_cents INT NOT NULL, currency VARCHAR(3) NOT NULL,
    last_known_reference VARCHAR(255) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  await pool.execute(`INSERT IGNORE INTO shop_refund_legacy_balances
    (order_id,amount_cents,currency,last_known_reference)
    SELECT w.order_id,w.refund_cents-COALESCE(r.total,0),COALESCE(q.currency,o.currency),w.refund_reference
    FROM shop_order_workflows w JOIN shop_orders o ON o.id=w.order_id
    LEFT JOIN shop_quotes q ON q.order_id=w.order_id AND q.version=w.quote_version
    LEFT JOIN (SELECT order_id,SUM(amount_cents) AS total FROM shop_order_refunds GROUP BY order_id) r ON r.order_id=w.order_id
    WHERE w.refund_cents>COALESCE(r.total,0)`);
  try {
    await pool.execute(
      "ALTER TABLE shop_order_events ADD COLUMN request_hash CHAR(64) NOT NULL DEFAULT ''"
    );
  } catch (err: any) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_order_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, event_key VARCHAR(120) NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en', event_data LONGTEXT NULL, payload LONGTEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0, available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at DATETIME NULL, first_attempt_at DATETIME NULL, accepted_at DATETIME NULL,
    provider_id VARCHAR(255) NULL, error_message VARCHAR(255) NULL,
    UNIQUE KEY order_notification (order_id, event_key),
    FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
  for (const column of ["event_data", "payload"]) {
    try {
      await pool.execute(
        `ALTER TABLE shop_order_notifications ADD COLUMN ${column} LONGTEXT NULL`
      );
    } catch (err: any) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }
  try {
    await pool.execute(
      "ALTER TABLE shop_order_notifications ADD COLUMN manual_retry BOOLEAN NOT NULL DEFAULT FALSE"
    );
  } catch (err: any) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_product_details (
    product_id INT PRIMARY KEY, details LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE)`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS shop_order_snapshots (
    order_id INT PRIMARY KEY, items LONGTEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE)`);
}
