# Asset Structure And Quality Audit

## New image structure

Images were reorganized under:

- `client/public/images/pages/home`
- `client/public/images/pages/export`
- `client/public/images/pages/trade`
- `client/public/images/pages/tourism`
- `client/public/images/pages/investment`
- `client/public/images/pages/technology`
- `client/public/images/pages/data`
- `client/public/images/pages/success`
- `client/public/images/pages/shop`
- `client/public/images/pages/shared`

All `"/images/..."` references in:

- `client/src/**`
- `client/public/locales/**`

were updated to match the new locations.

## Low-resolution assets to improve first

Priority items currently used in major UI sections:

1. `/images/pages/technology/zim_think.jpg` (462x280)
2. `/images/pages/trade/african_trade.jpg` (780x439)
3. `/images/pages/tourism/hwange_elephants.jpg` (780x440)
4. `/images/pages/shop/sports_football_jersey.png` (201x251)
5. `/images/pages/home/partnership_handshake.png` (612x408)

## Candidate high-resolution sources (review license + attribution)

- Victoria Falls (high-res encyclopedia source):
  - https://en.wikipedia.org/wiki/Victoria_Falls
- Great Zimbabwe (high-res encyclopedia source):
  - https://en.wikipedia.org/wiki/Great_Zimbabwe
- Trade/logistics/port imagery (high-res stock):
  - https://www.pexels.com/search/africa%20cargo%20port/
- Zimbabwe wildlife/safari imagery:
  - https://www.pexels.com/search/african%20elephant%20safari/
- Technology/business imagery:
  - https://www.pexels.com/search/africa%20technology%20business/
- Sports jersey imagery:
  - https://www.pexels.com/search/football%20jersey/

## Notes

- `"/images/carbon-fibre.png"` is referenced in UI files but does not exist in `client/public/images`.
- `client/public/images/pages/home/harare_airport.png` is an AVIF file with a `.png` extension. Consider replacing with a true PNG/JPG/WebP file.
