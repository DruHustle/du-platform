# Assisted-order pilot operations

This extends the existing assisted-payment shop. It does not collect payment,
book travel, create sellers or guarantee DHL coverage. Commercial procedures are
labelled drafts until the owner supplies and approves the inputs in
[the audit](audits/assisted-order-pilot.md). Use the
[Europe launch checklist and owner-input template](pilot-launch-readiness.md)
before approving commercial operation. This release deliberately selects enforced
prelaunch; commercial pilot/card activation remains unavailable.

Current owner inputs and actual production logical recovery/mailbox evidence are
recorded in [the 25 October acceptance report](audits/pilot-operational-acceptance.md).
The operator is Onesa UG trading as Diaspora Unlocked; dispatch is intended from
Germany to EU27 via DHL. Card payment remains unavailable pending merchant setup.

## Operator workflow

Use `/login?next=%2Fadmin` with an existing verified account whose email is in
Oracle's `ADMIN_EMAILS` allowlist. Existing account version/session checks apply
on every administrative API operation. Never share bearer tokens or grant admin
access by client-side flags. Shop customers and newsletter subscribers do not
need platform accounts.

In **Shop Products**, preserve the owner's basic catalogue fields. Product
information supports verified specifications, variants, supplier/origin facts,
handling restrictions, source URLs and photographs. Information does not create
variant-level inventory; collect the requested variant in checkout notes and
confirm exact size/variant/pack or other essential details **per quote line**.
New quotes require these details; they are frozen in the immutable revision and
shown before acceptance and in email. Old quotes remain readable and recoverable
with an explicit missing-detail notice. Existing integrations issuing new quotes
must supply `quote.fulfilmentDetails`, one nonempty string per ordered item.
Refresh older admin clients before issuing a revised quote.
In **Research**, add primary sources, an actual
review date and confirmed contact details before selecting a reviewed status.

In **Orders**, search the reference/customer or filter stage, assign the enquiry,
review its immutable original estimate and current stock, then issue a final
quote with item prices, currency, a separately confirmed delivery charge and
expiry. Revisions create immutable versions. The customer follows the private
status link and accepts the current unexpired quote. Acceptance records intent;
it does not charge money or reserve inventory. Arrange payment through an
individually agreed external method. Record an actual received payment reference
only after reconciliation; a transaction consumes all required stock atomically
and only once. Concurrent confirmations cannot oversell.

If payment actually arrived but stock is no longer available, record the
payment/stock issue and its real reference; it does not consume stock or pretend
fulfilment succeeded. Resolve availability or record the actual refund.
Received payment locks the agreed quote and currency, including during a stock issue. Resolve fulfilment or refund/cancel; use a new request for a different agreement. Refunds are records of money returned externally, not instructions to a provider.
Do not record money that has not moved. Fully refunded orders cannot consume
stock or dispatch. Record carrier/tracking on dispatch and delivery on completion.

Each refund now has an immutable amount/currency, external reference, payment
channel/provider, actor, timestamp and command ID. Use a consistent channel name:
references are deduplicated within that order and channel, not globally across
unrelated orders/providers. Provider labels are case-insensitive; external
references preserve their case. The ledger, aggregate, event and notification
intent commit together. The workspace shows each record and the paid balance
remaining after refunds; this is not a claim that a further refund is due.
Customer status exposes amounts/currencies/dates, not operator identity, provider
references or private notes. Old aggregate balances are marked for reconciliation;
the captured last-known legacy reference does not itemize the balance. A new
refund matching that unreconciled historical reference is blocked for review.
No historical individual records are fabricated.
Cancellation requires a reason and an explicit stock decision. Only restock goods
physically checked as available; a later checked return can be restocked once.
This pilot supports whole-order restocking, not partial returns by variant.

