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
`pnpm test:seo:live`. Both the Vercel Git integration and CI use `vercel.json`.

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

## Oracle monitoring

`.github/workflows/infra-health-check.yml` runs every 15 minutes and supports
manual dispatch. Configure these repository variables:

| Variable                      | Value                                                |
| ----------------------------- | ---------------------------------------------------- |
| `BACKEND_HEALTH_URL`          | `https://du-api.152-70-22-84.sslip.io/api/ping`      |
| `BACKEND_DATABASE_HEALTH_URL` | `https://du-api.152-70-22-84.sslip.io/api/health/db` |
| `BACKEND_ONESA_HEALTH_URL`    | `https://du-api.152-70-22-84.sslip.io/api/ai/ready`  |

The database and Onesa URLs can be derived from the app origin when omitted.
Checks require JSON, app liveness, MySQL connectivity and AI readiness. They do
not fall back to retired hosting variables or endpoints.

The existing failure-alert job uses `HEALTHCHECK_ALERT_TO` and
`HEALTHCHECK_ALERT_FROM` as variables or secrets, plus SMTP secrets
`HEALTHCHECK_SMTP_SERVER`, `HEALTHCHECK_SMTP_PORT`, `HEALTHCHECK_SMTP_USERNAME` and
`HEALTHCHECK_SMTP_PASSWORD`. `HEALTHCHECK_SMTP_SECURE` is an optional variable.
The alert only runs when a health job fails.

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
