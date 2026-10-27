import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  travelLocations,
  currencies,
  validateTravel,
  providerResources,
  type TravelCategory,
  type TravelCriteria,
} from "@shared/travel";
import { useTravelDraft, updateDraft, travelEvent } from "./store";
import { Button } from "@/components/ui/button";

export function LocationField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const matches = travelLocations
    .filter(l =>
      `${l.id} ${l.name} ${l.country}`
        .toLowerCase()
        .includes((query ?? "").toLowerCase())
    )
    .slice(0, 24);
  const [index, setIndex] = useState(0);
  const chosen = travelLocations.find(l => l.id === value);
  function select(id: string) {
    onChange(id);
    setQuery(null);
    setOpen(false);
  }
  return (
    <div className="travel-location">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[index] ? `${id}-${matches[index].id}` : undefined
        }
        autoComplete="off"
        value={query ?? (chosen ? `${chosen.name} (${chosen.id})` : "")}
        onFocus={() => {
          setQuery("");
          setOpen(true);
          setIndex(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setIndex(0);
          onChange("");
        }}
        onKeyDown={e => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setIndex(i =>
              Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  i + (e.key === "ArrowDown" ? 1 : -1)
                )
              )
            );
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (matches[index]) select(matches[index].id);
          }
        }}
      />
      {open && (
        <ul id={`${id}-options`} role="listbox">
          {matches.map((l, i) => (
            <li
              key={l.id}
              id={`${id}-${l.id}`}
              role="option"
              aria-selected={index === i}
              onPointerDown={e => {
                e.preventDefault();
                select(l.id);
              }}
            >
              {l.name} · {l.id} · {l.country}
            </li>
          ))}
        </ul>
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
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  function set<K extends keyof TravelCriteria>(
    key: K,
    value: TravelCriteria[K]
  ) {
    updateDraft(d => ({ ...d, criteria: { ...d.criteria, [key]: value } }));
    setError("");
    setNotice("");
    setReviewed(null);
    setCopied(false);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
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
    return `${t(`travel.${category}`)}: ${place}; ${v.departure} — ${category === "flights" && v.tripType === "one-way" ? t("travel.one-way") : v.returnDate}; ${t("travel.adults")}: ${v.adults}; ${t("travel.child-ages")}: ${v.childAges.join(", ") || "—"}; ${category === "stays" ? `${t("travel.rooms")}: ${v.rooms}; ` : ""}${v.currency}`;
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
      <form onSubmit={submit} className="travel-form">
        {category === "flights" && (
          <LocationField
            id="travel-origin"
            label={t("travel.origin")}
            value={c.origin}
            onChange={v => set("origin", v)}
          />
        )}
        {category !== "car-hire" && (
          <LocationField
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
              setReviewed(null);
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
              id="travel-pickup"
              label={t("travel.pickup")}
              value={c.pickup}
              onChange={v => set("pickup", v)}
            />
            <LocationField
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
        <p className="travel-form-note">{t("travel.unsupported-options")}</p>
        {error && (
          <p role="alert" className="travel-form-note">
            {error}
          </p>
        )}
        <Button type="submit">{t("travel.review-search")}</Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {reviewed && (
        <div className="travel-review surface-card" role="status">
          <h3>{t("travel.search-ready")}</h3>
          <p>{searchBrief(reviewed)}</p>
          <p>{t("travel.no-results")}</p>
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
                setCopied(false);
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
                  setCopied(true);
                } catch {
                  setError(t("travel.copy-error"));
                }
              }}
            >
              {t(copied ? "travel.copied" : "travel.copy-search")}
            </Button>
            <Button asChild>
              <a
                href={providerResources[category]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => travelEvent("resource_opened", category)}
              >
                {t("travel.open-provider")}
              </a>
            </Button>
          </div>
          <p>{t("travel.handoff-note")}</p>
          <Link href="/travel/my-trips">{t("travel.review-trip")}</Link>
        </div>
      )}
    </section>
  );
}
