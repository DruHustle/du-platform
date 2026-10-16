# Diaspora Unlocked Platform

**The Diaspora Gateway** - A unified digital platform connecting Zimbabwe's diaspora with tourism, investment, shopping, and technology opportunities.

## Definitions

- **The Diaspora Gateway**: The official product identity used across public-facing materials.
- **Diaspora Unlocked Platform**: The technical platform/repository name used in development and operations contexts.
- **NTIR**: National Trusted Investment Registry.

## Overview

The Diaspora Unlocked Platform addresses critical gaps in Zimbabwe's diaspora engagement strategy by providing:

- **Tourism Information**: Discover Zimbabwe's world-class attractions with diaspora-focused packages.
- **Investment Marketplace**: Micro-investment and crowdfunding opportunities with government support.
- **Impact & Insights**: Diaspora impact stories and economic participation indicators.

## Key Features

### 🌍 Multi-Language Support

- Full localization in **English**, **German**, **Shona**, and **Ndebele**.
- Seamless language switching across all pages and components.
- Culturally relevant content for diverse diaspora communities.

### 🖼️ Dynamic Visual Experience

- Enhanced hero carousels with 5+ unique, high-quality images per page.
- Auto-playing carousels with interactive indicators and smooth transitions.
- Fully translated captions and badges for every slide.

### ✈️ Tourism Information

- Forbes #1 destination 2025 highlights.
- Key attractions (Victoria Falls, Great Zimbabwe, Kariba, Matobo Hills).
- Diaspora homecoming packages.

### 💰 Investment

- Diaspora-friendly crowdfunding projects and share-based models.
- National Trusted Investment Registry (NTIR) integration.

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Localization**: react-i18next
- **Animations**: Framer Motion
- **Routing**: Wouter
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Project Structure

```text
du-platform/                         # One parent Git/GitHub repository
├── du-platform-frontend/            # React 19 + Vite application
│   ├── src/                        # UI, routes, domain modules, localization
│   ├── public/                     # Images, locales, audio, SEO assets
│   ├── shared/                     # Frontend-only helpers and data
│   ├── index.html                  # Browser entry; src/main.tsx boots React
│   ├── vite.config.ts
│   ├── components.json             # shadcn/ui configuration
│   ├── tsconfig.json
│   └── tsconfig.node.json
├── du-platform-backend/             # Existing Express API application
│   ├── server.ts                   # HTTP entry and production SPA serving
│   ├── db.ts                       # MySQL bootstrap and schema synchronization
│   ├── api/                        # API registration
│   ├── core/                       # Middleware, startup validation, RBAC
│   ├── modules/                    # Domain APIs and existing module tests
│   ├── shared/                     # Backend helpers and persistence stores
│   └── tsconfig.json
├── shared/                         # Both applications: SEO, shop catalog, password policy
├── .github/                        # Repository workflows
├── .githooks/                      # Repository hooks
├── scripts/                        # Development, guardrails, translations, E2E tools
├── docs/
├── patches/                        # Existing pnpm dependency patches
├── package.json                    # Single dependency manifest and app scripts
├── pnpm-lock.yaml                  # Single, unchanged lockfile
├── tsconfig.json                   # Shared compiler options and root aliases
├── deploy/oracle/                  # Oracle container deployment and operations
├── vercel.json                     # Static frontend deployment from repository root
└── README.md
```

Both application folders belong to the parent repository. They have no separate
Git repositories or submodules. Dependencies remain centralized in the existing
root manifest; install once at the root. This restructuring does not introduce
pnpm workspaces or change dependency versions.

## Local Development

Use Node.js 22 or higher (Vite 7 requires at least Node 22.12 on the 22.x line)
and the pnpm version pinned in `package.json`. Run all commands from the repository
root:

```bash
pnpm install --frozen-lockfile
# For a new checkout only; keep an existing .env intact:
cp .env.example .env
# Configure local credentials in .env, then:
pnpm dev
```

