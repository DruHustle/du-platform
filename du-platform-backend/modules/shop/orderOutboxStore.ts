import type { PoolConnection, RowDataPacket } from "mysql2/promise";
export async function queueOrderNotification(
  c: PoolConnection,
  orderId: number,
  key: string,
  language: string,
  publicMessage = ""
) {
  const [rows] = await c.query<RowDataPacket[]>(
    `SELECT o.order_ref,o.customer_email,o.customer_name,o.shipping_address,o.shipping_city,o.shipping_country,o.currency,o.total_cents,q.total_cents AS quote_total,q.currency AS quote_currency,q.items AS quote_items,COALESCE(q.shipping_cents,o.shipping_cents) AS shipping_cents,q.valid_until,q.version AS quote_version,w.carrier,w.tracking,w.refund_cents FROM shop_orders o LEFT JOIN shop_order_workflows w ON w.order_id=o.id LEFT JOIN shop_quotes q ON q.order_id=o.id AND q.version=w.quote_version WHERE o.id=?`,
    [orderId]
  );
  const [items] = await c.query<RowDataPacket[]>(
    "SELECT product_name,quantity,line_total_cents FROM shop_order_items WHERE order_id=? ORDER BY id",
    [orderId]
  );
  const snapshot = {
    ...rows[0],
    items: rows[0].quote_items ? JSON.parse(rows[0].quote_items) : items,
    public_message: publicMessage,
  };
  const data = JSON.stringify(snapshot);
  await c.execute(
    "INSERT IGNORE INTO shop_order_notifications (order_id,event_key,language,event_data) VALUES (?,?,?,?)",
    [orderId, key, language, data]
  );
  if (key === "request_received")
    await c.execute(
      "INSERT IGNORE INTO shop_order_notifications (order_id,event_key,language,event_data) VALUES (?,?,?,?)",
      [orderId, "request_received:operator", "en", data]
    );
}
