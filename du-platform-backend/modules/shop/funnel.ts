import type { PoolConnection } from "mysql2/promise";
export const FUNNEL_EVENTS = [
  "product_discovery",
  "basket_add",
  "request_saved",
  "quote_sent",
  "fulfilled",
] as const;
export async function recordShopFunnel(
  c: Pick<PoolConnection, "execute">,
  event: (typeof FUNNEL_EVENTS)[number]
) {
  await c.execute(
    "INSERT INTO shop_funnel_daily (day,event,count) VALUES (UTC_DATE(),?,1) ON DUPLICATE KEY UPDATE count=count+1",
    [event]
  );
}
