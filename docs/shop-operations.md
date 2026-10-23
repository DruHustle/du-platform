# Shop order requests and delivery

The owner confirmed DHL as the delivery carrier on 23 October 2026.
The shop accepts assisted order requests. It does not take a live payment or
confirm dispatch. The following describes implemented behaviour, not a claim
that a particular destination or delivery service is available.

1. A visitor chooses products and quantities. The server validates current stock
   and prices and saves one private request, including its delivery address.
2. The visitor receives a reference and an email receipt in their selected
   language. A retry of the same request does not create a second order.
3. The visitor contacts **info@diasporaunlocked.com** with that reference. The
   merchant alert includes the requested address and delivery preference.
4. Before accepting payment, the operator must confirm stock, DHL availability for the address, the actual delivery service, total cost and
   payment instructions.
   Dispatch and any delivery date must be confirmed separately.

The displayed delivery allowance is a planning estimate. The existing formula
uses basket value and the selected speed; it does **not** check the destination,
carrier availability, customs, taxes or a delivery date. An express preference
is a request for review, not a booked express service. No live payment integration
is enabled in production. The simulated gateway is restricted to development/test.

## Coverage policy

Delivery is arranged through DHL, subject to individual confirmation of service
availability and the final charge for the requested destination. The platform
has no DHL quote or booking API. All destinations require review; accepting an
address does not promise service there. No blanket country list or delivery date
is advertised. Country-specific delivery times and any returns procedure must
be supplied by the operator before they can be published.

## Catalogue correction

Cascade's title is **Cascade Orange 400ml Case (6 Units)**, matching the existing
`cascade-orange-400ml-case-6` identifier and the pictured bottle. Dairibord lists
400ml packaging: https://dairibord.com/product/cascade/ (checked 23 October 2026).
The previous 500ml title was inconsistent. Prices, stock and identifiers are
unchanged. The existing catalogue synchronization updates seeded product metadata during
backend initialization. The correction is verified against the disposable
database; no production database records were edited in this work.

## Language handling

Shop receipts and stock-alert messages use the selected supported language
(English, German, Shona or Ndebele). Future stock alerts retain the language saved
with the request. Newsletter confirmation messages and unsubscribe footers also
use the selected language. Existing subscription rows default to English.
Newsletter campaign text remains exactly the text approved by the administrator;
the system does not translate an approved campaign automatically.

Schema changes add a `language` column with an English default, preserving existing
records. The normal database initialization applies the restart-safe upgrades.
