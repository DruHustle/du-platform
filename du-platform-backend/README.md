# Backend

Express routes, domain services, database access, authentication, workers, and
backend tests live here. Server-only localized copy is in `shared/copy/`, and
the shop approval example is in `config/`.

Install dependencies once from the repository root with
`pnpm install --frozen-lockfile`. From this folder:

```bash
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm start
```

Development loads the root `.env` when present. Production requires the runtime
environment described in the root `.env.example`. The build writes
`dist/server.js`; `pnpm start` runs that bundle. The API can run without a UI
build. When available, it serves the sibling frontend's `dist/` output with the
existing SPA fallback and SEO handling.

Backend tests use `vitest.config.ts` with Node globals and no frontend Vite
configuration. Database integration tests require the dedicated test database
variables documented in the root README.

Shared contracts and domain data are in `../shared/`. Oracle deployment remains
in `../deploy/oracle/`: it exports this package with production dependencies and
copies frontend static output into the container's `dist/public/`.
