# Frontend

This is an independent React/Vite application. It has its own dependencies,
lockfile, TypeScript settings, patches, hosting settings, tests, and environment.
It can be copied out of this repository and used on its own.

From this folder, using Node 22.12+ and the pinned pnpm version:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm test:seo
pnpm preview
```

The build writes `dist/` without needing a live API. Local/CI builds can set
`DU_PUBLIC_CATALOGUE_FILE` to a public catalogue fixture, or opt into the published
catalogue with `DU_CATALOGUE_STRATEGY=published`. Production Vercel builds always
require the published database catalogue. `vercel.json` works with this
directory as the deployment root.

Vite reads this folder's `.env` and `.cert/`. Only `VITE_*` values enter browser
code. `/api` proxies to `BACKEND_URL`, defaulting to `http://localhost:5001`.
The frontend communicates with the API over HTTP; it does not import backend
code or require the backend for installation, checks, tests, or local builds.

`src/contracts/` contains this app's own models, validation, and domain data.
There is no common package or parent configuration. Changes to API formats must
be reflected in both applications.
