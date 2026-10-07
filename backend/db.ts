import mysql from "mysql2/promise";
import { db, isMemoryFallbackEnabled } from "./shared/databaseRuntime";
import { ntirSeedEntities } from "./shared/persistence/investmentStore";
import { shopSeedProducts } from "./shared/persistence/shopStore";

async function syncNtirSeedData(): Promise<void> {
  if (!db) return;

  for (const entity of ntirSeedEntities) {
    await db.execute(
      `
      INSERT INTO ntir_entities (name, sector, location, verification_status)
      SELECT ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM ntir_entities WHERE LOWER(name) = LOWER(?) LIMIT 1
      )
      `,
      [entity.name, entity.sector, entity.location, entity.verification_status, entity.name]
    );
  }
}

async function syncAdminSettingsSeedData(): Promise<void> {
  if (!db) return;

  const envFromEmail = String(process.env.FROM_EMAIL ?? "").trim();
  const envAdminEmails = String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .join(", ");

  if (envFromEmail) {
    await db.execute(
      `
      INSERT INTO admin_settings (key_name, value_text)
      SELECT 'notify_from_email', ?
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_settings WHERE key_name = 'notify_from_email'
      )
      `,
      [envFromEmail]
    );
  }

  if (envAdminEmails) {
    await db.execute(
      `
      INSERT INTO admin_settings (key_name, value_text)
      SELECT 'notify_alert_emails', ?
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_settings WHERE key_name = 'notify_alert_emails'
      )
      `,
      [envAdminEmails]
    );
  }
}

const memoryEconomicStats = {
  remittances: 1500,
  gdp: 28000,
  diasporaPopulation: 3000000,
  exportValue: 4500,
  growthRate: 5.3,
};

const memoryEconomicSectorData: Array<{ name: string; growth: number }> = [
  { name: "Mining", growth: 8.2 },
  { name: "Agriculture", growth: 4.5 },
  { name: "Tourism", growth: 6.1 },
  { name: "Manufacturing", growth: 3.2 },
];

const memoryRemittanceImpact: Array<{ sector: string; percentage: number }> = [
  { sector: "Education", percentage: 35 },
  { sector: "Real Estate", percentage: 25 },
  { sector: "Healthcare", percentage: 20 },
  { sector: "Small Business", percentage: 20 },
];

function assertSafeSqlIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return identifier;
}

function formatIndexColumns(columns: string[]): string {
  return columns
    .map((column) => `\`${assertSafeSqlIdentifier(column)}\``)
    .join(", ");
}

async function ensureIndex(
  tableName: string,
  indexName: string,
  columns: string[],
  options?: { unique?: boolean }
): Promise<void> {
  if (!db) return;

  const safeTableName = assertSafeSqlIdentifier(tableName);
  const safeIndexName = assertSafeSqlIdentifier(indexName);
  const shouldBeUnique = options?.unique === true;
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `SHOW INDEX FROM \`${safeTableName}\` WHERE Key_name = ?`,
    [safeIndexName]
  );

  const existingColumns = rows
    .slice()
    .sort((left, right) => Number(left.Seq_in_index ?? 0) - Number(right.Seq_in_index ?? 0))
    .map((row) => String(row.Column_name ?? ""));
  const isUnique = rows.length > 0 && rows.every((row) => Number(row.Non_unique ?? 1) === 0);
  const matchesExistingShape =
    isUnique === shouldBeUnique &&
    existingColumns.length === columns.length &&
    existingColumns.every((column, index) => column === columns[index]);

  if (matchesExistingShape) return;

  if (rows.length > 0) {
    await db.execute(`ALTER TABLE \`${safeTableName}\` DROP INDEX \`${safeIndexName}\``);
  }

  await db.execute(
    `ALTER TABLE \`${safeTableName}\` ADD ${shouldBeUnique ? "UNIQUE " : ""}INDEX \`${safeIndexName}\` (${formatIndexColumns(columns)})`
  );
}

async function ensureUniqueIndex(tableName: string, indexName: string, columns: string[]): Promise<void> {
  return ensureIndex(tableName, indexName, columns, { unique: true });
}

async function ensureNonUniqueIndex(tableName: string, indexName: string, columns: string[]): Promise<void> {
  return ensureIndex(tableName, indexName, columns, { unique: false });
}

