import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  type TravelCriteria,
  type TravelQuote,
  type TravelResults,
} from "@/contracts/travel";
import { searchTravel, revalidateTravelQuote } from "./api";
import { updateDraft, travelEvent } from "./store";
import { Link, useLocation } from "wouter";
import { prepareTravelChatDraft } from "./chatHandoff";

function localTime(value: string, locale: string) {
  // Supplier timestamps are local to each airport. Preserve their wall time;
  // applying the browser's timezone would silently change the flight itinerary.
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value.slice(0, 19) + "Z"));
}
export function SupplierQuoteCard({
  quote,
  selectable = false,
}: {
  quote: TravelQuote;
  selectable?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(quote);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const [now, setNow] = useState(Date.now());
  const sourceId = useRef(quote.id);
  useEffect(() => {
    if (sourceId.current === quote.id) return;
    sourceId.current = quote.id;
    if (quote.id !== current.id) {
      setCurrent(quote);
      setChecked(false);
      setStatus("");
    }
  }, [quote, current.id]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Date.parse(current.reviewAfter) - Date.now())
    );
    return () => clearTimeout(timer);
  }, [current.reviewAfter]);
  useEffect(() => {
    return () => request.current?.abort();
  }, []);
  const stale = now >= Date.parse(current.reviewAfter);
  const formatMoney = (q: TravelQuote) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: q.currency,
    }).format(q.price);
  async function checkPrice() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setChecked(false);
    setStatus("");
    try {
      const result = await revalidateTravelQuote(current, controller.signal);
      if (controller.signal.aborted) return;
      if (
        result.quote.identity !== current.identity ||
        result.quote.provider !== current.provider
      )
        throw new Error("TRAVEL_INVALID_RESPONSE");
      setCurrent(result.quote);
      setNow(Date.now());
      setChecked(true);
      setStatus(
        t(result.changed ? "travel.live.changed" : "travel.live.checked")
      );
      updateDraft(d => ({
        ...d,
        quotes: d.quotes?.map(q =>
          q.identity === current.identity ? result.quote : q
        ),
      }));
    } catch (error: any) {
      if (!controller.signal.aborted)
        setStatus(
          t(
            error?.response?.status === 410
              ? "travel.live.expired"
              : "travel.live.failed"
          )
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <article className="travel-supplier-card surface-card">
      <p className="travel-supplier-source">
        {current.provider} · {t(`travel.${current.category}`)}
      </p>
      <h3>{current.title}</h3>
      <p className="travel-supplier-price">{formatMoney(current)}</p>
      <p>
        {t(
          current.priceBasis === "party-total"
            ? "travel.live.party-total"
            : "travel.live.basis-unknown"
        )}
      </p>
      {current.legs.map((leg, index) => (
        <div className="travel-flight-leg" key={index}>
          <h4>{t(index ? "travel.live.inbound" : "travel.live.outbound")}</h4>
          <p>{leg.route.join(" → ")}</p>
          <p>
            <time dateTime={leg.departureTime}>
              {localTime(leg.departureTime, i18n.language)}
            </time>{" "}
            →{" "}
            <time dateTime={leg.arrivalTime}>
              {localTime(leg.arrivalTime, i18n.language)}
            </time>
          </p>
          <p>
            {t("travel.live.stops", { count: leg.stops })} ·{" "}
            {Math.floor(leg.durationSeconds / 3600)} h{" "}
            {Math.floor((leg.durationSeconds % 3600) / 60)} min
          </p>
          {leg.arrivalTime.slice(0, 10) > leg.departureTime.slice(0, 10) && (
            <p>{t("travel.live.overnight")}</p>
          )}
          <p>
            {leg.airlines.join(" · ")} {leg.cabin ? `· ${leg.cabin}` : ""}
          </p>
        </div>
      ))}
      {!!current.legs.length && <p>{t("travel.live.local-times")}</p>}
      {current.address && <p>{current.address}</p>}
      {current.reviewRating !== null && (
        <p>
          {t("travel.live.rating", {
            rating: current.reviewRating,
            reviews: current.reviewCount ?? "—",
          })}
        </p>
      )}
      <details>
        <summary>{t("travel.live.conditions")}</summary>
        {current.baggage && (
          <p>
            {t("travel.live.baggage", {
              personal: current.baggage.personalItem ?? "—",
              cabin: current.baggage.cabinBag ?? "—",
              checked: current.baggage.checkedBag ?? "—",
            })}
          </p>
        )}
        {current.category === "flights" && (
          <p>{t("travel.live.flight-conditions")}</p>
        )}
        {current.category === "stays" && (
          <p>{t("travel.live.stay-conditions")}</p>
        )}
        <p>{t("travel.live.charges-unknown")}</p>
      </details>
      <p className="travel-supplier-time">
        {t("travel.live.retrieved", {
          time: new Date(current.retrievedAt).toLocaleString(i18n.language),
        })}
      </p>
      {stale && <p role="status">{t("travel.live.stale")}</p>}
      <div className="travel-actions">
        {selectable && (
          <Button
            variant="outline"
            onClick={() => {
              let added = false;
              updateDraft(d => {
                const others = (d.quotes ?? []).filter(
                  q => q.identity !== current.identity
                );
                if (others.length >= 6) return d;
                added = true;
                return { ...d, quotes: [...others, current] };
              });
              setStatus(
                t(
                  added ? "travel.live.selected" : "travel.live.selection-limit"
                )
              );
            }}
          >
            {t("travel.live.select")}
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={checkPrice}>
          {t(busy ? "travel.live.checking" : "travel.live.check")}
        </Button>
        <Button variant="outline" asChild>
          <Link
            href={`/travel/${current.category}`}
            onClick={() =>
              updateDraft(d => ({ ...d, criteria: current.criteria }))
            }
          >
            {t("travel.search-again")}
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const introduction = [
              t("travel.live.onesa-prompt"),
              t(
                current.priceBasis === "party-total"
                  ? "travel.live.party-total"
                  : "travel.live.basis-unknown"
              ),
              `${t("travel.adults")}: ${current.criteria.adults} · ${t("travel.child-ages")}: ${current.criteria.childAges.join(", ") || "—"}`,
              t("travel.live.retrieved", {
                time: new Date(current.retrievedAt).toLocaleString(
                  i18n.language
                ),
              }),
            ].join("\n");
            if (prepareTravelChatDraft(current, introduction))
              navigate("/onesa-ai-chat");
            else setStatus(t("travel.storage-error"));
          }}
        >
          {t("travel.live.onesa")}
        </Button>
        {checked && !stale && (
          <Button asChild>
            <a
              href={current.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => travelEvent("resource_opened", current.category)}
            >
              {t("travel.live.continue", { provider: current.provider })} ↗
            </a>
          </Button>
        )}
      </div>
      {status && <p role="status">{status}</p>}
      <p>{t("travel.live.no-reservation")}</p>
    </article>
  );
}

