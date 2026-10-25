import type { Pool } from "mysql2/promise";

// Legacy registrations remain dormant. No migration sends customer messages.
export async function initializeProductInterest(pool: Pool) {
  const columns = {
    status: "VARCHAR(20) NOT NULL DEFAULT 'legacy'",
    consent_at: "DATETIME NULL",
    confirmed_at: "DATETIME NULL",
    cancelled_at: "DATETIME NULL",
    notified_at: "DATETIME NULL",
    confirmation_hash: "CHAR(64) NULL",
    confirmation_expires_at: "DATETIME NULL",
    last_confirmation_at: "DATETIME NULL",
    cancel_token: "CHAR(48) NULL",
    generation: "INT NOT NULL DEFAULT 0",
  };
  for (const [name, definition] of Object.entries(columns)) {
    try {
      await pool.execute(
        `ALTER TABLE shop_restock_notifications ADD COLUMN ${name} ${definition}`
      );
    } catch (error: any) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  for (const [name, definition] of Object.entries({
    interest_id: "INT NULL",
    interest_generation: "INT NULL",
    intent_key: "VARCHAR(160) NULL",
  })) {
    try {
      await pool.execute(
        `ALTER TABLE newsletter_deliveries ADD COLUMN ${name} ${definition}`
      );
    } catch (error: any) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  for (const sql of [
    "CREATE INDEX delivery_interest ON newsletter_deliveries (interest_id,interest_generation)",
    "CREATE UNIQUE INDEX delivery_intent ON newsletter_deliveries (intent_key)",
    "CREATE INDEX interest_confirmation ON shop_restock_notifications (confirmation_hash)",
    "CREATE INDEX interest_cancel ON shop_restock_notifications (cancel_token)",
    "CREATE INDEX interest_status ON shop_restock_notifications (status, product_id)",
  ]) {
    try {
      await pool.execute(sql);
    } catch (error: any) {
      if (error.code !== "ER_DUP_KEYNAME") throw error;
    }
  }
}
