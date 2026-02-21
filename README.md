# Diaspora Unlocked Platform

**Zimbabwe Global and Diaspora Gateway** - A unified digital platform connecting Zimbabwe's diaspora with trade, tourism, and investment opportunities.

## Overview

The Diaspora Unlocked Platform addresses critical gaps in Zimbabwe's diaspora engagement strategy by providing:

- **Export Knowledge Hub**: Comprehensive guidance on German market requirements, certifications, and partnerships.
- **Tourism Information**: Discover Zimbabwe's world-class attractions with diaspora-focused packages.
- **Investment Marketplace**: Micro-investment and crowdfunding opportunities with government support.
- **Trade Information**: Export development programs and diaspora trade networks.
- **Data & Insights**: Real-time economic indicators and success stories of diaspora impact.

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

```
zigd-platform/
├── client/
│   ├── public/              # Static assets & localization files
│   │   ├── images/          # High-quality visual assets
│   │   └── locales/         # i18n translation JSONs (en, de, sn, nd)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Layout.tsx   # Multi-language layout with nav/footer
│   │   │   └── ...
│   │   ├── pages/           # Fully translated page components
│   │   │   ├── Home.tsx
│   │   │   ├── Exports.tsx
│   │   │   ├── Tourism.tsx
│   │   │   ├── Investment.tsx
│   │   │   ├── Trade.tsx
│   │   │   ├── DataVisualization.tsx
│   │   │   └── SuccessStories.tsx
│   │   ├── i18n.ts          # i18n configuration
│   │   ├── App.tsx          # Main app with routing
│   │   └── ...
│   └── index.html
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

# Start development server
pnpm dev

# Build for production
pnpm build
```

The development server will start at `http://localhost:3000`

## Payment Provider Setup

The shop supports Stripe, PayPal, and Amazon Pay in production, plus a Dummy Gateway in development/testing.

### Register with Stripe

1. Create an account at [stripe.com](https://stripe.com/).
2. Complete business verification in Stripe Dashboard.
3. Create API keys (test + live) in Developers > API keys.
4. Store keys in your deployment environment (never commit secrets).
5. Use Stripe test cards in non-production environments.

### Register with PayPal

1. Create a PayPal Business account at [paypal.com/business](https://www.paypal.com/business/).
2. Go to [developer.paypal.com](https://developer.paypal.com/) and create a REST app.
3. Capture sandbox and live client credentials.
4. Add credentials to your deployment environment.
5. Validate checkout flows using PayPal sandbox accounts before going live.

### Register with Amazon Pay

1. Create a merchant account at [pay.amazon.com](https://pay.amazon.com/).
2. Enable Amazon Pay for your merchant region.
3. Generate API credentials and merchant identifiers in Seller Central/Amazon Pay console.
4. Store credentials in deployment environment variables.
5. Run end-to-end sandbox tests before production rollout.

### Development and Testing Mode

- In non-production (`NODE_ENV !== production`), a **Dummy Gateway (Dev/Test)** payment option is enabled.
- In production, only Stripe, PayPal, and Amazon Pay are accepted by the API.

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

## Render Keepalive (Free Tier)

To reduce cold starts on Render free instances, this repo includes a scheduled GitHub Action:

- Workflow: `.github/workflows/render-keepalive.yml`
- Frequency: every 4 hours
- Ping script: `scripts/keepalive-ping.sh`

### Setup

1. In GitHub repo settings, add a secret:
   - `RENDER_KEEPALIVE_URL` = your backend keepalive URL (recommended: `https://<your-backend>/api/ping`)
2. Ensure GitHub Actions are enabled for the repository.
3. Optionally run it manually via Actions tab (`Render Keepalive` -> `Run workflow`).

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
