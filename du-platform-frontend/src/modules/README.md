# Frontend Modules

Active domains are home, authentication, core routing, tourism, investment,
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
