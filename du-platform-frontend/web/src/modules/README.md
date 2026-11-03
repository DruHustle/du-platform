# Frontend Modules

Active domains are home, authentication, core routing, Travel (in the tourism module), investment,
technology, shop, Onesa AI, search, legal content, and administration.

Each domain owns its route manifest and relevant components, hooks, API clients,
pages, and types. The parent route registry combines these manifests. Shared
layout, controls, localization, and browser/session helpers remain outside the
domain directories.

Interior pages use the scoped design system in `src/styles/content.css`:
`content-panel` for main surfaces, `surface-card` for nested content, and
`page-title` / `page-section-title` for heading hierarchy. `Layout` applies
`content-page` only outside Home, whose established styling is preserved. Avoid
adding the old `outer-glass-panel` hook to interior pages; it activates legacy
layout overrides and duplicate borders.

Shop product cards, quantity controls, catalog fetching, and the persisted cart
are shared by both shop routes. The browser key remains `shop_cart_v1`.
Purchasing requires confirmed catalog availability; fallback catalog content
never invents stock. The server remains authoritative for prices and inventory.

Discovery collections use `DiscoverySection`, `DiscoveryTile`, and `SwipeRail`
from `components/discovery`. Their light canvas and dark image tiles follow the
Home page, while `styles/discovery.css` applies only to opted-in sections. Keep
Home's established layout unchanged. `discovery-section-layout` keeps headings
and supporting text contained while letting direct child rails span the screen,
with Home's 24px/32px leading inset. Shop uses this layout for its single featured
product row and retains its dark commerce styling. Rails use native touch scrolling,
explicit previous/next controls, and keyboard navigation; they never autoplay.
Use `resetKey` when a filter changes the set of cards. `DiscoveryTile.onSelect`
provides a semantic card button; dialog callers should restore focus to it.

Shared controls use `styles/content.css` in interior pages and in the
`du-dialog` portal surface. Keep field defaults low in specificity (`:where`)
so an explicit light surface can set its own colors. Interior primary actions
use the existing gold token; outline actions remain secondary. Long button
labels wrap, controls have a 44px minimum height, and icon buttons expose their
size with `data-size`. Native date fields use the browser's calendar and the
dark color scheme rather than a second calendar button.

Use `status-page-shell` with a nested `content-panel editorial-panel` for short
confirmation/preference pages. Do not apply panel padding to `.container`;
that element owns responsive gutters. Portaled menus use
`data-placement="menu"` for their available-height limit. Prefer the existing
Radix menu primitive for keyboard navigation, Escape dismissal and focus return.

`pnpm build` then `pnpm test:e2e:ui` checks public routes and synthetic admin
views at 375, 768 and 1440 pixels without services. Set `UI_BROWSER=webkit` for
the second engine and `UI_OUTPUT_DIR` to select a screenshot/report directory.
All API responses in this suite are local fixtures; it never submits enquiries,
product alerts, campaigns, orders or authentication changes.

Travel owns `/travel` and its child routes. Historical Tourism/Onesa links redirect directly to their canonical Travel equivalents. See `docs/travel-southern-africa.md` for provider capability limits and activation requirements.
