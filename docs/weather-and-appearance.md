# Weather and appearance

Implemented on 27 October 2026 alongside the Travel navigation refinement.
Release status is recorded by the repository's CI/CD workflow.

## Weather

`/travel/weather` is an anonymous, on-demand forecast page. Travel navigation is
Overview, Flights, Stays, Car Hire, My Trips, Weather, Explore. The redundant
Travel heading label is removed from the four search/private-trip pages.

Visitors search a city/destination and explicitly choose a result, select a
curated destination, or request approximate browser location. No location prompt,
search-as-you-type request, initial forecast fetch, account or subscription is
required. Results show the selected place and its IANA timezone, model issue time,
forecast temperature, wind, humidity, precipitation by interval, next forecast
hours and seven local-date temperature ranges. The range is derived from forecast
points, not observed daily extremes; today/final dates can be incomplete. Night
symbols are preserved. There is no fifteen-day guarantee or weather-warning feed.

### Provider decision

- [AccuWeather](https://developer.accuweather.com/documentation/overview) currently
  advertises a 14-day trial, 500 calls/day. Starter is listed at $2/month. The free
  trial is not an ongoing free production plan. No account/subscription was created.
- [MET Norway Locationforecast](https://docs.api.met.no/doc/locationforecast/HowTO.html)
  provides global forecasts up to nine days ahead. Its [FAQ](https://docs.api.met.no/doc/FAQ.html)
  permits commercial use under CC BY 4.0; no key is required. The data's global
  model source is documented in the [Locationforecast FAQ](https://docs.api.met.no/doc/locationforecast/FAQ.html).
  Equal or superior local accuracy to AccuWeather has **not** been established.
  No uptime SLA is promised. Appropriate credit and the derivation are visible.
- Place search uses [OpenStreetMap Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
  This is a deliberate application-specific use: explicit user submissions only,
  no autocomplete/bulk extraction, identification, attribution and caching. A
  shared single-process gate permits at most one upstream request per 1.1 seconds
  and one geocoder request in flight. Configure an alternate compatible HTTPS
  service through `WEATHER_GEOCODER_URL` without changing application code. The
  current DU deployment runs one application process; coordinate this global
  upstream gate before scaling to more processes or hosts.

### Server contracts and safeguards

`POST /api/weather/places` accepts only `{query}` (2–100 characters).
`POST /api/weather/forecast` accepts only numeric `{latitude,longitude}` in range.
Neither route accepts upstream URLs, contacts, accounts or payment information.
Browser requests remain same-origin. User IPs/headers are not forwarded to the
providers. Weather coordinates are rounded to three decimals. A small server-only
CC0 `tz-lookup` dependency resolves destination timezones without another API call;
calendar and daylight-saving rules use `Intl`.

Fixed MET endpoint, bounded HTTPS geocoder configuration, identifying DU
User-Agent, redirect rejection, 12-second upstream timeout, one-MiB response cap,
four active calls and sixteen deduplicated in-flight keys constrain requests.
Existing IP limits are 15/minute and 150/day. Temperature/wind/rain units,
geographic response identity, timestamps, unique intervals and measurements are
validated. Missing values remain unknown, never zero. Overlapping hourly and
six-hour rain amounts are not added together.

An additive, restart-safe `weather_cache` table stores public forecast/place data
and expiry/conditional-request metadata. Existing database initialization locking
and whole-database encrypted backups apply. No customer/trip/order records change.
No database is required for local use: a bounded in-memory cache is used instead.

Forecasts honour provider `Expires`, with a minimum three-hour reuse period and
`If-Modified-Since` after expiry. Place results are cached for a day. Failed
revalidation may return a clearly marked previous forecast for up to one day,
with a five-minute retry window. Forecast model timestamps older than twelve
hours are also marked stale. Entirely expired forecasts are not labelled fresh.
The client preserves the last successful selection on failures and ignores stale
responses. No background polling or notification worker is added.

### Local review

Use the existing `pnpm dev` setup or a same-origin local Express preview with
`db: null`. Visit `/travel/weather`. Weather itself needs no credentials. Set
`WEATHER_GEOCODER_URL` only to an operator-approved Nominatim-compatible HTTPS
endpoint if replacing the default. No production credentials belong in this file.

`pnpm test:e2e:weather` uses synthetic API responses and simulated geolocation;
`pnpm test:modules` includes provider, cache, validation and MySQL integration
regressions. The MySQL tests require a disposable localhost `_test` database.
Real provider checks are bounded manual read-only checks, not a periodic job.

### Verification on 27 October 2026

- Production build and both TypeScript checks passed; output is 57.98 MiB within
  the existing 60 MiB deployment budget. SEO checks passed for 74 route documents
  and 61 canonical URLs. Strict translations and repository guardrails passed.
- All 414 backend tests passed, including real disposable MySQL integration
  tests; 125 frontend tests and seven additional Node checks passed. The
  disposable database container and volume were removed afterwards.
- Six Weather and ten appearance browser scenarios passed in Chromium/WebKit at
  375, 768 and 1440 pixels. Travel journeys passed in both engines; 192 strict
  layout/CSP/keyboard checks passed across four languages and four widths.
  Weather geolocation was simulated; no physical device location was accessed.
- Actual same-origin place search and forecast requests succeeded. One Cape Town
  forecast took 179 ms initially and 5 ms from cache; these are individual local
  observations, not service-level guarantees or forecast-accuracy measurements.

The local review server is available at
`http://127.0.0.1:4187/travel/weather`, with no database or provider key required.
Protected main requires a passing pull-request build before merge. A main push
runs the full CI gate again, releases the matching Oracle backend through the
existing outbound release worker, and then publishes Vercel. The pipeline verifies
the deployed commit, database readiness, Onesa readiness and public canonical
routes; a failed frontend verification triggers the existing Vercel rollback.

The release review also updated Express's transitive `qs` dependency to 6.16.1
for [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw).
The production dependency audit passes with no known vulnerabilities.

## Appearance

The default is **System**: `prefers-color-scheme` changes apply without reload.
The footer provides System/Light/Dark choices; explicit overrides persist in safe
optional local storage and synchronize across tabs. A small same-origin external
head script applies the initial preference before React, preserving the existing
CSP. Stored invalid values revert to System; blocked storage remains usable.

Shared editorial/Travel tokens adapt canvases, cards, text and controls. Photo
heroes, immersive experiences and brand navigation retain their dark palette;
Home typography, logo and hero image are unchanged. Toasts follow resolved colour.

`pnpm test:e2e:theme` covers live system changes, manual override/reload, System
reset, cross-tab changes/removal, storage denial and responsive main routes in
Chromium/WebKit at 375, 768 and 1440 pixels. Bootstrap regressions run with the
frontend tests. Theme and Weather browser journeys are included in normal CI.
