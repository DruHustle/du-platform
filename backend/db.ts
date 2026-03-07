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
    CREATE TABLE IF NOT EXISTS care_referrals (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      provider VARCHAR(100) NOT NULL,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_care_referrals_user_id (user_id),
      INDEX idx_care_referrals_provider (provider),
      CONSTRAINT fk_care_referrals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
      user_id BIGINT NOT NULL,
      recipient_name VARCHAR(255) NOT NULL,
      recipient_type ENUM('mobile_money', 'cash_pickup', 'visa_card') NOT NULL,
      provider VARCHAR(100) NOT NULL,
      payout_channel VARCHAR(100),
      amount_sent DECIMAL(12,2) NOT NULL,
      amount_received DECIMAL(12,2),
      currency_from VARCHAR(10) NOT NULL,
      currency_to VARCHAR(10) NOT NULL,
      exchange_rate DECIMAL(12,6),
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      terrapay_reference VARCHAR(255),
      idempotency_key VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_remittance_user (user_id),
      INDEX idx_remittance_status (status)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS airtime_transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      operator_id VARCHAR(100),
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10),
      reloadly_reference VARCHAR(255),
      status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_airtime_user (user_id)
    )
  `);

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
      status VARCHAR(40) NOT NULL DEFAULT 'awaiting_payment',
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      subtotal_cents INT NOT NULL,
      shipping_cents INT NOT NULL DEFAULT 0,
      total_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      CONSTRAINT fk_shop_order_items_order FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE
    )
  `);

  await syncNtirSeedData();
  await syncAdminSettingsSeedData();
  await syncEconomicStatsSeedData();
  await syncShopProductsSeedData();
}