Internal notes/assignment remain private. Public messages, quote/payment issues,
refunds and fulfilment changes appear in customer status. Original descriptions,
amounts and currency do not follow later catalogue edits. Customer grants permit
only status reading, quote acceptance and consent withdrawal; never fulfilment.
A receipt is stored in the browser for recovery. Email grants are stripped from
the URL before rendering/telemetry and kept only in that tab's session storage.
Treat the private link as a credential; don't paste it into tickets or analytics.

After an ambiguous command response, the UI reads current server state before
encouraging another action. It retains the same command ID for the same unresolved
payload, including across a tab refresh when session storage is available. Only
a digest and non-secret command metadata are stored, not payment/refund references
or form notes. Changed payloads use new IDs and stale versions still fail. A saved
event reconciles the lost response without repeating inventory or notifications.
If both the response and status read fail, retry unchanged details; do not record
the same money again as a new action. Check the visible ledger and external bank
records if uncertainty remains.

## Notifications and measurement

Order changes commit their notification intent in the same database transaction.
The existing application process polls the durable order outbox. No subscription
to the newsletter is implied. Customer messages use the submitted language;
operator initial-request alerts use configured recipients. Inspect failures in
the order workspace. There are at most five automatic attempts with backoff.
Postal code and requested options/notes are captured in immutable message
snapshots, including operator alerts. WhatsApp handoffs use the current form
values, currency and language; they never add internal notes or access grants.
Manual retry requires existing admin authorization, an audit event and the safe
provider window. Resend idempotency keys and frozen encrypted payloads reduce
duplicates; provider acceptance does not prove inbox delivery or exactly-once
mail. After 23 hours, investigate provider acceptance before arranging contact
rather than blindly retrying an uncertain delivery.

During Oracle-first rollout, customer jobs wait until the public frontend status
page exposes protocol version 1. Waiting does not use a provider attempt or start
its retry window. Operator alerts can proceed. Frontend rollback removes that
marker and pauses subsequent customer jobs. Keep Oracle online for existing
status links and queued messages while investigating a frontend release issue.

Grant/payload encryption derives from the existing JWT secret. Before rotating
that secret, drain or migrate sealed payloads/grants using a retained old key;
otherwise outstanding links cannot be composed and retry payloads cannot decrypt.
Never put the secret or notification payloads in logs, Git or a build context.

The funnel stores UTC-day/event aggregate counts without names, addresses,
references, tokens or chat content. Discovery/basket events require consent;
requests, issued quotes and delivered outcomes count only successful consented
server transactions. These are not unique people or attributable journeys.
Rejecting optional cookies withdraws future order measurement for the currently
known private receipt. Existing anonymous aggregates cannot identify a person to
remove; other devices/older receipts require their own grant. Newsletter consent
and transactional messages remain separate.

## Builds, releases and previews

`main` requires the up-to-date GitHub-hosted `Build and Test (22.x)` check, a PR
and resolved conversations, including for admins. No independent reviewer is
required on this single-owner repository. No force-push/deletion is allowed.

CI builds with an explicit seeded **test fixture** without depending on the live
API. The Oracle Docker build explicitly omits static product snapshots so a
production outage cannot prevent building a repair. Runtime catalogue APIs still
read the database. Vercel builds separately from source, retrieves the public
**database-backed** catalogue and prerenders published product pages. A missing
or memory-fallback catalogue fails the public build; a legitimately empty
catalogue is allowed. Production Vercel builds reject fixture/omit overrides.
Never upload the CI fixture build as a production frontend artifact.

After authorized merge: CI passes, the existing outbound Oracle worker releases
the exact tested main SHA in Docker on the ARM VM, health/commit/Onesa checks
pass, then CI publishes Vercel and checks raw HTML/canonicals and matching API
revision. GitHub Pages is unused. The worker is not a GitHub self-hosted runner.
Ordinary source commits do not overwrite privileged host scripts. This change
only adjusts the Dockerfile consumed from the exact source archive.

