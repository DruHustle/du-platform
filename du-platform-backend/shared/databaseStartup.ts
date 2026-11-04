import type { Pool } from "mysql2/promise";

export type DatabaseStartupMode = "initialize" | "verify";

export function databaseStartupMode(value = process.env.DATABASE_STARTUP_MODE): DatabaseStartupMode {
  if (value === undefined) return "initialize";
  if (value === "initialize" || value === "verify") return value;
  throw new Error("DATABASE_STARTUP_MODE must be initialize or verify");
}

// Columns consumed by the current runtime, including additive auth/mail upgrades.
// Keep this contract aligned with the explicitly commissioned migrations.
export const requiredColumns: Readonly<Record<string, readonly string[]>> = {
  users: ["id", "full_name", "email", "password_hash", "created_at", "email_verified_at", "auth_version"],
  ntir_entities: ["id", "name", "sector", "location", "verification_status", "created_at"],
  auth_sessions: ["token_hash", "user_id", "created_at", "expires_at"],
  password_reset_tokens: ["token_hash", "user_id", "created_at", "expires_at", "used_at"],
  feature_notifications: ["id", "user_id", "email", "feature", "created_at"],
  shop_restock_notifications: ["id", "product_id", "product_slug", "product_name", "email", "created_at", "language", "status", "consent_at", "confirmed_at", "cancelled_at", "notified_at", "confirmation_hash", "confirmation_expires_at", "last_confirmation_at", "cancel_token", "generation"],
  success_stories: ["id", "title", "category", "image", "story", "testimonial", "author", "role", "revenue", "jobs", "markets", "created_at"],
  admin_settings: ["key_name", "value_text", "updated_at"],
  audit_events: ["id", "domain", "action", "actor_id", "resource", "metadata_json", "created_at"],
  rate_limit_buckets: ["bucket_key", "request_count", "reset_at", "created_at", "updated_at"],
  auth_login_failures: ["id", "email_hash", "failure_count", "window_start", "locked_until", "created_at", "updated_at"],
  shop_products: ["id", "slug", "name", "category", "description", "image_url", "price_cents", "currency", "stock_qty", "created_at", "updated_at"],
  shop_orders: ["id", "order_ref", "customer_name", "customer_email", "shipping_country", "shipping_city", "shipping_address", "delivery_speed", "payment_method", "manage_token_hash", "payment_reference", "status", "currency", "subtotal_cents", "shipping_cents", "total_cents", "created_at", "updated_at"],
  shop_order_items: ["id", "order_id", "product_id", "product_name", "unit_price_cents", "quantity", "line_total_cents", "created_at"],
  travel_saved: ["id", "user_id", "name", "kind", "draft", "updated_at"],
  weather_cache: ["cache_key", "payload", "expires_at"],
  shop_order_workflows: ["order_id", "stage", "version", "quote_version", "assigned_to", "inventory_consumed", "payment_reference", "carrier", "tracking", "refund_cents", "refund_reference", "language", "postal_code", "access_grant", "updated_at", "analytics_consent", "customer_notes"],
  shop_funnel_daily: ["day", "event", "count"],
  research_profiles: ["kind", "subject_key", "details", "updated_at"],
  shop_quotes: ["id", "order_id", "version", "currency", "items", "shipping_cents", "total_cents", "valid_until", "created_at"],
  shop_order_events: ["id", "order_id", "request_id", "action", "actor", "note", "public_message", "created_at", "request_hash"],
  shop_order_refunds: ["id", "order_id", "command_id", "amount_cents", "currency", "external_reference", "reference_provider", "reference_hash", "actor", "created_at"],
  shop_refund_legacy_balances: ["order_id", "amount_cents", "currency", "last_known_reference", "captured_at"],
  shop_order_notifications: ["id", "order_id", "event_key", "language", "event_data", "payload", "status", "attempts", "available_at", "locked_at", "first_attempt_at", "accepted_at", "provider_id", "error_message", "manual_retry"],
  shop_product_details: ["product_id", "details", "updated_at"],
  shop_order_snapshots: ["order_id", "items"],
  newsletter_subscriptions: ["id", "email", "created_at", "language", "status", "consent_at", "confirmed_at", "unsubscribed_at", "confirmation_hash", "confirmation_expires_at", "last_confirmation_at", "unsubscribe_token", "source"],
  newsletter_campaigns: ["id", "subject", "body", "status", "version", "created_by", "created_at", "updated_at", "queued_at"],
  newsletter_deliveries: ["id", "campaign_id", "subscription_id", "kind", "recipient", "payload", "status", "attempts", "available_at", "first_attempt_at", "locked_at", "accepted_at", "provider_id", "error_message", "retry_safe", "created_at", "interest_id", "interest_generation", "intent_key"],
  contact_enquiries: ["request_id", "payload_hash", "encrypted_details", "language", "created_at"],
  transactional_messages: ["id", "intent_key", "kind", "entity_id", "user_id", "reset_hash", "auth_version", "encrypted_payload", "status", "attempts", "manual_retry", "available_at", "first_attempt_at", "locked_at", "accepted_at", "provider_id", "acceptance_uncertain", "error_message", "reconciled_by", "reconciled_at", "last_retry_by", "last_retry_at", "created_at"],
};

/** Validate the existing primary without running migrations, seeds or account bootstrap. */
export async function verifyDatabaseSchema(pool: Pick<Pool, "getConnection">): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query("START TRANSACTION READ ONLY");
    for (const [table, columns] of Object.entries(requiredColumns)) {
      // All identifiers are source constants, never request data or environment values.
      const selection = columns.map(column => `\`${column}\``).join(", ");
      await connection.query(`SELECT ${selection} FROM \`${table}\` LIMIT 0`);
    }
    await connection.query("COMMIT");
  } catch {
    try { await connection.query("ROLLBACK"); } catch { /* Preserve the sanitized startup error. */ }
    throw new Error("Existing MySQL schema is unavailable or incomplete; verify-only startup made no changes");
  } finally {
    connection.release();
  }
}
