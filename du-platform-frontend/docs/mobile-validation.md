# Native mobile validation

The `Native Mobile Validation` workflow runs when mobile source or its workflow
changes, and can also be started manually. Its jobs are independent:

- **Mobile dependency security** audits the mobile application's own npm
  lockfile, including development dependencies, retains the complete JSON report and fails on moderate-or-higher
  findings. Registry failures also fail the check. It has no exception list.
- **Android native build and launch** checks types and unit tests, compiles an
  x86_64 emulator APK and starts it on a fresh Android emulator. The smoke runner
  checks Home, Travel, Shop, Account and reset-link return navigation using the
  current native accessibility hierarchy. It captures screenshots, UI XML,
  Metro output and logcat; an app AndroidRuntime crash fails the check.
- **iOS native simulator build** compiles the tracked native project using
  CocoaPods and Xcode on macOS 26 with code signing disabled.

The compilation jobs do not depend on the security job, so an unresolved advisory
does not hide compiler results. These mobile checks are separate from the web/API
production deployment dependencies. The existing pipeline now audits the web and
backend manifests separately, in addition to its repository tooling audit.

Build artifacts from this workflow use deliberately invalid test service origins.
They are compiler and development-test artifacts, not a signed customer release.
The Android smoke test submits no forms and does not verify authenticated,
provider or commerce journeys. Reset linking is checked after the development
project opens, as required by Expo's development-client workflow. Cold standalone
links, complete offline flows and signed app/universal links still require
device/release verification. The iOS job verifies compilation only. Neither
workflow publishes an application to a store.

## Dependency remediation reviewed on 2026-11-10

The current candidate keeps Expo 58.0.22, React Native 0.88.1, React 19.3.0 and
the native modules unchanged. It replaces the affected glob/minimatch paths
with exact overrides scoped to their installed consumers:

| Consumer | Scoped replacement |
| --- | --- |
| `@expo/cli@58.1.18` | `glob` 14.0.4 |
| `@expo/fingerprint@0.21.9` | `glob` 14.0.4 and `minimatch` 11.0.5 |
| `@expo/metro-config@58.0.20` | `glob` 14.0.4 |

The upstream patch releases inspected on this date still leave affected paths:
Expo 58.0.23 selects CLI 58.1.19 (`glob` 13) and fingerprint 0.21.9 (`glob` 13
and `minimatch` 10). Metro config 58.0.21 removes its glob dependency, but that
does not repair the other consumers. npm's suggested SDK downgrade does not
preserve this application's SDK/native contract. A local patch retaining an
advisory-affected version would also leave the audit gate unresolved.

These overrides are justified by consumer behavior, rather than audit results
alone. The consumers use glob's async/sync/stream APIs, basename matching and
ignore options, and fingerprint uses `Minimatch.pattern`, `.negate` and `.match`.
They do not use minimatch 11's removed `makeRe`, AST or debug interfaces.
`tests/expoDependencyCompatibility.test.ts` executes the installed Expo consumers
against disposable files: first-match cancellation and empty results, hidden
native template files, excluded vendored workspace trees, Xcode workspace/project
discovery, and fingerprint negation without incorrectly pruning a retained file.
Review and remove each exact-parent override once that consumer ships a compatible
patched dependency. A future Expo version intentionally does not inherit these
overrides silently; the audit and compatibility tests must pass again.

A complete development audit also identified the existing Vitest 3 mocker and
Tinypool advisories. The candidate updates the test runner to the patched Vitest
4.1.12 line, which removes Tinypool, and explicitly retains the existing Vite
7.3.7 and Node type 26.6.6 versions. The tests explicitly include their Node host
types. No existing test assertion or application behavior changes. The relevant
upstream advisories are
[mocker path access](https://github.com/advisories/GHSA-82fw-gwwq-j7x9),
[mocker registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8),
[Tinypool worker options](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and
[Tinypool run options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).
The [Vitest 4 migration requirements](https://v4.vitest.dev/guide/migration.html)
fit the existing Node 22 CI and retained Vite 7 toolchain.

Local type checking and all 84 tests pass (the original 79 plus the five consumer
compatibility cases). Android and iOS JavaScript exports pass, and clean native
generation with the pinned 58.0.31 template produces no tracked native drift.
The complete lockfile audit, including development dependencies, reports zero
findings. The mobile security job now audits that complete graph with the same
moderate-or-higher threshold and failure behavior. These local checks used
Node 24.22.1; the hosted workflows retain Node 22. Hosted compilation and simulator
journeys remain separate acceptance checks; an audit result does not establish
native distribution or store readiness.

## Historical SDK update and findings reviewed on 2026-11-03

The original SDK 57 graph reported 13 affected dependency entries: two high,
nine moderate and two low. This review upgrades to the supported Expo 58.0.22
release with React Native 0.88.1, React 19.3.0 and the matching Expo native modules.
It also applies compatible config 58.0.11 and fingerprint 0.21.9 patches.
The resulting production dependency audit reports **six moderate entries,
zero high, zero critical and zero low**. The moderate-or-higher audit gate still
fails; the upgrade is not presented as a clean security audit.

The remaining entries are Expo, its CLI, fingerprint and Metro config, plus
`glob` and `minimatch`. Parent packages are counted again when affected by a
transitive dependency. The underlying remaining findings are:

| Package in the mobile lockfile | Advisory                                                                 | Published fixed version |
| ------------------------------ | ------------------------------------------------------------------------ | ----------------------- |
| `glob` 13.0.6                  | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | 14.0.2                  |
| `minimatch` 10.2.6             | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | 11.0.1                  |

These paths occur in Expo's development/build dependency graph. This does not
establish exploitability in the shipped React Native runtime, and it does not
make the dependency audit pass.

Registry metadata at that review confirmed CLI 58.1.18 and Metro config 58.0.20 were the latest
releases in their current SDK line. Some supported dependency paths still require
the affected major versions. The remaining automated audit recommendation
includes an old SDK downgrade, which is not a supported remediation for this
application. Overriding individual transitive majors is not a verified compatible
fix.

The SDK update was first checked in an isolated application copy: types, unit
tests, Android and iOS JavaScript exports, and repeatable clean native generation
passed. The pinned native template is 58.0.31. `expo-system-ui` now implements the
declared light appearance. The iOS bundle plugin handles the new template's
existing quotes; a shell fixture with spaces in Node and script paths verifies
the resulting command. Final source verification and hosted compiler results are
recorded in [mobile-review-followup.md](mobile-review-followup.md) and the PR checks.

That earlier review introduced no dependency override or audit suppression and
left native distribution blocked on the remaining findings and native regression
testing. The subsequent scoped remediation is documented above. Web and backend
production dependency audits reported no findings in the earlier review.

To reproduce the mobile security check from the repository root:

```sh
cd du-platform-frontend/mobile
npm audit --package-lock-only --audit-level=moderate
```

Toolchain references:

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/)
- [Expo build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)
- [Expo app-specific development links](https://docs.expo.dev/develop/development-builds/development-workflows/#app-specific-deep-links)
- [GitHub macOS 26 runner](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)
