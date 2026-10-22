# Diaspora Unlocked Architecture

The repository contains a React 19/Vite frontend and an Express backend, with a
single root dependency manifest and lockfile. Shared route metadata and shop
catalogue data live in `shared/`.

## Frontend

`du-platform-frontend/src/main.tsx` initializes localization and mounts `App`.
Domain route manifests are combined in `src/modules/routes.tsx`. The shared
`Layout` provides navigation, search, account controls, page metadata, and the
footer. Secondary pages use the shared lazy-route factory.

Active domains are home, tourism, investment, technology, shop, authentication,
legal content, search, Onesa AI, and administration. The UI supports English,
German, Shona, and Ndebele through locale files in `public/locales/`.

The shared UI directory contains components used by the application, rather than
an unused component catalogue. `contexts/ThemeContext.tsx` owns the application
theme, including toast notifications. Add dependencies when a route or shared
component needs them; keep the root manifest and lockfile in sync when retiring
components.

## Backend

`du-platform-backend/server.ts` installs core middleware, system endpoints, domain
routers, JSON API fallbacks, and the production SPA document handler. Domains use
controllers, services, repositories, validation, and persistence helpers.

Active API prefixes are `/api/auth`, `/api/tourism`, `/api/investment`, `/api/shop`,
`/api/ai`, `/api/search`, `/api/legal`, `/api/admin`, `/api/notifications`,
and `/api/impact`. Impact content remains manageable through the admin
API. The AI module also owns the compatibility speech endpoints.

Authentication uses password hashing, short-lived bearer tokens, and HttpOnly
session cookies. Protected APIs retain JWT validation, admin authorization,
request limits, origin checks, and CSRF enforcement. Production requires a
configured database and JWT secret. Development can use memory storage.

## Public journeys

- `/tourism`: destinations, planning information, and Onesa travel experiences.
- `/investment`, `/investment/opportunities`, `/investment/projects/:id`, `/ntir`:
  investment information and registry discovery.
- `/shop`, `/shop/products`: catalogue, cart, and assisted checkout.
- `/technology`: product and technology information.
- `/onesa-ai-chat`, `/onesa-ai-book-trip`, and the tourism virtual/augmented
  experience routes: AI and immersive experiences.
- `/login`, `/register`, `/forgot-password`, `/reset-password`: account access.
- `/regulations`, `/privacy-policy`, `/terms-of-service`, `/cookie-settings`:
  legal content and preferences.
- `/search` and `/admin`: discovery and authorized administration.

The retired money-transfer module is absent from frontend and API registries.
Database initialization does not create or migrate its historical tables. Existing
records are left intact; this source change does not drop or delete stored data.

## Verification

Run `pnpm check`, `pnpm test`, `pnpm guardrails`, `pnpm translations:check:keys`,
and `pnpm build` from the repository root. See the README for local sandbox
startup and browser regression scripts.
