# Diaspora Unlocked Platform

**The Diaspora Gateway** - A unified digital platform connecting Zimbabwe's diaspora with trade, tourism, investment, remittance, and family care opportunities.

## Definitions

- **The Diaspora Gateway**: The official product identity used across public-facing materials.
- **Diaspora Unlocked Platform**: The technical platform/repository name used in development and operations contexts.
- **NTIR**: National Trusted Investment Registry.

## Overview

The Diaspora Unlocked Platform addresses critical gaps in Zimbabwe's diaspora engagement strategy by providing:

- **Export Knowledge Hub**: Comprehensive guidance on German market requirements, certifications, and partnerships.
- **Tourism Information**: Discover Zimbabwe's world-class attractions with diaspora-focused packages.
- **Investment Marketplace**: Micro-investment and crowdfunding opportunities with government support.
- **Trade Information**: Export development programs and diaspora trade networks.
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

### 📦 Export Knowledge Hub
- German market requirements and regulations.
- EU import compliance (REACH, CE marking, phytosanitary).
- Certification requirements (organic, fair trade).
- Potential partners database (retailers, logistics, regulatory).

### ✈️ Tourism Information
- Forbes #1 destination 2025 highlights.
- Key attractions (Victoria Falls, Great Zimbabwe, Kariba, Matobo Hills).
- Planning information (visa, health, safety, payments).
- Diaspora homecoming packages.

### 💰 Investment & Trade
- Diaspora-friendly crowdfunding projects and share-based models.
- National Trusted Investment Registry (NTIR) integration.
- Key export sectors (horticulture, leather, arts & crafts, minerals).
- ZimTrade programs (Eagles Nest, Next She Exporter, Shop At Zim).

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
du-platform/
├── backend/                         # Express API backend
│   ├── api/                         # API route registration
│   ├── core/                        # Core middleware, RBAC, logging
│   ├── db.ts                        # Database bootstrap + schema sync
│   ├── modules/                     # Domain modules (ai, fintech, tourism, etc.)
│   ├── shared/                      # Backend shared helpers + persistence stores
│   ├── sql/                         # Database SQL artifacts
│   └── server.ts                    # Backend entry point
├── frontend/
│   ├── index.html
│   ├── public/                      # Static assets + SEO files
│   │   ├── images/
│   │   ├── locales/                 # i18n translation JSONs (en, de, sn, nd)
│   │   ├── sitemap.xml
│   │   └── e5444f8401994dd898d81a68b1a0c23a.txt
│   ├── shared/
│   │   └── const.ts                 # Frontend-shared constants
│   └── src/
│       ├── components/              # Reusable UI components
│       ├── modules/                 # Feature modules
│       ├── pages/                   # Route-level pages
│       ├── i18n.ts
│       ├── App.tsx
│       └── main.tsx
├── scripts/
│   ├── dev-all.sh
│   ├── generate-sitemap.mjs
│   ├── sync_translations.py
│   └── tests/
├── docs/
├── patches/                         # pnpm dependency patches
├── package.json
└── ...
```

## Local Development

### Prerequisites
- Node.js 22.x or higher
- pnpm 10.x or higher

### Installation

```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev

# Build for production
pnpm build
```

The frontend app will start at `http://localhost:3000`

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
