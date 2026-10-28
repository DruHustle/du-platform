import { readFile, stat } from "node:fs/promises";
import {
  SHOP_READINESS_CHECKS,
  shopPilotApprovalSchema,
  type PublicShopReadiness,
  type ShopPilotApproval,
} from "../../contracts/shopReadiness";
import { ShopRequestError } from "../../lib/persistence/shopStore";

async function load(env: NodeJS.ProcessEnv = process.env, now = Date.now()) {
  const requested = env.SHOP_COMMERCIAL_MODE || "observe";
  const validMode = ["observe", "prelaunch", "pilot"].includes(requested);
  const mode = (
    validMode ? requested : "prelaunch"
  ) as PublicShopReadiness["mode"];
  let approval: ShopPilotApproval | null = null;
  const missing: string[] = [];
  if (!validMode) missing.push("configuration");
  try {
    const file = env.SHOP_PILOT_APPROVAL_FILE;
    if (!file || (await stat(file)).size > 65536)
      throw new Error("No valid approval file");
    approval = shopPilotApprovalSchema.parse(
      JSON.parse(await readFile(file, "utf8"))
    );
    if (
      new Date(approval.reviewedAt).getTime() > now ||
      new Date(approval.validUntil).getTime() <= now ||
      new Date(approval.validUntil) <= new Date(approval.reviewedAt)
    )
      missing.push("approval_dates");
    for (const check of SHOP_READINESS_CHECKS)
      if (!approval.checks[check].approved || !approval.checks[check].evidence)
        missing.push(check);
  } catch {
    missing.push("approval_record", ...SHOP_READINESS_CHECKS);
  }
  const state: PublicShopReadiness = {
    mode,
    enforcement: mode === "observe" ? "report_only" : "enforced",
    commercialReady: mode === "pilot" && missing.length === 0,
    missing: Array.from(new Set(missing)),
    approvedProductIds:
      mode === "pilot" && missing.length === 0
        ? approval!.approvedProductIds
        : [],
    destinationCountries:
      mode === "pilot" && missing.length === 0
        ? approval!.destinationCountries.map(c => c.code)
        : [],
  };
  return { state, approval };
}
export async function publicShopReadiness(env = process.env, now = Date.now()) {
  return (await load(env, now)).state;
}
export async function assertQuoteReadiness(
  country: string,
  productIds: number[],
  currency: string
) {
  const { state, approval } = await load();
  // Observe is explicit compatibility only. The production image deliberately
  // defaults to enforced prelaunch; pilot still requires a valid approval record.
  if (state.mode === "observe") return state;
  if (!state.commercialReady || !approval)
    throw new ShopRequestError(
      "New commercial requests and final quotes are paused until the commercial pilot readiness checks are approved. Existing requests and fulfilment remain recoverable.",
      409
    );
  const normalized = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const approved = approval.destinationCountries.some(c =>
    [c.code, ...c.names].some(name => normalized(name) === normalized(country))
  );
  if (
    !approved ||
    currency !== approval.currency ||
    productIds.some(id => !approval.approvedProductIds.includes(id))
  )
    throw new ShopRequestError(
      "This destination, currency or product is outside the approved Europe pilot. Do not issue a commercial quote until the exact request is approved.",
      409
    );
  return state;
}

// Initial requests contain a converted planning estimate. EUR is required for
// the final quote, not the customer's display preference. Scope still applies.
export async function assertOrderRequestReadiness(
  country: string,
  productIds: number[]
) {
  return assertQuoteReadiness(country, productIds, "EUR");
}
