# CI/CD and production operations

Diaspora Unlocked uses Vercel for the frontend and the shared Oracle VM
**Software Engineering Backend** for its API. The managed database and provider
integrations remain unchanged. See [Oracle operations](../deploy/oracle/README.md)
for image releases, ingress, runtime configuration and rollback.

## Application releases

`.github/workflows/ci-cd.yml` validates pushes to `main` and `develop`, and pull
requests to `main`. Its build gate runs the production dependency audit,
frontend/backend type checks, module and frontend tests, guardrails, production
build, initial HTML/SEO checks, and navigation, shop and discovery browser tests.
Formatting is reported separately.

After that gate passes, a push to `main` deploys Vercel production. Pull requests
receive previews. Deploy from source; do not use stale prebuilt artifacts. The
source-controlled Vercel build explicitly sets `VITE_API_URL=/api`, builds and
checks the output before publishing. `/api/*` proxies to
`https://du-api.152-70-22-84.sslip.io/api/*`. This keeps sessions first-party and
prevents dashboard API settings from overriding the tested routing.

The production job also checks the published HTML, canonical URLs, API proxy and
all referenced JavaScript chunks, including lazy routes. No production browser
chunk may reference a retired backend. Run the same check with
`pnpm test:seo:live`. GitHub Actions is the only automatic deployment owner;
`git.deploymentEnabled=false` disables duplicate Vercel Git builds while keeping
the repository connected. PR previews and production releases still run after
the complete CI gate.

Oracle backend releases are independent, manual container updates using a tested
source commit. They do not run automatically when the frontend is published.
The Dockerfile embeds `APP_REVISION`; `/api/ping` reports it as `commit`.
Retired deployment manifests and workflows have been removed. Historical
configuration remains in Git history and the private migration backup.

## GitHub configuration

Vercel deployments need these existing repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Use the existing project and account. Keep credentials in GitHub secrets, never
in source, logs, build artifacts or browser environment variables.

## Oracle readiness checks

There is no scheduled infrastructure-monitoring workflow or automated health
alert email. Docker retains its container health check, and the API keeps
`/api/ping`, `/api/health/db` and `/api/ai/ready` for manual release verification
and troubleshooting. No repository monitoring variables or SMTP alert secrets
are required. The application's newsletter email configuration is separate.

## Review and troubleshooting

Run `pnpm check`, `pnpm test`, `pnpm guardrails`, `pnpm build` and
`pnpm test:seo` locally. Run the navigation, shop and discovery browser suites
before a release. `pnpm test:seo:live` checks the published site after deployment.

Inspect GitHub Actions and Vercel build logs for frontend failures. For API
failures, inspect Oracle container status and logs, then check liveness, database
and AI readiness directly and through the public frontend proxy. A healthy proxy
alone does not prove the compiled browser uses it; inspect all published chunks.

Keep authentication, CORS, CSRF and TLS checks enabled. Backend rollback restores
the previous tested Oracle image and repeats readiness checks, without changing
managed production data or restarting sibling applications.

## Deployment storage

The frontend output has a 60 MiB total budget and a 6 MiB per-file budget.
`pnpm build:frontend` checks both automatically; `pnpm check:deployment-size`
repeats the check. Home and Shop image content is unchanged. Large tourism/VR
JPEGs are encoded efficiently at their original dimensions, and unused originals
and retired-feature images are excluded. Keep media source backups outside the
public directory; every public file is copied into every deployment.

Vercel builds only the frontend. `.vercelignore` excludes the Oracle backend,
deployment tools, local output, private environment files and dependencies from
source uploads. Full backend/frontend checks still run in GitHub Actions.

Keep project-specific retention appropriate to review and rollback needs. The
current production alias and Vercel's protected recent releases remain available.
Avoid creating duplicate manual releases of an unchanged commit. The Usage chart
records daily storage peaks; an earlier peak does not disappear when deployments
are later removed. Compare retained releases and new build output separately from
historical usage. See [Vercel Deployment Storage](https://vercel.com/docs/deployment-storage).
