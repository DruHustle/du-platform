# Site-wide UI consistency review — 26 October 2026

## Scope and priorities

Started with a clean worktree on main at `267327c`. Reviewed the main landing
pages, catalogue and product detail, confirmation/status pages, project research,
legal documents, authentication, search, Onesa chat/planner, AR/VR and synthetic
admin views. Preserved Home's logo, typography, Victoria Falls hero and discovery
rails. No production data or authorization controls were changed.

The baseline browser sweep covered 29 routes at 375, 768 and 1440 pixels: no
horizontal overflow or JavaScript exceptions. Visual inspection identified:

1. **High usability impact:** pale shop labels on a light canvas; dialog fields
   missing the page control system; cramped admin heading beside its close button;
   24px planner passenger controls; a mobile newsletter search field squeezed by
   its adjacent status filter.
2. **Interaction consistency:** footer contact options lacked the site's standard
   menu keyboard/focus behavior. An icon swap rerendered Layout every 1.8 seconds.
   The planner showed both native and custom calendar affordances; its fallback
   click handler could recursively trigger itself without `showPicker` support.
3. **Visual consistency:** mismatched primary action colors, secondary-page top
   spacing, confirmation card gutters/widths, legal section separation, and footer
   copyright/link alignment. Safari native dropdowns ignored their minimum height.
   Old `!important` compact typography overrode the
   planner's text hierarchy.

## Changes

- Share dark control tokens, field heights, readable mobile input type, validation
  borders and focus treatment between interior pages and Radix dialog portals.
  Keep native inputs/selects appropriate to dark or explicitly light surfaces.
- Give dialogs bounded scrolling and wrapping headings with room for the close
  button. Preserve the separate mobile navigation menu's available-height limit.
- Use contained confirmation cards and document widths; align AR/VR page gutters
  and top spacing with other secondary pages. Retain all route content and links.
- Use gold for the project-card primary action and readable light filter/currency
  controls. Preserve product prices, inventory, prelaunch mode and confirmations.
- Reserve space above auth headings for close controls. Increase planner touch
  controls to 44px, disable controls at passenger limits, expose selected interests with
  `aria-pressed`, and use one native calendar per date field.
- Stack newsletter filters on small screens. Give footer links consistent targets
  and alignment; use the existing Radix contact menu with keyboard navigation,
  Escape dismissal and focus restoration. Remove the repeated icon timer and
  obsolete compact typography rules.
- Normalize Safari dropdown sizing without losing native selection, prevent
  automatic mid-word heading hyphenation, and give the 404 action a 44px target.
- Add a service-free UI regression suite and wire it into existing CI. Public and
  synthetic-admin fixtures do not bypass real authorization or send real data.

## Verification

- Site-wide UI suite: **244 checks passed** (122 Chromium, 122 WebKit), covering
  30 routes plus dialog/form/admin states at **375, 768 and 1440px**. No horizontal
  overflow, broken images, uncaught page exceptions or unexpected HTTP failures.
  Includes visible control sizing, light-surface text contrast of at least 4.5:1,
  mobile menu containment, passenger bounds, interest selection, search failure
  and retry, synthetic admin filters, Escape dismissal and focus return.
- Production build passed; output remains **57.74 MiB**, within existing limits.
- Frontend and backend TypeScript checks passed.
- Frontend tests passed: **109 Vitest tests and seven Node tests**.
- Vite/deployment/locale guardrails, strict translation validation, changed-file
  formatting and SEO checks passed (68 route documents, 56 canonical sitemap URLs).
- Navigation: **33 checks** passed. Discovery: **79 checks** passed, including
  English, German, Shona and Ndebele layouts and the unchanged static Home hero.
- Mock-service/device suite: **31 checks** passed in the documented Chrome
  configuration, with no uncaught browser, console or CSP errors. Covered
  synthetic camera/microphone, denial and late grants, planner PDFs and recovery,
  keyboard scene/dialog navigation, no-WebGL fallback, and a Quest 3 emulator
  rendering stereo frames with two controllers, exit/reentry and session cleanup.

Two exploratory runs of that device suite in bundled headless Chromium timed out
waiting for the VR unavailable dialog or deferred microphone permission. A focused
permission reproduction passed, followed by the complete Chrome run without
relaxing assertions or timeouts. This renderer/tooling limitation is recorded; it
is not evidence of acceptance on physical hardware.

Screenshots and machine-readable browser reports remain outside Git. UI fixtures establish
rendering and interaction behavior, not real inbox delivery, payment processing
or physical headset/phone acceptance. Commercial launch and separate recovery-key
custody remain deferred under the owner's existing instructions.

## Local review

Use Node 22.12+ (verified here with Node 24), then `pnpm build` and
`pnpm test:e2e:ui`. Use `UI_BROWSER=webkit pnpm test:e2e:ui` for WebKit.
`pnpm dev:fast` starts normal local development; do not point local write tests at
production. `pnpm test:e2e:offline` starts its own server with synthetic devices
and no provider/database credentials.
