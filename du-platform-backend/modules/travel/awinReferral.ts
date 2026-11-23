import type { Pool } from "mysql2/promise";
import { isSafeSupplierLink, type TravelQuote } from "../../domain/travel";
import { recordAwinHandoff } from "./awinLedger";

export type ReferralChannel = "web" | "android";
const kiwiHosts = ["kiwi.com", "www.kiwi.com"];
const positiveId = (value: string | undefined) =>
  !!value && /^[1-9]\d{0,14}$/.test(value);

export function awinPlacement(channel: unknown, env = process.env) {
  if (channel !== "web" && channel !== "android") return null;
  const channels = env.TRAVEL_AWIN_APPROVED_CHANNELS?.split(",").map(item => item.trim());
  const publisherId = env.TRAVEL_AWIN_PUBLISHER_ID;
  const advertiserId = env.TRAVEL_AWIN_ADVERTISER_ID;
  const token = env.TRAVEL_AWIN_API_TOKEN;
  if (!channels?.includes(channel) || !positiveId(publisherId) || !positiveId(advertiserId) || !token) return null;
  return { publisherId: publisherId!, advertiserId: advertiserId!, token, channel };
}

// Called only after an explicit referral choice on a freshly checked, signed flight.
// Awin can send unsupported destinations back to a generic landing page. Validate
// both the advertiser's domains and the destination echoed by its link builder.
export async function issueAwinReferral(
  quote: TravelQuote, channel: ReferralChannel, db: Pick<Pool, "execute"> | null,
  fetcher = fetch, env = process.env
) {
  const placement = awinPlacement(channel, env);
  if (!placement || !db || quote.provider !== "Kiwi.com" || !isSafeSupplierLink(quote.provider, quote.bookingUrl))
    throw new Error("Referral unavailable");
  const { publisherId, advertiserId, token } = placement;
  const base = `https://api.awin.com/publishers/${publisherId}`;
  const options = {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    redirect: "error" as const, signal: AbortSignal.timeout(5000),
  };
  const details = await fetcher(`${base}/programmedetails?advertiserId=${advertiserId}&relationship=joined`, options);
  if (!details.ok) throw new Error("Program unavailable");
  const { programmeInfo } = await details.json();
  const destination = new URL(quote.bookingUrl);
  const domains = programmeInfo?.validDomains;
  if (String(programmeInfo?.id) !== advertiserId || programmeInfo.membershipStatus?.toLowerCase() !== "joined" ||
      programmeInfo.deeplinkEnabled !== true || !Array.isArray(domains) ||
      !domains.some(entry => entry?.domain?.toLowerCase() === destination.hostname) ||
      !kiwiHosts.includes(destination.hostname))
    throw new Error("Unverified program or destination");

  const response = await fetcher(`${base}/linkbuilder/generate`, {
    ...options, method: "POST",
    body: JSON.stringify({ advertiserId: Number(advertiserId), destinationUrl: quote.bookingUrl,
      parameters: { clickref: quote.id }, shorten: false }),
  });
  if (!response.ok) throw new Error("Link builder unavailable");
  const { url: result } = await response.json();
  const url = new URL(result);
  if (url.origin !== "https://www.awin1.com" || url.pathname !== "/cread.php" ||
      url.username || url.password || url.hash ||
      !Object.entries({ awinmid: advertiserId, awinaffid: publisherId, clickref: quote.id, ued: quote.bookingUrl })
        .every(([key, value]) => url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === value))
    throw new Error("Partner link mismatch");
  url.searchParams.set("cons", "1");
  if (Date.parse(quote.reviewAfter) <= Date.now()) throw new Error("Recheck this price");
  await recordAwinHandoff(db, { clickRef: quote.id, publisherId, advertiserId, channel });
  return url.href;
}
