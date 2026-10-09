# Diaspora Unlocked Architecture V2 (DDD Modular)

## Strategic Model

The platform is organized as bounded domains with strict service-layer communication:

- core (cross-cutting concerns)
- auth
- tourism
- investment
- shop
- ai
- fintech
- data
- search
- legal
- admin

## Backend Structure

```text
du-platform-backend/
  core/
    config.ts
    logger.ts
    errorHandler.ts
    middleware.ts
    rateLimiter.ts
    rbac.ts
    auditLogger.ts
  shared/
    database.ts
    responseFormatter.ts
    validators.ts
  modules/
    auth/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    tourism/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    investment/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    shop/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    ai/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
      chat/
      booking/
      ar/
      vr/
      shared/
    fintech/
      providers/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    data/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    search/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    legal/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
    admin/
      controllers/ services/ repositories/ routes/ validators/ dto/ types/ tests/
```

## Frontend Structure

```text
du-platform-frontend/src/
  modules/
    tourism/
    investment/
    shop/
    ai/
    fintech/
    data/
    legal/
    shared/
  layouts/
    ModuleLayout.tsx
  styles/
    modules.css
  types/
    api.ts
```

## Route Domain Mapping

- `/tourism` -> tourism module
- `/investment` -> investment module
- `/shop` -> shop module
- `/ai/chat` -> ai.chat module
- `/ai/book-trip` -> ai.booking module
- `/ai/ar` -> ai.ar module
- `/ai/vr` -> ai.vr module
- `/search` -> search module
- `/impact` -> legal/content-admin responsibility split
- `/technology` -> core/product-marketing domain
- `/regulations` -> legal module
- `/legal/privacy-policy`, `/legal/terms-of-service`, `/legal/cookie-settings` -> legal module

## Fintech Design

Controllers -> Services -> Providers + Repositories

- Controllers: orchestration only
- Services: business rules, idempotency, compliance checks
- Providers: Thunes/Reloadly integration
- Repositories: transaction persistence (shared DB connection via `withTransaction`)

## AI Design

- ai/chat
- ai/booking
- ai/ar
- ai/vr

Module-level discovery endpoint:
- `GET /api/ai/capabilities`

Shared AI utilities:
- prompt templates
- in-memory session memory store
- analytics tracker (audit stream)

## Security Hardening

- input validation via zod middleware
- structured request logging
- centralized error formatting
- RBAC middleware scaffold
- API rate limiting middleware scaffold
- CSRF gate scaffold (toggle via env)
- fintech request limits and idempotency handling in services

## Migration Plan

1. Keep the module registry mounted under `/api/*`.
2. Move one domain at a time from legacy handlers to module services.
3. Attach module-level unit + integration tests in CI.
4. Retire legacy route code once feature parity is validated.

## Test Commands

- `pnpm check`
- `pnpm build`
- `pnpm test:modules`
