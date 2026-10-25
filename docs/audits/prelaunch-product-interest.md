# Prelaunch journey and confirmed product interest

Reviewed baseline: production and protected main `4f80906f49d9bb7aad1f930887d87ce0b6c66cf7`.
This is the release record for the subsequent confirmed-interest change. The exact
live backend revision is available at `/api/ping`; CI verifies it against Vercel's
release marker. The prior operational report is a historical evidence snapshot.

## Findings and changes

- **High:** zero stock and no commercial approval still led customers toward an
  order. Shared product-interest controls now cover landing/category tiles,
  catalogue and details; Onesa links to the product action. Initial HTML and
  English/German/Shona/Ndebele copy describe interest without an order, reservation,
  payment or promised supply. The empty available filter explains the prelaunch.
- **High:** saved baskets rendered a missing translation key, invited address
  entry and looked submit-ready despite changed stock. All locales now explain
  the issue, preserve choices, offer deliberate update/remove/interest actions,
  and hide request fields/submit controls until the basket and commercial
  eligibility are valid. Backend stock checks remain.
- **High:** direct product email had no durable intent, ownership confirmation,
  cancellation or launch eligibility check. It now uses the existing durable
  newsletter delivery infrastructure, separate product consent and one-time
  generation-scoped intents. Retries use the same provider key, bounded attempts
  and a 23-hour safe window. Publication/stock/approval are rechecked immediately
  before an availability alert. Existing legacy rows are preserved and dormant.
- **High:** report-only production mode did not enforce prelaunch. The Oracle
  Docker release explicitly defaults to enforced prelaunch; no placeholder
  approval record or card payment setup is installed. New requests and quotes are
  paused; historical recovery/financial/fulfilment controls remain. Pre-release
  read-only checks found zero orders and zero issued quotes.
- **Medium:** operators lacked meaningful demand and failure visibility. The
  protected Notify Me area now shows unique confirmation/status/date-range counts
  and recent delivery states, without adding retries to demand. A bounded
  [experiment/sourcing worksheet](../product-demand-sourcing.md) leaves unknown
  supplier, cost, packing, DHL and merchant facts blank.
- **High residual:** production logical backup and keys share Oracle. A tested,
  network-free custody packager separates encrypted archives and recipient-
  encrypted keys, including the retained JWT key required for encrypted order
  grants/payloads. Controlled fixtures recover with that key and reject a wrong
  key. Restored queue processors refuse to send until explicit reconciliation.
  Approved independent destinations/custodian public key are still required.

The owner-confirmed Onesa UG address, Germany-to-EU27 intent, no physical stock and
lack of a Stripe merchant account remain unchanged. The approved eight stock
corrections completed on 25 October 2026 at 16:21 UTC. All 28 published products
were verified zero in the live API and refreshed frontend snapshot; this release
does not rewrite inventory or contact real subscribers.

## Verification record

Local verification is recorded below as it completes; release CI and the PR carry
the exact commit, deployment URLs and post-release checks. Do not interpret a
prepared branch or passing fixture as production deployment.

- Frontend/backend types and strict four-language translations pass.
- 293 backend tests pass with disposable MySQL, no skips. Twelve new confirmed-
  interest regressions cover duplicate/legacy/expiry/cancellation/provider outage,
  stable retry keys, prelaunch, withdrawal and one-time delivery.
- 106 frontend tests plus seven Node checks pass.
- Existing shop cart/checkout/scrolling browser regressions and the real HTTP
  assisted-order journey pass with isolated commercially eligible fixtures.
- Synthetic custody round trip passes for archive, retained runtime key,
  encrypted order grant and queued payload; wrong-key decryption fails.
- 98 full HTTP/MySQL Chromium/WebKit scenarios pass across four languages and
  375/768/1440 widths: stale quantity/zero/unpublished/missing items, deliberate
  edits, refresh/back/corrupted storage, confirmation/cancellation, duplicates,
  provider outage/retry, admin protection and enforced prelaunch. Screenshots
  were inspected and residual enquiry copy/checkout presentation corrected.
- Both Chromium/WebKit historical quote/payment/refund/fulfilment journeys pass.
  A logged-in operator browser also verifies confirmed unique demand and visible
  failed delivery after duplicate registration. Mobile screenshot review caught
  and corrected a table-driven overflow, with a viewport regression added.
- Types, strict translations, build (57.7 MiB), 68 SEO route documents, deployment
  regressions, guardrails and production dependency audit pass.
- Quiet paired cold-mobile lab medians: Home LCP 3,376 → 3,444 ms (+2.0%),
  Shop 2,900 → 2,900 ms, Tourism 3,236 → 3,264 ms (+0.9%). These differences are
  within the observed sample variation, not a claimed improvement. The optimized
  26,524-byte Home logo, rendered dimensions and typography are unchanged.
  Catalogue/readiness share one request instead of a separate readiness request.
  [Samples/method](evidence/prelaunch-performance-2026-10-25.json) and
  [browser record](evidence/prelaunch-browser-2026-10-25.json) are included; these
  are local lab results, not field Core Web Vitals.
- Deployment/production checks are recorded in the PR after the authorized release.

No provider PITR, independently secured off-host transfer, full-host-loss recovery,
merchant readiness, physical-device testing or live private order-link email
acceptance is claimed. Previous owner-confirmed synthetic email layout/quote/
refund examples are distinct from actual private-link acceptance.

## Release and rollback

Migration adds columns/indexes only; legacy rows default to `legacy`, with no
confirmation/availability mail backfill. Existing receipt/order/refund schema,
CSP, required-main checks and isolated previews remain intact. The existing
outbound Oracle worker releases tested main in Docker, then Vercel builds from
source and verifies matching revisions. GitHub Pages is unused.

Keep additive data on rollback. Older synchronous stock-email code cannot honor
new consent/cancellation: freeze product mutations and disable its outbound
provider before such a rollback. Preserve explicit enforced prelaunch when using
an older image that lacks this release's image default. Prefer a compatible
forward fix; database restoration is a separate write-freeze/reconciliation
operation, never automatic image rollback.

Next milestone: **validated demand → verified sourcing/costs → payment sandbox and
operational acceptance → bounded paid pilot**. No stock purchases, seller
onboarding, split payouts or escrow are introduced.