PR preview deployment verifies its published HTML, CSP, noindex and disabled API through the authenticated Vercel CLI, keeping Deployment Protection enabled. It removes the production API rewrite, returns a local
service-unavailable response for `/api/*`, and adds `X-Robots-Tag: noindex`.
Production browser bundles force same-origin `/api`, preventing stale dashboard
API overrides from bypassing this isolation. Previews currently support public
visual review, not real checkout/admin/AI actions; a separately provisioned
backend/database/email sandbox is needed for those. Browser tests instead run
isolated full-stack fixtures. Production also rejects preview-origin and marked
test write requests before cookie/auth processing. This is defense in depth,
not proof that an arbitrary unmarked server client can be identified as a test.

Static product metadata/content is a release-time snapshot. Live UI/API reflects
owner edits immediately; regenerate frontend pages after important published
catalogue changes. Unbuilt product URLs fall back to the functioning catalogue.
New product static URLs and sitemap entries require a frontend release.

## Additive migration and rollback

Before approving production merge, confirm a current database backup and restore
point with the owner/provider. Startup runs the existing global schema lock and
creates additive workflow, quote, event, notification, snapshot, product-details,
research and funnel tables/indexes. Repeated startup preserves data. Existing
catalogue fields, stock, prices and historical receipts are not rewritten.
The reliability pass adds `shop_order_refunds` and
`shop_refund_legacy_balances`. Startup captures an existing unitemized balance and
its last-known reference once, without fabricating individual refunds. The UI
computes unreconciled amounts from the aggregate minus itemized records. Keep the
tables and original balances when rolling forward or restarting.
Legacy orders without workflow state remain readable; paid legacy orders are
recognized as already consumed. Reconcile an old paid record manually before
recording new quote/refund operations; do not deduct it again.

The Oracle deploy script privately backs up the two Compose manifests and
retains the previous image. On failed health/revision checks, it restores the
previous DU manifests and starts only DU's app service. Sibling applications are
not restarted. Automated rollback behavior is covered by shell/worker fixture
regressions; no production failure was deliberately injected. Vercel verification
failure triggers its existing production rollback. That frontend rollback does
not automatically revert Oracle or schema.

For an application rollback, retain the additive tables; don't reverse/drop them
or restore an old database over new orders. A backend version predating this
outbox cannot process new workflow jobs. Stop accepting assisted requests during
that incident, preserve the queue, reconcile which messages/payment/inventory
changes committed, then forward-fix to a compatible backend. Rolling back to the
old synchronous-mail code can also leave new requests without durable email.
Database rollback is a separate incident requiring write freeze, captured current
data and reconciliation, not an automatic part of image rollback.
An application predating the refund ledger can change aggregates without
preserving individual records. Freeze financial mutations before such a rollback
and reconcile any gap before resuming; prefer a compatible forward fix. Do not
drop the additive ledger to make an old binary look current.

## Backup and restoration procedure

Production uses managed MySQL. Obtain the actual Aiven service plan, current
backup status, retention and an approved isolated restore target from the owner.
Aiven documents daily full backups and binlog recovery, with retention depending
on the plan. The 25 October console observation and successful production-data
logical restore are recorded in the acceptance report; provider PITR and a
contractual retention guarantee were not verified. Oracle manifest backups
contain runtime credentials and are not database backups.

For an approved logical backup, use the matching MySQL client, TLS/CA and private
credential handling. Do not print connection strings/passwords. Use
`mysqldump --single-transaction --quick --routines --events --triggers
--no-tablespaces --set-gtid-purged=OFF --hex-blob DATABASE` to a mode-0600 encrypted
backup destination. All current application tables should use InnoDB. Avoid DDL
and migration activity during the dump; single-transaction consistency does not
cover nontransactional tables or concurrent DDL. Check exit status, encrypt,
record date/schema version, verify the archive and retain credentials separately.

Restore to a **new isolated database**, with outbound email/AI disabled and no
production frontend routing. Import with the matching `mysql` client, verify
schema/keys, table and row counts/checksums, then run read/auth/order lifecycle
checks using designated test records. Reconcile restored timestamps, pending
notification acceptance and inventory before any real cutover. Never resend all
outbox rows just because a backup was restored. Record recovery point, duration,
results and owner approval, then remove sandbox data according to policy.

