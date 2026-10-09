# Diaspora Unlocked Platform

**The Diaspora Gateway** - A unified digital platform connecting Zimbabwe's diaspora with tourism, investment, remittance, shopping, and technology opportunities.

## Definitions

- **The Diaspora Gateway**: The official product identity used across public-facing materials.
- **Diaspora Unlocked Platform**: The technical platform/repository name used in development and operations contexts.
- **NTIR**: National Trusted Investment Registry.

## Overview

The Diaspora Unlocked Platform addresses critical gaps in Zimbabwe's diaspora engagement strategy by providing:

- **Tourism Information**: Discover Zimbabwe's world-class attractions with diaspora-focused packages.
- **Investment Marketplace**: Micro-investment and crowdfunding opportunities with government support.
- **Impact & Insights**: Diaspora impact stories, remittance insights, and economic participation indicators.

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
- Planning information (visa, health, safety, payments).
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
├── shared/                         # Both applications: SEO, shop catalog, sender countries
├── .github/                        # Repository workflows
├── .githooks/                      # Repository hooks
├── scripts/                        # Development, guardrails, translations, E2E tools
├── docs/
├── patches/                        # Existing pnpm dependency patches
├── package.json                    # Single dependency manifest and app scripts
├── pnpm-lock.yaml                  # Single, unchanged lockfile
├── tsconfig.json                   # Shared compiler options and root aliases
├── render.yaml                     # Full-stack deployment from repository root
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
FINANCIAL_SANDBOX_MOCK=true pnpm test:modules
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

There is no separate lint script. Existing browser/provider E2E scripts require
running services and their configured providers; see the Onesa section below.
Production Express serves the built frontend from `dist/public/`, including the
existing SPA fallback and SEO injection. Build outputs stay at the repository
root to preserve this behavior.

## Hosting Configuration

GitHub repository: https://github.com/DruHustle/du-platform (one repository).
Vercel and Render must use the **repository root**, not either application folder,
because dependencies, the lockfile, environment configuration, shared code, and
build orchestration are rooted there. Keep Vercel output directory `dist/public`
and Render start command `pnpm start`; both use `pnpm install` and `pnpm build`.
If a dashboard currently uses `frontend` or `backend` as its root directory, clear
that setting. Reconnect an integration still pointing to the old GitHub repository
name if it does not follow GitHub's rename redirect. No deployment is needed to
review the local restructuring; deployments should wait until the changes are
committed and approved.

## Payment Provider Setup

The shop currently supports:

- manual assisted checkout in production
- Dummy Gateway in development/testing

Direct Stripe, PayPal, and Amazon Pay checkout flows are not implemented in this codebase yet.

## Reloadly Setup

Reloadly powers:

- airtime top-up

These credentials are **backend-only secrets**.

### Where to set Reloadly env vars

- **Local development**: root `.env`
- **Render**: backend service environment variables
- **Vercel**: do **not** set these unless you are intentionally running backend code there
- **GitHub Actions**: not required for normal app runtime

In this repo, the Reloadly integration runs from the Express backend on Render, so the production values belong on **Render**, not Vercel.

### Required variables

Enter these on the **Render backend service** and in your local `.env` when testing locally:

```env
RELOADLY_CLIENT_ID=your_reloadly_client_id
RELOADLY_CLIENT_SECRET=your_reloadly_client_secret
RELOADLY_BASE_URL=https://topups-sandbox.reloadly.com
```

Optional:

```env
RELOADLY_AUTH_URL=https://auth.reloadly.com
```

### Sandbox vs live

For **sandbox**:

```env
RELOADLY_BASE_URL=https://topups-sandbox.reloadly.com
```

For **live/production**:

```env
RELOADLY_BASE_URL=https://topups.reloadly.com
```

### Audience variables

You normally do **not** need to set these:

```env
RELOADLY_AUDIENCE=
```

The backend now derives the correct OAuth audience from the configured Reloadly base URLs.

Only set them if Reloadly support explicitly tells you to override the default audience.

### Important note about credentials

Reloadly uses **OAuth Client ID + Client Secret**.

If your dashboard labels them as:

- `Client ID`
- `Client Secret`

map them directly to:

```env
RELOADLY_CLIENT_ID=...
RELOADLY_CLIENT_SECRET=...
```

Do not expose these values in frontend env vars such as `VITE_*`.

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

## Render Health Check And Keepalive

To reduce cold starts and detect production outages, this repo includes a scheduled GitHub Action:

- Workflow: `.github/workflows/infra-health-check.yml`
- Frequency: every 15 minutes
- Probe scripts:
  - `scripts/keepalive-ping.sh`
  - `scripts/healthcheck-json.sh`

### Setup

1. In GitHub repo settings, add repository variables:
   - `RENDER_KEEPALIVE_URL` = your backend app health URL (recommended: `https://<your-backend>/api/ping`)
   - `RENDER_DB_KEEPALIVE_URL` = your backend DB health URL (recommended: `https://<your-backend>/api/health/db`)
   - `RENDER_ONESA_READY_URL` = your Onesa readiness URL (recommended: `https://<your-backend>/api/ai/ready`)
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
KEEPALIVE_URL=https://<your-backend>/api/ping pnpm keepalive:ping
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
