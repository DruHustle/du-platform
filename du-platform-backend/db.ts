import { initializeWeather } from "./modules/weather/cache";
import { initializeTravel } from "./modules/travel/schema";
import { initializeProductInterest } from "./modules/shop/interestSchema";
import { initializeTransactionalMessages } from "./modules/notifications/schema";
import { initializeShopPilot } from "./modules/shop/pilotSchema";
import { initializeAdminAccounts } from "./modules/admin/bootstrap";
import { initializeNewsletterDatabase } from "./modules/newsletter/schema";
import mysql from "mysql2/promise";
import { db, isMemoryFallbackEnabled } from "./shared/databaseRuntime";
import { ntirSeedEntities } from "./shared/persistence/investmentStore";
import { synchronizeShopCatalog } from "./modules/shop/catalogSeed";

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
      [
        entity.name,
        entity.sector,
        entity.location,
        entity.verification_status,
        entity.name,
      ]
    );
  }
}

async function syncAdminSettingsSeedData(): Promise<void> {
  if (!db) return;

  const envFromEmail = String(process.env.FROM_EMAIL ?? "").trim();
  const envAdminEmails = String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
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

async function withDatabaseInitializationLock<T>(
  fn: () => Promise<T>
): Promise<T> {
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

export async function initializeDatabase(): Promise<void> {
  if (!db) {
    if (isMemoryFallbackEnabled()) return;
    throw new Error(
      "Database connection is required in production, but no database configuration was found."
    );
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    for (const column of [
      "email_verified_at TIMESTAMP NULL DEFAULT NULL",
      "auth_version INT NOT NULL DEFAULT 0",
    ]) {
      try {
        await db.execute(`ALTER TABLE users ADD COLUMN ${column}`);
      } catch (error) {
        if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME")
          throw error;
      }
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

    // Additive, restart-safe upgrade; existing recipients keep English.
    try {
      await db.execute(
        "ALTER TABLE shop_restock_notifications ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'en'"
      );
    } catch (error: any) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }

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
      await db.execute(
        "ALTER TABLE shop_orders ADD COLUMN delivery_speed VARCHAR(20) NOT NULL DEFAULT 'normal'"
      );
    } catch (error: any) {
      if (String(error?.code ?? "") !== "ER_DUP_FIELDNAME") throw error;
    }

    try {
      await db.execute(
        "ALTER TABLE shop_orders ADD COLUMN manage_token_hash CHAR(64) NOT NULL DEFAULT ''"
      );
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
      if (
        ![
          "ER_DUP_KEY",
          "ER_DUP_KEYNAME",
          "ER_CANT_CREATE_TABLE",
          "ER_NO_SUCH_TABLE",
        ].includes(code)
      ) {
        // Ignore if constraint already exists
      }
    }

    await initializeTravel(db);
    await initializeWeather(db);
    await initializeShopPilot(db);
    await initializeNewsletterDatabase(db);
    await initializeProductInterest(db);
    await initializeTransactionalMessages(db);

    await syncNtirSeedData();
    await syncAdminSettingsSeedData();
    await synchronizeShopCatalog(db);
    await initializeAdminAccounts(db);
  });
}