A reproducible local-only drill is available after other test writers finish:

```sh
SHOP_TEST_DATABASE_URL='mysql://root:LOCAL_TEST_PASSWORD@127.0.0.1:13316/du_newsletter_test' \
MYSQL_TEST_CONTAINER=du-gap-mysql-test node scripts/tests/mysql-restore.mjs
```

The script refuses remote/non-test databases, dumps only the selected disposable
database, imports a new temporary database, compares every table's schema/row
hash and removes the temporary database/dump. The successful local drill is
reported in the audit; it does not establish a tested production restore.

The separate **Oracle production-data drill** reads the configured DU database,
compares surrounding exports for changes, restores into a disposable MySQL
container with `--network none`, and runs the real application probe in that same
isolated network namespace. It never starts email/AI workers or supplies provider
keys. It writes only synthetic data to the restored database, retains an
encrypted original backup, and removes plaintext files and drill containers.
It does not replace the live database or restart DU/sibling services.

Run only as an explicitly authorised operational exercise, outside migrations
or schema changes. Review the source and allow roughly 1 GB of temporary memory
plus image/dump disk space. Bundle the probe from the revision being verified:

```sh
pnpm exec esbuild scripts/operations/restored-application.ts \
  --bundle --platform=node --packages=external --format=esm \
  --outfile=/tmp/du-restored-application.mjs
scp deploy/oracle/verify-recovery.sh /tmp/du-restored-application.mjs \
  ubuntu@152.70.22.84:/tmp/
ssh ubuntu@152.70.22.84 \
  'sudo bash /tmp/verify-recovery.sh /tmp/du-restored-application.mjs'
```

The script uses the currently running DU image and a pinned official MySQL image.
It refuses to run without root and an explicit probe file. The probe requires a
loopback `du_restore_test` database, test mode and no production URL/email key.
The authenticated readiness query avoids confusing MySQL's temporary bootstrap
server with its fully initialised server.

Archive and redacted report: `/var/backups/du-platform`, root-only. Passphrase:
`/etc/du-platform-recovery/backup-passphrase`, root-only and separate from archives.
Arrange an independently secured off-host archive/key copy before relying on this
backup for complete Oracle host loss. Never commit either or print their contents.
The script does not schedule backups, prune old ones, rotate keys or verify Aiven
PITR; managed provider backups remain a separate recovery layer.

