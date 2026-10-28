import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  LocateFixed,
  Sun,
  CloudSun,
  Moon,
  CloudMoon,
} from "lucide-react";
import { z } from "@/contracts/validation";
import {
  weatherDays,
  weatherForecastSchema,
  weatherPlaceSchema,
  weatherPresets,
  type WeatherForecast,
  type WeatherPlace,
  type WeatherPoint,
} from "@/contracts/weather";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import TravelNav from "./TravelNav";
import "./travel.css";
import "./weather.css";
function WeatherIcon({
  condition,
  night,
}: {
  condition: WeatherPoint["condition"];
  night: boolean;
}) {
  const Icon =
    condition === "clear" || condition === "fair"
      ? night
        ? Moon
        : Sun
      : condition === "partlycloudy"
        ? night
          ? CloudMoon
          : CloudSun
        : condition === "rain"
          ? CloudRain
          : condition === "snow" || condition === "sleet"
            ? CloudSnow
            : condition === "fog"
              ? CloudFog
              : condition === "thunder"
                ? CloudLightning
                : Cloud;
  return <Icon aria-hidden="true" className="weather-icon" />;
}
export default function WeatherPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<WeatherPlace[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<WeatherPlace | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loadingPlace, setLoadingPlace] = useState("");
  const [forecastError, setForecastError] = useState("");
  const [locating, setLocating] = useState(false);
  const searchRequest = useRef<AbortController | null>(null),
    forecastRequest = useRef<AbortController | null>(null),
    generation = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      searchRequest.current?.abort();
      forecastRequest.current?.abort();
    };
  }, []);
  async function search() {
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    if (query.trim().length < 2) {
      setSearchBusy(false);
      setSearchError(t("weather.enter-place"));
      return;
    }
    setSearchBusy(true);
    setSearchError("");
    setPlaces([]);
    setSearched(false);
    try {
      const response = await api.post(
        "/weather/places",
        { query: query.trim() },
        { signal: controller.signal, timeout: 15000 }
      );
      const data = z.array(weatherPlaceSchema).max(5).parse(response.data);
      if (!controller.signal.aborted) {
        setPlaces(data);
        setSearched(true);
      }
    } catch (e: any) {
      if (!controller.signal.aborted)
        setSearchError(
          t(
            e?.response?.status === 429
              ? "weather.busy"
              : "weather.search-error"
          )
        );
    } finally {
      if (searchRequest.current === controller && !controller.signal.aborted)
        setSearchBusy(false);
    }
  }
  async function load(place: WeatherPlace, token = ++generation.current) {
    forecastRequest.current?.abort();
    const controller = new AbortController();
    forecastRequest.current = controller;
    setLocating(false);
    setLoadingPlace(place.name);
    setForecastError("");
    try {
      const response = await api.post(
        "/weather/forecast",
        { latitude: place.latitude, longitude: place.longitude },
        { signal: controller.signal, timeout: 15000 }
      );
      const data = weatherForecastSchema.parse(response.data);
      if (
        controller.signal.aborted ||
        token !== generation.current ||
        !mounted.current
      )
        return;
      // Keep the displayed location tied to its successful response, never to a
      // newer in-flight choice. Reject mismatched coordinates or invalid timezones.
      if (
        Math.abs(data.latitude - place.latitude) > 0.002 ||
        Math.abs(data.longitude - place.longitude) > 0.002
      )
        throw new Error("Weather location mismatch");
      new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
      if (!weatherDays(data).length)
        throw new Error("Weather forecast expired");
      setForecast(data);
      setSelected(place);
    } catch (e: any) {
      if (
        !controller.signal.aborted &&
        token === generation.current &&
        mounted.current
      )
        setForecastError(
          t(
            e?.response?.status === 429
              ? "weather.busy"
              : "weather.forecast-error"
          )
        );
    } finally {
      if (
        forecastRequest.current === controller &&
        token === generation.current &&
        mounted.current
      )
        setLoadingPlace("");
    }
  }
  function locate() {
    const token = ++generation.current;
    forecastRequest.current?.abort();
    setLoadingPlace("");
    setForecastError("");
    if (!navigator.geolocation) {
      setForecastError(t("weather.location-unavailable"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        if (token !== generation.current || !mounted.current) return;
        void load(
          {
            id: "device",
            name: t("weather.your-location"),
            country: "",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timezone: "UTC",
          },
          token
        );
      },
      () => {
        if (token === generation.current && mounted.current) {
          setLocating(false);
          setForecastError(t("weather.location-denied"));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 900000 }
    );
  }
  const timezone = forecast?.timezone || "UTC";
  const format = (time: string, date = false) =>
    new Intl.DateTimeFormat(i18n.language, {
      timeZone: timezone,
      ...(date
        ? ({ weekday: "short", day: "numeric", month: "short" } as const)
        : ({ hour: "2-digit", minute: "2-digit" } as const)),
    }).format(new Date(time));
  const number = (n: number | null) =>
    n === null
      ? "—"
      : new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: 1,
        }).format(n);
  const days = forecast ? weatherDays(forecast) : [];
  const futurePoints =
    forecast?.points.filter(p => Date.parse(p.time) >= Date.now() - 1800000) ||
    [];
  const current = futurePoints[0];
  return (
    <Layout>
      <div className="travel-page weather-page">
        <TravelNav />
        <header className="travel-heading">
          <h1 className="page-title">{t("weather.title")}</h1>
          <p>{t("weather.description")}</p>
        </header>
        <section
          className="weather-controls content-panel"
          aria-label={t("weather.find-place")}
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              void search();
            }}
            className="weather-search-form"
          >
            <label htmlFor="weather-query">{t("weather.find-place")}</label>
            <div className="weather-search-row">
              <input
                id="weather-query"
                value={query}
                onChange={e => setQuery(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder={t("weather.search-placeholder")}
                aria-describedby="weather-search-note"
              />
              <Button disabled={searchBusy} type="submit">
                {t(searchBusy ? "weather.searching" : "weather.search")}
              </Button>
            </div>
            <p id="weather-search-note">{t("weather.search-note")}</p>
          </form>
          <div className="weather-alternatives">
            <label htmlFor="weather-preset">{t("weather.choose-place")}</label>
            <select
              id="weather-preset"
              value={
                weatherPresets.some(p => p.id === selected?.id)
                  ? selected!.id
                  : ""
              }
              onChange={e => {
                const place = weatherPresets.find(p => p.id === e.target.value);
                if (place) void load(place);
              }}
            >
              <option value="">{t("weather.select-place")}</option>
              {weatherPresets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.country}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={locate}
              disabled={locating}
            >
              <LocateFixed aria-hidden="true" />
              {t(locating ? "weather.locating" : "weather.use-location")}
            </Button>
          </div>
          {searchError && <p role="alert">{searchError}</p>}
          <div role="status" aria-live="polite">
            {searchBusy
              ? t("weather.searching")
              : searched && !places.length
                ? t("weather.no-places")
                : null}
          </div>
          {!!places.length && (
            <ul
              className="weather-place-results"
              aria-label={t("weather.place-results")}
            >
              {places.map(place => (
                <li key={place.id}>
                  <button type="button" onClick={() => void load(place)}>
                    {place.name} <span>{place.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="weather-place-attribution">
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenStreetMap contributors
            </a>{" "}
            · Nominatim
          </p>
        </section>
        <div className="weather-feedback" aria-live="polite">
          {loadingPlace && (
            <p role="status">{t("weather.loading", { place: loadingPlace })}</p>
          )}
          {forecastError && <p role="alert">{forecastError}</p>}
          {!loadingPlace && selected && forecast && (
            <p>
              {t("weather.loaded", { place: selected.name })}{" "}
              <a href="#weather-current">{t("weather.view-forecast")}</a>
            </p>
          )}
        </div>
        {!forecast && !loadingPlace && !forecastError && (
          <p className="weather-empty">{t("weather.empty")}</p>
        )}
        {forecast && selected && current && (
          <>
            <section
              id="weather-current"
              className="weather-current content-panel"
              aria-label={t("weather.forecast")}
            >
              <div>
                <h2>
                  {selected.name}
                  {selected.country ? ` · ${selected.country}` : ""}
                </h2>
                <p>
                  {t("weather.valid-at", {
                    time: format(current.time),
                    zone: timezone,
                  })}
                </p>
                <div className="weather-temperature">
                  <WeatherIcon
                    condition={current.condition}
                    night={current.night}
                  />
                  <strong>{number(current.temperature)}°C</strong>
                </div>
                <p>{t(`weather.conditions.${current.condition}`)}</p>
              </div>
              <dl className="weather-metrics">
                <div>
                  <dt>{t("weather.wind")}</dt>
                  <dd>{number(current.windKmh)} km/h</dd>
                </div>
                <div>
                  <dt>{t("weather.humidity")}</dt>
                  <dd>{number(current.humidity)}%</dd>
                </div>
                <div>
                  <dt>{t("weather.rain")}</dt>
                  <dd>
                    {number(current.precipitationMm)} mm
                    {current.intervalHours && (
                      <small className="weather-interval">
                        {t("weather.interval", {
                          hours: current.intervalHours,
                        })}
                      </small>
                    )}
                  </dd>
                </div>
              </dl>
              <p>
                {t("weather.updated", {
                  time: new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: timezone,
                  }).format(new Date(forecast.issuedAt)),
                })}{" "}
                · {timezone}
              </p>
              {forecast.stale && <p role="status">{t("weather.stale")}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={() => void load(selected)}
                disabled={!!loadingPlace}
              >
                {t("weather.refresh")}
              </Button>
            </section>
            <DiscoverySection
              id="weather-outlook"
              title={t("weather.outlook")}
              description={t("weather.outlook-note")}
            >
              <SwipeRail
                label={t("weather.outlook")}
                resetKey={`${forecast.latitude}:${forecast.longitude}`}
              >
                {days.map(day => {
                  const point = day.points[Math.floor(day.points.length / 2)];
                  return (
                    <article className="weather-day" key={day.date}>
                      <h3>{format(point.time, true)}</h3>
                      <WeatherIcon
                        condition={point.condition}
                        night={point.night}
                      />
                      <p>{t(`weather.conditions.${point.condition}`)}</p>
                      <small className="weather-sample-time">
                        {format(point.time)}
                      </small>
                      <p className="weather-range">
                        {number(day.low)}° <span>–</span> {number(day.high)}°C
                      </p>
                      <p>{t("weather.low-high")}</p>
                    </article>
                  );
                })}
              </SwipeRail>
            </DiscoverySection>
            <section
              className="weather-hourly content-panel"
              aria-labelledby="weather-hours"
            >
              <h2 id="weather-hours">{t("weather.hours")}</h2>
              <p>{t("weather.local-times", { zone: timezone })}</p>
              <div
                className="weather-table-scroll"
                tabIndex={0}
                role="region"
                aria-label={t("weather.hours")}
              >
                <table>
                  <caption className="sr-only">{t("weather.hours")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("weather.time")}</th>
                      <th scope="col">{t("weather.temperature")}</th>
                      <th scope="col">{t("weather.rain")}</th>
                      <th scope="col">{t("weather.wind")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futurePoints.slice(0, 24).map(point => (
                      <tr key={point.time}>
                        <th scope="row">
                          <time dateTime={point.time}>
                            {format(point.time, true)} · {format(point.time)}
                          </time>
                        </th>
                        <td>{number(point.temperature)}°C</td>
                        <td>
                          {number(point.precipitationMm)} mm
                          {point.intervalHours
                            ? ` / ${point.intervalHours} h`
                            : ""}
                        </td>
                        <td>{number(point.windKmh)} km/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <section className="weather-attribution">
          <p>
            {t("weather.source")}{" "}
            <a
              href="https://www.met.no/en"
              target="_blank"
              rel="noopener noreferrer"
            >
              MET Norway
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
          </p>
          <p>{t("weather.limits")}</p>
          <p>{t("weather.privacy")}</p>
        </section>
      </div>
    </Layout>
  );
}