`pnpm dev` starts the existing development orchestrator, including its MySQL and
AI-provider checks. `pnpm dev:fast` skips local provider/database setup. Start the
applications separately with `pnpm dev:web` and `pnpm dev:server`. The frontend
normally uses `https://localhost:3000` (set `VITE_DEV_HTTPS=false` for HTTP), proxies
`/api` to `BACKEND_URL` (default `http://localhost:5001`), and reads the existing
root `.env` and `.cert/`. The backend also loads root `.env`; its port can be
configured with `DEV_PORT` or `PORT`. Never put backend secrets in `VITE_*` variables.

```bash
pnpm check                 # Frontend and backend TypeScript checks
pnpm check:frontend        # Frontend only
pnpm check:backend         # Backend only
pnpm test:modules
pnpm test:frontend         # Frontend regression tests
pnpm guardrails            # Vite, deployment, and locale safety checks
pnpm translations:check:keys
pnpm format:check          # Read-only Prettier check (not a lint command)
pnpm build                 # Builds both applications
pnpm build:frontend        # Outputs dist/public/
pnpm build:backend         # Outputs dist/server.js
pnpm preview               # Vite static preview; does not start the API
pnpm start                 # Production Express server; configure production env first
```

There is no separate lint script. The offline suite below requires no configured
services or devices. The older live-provider smoke scripts are documented in the
Onesa section below.

### Navigation regression tests

```bash
pnpm build
pnpm test:e2e:navigation
```

Uses installed Google Chrome and serves the production build on a temporary local
port without loading `.env`. API and optional font responses are mocked. At 375,
768, and 1440 pixels, it checks that primary tabs require no page-script downloads,
keep content visible, reset scrolling immediately, and show decoded hero images.
It also holds a lazy chunk to verify navigation stays usable and the latest click
wins, then exercises keyboard navigation, browser history, and search queries.
Reports and screenshots are saved to `/tmp/du-navigation-tests`
(`NAVIGATION_OUTPUT_DIR` overrides it). CI runs this check against installed
Playwright Chromium with `NAVIGATION_BROWSER_CHANNEL=chromium` before deployment.

### Shop cart regression tests

```bash
pnpm build
pnpm test:e2e:shop
```

Uses a temporary static server and installed Chrome, with browser-only inventory,
order, and notification fixtures. No database, payment, email, or other configured
service is needed. It checks product-card clicks, stock limits, +/− controls,
shared quantities across shop routes, refresh persistence, cross-tab updates,
blocked storage, availability retries, and failed/successful checkout at 375,
768, and 1440 pixels. Reports and screenshots go to `/tmp/du-shop-tests`
(`SHOP_OUTPUT_DIR` overrides it). CI uses `SHOP_BROWSER_CHANNEL=chromium`.

### Swipeable discovery regression tests

```bash
pnpm build
pnpm test:e2e:discovery
```

Runs without configured services using a temporary static server and mocked API
responses. At 375, 768, and 1440 pixels, it checks every discovery rail's final
tile, keyboard and arrow controls, mouse dragging, native touch swipes, attraction
dialog focus restoration, and project filtering/navigation. Screenshots and
reports go to `/tmp/du-discovery-tests` (`DISCOVERY_OUTPUT_DIR` overrides it).
CI uses `DISCOVERY_BROWSER_CHANNEL=chromium`.

### Service-free AI and device regression tests

```bash
pnpm build
E2E_BROWSER_CHANNEL=chrome pnpm test:e2e:offline
```

This suite starts and stops its own server on port 5012 (`E2E_MOCK_PORT` overrides
it). It supplies an explicit environment without database, email, or AI-provider
credentials and never loads `.env`. Local AI mock mode supplies replies,
transcriptions, and silent but decodable WAV audio. Chrome supplies synthetic
camera/microphone streams. The already-installed IWER dependency emulates a
Quest 3 WebXR session with stereo frames and two controllers; the emulator is
injected by the test and is absent from the application at runtime.

Reports, screenshots, server logs, and a downloaded trip PDF are saved to
`/tmp/du-platform-offline` (`E2E_OUTPUT_DIR` overrides it). Omit the browser channel
when Playwright Chromium is installed. Run the suites sequentially to respect
normal API rate limits. The offline suite also waits for the chat rate-limit
window before starting headset scenarios. Physical tracking, controller ergonomics, spoken audio
quality, and real-provider output still require hardware/provider acceptance.

