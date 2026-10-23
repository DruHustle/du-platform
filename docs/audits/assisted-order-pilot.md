# Assisted-order pilot remediation

Original audit baseline: `44374ee36f35db1523f505bd4900fe8e8676a1dd`, 23 October 2026.
The first pass below is historical evidence from `fix/assisted-order-pilot`.
PRs #132 and #133 subsequently merged; production and protected main were
rechecked at `82e704cee123a088ea2c391676315db950aef0d4` on 23 October 2026.
No production catalogue edits were performed in either audit pass.

## Verified baseline and priorities

1. High: production `/api/search?q=Mazoe` returned zero matches; code indexed pages and NTIR only. 28 products published, 20 unavailable. Preserve stock and owner edits.
2. High: order estimates persisted but no admin fulfilment workflow; emails were best-effort after commit. Add transactional workflow, immutable quotes, conditional inventory consumption and an outbox.
3. High: preview config reused the production API rewrite. Disable preview service actions until a separate backend/database is configured; reject preview/test-origin writes at the production API.
4. High: fallback trip plans scheduled distant regions without transfers, charged days as nights and had irreconcilable activity costs. Share and validate geography/arithmetic across client/server.
5. Medium: Onesa had no catalogue retrieval; public HTML had only metadata/loading shell; frontend CSP absent; mobile navigation hid labels and checkout used nested scrolling.
6. High launch dependency: legal operator identity/address and actual commercial procedures incomplete. Owner confirmed Diaspora Unlocked, Germany, existing site contact details, DHL, and requested draft procedures. This does not establish a legal entity, registration, fulfilment coverage or approved terms.

Live ping identified the baseline commit; MySQL and Gemini readiness responded healthy. The AI endpoint also listed Groq, Anthropic and Cerebras fallback targets. A healthy endpoint does not establish provider contract or privacy compliance.

Main branch protection was confirmed absent, then configured using GitHub's supported public-repository protection API: up-to-date `Build and Test (22.x)` from GitHub Actions (app 15368), enforced for admins, PR required, zero mandatory independent approvals, conversation resolution, no force pushes/deletion. Read-back verified the configuration.

## Implementation and validation

Confirmed findings were remediated in the existing modules:

- Discovery: published product names/descriptions/SKU aliases, categories and destination anchors now participate in search. Directory results preserve their query. Available-now filters and available-first featured choices do not change stored stock. Search failure remains distinct from an empty result.
- Assisted orders: a protected admin workspace handles review, immutable quote revisions, private customer acceptance, actual payment references, atomic inventory consumption, dispatch/tracking, delivery, cancellation, checked returns and refund records. Optimistic versions, transaction locks and command fingerprints prevent stale or duplicated actions. A received-payment/stock-issue path avoids inventing fulfilment after money arrives.
- Reliability: request/workflow notification intent commits atomically; encrypted frozen messages use bounded retries and stable provider keys. Admin failures/retries are visible and audited. Customer mail waits for the compatible frontend during Oracle-first rollout. Provider acceptance is not inbox delivery or exactly-once messaging.
- Product trust: admin specifications, sources/photos, requested variants, postal addresses and customer notes extend the existing catalogue without repricing or overwriting owner records. Initial estimate descriptions/prices/currency are snapshotted. Research profiles support primary sources, actual review dates, qualified status, promoter contact and next steps.
- Travel and Onesa: shared geographically coherent sample plans account for dates, nights, transfers, party size, interests, components and explicit contingency. AI results must satisfy those invariants. Current published stock/prices are retrieved through an explicit read-only catalogue interface; valid internal links and honest capability limits are rendered.
- Public experience: homepage purpose/action, relevant shop imagery, readable mobile navigation/checkout, private status links, protected draft editing, localized policy drafts and accurate privacy flows retain the brand and frameworks. No unsupported social destinations are displayed.
- SEO/security: substantive initial public HTML and published product documents, canonical/sitemap coverage, private noindex, self-hosted existing fonts, effective CSP, same-origin browser APIs, isolated read-only previews, protected main and credential-free Docker contexts. Globe/immersive code remains lazy.
- Measurement: optional consented discovery/basket events plus successful request/quote/delivery aggregates contain no customer identifiers. Withdrawal is supported for the currently known private request; aggregate counts are not unique visitors or attribution.

