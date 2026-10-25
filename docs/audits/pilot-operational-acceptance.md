# Pilot operational acceptance — 25 October 2026

Scope: owner-authorised launch preparation, read-only production database backup,
isolated recovery, and explicitly authorised synthetic email examples. No live
orders, payments, refunds, stock edits or newsletter subscriptions were created.

## Confirmed business inputs

The owner corrected the earlier sole-trader description to **Onesa UG trading as
Diaspora Unlocked**, and the earlier street number 17 to **47**. Business/returns
address: Steinhofweg 47, 69123 Heidelberg, Germany. Dispatch from Germany, intended
delivery to all EU member countries via DHL, EUR quotes, card payment requested.

[Public company listing](https://www.companyhouse.de/Onesa-UG-Heidelberg) identifies
Onesa UG (haftungsbeschränkt), Andrew Gotora, Amtsgericht Mannheim HRB 757830 at
that address. This is a secondary source, not a newly obtained official register
extract. Verify the current register record and applicable tax identifiers for
final approval; no tax number is invented or published.

The owner confirmed **no Stripe account exists**. Stripe is recommended based on
the published German fees and hosted payment options. No merchant onboarding,
agreement, keys, gateway integration or financial transaction was performed.
The existing live workflow remains assisted payment only.

The owner later confirmed **no items are currently held**. Read-only inspection
found no recorded shop orders, but eight positive catalogue counts (IDs 1, 2, 5,
7, 8, 15, 21, 22). A conditional correction to zero was prepared for explicit
production-data approval. The repository already seeds zero stock and preserves
owner stock edits across releases. Do not treat those old database counts as
proof of inventory or enable commercial offers from them.

## Dependency security findings

Required CI identified two high-severity dependency advisories after the earlier
baseline: [Zod oversized collection validation](https://github.com/colinhacks/zod/pull/6652)
and [body-parser compressed trailing bytes](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
Zod was updated to 4.6.7 (minimum 4.6.6), and the compatible body-parser 1.x line
to 1.20.9 through a targeted override. Unrelated resolutions remain unchanged;
the existing production audit is retained.

Bounded local regressions verify that an oversized checkout basket is rejected
before visiting item fields, and that the real core middleware survives delayed
compressed trailing bytes and handles a subsequent request. The latter runs in a
disposable child process with no application services or production endpoints.
Production dependency audit reports no known vulnerabilities after the update.

## Production database recovery evidence

Read the authenticated Aiven service overview for DU's running `zigd-platform-db`
in project `du-platform`: MySQL 8.4.8, Free 1 CPU / 1 GB RAM / 1 GB storage,
DigitalOcean Amsterdam. The console showed latest backup **about 12 hours old**,
oldest **about two days old**, **848 MB** stored. These are observed relative
timestamps, not a verified contractual retention/RPO guarantee. No provider
upgrade, fork or restore-over-production action was performed.

An actual production logical backup was taken with verified provider TLS and
`mysqldump --single-transaction --quick --routines --events --triggers
--no-tablespaces --set-gtid-purged=OFF --hex-blob`. Source data was stable across
the surrounding canonical exports. The official MySQL 8.4 image was pinned by
digest, with resource limits. The restored server had **no network**, no published
ports, and its event scheduler disabled.

Results at 13:54:39 UTC:

- **37 tables / 131 rows**: canonical schema and row hashes matched exactly.
- A write followed by rollback in the disposable database left no row.
- The real DU order code passed enquiry replay, private receipt access, rejection
  of customer payment recording, quote acceptance, payment retry with a single
  stock deduction, refund retry with a single ledger record, and dispatch/delivery.
- The real newsletter code passed one-use confirmation and unsubscribe against
  synthetic records in the restored database.
- The application probe shared the restored server's isolated network namespace;
  it had no production configuration, no email/provider keys and no workers.
- The original dump was AES-256 encrypted; decrypting it reproduced the original
  bytes. Application fixture changes were never included in that backup.
- Disposable containers and plaintext temporary files were removed. Live source
  writes: **none**. Existing sibling containers were not changed.

[Redacted machine-readable report](evidence/production-recovery-2026-10-25.json).
This verifies a **logical production-data restore and core application workflows**,
not Aiven binary/PITR restoration, historical receipt decryption with production
keys, account-login recovery, or every browser journey.

Encrypted archives and private reports are root-only under
`/var/backups/du-platform`; the passphrase is in a separate root-only file under
`/etc/du-platform-recovery`. They are on the same Oracle host. An independently
secured off-host key/archive copy is still needed to rely on this logical backup
after complete loss of that host. Aiven's managed backups are a separate layer;
they do not substitute for a verified independent key custody plan.

Reproduction is documented in [the operations runbook](../assisted-order-operations.md).

## Authorised mailbox acceptance

The first recipient `andrew@diasporaunlocked.com` did not receive the three
provider-accepted samples. The owner explicitly changed the test recipient to
**info@diasporaunlocked.com**. A corrected confirmation-layout sample and synthetic
quote/refund samples were sent using existing templates and sender configuration,
with recipient-specific stable provider idempotency keys. The first confirmation
sample's optional footer arguments were corrected for the replacement batch;
production template code was unchanged.

All three replacement messages were accepted by Resend, and the owner confirmed
**all arrived and displayed correctly**. Every subject was labelled `[DU TEST]`;
no real subscription, quote, payment or refund was created. The confirmation
sample did not activate a subscription or claim a working personal token.

The sending key is deliberately restricted: attempts to read those message
delivery events returned `401 restricted_api_key`. Access was not expanded.
Inbox confirmation is the delivery evidence. Mock/integration tests and the
isolated restore exercise cover one-use confirmation and access/retry logic;
this mailbox check did not exercise live private receipt/confirmation links.

## Activation decision and remaining dependencies

Owner permission to activate has been supplied. Readiness stays `observe` /
`report_only`, with no completed approval file installed, because these facts
cannot be supplied by software or inferred from the public catalogue:

1. A ready merchant account and a verified card-payment/reconciliation procedure.
2. Actual physical stock/options/supplier/label facts and approved SKU eligibility.
3. Actual DHL services/rates, packaging/handling costs, tax treatment and positive
   contribution for the proposed assortment/destinations.
4. Final commercial/withdrawal/returns wording and costs; applicable tax details
   and operator approval of the concrete procedures.
5. A controlled record approving the evidence, including remaining recovery/key
   custody and private-link email acceptance limitations.

[Concrete procedure draft and private worksheet fields](../pilot-commercial-procedures.md)
are prepared for review. No missing check has been marked approved, no sample
approval file has been installed, and no new quote restriction has been silently
switched on. Existing enquiries, recovery and legitimate fulfilment/refunds work
as before. Card payments are explicitly described as planned, not available.
