import crypto from "crypto";
import fs from "fs";
import mysql from "mysql2/promise";

export type DbLike = mysql.Pool | null;

const memoryUsers: Array<{
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  kyc_verified: 0 | 1;
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

const memoryCareReferrals: Array<{
  id: number;
  user_id: number | null;
  provider: string;
  timestamp: string;
}> = [];

const memoryShopRestockNotifications: Array<{
  id: number;
  product_id: number | null;
  product_slug: string;
  product_name: string;
  email: string;
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

export type ShopPaymentMethod = "stripe" | "paypal" | "amazon_pay" | "dummy_gateway";
export type ShopOrderStatus = "awaiting_payment" | "paid" | "failed";
export type ShopProductsSource = "db" | "memory";

export type ShopProductsResult = {
  products: mysql.RowDataPacket[] | ShopProduct[];
  source: ShopProductsSource;
  cached: boolean;
};

type ShopProduct = {
  id: number;
  slug: string;
  name: string;
  category: "sports" | "crafts" | "food"| "beverage" ;
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
  is_active: 0 | 1;
};

type ShopOrder = {
  id: number;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  shipping_country: string;
  shipping_city: string;
  shipping_address: string;
  payment_method: ShopPaymentMethod;
  payment_reference: string | null;
  status: ShopOrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
};

type ShopOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

const memoryShopProducts: ShopProduct[] = [
  {
    id: 1,
    slug: "sables-rugby-home-kit",
    name: "Sables Rugby Home Kit",
    category: "sports",
    description: "Official Zimbabwe rugby jersey kit.",
    image_url: "/images/pages/shop/sports_rugby_jersey.jpg",
    price_cents: 6900,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 2,
    slug: "chevrons-world-cup-jersey",
    name: "Chevrons World Cup Jersey",
    category: "sports",
    description: "National cricket fan jersey.",
    image_url: "/images/pages/shop/sports_cricket_jersey.png",
    price_cents: 6400,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 3,
    slug: "warriors-football-kit",
    name: "Warriors Football Kit",
    category: "sports",
    description: "Zimbabwe football supporters kit.",
    image_url: "/images/pages/shop/sports_football_jersey.png",
    price_cents: 5090,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 4,
    slug: "shona-stone-sculpture",
    name: "Shona Stone Sculpture",
    category: "crafts",
    description: "Hand-carved premium stone sculpture.",
    image_url: "/images/pages/shop/crafts_stone_sculptures1.png",
    price_cents: 1490,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 5,
    slug: "binga-basket",
    name: "Binga Basket",
    category: "crafts",
    description: "Handwoven basket made by local artisans.",
    image_url: "/images/pages/shop/crafts_binga_baskets1.jpg",
    price_cents: 390,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 6,
    slug: "beaded-jewelry-set",
    name: "Beaded Jewelry Set",
    category: "crafts",
    description: "Traditional beaded necklace and bracelet set.",
    image_url: "/images/pages/shop/crafts_beaded_jewelry1.jpg",
    price_cents: 290,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 7,
    slug: "mazoe-variety-pack",
    name: "Mazoe Variety Pack",
    category: "beverage",
    description: "Classic Zimbabwe cordial selection.",
    image_url: "/images/pages/shop/beverage_mazoe_mixed_6.jpg",
    price_cents: 220,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 8,
    slug: "cerevita-corn-banana-500g",
    name: "Cerevita Corn and Banana Cereal",
    category: "food",
    description: "Nutritious instant cereal favorite.",
    image_url: "/images/pages/shop/food_cerevita_corn_banana_1.png",
    price_cents: 190,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },

  {
    id: 9,
    slug: "mazoe-raspberry-2l-case-6",
    name: "Mazoe Raspberry 2L Case (6 Units)",
    category: "beverage",
    description: "Bulk case pack for family and gifting.",
    image_url: "/images/pages/shop/beverage_mazoe_raspberry_6.png",
    price_cents: 449,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 10,
    slug: "mazoe-orange-2l-case-6",
    name: "Mazoe Orange 2L Case (6 Units)",
    category: "beverage",
    description: "Best-selling orange crush case pack.",
    image_url: "/images/pages/shop/beverage_mazoe_orange_6.png",
    price_cents: 449,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 11,
    slug: "mazoe-orange-2l",
    name: "Mazoe Orange 2L",
    category: "beverage",
    description: "Single bottle orange cordial.",
    image_url: "/images/pages/shop/beverage_mazoe_orange_1.png",
    price_cents: 749,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 12,
    slug: "pfuko-maheu-traditional-500ml-case-12",
    name: "Pfuko Maheu Traditional 500ml Case (12 Units)",
    category: "beverage",
    description: "Traditional maheu in a value case pack.",
    image_url: "/images/pages/shop/beverage_pfuko_12.png",
    price_cents: 191,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
    {
    id: 13,
    slug: "pfuko-maheu-traditional-500ml-1",
    name: "Pfuko Maheu Traditional 500ml 1 Unit",
    category: "beverage",
    description: "Traditional maheu in a value case pack.",
    image_url: "/images/pages/shop/beverage_pfuko_1.png",
    price_cents: 61,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
    {
    id: 14,
    slug: "cascade-orange-400ml-case-6",
    name: "Cascade Orange 500ml Case (6 Units)",
    category: "beverage",
    description: "Cascade Orange is the perfect adventure for a Dairy Fruit Mix drink.",
    image_url: "/images/pages/shop/beverage_cascade_6.png",
    price_cents: 191,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 15,
    slug: "kariba-kapenta-matemba-100g",
    name: "Kariba Kapenta (Matemba) 100g",
    category: "food",
    description: "Classic kapenta staple, premium packed.",
    image_url: "/images/pages/shop/food_kapenta_1.jpg",
    price_cents: 349,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 16,
    slug: "royco-usavi-beef-75g",
    name: "Royco Usavi Beef 75g",
    category: "food",
    description: "Flavor blend for local stews and gravies.",
    image_url: "/images/pages/shop/food_royco_beef_1.png",
    price_cents: 169,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 17,
    slug: "colcom-pork-pie-100g",
    name: "Colcom Pork Pie 100g",
    category: "food",
    description: "Ready-to-eat savory pie.",
    image_url: "/images/pages/shop/food_pork_pie_1.png",
    price_cents: 199,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 18,
    slug: "cheeky-chilli-peri-peri-sauce-100ml",
    name: "Cheeky Chilli Peri Peri Sauce 100ml",
    category: "food",
    description: "Hot peri-peri kick for grills and chips.",
    image_url: "/images/pages/shop/food_periperi_1.png",
    price_cents: 179,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 19,
    slug: "mazoe-blackberry-2l",
    name: "Mazoe Blackberry 2L",
    category: "food",
    description: "Blackberry cordial favorite.",
    image_url: "/images/pages/shop/beverage_mazoe_blackberry_1.png",
    price_cents: 249,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 20,
    slug: "mazoe-cream-soda-2l",
    name: "Mazoe Cream Soda 2L",
    category: "food",
    description: "Cream soda cordial flavor.",
    image_url: "/images/pages/shop/beverage_mazoe_creamsoda_1.png",
    price_cents: 249,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 21,
    slug: "maputi-40g",
    name: "Maputi 40g",
    category: "food",
    description: "Traditional puffed-maize snack.",
    image_url: "/images/pages/shop/food_maputi.png",
    price_cents: 99,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 22,
    slug: "lobels-lemon-creams-150g",
    name: "Lobels Lemon Creams 150g",
    category: "food",
    description: "Classic lemon cream biscuits.",
    image_url: "/images/pages/shop/food_lemoncreams_1.png",
    price_cents: 99,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 23,
    slug: "sun-jam-500g",
    name: "Sun Jam 500g",
    category: "food",
    description: "Fruit jam made from Eastern Highlands produce.",
    image_url: "/images/pages/shop/food_sunjam_1.png",
    price_cents: 179,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 24,
    slug: "madras-hot-curry-powder-100g",
    name: "Madras Hot Curry Powder 100g",
    category: "food",
    description: "Spice blend for hot curry dishes.",
    image_url: "/images/pages/shop/food_curry_hot_1.png",
    price_cents: 69,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 25,
    slug: "madras-mild-curry-powder-100g",
    name: "Madras Mild Curry Powder 100g",
    category: "food",
    description: "Mild curry spice blend.",
    image_url: "/images/pages/shop/food_curry_mild_1.png",
    price_cents: 69,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 26,
    slug: "cerevita-corn-cocoa-malt-500g",
    name: "Cerevita Corn, Cocoa & Malt 500g",
    category: "food",
    description: "Chocolate malt flavored Cerevita breakfast cereal.",
    image_url: "/images/pages/shop/food_cerevita_choco_malt_1.png",
    price_cents: 349,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
  {
    id: 27,
    slug: "cerevita-corn-wheat-500g",
    name: "Cerevita Corn & Wheat 500g",
    category: "food",
    description: "Corn and wheat Cerevita breakfast cereal.",
    image_url: "/images/pages/shop/food_cerevita_corn_wheat_1.png",
    price_cents: 349,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
    {
    id: 28,
    slug: "mama-dovi_750ml",
    name: "Mama Dovi 750ml",
    category: "food",
    description: "Mama Dovi 750ml.",
    image_url: "/images/pages/shop/food_mama_dovi_1.png",
    price_cents: 149,
    currency: "EUR",
    stock_qty: 0,
    is_active: 1,
  },
];

const memoryShopOrders: ShopOrder[] = [];
const memoryShopOrderItems: ShopOrderItem[] = [];

type RemittanceTransactionStatus = "pending" | "processing" | "completed" | "failed";
type AirtimeTransactionStatus = "pending" | "completed" | "failed";
type RemittanceRecipientType = "mobile_money" | "cash_pickup" | "visa_card";

type RemittanceTransactionRecord = {
  id: number;
  user_id: number;
  recipient_name: string;
  recipient_type: RemittanceRecipientType;
  provider: string;
  payout_channel: string | null;
  amount_sent: number;
  amount_received: number | null;
  currency_from: string;
  currency_to: string;
  exchange_rate: number | null;
  status: RemittanceTransactionStatus;
  terrapay_reference: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

type AirtimeTransactionRecord = {
  id: number;
  user_id: number;
  phone_number: string;
  operator_id: string | null;
  amount: number;
  currency: string | null;
  reloadly_reference: string | null;
  status: AirtimeTransactionStatus;
  created_at: string;
};

const memoryRemittanceTransactions: RemittanceTransactionRecord[] = [];
const memoryAirtimeTransactions: AirtimeTransactionRecord[] = [];

async function syncShopProductsSeedData(): Promise<void> {
  if (!db) return;
  for (const product of memoryShopProducts) {
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

function isTransientShopQueryError(error: unknown): boolean {
  const code = String((error as any)?.code ?? "");
  return [
    "PROTOCOL_CONNECTION_LOST",
    "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
    "PROTOCOL_ENQUEUE_AFTER_QUIT",
    "ER_LOCK_DEADLOCK",
    "ER_LOCK_WAIT_TIMEOUT",
    "ER_QUERY_TIMEOUT",
    "ECONNRESET",
    "ETIMEDOUT",
  ].includes(code);
}

function normalizeShopCategory(raw: unknown): "sports" | "crafts" | "food" {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "sports") return "sports";
  if (value === "crafts") return "crafts";
  if (value === "beverage" || value === "beverages" || value === "drink" || value === "drinks") return "food";
  return "food";
}

const SHOP_PRODUCTS_CACHE_TTL_MS = 60_000;
const SHOP_PRODUCTS_QUERY_TIMEOUT_MS = 5_000;
const shopProductsCache = new Map<string, { expiresAt: number; source: ShopProductsSource; products: any[] }>();

function getShopProductsCacheKey(categoryFilter: string) {
  return categoryFilter || "__all__";
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
      payment_method VARCHAR(40) NOT NULL,
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
  await syncEconomicStatsSeedData();
  await syncShopProductsSeedData();
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
      kyc_verified: 0 as const,
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
      kyc_verified: 0 as const,
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

export async function setUserKycVerified(userId: number, verified: boolean) {
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  const value: 0 | 1 = verified ? 1 : 0;

  if (!db) {
    const user = memoryUsers.find((entry) => entry.id === normalizedUserId);
    if (!user) return null;
    user.kyc_verified = value;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
  }

  try {
    await db.execute("UPDATE users SET kyc_verified = ? WHERE id = ?", [value, normalizedUserId]);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, full_name, email, COALESCE(kyc_verified, 0) AS kyc_verified FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      kyc_verified: Boolean(Number(row.kyc_verified ?? 0)),
    };
  } catch (error: any) {
    if (String(error?.code ?? "") === "ER_BAD_FIELD_ERROR") {
      return null;
    }
    if (!isDbConnectionError(error)) throw error;
    const user = memoryUsers.find((entry) => entry.id === normalizedUserId);
    if (!user) return null;
    user.kyc_verified = value;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
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

export async function createCareReferral(input: { userId: number | null; provider: string }) {
  const provider = String(input.provider ?? "").trim().toLowerCase();
  if (!provider) throw new Error("Provider is required.");

  const userIdRaw = input.userId;
  const userId =
    userIdRaw == null || !Number.isFinite(Number(userIdRaw))
      ? null
      : Math.max(1, Math.floor(Number(userIdRaw)));

  if (!db) {
    const record = {
      id: memoryCareReferrals.length + 1,
      user_id: userId,
      provider,
      timestamp: new Date().toISOString(),
    };
    memoryCareReferrals.push(record);
    return record;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO care_referrals (user_id, provider) VALUES (?, ?)",
      [userId, provider]
    );
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, user_id, provider, `timestamp` FROM care_referrals WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const record = {
      id: memoryCareReferrals.length + 1,
      user_id: userId,
      provider,
      timestamp: new Date().toISOString(),
    };
    memoryCareReferrals.push(record);
    return record;
  }
}

export async function createShopRestockNotification(payload: {
  productId?: number | null;
  productSlug: string;
  productName: string;
  email: string;
}) {
  const productSlug = String(payload.productSlug ?? "").trim().toLowerCase();
  const productName = String(payload.productName ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const productId =
    payload.productId == null || !Number.isFinite(Number(payload.productId))
      ? null
      : Math.max(1, Math.floor(Number(payload.productId)));

  if (!productSlug || !email || !productName) {
    throw new Error("Product and email are required.");
  }

  if (!db) {
    const existing = memoryShopRestockNotifications.find(
      (row) => row.product_slug === productSlug && row.email === email
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryShopRestockNotifications.length + 1,
      product_id: productId,
      product_slug: productSlug,
      product_name: productName,
      email,
      created_at: new Date().toISOString(),
    };
    memoryShopRestockNotifications.push(record);
    return { created: true, record };
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `
      INSERT IGNORE INTO shop_restock_notifications (product_id, product_slug, product_name, email)
      VALUES (?, ?, ?, ?)
      `,
      [productId, productSlug, productName, email]
    );

    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, product_id, product_slug, product_name, email, created_at
      FROM shop_restock_notifications
      WHERE product_slug = ? AND email = ?
      LIMIT 1
      `,
      [productSlug, email]
    );

    return {
      created: Number(result.affectedRows ?? 0) > 0,
      record: rows[0] ?? null,
    };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;

    const existing = memoryShopRestockNotifications.find(
      (row) => row.product_slug === productSlug && row.email === email
    );
    if (existing) return { created: false, record: existing };

    const record = {
      id: memoryShopRestockNotifications.length + 1,
      product_id: productId,
      product_slug: productSlug,
      product_name: productName,
      email,
      created_at: new Date().toISOString(),
    };
    memoryShopRestockNotifications.push(record);
    return { created: true, record };
  }
}

export async function getShopRestockNotifications() {
  if (!db) {
    return [...memoryShopRestockNotifications].sort((a, b) => b.id - a.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, product_id, product_slug, product_name, email, created_at
      FROM shop_restock_notifications
      ORDER BY id DESC
      LIMIT 1000
      `
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...memoryShopRestockNotifications].sort((a, b) => b.id - a.id);
  }
}

export async function getShopRestockNotificationsBySlug(productSlug: string) {
  const slug = String(productSlug ?? "").trim().toLowerCase();
  if (!slug) return [];

  if (!db) {
    return memoryShopRestockNotifications
      .filter((row) => row.product_slug === slug)
      .sort((a, b) => b.id - a.id);
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, product_id, product_slug, product_name, email, created_at
      FROM shop_restock_notifications
      WHERE product_slug = ?
      ORDER BY id DESC
      LIMIT 1000
      `,
      [slug]
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryShopRestockNotifications
      .filter((row) => row.product_slug === slug)
      .sort((a, b) => b.id - a.id);
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

export async function listShopProducts(category?: string): Promise<ShopProductsResult> {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  const categoryFilter = normalizedCategory && ["sports", "crafts", "food"].includes(normalizedCategory)
    ? normalizedCategory
    : "";
  const cacheKey = getShopProductsCacheKey(categoryFilter);
  const cachedEntry = shopProductsCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return { products: cachedEntry.products, source: cachedEntry.source, cached: true };
  }

  const finalizeProducts = (rows: any[]) =>
    rows.map((row) => ({
      ...row,
      category: normalizeShopCategory(row.category),
    }));

  if (!db) {
    const rows = memoryShopProducts.filter((product) => {
      if (product.is_active !== 1) return false;
      if (categoryFilter && normalizeShopCategory(product.category) !== categoryFilter) return false;
      return true;
    });
    const normalizedRows = finalizeProducts(rows);
    shopProductsCache.set(cacheKey, {
      expiresAt: Date.now() + SHOP_PRODUCTS_CACHE_TTL_MS,
      source: "memory",
      products: normalizedRows,
    });
    return { products: normalizedRows, source: "memory", cached: false };
  }

  const runQuery = async () => {
    if (categoryFilter) {
      const queryPromise = db.query<mysql.RowDataPacket[]>(
        `
        SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
        FROM shop_products
        WHERE is_active = 1
          AND (
            LOWER(category) = ?
            OR (? = 'food' AND LOWER(category) IN ('beverage', 'beverages', 'drink', 'drinks'))
          )
        ORDER BY id ASC
        `,
        [categoryFilter, categoryFilter]
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("Shop products query timed out"), { code: "ER_QUERY_TIMEOUT" })), SHOP_PRODUCTS_QUERY_TIMEOUT_MS)
      );
      const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as [mysql.RowDataPacket[], any];
      return rows;
    }
    const queryPromise = db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
      FROM shop_products
      WHERE is_active = 1
      ORDER BY id ASC
      `
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("Shop products query timed out"), { code: "ER_QUERY_TIMEOUT" })), SHOP_PRODUCTS_QUERY_TIMEOUT_MS)
    );
    const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as [mysql.RowDataPacket[], any];
    return rows;
  };

  try {
    let rows: mysql.RowDataPacket[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rows = await runQuery();
        break;
      } catch (error) {
        const canRetry = attempt === 0 && isTransientShopQueryError(error);
        if (!canRetry) throw error;
      }
    }
    const normalizedRows = finalizeProducts(rows);
    shopProductsCache.set(cacheKey, {
      expiresAt: Date.now() + SHOP_PRODUCTS_CACHE_TTL_MS,
      source: "db",
      products: normalizedRows,
    });
    return { products: normalizedRows, source: "db", cached: false };
  } catch (error) {
    if (!isDbConnectionError(error) && !isTransientShopQueryError(error)) throw error;
    const rows = memoryShopProducts.filter((product) => {
      if (product.is_active !== 1) return false;
      if (categoryFilter && normalizeShopCategory(product.category) !== categoryFilter) return false;
      return true;
    });
    const normalizedRows = finalizeProducts(rows);
    shopProductsCache.set(cacheKey, {
      expiresAt: Date.now() + SHOP_PRODUCTS_CACHE_TTL_MS,
      source: "memory",
      products: normalizedRows,
    });
    return { products: normalizedRows, source: "memory", cached: false };
  }
}

export async function createShopOrder(payload: {
  customerName: string;
  customerEmail: string;
  shippingCountry: string;
  shippingCity: string;
  shippingAddress: string;
  paymentMethod: ShopPaymentMethod;
  items: Array<{ productId: number; quantity: number }>;
}) {
  const customerName = payload.customerName.trim();
  const customerEmail = payload.customerEmail.trim().toLowerCase();
  const shippingCountry = payload.shippingCountry.trim();
  const shippingCity = payload.shippingCity.trim();
  const shippingAddress = payload.shippingAddress.trim();
  const paymentMethod = payload.paymentMethod;
  const items = payload.items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);

  if (!customerName || !customerEmail || !shippingCountry || !shippingCity || !shippingAddress) {
    throw new Error("Missing customer or shipping fields.");
  }
  const allowedPaymentMethods =
    process.env.NODE_ENV === "production"
      ? ["stripe", "paypal", "amazon_pay"]
      : ["stripe", "paypal", "amazon_pay", "dummy_gateway"];
  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Unsupported payment method.");
  }
  if (items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const orderRef = `Diaspora Unlocked-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  if (!db) {
    const selectedProducts = items.map((item) => {
      const product = memoryShopProducts.find((p) => p.id === item.productId && p.is_active === 1);
      if (!product) throw new Error("A product is unavailable.");
      if (product.stock_qty < item.quantity) throw new Error(`Insufficient stock for ${product.name}.`);
      return { product, quantity: item.quantity };
    });

    const subtotalCents = selectedProducts.reduce((sum, entry) => sum + entry.product.price_cents * entry.quantity, 0);
    const shippingCents = subtotalCents >= 7500 ? 0 : 1200;
    const totalCents = subtotalCents + shippingCents;
    const currency = selectedProducts[0]?.product.currency ?? "EUR";

    const orderId = memoryShopOrders.length + 1;
    const now = new Date().toISOString();
    const order: ShopOrder = {
      id: orderId,
      order_ref: orderRef,
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_country: shippingCountry,
      shipping_city: shippingCity,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      payment_reference: null,
      status: "awaiting_payment",
      currency,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      created_at: now,
      updated_at: now,
    };
    memoryShopOrders.unshift(order);

    for (const entry of selectedProducts) {
      entry.product.stock_qty = Math.max(0, entry.product.stock_qty - entry.quantity);
      const lineTotal = entry.product.price_cents * entry.quantity;
      memoryShopOrderItems.push({
        id: memoryShopOrderItems.length + 1,
        order_id: orderId,
        product_id: entry.product.id,
        product_name: entry.product.name,
        unit_price_cents: entry.product.price_cents,
        quantity: entry.quantity,
        line_total_cents: lineTotal,
      });
    }

    return {
      orderRef: order.order_ref,
      status: order.status,
      paymentMethod: order.payment_method,
      currency: order.currency,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
    };
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const productIds = items.map((item) => item.productId);
    const placeholders = productIds.map(() => "?").join(",");
    const [productRows] = await conn.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
      FROM shop_products
      WHERE id IN (${placeholders})
      FOR UPDATE
      `,
      productIds
    );
    const productsById = new Map(productRows.map((row) => [Number(row.id), row]));

    const selectedProducts = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product || Number(product.is_active) !== 1) {
        throw new Error("A product is unavailable.");
      }
      if (Number(product.stock_qty) < item.quantity) {
        throw new Error(`Insufficient stock for ${String(product.name)}.`);
      }
      return { product, quantity: item.quantity };
    });

    const subtotalCents = selectedProducts.reduce(
      (sum, entry) => sum + Number(entry.product.price_cents) * entry.quantity,
      0
    );
    const shippingCents = subtotalCents >= 7500 ? 0 : 1200;
    const totalCents = subtotalCents + shippingCents;
    const currency = String(selectedProducts[0]?.product.currency ?? "EUR");

    const [orderResult] = await conn.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO shop_orders
      (order_ref, customer_name, customer_email, shipping_country, shipping_city, shipping_address, payment_method, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'awaiting_payment', ?, ?, ?, ?)
      `,
      [
        orderRef,
        customerName,
        customerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        paymentMethod,
        currency,
        subtotalCents,
        shippingCents,
        totalCents,
      ]
    );

    const orderId = Number(orderResult.insertId);
    for (const entry of selectedProducts) {
      const lineTotal = Number(entry.product.price_cents) * entry.quantity;
      await conn.execute(
        `
        INSERT INTO shop_order_items (order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          Number(entry.product.id),
          String(entry.product.name),
          Number(entry.product.price_cents),
          entry.quantity,
          lineTotal,
        ]
      );
      await conn.execute("UPDATE shop_products SET stock_qty = stock_qty - ? WHERE id = ?", [
        entry.quantity,
        Number(entry.product.id),
      ]);
    }

    await conn.commit();
    return {
      orderRef,
      status: "awaiting_payment" as ShopOrderStatus,
      paymentMethod,
      currency,
      subtotalCents,
      shippingCents,
      totalCents,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getShopOrderByRef(orderRef: string) {
  const ref = orderRef.trim();
  if (!ref) return null;

  if (!db) {
    const order = memoryShopOrders.find((row) => row.order_ref === ref);
    if (!order) return null;
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    return { ...order, items };
  }

  try {
    const [orderRows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_ref, customer_name, customer_email, shipping_country, shipping_city, shipping_address, payment_method, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents, created_at, updated_at
      FROM shop_orders
      WHERE order_ref = ?
      LIMIT 1
      `,
      [ref]
    );
    const order = orderRows[0];
    if (!order) return null;
    const [itemRows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents
      FROM shop_order_items
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [Number(order.id)]
    );
    return { ...order, items: itemRows };
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const order = memoryShopOrders.find((row) => row.order_ref === ref);
    if (!order) return null;
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    return { ...order, items };
  }
}

export async function confirmShopOrderPayment(orderRef: string, paymentReference: string) {
  const ref = orderRef.trim();
  const paymentRef = paymentReference.trim() || `SIM-${Date.now()}`;
  if (!ref) return null;

  if (!db) {
    const order = memoryShopOrders.find((row) => row.order_ref === ref);
    if (!order) return null;
    order.status = "paid";
    order.payment_reference = paymentRef;
    order.updated_at = new Date().toISOString();
    return order;
  }

  try {
    await db.execute(
      `
      UPDATE shop_orders
      SET status = 'paid', payment_reference = ?, updated_at = NOW()
      WHERE order_ref = ?
      `,
      [paymentRef, ref]
    );
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_ref, customer_name, customer_email, shipping_country, shipping_city, shipping_address, payment_method, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents, created_at, updated_at
      FROM shop_orders
      WHERE order_ref = ?
      LIMIT 1
      `,
      [ref]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const order = memoryShopOrders.find((row) => row.order_ref === ref);
    if (!order) return null;
    order.status = "paid";
    order.payment_reference = paymentRef;
    order.updated_at = new Date().toISOString();
    return order;
  }
}

export async function getShopProductsAdmin() {
  if (!db) {
    return [...memoryShopProducts].sort((a, b) => b.id - a.id);
  }
  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active, created_at, updated_at
      FROM shop_products
      ORDER BY id DESC
      `
    );
    return rows;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return [...memoryShopProducts].sort((a, b) => b.id - a.id);
  }
}

export async function getShopProductById(id: number) {
  const productId = Math.floor(Number(id));
  if (!Number.isFinite(productId) || productId <= 0) return null;

  if (!db) {
    return memoryShopProducts.find((item) => item.id === productId) ?? null;
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
      FROM shop_products
      WHERE id = ?
      LIMIT 1
      `,
      [productId]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    return memoryShopProducts.find((item) => item.id === productId) ?? null;
  }
}

export async function createShopProductAdmin(payload: {
  slug: string;
  name: string;
  category: "sports" | "crafts" | "food";
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
  is_active: 0 | 1;
}) {
  if (!db) {
    const row: ShopProduct = {
      id: memoryShopProducts.length + 1,
      ...payload,
    };
    memoryShopProducts.unshift(row);
    return row;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO shop_products (slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.slug,
        payload.name,
        payload.category,
        payload.description,
        payload.image_url,
        payload.price_cents,
        payload.currency,
        payload.stock_qty,
        payload.is_active,
      ]
    );
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active FROM shop_products WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const row: ShopProduct = {
      id: memoryShopProducts.length + 1,
      ...payload,
    };
    memoryShopProducts.unshift(row);
    return row;
  }
}