Baseline backend/database/AI health and CI/deployment were already working and were preserved. Unavailable inventory was genuine catalogue state, not a defect to reset. No production orders, customer emails, product edits or payment actions were performed.

### Local verification

- Type checks, production build, deployment size budget, strict four-language translation validation, build/deployment/locale guardrails, changed-file formatting and Git whitespace checks passed. Dependency audit reported no known production vulnerabilities.
- Backend: **256 tests / 37 files passed**, using a disposable local MySQL database for database-dependent regressions; no skips. Frontend: **101 tests / 21 files plus 7 Node checks passed**.
- Search tests cover Mazoe, descriptions, hidden products, directory deep links and retrieval failure. Database tests cover duplicate requests, mismatched replay, authorization, optimistic conflicts, immutable quotes, expiry, concurrent inventory confirmation, cancellation/return restock, received-payment stock issues/refunds, atomic outbox rollback, retry recovery/windows/leases, language and consented outcome deduplication.
- Full customer/operator pilot: **7 scenarios in Chromium and 7 in WebKit**, including guest enquiry, current quote acceptance, payment/dispatch/delivery, private URL consumption, same-tab status refresh, multiline admin fields and cancelled draft discard.
- Existing shop browser suite: **16 scenarios in each engine**, including responsive swiping/cart controls, mobile natural scrolling, independent desktop cart scrolling, failure/retry, storage and short-height recovery. Integrated HTTP checkout and MySQL transaction/cache-race regressions passed. Shop admin/regional pricing/restart and **15 newsletter scenarios** passed with mock email.
- Layout: **160 Chromium route/locale/width checks** (10 routes × 4 languages × 4 widths), **40 WebKit checks**, keyboard skip links and a 200% text zoom case. Widths: 320, 390, 768, 1440. Reports contain zero uncaught runtime errors, CSP violations or unexpected network failures. Important home/shop/legal and customer/operator screenshots were inspected; translated long headings and populated textarea labels were corrected. Final screenshot review measured 4.1:1 mobile-label contrast over Home; a darker translucent bar and brighter labels address this, with a runtime check requiring at least 4.5:1 over a white hero backdrop.
- Offline/device suite: **31 scenarios passed**, including malformed/stale AI results, PDF output, synthetic camera/microphone streams, permission denial and cleanup, AR destination races, VR fallback, Quest 3 emulated stereo rendering/two controllers, tracked input, exit/reentry and navigation cleanup. This does not establish physical headset/camera compatibility.
- Initial HTML/SEO: **67 documents and 56 canonical sitemap URLs** verified with the real public 28-product snapshot. Private pages remain noindex. CI uses an explicit seed fixture instead; production Vercel forbids that override.
- Docker image built locally using the backend strategy without a live catalogue dependency. Existing deployment shell/worker failure/rollback fixtures and new preview/CSP/build-context guards passed. At that original pre-release inspection, read-only SSH confirmed the installed deploy script matched the repository, the outbound timer was active and DU's production Docker image was then the original baseline. This is historical evidence; see the current release status below.
- Local logical backup/restore: **26 tables, 125 rows**, identical schema and row hashes after import into a separate disposable database; temporary restore/dump removed. This tests the procedure, **not production Aiven backup configuration or production recovery**.

Additional regressions passed: Onesa HTTP/provider suite **20 scenarios**, full-page and popup chat at mobile/desktop in **Chromium and WebKit**, navigation/keyboard/history, four-language swipeable discovery, and VR music toggles in both engines.

### First-pass mobile performance (historical)

Three cold-context samples per route, 390×844, 4× CPU slowdown, 100ms latency, 200,000 B/s down / 100,000 B/s up, identical local HTTPS/gzip/cache rules and a fixed public catalogue API snapshot. Observe paints for 6.5 seconds after load; no builds or other browser suites ran concurrently. Compare the exact clean baseline build against the updated functional build (entry `index-Dk5XHhtp.js`), before the final mobile-navigation contrast-only adjustment. No performance claim is made for that later styling adjustment. These are local lab measurements, not Lighthouse scores, field Core Web Vitals or claims about real carrier/provider latency.

