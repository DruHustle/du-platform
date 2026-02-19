import crypto from "crypto";
import fs from "fs";
import mysql from "mysql2/promise";

export type DbLike = mysql.Pool | null;

const memoryUsers: Array<{
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: string;
}> = [];

const memoryAuthSessions: Array<{
  token_hash: string;
  user_id: number;
  expires_at: string;
}> = [];

const memoryPasswordResetTokens: Array<{
  token_hash: string;
  user_id: number;
  expires_at: string;
  used_at: string | null;
}> = [];

const memoryNtirEntities: Array<{
  id: number;
  name: string;
  sector: string;
  location: string;
  verification_status: "Verified" | "Pending";
}> = [
  { id: 1, name: "Matseka Trade Pvt Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 2, name: "Berrymark Trading P/L", sector: "Fresh Produce Export", location: "Harare", verification_status: "Verified" },
  { id: 3, name: "Fair Mark Enterprises P/L", sector: "Fresh Produce Export", location: "Harare", verification_status: "Pending" },
  { id: 4, name: "Flitvick Exports Pvt Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 5, name: "Hortech (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Pending" },
  { id: 6, name: "Matanuska (Pvt) Ltd", sector: "Fresh Produce Export", location: "Honde Valley", verification_status: "Verified" },
  { id: 7, name: "Schmoozy Fresh (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Pending" },
  { id: 8, name: "Jumbo Fresh (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 9, name: "Linkage Agencies (Pvt) Ltd", sector: "Horticulture Export", location: "Harare", verification_status: "Verified" },
  { id: 10, name: "Chammy International (Pvt) Ltd", sector: "Fresh Produce Export", location: "Mutare", verification_status: "Pending" },
];

async function syncNtirSeedData(): Promise<void> {
  if (!db) return;

  for (const entity of memoryNtirEntities) {
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

const memoryFeatureNotifications: Array<{
  id: number;
  user_id: number;
  email: string;
  feature: string;
  created_at: string;
}> = [];

const memorySuccessStories: Array<{
  id: number;
  title: string;
  category: string;
  image: string;
  story: string;
  testimonial: string;
  author: string;
  role: string;
  revenue: string;
  jobs: string;
  markets: string;
  is_published: 0 | 1;
  created_at: string;
}> = [];

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

function isDbConnectionError(error: unknown): boolean {
  const code = (error as any)?.code;
  return [
    "ECONNREFUSED",
    "ENOTFOUND",
    "PROTOCOL_CONNECTION_LOST",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
    "ETIMEDOUT",
  ].includes(String(code));
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function buildSslConfig() {
  const caFromEnv = getEnv("AIVEN_CA_CERT");
  const caPath = getEnv("AIVEN_CA_CERT_PATH");

  if (caFromEnv) return { rejectUnauthorized: true, ca: caFromEnv };
  if (caPath && fs.existsSync(caPath)) return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") };
  return { rejectUnauthorized: false };
}

function sanitizeMysqlUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete("ssl-mode");
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function buildPoolFromEnv(): DbLike {
  const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
  const isProduction = nodeEnv === "production";

  // Production: Aiven only
  if (isProduction) {
    const rawAivenUrl = getEnv("AIVEN_MYSQL_URL");
    const aivenUrl = rawAivenUrl ? sanitizeMysqlUrl(rawAivenUrl) : undefined;
    if (aivenUrl) {
      return mysql.createPool({
        uri: aivenUrl,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        ssl: buildSslConfig(),
      });
    }

    const host = getEnv("AIVEN_MYSQL_HOST");
    const user = getEnv("AIVEN_MYSQL_USER");
    const password = getEnv("AIVEN_MYSQL_PASSWORD");
    const database = getEnv("AIVEN_MYSQL_DATABASE");
    const port = Number(getEnv("AIVEN_MYSQL_PORT") ?? "3306");
    if (!host || !user || !database) return null;

    return mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      ssl: buildSslConfig(),
    });
  }

  // Development/Test: local MySQL only
  const rawLocalUrl = getEnv("DATABASE_URL");
  const localUrl = rawLocalUrl ? sanitizeMysqlUrl(rawLocalUrl) : undefined;
  if (localUrl) {
    return mysql.createPool({
      uri: localUrl,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }

  const host = getEnv("MYSQL_HOST");
  const user = getEnv("MYSQL_USER");
  const password = getEnv("MYSQL_PASSWORD");
  const database = getEnv("MYSQL_DATABASE");
  const port = Number(getEnv("MYSQL_PORT") ?? "3306");
  if (!host || !user || !database) return null;

  return mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
}

export const db = buildPoolFromEnv();

export async function initializeDatabase(): Promise<void> {
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  await syncNtirSeedData();
  await syncEconomicStatsSeedData();
}

export async function findUserByEmail(email: string) {
  if (!db) return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] ?? null;
  } catch (error) {
    if (isDbConnectionError(error)) return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    throw error;
  }
}

export async function findUserById(id: number) {
  if (!db) return memoryUsers.find((u) => u.id === id) ?? null;
  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] ?? null;
  } catch (error) {
    if (isDbConnectionError(error)) return memoryUsers.find((u) => u.id === id) ?? null;
    throw error;
  }
}

export async function createUser(fullName: string, email: string, passwordHash: string) {
  if (!db) {
    const newUser = {
      id: memoryUsers.length + 1,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
    memoryUsers.push(newUser);
    return newUser;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
      [fullName, email, passwordHash]
    );

    return {
      id: result.insertId,
      full_name: fullName,
      email,
      password_hash: passwordHash,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const newUser = {
      id: memoryUsers.length + 1,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
    memoryUsers.push(newUser);
    return newUser;
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  if (!db) {
    const user = memoryUsers.find((u) => u.id === userId);
    if (user) user.password_hash = passwordHash;
    return;
  }
  try {
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const user = memoryUsers.find((u) => u.id === userId);
    if (user) user.password_hash = passwordHash;
  }
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: number, ttlHours = 24 * 7) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  if (!db) {
    memoryAuthSessions.push({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt.toISOString() });
  } else {
    try {
      await db.execute("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash, userId, expiresAt]);
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
      memoryAuthSessions.push({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt.toISOString() });
    }
  }

  return { token, tokenHash, expiresAt };
}

export async function getSession(token: string) {
  const tokenHash = sha256(token);

  if (!db) {
    const session = memoryAuthSessions.find((s) => s.token_hash === tokenHash);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      const idx = memoryAuthSessions.findIndex((s) => s.token_hash === tokenHash);
      if (idx >= 0) memoryAuthSessions.splice(idx, 1);
      return null;
    }
    return session;
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT token_hash, user_id, expires_at FROM auth_sessions WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    const session = rows[0];
    if (!session) return null;

    const expiresAt = new Date(session.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
      return null;
    }
    return session;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const session = memoryAuthSessions.find((s) => s.token_hash === tokenHash);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) return null;
    return session;
  }
}

export async function deleteSession(token: string) {
  const tokenHash = sha256(token);
  if (!db) {
    const idx = memoryAuthSessions.findIndex((s) => s.token_hash === tokenHash);
    if (idx >= 0) memoryAuthSessions.splice(idx, 1);
    return null;
  }
  try {
    await db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash]);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const idx = memoryAuthSessions.findIndex((s) => s.token_hash === tokenHash);
    if (idx >= 0) memoryAuthSessions.splice(idx, 1);
  }
}

export async function createPasswordResetToken(userId: number, ttlMinutes = 30) {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  if (!db) {
    memoryPasswordResetTokens.push({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      used_at: null,
    });
  } else {
    try {
      await db.execute("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash, userId, expiresAt]);
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
      memoryPasswordResetTokens.push({
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        used_at: null,
      });
    }
  }

  return { token, tokenHash, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string) {
  const tokenHash = sha256(rawToken);

  if (!db) {
    const tokenRow = memoryPasswordResetTokens.find((row) => row.token_hash === tokenHash);
    if (!tokenRow) return null;
    if (tokenRow.used_at) return null;
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) return null;
    tokenRow.used_at = new Date().toISOString();
    return tokenRow;
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;
    if (row.used_at) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;

    await db.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?", [tokenHash]);
    return row;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const tokenRow = memoryPasswordResetTokens.find((row) => row.token_hash === tokenHash);
    if (!tokenRow) return null;
    if (tokenRow.used_at) return null;
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) return null;
    tokenRow.used_at = new Date().toISOString();
    return tokenRow;
  }
}

export async function searchNtirEntities(query: string) {
  const q = query.trim().toLowerCase();
  if (!db) {
    if (!q) return memoryNtirEntities;
    return memoryNtirEntities.filter((entity) =>
      [entity.name, entity.sector, entity.location].some((value) => value.toLowerCase().includes(q))
    );
  }

  if (!q) {
    try {
      const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT id, name, sector, location, verification_status FROM ntir_entities ORDER BY id DESC LIMIT 50");
      return rows;
    } catch (error) {
      if (!isDbConnectionError(error)) throw error;
      return memoryNtirEntities;
    }
  }

  const likeQuery = `%${q}%`;
  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
        SELECT id, name, sector, location, verification_status
        FROM ntir_entities
        WHERE LOWER(name) LIKE ? OR LOWER(sector) LIKE ? OR LOWER(location) LIKE ?
        ORDER BY id DESC
        LIMIT 50
      `,
      [likeQuery, likeQuery, likeQuery]
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryNtirEntities.filter((entity) =>
      [entity.name, entity.sector, entity.location].some((value) => value.toLowerCase().includes(q))
    );
  }
}

export async function createFeatureNotification(userId: number, email: string, feature: string) {
  const normalizedFeature = feature.trim();
  if (!normalizedFeature) {
    throw new Error("Feature is required.");
  }

  if (!db) {
    const existing = memoryFeatureNotifications.find(
      (row) => row.user_id === userId && row.email.toLowerCase() === email.toLowerCase() && row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email,
      feature: normalizedFeature,
      created_at: new Date().toISOString(),
    };
    memoryFeatureNotifications.push(record);
    return { created: true, record };
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO feature_notifications (user_id, email, feature) VALUES (?, ?, ?)",
      [userId, email, normalizedFeature]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, email, feature, created_at FROM feature_notifications WHERE email = ? AND feature = ? LIMIT 1",
      [email, normalizedFeature]
    );

    return {
      created: Number(result.affectedRows ?? 0) > 0,
      record: rows[0] ?? null,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;

    const existing = memoryFeatureNotifications.find(
      (row) => row.user_id === userId && row.email.toLowerCase() === email.toLowerCase() && row.feature === normalizedFeature
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryFeatureNotifications.length + 1,
      user_id: userId,
      email,
      feature: normalizedFeature,
      created_at: new Date().toISOString(),
    };
    memoryFeatureNotifications.push(record);
    return { created: true, record };
  }
}

export async function getFeatureNotifications() {
  if (!db) {
    return [...memoryFeatureNotifications].sort((a, b) => b.id - a.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, email, feature, created_at FROM feature_notifications ORDER BY id DESC LIMIT 500"
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...memoryFeatureNotifications].sort((a, b) => b.id - a.id);
  }
}

export async function getNtirEntities() {
  if (!db) {
    return [...memoryNtirEntities].sort((a, b) => b.id - a.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, name, sector, location, verification_status FROM ntir_entities ORDER BY id DESC LIMIT 500"
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...memoryNtirEntities].sort((a, b) => b.id - a.id);
  }
}

export async function createNtirEntity(name: string, sector: string, location: string, verificationStatus: "Verified" | "Pending") {
  if (!db) {
    const record = {
      id: memoryNtirEntities.length + 1,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
    memoryNtirEntities.unshift(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO ntir_entities (name, sector, location, verification_status) VALUES (?, ?, ?, ?)",
      [name, sector, location, verificationStatus]
    );
    return {
      id: result.insertId,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: memoryNtirEntities.length + 1,
      name,
      sector,
      location,
      verification_status: verificationStatus,
    };
    memoryNtirEntities.unshift(record);
    return record;
  }
}

export async function updateNtirEntity(
  id: number,
  payload: Partial<{ name: string; sector: string; location: string; verification_status: "Verified" | "Pending" }>
) {
  if (!db) {
    const idx = memoryNtirEntities.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memoryNtirEntities[idx] = { ...memoryNtirEntities[idx], ...payload };
    return memoryNtirEntities[idx];
  }

  try {
    const updates: string[] = [];
    const params: any[] = [];
    if (payload.name !== undefined) {
      updates.push("name = ?");
      params.push(payload.name);
    }
    if (payload.sector !== undefined) {
      updates.push("sector = ?");
      params.push(payload.sector);
    }
    if (payload.location !== undefined) {
      updates.push("location = ?");
      params.push(payload.location);
    }
    if (payload.verification_status !== undefined) {
      updates.push("verification_status = ?");
      params.push(payload.verification_status);
    }
    if (updates.length === 0) return null;

    params.push(id);
    await db.execute(`UPDATE ntir_entities SET ${updates.join(", ")} WHERE id = ?`, params);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, name, sector, location, verification_status FROM ntir_entities WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const idx = memoryNtirEntities.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memoryNtirEntities[idx] = { ...memoryNtirEntities[idx], ...payload };
    return memoryNtirEntities[idx];
  }
}

export async function getSuccessStories(includeUnpublished = false) {
  if (!db) {
    const rows = includeUnpublished ? memorySuccessStories : memorySuccessStories.filter((s) => s.is_published === 1);
    return [...rows].sort((a, b) => b.id - a.id);
  }

  try {
    const query = includeUnpublished
      ? "SELECT * FROM success_stories ORDER BY id DESC LIMIT 500"
      : "SELECT * FROM success_stories WHERE is_published = 1 ORDER BY id DESC LIMIT 500";
    const [rows] = await db.query<mysql.RowDataPacket[]>(query);
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const rows = includeUnpublished ? memorySuccessStories : memorySuccessStories.filter((s) => s.is_published === 1);
    return [...rows].sort((a, b) => b.id - a.id);
  }
}

export async function createSuccessStory(payload: {
  title: string;
  category: string;
  image: string;
  story: string;
  testimonial: string;
  author: string;
  role: string;
  revenue: string;
  jobs: string;
  markets: string;
  is_published: 0 | 1;
}) {
  if (!db) {
    const record = {
      id: memorySuccessStories.length + 1,
      ...payload,
      created_at: new Date().toISOString(),
    };
    memorySuccessStories.unshift(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO success_stories
      (title, category, image, story, testimonial, author, role, revenue, jobs, markets, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.title,
        payload.category,
        payload.image,
        payload.story,
        payload.testimonial,
        payload.author,
        payload.role,
        payload.revenue,
        payload.jobs,
        payload.markets,
        payload.is_published,
      ]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM success_stories WHERE id = ? LIMIT 1", [result.insertId]);
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: memorySuccessStories.length + 1,
      ...payload,
      created_at: new Date().toISOString(),
    };
    memorySuccessStories.unshift(record);
    return record;
  }
}

export async function getEconomicStats() {
  if (!db) {
    return {
      ...memoryEconomicStats,
      sectorData: memoryEconomicSectorData,
      remittanceImpact: memoryRemittanceImpact,
    };
  }

  try {
    const [[statsRow]] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT remittances, gdp, diaspora_population, export_value, growth_rate
      FROM economic_stats
      WHERE id = 1
      LIMIT 1
      `
    );
    const [sectorRows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT name, growth FROM economic_sector_data ORDER BY id ASC"
    );
    const [impactRows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT sector, percentage FROM remittance_impact ORDER BY id ASC"
    );

    if (!statsRow) {
      return {
        ...memoryEconomicStats,
        sectorData: memoryEconomicSectorData,
        remittanceImpact: memoryRemittanceImpact,
      };
    }

    return {
      remittances: Number(statsRow.remittances),
      gdp: Number(statsRow.gdp),
      diasporaPopulation: Number(statsRow.diaspora_population),
      exportValue: Number(statsRow.export_value),
      growthRate: Number(statsRow.growth_rate),
      sectorData: sectorRows.map((row) => ({
        name: String(row.name),
        growth: Number(row.growth),
      })),
      remittanceImpact: impactRows.map((row) => ({
        sector: String(row.sector),
        percentage: Number(row.percentage),
      })),
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return {
      ...memoryEconomicStats,
      sectorData: memoryEconomicSectorData,
      remittanceImpact: memoryRemittanceImpact,
    };
  }
}
