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
- Android measures the overlap between the outer screen view and the software
  keyboard, reserving only that space. A window already resized above the
  keyboard receives no additional inset. Scrolling keeps the Android keyboard
  open so a focused field and its action can remain reachable together; iOS
  retains native automatic keyboard insets.
- Native catalogue/search/product requests discard obsolete completions.
  Invalid catalogue data produces a recoverable error. Checkout fields remain
  consistent with the request snapshot while it is being persisted.

## Executed local checks

| Check                                                    | Result                                               |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Web TypeScript and unit tests                            | Passed; 146 tests across 27 files                    |
| Web production build                                     | Passed; 57.82 MiB output, within the existing budget |
| Native TypeScript and unit tests                         | Passed; 79 tests across 9 files                      |
| Android and iOS JavaScript/Hermes exports                | Passed for both platforms                            |
| Application boundary guard and its regressions           | Passed; 10 regressions                               |
| Android smoke-runner parser/geometry/cleanup regressions | Passed; 34 tests                                     |

Existing installed dependencies were reused locally without changing lockfiles.
Hosted CI performs the independent clean installs and native compilation.

## Browser and native verification matrix

The existing browser suites now include compact phone (320×568), phone landscape
(844×320), keyboard-height (390×300), tablet portrait (768px), tablet landscape
(1024×600) and desktop (1440px) coverage where relevant. The assistant suite also
changes VisualViewport height and offset without changing the layout viewport.
These controlled checks use local fixtures, not production orders or emails.

The PR's exact-head browser checks and retained artifacts record the executed
browser results. The Android runtime evidence below is from a real emulator
journey, separate from the JavaScript bundle exports.

### Executed Android runtime evidence

[Native Mobile Validation run 41769955061](https://github.com/DruHustle/du-platform/actions/runs/41769955061)
tested revision `e7342c139da8601f33b14b560ad7b1da2553e4bf`. Its Android build and
runtime job passed on the API 36 emulator with **59 checkpoints and 60 screenshots**
in 352.97 seconds of smoke-runner execution. The `android-native-smoke` artifact
contains `result.json`, PNG/XML captures, measured keyboard/window bounds and
the settings-restoration report.

| Configuration | Recorded display | Text scale | Passed checkpoints |
| --- | --- | --- | --- |
| Phone portrait | 1440×3120px, 560dpi | 1.0× | 15 |
| Tablet portrait | 1200×1920px, 240dpi (800×1280dp) | 1.0× | 13 |
| Tablet landscape | 1920×1200px, 240dpi (1280×800dp) | 1.0× | 13 |
| Tablet landscape with large text | 1920×1200px, 240dpi (1280×800dp) | 1.8× | 18 |

The journey covers all five tab screens, the Assistant composer and contact
action, warm reset-link navigation, reachable Travel/Account forms and actions,
and navigation targets of at least 44dp. Two cases focus and type into real
native inputs with the software keyboard visibly open:

- Phone Account: the email input retains its exact fixture value and focus,
  and the complete Sign in target is above the keyboard.
- Large-text landscape tablet Assistant: the composer retains its exact fixture
  value and focus during one scroll. The full enabled Send target ends at
  pixel 719, above the observed keyboard top at pixel 720. The retained
  `10-tablet-large-text-assistant-keyboard-action.png` and matching XML show
  the visible keyboard and reachable action together.

The runner never submits an account form or message and uses isolated `.invalid`
API/web origins. Both keyboard closures restore the tab bar. Display, density,
font, rotation and `show_ime_with_hard_keyboard` settings were restored with no
cleanup errors.

The same run passed unsigned iOS simulator compilation. Interactive iPhone/iPad
runtime, split view, physical devices, authenticated/provider/commerce journeys
and signed cold-link behavior are outside this recorded Android evidence.
The dependency audit still reports six moderate findings, with zero high or
critical findings; the existing native distribution gate remains blocked.
See `mobile-validation.md` for the dependency and release restrictions.

## Hosting scope

The user has additionally requested Render backends for DU, portfolio and Learning
Hub. That migration is separate from this responsive change. A prepared Blueprint
or a successful frontend preview is not proof of a live backend move. Verify the
Render service revision, data/session continuity, same-origin frontend API path,
active message worker, and production release routing before claiming cutover.
