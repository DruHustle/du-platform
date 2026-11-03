# UI proportions review — 27 October 2026

Base: `DruHustle/du-platform` main at `d5ee68733c86176468e99212710e85d8962ed691`.

## Scope

The live public UI was inspected across Home, Shop, Technology, Investment,
Travel overview, Flights, Stays, Car Hire, My Trips, Weather, the trip planner,
product catalogue, Login, Register, Onesa chat and Privacy Policy. The shared
layout, discovery components, global styles and Travel styles were reviewed in
the source. Account and administrative workflows were not exercised with real
credentials or production writes.

## Findings and implemented changes

| Finding                                                                                                                                | Local refinement                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Travel mixed 1,072 px form widths, 1,120 px shells and 1,232 px discovery content, producing visibly different section edges.          | Shared content-width and responsive-gutter variables align navigation, heroes, forms, guides, forecasts, card rails and footer content. Narrow document and authentication layouts retain their component limits. |
| Large landing headings and fixed hero image heights competed for attention, especially at intermediate widths.                         | Landing headings scale from 32 to 52 px, use balanced wrapping, and sit beside images with responsive aspect ratios and capped heights. Image wrappers fill their frames without determining frame height.        |
| Travel rendered an empty highlighted headline span, leaving unnecessary space.                                                         | The highlighted line renders only when it has text.                                                                                                                                                               |
| Seven Travel links wrapped into several rows on narrow screens.                                                                        | Compact 14 px links retain 44 px touch targets and scroll horizontally on mobile. The active section scrolls into view after navigation or a language change.                                                     |
| Airport fields and ordinary labelled inputs used different label-to-control spacing. The review button stretched across a grid column. | Airport fields use the same spacing as other controls. The review action sizes to its content on larger screens and fills the available width on small phones.                                                    |
| Dense forms and supplier cards could become cramped before the original mobile breakpoint.                                             | Forms use two columns on tablets and one on small phones. Trip panels and supplier results stack earlier. Card headings use a smaller scale than page headings.                                                   |
| Guide text lengths left source links and actions at different vertical positions.                                                      | Flexible guide cards align their source links and action rows. Button links no longer receive editorial underlines.                                                                                               |
| Scrolling from a dark hero onto a light canvas briefly reduced the translucent navigation's contrast.                                  | The navigation pill keeps a dark surface, uses larger text and 44 px links, and the header uses a shorter colour transition.                                                                                      |
| Fixed thumbnail heights made narrower discovery cards disproportionately image-heavy.                                                  | Thumbnail frames scale with card width while preserving the existing images, dark cards and horizontal browsing.                                                                                                  |
| Footer headings and legal links were small; its mobile email field could trigger browser zoom.                                         | Footer typography is modestly enlarged, content edges align with the shared shell, and mobile email inputs use 16 px text.                                                                                        |
| Weather applied editorial link underlines to Travel's navigation.                                                                      | Underlines are limited to forecast feedback and source-attribution links.                                                                                                                                         |

The existing colour palette, images, routes, content, appearance preferences,
card browsing, application features and backend behavior are preserved.

## Verification

- Frontend TypeScript check passed.
- 125 frontend unit tests passed across 26 test files.
- Seven frontend API-origin and deployment-budget tests passed.
- Production frontend build passed.
- Static route generation and SEO assertions passed for 74 route documents.
- Output remains within the existing 60 MiB total and 6 MiB per-file budgets.
- Vite, deployment and locale guardrails passed.
- Changed source files pass Prettier and `git diff --check`.

Responsive browser verification remains incomplete. The cloud browser cannot
reach the local development server. The repository's existing browser suite
could not start because the required browser executable was absent, and the
official browser download returned an unusable archive. No browser regression
suite is represented as passing.

Before merging, run the existing UI, discovery, appearance, Weather and Travel
browser suites, including Chromium and WebKit Travel journeys. Inspect mobile,
tablet and desktop screenshots in both appearance modes, including German
labels and the active Travel tab after horizontal scrolling.
