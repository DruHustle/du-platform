# Diaspora Unlocked backend

Express API, authentication, persistence, workers and provider integrations. The
backend owns business rules and does not build or serve the web application.
`openapi.json` is the versioned API description. Changes must remain compatible
with previously installed mobile versions; add fields and endpoints rather than
changing existing response meanings.

Each documented operation has an `x-contract-coverage` marker. `schema` identifies
operations with explicit request or response shapes; `route-inventory` records an
endpoint whose payload has not yet been fully specified. The latter must not be
treated as a complete generated-client contract. Authentication descriptions
also distinguish native bearer sessions from the origin and CSRF requirements
for browser cookie writes.

The OpenAPI tests compare the document with the registered Express routes and
backend-owned validators, then validate actual HTTP response envelopes and
nested client fields. Controlled storage and provider fixtures exercise failure
and replay behavior without contacting production services. Existing MySQL
integration suites add persistence-level contract assertions when the disposable
database settings below are supplied. No frontend source or shared application
package is needed to run these checks.

Use Node 22.13 or newer and pnpm 10.4.1 (via Corepack), as in CI.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm start
```

The development command loads the local `.env` when present. Set production
environment variables in the process or deployment secret manager; `pnpm start`
does not load `.env` automatically. Configure a dedicated
MySQL database, JWT secret, allowed origins and email/provider credentials for
real integrations. Never use production credentials for tests. Database suites
require disposable localhost databases ending in `_test`, provided through
`SHOP_TEST_DATABASE_URL` and `NEWSLETTER_TEST_DATABASE_URL`. The API serves its own catalogue images from `assets/shop/`; preserve that
directory alongside `dist/` when deploying outside Docker. The Oracle image is
built from the backend directory with `deploy/oracle/Dockerfile` and contains only
this application. The web hosting proxy routes `/api` to it independently.