References: [MySQL mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html),
[Aiven MySQL backups](https://aiven.io/docs/products/mysql/concepts/mysql-backups),
[Oracle release runbook](../deploy/oracle/README.md).

## Confirmed product-interest release

The owner-approved eight stock corrections completed on 25 October 2026; all 28
published products remain at zero. No inventory is rewritten by this release.
The Oracle Docker image now defaults to enforced `prelaunch`: new order requests
and new quotes are paused. Historical status, acceptance of an existing legitimate
quote, cancellation, refund and fulfilment remain accessible. The pre-release
read-only inspection found zero orders and zero issued quotes.

`shop_restock_notifications` gains additive confirmation/cancellation/generation
fields. Existing rows default to **legacy** and remain dormant. An explicit new
request creates a pending confirmation intent in the existing
`newsletter_deliveries` queue, in the same transaction as consent. No bulk migration
messages, newsletter consent or accounts are created. The unique email/product row
and generation/intent index deduplicate concurrent requests and stock edits.
Confirmation is one-use, expires after 48 hours and is throttled to one new link
per hour. Cancellation is scoped to that product/registration generation. Links
use fragments, explicit confirmation buttons and noindex pages; tokens are removed
from browser history before rendering the preference controls.

The existing worker sweeps confirmed demand in batches of 50 and uses the existing
five-attempt backoff/23-hour safe provider window. Availability needs actual stock,
publication, current approved pilot mode and an approved product ID, checked again
under row locks immediately before provider delivery. A withdrawn product waits
without using a provider attempt. Cancellation and delivery serialize on the
interest row: provider acceptance that completes first cannot be recalled.
Stable outbox/provider keys protect interrupted commits; they do not prove exactly
once or inbox delivery. A notification is **one-time**, marked notified on provider
acceptance. In Admin → Notify Me inspect counts/dates/confirmation and delivery
states; existing Newsletter delivery controls permit only safe failed-job retry.

The queue lock is scoped to the database so isolated test/restored databases do not
block the live queue. Both queue processors and worker entry points refuse to send
when `RECOVERY_MODE=true` or `OUTBOUND_MESSAGES_PAUSED=true`. Keep both set during
restore reconciliation; remove the recovery marker and explicitly release the
hold only after checking accepted provider IDs, pending jobs, grants and inventory.
Never automatically replay a restored queue.

Rollback: preserve all additive columns, generations and delivery intents. Prefer
a compatible forward fix. Before reverting to code with synchronous stock mail,
freeze stock/admin mutations and disable outbound delivery: that old code does not
understand confirmation or cancellation. Retain enforced `prelaunch` explicitly in
the private runtime environment if using an image predating this image default.
Do not restore an old database over new consent or orders. No approval placeholder
or merchant keys are added by this release.

## Independent recovery custody — prepared, destination still required

The actual logical restore passed; the archive/key currently remain on Oracle.
The controlled custody test recovers persisted encrypted grants and queued payloads
with the retained runtime key, and rejects the wrong key. This is local synthetic
proof, not a verified off-host transfer, provider PITR or complete host-loss drill.

`python3 scripts/operations/prepare-recovery-custody.py --help` documents a local,
network-free packaging operation. Inputs are a verified `.sql.gpg` archive, its
mode-0600 passphrase file, a mode-0600 JSON file containing only the retained
`JWT_SECRET`, the approved custodian's **public** GPG key, and separate mode-0700
archive/key output directories. The archive is checked before packaging. The key
bundle is encrypted for that recipient and includes both SQL passphrase and runtime
key. Private temporary plaintext is removed; existing packages cannot be overwritten.
Manifests include checksums and recipient fingerprint, no secrets. Never run this
on a newly selected cloud service or publish either package.

Required external input: the owner's approved private archive destination and an
independently secured key destination/custodian with its verified public GPG key.
After approval, transfer each package separately, compare remote checksums, and
have the custodian perform an isolated restore with workers held and the retained
key material. Record receipts, access/recovery owners, retention and deletion
policy. Test archive plus key availability independently of Oracle before claiming
full host-loss recovery. Do not rotate the JWT key until outstanding grants and
payloads have been migrated or the old key is retained securely.

Local proof: `pnpm test:recovery:custody`. Database/application proof: the existing
network-isolated recovery drill, now including persisted grant/payload decryption,
wrong-key rejection and enforced worker hold. See the [current audit](audits/prelaunch-product-interest.md).

## Local review of this release

Use Node 22+ and `pnpm install --frozen-lockfile`, then `pnpm dev`; the script prints
the local web URL (port 3000) and backend status. Use a disposable localhost MySQL
`*_test` database for persistent product-interest/admin tests. Never point these
fixtures at an application database. Without a configured database, interest
registration fails visibly rather than claiming that an in-memory signup is saved.

`SHOP_TEST_DATABASE_URL` and `NEWSLETTER_TEST_DATABASE_URL` select disposable test
storage for `pnpm test:modules`. `pnpm test:e2e:prelaunch` runs both browser engines
at three widths with synthetic records and mock delivery. `pnpm test:e2e:pilot`
uses an isolated synthetic approval file to preserve assisted-order regression
coverage; it cannot activate production. `pnpm test:recovery:application` creates
only `du_restore_test`, refuses an existing database, and checks persisted encrypted
grants/payloads plus held workers. `pnpm test:recovery:custody` uses synthetic files,
a temporary GPG recipient and no network transfer. Production deployment is the
existing protected-main Oracle → Vercel workflow, not a local `pnpm dev` action.
