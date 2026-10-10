import crypto from "crypto";
import type mysql from "mysql2/promise";
import { cloneShopSeedProducts } from "../../../shared/shopCatalog";
import { db, isDbConnectionError, isTransientShopQueryError } from "../databaseRuntime";
import { sha256 } from "./authStore";

export type ShopPaymentMethod = "manual_assisted" | "dummy_gateway";
export type ShopOrderStatus = "awaiting_payment" | "paid" | "failed";
export type ShopDeliverySpeed = "normal" | "express";
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
  category: "sports" | "crafts" | "food" | "beverage";
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
  delivery_speed: ShopDeliverySpeed;
  payment_method: ShopPaymentMethod;
  manage_token_hash: string;
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

const SHOP_FREE_SHIPPING_THRESHOLD_CENTS = 7_500;
const SHOP_BASE_SHIPPING_CENTS = 1_200;
const SHOP_EXPRESS_SURCHARGE_CENTS = 800;
const SHOP_PRODUCTS_CACHE_TTL_MS = 60_000;
const SHOP_PRODUCTS_QUERY_TIMEOUT_MS = 5_000;

function normalizeDeliverySpeed(raw: unknown): ShopDeliverySpeed {
  return String(raw ?? "").trim().toLowerCase() === "express" ? "express" : "normal";
}

function calculateShopShippingCents(subtotalCents: number, deliverySpeed: ShopDeliverySpeed): number {
  if (subtotalCents <= 0) return 0;
  const baseShippingCents = subtotalCents >= SHOP_FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHOP_BASE_SHIPPING_CENTS;
  const expressSurchargeCents = deliverySpeed === "express" ? SHOP_EXPRESS_SURCHARGE_CENTS : 0;
  return baseShippingCents + expressSurchargeCents;
}

