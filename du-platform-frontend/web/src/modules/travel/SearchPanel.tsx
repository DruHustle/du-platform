import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  currencies,
  validateTravel,
  type TravelCategory,
  type TravelCriteria,
} from "@/domain/travel";
import { useTravelDraft, updateDraft, travelEvent } from "./store";
import { Button } from "@/components/ui/button";
import SupplierResults from "./SupplierResults";
import { loadTravelReference, type TravelReference } from "./api";

function LocationField({
  label,
  value,
  onChange,
  onEdit,
  id,
  locations,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEdit: () => void;
  id: string;
  locations: TravelReference["locations"];
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const countries = useMemo(
    () => typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames([i18n.language], { type: "region" })
      : undefined,
    [i18n.language]
  );
  const term = (query ?? "").trim().toLowerCase();
  const matches = locations
    .filter(location =>
      [
        location.name,
        location.id,
        location.country,
        countries?.of(location.country),
      ].some(part => part?.toLowerCase().includes(term))
    )
    .slice(0, 24);
  const chosen = locations.find(location => location.id === value);
  const activeOption = open && matches[index];
  const expanded = open && matches.length > 0;
  const selectMessage = t("travel.choose-location");
  const feedback =
    query === null
      ? ""
      : !matches.length
        ? t("travel.no-locations")
        : !open
          ? selectMessage
          : "";
  useEffect(() => {
    input.current?.setCustomValidity(query === null ? "" : selectMessage);
  }, [query, selectMessage]);

  function select(locationId: string) {
    input.current?.setCustomValidity("");
    onChange(locationId);
    setQuery(null);
    setOpen(false);
  }

  return (
    <div className="travel-location">
      <label htmlFor={id}>{label}</label>
      <input
        ref={input}
        id={id}
        role="combobox"
        required
        disabled={!locations.length}
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-options` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          activeOption ? `${id}-${activeOption.id}` : undefined
        }
        aria-invalid={feedback ? true : undefined}
        aria-describedby={feedback ? `${id}-feedback` : undefined}
        autoComplete="off"
        value={query ?? (chosen ? `${chosen.name} (${chosen.id})` : value)}
        onFocus={e => {
          if (query === null) e.currentTarget.select();
          setOpen(true);
          setIndex(-1);
        }}
        onBlur={() => {
          setOpen(false);
          if (query === null) return;
          const exact = matches.filter(
            location =>
              location.id.toLowerCase() === term ||
              location.name.toLowerCase() === term
          );
          if (exact.length === 1) select(exact[0].id);
        }}
        onChange={e => {
          e.currentTarget.setCustomValidity(selectMessage);
          setQuery(e.target.value);
          setOpen(true);
          setIndex(0);
          onEdit();
        }}
        onKeyDown={e => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.setCustomValidity("");
            setOpen(false);
            setQuery(null);
            setIndex(-1);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const next =
              e.key === "ArrowDown"
                ? index + 1
                : index < 0
                  ? matches.length - 1
                  : index - 1;
            const position = Math.max(0, Math.min(matches.length - 1, next));
            setOpen(true);
            setIndex(position);
            const option = matches[position];
            if (option)
              document
                .getElementById(`${id}-${option.id}`)
                ?.scrollIntoView({ block: "nearest" });
          }
          if (e.key === "Enter" && open && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (activeOption) select(activeOption.id);
            else if (query === null) setOpen(false);
          }
        }}
      />
      {expanded && (
        <ul id={`${id}-options`} role="listbox" aria-label={label}>
          {matches.map((location, i) => (
            <li
              key={location.id}
              id={`${id}-${location.id}`}
              role="option"
              aria-selected={index === i}
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(location.id)}
            >
              {location.name} · {location.id} · {countries?.of(location.country) ?? location.country}
            </li>
          ))}
        </ul>
      )}
      {feedback && (
        <p
          id={`${id}-feedback`}
          className="travel-location-feedback"
          role="status"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
export default function SearchPanel({
  category = "flights",
}: {
  category?: TravelCategory;
}) {
  const { t } = useTranslation();
  const draft = useTravelDraft();
  const c = draft.criteria;
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState<TravelCriteria | null>(null);
  const [copyState, setCopyState] = useState<"ready" | "copied" | "manual">("ready");
  const manualBrief = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState<TravelReference | null>(null);
  const [referenceError, setReferenceError] = useState(false);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReferenceError(false);
    void loadTravelReference(controller.signal).then(setReference).catch(() => {
      if (!controller.signal.aborted) setReferenceError(true);
    });
    return () => controller.abort();
  }, [referenceAttempt]);
  function resetReview() {
    setError("");
    setNotice("");
    setReviewed(null);
    setCopyState("ready");
  }
  function set<K extends keyof TravelCriteria>(
    key: K,
    value: TravelCriteria[K]
  ) {
    updateDraft(d => ({ ...d, criteria: { ...d.criteria, [key]: value } }));
    resetReview();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const required = category === "flights" ? [c.origin, c.destination] : category === "stays" ? [c.destination] : [c.pickup, c.dropoff];
    if (!reference || required.some(id => !reference.locations.some(location => location.id === id))) {
      setError(t("travel.errors.criteria"));
      return;
    }
    const v = validateTravel(c, category);
    if (!v.success) {
      setError(t(`travel.errors.${v.error}`));
      return;
    }
    setReviewed({ ...v.data });
    travelEvent("criteria_reviewed", category);
  }
  const field = (
    key: "departure" | "returnDate" | "pickupTime" | "dropoffTime",
    type: string,
    label: string
  ) => (
    <label>
      {t(`travel.${label}`)}
      <input
        type={type}
        value={c[key]}
        required
        onChange={e => set(key, e.target.value)}
        min={
          type === "date" ? new Date().toISOString().slice(0, 10) : undefined
        }
      />
    </label>
  );
  const searchBrief = (v: TravelCriteria) => {
    const place =
      category === "flights"
        ? `${v.origin} → ${v.destination}`
        : category === "stays"
          ? v.destination
          : `${v.pickup} ${v.pickupTime} → ${v.dropoff} ${v.dropoffTime}`;
    return `${t(`travel.${category}`)}: ${place}; ${v.departure} — ${category === "flights" && v.tripType === "one-way" ? t("travel.one-way") : v.returnDate}; ${t("travel.adults")}: ${v.adults}; ${t("travel.child-ages")}: ${v.childAges.join(", ") || "—"}; ${category === "stays" ? `${t("travel.rooms")}: ${v.rooms}; ` : ""}${category === "flights" ? `${t("travel.live.flex-days")}: ±${v.flightFlexDays ?? 0}; ` : ""}${v.currency}`;
  };
  return (
    <section
      className="travel-search content-panel"
      aria-labelledby="travel-search-title"
    >
      <h2 id="travel-search-title" className="page-section-title">
        {t(`travel.${category}`)}
      </h2>
      <p>{t("travel.search-intro")}</p>
      {referenceError && <div role="alert"><p>{t("travel.reference_unavailable", { defaultValue: "Travel locations are temporarily unavailable. Please try again." })}</p><Button variant="outline" onClick={() => setReferenceAttempt(value => value + 1)}>{t("search.retry", { defaultValue: "Try again" })}</Button></div>}
      <form onSubmit={submit} className="travel-form">
        {category === "flights" && (
          <LocationField
            onEdit={resetReview}
            locations={reference?.locations ?? []}
            id="travel-origin"
            label={t("travel.origin")}
            value={c.origin}
            onChange={v => set("origin", v)}
          />
        )}
        {category !== "car-hire" && (
          <LocationField
            onEdit={resetReview}
            locations={reference?.locations ?? []}
            id="travel-destination"
            label={t(
              category === "stays" ? "travel.stay-area" : "travel.destination"
            )}
            value={c.destination}
            onChange={v => {
              updateDraft(d => ({
                ...d,
                criteria: {
                  ...d.criteria,
                  destination: v,
                  pickup: v,
                  dropoff: v,
                },
              }));
              resetReview();
            }}
          />
        )}
        {category === "flights" && (
          <label>
            {t("travel.trip-type")}
            <select
              aria-label={t("travel.trip-type")}
              value={c.tripType}
              onChange={e =>
                set("tripType", e.target.value as TravelCriteria["tripType"])
              }
            >
              <option value="return">{t("travel.return")}</option>
              <option value="one-way">{t("travel.one-way")}</option>
            </select>
          </label>
        )}
        {field(
          "departure",
          "date",
          category === "stays" ? "check-in" : "departure"
        )}
        {category === "flights" && (
          <label className="travel-flex-field">
            {t("travel.live.flex-days")}
            <select
              value={c.flightFlexDays ?? 0}
              onChange={e => set("flightFlexDays", Number(e.target.value))}
            >
              <option value="0">{t("travel.live.exact-dates")}</option>
              {[1, 2, 3].map(days => (
                <option key={days} value={days}>
                  {days === 1
                    ? t("travel.live.flex-one")
                    : t("travel.live.flex-range", { days })}
                </option>
              ))}
            </select>
          </label>
        )}
        {(category !== "flights" || c.tripType === "return") &&
          field(
            "returnDate",
            "date",
            category === "stays" ? "check-out" : "return-date"
          )}
        <label>
          {t("travel.adults")}
          <input
            type="number"
            min="1"
            max="9"
            required
            value={c.adults}
            onChange={e => set("adults", Number(e.target.value))}
          />
        </label>
        <label>
          {t("travel.children")}
          <select
            aria-label={t("travel.children")}
            value={c.childAges.length}
            onChange={e =>
              set(
                "childAges",
                Array.from(
                  { length: Number(e.target.value) },
                  (_, i) => c.childAges[i] ?? -1
                )
              )
            }
          >
            {[0, 1, 2, 3, 4, 5, 6].map(n => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {c.childAges.map((age, i) => (
          <label key={i}>
            {t("travel.child-age", { number: i + 1 })}
            <input
              type="number"
              required
              min="0"
              max="17"
              value={age < 0 ? "" : age}
              onChange={e =>
                set(
                  "childAges",
                  c.childAges.map((v, j) =>
                    i === j
                      ? e.target.value === ""
                        ? -1
                        : Number(e.target.value)
                      : v
                  )
                )
              }
            />
          </label>
        ))}
        {category === "stays" && (
          <>
            <label>
              {t("travel.live.nationality")}
              <input
                value={c.guestNationality ?? ""}
                maxLength={2}
                minLength={2}
                pattern="[A-Z]{2}"
                required
                autoCapitalize="characters"
                onChange={e =>
                  set("guestNationality", e.target.value.toUpperCase())
                }
                aria-describedby="travel-nationality-note"
              />
            </label>
            <p id="travel-nationality-note" className="travel-form-note">
              {t("travel.live.nationality-note")}
            </p>
            <label>
              {t("travel.rooms")}
              <input
                type="number"
                required
                min="1"
                max={c.adults}
                value={c.rooms}
                onChange={e => set("rooms", Number(e.target.value))}
              />
            </label>
            <p className="travel-form-note">{t("travel.occupancy-note")}</p>
          </>
        )}
        {category === "car-hire" && (
          <>
            <LocationField
              onEdit={resetReview}
              locations={reference?.locations ?? []}
              id="travel-pickup"
              label={t("travel.pickup")}
              value={c.pickup}
              onChange={v => set("pickup", v)}
            />
            <LocationField
              onEdit={resetReview}
              locations={reference?.locations ?? []}
              id="travel-dropoff"
              label={t("travel.dropoff")}
              value={c.dropoff}
              onChange={v => set("dropoff", v)}
            />
            {field("pickupTime", "time", "pickup-time")}
            {field("dropoffTime", "time", "dropoff-time")}
          </>
        )}
        <label>
          {t("travel.currency")}
          <select
            aria-label={t("travel.currency")}
            value={c.currency}
            onChange={e =>
              set("currency", e.target.value as TravelCriteria["currency"])
            }
          >
            {currencies.map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <p className="travel-form-note">
          {t(
            category === "flights"
              ? "travel.live.airports-note"
              : "travel.unsupported-options"
          )}
        </p>
        {error && (
          <p role="alert" className="travel-form-note">
            {error}
          </p>
        )}
        <Button type="submit" className="travel-form-submit" disabled={!reference}>
          {t("travel.review-search")}
        </Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {reviewed && (
        <div className="travel-review surface-card">
          <h3 id="travel-reviewed-title" role="status">{t("travel.search-ready")}</h3>
          {copyState === "manual" ? (
            <>
              <textarea
                aria-labelledby="travel-reviewed-title"
                aria-describedby="travel-manual-copy"
                className="w-full"
                ref={manualBrief}
                readOnly
                autoFocus
                rows={4}
                value={searchBrief(reviewed)}
                onFocus={event => event.currentTarget.select()}
              />
              <p id="travel-manual-copy" role="status">{t("travel.copy-error")}</p>
            </>
          ) : (
            <p>{searchBrief(reviewed)}</p>
          )}
          {category === "car-hire" && <p>{t("travel.no-results")}</p>}
          {category !== "car-hire" && (
            <SupplierResults
              key={JSON.stringify(reviewed)}
              category={category}
              criteria={reviewed}
            />
          )}
          <div className="travel-actions">
            <Button
              variant="outline"
              onClick={() => {
                updateDraft(d => ({
                  ...d,
                  searches: [
                    ...d.searches.filter(s => s.category !== category),
                    { category, criteria: reviewed },
                  ],
                }));
                setCopyState("ready");
                setNotice(t("travel.added"));
              }}
            >
              {t("travel.add-search")}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(searchBrief(reviewed));
                  setCopyState("copied");
                } catch {
                  setCopyState("manual");
                  manualBrief.current?.focus();
                }
              }}
            >
              {t(copyState === "copied" ? "travel.copied" : "travel.copy-search")}
            </Button>
            {reference && <Button variant="outline" asChild>
              <a
                href={reference.resources[category]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => travelEvent("resource_opened", category)}
              >
                {t("travel.open-provider")}
              </a>
            </Button>}
          </div>
          <p>{t("travel.handoff-note")}</p>
          <Link href="/travel/my-trips">{t("travel.review-trip")}</Link>
        </div>
      )}
    </section>
  );
}
