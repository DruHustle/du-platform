# Codebase review — 26 October 2026

Baseline: `db312612db776f6407f1816e488aac17b68f617b` (PR #139). The baseline
[production pipeline](https://github.com/DruHustle/du-platform/actions/runs/40256978074)
passed. Read-only production checks returned that exact revision and enforced
prelaunch with `commercialReady: false`. This review does not activate commerce.

## Review coverage

| Area                              | Review and verification                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication and administration | Cookie/bearer credential selection, JWT validation, current-user/admin authorization, account creation, password recovery, reset/session persistence and failure handling.                                                             |
| Shop                              | Catalogue/search publication, product details, prelaunch gating, customer grants, command idempotency, quote/refund snapshots, stock transactions and notification outboxes. Existing workflow and concurrent checkout tests retained. |
| Newsletter and product interest   | Confirmation expiry, consent, cancellation, reporting, worker claims, retries, interrupted delivery and provider acceptance.                                                                                                           |
| Travel, AI and public information | Shared trip-plan schema/arithmetic/geography, grounded catalogue retrieval, search queries and links, research-profile validation and public API boundaries.                                                                           |
| Frontend                          | Account bootstrap and API interceptors, search cancellation/error handling, saved-basket/product states, protected operator workflows, localization and existing component regressions. No layout or branding changes.                 |
| Operations                        | Preview isolation, CSP, CI gates, Oracle/Vercel release checks, backup scripts, recovery holds, dependency audit and initial HTML/SEO output.                                                                                          |

This is a source and regression-test review, not a penetration-test certificate
or a claim that every possible defect has been excluded. No production customer
record, inventory, payment, subscription or email was created or changed.

## Confirmed findings and fixes

1. **Password reset could partially commit.** Token consumption, password update
   and session revocation used separate writes. The new operation locks the user
   and commits password/version change, all outstanding reset-token invalidation
   and session revocation together. Failure rolls everything back. Concurrent
   reset links serialize on the same user. Session creation checks the password
   version under that same lock so a login already verifying an old password
   cannot establish a new refresh session after reset.
2. **Ordinary account routes accepted old password-version JWTs.** Admin routes
   already checked versions; `/auth/me` and feature notification requests did not.
   Both now validate the current user and authentication version, failing closed
   when account storage is unavailable.
3. **Explicit bearer credentials could fall back to a session cookie.** Session
   resolution now treats an explicit authorization header as authoritative and
   does not use ambient cookies when that credential is invalid or is a JWT.
   The existing browser deliberately omits authorization on refresh/logout, so
   normal cookie-based refresh retains its origin and CSRF checks.
4. **Email helpers could bypass recovery holds and misreport delivery.** Both
   provider entry points now enforce the existing outbound/recovery hold.
   Missing/unsupported providers and missing acceptance IDs are failures. Contact
   requests return a retryable failure if operator delivery is unconfirmed and
   do not send a false acknowledgement to the customer. A failed customer copy
   does not invalidate an already accepted operator message. Email/auth failures
   no longer log raw provider exceptions, customer subjects or recipient lists.
   Password-reset provider failures retain the neutral account-existence response.
5. **Newsletter opt-out and replacement confirmations had delivery races.**
   Subscription eligibility and provider acceptance are serialized with opt-out
   using the subscriber row lock, as product-interest delivery already was. A
   reclaimed confirmation is checked against the current confirmation hash, so
   an old queued link cannot be sent after replacement. Existing payloads and
   provider idempotency keys are reused; no migration or bulk resend is needed.
   An email already accepted before cancellation may still arrive afterwards.
6. **AI plans could charge for an unscheduled experience.** Every priced activity
   must now occur exactly once in the itinerary, rather than merely not occurring
   more than once. The existing sample/fallback generation remains unchanged.

## Historical initial-review validation

These results describe the initial review source published as
`73bfd18cb92d31aa3f7f0b6ed2a5d9c4fa69f2ce`; they are not the latest results.

- **323 backend tests passed, no skips**, using isolated localhost MySQL 8.0.46.
  The new password-reset suite creates its own disposable database and also
  passes with the normal parallel test runner.
- **106 frontend tests and seven Node checks passed.** Frontend and backend type
  checks passed.
- Production frontend/backend builds passed using an explicit synthetic catalogue;
  SEO checks passed for **68 route documents and 56 canonical sitemap URLs**.
- Oracle deployment tests (3), release-worker tests (4), pilot deployment tests
  (6), Mac backup safety tests (10), deployment/locale guardrails and strict
  four-language translation checks passed.
- Existing MySQL checkout/concurrency script and restored-application verification
  passed, including encrypted grants/queued payloads, wrong-key rejection, held
  workers, financial replay protection and private order access.
- Production dependency audit reported **no known vulnerabilities**.
- Regression checks against the unchanged baseline reproduced 11 failures across
  credential fallback, email hold/reporting/logging, contact delivery and trip
  validation; both additional newsletter race regressions failed on the baseline
  and passed with the fixes.
- Local Chromium/WebKit installation could not complete because the download
  endpoint returned invalid/truncated archives. The local GPG custody test could
  not start its agent because Unix sockets are disallowed in this environment.
  Neither check was weakened. Publication was initially blocked by automatic
  approval review, then explicitly authorized by the owner. PR #140 was opened
  at the published commit above; its original GitHub-hosted CI and isolated preview
  passed. The publication-blocked note is historical, not a current blocker.

## Compatibility, release and remaining work

The initial review introduced no schema migration, stock correction, token/key
rotation, readiness change or new provider. The additive service-message migration
in the follow-up below supersedes the initial no-migration statement. Existing encrypted grants, quotes, refunds and
notification payloads retain their formats. Failed password-reset transactions
leave the original token retryable; successful resets intentionally invalidate
all older reset links and sessions. Older JWTs without a valid version must sign
in again. Restored environments retain the outbound hold until reconciled.

Release through protected main and the existing CI/deployment workflow. A rollback
does not require reverting database data, but restores the defects above; prefer
a forward fix. Do not revive consumed reset links or replay accepted emails.

## Durable service-message follow-up

Contact enquiries, password-reset email and new feature acknowledgements now use
an encrypted transactional outbox, separate from newsletter marketing, product
alerts and order notifications. The existing MySQL transaction/queue patterns,
AES-GCM runtime-key encryption, provider adapter and recovery holds are reused.
No new dependency, provider, marketing consent or historical backfill is added.

- Contact receipt plus operator/customer intents commit together. A required UUID
  binds one immutable normalized message; same-ID retries return the same receipt,
  changed payloads return 409, and a deliberate new UUID permits a new enquiry.
  Provider failure cannot erase a received enquiry. The four-language footer dialog
  preserves failed drafts, retains only opaque retry ID/digest in tab storage, and
  requires an explicit new intent before changing an unresolved submission.
- Reset tokens and encrypted email snapshots commit together. HTTP responses are
  neutral for known/unknown accounts and never wait on the external provider.
  The minimum response floor is not perfect timing indistinguishability. The
  existing 30-minute token lifetime is unchanged. User/token locks and current
  version/email checks suppress expired, consumed or invalidated credentials
  immediately before sending. Existing atomic reset/session/login protections remain.
- Reset links use a private fragment, consumed and stripped by the frontend;
  legacy query links still work. A static compatibility marker holds new reset
  mail while Oracle precedes its compatible frontend. Waiting never extends TTL.
- Immutable final provider payloads and keys survive rejection, lost responses,
  interrupted workers and database failure after provider acceptance. Unconfigured
  operator routing can be bound once before any provider attempt. The first-attempt
  clock is durable before sending; at most five automatic attempts occur, with
  replay stopped at 23 hours (inside the documented provider window). Manual retry
  retains the same key, payload and clock. Expired/uncertain jobs require operator
  reconciliation or closure without resending. Closure never recalls accepted mail.
- Admin → Service inbox shows durably received enquiries and separate sanitized
  delivery metadata. Existing verified/current-version admin guards protect it.
  It supports bounded paging, authorized retry, cancellation of queued messages,
  and recording verified provider acceptance. Reset tokens, hashes, recipients and
  private links are omitted from reset delivery listings. Provider keys contain
  opaque IDs, not reset secrets. Received, provider-accepted and inbox-delivered
  remain distinct; provider acceptance is not a delivery guarantee.
- Both outbound flags apply at worker and actual provider boundaries. Recovery
  tests include a persisted encrypted service message and held queue. Restored
  queues remain paused until reconciliation; no automatic replay is authorized.

### Current verification

Local supported-Mac verification passes 350 backend tests with no skips, 109
frontend tests plus seven Node checks, and 31 Chromium/WebKit transactional
customer/operator scenarios. The new scenarios cover three widths and four
languages, lost HTTP responses, unchanged retry IDs, changed-payload rejection,
protected inbox actions, provider reconciliation, failed loads, reset-fragment
and legacy-link consumption, JWT/session revocation and normal cookie refresh/logout.
Types, strict translations, production build, guardrails and synthetic GPG custody
pass. The restored-application probe verifies the new encrypted held queue as well
as existing order, payment, refund, private-access and newsletter behavior.

One local full-suite attempt timed out during fixture initialization while a
production build was running concurrently. The normal parallel suite passed after
the build completed; no tests were skipped and no assertions or timeouts were weakened.
CI for the latest published head is recorded on [PR #140](https://github.com/DruHustle/du-platform/pull/140).
Additional responsive, historical-order, preview and release-safety results belong
in that current CI record; the earlier 323/106 totals remain historical.

### Migration, compatibility and rollback

Startup adds `contact_enquiries` and `transactional_messages` with `CREATE TABLE IF
NOT EXISTS` under the existing migration lock. There is no historical enquiry or
email backfill. Contact clients must generate a UUID `requestId` before first POST
and reuse it unchanged after uncertain responses. Calls without a UUID now receive
400; this necessary contract change prevents unsafe unidentified retries. The new
frontend supplies it. Customer response success means `received: true`, not sent.

Keep both new tables, all existing auth-version/consent fields, runtime keys and
queued payloads on rollback. Prefer a compatible forward fix. Do not reinstate a
synchronous contact/reset handler or an old frontend that cannot consume already
issued fragment links. Pause outbound workers and reconcile first; never restore
an old database over new enquiries, consent or orders. During the next separately
authorized release, refresh the installed recovery probe from reviewed source and
verify both deployment and current-schema recovery. No production migration or
operational script installation is performed by publication of this PR.

The first separately authorized production cutover must retain the existing
outbound hold through both deployments, live checks and automatic rollback checks.
Reconcile and release the hold only after the complete release succeeds; keep it
if the frontend rolls back. The marker gate additionally prevents sending links
while the compatible page is unavailable. Do not downgrade the frontend after
issuing new fragment links.

### Historical publication boundary and remaining owner inputs

At the time of the follow-up review, authorization covered the public branch/PR only. Production merge,
deployment and commercial activation require separate explicit authorization.
The owner subsequently authorized the controlled release: PR #140 merged as
`90c13ae7ed8906c4c43113f7d2c50ba6d810ae3d`, and
[production CI](https://github.com/DruHustle/du-platform/actions/runs/40382879817)
passed. Oracle and Vercel served that revision; the held cutover, additive migration,
live browser checks, queue reconciliation and updated restored-application probe
passed before the temporary outbound hold was released. Commercial activation
remained disabled. Detailed operational evidence stays in the private handover.

Actual-Mac archive checks verified existing encrypted copies, manifests, last-success
status and the installed scheduler. The normal due check reported not due. Detailed
archive paths/checksums and operational evidence remain in the private local
handover, rather than the public PR. This is archive-transfer evidence, not
independent key recovery. Separate encrypted USB custody/unlock arrangements and
verified public recipient/fingerprint remain pending; runtime keys are preserved.

Commercial inputs remain owner work: verified physical stock and product facts,
supplier/packaging/delivery costs, finalized commercial procedures and payment
acceptance. Continue the existing 28-day demand experiment and sourcing worksheet;
no purchases, supplier commitments or activation occur. Manual provider reconciliation
requires an operator's verified provider record; this change does not add delivery
webhooks or guarantee inbox arrival. Native-speaker review remains useful for
customer-facing Shona/Ndebele copy.

## Home refinement review

The next review starts from the deployed PR #140 source. Home now uses one eager,
high-priority Victoria Falls background; the carousel interval, state, transition
layers and pause/resume controls are removed. The hero's “Browse products” action
is removed from both the interactive and initial HTML views. Brand mark, typography,
tagline and module navigation remain intact.

Browser inspection also found that the entire exploration button continuously
moved with its arrow. The button now remains stationary with a visible keyboard
focus outline; only the decorative arrow animates, respecting reduced motion.
The existing navigation regression covers mouse and keyboard activation at three
widths. Both-engine local inspection also checks a static background beyond the
former rotation interval without requesting the old slideshow destinations.

The owner confirmed no stock, payment account or DHL account and explicitly deferred
separate recovery-key custody. These are deferred owner prerequisites, not passed
commercial/recovery checks. Prelaunch enforcement and the existing encrypted backup
schedule remain unchanged. This frontend release changes no API, schema, runtime
credential or provider; protected main and the full existing CI remain the release gate.