### Browser regression review

The site audit and journey scripts accept **local URLs only**. The audit checks
public routes at 375, 768, and 1440 pixels and writes screenshots plus a JSON report
to `/tmp/du-platform-audit` (override with `E2E_OUTPUT_DIR`). Journey tests create
an account in the local sandbox and use browser-only fixtures for inventory and
newsletter responses; they do not place orders or send payments.

To review without loading saved database, email, or provider credentials, build
first, then start a memory-backed API serving the built frontend:

```bash
pnpm build
env -i PATH="$PATH" HOME="$HOME" \
  NODE_ENV=development PORT=5001 APP_BASE_URL=http://localhost:5001 \
  CORS_ORIGINS=http://localhost:5001 \
  node --import tsx du-platform-backend/server.ts
```

Open `http://localhost:5001`. From another terminal, run:

```bash
E2E_BROWSER_CHANNEL=chrome node scripts/tests/e2e-site-audit.mjs
E2E_BROWSER_CHANNEL=chrome node scripts/tests/e2e-site-journeys.mjs
```

Use `E2E_BASE_URL` for another local address. Omit `E2E_BROWSER_CHANNEL` when using
Playwright's installed Chromium. Restart the API after rebuilding so its cached
SPA document points to the current hashed assets. If testing Vite on a fallback
port, explicitly include that frontend origin in `CORS_ORIGINS`; keep the origin
allowlist and CSRF protection enabled. Optional Vercel analytics and Speed Insights
require both `VITE_ENABLE_VERCEL_ANALYTICS=true` at build time and visitor consent.
Revoking consent filters subsequent telemetry events.
The retired transfer feature is absent from navigation, route metadata, API
registration, provider configuration, and schema initialization. Existing database
records are preserved; no historical tables are dropped. Accounts, the shop,
tourism, investment information, and Onesa retain their independent controls.

Production Express serves the built frontend from `dist/public/`, including the
existing SPA fallback and SEO injection. Build outputs stay at the repository
root to preserve this behavior.

## Hosting Configuration

GitHub repository: https://github.com/DruHustle/du-platform (one repository).
Vercel builds the frontend from the **repository root** with output directory
`dist/public`. The production backend runs on the Oracle VM **Software Engineering
Backend**, shared with other independent applications. See
[Oracle deployment and rollback](deploy/oracle/README.md). Managed database and
provider integrations remain unchanged. Retired deployment configuration has been
removed; rollback uses the previous tested Oracle image.
The frontend build emits a static HTML document for each registered route,
including project details, with its own initial canonical, title, and robots
directive. Vercel serves these documents with `cleanUrls: true`; do not restore
the catch-all rewrite to `index.html`, which makes every initial document point
at the homepage. Unmatched URLs use `404.html` with HTTP 404. Existing typo
aliases permanently redirect to their corrected routes, and the API proxy stays
separate from static document routing.

Public canonical URLs use `https://www.diasporaunlocked.com`, matching the domain
redirect. `VITE_SITE_URL` can set a different deployment origin; production builds
default to the public origin rather than a local backend address. The build
generates `robots.txt` and a sitemap containing only indexable canonical routes.
Run `pnpm build && pnpm test:seo` to verify all initial HTML documents and sitemap
entries without JavaScript or configured services. After release, check the raw
HTML as well as the rendered DOM; canonical values must agree. Search Console
must recrawl the corrected pages before its indexing report can change.
`pnpm test:seo:live` checks the public site's raw HTML, redirects, robots file,
sitemap URLs, and API proxy without submitting data. Set `SEO_BASE_URL` to
inspect a preview deployment while expecting the public canonical origin.

If a dashboard currently uses `frontend` or `backend` as its root directory, clear
that setting. Reconnect an integration still pointing to the old GitHub repository
name if it does not follow GitHub's rename redirect. Review source changes and run the documented checks before updating production.

## Payment Provider Setup

The shop currently supports:

- manual assisted checkout in production
- Dummy Gateway in development/testing

