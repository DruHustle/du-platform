import type { Pool } from "mysql2/promise";

// Additive and restart-safe: preserve all existing signup rows.
export async function initializeNewsletterDatabase(pool: Pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  const columns = {
    status: "VARCHAR(20) NOT NULL DEFAULT 'subscribed'",
    consent_at: "DATETIME NULL",
    confirmed_at: "DATETIME NULL",
    unsubscribed_at: "DATETIME NULL",
    confirmation_hash: "CHAR(64) NULL",
    confirmation_expires_at: "DATETIME NULL",
    last_confirmation_at: "DATETIME NULL",
    unsubscribe_token: "CHAR(48) NULL",
    source: "VARCHAR(60) NOT NULL DEFAULT 'footer'",
  };
  for (const [name, definition] of Object.entries(columns)) {
    try {
      await pool.execute(
        `ALTER TABLE newsletter_subscriptions ADD COLUMN ${name} ${definition}`
      );
    } catch (error: any) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  for (const [name, column] of Object.entries({
    newsletter_status: "status",
    newsletter_confirmation: "confirmation_hash",
    newsletter_unsubscribe: "unsubscribe_token",
  })) {
    try {
      await pool.execute(
        `CREATE INDEX ${name} ON newsletter_subscriptions (${column})`
      );
    } catch (error: any) {
      if (error.code !== "ER_DUP_KEYNAME") throw error;
    }
  }
  await pool.execute(`CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, subject VARCHAR(160) NOT NULL,
    body TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft',
    version INT NOT NULL DEFAULT 1, created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    queued_at DATETIME NULL)`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS newsletter_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, campaign_id BIGINT NULL,
    subscription_id BIGINT NULL, kind VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL, payload MEDIUMTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
    available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_attempt_at DATETIME NULL, locked_at DATETIME NULL,
    accepted_at DATETIME NULL, provider_id VARCHAR(255) NULL,
    error_message VARCHAR(255) NULL, retry_safe BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY campaign_recipient (campaign_id, subscription_id),
    INDEX delivery_queue (status, available_at), INDEX delivery_campaign (campaign_id),
    CONSTRAINT newsletter_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES newsletter_campaigns(id),
    CONSTRAINT newsletter_delivery_subscription FOREIGN KEY (subscription_id) REFERENCES newsletter_subscriptions(id))`);
}
