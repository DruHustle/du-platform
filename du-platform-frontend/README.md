# Frontend

React, Vite, browser routes, components, styles, translations, and public assets
live here. `package.json` owns browser dependencies and frontend tooling.

Install dependencies once from the repository root with
`pnpm install --frozen-lockfile`. From this folder:

```bash
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm preview
pnpm test:seo
pnpm translations:check
```

The build writes `dist/`, including static route documents and SEO assets.
Local or CI builds can use `DU_PUBLIC_CATALOGUE_FILE` for an explicit catalogue
fixture or `DU_CATALOGUE_STRATEGY=omit` for a service-free build. Production
Vercel builds retain the published-catalogue requirement.

Vite reads the root `.env` and `.cert/`. It exposes only `VITE_*` variables to
browser code and proxies `/api` to `BACKEND_URL` (default port 5001). Keep secrets
out of `VITE_*` variables. Shared contracts and domain data are in `../shared/`;
frontend code must not import backend modules.

The root `vercel.json` deploys this package's `dist/`. Cross-app browser tests and
release operations stay in the root `scripts/` folder.
