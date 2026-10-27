import { loadSavedTravel } from "./api";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { api, loadAuthToken, hasLoggedInBefore } from "@/lib/api";
import {
  travelDraftSchema,
  estimateTotals,
  currencies,
  defaultTravelCriteria,
  categories,
  type SavedTravel,
  type TravelDraft,
  type TravelCategory,
} from "@shared/travel";
import { useTravelDraft, updateDraft, travelEvent } from "./store";
export default function MyTrips() {
  const { t, i18n } = useTranslation();
  const draft = useTravelDraft();
  const [saved, setSaved] = useState<SavedTravel[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] =
    useState<TravelDraft["criteria"]["currency"]>("EUR");
  const [category, setCategory] = useState<TravelCategory>("flights");
  const [signedIn, setSignedIn] = useState(Boolean(loadAuthToken()));
  useEffect(() => {
    let active = true;
    if (hasLoggedInBefore() || loadAuthToken())
      void resolveCurrentUserBootstrap().then(user => {
        if (active) setSignedIn(Boolean(user));
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    setSaved(await loadSavedTravel());
  }
  useEffect(() => {
    let cancelled = false;
    if (signedIn) {
      setLoading(true);
      loadSavedTravel()
        .then(rows => {
          if (!cancelled) setSaved(rows);
        })
        .catch(() => {
          if (!cancelled) setStatus(t("travel.storage-error"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [signedIn, t]);
  async function save(kind: "trip" | "search") {
    if (!travelDraftSchema.safeParse(draft).success) {
      setStatus(t("travel.errors.criteria"));
      return;
    }
    if (kind === "search" && !draft.searches.length) {
      setStatus(t("travel.no-searches"));
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await api.post("/travel/saved", {
        name,
        kind,
        draft: kind === "search" ? { ...draft, estimates: [] } : draft,
      });
      travelEvent("trip_saved");
      await refresh();
      setStatus(t("travel.saved"));
    } catch {
      setStatus(t("travel.storage-error"));
    } finally {
      setBusy(false);
    }
  }
  function addEstimate(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (
      !amount ||
      !Number.isFinite(n) ||
      n < 0 ||
      n > 10000000 ||
      draft.estimates.length >= 20
    )
      return;
    updateDraft(d => ({
      ...d,
      estimates: [
        ...d.estimates,
        { id: crypto.randomUUID(), category, amount: n, currency },
      ],
    }));
    setAmount("");
  }
  const totals = estimateTotals(draft.estimates);
  return (
    <div className="travel-trip-grid">
      <section className="content-panel">
        <h2 className="page-section-title">{t("travel.guest-draft")}</h2>
        <p>{t("travel.draft-note")}</p>
        <Button
          variant="outline"
          onClick={() =>
            updateDraft({
              criteria: defaultTravelCriteria(),
              searches: [],
              estimates: [],
            })
          }
        >
          {t("travel.clear-draft")}
        </Button>
        <h3>{t("travel.searches")}</h3>
        {!draft.searches.length && <p>{t("travel.no-searches")}</p>}
        {draft.searches.map(s => (
          <article className="surface-card" key={s.category}>
            <h4>{t(`travel.${s.category}`)}</h4>
            <p>
              {s.category === "flights"
                ? `${s.criteria.origin} → ${s.criteria.destination}`
                : s.category === "stays"
                  ? s.criteria.destination
                  : `${s.criteria.pickup} → ${s.criteria.dropoff}`}{" "}
              · {s.criteria.departure} —{" "}
              {s.category === "flights" && s.criteria.tripType === "one-way"
                ? t("travel.one-way")
                : s.criteria.returnDate || "—"}{" "}
              · {s.criteria.adults} {t("travel.adults")} · {s.criteria.currency}
            </p>
            <p>{t("travel.unquoted")}</p>
            <div className="travel-actions">
              <Button
                variant="outline"
                onClick={() =>
                  updateDraft(d => ({ ...d, criteria: s.criteria }))
                }
                asChild
              >
                <Link href={`/travel/${s.category}`}>
                  {t("travel.search-again")}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  updateDraft(d => ({
                    ...d,
                    searches: d.searches.filter(v => v.category !== s.category),
                  }))
                }
              >
                {t("travel.remove")}
              </Button>
            </div>
          </article>
        ))}
        <h3>{t("travel.estimates")}</h3>
        <p>{t("travel.estimate-note")}</p>
        <form className="travel-form" onSubmit={addEstimate}>
          <label>
            {t("travel.category")}
            <select
              aria-label={t("travel.category")}
              value={category}
              onChange={e => setCategory(e.target.value as TravelCategory)}
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {t(`travel.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("travel.amount")}
            <input
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </label>
          <label>
            {t("travel.currency")}
            <select
              aria-label={t("travel.currency")}
              value={currency}
              onChange={e => setCurrency(e.target.value as typeof currency)}
            >
              {currencies.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Button disabled={draft.estimates.length >= 20}>
            {t("travel.add-estimate")}
          </Button>
        </form>
        {draft.estimates.map(e => (
          <div className="travel-budget-line" key={e.id}>
            <span>
              {t(`travel.${e.category}`)} ·{" "}
              {new Intl.NumberFormat(i18n.language, {
                style: "currency",
                currency: e.currency,
              }).format(e.amount)}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                updateDraft(d => ({
                  ...d,
                  estimates: d.estimates.filter(v => v.id !== e.id),
                }))
              }
            >
              {t("travel.remove")}
            </Button>
          </div>
        ))}
        <h3>{t("travel.budget")}</h3>
        {Object.entries(totals).map(([c, n]) => (
          <p key={c}>
            {new Intl.NumberFormat(i18n.language, {
              style: "currency",
              currency: c,
            }).format(n!)}
          </p>
        ))}
        {!draft.estimates.length && <p>{t("travel.no-estimates")}</p>}
        <p>{t("travel.funds-unknown")}</p>
        <Link href="/travel/planner">{t("travel.onesa-planner")}</Link>
      </section>
      <section className="content-panel">
        <h2 className="page-section-title">{t("travel.private-trips")}</h2>
        <p>{t("travel.private-note")}</p>
        {!signedIn ? (
          <Button asChild>
            <Link href="/login?next=%2Ftravel%2Fmy-trips">
              {t("travel.sign-in")}
            </Link>
          </Button>
        ) : (
          <>
            <label>
              {t("travel.trip-name")}
              <input
                value={name}
                maxLength={100}
                onChange={e => setName(e.target.value)}
              />
            </label>
            <div className="travel-actions">
              <Button
                disabled={busy || !name.trim()}
                onClick={() => save("trip")}
              >
                {t("travel.save-trip")}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !name.trim() || !draft.searches.length}
                onClick={() => save("search")}
              >
                {t("travel.save-search")}
              </Button>
            </div>
            {loading && (
              <p role="status">{t("routing.loading_page_content")}</p>
            )}
            {!loading && !saved.length && <p>{t("travel.no-saved")}</p>}
            {saved.map(s => (
              <article className="surface-card" key={s.id}>
                <h3>{s.name}</h3>
                <p>
                  {t(
                    s.kind === "trip"
                      ? "travel.saved-trip"
                      : "travel.saved-search"
                  )}{" "}
                  · {new Date(s.updatedAt).toLocaleDateString(i18n.language)}
                </p>
                <div className="travel-actions">
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateDraft(s.draft);
                      travelEvent("trip_returned");
                      setStatus(t("travel.restored"));
                    }}
                  >
                    {t("travel.restore")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.delete(`/travel/saved/${s.id}`);
                        await refresh();
                      } catch {
                        setStatus(t("travel.storage-error"));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("travel.delete")}
                  </Button>
                </div>
              </article>
            ))}
          </>
        )}
        {status && <p role="status">{status}</p>}
        <hr />
        <h3>{t("travel.alerts")}</h3>
        <p>{t("travel.alerts-note")}</p>
        <Button disabled>{t("travel.alerts-unavailable")}</Button>
        <p>{t("travel.no-consent")}</p>
      </section>
    </div>
  );
}
