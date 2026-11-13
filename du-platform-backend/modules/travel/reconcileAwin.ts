import type { RowDataPacket } from "mysql2/promise";
import { db } from "../../shared/databaseRuntime";
import { applyAwinReport, initializeAwinLedger } from "./awinLedger";

async function run() {
  if (!db) throw new Error("Configure the backend database connection");
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--init-schema") {
    await initializeAwinLedger(db);
    console.log("Referral tables ready");
    return;
  }
  const [dateType, start, end] = args;
  const validDate = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  if (
    args.length !== 3 ||
    !["transaction", "validation", "amendment"].includes(dateType) ||
    !validDate(start) ||
    !validDate(end) ||
    start > end ||
    Date.parse(end) - Date.parse(start) >= 31 * 86400000
  )
    throw new Error(
      "Use --init-schema or <transaction|validation|amendment> YYYY-MM-DD YYYY-MM-DD (1–31 UTC dates)",
    );
  const publisher = Number(process.env.TRAVEL_AWIN_PUBLISHER_ID);
  const advertiser = Number(process.env.TRAVEL_AWIN_ADVERTISER_ID);
  const token = process.env.TRAVEL_AWIN_API_TOKEN;
  if (
    ![publisher, advertiser].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    ) ||
    !token
  )
    throw new Error(
      "Configure approved Awin account, advertiser and API credentials",
    );
  const conn = await db.getConnection();
  try {
    const [locks] = await conn.query<RowDataPacket[]>(
      "SELECT GET_LOCK('du_awin_reconcile', 0) AS acquired",
    );
    if (locks[0].acquired !== 1)
      throw new Error(
        "Another reconciliation is active; retry after it completes",
      );
    const url = new URL(
      `https://api.awin.com/publishers/${publisher}/transactions/`,
    );
    url.search = new URLSearchParams({
      advertiserId: String(advertiser),
      startDate: start + "T00:00:00",
      endDate: end + "T23:59:59",
      timezone: "UTC",
      dateType,
    }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Awin reporting returned HTTP ${response.status}`);
    const rows: unknown = await response.json();
    await conn.beginTransaction();
    const result = await applyAwinReport(conn, rows, publisher, advertiser);
    await conn.commit();
    console.log(JSON.stringify(result));
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    // Closing the dedicated session also releases the advisory lock after failures.
    conn.destroy();
  }
}
run()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Reconciliation failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db?.end();
  });
