import type { Pool } from "mysql2/promise";

// Additive only: historical requests and reset tokens are never backfilled/sent.
export async function initializeTransactionalMessages(pool: Pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS contact_enquiries (
    request_id CHAR(36) PRIMARY KEY, payload_hash CHAR(64) NOT NULL,
    encrypted_details MEDIUMTEXT NOT NULL, language VARCHAR(2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX contact_received(created_at,request_id)
  ) ENGINE=InnoDB`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS transactional_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, intent_key VARCHAR(160) NOT NULL UNIQUE,
    kind VARCHAR(32) NOT NULL, entity_id VARCHAR(100) NOT NULL,
    user_id INT NULL, reset_hash CHAR(64) NULL, auth_version INT NULL,
    encrypted_payload MEDIUMTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
    manual_retry BOOLEAN NOT NULL DEFAULT FALSE,
    available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_attempt_at DATETIME NULL, locked_at DATETIME NULL,
    accepted_at DATETIME NULL, provider_id VARCHAR(100) NULL,
    acceptance_uncertain BOOLEAN NOT NULL DEFAULT FALSE,
    error_message VARCHAR(255) NULL,
    reconciled_by INT NULL, reconciled_at DATETIME NULL,
    last_retry_by INT NULL, last_retry_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX transactional_queue(status, available_at), INDEX transactional_entity(kind,entity_id)
  ) ENGINE=InnoDB`);
}
