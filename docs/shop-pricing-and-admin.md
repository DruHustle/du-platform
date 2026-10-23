# Shop prices and administration

Reviewed 23 October 2026. These are **indicative order-request prices**, not
supplier quotations or promises of availability. DHL coverage, handling and final
delivery charges must be confirmed before payment. No stock has been invented:
seed products retain zero stock. An administrator must confirm the actual item,
size, supplier cost and available quantity before making it available to order.

## Regional currency

Visitors in the `Africa/Harare` time zone default to USD, those in
`Africa/Johannesburg` to ZAR, and Europe/default to EUR. A labelled selector lets
travellers or visitors elsewhere override this without location permission or an
IP lookup. The choice persists locally and is shared by the shop and basket.

Products may be entered in EUR, USD or ZAR. The server converts each unit price,
rounds to cents, multiplies by quantity and stores the chosen currency and amounts
with the order and its lines. Receipts, emails and WhatsApp requests use that same
currency. Delivery allowances retain their EUR basis, then convert to the chosen
currency. They are not live DHL quotations.

The fixed reference in `shared/shopCurrency.ts` is
[ECB, 15 October 2026](https://www.ecb.europa.eu/stats/exchange/eurofxref/shared/pdf/2026/10/20261015.pdf):
EUR 1 = USD 1.1208 = ZAR 18.5569 (GBP 0.84610 for the comparison below).
These are reference estimates, not a live FX service. The date appears next to
the currency selector. Review the rates when updating prices; update the pricing
revision at the same time. Stale new requests must refresh before submission;
existing order receipts retain their original amounts.

## Retail benchmarks

The default EUR amounts below are rounded comparisons. Source availability or
brand authenticity does not establish DU availability, a supplier relationship or
the exact specification of a DU item. No competitor descriptions or photography
were copied. Promotions were excluded where a regular price was available.

The principal grocery source is
[African Basket](https://www.africanbasket.shop/), a regional retailer listing
matching brands and pack sizes. See also its
[snacks catalogue](https://www.africanbasket.shop/biscuits-snacks) and
[Colcom 100g product](https://www.africanbasket.shop/product-page/colcom-pork-pies).

| DU item                                    | Benchmark                                                    | Default EUR |
| ------------------------------------------ | ------------------------------------------------------------ | ----------: |
| Mazoe orange, 2L                           | ZAR 89.99 regular                                            |        4.85 |
| Mazoe blackberry, 2L                       | ZAR 89.99 regular                                            |        4.85 |
| Mazoe cream soda, 2L                       | ZAR 90.99 regular                                            |        4.90 |
| Mazoe orange / raspberry, six 2L bottles   | ZAR 499.99 regular per case                                  |       26.94 |
| Mazoe variety pack                         | Comparable six-bottle case; assortment requires confirmation |       26.94 |
| Cerevita banana / cocoa malt / wheat, 500g | ZAR 84.99 each                                               |        4.58 |
| Pfuko traditional, 500ml                   | ZAR 17.99                                                    |        0.97 |
| Pfuko traditional, twelve 500ml bottles    | ZAR 191.99                                                   |       10.35 |
| Cascade orange, six 400ml bottles          | Prorated from ZAR 289.99 for twenty 400ml bottles            |        4.69 |
| Kariba kapenta, 100g                       | ZAR 34.99                                                    |        1.89 |
| Royco Usavi beef, 75g                      | ZAR 16.99                                                    |        0.92 |
| Colcom pork pie, 100g                      | ZAR 19.99                                                    |        1.08 |
| Cheeky Chilli peri-peri, 100ml             | ZAR 17.99                                                    |        0.97 |
| Maputi, 40g                                | ZAR 2.99                                                     |        0.16 |
| Lobels lemon creams, 150g                  | ZAR 13.99 regular                                            |        0.75 |
| Sun jam, 500g                              | ZAR 37.99                                                    |        2.05 |
| Madras hot / mild curry, 100g              | ZAR 26.99 each                                               |        1.45 |

Colcom requires a verified cold chain; the
[manufacturer catalogue](https://www.colcom.co.zw/wp-content/uploads/2026/04/Colcom-Foods-Products-Catalogue_2025E.pdf)
specifies refrigeration below 5°C. A DHL carrier name alone does not establish a
suitable route. Keep stock unavailable until the owner has confirmed handling.

Other items use **comparables**, which require owner specification checks:

| DU item                      | Comparable source and limitation                                                                                                                                                               | Default EUR |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: |
| Sables supporter kit         | [Impact official jersey](https://www.impactyourkit.com/collections/zimbabwe-7s-cheetahs-official-merchandise-impact-prowear), USD 44.99; DU kit contents and authenticity unverified           |       40.10 |
| Chevrons jersey              | [African Pride cricket collection](https://africanpride.co/collections/zimbabwe-cricket-collection), USD 49.99 custom rugby jersey; comparable supporter apparel, not the exact cricket jersey |       44.60 |
| Warriors supporter kit       | [ZIFA home jersey](https://shop.zifa.co.zw/product-category/jerseys/), USD 60; DU kit contents and authenticity unverified                                                                     |       53.50 |
| Shona stone sculpture        | [African Rainbow Craft small sculptures](https://africanrainbowcraft.com/en/product-category/art-sculptures/stone-sculptures/), EUR 23; size, stone and actual piece must be confirmed         |       23.00 |
| Binga basket                 | [African Home Goods 12-inch baskets](https://theafricanhomegoods.com/collections/zimbabwe-tonga-binga-baskets/zimbabwe-baskets), USD 35; DU diameter unverified                                |       31.25 |
| Beaded necklace and bracelet | [African Artisan](https://africanartisanllc.com/collections/zimbabwe-bead-art), USD 20 necklace + USD 10 bangle; comparable separate items, DU design/materials unverified                     |       26.80 |
| Mama Dovi, 750ml             | [Afrozim Taste UK](https://www.afrozimtasteuk.co.uk/shop), GBP 4 for 375ml peanut butter, scaled to 750ml; exact brand comparison unavailable                                                  |        9.50 |

## Admin access and product workflow

1. Open `/admin`, or the **Admin** link in the footer. Unauthenticated visitors
   go to `/login?next=%2Fadmin`.
2. First-time owners use **Forgot Password** with an address in server-side
   `ADMIN_EMAILS`. Follow the single-use emailed link, set a password and sign in.
   Startup reserves missing configured identities with undisclosed random
   passwords; it sends no email and never changes an existing password. Public
   registration cannot claim an administrator email.
3. Admin API access requires both the server allowlist and verified mailbox
   ownership. Password recovery records verification and advances a credential
   version; access tokens issued before that recovery cannot authorize admin
   actions. Session refresh preserves the current version.
4. Use **Shop Products** to add, edit, publish, hide or delete products. Prices
   are entered in normal units, such as `4.99`, with an explicit base currency.
   New products start hidden. Stock must be a non-negative integer. An HTTPS
   image URL or existing site image path is supported; file upload is not offered.
5. Products referenced by orders cannot be deleted. Hide them to preserve history.
   Unsaved edits and deletion require confirmation. Saves refresh the public
   catalogue without waiting for its normal cache lifetime.

`shop_catalog_seed_history` records seed SKUs once. On the first upgrade, only
unchanged legacy default EUR prices are corrected to the reviewed values.
Existing custom prices and all owner names, descriptions, stock, images and
visibility remain intact. Subsequent restarts neither overwrite edits nor restore
deleted seed products. New defaults must be introduced intentionally; changing a
seed file does not override the owner's catalogue.

## Verification

Run the normal checks and `pnpm test:e2e:shop:admin` with an explicitly supplied,
disposable localhost `SHOP_TEST_DATABASE_URL` ending in `_test`. It exercises
email setup through an isolated provider mock, permissions, real mobile login,
CRUD, database restarts and EUR/USD/ZAR guest checkout. No production database,
email account, payment provider or device is used. Chromium is the default;
`SHOP_ADMIN_BROWSER_ENGINE=webkit` also exercises WebKit. Screenshots and a report
are written to `/tmp/du-shop-admin` (override with `SHOP_ADMIN_OUTPUT_DIR`).