export async function updateShopProductAdmin(
  id: number,
  payload: Partial<{
    slug: string;
    name: string;
    category: "sports" | "crafts" | "food";
    description: string;
    image_url: string;
    price_cents: number;
    currency: string;
    stock_qty: number;
    is_active: 0 | 1;
  }>
) {
  if (!db) {
    const idx = memoryShopProducts.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memoryShopProducts[idx] = { ...memoryShopProducts[idx], ...payload } as ShopProduct;
    return memoryShopProducts[idx];
  }

  try {
    const updates: string[] = [];
    const params: any[] = [];
    const pushIf = (key: keyof typeof payload, column = key) => {
      if (payload[key] !== undefined) {
        updates.push(`${String(column)} = ?`);
        params.push(payload[key]);
      }
    };
    pushIf("slug");
    pushIf("name");
    pushIf("category");
    pushIf("description");
    pushIf("image_url");
    pushIf("price_cents");
    pushIf("currency");
    pushIf("stock_qty");
    pushIf("is_active");

    if (updates.length === 0) return null;
    params.push(id);
    await db.execute(`UPDATE shop_products SET ${updates.join(", ")} WHERE id = ?`, params);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active FROM shop_products WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const idx = memoryShopProducts.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memoryShopProducts[idx] = { ...memoryShopProducts[idx], ...payload } as ShopProduct;
    return memoryShopProducts[idx];
  }
}