async function ensureForeignKey(options: {
  tableName: string;
  constraintName: string;
  columnName: string;
  referencedTableName: string;
  referencedColumnName: string;
  onDelete?: "RESTRICT" | "CASCADE" | "SET NULL" | "NO ACTION";
}): Promise<void> {
  if (!db) return;

  const safeTableName = assertSafeSqlIdentifier(options.tableName);
  const safeConstraintName = assertSafeSqlIdentifier(options.constraintName);
  const safeColumnName = assertSafeSqlIdentifier(options.columnName);
  const safeReferencedTableName = assertSafeSqlIdentifier(options.referencedTableName);
  const safeReferencedColumnName = assertSafeSqlIdentifier(options.referencedColumnName);
  const onDelete = options.onDelete ?? "RESTRICT";

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
    LIMIT 1
    `,
    [safeTableName, safeConstraintName]
  );

  if (rows[0]) return;

  await db.execute(
    `
    ALTER TABLE \`${safeTableName}\`
    ADD CONSTRAINT \`${safeConstraintName}\`
    FOREIGN KEY (\`${safeColumnName}\`)
    REFERENCES \`${safeReferencedTableName}\`(\`${safeReferencedColumnName}\`)
    ON DELETE ${onDelete}
    `
  );
}

async function withDatabaseInitializationLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!db) {
    return fn();
  }

  const connection = await db.getConnection();
  const lockName = "du_platform_initialize_database";
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT GET_LOCK(?, 60) AS acquired",
      [lockName]
    );
    const acquired = Number(rows[0]?.acquired ?? 0) === 1;
    if (!acquired) {
      throw new Error("Failed to acquire database initialization lock.");
    }

    return await fn();
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
    } catch {
      // Ignore unlock failures; the server is already moving out of init.
    } finally {
      connection.release();
    }
  }
}

