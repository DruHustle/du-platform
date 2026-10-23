# Pilot reliability and readiness follow-up

Reviewed production/main: `82e704cee123a088ea2c391676315db950aef0d4`,
23 October 2026. Branch: `fix/pilot-reconciliation-readiness`.
This pass is for PR review; no merge, production release, runtime mode change,
production order, stock edit or actual email/payment/refund was performed.
The original audit's stale release statements have been corrected.

## Findings and remediation

| Priority | Confirmed issue                                                                                         | Change                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Partial refunds overwrote the last reference and retained only an aggregate                             | Append-only application ledger captures each amount/currency/channel/reference/actor/command/time in the same transaction as aggregate, event and outbox; scoped reference deduplication and honest legacy reconciliation                   |
| High     | A committed command with a lost response could invite another financial action                          | Tab-local digest/command metadata retains unresolved IDs, reconciles server history and distinguishes an applied command, a changed version and an unconfirmed result; changed payloads receive new IDs                                     |
| High     | Quote lines did not capture the exact fulfilment agreement                                              | New quotes require one confirmed detail per requested line and snapshot it immutably for customer review, operator history and notification content; existing quotes remain readable                                                        |
| High     | Draft commercial policies/missing product facts did not establish launch readiness                      | Visible decision-point notices, Europe/EUR owner checklist and deliberately unapproved approval template; opt-in quote gate with expiry, destination/product allowlists and current stock check, without changing production mode           |
| Medium   | Postal codes and requested options were omitted from handoffs                                           | WhatsApp memo dependencies and immutable operator/customer notification snapshots preserve both fields without internal notes or private access grants                                                                                      |
| Medium   | Onesa ignored requested ingredients/allergens and could answer a specific question with unrelated stock | Explicit read-only published details retrieval, exact/ambiguous/unknown matching, safe user-context follow-ups and field-specific missing/failure guidance in four languages; no inferred safety, provenance, sizes or delivery eligibility |
| Medium   | Homepage mobile lab LCP regressed in the previous pass                                                  | Oversized critical brand image replaced by a display-sized lossless WebP; original source, display size, typography, substantive HTML and CSP retained                                                                                      |

Verified limitations, not defects to erase: the catalogue genuinely has 20
unavailable items; owner prices/stock remain unchanged. Previews deliberately
have no production API access. Provider acceptance is not inbox delivery or
exactly-once delivery. The refund ledger is immutable through application
commands, not tamper-proof against a privileged database administrator.

## Compatibility, migration and rollback

Startup adds `shop_order_refunds` and `shop_refund_legacy_balances` under the
existing schema lock. Creation/capture is restart-safe. Existing aggregate-only
refunds retain their captured balance and last known reference separately;
individual amounts, channels or dates are never invented. Operator views show
both captured history and any remaining aggregate/ledger discrepancy. Customer
views expose refund amounts/currency/dates, not operator identity, channel or
external references. An unknown paid balance is not presented as the enquiry
estimate.

External reference uniqueness is scoped to order plus normalized payment
channel. Different orders/channels may legitimately use the same reference;
replaying an identical command is safe. An already recorded reference on the
same order/channel requires reconciliation rather than adding another refund.

New quote clients must provide `fulfilmentDetails` for every line. Older issued
quotes are preserved with a notice that exact options were not captured; no
variant inventory is introduced. Inventory is consumed only after actual payment
confirmation, with existing version/stock controls retained.

Retain both new tables and historical aggregates during any rollback. A
pre-ledger application cannot preserve individual records for new refunds:
freeze financial mutations and use a forward fix instead of allowing old code
to record refunds. Do not drop tables or erase customer/order history. Existing
quotes, recovery, refunds and fulfilment are outside the new quote-only gate.
See [the operations runbook](../assisted-order-operations.md).

`SHOP_COMMERCIAL_MODE` defaults to compatibility/report-only `observe`.
`prelaunch` explicitly pauses new final quotes; `pilot` requires current approved
evidence and exact destination/product/EUR matches. No production approval file
was installed and no mode was activated. The owner must separately authorize an
operating-mode change after reviewing existing open offers. The public API never
returns approval identities, paths or evidence references.

## Verification

Types, the production build, deployment-size budget (57.66 MiB), deployment
regressions, build/deployment/locale guardrails, strict four-locale translations,
initial HTML/canonical/CSP checks (67 route documents, 56 sitemap URLs) and
production dependency audit passed. Backend: **280 tests / 38 files, no skips**,
including disposable MySQL authorization, concurrent refund/payment, atomic
rollback, migration/restart, immutable notification/retry and quote regressions.
Frontend: **104 tests / 22 files plus seven Node checks**. A final backend-only
review fixed detection of the actual translated ingredient/allergen labels; all
32 catalogue/chat-route tests, backend types and backend build passed again.
Native-language labels and follow-ups are exercised; human translation review
remains outstanding.

- Customer/operator journeys: **10 scenarios in Chromium and 10 in WebKit**,
  including deliberately lost acceptance/payment/refund responses, failed first
  reconciliation, stable retry IDs, one stock deduction, two distinct partial
  refunds and no duplicate events/notifications. All providers are mocked.
