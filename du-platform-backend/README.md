# Diaspora Unlocked backend

Express API, authentication, persistence, workers and provider integrations. The
backend owns business rules and does not build or serve the web application.
`openapi.json` is the versioned API description. Changes must remain compatible
with previously installed mobile versions; add fields and endpoints rather than
changing existing response meanings.

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

The [Render migration candidate](deploy/render/README.md) prepares an independent
backend move while preserving the current deployment path. Production keeps its
Aiven configuration by default; an explicitly selected self-hosted MySQL target
must provide a verified CA and a matching server identity.

### Reconciling Kiwi.com referrals through Awin

Once the publisher and advertiser have approved the placement and the selected-offer link has been checked in the publisher account, initialize the optional ledger with `npm run travel:reconcile -- --init-schema` in the built backend. The command uses the backend's existing database and TLS settings. Public Travel search and direct supplier links also work without these tables.

Supply the approved publisher and advertiser IDs in `TRAVEL_AWIN_PUBLISHER_ID` and `TRAVEL_AWIN_ADVERTISER_ID`. Keep `TRAVEL_AWIN_API_TOKEN` in the server secret store. Run `npm run travel:reconcile -- transaction YYYY-MM-DD YYYY-MM-DD` for an inclusive UTC reporting period of up to 31 days. Repeat for `validation` and `amendment`, and rerun the original transaction period after each payment cycle to pick up later payment IDs. The command fetches current records from Awin, matches its click reference to a link issued by this installation, and commits the batch atomically. A first observation requires a matching click reference. If a later payment or cancellation omits that reference, reconciliation uses the previously attributed transaction ID for the same publisher and advertiser. Unknown or malformed references are reported separately. Published marketing claims require an approved account and a partner-permitted test in the real account.

`travel_awin_handoffs` counts issued referral links. In `travel_awin_observations` the highest `sequence_id` for a transaction is its latest known state. A pending transaction is a reported sale awaiting validation. Only an approved transaction earns the reported commission. A subsequent declined or deleted state removes that transaction from approved earnings. A positive payment ID with the network's paid-to-publisher flag is separate payout evidence. Earlier observations preserve amendments and reversals. Group by currency, count each current transaction once, and match payments to Awin Payment History and the bank statement before marking cash received.

[Awin publisher transactions](https://help.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-publisher) · [Awin payment reports](https://www.awin.com/gb/news-and-events/publisher-training/payment-reporting)

## AI dependency checks

`GET /api/ai/health` checks the configured provider's model catalogue without
cloud generation. `ok: true` and `modelAvailable: true` mean a configured model
was listed; `ready` and `inferenceVerified` remain false until an actual cloud
request completes. A missing or malformed catalogue, missing selected model or
failed authorization cannot qualify the provider. Providers without a catalogue
(HTTP 404/405) need matching recent generation evidence instead.

`GET /api/ai/ready` returns HTTP 200 only while a successful generation remains
within the two-minute evidence window for the same provider endpoint, model and
configuration, including credentials. Otherwise it returns 503. Changing that
configuration, or a subsequent failed generation for the qualified target,
invalidates the proof and cached readiness. Greetings, fixed identity replies,
mock mode and public catalogue answers do not establish production inference.
Cloud readiness performs only bounded authenticated GETs, never paid warm-up
requests. The existing bounded local Ollama probe remains separate.

Chat remains available to attempt the first real request while readiness is
unverified. Trip planning uses its labelled deterministic fallback until recent
inference is verified. A deployment qualification must explicitly exercise a
bounded authorized provider request; a model list or these local synthetic HTTP
tests is not evidence of a working hosted model. After a restart the in-memory
proof is intentionally empty. Configure the deployment liveness/database health
checks independently so an idle AI provider does not cause restart loops.
