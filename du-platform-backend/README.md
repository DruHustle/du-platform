# Backend

This is an independent Express application. It has its own dependencies,
lockfile, TypeScript settings, tests, environment, and Dockerfile. It can be
copied out of this repository and used on its own.

From this folder, using Node 22.12+ and the pinned pnpm version:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm start
```

Development reads this folder's `.env`. Production receives runtime environment
variables from its host. `pnpm build` writes `dist/server.js`. `pnpm start` runs
the production bundle; configure the database, secrets, and providers first.
Database tests require dedicated `SHOP_TEST_DATABASE_URL` and
`NEWSLETTER_TEST_DATABASE_URL` test databases.

`contracts/` contains this app's own models, validation, and domain data. `lib/`
contains backend helpers, persistence stores, and server-only copy. The backend
does not import frontend code, read its configuration, or require its files.

The API runs without a UI build. A deployment may supply static files through
`STATIC_DIR`, or place them beside the bundle at `dist/public/` to enable SPA
fallback. The standalone Dockerfile builds this app alone. The repository's
Oracle deployment separately builds both applications and composes their output.
