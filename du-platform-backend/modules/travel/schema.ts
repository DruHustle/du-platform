import type { Pool } from "mysql2/promise";
export async function initializeTravel(pool: Pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS travel_saved (
    id CHAR(36) PRIMARY KEY, user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, kind VARCHAR(10) NOT NULL, draft JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX travel_owner (user_id, updated_at),
    CONSTRAINT travel_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
}
