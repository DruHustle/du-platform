# Europe assisted-order pilot: owner inputs and launch gate

Owner-selected target: **the 27 EU member countries**, with **EUR** quotes and
**shipment from Germany via DHL**. Country scope is owner intent; individual
addresses, carrier services and product eligibility still require verification.
Europe, the EU, EEA, UK and other European destinations are not interchangeable.

Owner-confirmed operator: **Onesa UG trading as Diaspora Unlocked**. The corrected
business/returns address is **Steinhofweg 47, 69123 Heidelberg, Germany**. This
supersedes the earlier sole-trader description and street number 17. Public
company information identifies Onesa UG (haftungsbeschränkt), Andrew Gotora,
Amtsgericht Mannheim HRB 757830; confirm the current register record and any
applicable tax identifiers before final commercial approval. Existing public
contact: info@diasporaunlocked.com and +49 151 47416152.

The owner has authorised activation, but no completed approval record is installed.
The legal/delivery pages and [commercial procedure draft](pilot-commercial-procedures.md)
remain **drafts**. This release selects enforced `prelaunch` through the Oracle
Docker image default; verify the live mode at `/api/shop/readiness`. The reviewed
production baseline was `4f80906` in `observe`; it is a historical snapshot. Card payments
are not implemented or available: the owner confirmed there is no Stripe account.
Stripe is the recommended provider; onboarding and the actual payment process must
be completed before offering card payment.

The owner subsequently confirmed **no items are currently held in stock**. The
eight formerly positive catalogue counts were explicitly approved and corrected to
zero on 25 October 2026 at 16:21 UTC. All 28 published products were verified at
zero in the API and rebuilt frontend snapshot. This release does not reset stock.
Until physical stock and costs are verified, use confirmed one-time product
interest, not commercial delivery promises. See the [demand experiment and sourcing
worksheet](product-demand-sourcing.md).

Production recovery and authorised mailbox checks were completed on 25 October
2026; see [the operational evidence](audits/pilot-operational-acceptance.md).

## Approval checklist and owner-input template

For each row, record the actual input, reviewer, review date, evidence reference
and explicit approval. Blank or unverified facts remain **NOT READY**.

| Check                 | Owner inputs and evidence required                                                                                                                                                                                                            | Current evidence                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `operator_identity`   | Full contracting person/entity name; legal form; serviceable postal address; representative; applicable registration/tax identifiers; customer contact                                                                                        | Onesa UG and corrected address supplied; register/tax review remains                                                         |
| `procedures`          | Approved quote/contract formation; payment method and reconciliation; cancellation/withdrawal process and applicable exceptions; returns address/costs; refund timing and complaints                                                          | Drafts only; no approved commercial terms                                                                                    |
| `delivery`            | Actual shipment origin; individually named destination countries; DHL account/service and quotation procedure; weight/dimensions; packaging; customs/tax/import responsibilities; prohibited/restricted items; tracking and delivery promises | Germany → EU27 via DHL confirmed; exact services, rates and product restrictions unverified                                  |
| `product_facts`       | Physical stock count and location; verified sizes/variants/net quantity/materials/ingredients/allergens; sourcing and supplier evidence; label/photos; destination eligibility per SKU                                                        | Published catalogue and editable details; missing facts are not approvals                                                    |
| `unit_economics`      | Supplier cost/currency/invoice; packaging; handling; actual carrier quote; payment fees; duties/taxes responsibility; FX date; damage/returns allowance; approved final price and contribution                                                | Owner catalogue prices retained; no verified margins                                                                         |
| `backup_restore`      | Production Aiven plan/current backup status and retention; latest recoverable point; approved isolated restore target; schema/row comparison and application recovery; queue/retry reconciliation; date/reviewer                              | Production logical restore and application probe passed, 25 October 2026; provider PITR not exercised                        |
| `transactional_email` | Explicitly designated test recipients; sender/domain authorization; provider acceptance, private-link recovery, quote/refund content and inbox checks; duplicate/retry review; date/reviewer                                                  | Three labelled samples accepted and owner-confirmed at info@diasporaunlocked.com; live private-link inbox flow not exercised |

