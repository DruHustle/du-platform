# Web and mobile review follow-up

Review date: 3 November 2026. Starting revision:
`79bdc6473650a11cbcc4e257f736041bebaea648` (merged PR #152).
The final branch also incorporates the setup handover from PR #153 at
`b8db7c6d7c330cbbe1b191e3421e80f916ef13b6`; its developer instructions and earlier
device observations are preserved.

## Scope and checklist

This review checks the independent applications, customer-facing web and native
flows, session transitions, saved Travel searches, links, transport failures and
the verification gaps recorded by the original migration. It preserves the
existing shop readiness restrictions and does not enable purchases or publish
mobile applications to a store.

| Area                       | Finding / action                                                                                                 | Verification status                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Application boundaries     | Web, mobile and backend have independent manifests, lockfiles and source boundaries.                             | Architecture guard and its four regression tests passed.                                                                                       |
| Web session transitions    | A late refresh could restore an old token after logout or overwrite a newer account, including a queued retry.   | Failures reproduced; generation checks and transport-level regression tests passed.                                                            |
| Web saved trips            | A valid HttpOnly session was ignored when the optional browser login marker was missing.                         | Session lookup corrected; controlled Travel regression added.                                                                                  |
| Airport suggestions        | Selecting on pointer-down consumed the start of a scroll gesture.                                                | Selection moved to completed activation; touch-cancel regression added.                                                                        |
| Directory fallback         | Generic request errors could hide the notice identifying bundled directory records.                              | Explicit data-origin notice and retry added.                                                                                                   |
| Native saved searches      | Loading a saved stay or multi-traveller search could silently change its category or criteria.                   | Native restoration and faithful website handoffs implemented and unit tested.                                                                  |
| Native stale requests      | Results for old form values could replace a more recent Travel search.                                           | Cancellation and generation guards implemented and unit tested.                                                                                |
| Native reset links         | A cold-start reset link could leave no route back to Account.                                                    | Main-stack fallback, token invalidation and explicit sign-in/recovery actions implemented and unit tested.                                     |
| Native links               | Claimed shop links could be unmatched or lose query context.                                                     | Supported links and intact website handoffs verified using the installed navigation parser.                                                    |
| Native API transport       | The timeout ended before the JSON body completed; invalid success bodies could become null.                      | Body timeout and malformed-response regressions passed.                                                                                        |
| Native session transitions | An old authorized request could retry after an account change using the new account's token.                     | Session-generation guards reject stale retries and responses; storage ordering and late-write regressions passed.                              |
| Native private storage     | Shorter replacements left secure chunks behind; failed parallel reads could release the storage queue too early. | Old chunks are removed, cleanup settles before subsequent writes, and independent fixtures reproduced then verified both fixes.                |
| Native order status        | A previous order's quote or pending command could appear under a new order's heading.                            | Snapshots and actions are bound to the current order; late completions preserve another order's command.                                       |
| Native assistant           | Conversation history and pending replies survived account changes.                                               | History/drafts reset and obsolete replies are invalidated.                                                                                     |
| Dependency checks          | Existing CI audited integration tooling only.                                                                    | Web/backend application audits added; native audit reports its own unresolved findings.                                                        |
| Supported mobile SDK       | SDK 57 had high and moderate dependency findings and an incomplete light-appearance configuration.               | SDK 58 and compatible patches remove high/low findings; six moderate entries remain. Native generation and exports passed.                     |
| Native compilation         | JavaScript export was the only automated mobile build check.                                                     | Android/iOS compilation and Android navigation/reset-link smoke checks added; hosted execution pending.                                        |
| API contracts              | Original OpenAPI tests checked scheme/path references only.                                                      | 93 operations inventoried; 41 have concrete schemas and 52 explicitly remain route inventory. Runtime HTTP and storage-response checks passed. |

## Evidence recorded so far

- Repository-pinned pnpm 10.4.1 installs were used for web, backend and tooling;
  mobile uses `npm ci` against its own lockfile. An initial newer-pnpm attempt
  generated incompatible local dependency artifacts; those were discarded before
  the clean pinned installation. Web/backend lockfiles remain unchanged; the
  mobile lockfile records the supported SDK update and compatible patches.
- Backend type check and production build passed. Local backend tests: 345 passed,
  94 database-dependent tests skipped because this environment has no disposable
  MySQL service. Database coverage must be reported separately from this result.
- Live read-only verification passed 61 canonical public pages, private noindex
  pages, real 404s, redirects, robots, API routing and 48 deployed JavaScript chunks.
- The live API reports the starting revision above. `/api/travel/capabilities`
  returns 24 locations; anonymous `/api/auth/me` returns JSON with status 401.
- Connected-browser inspection covered Home, Travel search details, menu opening
  and closing, Shop and product details. At a 320px viewport, Shop had no document
  overflow and its six primary navigation controls were 44px high. These are web
  checks, not native device tests.
- Web type checking, all 146 unit tests and the production build passed. The
  deployment-size check reported 57.82 MiB across 220 files, within the existing
  budgets. Controlled Travel cases include touch-enabled 375px browser contexts,
  real option taps, canceled pointer gestures, keyboard selection and a restored
  cookie session without the optional browser-storage marker.
- The final native source passed type checking, 66 unit tests across eight files
  and both Android and iOS JavaScript/Hermes exports against SDK 58 and the final
  React type alignment. These exports are not native binaries.
- All three applications installed and built in isolated temporary directories
  without either sibling application source tree. The architecture guard also
  passed on the revised source.
- Eleven Oracle/Vercel deployment-safety regressions passed.
- Local controlled Chromium/WebKit execution was blocked by unsuccessful browser
  downloads and unavailable OS dependency installation. These suites remain in
  the hosted pipeline; live connected-browser observations above are separate.

## Limits and release status

Native application signing, Apple/Android domain association and store publication
are not established by a successful JavaScript or simulator build. This Linux
environment has no Xcode, Android SDK or device emulator. The native CI workflow
collects compiler evidence independently of the mobile dependency audit.

The supported SDK upgrade and patches reduced the mobile production dependency
graph from 13 affected entries (2 high, 9 moderate, 2 low) to six moderate entries
in upstream Expo tooling, with no high or low entries. The moderate-or-higher
audit gate remains failed. See [mobile-validation.md](mobile-validation.md) for
the evidence and official advisory references. Native distribution remains
blocked on supported remediation and device/release verification; no incompatible
override or audit suppression was applied.

The earlier four before/after screenshot pairs have identical Git blob hashes.
They are baseline images, not evidence of a visible redesign. This follow-up
records observed behavior and executed checks without claiming an image change.

The PR checks and review summary record the final hosted CI outcome separately
from these local results. A failed audit, skipped database suite, successful
JavaScript export and successful native compiler run are distinct results.
