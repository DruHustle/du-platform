# Commercial pilot procedures — draft for owner approval

25 October 2026. These are concrete proposed procedures, not approved commercial
terms or proof of product/carrier eligibility. The public pages remain labelled
drafts. Do not collect payment until the outstanding facts below are resolved.

## Confirmed scope

- Operator: Onesa UG trading as Diaspora Unlocked; owner corrected the address to
  Steinhofweg 47, 69123 Heidelberg, Germany. Verify the current register record
  and applicable tax identifiers before final approval.
- Dispatch from Germany, intended destinations the 27 EU member countries, DHL,
  EUR final quotes. Check exact addresses, territories and product restrictions.
- Customer contact and proposed returns contact: info@diasporaunlocked.com,
  +49 151 47416152, at the business address above.
- Shop and newsletter use separate workflows. Neither requires a platform
  account; an order does not subscribe a customer to the newsletter.

## Enquiry, quote and contract

1. Treat the basket submission as a request. It does not charge money, reserve
   goods or promise delivery. A private receipt link recovers the request.
2. Before quoting, physically check stock and exact options, supplier/label facts,
   destination eligibility, packed weight/dimensions, packaging and a real DHL
   service/rate. Keep supplier and cost evidence in controlled private records.
3. Send a time-limited EUR quote with each exact item/options, quantity and price,
   delivery charge, tax treatment, total, dispatch/delivery estimate, payment and
   withdrawal/returns information. Never substitute the basket's planning
   allowance for a carrier quotation. Changes require a new quote revision.
4. Proposed contract formation: quote acceptance records the customer's intent;
   the shop separately confirms the order in writing after the final checks.
   Obtain appropriate review of the actual terms and pre-contract disclosures
   before using this procedure commercially. Do not imply that the present
   acknowledgement button creates an automatic paid order.

## Card payment proposal

Use Stripe as the initial provider after Onesa UG completes merchant onboarding.
The owner confirmed no Stripe account is set up. **No card gateway or card payment
link is live.** Existing DU code supports reconciled assisted payment only.

For a small manually reviewed pilot, propose an individual Stripe-hosted invoice
for the accepted quote: exact EUR total and order reference, sent only after the
written order confirmation. Complete an actual sandbox exercise before using it.
Do not send a generic reusable amount link, ask for card details by email, store
card data in DU, or infer payment from a screenshot/browser return page.

An authorised operator verifies the received payment in the provider dashboard
and records its actual transaction reference in DU. DU's existing transaction
deducts stock once. The provider remains the financial source of truth. If stock
is unavailable after money arrives, record the payment issue and resolve supply
or actually refund it. A DU refund entry records an external refund; it does not
instruct Stripe to move money.

Any future automatic Checkout integration must bind the immutable accepted quote
and currency to a server-created session, verify signed/replayed webhooks, and
handle concurrent cancellation/revisions, stock failure, duplicate payments and
refund reconciliation before it can replace this manual procedure.

## Dispatch, cancellation and returns

Dispatch after actual payment and final product checks. Record the real DHL
tracking reference and communicate the confirmed estimate; do not promise an
unverified service level. Confirm receipt before marking delivery complete.

Proposed consumer withdrawal procedure, subject to applicability review: customers
notify info@diasporaunlocked.com or the business address within the applicable
14-day withdrawal period. Provide the required withdrawal instructions and model
form before the contract, on a durable medium. Do not require an explanation or
make statutory rights conditional on obtaining a return authorisation.

Publish a final return-cost policy and any lawful product-specific exceptions
before launch. Refund eligible amounts through the original payment method in
the applicable timeframe; the EU guidance describes a 14-day deadline after
notification and circumstances allowing withholding until goods or dispatch
evidence are received. Do not impose these rules indiscriminately on every food
or personalised product. Faulty-goods rights are separate from change-of-mind
returns. Record actual partial/full refunds individually in DU.

The owner must approve the final withdrawal wording/form, tax treatment, return
costs, product-specific exceptions and payment/contract process. This document
does not settle those facts or attest to legal compliance.

## Product and contribution worksheet

Complete one private worksheet per proposed SKU and delivery service:

| Required field                                        | Evidence to retain privately                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| SKU/options and physical units in Germany             | Count date, exact sizes/variants/packs, inspection                            |
| Supplier and product facts                            | Invoice/source, materials or ingredients/allergens, label/photo, restrictions |
| Item cost and currency                                | Actual supplier invoice; no assumed margin                                    |
| Packaging and handling                                | Measured packing materials and labour allowance                               |
| DHL service, packed dimensions/weight and destination | Actual dated carrier quotation and restrictions                               |
| Tax treatment and provider fees                       | Applicable taxes, approved merchant fee schedule                              |
| Returns/damage allowance                              | Owner's explicit allowance and basis                                          |
| EUR selling total and contribution                    | Revenue less all actual costs/allowances; owner approval                      |

Shortlist for verification only: IDs 1 Sables Rugby Home Kit, 2 Chevrons World Cup
Jersey, 5 Binga Basket. Published stock/price values are not physical verification.
No item is approved automatically. Keep food outside the initial approved list
until its labelling, handling, sourcing and destination requirements are verified.

## Review references

- [German operator-information requirements, DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html)
- [EU distance-selling and withdrawal guidance](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm)
- [Stripe hosted payment interfaces](https://docs.stripe.com/payments/checkout)
- [Stripe German fees](https://stripe.com/en-de/pricing/local-payment-methods)
- [PayPal German merchant fees](https://www.paypal.com/de/business/fees?locale.x=en_DE)

Provider fees depend on card type and account terms; published rates do not prove
DU's unit economics. No merchant account, legal agreement or financial transaction
was created or accepted during this review.
