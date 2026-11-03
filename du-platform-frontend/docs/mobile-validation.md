# Native mobile validation

The `Native Mobile Validation` workflow runs when mobile source or its workflow
changes, and can also be started manually. Its jobs are independent:

- **Mobile dependency security** audits the mobile application's own npm
  lockfile, retains the complete JSON report and fails on moderate-or-higher
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

## Supported SDK update and findings reviewed on 2026-11-03

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

Registry metadata confirms CLI 58.1.18 and Metro config 58.0.20 are the latest
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

No dependency override or audit suppression has been introduced. **Native
distribution remains blocked on supported remediation of the remaining findings
and subsequent native regression testing.** Web and backend production dependency
audits reported no findings in this review.

To reproduce the mobile security check from the repository root:

```sh
cd du-platform-frontend/mobile
npm audit --package-lock-only --omit=dev --audit-level=moderate
```

Toolchain references:

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/)
- [Expo build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)
- [Expo app-specific development links](https://docs.expo.dev/develop/development-builds/development-workflows/#app-specific-deep-links)
- [GitHub macOS 26 runner](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)