async function syncShopProductsSeedData(): Promise<void> {
  if (!db) return;
  for (const product of shopSeedProducts) {
    await db.execute(
      `
      INSERT INTO shop_products (slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        description = VALUES(description),
        image_url = VALUES(image_url),
        price_cents = VALUES(price_cents),
        currency = VALUES(currency),
        is_active = VALUES(is_active),
        stock_qty = CASE
          WHEN shop_products.stock_qty <= 0 THEN VALUES(stock_qty)
          ELSE shop_products.stock_qty
        END
      `,
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
  }
}

async function syncEconomicStatsSeedData(): Promise<void> {
  if (!db) return;

  await db.execute(
    `
    INSERT INTO economic_stats (id, remittances, gdp, diaspora_population, export_value, growth_rate)
    SELECT 1, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM economic_stats WHERE id = 1
    )
    `,
    [
      memoryEconomicStats.remittances,
      memoryEconomicStats.gdp,
      memoryEconomicStats.diasporaPopulation,
      memoryEconomicStats.exportValue,
      memoryEconomicStats.growthRate,
    ]
  );

  for (const row of memoryEconomicSectorData) {
    await db.execute(
      `
      INSERT INTO economic_sector_data (name, growth)
      SELECT ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM economic_sector_data WHERE LOWER(name) = LOWER(?) LIMIT 1
      )
      `,
      [row.name, row.growth, row.name]
    );
  }

  for (const row of memoryRemittanceImpact) {
    await db.execute(
      `
      INSERT INTO remittance_impact (sector, percentage)
      SELECT ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM remittance_impact WHERE LOWER(sector) = LOWER(?) LIMIT 1
      )
      `,
      [row.sector, row.percentage, row.sector]
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  if (!db) {
    if (isMemoryFallbackEnabled()) return;
    throw new Error("Database connection is required in production, but no database configuration was found.");
  }

  const ensuredDb = db;
  await withDatabaseInitializationLock(async () => {
  const db = ensuredDb;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      kyc_verified TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute("ALTER TABLE users ADD COLUMN kyc_verified TINYINT(1) NOT NULL DEFAULT 0");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ntir_entities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sector VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'Verified',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      INDEX idx_auth_sessions_user_id (user_id),
      INDEX idx_auth_sessions_expires_at (expires_at),
      CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash CHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL,
      INDEX idx_password_reset_user_id (user_id),
      INDEX idx_password_reset_expires_at (expires_at),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS feature_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      feature VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_feature_notifications_feature_email (feature, email),
      INDEX idx_feature_notifications_user_id (user_id),
      CONSTRAINT fk_feature_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shop_restock_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NULL,
      product_slug VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_shop_restock_slug_email (product_slug, email),
      INDEX idx_shop_restock_slug (product_slug),
      INDEX idx_shop_restock_email (email)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS success_stories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(120) NOT NULL,
      image VARCHAR(500) NOT NULL,
      story TEXT NOT NULL,
      testimonial TEXT NOT NULL,
      author VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      revenue VARCHAR(120) NOT NULL,
      jobs VARCHAR(120) NOT NULL,
      markets VARCHAR(120) NOT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key_name VARCHAR(120) PRIMARY KEY,
      value_text TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS economic_stats (
      id INT PRIMARY KEY,
      remittances DOUBLE NOT NULL,
      gdp DOUBLE NOT NULL,
      diaspora_population DOUBLE NOT NULL,
      export_value DOUBLE NOT NULL,
      growth_rate DOUBLE NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS economic_sector_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      growth DOUBLE NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS remittance_impact (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sector VARCHAR(255) NOT NULL UNIQUE,
      percentage DOUBLE NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS remittance_transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      recipient_name VARCHAR(255) NOT NULL,
      recipient_type ENUM('mobile_money', 'cash_pickup', 'bank_transfer') NOT NULL,
      provider VARCHAR(100) NOT NULL,
      payout_channel VARCHAR(100),
      amount_sent DECIMAL(12,2) NOT NULL,
      amount_received DECIMAL(12,2),
      currency_from VARCHAR(10) NOT NULL,
      currency_to VARCHAR(10) NOT NULL,
      exchange_rate DECIMAL(12,6),
      status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
      provider_reference VARCHAR(512),
      idempotency_key VARCHAR(255),
      completion_email_sent_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_remittance_user (user_id),
      INDEX idx_remittance_status (status),
      INDEX idx_remittance_user_status (user_id, status),
      INDEX idx_remittance_user_created (user_id, created_at)
    )
  `);

  try {
    await db.execute(
      "ALTER TABLE remittance_transactions MODIFY COLUMN recipient_type ENUM('mobile_money', 'cash_pickup', 'bank_transfer') NOT NULL"
    );
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }

  try {
    await db.execute("ALTER TABLE remittance_transactions MODIFY COLUMN user_id INT NOT NULL");
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }

  try {
    await db.execute(
      "ALTER TABLE remittance_transactions CHANGE COLUMN terrapay_reference provider_reference VARCHAR(512)"
    );
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_DUP_FIELDNAME", "ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }
  try {
    await db.execute("ALTER TABLE remittance_transactions ADD COLUMN completion_email_sent_at DATETIME NULL");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }

  await ensureUniqueIndex("remittance_transactions", "uniq_remittance_idempotency_key", [
    "user_id",
    "idempotency_key",
  ]);
  await ensureUniqueIndex("remittance_transactions", "uniq_remittance_provider_reference", [
    "provider",
    "provider_reference",
  ]);
  await ensureNonUniqueIndex("remittance_transactions", "idx_remittance_provider_ref", [
    "provider_reference",
  ]);
  await ensureNonUniqueIndex("remittance_transactions", "idx_remittance_user_created", [
    "user_id",
    "created_at",
  ]);
  await ensureForeignKey({
    tableName: "remittance_transactions",
    constraintName: "fk_remittance_transactions_user",
    columnName: "user_id",
    referencedTableName: "users",
    referencedColumnName: "id",
    onDelete: "RESTRICT",
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS airtime_transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      provider VARCHAR(100) NOT NULL DEFAULT 'Reloadly',
      phone_number VARCHAR(20) NOT NULL,
      operator_id VARCHAR(100),
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10),
      provider_reference VARCHAR(255),
      reloadly_reference VARCHAR(255),
      idempotency_key VARCHAR(255),
      status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
      completion_email_sent_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_airtime_user (user_id),
      INDEX idx_airtime_user_status (user_id, status),
      INDEX idx_airtime_user_created (user_id, created_at)
    )
  `);

  // Add idempotency_key and updated_at to existing airtime_transactions tables
  try {
    await db.execute("ALTER TABLE airtime_transactions ADD COLUMN provider VARCHAR(100) NOT NULL DEFAULT 'Reloadly' AFTER user_id");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await db.execute("ALTER TABLE airtime_transactions MODIFY COLUMN user_id INT NOT NULL");
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }
  try {
    await db.execute("ALTER TABLE airtime_transactions ADD COLUMN provider_reference VARCHAR(255) NULL AFTER currency");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await db.execute("ALTER TABLE airtime_transactions ADD COLUMN idempotency_key VARCHAR(255) NULL");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await db.execute("ALTER TABLE airtime_transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await db.execute("ALTER TABLE airtime_transactions ADD COLUMN completion_email_sent_at DATETIME NULL");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await db.execute(`
      UPDATE airtime_transactions
      SET
        provider = COALESCE(NULLIF(provider, ''), 'Reloadly'),
        provider_reference = COALESCE(NULLIF(provider_reference, ''), reloadly_reference)
      WHERE
        provider IS NULL OR provider = '' OR provider_reference IS NULL OR provider_reference = ''
    `);
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }
  await ensureUniqueIndex("airtime_transactions", "uniq_airtime_idempotency_key", [
    "user_id",
    "idempotency_key",
  ]);
  await ensureUniqueIndex("airtime_transactions", "uniq_airtime_provider_reference", [
    "provider",
    "provider_reference",
  ]);
  await ensureNonUniqueIndex("airtime_transactions", "idx_airtime_user_created", [
    "user_id",
    "created_at",
  ]);
  await ensureForeignKey({
    tableName: "airtime_transactions",
    constraintName: "fk_airtime_transactions_user",
    columnName: "user_id",
    referencedTableName: "users",
    referencedColumnName: "id",
    onDelete: "RESTRICT",
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS financial_failed_attempts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NULL,
      flow ENUM('remittance', 'airtime') NOT NULL,
      endpoint VARCHAR(255) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      ip_address VARCHAR(80),
      payload JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fin_failed_user (user_id),
      INDEX idx_fin_failed_flow (flow)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS fintech_recovery_records (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      flow ENUM('remittance', 'airtime') NOT NULL,
      provider VARCHAR(100) NOT NULL,
      user_id BIGINT NOT NULL,
      idempotency_key VARCHAR(255) NULL,
      provider_reference VARCHAR(255) NULL,
      status VARCHAR(120) NULL,
      amount DECIMAL(12,2) NULL,
      currency VARCHAR(10) NULL,
      reason VARCHAR(500) NOT NULL,
      metadata_json JSON NULL,
      recorded_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fintech_recovery_flow_created (flow, created_at),
      INDEX idx_fintech_recovery_user_created (user_id, created_at),
      INDEX idx_fintech_recovery_provider_reference (provider_reference)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      domain VARCHAR(120) NOT NULL,
      action VARCHAR(120) NOT NULL,
      actor_id BIGINT NULL,
      resource VARCHAR(255) NULL,
      metadata_json JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_domain_created (domain, created_at),
      INDEX idx_audit_actor_created (actor_id, created_at)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key VARCHAR(255) PRIMARY KEY,
      request_count INT NOT NULL,
      reset_at BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_rate_limit_reset (reset_at)
    )
  `);

  // Tracks per-email login failures for account-level lockout.
  // The in-memory map in authStore.ts is the runtime authority; this table
  // exists for auditing and future cross-instance consistency.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_login_failures (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email_hash CHAR(64) NOT NULL,
      failure_count INT NOT NULL DEFAULT 1,
      window_start BIGINT NOT NULL,
      locked_until BIGINT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_auth_login_failures_email (email_hash),
      INDEX idx_auth_login_failures_locked (locked_until)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(160) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(60) NOT NULL,
      description TEXT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      price_cents INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      stock_qty INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_shop_products_category (category)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_ref VARCHAR(64) NOT NULL UNIQUE,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      shipping_country VARCHAR(120) NOT NULL,
      shipping_city VARCHAR(120) NOT NULL,
      shipping_address VARCHAR(500) NOT NULL,
      delivery_speed VARCHAR(20) NOT NULL DEFAULT 'normal',
      payment_method VARCHAR(40) NOT NULL,
      manage_token_hash CHAR(64) NOT NULL,
      payment_reference VARCHAR(255) NULL,
      status ENUM('awaiting_payment', 'paid', 'failed') NOT NULL DEFAULT 'awaiting_payment',
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      subtotal_cents INT NOT NULL,
      shipping_cents INT NOT NULL DEFAULT 0,
      total_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_shop_orders_email (customer_email),
      INDEX idx_shop_orders_manage_token (manage_token_hash)
    )
  `);

  try {
    await db.execute("ALTER TABLE shop_orders ADD COLUMN delivery_speed VARCHAR(20) NOT NULL DEFAULT 'normal'");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await db.execute("ALTER TABLE shop_orders ADD COLUMN manage_token_hash CHAR(64) NOT NULL DEFAULT ''");
  } catch (error: any) {
    if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await db.execute(
      "ALTER TABLE shop_orders MODIFY COLUMN status ENUM('awaiting_payment', 'paid', 'failed') NOT NULL DEFAULT 'awaiting_payment'"
    );
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE"].includes(code)) {
      throw error;
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shop_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      unit_price_cents INT NOT NULL,
      quantity INT NOT NULL,
      line_total_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_shop_order_items_order_id (order_id),
      INDEX idx_shop_order_items_product_id (product_id),
      CONSTRAINT fk_shop_order_items_order FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_shop_order_items_product FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE RESTRICT
    )
  `);

  // Add FK constraint on product_id to existing shop_order_items tables
  try {
    await db.execute(
      "ALTER TABLE shop_order_items ADD CONSTRAINT fk_shop_order_items_product FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE RESTRICT"
    );
  } catch (error: any) {
    const code = String(error?.code ?? "");
    if (!["ER_DUP_KEY", "ER_DUP_KEYNAME", "ER_CANT_CREATE_TABLE", "ER_NO_SUCH_TABLE"].includes(code)) {
      // Ignore if constraint already exists
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await syncNtirSeedData();
  await syncAdminSettingsSeedData();
  await syncEconomicStatsSeedData();
  await syncShopProductsSeedData();
  });
}
