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

## Validation

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
  Neither check was weakened. The existing GitHub-hosted CI includes both browser
  engines and the GPG custody test. Fresh CI remains pending branch publication:
  automatic approval review rejected the public GitHub push because this request
  did not explicitly authorize publishing the changes. No new PR or deployment
  is claimed; all source fixes are committed locally.

## Compatibility, release and remaining work

No schema migration, stock correction, token/key rotation, readiness change or
new provider is introduced. Existing encrypted grants, quotes, refunds and
notification payloads retain their formats. Failed password-reset transactions
leave the original token retryable; successful resets intentionally invalidate
all older reset links and sessions. Older JWTs without a valid version must sign
in again. Restored environments retain the outbound hold until reconciled.

Release through protected main and the existing CI/deployment workflow. A rollback
does not require reverting database data, but restores the defects above; prefer
a forward fix. Do not revive consumed reset links or replay accepted emails.

Contact and password-reset email still use synchronous delivery; this change
does not claim a durable contact inbox or exactly-once delivery. Provider timeouts
can leave acceptance uncertain. The password-reset response has a minimum delay,
not a constant-time guarantee. A future unified transactional outbox should retain
neutral responses, existing provider keys and per-message eligibility checks.

Commercial inputs remain owner work: verified physical stock and product facts,
supplier/packaging/delivery costs, finalized commercial procedures and payment
acceptance. Keep the existing demand-validation experiment and prelaunch mode.
Independent key custody/recipient verification remains pending. The approved Mac
archive destination is unchanged; this Linux review environment cannot independently
attest to Mac backup freshness, installed scheduling or USB custody. Do not create
a Mac path here or describe CI recovery as full host-loss recovery.
