# iPhone and iPad runtime validation

The separate **iOS Simulator Runtime Validation** workflow supplements the
existing **Native Mobile Validation** workflow. It does not replace the Android
checks, unsigned iOS Debug compilation, native regeneration guard, or mobile
dependency audit.

## What it runs

On the existing standard `macos-26` runner, CocoaPods' `xcodeproj` library adds a
temporary UI-test target and shared scheme to the job's checkout. The committed
Expo-generated native project is unchanged. A Release simulator build embeds
the real JavaScript bundle, so these checks do not rely on Metro or Expo's
developer launcher. Both public endpoint variables use reserved `.invalid`
destinations, with dotenv loading disabled. No production account, message or
form is submitted.

The script reads `simctl` inventory and selects an installed available runtime
with both an observed compatible iPhone and iPad device type. It creates its own
two devices and reports the actual model, runtime, architecture and checked-out
revision. It does not download runtimes or reuse a developer's simulator.

The same semantic XCTest journey runs once on each device:

- Reach Home and visit all five tabs in portrait and landscape.
- Check full tab touch targets of at least 44 points within the app window.
- Type fixture text into the Account and Assistant forms with a real visible
  software keyboard. The single-line Account input and action must remain fully
  inside the visible scroll viewport above the keyboard. The multiline editor
  must remain editable and hittable with at least 44 points of visible editing
  area; its full enabled action must still fit above the keyboard. Typed values,
  screenshots and accessibility trees retain the focused state for manual
  caret/text review. Public XCTest does not expose a reliable iOS caret rectangle,
  so this workflow makes no automated caret-bound assertion.
- Dismiss the keyboard, verify that the tab bar returns, and rotate back to
  portrait. Bounded native scroll gestures may reveal controls; an absent
  keyboard cannot count as evidence of keyboard clearance.

The app's real accessibility labels select elements. No absolute coordinates,
API stubs, form submissions, skipped devices, or whole-test retries are used.
Each device must produce an XCTest summary with exactly one passed smoke test,
zero failed tests and zero skipped tests. A successful build or empty test run
cannot satisfy the runtime check.

## Evidence and bounds

The `ios-native-smoke` artifact retains the inventory, build/test/console logs,
per-device result summaries, final screenshots, and `.xcresult` bundles. The
script verifies the installed `xcresulttool export attachments` interface and
exports the XCTest screenshots, accessibility trees and measured-control JSON
into ordinary files in `iPhone-attachments/` and `iPad-attachments/`, including
failed tests. Those in-app attachments can be inspected without Xcode; the final
`simctl` screenshot may show SpringBoard after app teardown. `report.json`
distinguishes failed, passed and unexecuted devices. Export failures remain failed
checks even when the native assertions passed.

The job remains bounded to 45 minutes. Build-for-testing allows 20 minutes;
each device gets a 150-second boot wait and a six-minute test command. Devices
run sequentially from one build. Cleanup restores the prior hardware-keyboard
preference and shuts down/deletes only the two simulator UUIDs this run created.
Cleanup failures remain failures.

Host regression tests run with:

```sh
python3 du-platform-frontend/tooling/scripts/tests/ios-native-smoke.test.py
```

These host checks verify selection, fixture restrictions, failure handling and
cleanup; they do not establish native runtime success. The Swift target and real
journeys require the hosted Xcode job to pass. This workflow does not establish
physical-device behavior, all iOS versions, larger Dynamic Type settings, iPad
split view, App Store signing, production authentication, or backend readiness. The separate known mobile
dependency audit remains a release limitation until it passes.