- Shop: **18 scenarios in each engine**, including responsive cart scrolling,
  375×600/1440×600 short windows, postal/options/currency/language handoff updates,
  private-grant exclusion, unavailable inventory and failure/retry. The integrated
  HTTP journey and MySQL concurrent request/cache-race regressions also passed.
- Layout/CSP: **176 Chromium checks** (11 routes × four locales × four widths)
  and **44 WebKit checks**, at 320, 390, 768 and 1440 pixels, plus keyboard and 200%
  text zoom. Reports contain no uncaught errors, CSP violations or unexpected
  network failures. Checkout also exercised 375 pixels. Home, product, cart,
  customer/operator and Tourism screenshots were inspected in both engines;
  the logo retains its visual appearance and the cart submit remains reachable.
- Existing protected admin/regional-price/restart workflows: **11 scenarios**;
  newsletter/database/admin: **15 scenarios**; controlled AI-provider HTTP:
  **20 scenarios**. No real provider delivery or customer send occurred.
- Offline/device suite: **31 scenarios**, including unavailable services, AI
  failure recovery, synthetic camera/microphone permissions and cleanup, AR
  destination races, VR fallback, emulated Quest 3 stereo/two-controller rendering
  and session exit/reentry/navigation cleanup. Physical hardware is unverified.
- Disposable logical backup and isolated restore: **28 tables, 117 rows**;
  schema and row hashes matched. Restore database/dump were removed. This does
  **not** verify the production Aiven plan, backups or production restore.
- Read-only production verification: Oracle and the frontend API proxy both
  reported `82e704cee123a088ea2c391676315db950aef0d4`, database healthy and Onesa
  ready. This health check does not prove delivery/provider acceptance or a
  production rollout of this unmerged pass.

### Comparable mobile lab measurements

Exact baseline `82e704cee123a088ea2c391676315db950aef0d4` versus functional code
`60e3096` (later backend-only locale detection and evidence commits do not
change the measured frontend assets). Three
paired cold-context samples per route, 390×844, DPR 1, reduced motion, 4× CPU,
100 ms latency, 200,000 B/s down / 100,000 B/s up, 6.5 seconds after load. Identical
local HTTPS/gzip/cache/CSP and saved public catalogue fixtures; normal within-visit
caching, no request interception, no external calls, concurrent build or browser
suite. The baseline was archived from the exact commit and built with the same
installed locked dependencies and public fixture as the updated code.

| Route   | Median FCP before → after | Median LCP before → after |
| ------- | ------------------------- | ------------------------- |
| Home    | 780 → 772 ms              | 3,960 → 3,316 ms (−16.3%) |
| Shop    | 648 → 648 ms              | 2,736 → 2,748 ms (+0.4%)  |
| Tourism | 656 → 652 ms              | 3,228 → 3,212 ms (−0.5%)  |

The Home LCP element was the brand image after client startup. The oversized
793×793 PNG competed with shared JavaScript, hero imagery and fonts under the
slow network profile. The 336×336 lossless WebP is **26,524 bytes** versus
**156,344 bytes** (83.0% smaller); desktop/mobile CSS size and typography are
unchanged, and the original remains available. Earlier image decoding display
artifacts in the inspection tool were disproved by actual Chromium and WebKit
rendering; both rendered the logo correctly.

Home resource transfer fell from about 1.146 MB to 1.016 MB with the same 12
requests. No JavaScript bundle reduction is claimed. The optimized image is also
used by the shared navigation/static preview. No substantive HTML, localization,
fonts, navigation content or security policy was removed. The prior ~3.52→3.97 s
regression is recovered under this comparable profile; Shop and Tourism are
within small run-to-run differences, not evidence of a statistically established
improvement. These are **local lab measurements**, not Lighthouse scores, field
Core Web Vitals or real provider/carrier performance.

[All 18 raw samples and resource waterfalls](pilot-reliability-performance.json)
and [the executable paired measurement script](../../scripts/tests/pilot-performance.mjs)
are retained. Run the command in the README against two local build directories
without other builds/browser suites running.

## Bounded pilot and remaining owner inputs

The latest owner selection is **Europe**, EUR, superseding Germany as the target.
Coverage is still unverified. Start with one explicitly approved origin-to-country
corridor within Europe, not continent-wide shipping. The read-only public
catalogue showed eight available items; shortlist the two apparel items and Binga
basket for physical stock, options, sourcing, delivery and actual cost review.
This is not an approved assortment. Food remains outside the proposed initial
allowlist until label, handling and destination checks are complete.

[The pilot plan and owner template](../pilot-launch-readiness.md) set proposed
four-week/20-enquiry/10-paid-order limits, first-three-delivery review and pause
criteria. Measure unique-request quote acceptance, delivered/paid orders,
delivery against the individually confirmed window, actual contribution after
all costs/refunds, and governed 30/60-day repeat demand. Costs/windows/repeat
reconciliation require private pilot records; anonymous funnel counts cannot
supply those answers.

Outstanding inputs are the complete contracting operator/address, approved
commercial procedures, explicit origin/destination/DHL service and restrictions,
verified product facts/stock/unit economics, production Aiven backup/isolated
restore evidence, and explicitly designated/authorized transactional-email test
recipients with actual inbox acceptance. Native-speaker review remains a human
review. Mock/local verification does not establish these business facts.

No open seller onboarding, split payouts, escrow or broad marketplace rewrite
was introduced.
