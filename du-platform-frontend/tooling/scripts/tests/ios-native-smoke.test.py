"""Host-only guards. These tests never claim to execute an iOS simulator."""

import importlib.util
import json
from pathlib import Path
import plistlib
import subprocess
import sys
from tempfile import TemporaryDirectory
import time
import unittest
from unittest.mock import Mock, patch


SPEC = importlib.util.spec_from_file_location("ios_smoke", Path(__file__).with_name("ios-native-smoke.py"))
smoke = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smoke)

ENVIRONMENT = {"EXPO_PUBLIC_API_URL": "https://api.example.invalid/api",
               "EXPO_PUBLIC_WEB_URL": "https://www.example.invalid", "EXPO_NO_DOTENV": "1"}
RUNTIME = "com.apple.CoreSimulator.SimRuntime.iOS-26-0"
PHONE = "com.apple.CoreSimulator.SimDeviceType.iPhone-16e"
TABLET = "com.apple.CoreSimulator.SimDeviceType.iPad-mini-A17-Pro"
PASSED = {"totalTestCount": 1, "passedTests": 1, "failedTests": 0, "skippedTests": 0}
PHONE_ID = "11111111-1111-1111-1111-111111111111"
TABLET_ID = "22222222-2222-2222-2222-222222222222"


def inventory():
    return {"runtimes": [{"identifier": RUNTIME, "version": "26.0", "isAvailable": True}],
            "devicetypes": [{"identifier": PHONE, "name": "iPhone 16e", "productFamily": "iPhone"},
                            {"identifier": TABLET, "name": "iPad mini (A17 Pro)", "productFamily": "iPad"}],
            "devices": {RUNTIME: [{"deviceTypeIdentifier": PHONE, "isAvailable": True},
                                  {"deviceTypeIdentifier": TABLET, "isAvailable": True}]}}


class SelectionTests(unittest.TestCase):
    def test_uses_observed_compatible_phone_and_tablet_on_same_runtime(self):
        devices = smoke.select_devices(inventory())
        self.assertEqual([d["family"] for d in devices], ["iPhone", "iPad"])
        self.assertEqual({d["runtime"] for d in devices}, {RUNTIME})

    def test_newer_runtime_without_tablet_does_not_silently_drop_tablet(self):
        data = inventory()
        newer = "com.apple.CoreSimulator.SimRuntime.iOS-27-0"
        data["runtimes"].append({"identifier": newer, "version": "27.0", "isAvailable": True})
        data["devices"][newer] = [{"deviceTypeIdentifier": PHONE, "isAvailable": True}]
        self.assertEqual({d["runtime"] for d in smoke.select_devices(data)}, {RUNTIME})

    def test_unavailable_runtime_or_device_fails_without_downloading_or_skipping(self):
        for category in ("runtime", "device"):
            with self.subTest(category=category):
                data = inventory()
                if category == "runtime":
                    data["runtimes"][0]["isAvailable"] = False
                else:
                    data["devices"][RUNTIME][1]["isAvailable"] = False
                with self.assertRaisesRegex(smoke.SmokeFailure, "iPhone and iPad"):
                    smoke.select_devices(data)

    def test_device_name_alone_cannot_substitute_for_a_verified_device_type(self):
        data = inventory()
        data["devices"][RUNTIME][1] = {"name": "iPad", "deviceTypeIdentifier": "unobserved", "isAvailable": True}
        with self.assertRaises(smoke.SmokeFailure):
            smoke.select_devices(data)


class ValidationTests(unittest.TestCase):
    def test_real_origin_userinfo_and_dotenv_cannot_enter_fixture_build(self):
        smoke.validate_environment(ENVIRONMENT)
        for overrides in ({"EXPO_PUBLIC_API_URL": "https://api.diasporaunlocked.com/api"},
                          {"EXPO_PUBLIC_WEB_URL": "https://example.invalid.attacker.test"},
                          {"EXPO_PUBLIC_API_URL": "https://secret@api.example.invalid/api"},
                          {"EXPO_PUBLIC_API_URL": "http://api.example.invalid/api"},
                          {"EXPO_NO_DOTENV": "0"}):
            with self.subTest(overrides=overrides), self.assertRaises(smoke.SmokeFailure):
                smoke.validate_environment({**ENVIRONMENT, **overrides})

    def test_zero_tests_skip_failure_or_unknown_summary_cannot_pass(self):
        smoke.validate_test_summary(PASSED)
        for change in ({"totalTestCount": 0, "passedTests": 0}, {"skippedTests": 1},
                       {"failedTests": 1}, {"passedTests": True}, {"totalTestCount": "1"}):
            with self.subTest(change=change), self.assertRaises(smoke.SmokeFailure):
                smoke.validate_test_summary({**PASSED, **change})
        with self.assertRaises(smoke.SmokeFailure):
            smoke.validate_test_summary({})


class RunnerTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.runner = smoke.IOSSmoke(self.root, self.root / "derived", self.root / "artifacts")

    def test_unsafe_environment_stops_before_any_native_command(self):
        self.runner.run = Mock()
        with patch.dict(smoke.os.environ, {**ENVIRONMENT, "EXPO_PUBLIC_API_URL": "https://production.test/api"}):
            with self.assertRaisesRegex(smoke.SmokeFailure, "isolated"):
                self.runner.execute()
        self.runner.run.assert_not_called()

    def test_a_phone_failure_is_not_hidden_by_a_passing_tablet(self):
        def capture(args, _label, **_kwargs):
            if args[:2] == ["git", "rev-parse"]:
                return "fixture-revision"
            if args[:2] == ["xcodebuild", "-version"]:
                return "Xcode fixture"
            if "--help" in args:
                return "--path <path> --output-path <output-path>"
            if "list" in args:
                return json.dumps(inventory())
            return PHONE_ID if args[-2] == PHONE else TABLET_ID
        def exercise(device, _test_run):
            device["status"] = "failed" if device["family"] == "iPhone" else "passed"
        self.runner.capture = Mock(side_effect=capture)
        self.runner.run = Mock(return_value=(0, ""))
        self.runner.set_software_keyboard = Mock()
        self.runner.verify_bundle = Mock(return_value=self.root / "test.xctestrun")
        self.runner.exercise = Mock(side_effect=exercise)
        with patch.dict(smoke.os.environ, ENVIRONMENT), patch.object(smoke.platform, "system", return_value="Darwin"):
            with self.assertRaisesRegex(smoke.SmokeFailure, "Both iPhone and iPad"):
                self.runner.execute()
        self.assertEqual(self.runner.exercise.call_count, 2)
        self.assertEqual(self.runner.owned, [PHONE_ID, TABLET_ID])

    def test_only_owned_simulators_are_deleted_and_keyboard_value_is_restored(self):
        self.runner.owned = [PHONE_ID, TABLET_ID]
        self.runner.keyboard_changed = True
        self.runner.keyboard_previous = True
        self.runner.run = Mock(return_value=(0, ""))
        self.assertEqual(self.runner.cleanup(), [])
        commands = [call.args[0] for call in self.runner.run.call_args_list]
        self.assertEqual([c for c in commands if "delete" in c],
                         [["xcrun", "simctl", "delete", PHONE_ID], ["xcrun", "simctl", "delete", TABLET_ID]])
        self.assertEqual(commands[-1], ["defaults", "write", "com.apple.iphonesimulator", "ConnectHardwareKeyboard", "-bool", "true"])
        self.assertFalse(any("all" in c for c in commands))

    def test_absent_keyboard_preference_is_removed_instead_of_creating_a_new_default(self):
        self.runner.run = Mock(side_effect=[(1, "The domain/default pair does not exist"), (0, ""), (0, "")])
        self.runner.set_software_keyboard()
        self.assertEqual(self.runner.cleanup(), [])
        self.assertEqual(self.runner.run.call_args.args[0],
                         ["defaults", "delete", "com.apple.iphonesimulator", "ConnectHardwareKeyboard"])

    def test_unknown_keyboard_read_failure_does_not_mutate_preferences(self):
        self.runner.run = Mock(return_value=(1, "Permission denied"))
        with self.assertRaisesRegex(smoke.SmokeFailure, "safely read"):
            self.runner.set_software_keyboard()
        self.assertFalse(self.runner.keyboard_changed)
        self.assertEqual(self.runner.run.call_count, 1)

    def test_cleanup_failure_is_reported_and_does_not_skip_other_owned_devices(self):
        def run(args, _label, **_kwargs):
            if args == ["xcrun", "simctl", "delete", PHONE_ID]:
                raise smoke.SmokeFailure("delete failed")
            return 0, ""
        self.runner.run = Mock(side_effect=run)
        self.runner.owned = [PHONE_ID, TABLET_ID]
        self.assertEqual(self.runner.cleanup(), ["delete failed"])
        self.assertTrue(any(call.args[0] == ["xcrun", "simctl", "delete", TABLET_ID]
                            for call in self.runner.run.call_args_list))

    def test_non_fixture_or_device_bundle_is_rejected_before_launch(self):
        bundle = self.runner.derived / "Build/Products/Release-iphonesimulator/DiasporaUnlocked.app"
        bundle.mkdir(parents=True)
        info = {"CFBundleIdentifier": "com.diasporaunlocked.app", "CFBundleSupportedPlatforms": ["iPhoneSimulator"]}
        (bundle / "Info.plist").write_bytes(plistlib.dumps(info))
        (bundle / "main.jsbundle").write_bytes(b"api.example.invalid")
        test_run = bundle.parent.parent / "DUNativeSmoke_iphonesimulator.xctestrun"
        test_run.write_bytes(b"fixture")
        self.assertEqual(self.runner.verify_bundle(), test_run)
        (bundle / "main.jsbundle").write_bytes(b"api.production.test")
        with self.assertRaisesRegex(smoke.SmokeFailure, "isolated API"):
            self.runner.verify_bundle()
        (bundle / "main.jsbundle").write_bytes(b"api.example.invalid")
        info["CFBundleSupportedPlatforms"] = ["iPhoneOS"]
        (bundle / "Info.plist").write_bytes(plistlib.dumps(info))
        with self.assertRaisesRegex(smoke.SmokeFailure, "simulator application"):
            self.runner.verify_bundle()

    def test_native_test_failure_is_not_retried_or_replaced_by_summary_success(self):
        def run(_args, label, **_kwargs):
            if label == "test-iPhone":
                raise smoke.SmokeFailure("Keyboard overlaps action")
            return 0, ""
        self.runner.run = Mock(side_effect=run)
        self.runner.capture = Mock(return_value=json.dumps(PASSED))
        self.runner.evidence = Mock()
        device = {"family": "iPhone", "udid": PHONE_ID}
        self.runner.exercise(device, self.root / "test.xctestrun")
        self.assertEqual(device["status"], "failed")
        self.assertIn("overlaps", device["error"])
        self.runner.capture.assert_not_called()
        self.runner.evidence.assert_called_once_with(device)
        self.assertEqual(sum(call.args[1] == "test-iPhone" for call in self.runner.run.call_args_list), 1)

    def test_a_successful_command_with_no_tests_still_fails_the_device(self):
        self.runner.run = Mock(return_value=(0, ""))
        self.runner.capture = Mock(return_value=json.dumps({**PASSED, "totalTestCount": 0, "passedTests": 0}))
        self.runner.evidence = Mock()
        device = {"family": "iPad", "udid": TABLET_ID}
        self.runner.exercise(device, self.root / "test.xctestrun")
        self.assertEqual(device["status"], "failed")

    def test_attachments_are_exported_on_native_failure_for_review_without_xcode(self):
        result = self.runner.artifacts / "iPhone.xcresult"
        result.mkdir()
        self.runner.run = Mock(return_value=(0, ""))
        device = {"family": "iPhone", "udid": PHONE_ID, "status": "failed"}
        self.runner.evidence(device)
        command = self.runner.run.call_args_list[0].args[0]
        self.assertEqual(command[:4], ["xcrun", "xcresulttool", "export", "attachments"])
        self.assertIn(str(result), command)
        self.assertIn(str(self.runner.artifacts / "iPhone-attachments"), command)
        self.assertNotIn("--only-failures", command)

    def test_attachment_export_failure_cannot_leave_a_successful_report(self):
        (self.runner.artifacts / "iPad.xcresult").mkdir()
        self.runner.run = Mock(side_effect=[smoke.SmokeFailure("export failed"), (0, ""), (0, "")])
        device = {"family": "iPad", "udid": TABLET_ID, "status": "passed"}
        self.runner.evidence(device)
        self.assertEqual(device["status"], "failed")
        self.assertEqual(device["evidenceErrors"], ["export failed"])

    def test_subprocess_deadline_terminates_its_owned_process_group(self):
        started = time.monotonic()
        with self.assertRaises(subprocess.TimeoutExpired):
            self.runner.run([sys.executable, "-c", "import time; time.sleep(10)"], "timeout", timeout=0.1)
        self.assertLess(time.monotonic() - started, 3)


if __name__ == "__main__":
    unittest.main()