Copy [the deliberately unapproved JSON template](../config/shop-pilot-approval.example.json)
to a private operational location. Fill actual dates, approver, country codes and
accepted country-name spellings, approved database product IDs, and evidence for
every check. `null`, empty lists and false approvals intentionally cannot enable
the pilot. Evidence references should identify approved controlled documents;
do not put credentials or customer data in the file or repository.

Do not use admin email addresses as implicit email-test permission. The owner
must designate recipients and authorize the acceptance exercise. Until then,
test only with mock email providers and `example.test` recipients.

## Explicit readiness configuration

The Oracle image explicitly sets `SHOP_COMMERCIAL_MODE=prelaunch` in this release.
A read-only pre-release check found no orders or issued quotes; none were cancelled.
No approval file is installed. An explicit host environment override takes precedence
over image defaults; verify the published mode after deployment. The current host
had no such override. Owner-controlled modes remain (processes outside the Oracle image still default
to observe unless explicitly configured):

| `SHOP_COMMERCIAL_MODE` | Effect                                                                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observe`              | Compatibility/report-only. Existing assisted enquiries and quotes remain possible. Customer/operator notices disclose that readiness is unconfirmed. **This is not commercial launch approval.**                                                               |
| `prelaunch`            | Enforced pause on **new order requests and new final quotes**. Product interest remains available. Previously issued quotes remain recoverable/acceptable; existing paid orders, refunds, cancellation, tracking and fulfilment continue.                      |
| `pilot`                | New quotes require a valid current approval file and match its explicit destination-country names/codes, product IDs and EUR currency. Current publication/stock is checked when quoting, and inventory is still consumed only on actual payment confirmation. |

Set `SHOP_PILOT_APPROVAL_FILE` to the privately mounted approval JSON. Its dates
must be current and ordered; every prerequisite needs approval and evidence.
Invalid/missing/oversized files, expired/future approvals and misspelled modes
fail closed for new quotes in enforced mode. Files are reread when checking a
quote, so revocation does not require an application restart. The public readiness
API exposes status/check names, approved product IDs and country codes, not approver identity,
evidence references, paths or private operator records.

Enforced prelaunch is authorized for this release. Moving to pilot remains an explicit operational decision.
After explicit approval, add the mode and a read-only private file mount to DU's
existing Oracle runtime configuration. Keep the file readable only by the DU
runtime user/group. Do not bake it into Docker images or commit it. Do not change
sibling services. The example path `/run/du-shop/approval.json` is a proposed mount
location, not an installed production file.

The gate governs issuing a new offer, not historical recovery. It deliberately
does not erase issued quotes or block legitimate refunds/fulfilment when a mode
changes. Review and explicitly cancel any previously issued offer that should
not remain open. An approval file is an owner attestation, not automated proof
of legal compliance, carrier eligibility or physical inventory.

## Proposed bounded pilot

Start only after the checklist is approved. The owner selected Germany → EU27.
Approve each actual product/service/address combination rather than treating a
country code as carrier eligibility. A small initial Germany corridor is an
optional operational recommendation, not a replacement for the owner's EU scope.

EU27 codes: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT,
LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Record accepted country-name aliases in
the private approval file. Special territories require their own carrier and tax
checks; a country code alone does not establish coverage.

Proposed cap: four weeks, 20 qualified enquiries and at most 10 paid orders, with
manual review of every quote. These are proposed experiment limits, not sales
forecasts or customer promises. Review the first three deliveries before taking
additional paid orders. Pause new quotes for an unsafe product, unfulfillable
delivery, unresolved payment/refund discrepancy or negative contribution.

Read-only database-backed public catalogue snapshot, 23 October 2026, production
`82e704c`: 28 published products; eight marked in stock:

| ID  | Product                         | Published EUR estimate | Reported units |
| --- | ------------------------------- | ---------------------: | -------------: |
| 1   | Sables Rugby Home Kit           |                  40.10 |             12 |
| 2   | Chevrons World Cup Jersey       |                  44.60 |              8 |
| 5   | Binga Basket                    |                  31.25 |             16 |
| 7   | Mazoe Variety Pack              |                  26.94 |             24 |
| 8   | Cerevita Corn and Banana Cereal |                   4.58 |             18 |
| 15  | Kariba Kapenta (Matemba) 100g   |                   1.89 |             10 |
| 21  | Maputi 40g                      |                   0.16 |             30 |
| 22  | Lobels Lemon Creams 150g        |                   0.75 |             20 |

This verifies the API's state, **not physical inventory or European eligibility**.
Preserve owner prices and stock. First shortlist IDs 1, 2 and 5 for owner
verification: document actual apparel options, basket dimensions/materials and
sourcing, then price their real delivery corridor. This is a shortlist, not an
approved assortment. Keep food outside the initial commercial allowlist until
ingredients/allergens, packaging, handling and destination restrictions are
verified. Do not infer that non-food products are automatically unrestricted.
Low-value food prices are not evidence that an individual DHL parcel is viable;
only approve bundles/minimums after the actual cost worksheet is complete.

For each accepted pilot enquiry, confirm physical item/options and destination,
issue a time-limited itemized EUR quote with a real delivery charge, obtain
acceptance, reconcile actual external payment, consume stock atomically, dispatch
with tracking and record actual delivery. Retain the individual refund records
and their payment-channel references if goods or money must be returned.

## Measures and review decisions

Use the protected order workspace and a private reconciled cost worksheet. Do not
use the anonymous consented funnel as unique customer attribution or repeat-demand
evidence. No customer-email/open tracking is introduced.

| Measure              | Definition and evidence                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote acceptance     | Unique qualified requests with an accepted quote / unique qualified requests issued a valid quote; count requests once despite quote revisions or retries; distinguish expired/withdrawn offers                         |
| Fulfilled orders     | Actual delivered orders / paid orders; separately report open, cancelled, refunded and stock-issue cases                                                                                                                |
| Delivery reliability | Delivered within the individually confirmed window / delivered orders with a recorded window; retain carrier/tracking evidence and record damaged/lost items and actual days                                            |
| Contribution         | Actual agreed item + delivery receipts minus refunds, supplier cost, packaging/handling, carrier charges, payment fees, seller-borne taxes/duties and actual return/damage costs; compare with approved quote allowance |
| Repeat demand        | At 30/60 days, returning paid customers / eligible first-time fulfilled customers, using appropriately governed private order records; report only aggregates and disclose the small cohort and observation window      |

Delivery promises/windows, actual costs and repeat-customer reconciliation are
manual pilot records, not fields or metrics magically supplied by the anonymous
funnel. Agree numerical success thresholds only after real costs and DHL service
windows are known. Review every failed delivery/refund and every negative-margin
order; expand only with recorded owner approval. Defer open seller onboarding,
split payouts, escrow and broader marketplace expansion.

## Focused follow-up evidence — 26 October 2026

The confirmed-interest release was verified at `c65bc3ac` on main and production.
Customer basket totals/copy, product-information states and active/expired demand
reporting are corrected in the [follow-up audit](audits/prelaunch-followup.md).
No commercial mode, approval scope, stock or payment activation is changed.

The approved actual-Mac archive destination now has a tested daily snapshot/pull
LaunchAgent, visible success/failure status, verified fresh encrypted download and
an Oracle isolated restore of the current schema. Archive transfer is complete;
separate USB key custody/verified recipient and independent key recovery remain
pending. See the [updated operational runbook](assisted-order-operations.md).
This evidence does not establish provider PITR or complete host-loss recovery.