| Route   | Median FCP before → after | Median LCP before → after |
| ------- | ------------------------- | ------------------------- |
| Home    | 756 → 772 ms              | 3,520 → 3,956 ms (+12.4%) |
| Shop    | 760 → 652 ms              | 6,960 → 2,724 ms (−60.9%) |
| Tourism | 748 → 648 ms              | 3,548 → 3,208 ms (−9.6%)  |

Shop's relevant hero photograph is 74,040 bytes versus the old 134,858-byte wildlife image (45% smaller). The existing Inter/Montserrat fonts are now served locally instead of relying on an external stylesheet; their weight/size conventions remain unchanged. Raw initial JavaScript is about 803 KB versus 790 KB baseline (roughly +1.7%); no bundle reduction is claimed. Initial route script requests contain no separate globe/XR/immersive bundle. Updated static frontend output is **57.62 MiB**, within the existing 60 MiB total / 6 MiB per-file limits.

Home's LCP regression is recorded, not hidden: self-hosted fonts and earlier substantive HTML/brand resources compete with the initial shared JavaScript under this slow profile. Its public content is available in the initial HTML, but this is lightweight static preview markup replaced on React startup, not full hydrated SSR. Further reduction of the shared initial JavaScript and matching prerendered/client layouts is a remaining performance opportunity. Early request-interception measurements were discarded because Playwright disabled HTTP caching and caused a misleading duplicate logo fetch. [Raw comparable samples and methodology](assisted-order-pilot-performance.json) are retained.

### Review and release status

The first remediation merged through [PR #132](https://github.com/DruHustle/du-platform/pull/132) and [PR #133](https://github.com/DruHustle/du-platform/pull/133). [Production CI run 39997013134](https://github.com/DruHustle/du-platform/actions/runs/39997013134) completed successfully. Read-only `/api/ping` and the GitHub main branch were rechecked at `82e704cee123a088ea2c391676315db950aef0d4` during the follow-up pass. Production no longer runs the original `44374ee` baseline.

The current follow-up is on `fix/pilot-reconciliation-readiness`; it is not merged or production-deployed. Its request authorizes a review branch/PR, with a separate authorization required for a production release. Preview service actions intentionally remain disabled; isolated full-stack journeys are verified locally. See [the operator/rollback/backup runbook](../assisted-order-operations.md) and [the follow-up evidence](pilot-reliability-readiness.md).

## Commercial launch inputs

- Full contracting person's/entity's legal name, legal form, serviceable postal address, representative, applicable registration and tax identifiers. Brand name and country alone are incomplete.
- Approve contract formation, quote acceptance/payment procedure, actual payment methods, delivery destinations/product restrictions and DHL quotation process.
- Approve returns address, withdrawal information/form and applicable exceptions, return-cost responsibility, complaint handling and refund procedure. Drafts must not be treated as approved terms.
- Complete verified product specifications and supplier/origin records. No inferred ingredients, apparel sizes, provenance or carrier eligibility.
- Confirm processor contracts, legal bases, retention schedule, international transfers and privacy disclosures for the configured hosts, database, email and AI providers.
- Native-speaker review of German, Shona and Ndebele copy remains a human review, not a claim of certified translation.

Draft research references (reviewed 23 October 2026): [DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html), [EU distance-selling guidance](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm). These inform missing-input requirements; they do not establish the operator's legal status or substitute for approval of business-specific terms.

## Pricing validation worksheet

Keep owner prices unchanged. For each SKU record verified supplier invoice/currency, unit cost, packaging, handling time/cost, item weight/dimensions, exact DHL service and destination quote, taxes/duties and who pays them, payment fees, returns/damage allowance, FX date/source and approved selling price. A basket delivery allowance is not a free-shipping promise or carrier quote. Confirm item variants, food import/handling restrictions and address/postal requirements individually.

## Later marketplace milestone

Verified seller onboarding/identity, seller agreements, product safety/traceability, per-variant inventory, moderated listings, tax/import responsibilities, disputes/returns, payout/accounting reconciliation and an explicitly selected payment architecture require separate design and approval. This pilot does not implement open seller registration, split payouts or escrow.