function createOrderReference(): string {
  return `DU-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

function createOrderAccessGrant() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: sha256(token),
  };
}

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeShopCategory(raw: unknown): "sports" | "crafts" | "food" {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "sports") return "sports";
  if (value === "crafts") return "crafts";
  if (value === "beverage" || value === "beverages" || value === "drink" || value === "drinks") return "food";
  return "food";
}

function toPublicShopOrder(order: Partial<ShopOrder> & Record<string, unknown>, items?: Array<Record<string, unknown>>) {
  return {
    orderRef: String(order.order_ref ?? ""),
    status: String(order.status ?? "awaiting_payment"),
    paymentMethod: String(order.payment_method ?? "manual_assisted"),
    paymentReference: order.payment_reference ? String(order.payment_reference) : null,
    currency: String(order.currency ?? "EUR"),
    subtotalCents: Number(order.subtotal_cents ?? 0),
    shippingCents: Number(order.shipping_cents ?? 0),
    totalCents: Number(order.total_cents ?? 0),
    deliverySpeed: normalizeDeliverySpeed(order.delivery_speed),
    createdAt: order.created_at ?? null,
    updatedAt: order.updated_at ?? null,
    items:
      items?.map((item) => ({
        id: Number(item.id ?? 0),
        productId: Number(item.product_id ?? 0),
        productName: String(item.product_name ?? ""),
        unitPriceCents: Number(item.unit_price_cents ?? 0),
        quantity: Number(item.quantity ?? 0),
        lineTotalCents: Number(item.line_total_cents ?? 0),
      })) ?? [],
  };
}

export const shopSeedProducts: ShopProduct[] = cloneShopSeedProducts();

const memoryShopOrders: ShopOrder[] = [];
const memoryShopOrderItems: ShopOrderItem[] = [];
const memoryShopRestockNotifications: Array<{
  id: number;
  product_id: number | null;
  product_slug: string;
  product_name: string;
  email: string;
  created_at: string;
}> = [];
const shopProductsCache = new Map<string, { expiresAt: number; source: ShopProductsSource; products: any[] }>();

function getShopProductsCacheKey(categoryFilter: string) {
  return categoryFilter || "__all__";
}

function getMemoryProductById(productId: number) {
  return shopSeedProducts.find((product) => product.id === productId);
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

  if (!productSlug || !productName || !email) {
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
    return [...memoryShopRestockNotifications].sort((left, right) => right.id - left.id);
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
    return [...memoryShopRestockNotifications].sort((left, right) => right.id - left.id);
  }
}

export async function getShopRestockNotificationsBySlug(productSlug: string) {
  const slug = String(productSlug ?? "").trim().toLowerCase();
  if (!slug) return [];

  if (!db) {
    return memoryShopRestockNotifications
      .filter((row) => row.product_slug === slug)
      .sort((left, right) => right.id - left.id);
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
      .sort((left, right) => right.id - left.id);
  }
}

export async function listShopProducts(category?: string): Promise<ShopProductsResult> {
  const pool = db;
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  const categoryFilter =
    normalizedCategory && ["sports", "crafts", "food"].includes(normalizedCategory) ? normalizedCategory : "";
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

  if (!pool) {
    const rows = shopSeedProducts.filter((product) => {
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
      const queryPromise = pool.query<mysql.RowDataPacket[]>(
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
      const timeoutPromise = new Promise<never>((_resolve, reject) =>
        setTimeout(
          () => reject(Object.assign(new Error("Shop products query timed out"), { code: "ER_QUERY_TIMEOUT" })),
          SHOP_PRODUCTS_QUERY_TIMEOUT_MS
        )
      );
      const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as [mysql.RowDataPacket[], any];
      return rows;
    }

    const queryPromise = pool.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
      FROM shop_products
      WHERE is_active = 1
      ORDER BY id ASC
      `
    );
    const timeoutPromise = new Promise<never>((_resolve, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error("Shop products query timed out"), { code: "ER_QUERY_TIMEOUT" })),
        SHOP_PRODUCTS_QUERY_TIMEOUT_MS
      )
    );
    const [rows] = (await Promise.race([queryPromise, timeoutPromise])) as [mysql.RowDataPacket[], any];
    return rows;
  };

  try {
    let rows: mysql.RowDataPacket[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
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
    const rows = shopSeedProducts.filter((product) => {
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
  deliverySpeed?: ShopDeliverySpeed;
  paymentMethod: ShopPaymentMethod;
  items: Array<{ productId: number; quantity: number }>;
}) {
  const customerName = payload.customerName.trim();
  const customerEmail = payload.customerEmail.trim().toLowerCase();
  const shippingCountry = payload.shippingCountry.trim();
  const shippingCity = payload.shippingCity.trim();
  const shippingAddress = payload.shippingAddress.trim();
  const deliverySpeed = normalizeDeliverySpeed(payload.deliverySpeed);
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
  if (!isValidEmailAddress(customerEmail)) {
    throw new Error("A valid customer email address is required.");
  }

  const allowedPaymentMethods =
    (process.env.NODE_ENV ?? "development").toLowerCase() === "production"
      ? ["manual_assisted"]
      : ["manual_assisted", "dummy_gateway"];
  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw new Error("Unsupported payment method.");
  }
  if (items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const orderRef = createOrderReference();
  const accessGrant = createOrderAccessGrant();

  if (!db) {
    const selectedProducts = items.map((item) => {
      const product = getMemoryProductById(item.productId);
      if (!product || product.is_active !== 1) throw new Error("A product is unavailable.");
      if (product.stock_qty < item.quantity) throw new Error(`Insufficient stock for ${product.name}.`);
      return { product, quantity: item.quantity };
    });

    const subtotalCents = selectedProducts.reduce(
      (sum, entry) => sum + entry.product.price_cents * entry.quantity,
      0
    );
    const shippingCents = calculateShopShippingCents(subtotalCents, deliverySpeed);
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
      delivery_speed: deliverySpeed,
      payment_method: paymentMethod,
      manage_token_hash: accessGrant.tokenHash,
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
      deliverySpeed: order.delivery_speed,
      manageToken: accessGrant.token,
    };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const productIds = items.map((item) => item.productId);
    const placeholders = productIds.map(() => "?").join(",");
    const [productRows] = await connection.query<mysql.RowDataPacket[]>(
      `
      SELECT id, slug, name, category, description, image_url, price_cents, currency, stock_qty, is_active
      FROM shop_products
      WHERE id IN (${placeholders})
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
    const shippingCents = calculateShopShippingCents(subtotalCents, deliverySpeed);
    const totalCents = subtotalCents + shippingCents;
    const currency = String(selectedProducts[0]?.product.currency ?? "EUR");

    const [orderResult] = await connection.execute<mysql.ResultSetHeader>(
      `
      INSERT INTO shop_orders
      (order_ref, customer_name, customer_email, shipping_country, shipping_city, shipping_address, delivery_speed, payment_method, manage_token_hash, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'awaiting_payment', ?, ?, ?, ?)
      `,
      [
        orderRef,
        customerName,
        customerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        deliverySpeed,
        paymentMethod,
        accessGrant.tokenHash,
        currency,
        subtotalCents,
        shippingCents,
        totalCents,
      ]
    );

    const orderId = Number(orderResult.insertId);
    for (const entry of selectedProducts) {
      const lineTotal = Number(entry.product.price_cents) * entry.quantity;
      await connection.execute(
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
    }

    await connection.commit();
    return {
      orderRef,
      status: "awaiting_payment" as ShopOrderStatus,
      paymentMethod,
      currency,
      subtotalCents,
      shippingCents,
      totalCents,
      deliverySpeed,
      manageToken: accessGrant.token,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getShopOrderByRef(orderRef: string, manageToken: string) {
  const ref = orderRef.trim();
  const normalizedManageToken = manageToken.trim();
  if (!ref || !normalizedManageToken) return null;
  const manageTokenHash = sha256(normalizedManageToken);

  if (!db) {
    const order = memoryShopOrders.find(
      (row) => row.order_ref === ref && row.manage_token_hash === manageTokenHash
    );
    if (!order) return null;
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    return toPublicShopOrder(order, items);
  }

  try {
    const [orderRows] = await db.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_ref, delivery_speed, payment_method, manage_token_hash, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents, created_at, updated_at
      FROM shop_orders
      WHERE order_ref = ? AND manage_token_hash = ?
      LIMIT 1
      `,
      [ref, manageTokenHash]
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
    return toPublicShopOrder(order, itemRows);
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const order = memoryShopOrders.find(
      (row) => row.order_ref === ref && row.manage_token_hash === manageTokenHash
    );
    if (!order) return null;
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    return toPublicShopOrder(order, items);
  }
}

export async function confirmShopOrderPayment(orderRef: string, paymentReference: string, manageToken: string) {
  const ref = orderRef.trim();
  const normalizedManageToken = manageToken.trim();
  const paymentRef = paymentReference.trim() || `SIM-${Date.now()}`;
  if (!ref || !normalizedManageToken) return null;
  const manageTokenHash = sha256(normalizedManageToken);

  if (!db) {
    const order = memoryShopOrders.find(
      (row) => row.order_ref === ref && row.manage_token_hash === manageTokenHash
    );
    if (!order) return null;
    if (order.payment_method !== "dummy_gateway") {
      throw new Error("Assisted checkout orders cannot be auto-confirmed.");
    }
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    if (order.status === "paid") {
      return toPublicShopOrder(order, items);
    }
    for (const item of items) {
      const product = getMemoryProductById(item.product_id);
      if (!product || product.is_active !== 1) {
        throw new Error("A product is unavailable.");
      }
      if (product.stock_qty < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }
    }
    for (const item of items) {
      const product = getMemoryProductById(item.product_id);
      if (product) {
        product.stock_qty = Math.max(0, product.stock_qty - item.quantity);
      }
    }
    order.status = "paid";
    order.payment_reference = paymentRef;
    order.updated_at = new Date().toISOString();
    return toPublicShopOrder(order, items);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_ref, delivery_speed, payment_method, manage_token_hash, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents, created_at, updated_at
      FROM shop_orders
      WHERE order_ref = ? AND manage_token_hash = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ref, manageTokenHash]
    );
    const existing = existingRows[0];
    if (!existing) return null;
    if (String(existing.payment_method) !== "dummy_gateway") {
      throw new Error("Assisted checkout orders cannot be auto-confirmed.");
    }
    const [itemRows] = await connection.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents
      FROM shop_order_items
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [Number(existing.id)]
    );

    if (String(existing.status) !== "paid") {
      const productIds = Array.from(
        new Set(itemRows.map((row) => Number(row.product_id)).filter((id) => id > 0))
      );
      if (productIds.length === 0) {
        throw new Error("Order has no items.");
      }
      const placeholders = productIds.map(() => "?").join(",");
      const [productRows] = await connection.query<mysql.RowDataPacket[]>(
        `
        SELECT id, name, stock_qty, is_active
        FROM shop_products
        WHERE id IN (${placeholders})
        FOR UPDATE
        `,
        productIds
      );
      const productsById = new Map(productRows.map((row) => [Number(row.id), row]));
      for (const item of itemRows) {
        const product = productsById.get(Number(item.product_id));
        if (!product || Number(product.is_active) !== 1) {
          throw new Error("A product is unavailable.");
        }
        if (Number(product.stock_qty) < Number(item.quantity)) {
          throw new Error(`Insufficient stock for ${String(product.name)}.`);
        }
      }
      for (const item of itemRows) {
        await connection.execute("UPDATE shop_products SET stock_qty = stock_qty - ? WHERE id = ?", [
          Number(item.quantity),
          Number(item.product_id),
        ]);
      }
      await connection.execute(
        `
        UPDATE shop_orders
        SET status = 'paid', payment_reference = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [paymentRef, Number(existing.id)]
      );
    }

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `
      SELECT id, order_ref, delivery_speed, payment_method, manage_token_hash, payment_reference, status, currency, subtotal_cents, shipping_cents, total_cents, created_at, updated_at
      FROM shop_orders
      WHERE id = ?
      LIMIT 1
      `,
      [Number(existing.id)]
    );
    const order = rows[0];
    if (!order) return null;
    await connection.commit();
    return toPublicShopOrder(order, itemRows);
  } catch (error) {
    await connection.rollback();
    if (!isDbConnectionError(error)) throw error;
    const order = memoryShopOrders.find(
      (row) => row.order_ref === ref && row.manage_token_hash === manageTokenHash
    );
    if (!order) return null;
    if (order.payment_method !== "dummy_gateway") {
      throw new Error("Assisted checkout orders cannot be auto-confirmed.");
    }
    const items = memoryShopOrderItems.filter((row) => row.order_id === order.id);
    if (order.status === "paid") {
      return toPublicShopOrder(order, items);
    }
    for (const item of items) {
      const product = getMemoryProductById(item.product_id);
      if (!product || product.is_active !== 1) {
        throw new Error("A product is unavailable.");
      }
      if (product.stock_qty < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }
    }
    for (const item of items) {
      const product = getMemoryProductById(item.product_id);
      if (product) {
        product.stock_qty = Math.max(0, product.stock_qty - item.quantity);
      }
    }
    order.status = "paid";
    order.payment_reference = paymentRef;
    order.updated_at = new Date().toISOString();
    return toPublicShopOrder(order, items);
  } finally {
    connection.release();
  }
}

export async function getShopProductsAdmin() {
  if (!db) {
    return [...shopSeedProducts].sort((left, right) => right.id - left.id);
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
    return [...shopSeedProducts].sort((left, right) => right.id - left.id);
  }
}

export async function getShopProductById(id: number) {
  const productId = Math.floor(Number(id));
  if (!Number.isFinite(productId) || productId <= 0) return null;

  if (!db) {
    return getMemoryProductById(productId) ?? null;
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
    return getMemoryProductById(productId) ?? null;
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
      id: shopSeedProducts.length + 1,
      ...payload,
    };
    shopSeedProducts.unshift(row);
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
      id: shopSeedProducts.length + 1,
      ...payload,
    };
    shopSeedProducts.unshift(row);
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
    const index = shopSeedProducts.findIndex((item) => item.id === id);
    if (index < 0) return null;
    shopSeedProducts[index] = { ...shopSeedProducts[index], ...payload } as ShopProduct;
    return shopSeedProducts[index];
  }

  try {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
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
    const index = shopSeedProducts.findIndex((item) => item.id === id);
    if (index < 0) return null;
    shopSeedProducts[index] = { ...shopSeedProducts[index], ...payload } as ShopProduct;
    return shopSeedProducts[index];
  }
}

export async function deleteShopProductAdmin(id: number) {
  if (!db) {
    const index = shopSeedProducts.findIndex((item) => item.id === id);
    if (index < 0) return false;
    shopSeedProducts.splice(index, 1);
    return true;
  }

  try {
    const [result] = await db.execute<mysql.ResultSetHeader>("DELETE FROM shop_products WHERE id = ?", [id]);
    return Number(result.affectedRows ?? 0) > 0;
  } catch (error) {
    if (!isDbConnectionError(error)) throw error;
    const index = shopSeedProducts.findIndex((item) => item.id === id);
    if (index < 0) return false;
    shopSeedProducts.splice(index, 1);
    return true;
  }
}
