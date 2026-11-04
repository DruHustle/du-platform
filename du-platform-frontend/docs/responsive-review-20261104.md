# Web, phone and tablet review — 2026-11-04

This follow-up builds on PR #154 and incorporates the independent-application
checks merged into main in `0f56d71e1d303f40ab3ada6d7a746a3150d4894e`.
It preserves the existing web/mobile/backend split and product design.

## Corrections

- Phone Shop users can switch catalogue categories without returning to Home.
  Category changes reset the segment and retain the availability filter.
- Travel keyboard selection keeps the active airport suggestion inside its
  scrollable list, without moving the input or document.
- The floating Onesa dialog follows the visible viewport when a keyboard opens
  or the viewport pans. Close and Send remain reachable on short screens, with
  44px minimum targets. Conversation/status/error content scrolls independently.
- Shared landscape gutters, the mobile basket bar and footer account for safe
  areas. The cookie-consent panel can scroll on short screens.
- Native forms have a centered readable width; Home/Shop/Search use adaptive
  cards on wider windows and return to one column for narrow windows or large
  text. Keyboard insets, safe areas and landscape tab sizing are explicit.
- Native catalogue/search/product requests discard obsolete completions.
  Invalid catalogue data produces a recoverable error. Checkout fields remain
  consistent with the request snapshot while it is being persisted.

## Executed local checks

| Check                                                    | Result                                               |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Web TypeScript and unit tests                            | Passed; 146 tests across 27 files                    |
| Web production build                                     | Passed; 57.82 MiB output, within the existing budget |
| Native TypeScript and unit tests                         | Passed; 75 tests across 8 files                      |
| Android and iOS JavaScript/Hermes exports                | Passed for both platforms                            |
| Application boundary guard and its regressions           | Passed; 10 regressions                               |
| Android smoke-runner parser/geometry/cleanup regressions | Passed; 12 tests                                     |

Existing installed dependencies were reused locally without changing lockfiles.
Hosted CI performs the independent clean installs and native compilation.

## Browser and native verification matrix

The existing browser suites now include compact phone (320×568), phone landscape
(844×320), keyboard-height (390×300), tablet portrait (768px), tablet landscape
(1024×600) and desktop (1440px) coverage where relevant. The assistant suite also
changes VisualViewport height and offset without changing the layout viewport.
These controlled checks use local fixtures, not production orders or emails.

The Android smoke runner retains its phone/navigation/reset-link checks and adds
an 800×1280dp tablet, rotation and 1.8× system text. It checks navigation bounds,
reachable form actions and records screenshots/XML. Emulator display, density,
font and rotation settings are restored even if a check fails.

Execution of the new hosted browser/native cases is pending at this source
checkpoint; the PR's exact-head checks and retained artifacts are the authority
for their final outcome. Bundle exports are not native device tests. Interactive
iOS/iPad keyboard, split-view and signed-link checks still need a simulator or
physical-device acceptance run. Existing Expo dependency-audit findings and
native distribution restrictions remain documented in `mobile-validation.md`.

## Hosting scope

The user has additionally requested Render backends for DU, portfolio and Learning
Hub. That migration is separate from this responsive change. A prepared Blueprint
or a successful frontend preview is not proof of a live backend move. Verify the
Render service revision, data/session continuity, same-origin frontend API path,
active message worker, and production release routing before claiming cutover.
