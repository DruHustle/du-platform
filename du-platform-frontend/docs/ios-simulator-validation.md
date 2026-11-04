# iPhone and iPad runtime validation

The separate **iOS Simulator Runtime Validation** workflow supplements the
existing **Native Mobile Validation** workflow. It does not replace the Android
checks, unsigned iOS Debug compilation, native regeneration guard, or mobile
dependency audit.

## What it runs

On the existing standard `macos-26` runner, CocoaPods' `xcodeproj` library adds a
temporary UI-test target and shared scheme to the job's checkout. The committed
Expo-generated native project is unchanged. A Release simulator build embeds
the real JavaScript bundle for the runner's active simulator architecture, so
these checks do not rely on Metro or Expo's developer launcher. Both public
endpoint variables use reserved `.invalid`
destinations, with dotenv loading disabled. No production account, message or
form is submitted.

The runtime build uses Xcode's normal local simulator signature (`-` identity),
following [Apple's simulator signing guidance](https://developer.apple.com/forums/thread/826882).
The script verifies the signature, then reads the generated simulator entitlements
from the actual executable's `__TEXT,__entitlements` section before booting either
device. This follows [SwiftBuild's simulator qualification](https://github.com/swiftlang/swift-build/blob/main/Sources/SwiftBuildTestSupport/CoreQualificationTester.swift):
simulated entitlements are separate from the host macOS signing entitlement
dictionary, which can be empty. The bounded reader requires the expected thin
64-bit architecture, one matching section, and valid file/segment/section bounds;
it saves the exact embedded plist as evidence. The generated `application-identifier` must identify the
expected app bundle; Apple uses it for
[default keychain access](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps).
No sharing group, team identity or provisioning profile is authored by the runner.
Existing app entitlement sources and the separate unsigned Debug compile check
are preserved. Session restoration uses the real SecureStore implementation;
a storage error continues to fail the Account journey.

The script reads `simctl` inventory and selects an installed available runtime
with both an observed compatible iPhone and iPad device type. It creates its own
two devices and reports the actual model, runtime, architecture and checked-out
revision. It does not download runtimes or reuse a developer's simulator.

The same semantic XCTest journey runs once on each device:

- Reach Home and visit all five tabs in portrait and landscape.
- Check full tab touch targets of at least 44 points within the app window.
- Type fixture text into the Account and Assistant forms with a real visible
  software keyboard. The single-line Account input and action must remain fully
  inside the visible scroll viewport above the keyboard, including its observed
  `SystemInputAssistantView` accessory bar. The multiline editor
  must remain editable and hittable with at least 44 points of visible editing
  area; its full enabled action must still fit above the keyboard. Typed values,
  screenshots and accessibility trees retain the focused state for manual
  caret/text review. Public XCTest does not expose a reliable iOS caret rectangle,
  so this workflow makes no automated caret-bound assertion.
- Dismiss the keyboard, verify that the tab bar returns, and rotate back to
  portrait. Bounded native scroll gestures may reveal controls; an absent
  keyboard cannot count as evidence of keyboard clearance.

The app's real accessibility labels select elements. Each form selects the unique
app window and scroll view containing its input, using XCTest's
[descendant query](https://developer.apple.com/documentation/xcuiautomation/xcuielementquery/containing(_:identifier:)).
Bounded content-reveal drags use element-relative points measured inside the visible
content viewport and outside the editor. They cannot start on a keyboard
accessory scroll view or within the multiline editor's own scrolling area.
Intentional keyboard dismissal uses a separate pan that starts in that measured
content gutter and continues toward the observed window's bottom. This matches
iOS's [interactive dismissal](https://developer.apple.com/documentation/uikit/uiscrollview/keyboarddismissmode-swift.enum/interactive),
where the keyboard follows the touch offscreen. Only this dismissal gesture may
cross the keyboard area; content-reveal and keyboard-clearance drags stay above
the entire obstruction. The keyboard must then disappear and the tab targets
must return. Run [41796953321](https://github.com/DruHustle/du-platform/actions/runs/41796953321)
passed portrait Account input and geometry checks on both devices, then showed
content overscroll with a fixed keyboard because the original dismissal path
ended above it. It remains a failed journey, not full device qualification.
No hard-coded screen coordinates, coordinate taps, API stubs, form submissions,
skipped devices, or whole-test retries are used.
Each device must produce an XCTest summary with exactly one passed smoke test,
zero failed tests and zero skipped tests. A successful build or empty test run
cannot satisfy the runtime check.

Fixture entry waits for a visibly settled software keyboard before sending each
character once. Each event must acknowledge the exact text prefix, or the masked
length for a secure field, within a bounded wait. The runner never resends a lost
character or repairs a mismatched value. Final exact-text, masked-length and
geometry assertions remain in place. This synchronizes the real editing journey; it does not qualify
rapid bulk typing. Run [41787512082](https://github.com/DruHustle/du-platform/actions/runs/41787512082)
retained a cold-keyboard transition and a 60-character-per-second bulk event with
missing input, which the original full-value assertion correctly rejected.

The runner recognizes the first-use QuickPath introduction observed in run
[41791909311](https://github.com/DruHustle/du-platform/actions/runs/41791909311).
Its exact `UIContinuousPathIntroductionView` identifier, instruction text and
descendant `Continue` button must all match. It records the visible prompt,
dismisses it once, requires its disappearance, and records the resulting state.
Acknowledging this observed introduction permits a second field tap before typing;
no text event is replayed. Tutorial evidence and acknowledgment occur outside
the keyboard-settling wait, which starts fresh after that one interruption;
the overall test and job deadlines remain unchanged. A recurring introduction remains
a failure. The same run retained exact email input but exposed a gesture aimed
at the keyboard's accessory scroll view; form-scoped selection and measured
viewport drags correct that harness path without changing app behavior.

One optional password-saving prompt is anticipated after each of the two
Account visits. In run [41802097647](https://github.com/DruHustle/du-platform/actions/runs/41802097647),
the native `Save Password?` sheet/alert appeared after navigating to Assistant;
the iPad had already acknowledged `A simulato` before the prompt hid its keyboard.
The handler requires the exact observed title, description and its own `Not Now`
and `Save` buttons. It chooses only `Not Now`, records both states and verifies
that the input is unchanged. That allowance ends with the orientation's Assistant
phase; an unknown prompt or a repeated password prompt fails.

Before a character is sent, an observed password prompt must preserve the prior
acknowledged prefix. If it arrives after the event was sent, the exact new value
must still be acknowledged before continuing. A missing event fails; it is never
resent or repaired. Only an observed known prompt permits refocusing the field.
Prompt capture and acknowledgment occur outside the bounded input/keyboard
waits, while the overall test and job deadlines remain unchanged.

Run [41809310414](https://github.com/DruHustle/du-platform/actions/runs/41809310414)
retained the iPad's exact `A simu` prefix while the keyboard disappeared before
the password prompt appeared. XCTest failed between separate keyboard existence
and frame queries. Keyboard and accessory measurements now come from one public
[application snapshot](https://developer.apple.com/documentation/xcuiautomation/xcuielementsnapshotproviding/snapshot()),
including its window and descendant frames. An unreadable snapshot fails the
test; it cannot count as a closed keyboard. The final clearance check and its
`keyboardObservation` JSON use that same measurement, while application controls
still require their actual enabled and hittable states.

Every sent character still has three seconds to acknowledge its exact new value
or secure-field length. If the keyboard disappears, only an already-authorized
Account phase can then wait up to ten seconds for the exact password prompt.
This separate OS transition allowance cannot rescue a missing character. The
handler must preserve that acknowledged value, and the real software keyboard
must return before another input event or the final clearance check. No input
event, test or device journey is retried, and the overall deadlines are unchanged.

## Evidence and bounds

The `ios-native-smoke` artifact retains the inventory, signature/entitlement
output, build/test/console logs, app-specific simulator security diagnostics,
per-device result summaries, final screenshots, and `.xcresult` bundles. The
script verifies the installed `xcresulttool export attachments` interface and
exports the XCTest screenshots, accessibility trees and measured-control JSON
into ordinary files in `iPhone-attachments/` and `iPad-attachments/`, including
failed tests. Those in-app attachments can be inspected without Xcode; the final
`simctl` screenshot may show SpringBoard after app teardown. `report.json`
distinguishes failed, passed and unexecuted devices. Export failures remain failed
checks even when the native assertions passed.

The temporary test action retains system attachments on success as well as
failure, following [Apple's recording-retention guidance](https://developer.apple.com/videos/play/wwdc2025/344/).
Export validation requires the expected test, the owned simulator UUID,
nonempty local attachment payloads and a manifest-labelled screen recording.
The runner rejects an attachment-error placeholder, then uses the installed
AVFoundation framework to require a positive-duration video track and an actually
decoded frame. Only that validated recording is reported as usable evidence.
This is necessary because run 41802097647 exported a pending-attachment error as
the iPhone's purported recording despite a successful export command. The
validation does not claim that every frame is intact or that a decoded frame
proves keyboard clearance; the actual journey still needs visual review.

Inspect the exported screen recording when a still image omits secure input.
Apple documents that [secure fields hide their dots in iOS screenshots](https://developer.apple.com/documentation/swiftui/securefield).
In run 41796953321, the XCTest still images omitted both the password dots and
keyboard, while the corresponding recording showed the 16 masked characters,
caret, full keyboard/accessory and Sign in action. That observed difference is
not evidence of lost input or a dismissed keyboard. The recording and measured
accessibility state must agree before accepting visual keyboard clearance; the
workflow does not disable secure-entry protections to obtain a screenshot.

The job remains bounded to 45 minutes. All build, device and evidence commands
share a 35-minute execution budget, leaving room for dependency setup, cleanup
and artifact upload. Within that budget, build-for-testing allows 20 minutes;
each device gets one six-minute cold-boot wait and a ten-minute `xcodebuild`
test command. That command includes simulator test-runner launch and result
finalization. The actual XCTest journey retains its 240-second default and
300-second maximum test allowance. In run
[41779981845](https://github.com/DruHustle/du-platform/actions/runs/41779981845),
iPad test launch took about 193 seconds, the failing journey took 107 seconds,
and the earlier six-minute command deadline interrupted result finalization.
Fresh iOS 26.5 data migration exceeded the earlier 150-second wait while still
progressing in run [41774274359](https://github.com/DruHustle/du-platform/actions/runs/41774274359).
The timeout journal retains the command, elapsed time, original error and the
complete output log, including failures during process termination.

Devices run sequentially from one build. A failed boot records the simulator
state and remains a failure. Before starting the next device, the runner must
confirm that the previous owned simulator has shut down. Secondary shutdown or
evidence errors do not replace the primary boot/test error. Final cleanup has
its own three-minute budget, attempts shutdown and deletion independently for
only the two UUIDs this run created, and restores the prior hardware-keyboard
preference. Cleanup failures remain failures. No device or whole-test retry is
used.

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
