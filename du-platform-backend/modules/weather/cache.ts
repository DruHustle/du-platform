import type { Pool } from "mysql2/promise";
export interface WeatherCacheEntry {
  value: unknown;
  expiresAt: number;
  fetchedAt: number;
  lastModified?: string;
  retryAfter?: number;
}
export interface WeatherCache {
  get(key: string): Promise<WeatherCacheEntry | null>;
  put(key: string, value: WeatherCacheEntry): Promise<void>;
}
export class MemoryWeatherCache implements WeatherCache {
  private entries = new Map<string, WeatherCacheEntry>();
  async get(key: string) {
    return this.entries.get(key) || null;
  }
  async put(key: string, value: WeatherCacheEntry) {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > 512)
      this.entries.delete(this.entries.keys().next().value!);
  }
}
export class SqlWeatherCache implements WeatherCache {
  constructor(private pool: Pool) {}
  async get(key: string) {
    const [rows] = await this.pool.query<any[]>(
      "SELECT payload FROM weather_cache WHERE cache_key=?",
      [key]
    );
    if (!rows[0]) return null;
    const payload = rows[0].payload;
    return typeof payload === "string" ? JSON.parse(payload) : payload;
  }
  async put(key: string, value: WeatherCacheEntry) {
    await this.pool.execute(
      "INSERT INTO weather_cache (cache_key,payload,expires_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)",
      [key, JSON.stringify(value), new Date(value.expiresAt)]
    );
    await this.pool.execute(
      "DELETE FROM weather_cache WHERE expires_at < ? LIMIT 50",
      [new Date(Date.now() - 7 * 86400000)]
    );
  }
}
export async function initializeWeather(pool: Pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS weather_cache (
 cache_key VARCHAR(80) PRIMARY KEY,payload JSON NOT NULL,expires_at TIMESTAMP NOT NULL,
 INDEX weather_cache_expiry (expires_at)
)`);
}