export default function SupplierResults({
  category,
  criteria,
}: {
  category: "flights" | "stays";
  criteria: TravelCriteria;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<TravelResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState("price");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const provider = category === "flights" ? "Kiwi.com" : "Pilot";
  async function search() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(false);
    try {
      const response = await searchTravel(
        category,
        criteria,
        controller.signal
      );
      if (!controller.signal.aborted) {
        setResult(response);
        travelEvent("results_received", category);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const quotes = [...(result?.quotes ?? [])].sort((a, b) =>
    sort === "duration"
      ? a.legs.reduce((n, l) => n + l.durationSeconds, 0) -
        b.legs.reduce((n, l) => n + l.durationSeconds, 0)
      : a.currency.localeCompare(b.currency) || a.price - b.price
  );
  return (
    <section
      className="travel-supplier-results"
      aria-labelledby="travel-supplier-title"
    >
      <h3 id="travel-supplier-title">{t("travel.live.title")}</h3>
      <p>{t("travel.live.intro", { provider })}</p>
      <div className="travel-actions">
        <Button onClick={search} disabled={busy}>
          {t(busy ? "travel.live.searching" : "travel.live.search", {
            provider,
          })}
        </Button>
        <Button asChild variant="outline">
          <Link href="/travel/my-trips">{t("travel.review-trip")}</Link>
        </Button>
      </div>
      {busy && <p role="status">{t("travel.live.searching")}</p>}
      {error && <p role="alert">{t("travel.live.failed")}</p>}
      {result && (
        <>
          {!quotes.length && <p role="status">{t("travel.live.empty")}</p>}
          {!!result.rejectedCount && (
            <p role="status">{t("travel.live.partial")}</p>
          )}
          {!!quotes.length && (
            <>
              <label className="travel-sort">
                {t("travel.live.sort")}
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="price">{t("travel.live.price-sort")}</option>
                  {category === "flights" && (
                    <option value="duration">
                      {t("travel.live.duration-sort")}
                    </option>
                  )}
                </select>
              </label>
              <p>{t("travel.live.coverage")}</p>
              <div className="travel-supplier-grid">
                {quotes.map(quote => (
                  <SupplierQuoteCard key={quote.id} quote={quote} selectable />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
