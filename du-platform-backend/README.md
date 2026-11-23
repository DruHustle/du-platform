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

## Onesa account migration

Register Diaspora Unlocked in Onesa Identity with product key `diaspora-unlocked`, role `user`, API audience `https://api.diasporaunlocked.com`, and a maximum access-token lifetime of 300 seconds. Use the separate web and native clients and exact callbacks listed in `.env.example`. Deploy the approved public JWKS to all API replicas before each provider key rotation. Each API replica validates tokens locally on every protected request.

Stage the additive `onesa_account_links` table defined in `modules/auth/onesaAccounts.ts` before enabling `ONESA_IDENTITY_ENABLED` in a verify-only deployment. Startup checks the table when the flag is enabled. For customers with existing records, the web and mobile sign-in screens ask for the existing Diaspora password on first link. Both identifiers are unique. A conflicting link returns HTTP 409 for investigation. Repeating an existing link preserves its original row. New customers can register a Diaspora account and then link it. The numeric account remains the owner of saved trips and other records.

To roll back the pilot, disable the flag and redeploy. Existing password sign-in continues and account links, new records and updated records stay in the same database. Keep the linkage table for reconciliation and future rollout. The Onesa user grant permits customer workflows. The separate Diaspora operator login remains under local email verification and allowlist controls. An issuer outage permits existing signed tokens until expiration, including after an API restart. Renewal beyond that expiry requires another provider authorization.