Direct Stripe, PayPal, and Amazon Pay checkout flows are not implemented in this codebase yet.

### Shop Checkout Modes

1. In production, the shop API accepts `manual_assisted` checkout only.
2. In non-production (`NODE_ENV !== production`), the API also accepts `dummy_gateway` for local/dev testing.
3. The dummy flow exists only for testing order confirmation and stock handling.

### Development and Testing Mode

- In non-production (`NODE_ENV !== production`), a **Dummy Gateway (Dev/Test)** payment option is enabled.
- In production, only **manual assisted** checkout is accepted by the API.

## End-to-End Testing (Onesa Chat)

This project includes an Onesa API smoke E2E test script:

- `GET /api/onesa/health`
- `GET /api/onesa/ready`
- `POST /api/onesa/chat` (English + Shona greeting + practical prompt)

### Run E2E smoke test

```bash
pnpm test:e2e:onesa
```

By default, the script auto-detects a local backend on:

- `http://127.0.0.1:5001`
- `http://127.0.0.1:5002`
- `http://127.0.0.1:5003`
- `http://127.0.0.1:5000`

It prefers an instance where `/api/onesa/ready` is `true`.

### Run against a specific backend

```bash
pnpm test:e2e:onesa -- http://127.0.0.1:5003
```

Or with env:

```bash
ONESA_E2E_BASE_URL=http://127.0.0.1:5003 pnpm test:e2e:onesa
```

### Expected result

You should see:

```text
[PASS] /health
[PASS] /ready
[PASS] /chat English greeting
[PASS] /chat Shona greeting
[PASS] /chat practical guidance
[E2E] Onesa smoke test passed.
```

## Oracle Infrastructure Health Checks

To detect production outages, this repo includes a scheduled GitHub Action:

- Workflow: `.github/workflows/infra-health-check.yml`
- Frequency: every 15 minutes
- Probe scripts:
  - `scripts/keepalive-ping.sh`
  - `scripts/healthcheck-json.sh`

### Setup

1. In GitHub repo settings, add repository variables:
   - `BACKEND_HEALTH_URL` = `https://du-api.152-70-22-84.sslip.io/api/ping`
   - `BACKEND_DATABASE_HEALTH_URL` = `https://du-api.152-70-22-84.sslip.io/api/health/db`
   - `BACKEND_ONESA_HEALTH_URL` = `https://du-api.152-70-22-84.sslip.io/api/ai/ready`
   - `HEALTHCHECK_ALERT_TO` = destination alert email
   - `HEALTHCHECK_ALERT_FROM` = sender email identity
2. Add repository secrets for SMTP:
   - `HEALTHCHECK_SMTP_SERVER`
   - `HEALTHCHECK_SMTP_PORT`
   - `HEALTHCHECK_SMTP_USERNAME`
   - `HEALTHCHECK_SMTP_PASSWORD`
3. Ensure GitHub Actions are enabled for the repository.
4. Optionally run it manually via Actions tab (`Infra Health Check` -> `Run workflow`).

### Local manual ping

```bash
KEEPALIVE_URL=https://du-api.152-70-22-84.sslip.io/api/ping pnpm keepalive:ping
```

## Strategic Framework Alignment

The Diaspora Unlocked Platform addresses key gaps identified in the Diaspora Unlocked Strategic Framework:

- ✅ **SME Visibility**: Knowledge of international market requirements.
- ✅ **Trust Infrastructure**: National Trusted Investment Registry (NTIR).
- ✅ **Unified Presence**: Centralized digital hub for all diaspora engagement.
- ✅ **Cultural Connection**: Multi-language support in national and international languages.

## Partner Integration

The platform integrates with official Zimbabwe government agencies:

- **Zimbabwe Tourism Authority**: [zimbabwetourism.net](https://zimbabwetourism.net/)
- **ZIDA (Investment)**: [zidainvest.com](https://zidainvest.com/)
- **ZimTrade**: [tradezimbabwe.com](https://tradezimbabwe.com/)

---

**Supporting Zimbabwe's Vision 2030 through Diaspora Engagement**