export async function deleteShopProductAdmin(id: number) {
  if (!db) {
    const idx = memoryShopProducts.findIndex((item) => item.id === id);
    if (idx < 0) return false;
    memoryShopProducts.splice(idx, 1);
    return true;
  }
  try {
    const [result] = await db.execute<mysql.ResultSetHeader>("DELETE FROM shop_products WHERE id = ?", [id]);
    return Number(result.affectedRows ?? 0) > 0;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const idx = memoryShopProducts.findIndex((item) => item.id === id);
    if (idx < 0) return false;
    memoryShopProducts.splice(idx, 1);
    return true;
  }
}

export async function getUserFinancialProfile(userId: number): Promise<{
  id: number;
  full_name: string;
  email: string;
  kyc_verified: boolean;
} | null> {
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    const user = memoryUsers.find((row) => row.id === normalizedUserId);
    if (!user) return null;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
  }

  try {
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, full_name, email, COALESCE(kyc_verified, 0) AS kyc_verified
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [normalizedUserId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      kyc_verified: Boolean(Number(row.kyc_verified ?? 0)),
    };
  } catch (error: any) {
    if (String(error?.code ?? "") === "ER_BAD_FIELD_ERROR") {
      const [rows] = await db.query<mysql.RowDataPacket[]>(
        `
        SELECT id, full_name, email
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [normalizedUserId]
      );
      const row = rows[0];
      if (!row) return null;
      return {
        id: Number(row.id),
        full_name: String(row.full_name ?? ""),
        email: String(row.email ?? ""),
        kyc_verified: false,
      };
    }
    if (!isDbConnectionError(error)) throw error;
    const user = memoryUsers.find((row) => row.id === normalizedUserId);
    if (!user) return null;
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      kyc_verified: Boolean(user.kyc_verified),
    };
  }
}

export async function createRemittanceTransactionRecord(input: {
  userId: number;
  recipientName: string;
  recipientType: RemittanceRecipientType;
  provider: string;
  payoutChannel: string | null;
  amountSent: number;
  amountReceived: number | null;
  currencyFrom: string;
  currencyTo: string;
  exchangeRate: number | null;
  status: RemittanceTransactionStatus;
  terrapayReference: string | null;
  idempotencyKey: string;
}, connection?: mysql.PoolConnection) {
  if (!db) {
    const duplicate = memoryRemittanceTransactions.find(
      (entry) =>
        entry.user_id === input.userId &&
        String(entry.idempotency_key ?? "").trim() === String(input.idempotencyKey ?? "").trim()
    );
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const row: RemittanceTransactionRecord = {
      id: memoryRemittanceTransactions.length + 1,
      user_id: input.userId,
      recipient_name: input.recipientName,
      recipient_type: input.recipientType,
      provider: input.provider,
      payout_channel: input.payoutChannel,
      amount_sent: input.amountSent,
      amount_received: input.amountReceived,
      currency_from: input.currencyFrom,
      currency_to: input.currencyTo,
      exchange_rate: input.exchangeRate,
      status: input.status,
      terrapay_reference: input.terrapayReference,
      idempotency_key: input.idempotencyKey,
      created_at: now,
      updated_at: now,
    };
    memoryRemittanceTransactions.push(row);
    return row;
  }

  const conn = connection ?? (await db.getConnection());
  const ownsConnection = !connection;
  try {
    if (ownsConnection) {
      await conn.query("START TRANSACTION");
    }

    const [existingRows] = await conn.query<mysql.RowDataPacket[]>(
      `
      SELECT *
      FROM remittance_transactions
      WHERE user_id = ? AND idempotency_key = ?
      LIMIT 1
      `,
      [input.userId, input.idempotencyKey]
    );
    if (existingRows[0]) {
      if (ownsConnection) {
        await conn.query("COMMIT");
      }
      return existingRows[0];
    }

    const [inserted] = await conn.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO remittance_transactions
      (user_id, recipient_name, recipient_type, provider, payout_channel, amount_sent, amount_received, currency_from, currency_to, exchange_rate, status, terrapay_reference, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.recipientName,
        input.recipientType,
        input.provider,
        input.payoutChannel,
        input.amountSent,
        input.amountReceived,
        input.currencyFrom,
        input.currencyTo,
        input.exchangeRate,
        input.status,
        input.terrapayReference,
        input.idempotencyKey,
      ]
    );

    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT * FROM remittance_transactions WHERE id = ? LIMIT 1",
      [Number(inserted.insertId)]
    );

    if (ownsConnection) {
      await conn.query("COMMIT");
    }
    return rows[0] ?? null;
  } catch (error) {
    if (ownsConnection) {
      await conn.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsConnection) {
      conn.release();
    }
  }
}

export async function getRemittanceTransactionById(transactionId: number, userId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    return (
      memoryRemittanceTransactions.find(
        (entry) => entry.id === normalizedId && entry.user_id === normalizedUserId
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM remittance_transactions WHERE id = ? AND user_id = ? LIMIT 1",
    [normalizedId, normalizedUserId]
  );
  return rows[0] ?? null;
}

export async function getRemittanceTransactionByIdempotencyKey(userId: number, idempotencyKey: string) {
  const normalizedUserId = Math.floor(Number(userId));
  const normalizedKey = String(idempotencyKey ?? "").trim();
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;
  if (!normalizedKey) return null;

  if (!db) {
    return (
      memoryRemittanceTransactions.find(
        (entry) =>
          entry.user_id === normalizedUserId &&
          String(entry.idempotency_key ?? "").trim() === normalizedKey
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
    SELECT *
    FROM remittance_transactions
    WHERE user_id = ? AND idempotency_key = ?
    LIMIT 1
    `,
    [normalizedUserId, normalizedKey]
  );

  return rows[0] ?? null;
}

export async function createAirtimeTransactionRecord(input: {
  userId: number;
  phoneNumber: string;
  operatorId: string | null;
  amount: number;
  currency: string | null;
  reloadlyReference: string | null;
  status: AirtimeTransactionStatus;
}, connection?: mysql.PoolConnection) {
  if (!db) {
    const row: AirtimeTransactionRecord = {
      id: memoryAirtimeTransactions.length + 1,
      user_id: input.userId,
      phone_number: input.phoneNumber,
      operator_id: input.operatorId,
      amount: input.amount,
      currency: input.currency,
      reloadly_reference: input.reloadlyReference,
      status: input.status,
      created_at: new Date().toISOString(),
    };
    memoryAirtimeTransactions.push(row);
    return row;
  }

  const conn = connection ?? (await db.getConnection());
  const ownsConnection = !connection;
  try {
    if (ownsConnection) {
      await conn.query("START TRANSACTION");
    }

    const [inserted] = await conn.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO airtime_transactions
      (user_id, phone_number, operator_id, amount, currency, reloadly_reference, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.phoneNumber,
        input.operatorId,
        input.amount,
        input.currency,
        input.reloadlyReference,
        input.status,
      ]
    );

    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT * FROM airtime_transactions WHERE id = ? LIMIT 1",
      [Number(inserted.insertId)]
    );
    if (ownsConnection) {
      await conn.query("COMMIT");
    }
    return rows[0] ?? null;
  } catch (error) {
    if (ownsConnection) {
      await conn.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsConnection) {
      conn.release();
    }
  }
}

export async function getAirtimeTransactionById(transactionId: number, userId: number) {
  const normalizedId = Math.floor(Number(transactionId));
  const normalizedUserId = Math.floor(Number(userId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return null;

  if (!db) {
    return (
      memoryAirtimeTransactions.find(
        (entry) => entry.id === normalizedId && entry.user_id === normalizedUserId
      ) ?? null
    );
  }

  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT * FROM airtime_transactions WHERE id = ? AND user_id = ? LIMIT 1",
    [normalizedId, normalizedUserId]
  );
  return rows[0] ?? null;
}
