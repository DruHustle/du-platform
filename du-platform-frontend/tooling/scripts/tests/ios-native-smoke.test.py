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
        build = next(call for call in self.runner.run.call_args_list if call.args[1] == "build-for-testing")
        self.assertIn("ONLY_ACTIVE_ARCH=YES", build.args[0])
        self.assertEqual(build.args[0][build.args[0].index("-destination") + 1],
                         f"platform=iOS Simulator,id={PHONE_ID},arch={self.runner.report['architecture']}")

    def test_destination_pins_the_observed_host_architecture_and_rejects_unknown_hosts(self):
        for architecture in ("arm64", "x86_64"):
            self.runner.report["architecture"] = architecture
            self.assertEqual(self.runner.destination(TABLET_ID),
                             f"platform=iOS Simulator,id={TABLET_ID},arch={architecture}")
        self.runner.report["architecture"] = "unknown"
        with self.assertRaisesRegex(smoke.SmokeFailure, "Unsupported simulator host"):
            self.runner.destination(PHONE_ID)

    def test_an_unstopped_phone_does_not_start_a_second_simulator(self):
        def capture(args, _label, **_kwargs):
            if "--help" in args:
                return "--path --output-path"
            if "list" in args:
                return json.dumps(inventory())
            if "create" in args:
                return PHONE_ID if args[-2] == PHONE else TABLET_ID
            return "fixture"
        def exercise(device, _test_run):
            device.update(status="failed", error="Original boot timeout")
            return False
        self.runner.capture = Mock(side_effect=capture)
        self.runner.run = Mock(return_value=(0, ""))
        self.runner.set_software_keyboard = Mock()
        self.runner.verify_bundle = Mock(return_value=self.root / "test.xctestrun")
        self.runner.exercise = Mock(side_effect=exercise)
        with patch.dict(smoke.os.environ, ENVIRONMENT), patch.object(smoke.platform, "system", return_value="Darwin"):
            with self.assertRaisesRegex(smoke.SmokeFailure, "Original boot timeout"):
                self.runner.execute()
        self.runner.exercise.assert_called_once()
        self.assertEqual(self.runner.report["devices"][1]["status"], "not-run")

    def test_only_owned_simulators_are_deleted_and_keyboard_value_is_restored(self):
        self.runner.owned = [PHONE_ID, TABLET_ID]
        self.runner.keyboard_changed = True
        self.runner.keyboard_previous = True
        self.runner.run = Mock(return_value=(0, ""))
        self.assertEqual(self.runner.cleanup(), [])
        commands = [call.args[0] for call in self.runner.run.call_args_list]
        self.assertEqual([c for c in commands if "delete" in c],
                         [["xcrun", "simctl", "delete", PHONE_ID], ["xcrun", "simctl", "delete", TABLET_ID]])
        self.assertEqual(commands[0], ["defaults", "write", "com.apple.iphonesimulator", "ConnectHardwareKeyboard", "-bool", "true"])
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

    def test_shutdown_timeout_cannot_skip_owned_delete_or_keyboard_restoration(self):
        def run(args, _label, **_kwargs):
            if args == ["xcrun", "simctl", "shutdown", PHONE_ID]:
                raise subprocess.TimeoutExpired(args, 60)
            return 0, ""
        self.runner.run = Mock(side_effect=run)
        self.runner.owned = [PHONE_ID, TABLET_ID]
        self.runner.keyboard_changed = True
        self.runner.keyboard_previous = False
        errors = self.runner.cleanup()
        self.assertEqual(len(errors), 1)
        commands = [call.args[0] for call in self.runner.run.call_args_list]
        self.assertIn(["xcrun", "simctl", "delete", PHONE_ID], commands)
        self.assertIn(["xcrun", "simctl", "delete", TABLET_ID], commands)
        self.assertEqual(commands[0], ["defaults", "write", "com.apple.iphonesimulator",
                                       "ConnectHardwareKeyboard", "-bool", "false"])

    def test_cleanup_reserves_termination_grace_for_both_owned_deletions(self):
        now = [100.0]
        commands = []
        def run(args, _label, *, timeout, **_kwargs):
            # Model every command consuming its deadline and both 5s kill waits.
            self.assertGreaterEqual(self.runner.deadline - now[0], timeout + 10)
            commands.append(args)
            now[0] += timeout + 10
            raise subprocess.TimeoutExpired(args, timeout)
        self.runner.run = Mock(side_effect=run)
        self.runner.owned = [PHONE_ID, TABLET_ID]
        self.runner.keyboard_changed = True
        self.runner.keyboard_previous = False
        with patch.object(smoke.time, "monotonic", side_effect=lambda: now[0]):
            errors = self.runner.cleanup()
        self.assertEqual(len(errors), 5)
        self.assertEqual(commands[0][0], "defaults")
        self.assertEqual([args[-1] for args in commands if "delete" in args], [PHONE_ID, TABLET_ID])
        self.assertGreaterEqual(self.runner.deadline - now[0], 20)

    def test_device_state_is_for_the_owned_uuid_not_another_shutdown_device(self):
        device = {"family": "iPhone", "udid": PHONE_ID}
        states = {"devices": {RUNTIME: [{"udid": TABLET_ID, "state": "Shutdown"},
                                       {"udid": PHONE_ID, "state": "Booted"}]}}
        self.runner.capture = Mock(return_value=json.dumps(states))
        self.assertEqual(self.runner.device_state(device, "after-failure"), "Booted")
        self.assertEqual(device["observedStates"], [{"phase": "after-failure", "state": "Booted"}])
        states["devices"][RUNTIME].pop()
        self.runner.capture.return_value = json.dumps(states)
        with self.assertRaisesRegex(smoke.SmokeFailure, "owned simulator"):
            self.runner.device_state(device, "after-stop")

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
        self.runner.device_state = Mock(return_value="Shutdown")
        device = {"family": "iPhone", "udid": PHONE_ID}
        self.runner.exercise(device, self.root / "test.xctestrun")
        self.assertEqual(device["status"], "failed")
        self.assertIn("overlaps", device["error"])
        self.runner.capture.assert_not_called()
        self.runner.evidence.assert_called_once_with(device)
        test_calls = [call for call in self.runner.run.call_args_list if call.args[1] == "test-iPhone"]
        self.assertEqual(len(test_calls), 1)
        for repetition_flag in ("-test-iterations", "-test-repetitions", "-retry-tests-on-failure", "-run-tests-until-failure"):
            self.assertNotIn(repetition_flag, test_calls[0].args[0])

    def test_cold_boot_timeout_keeps_primary_error_when_shutdown_also_times_out(self):
        def run(args, label, **kwargs):
            if label in ("ready-iPhone", "stop-iPhone"):
                raise subprocess.TimeoutExpired(args, kwargs["timeout"])
            return 0, ""
        self.runner.run = Mock(side_effect=run)
        self.runner.evidence = Mock()
        self.runner.device_state = Mock(side_effect=["Booted", "Shutdown"])
        device = {"family": "iPhone", "udid": PHONE_ID}
        self.assertTrue(self.runner.exercise(device, self.root / "test.xctestrun"))
        self.assertEqual(device["status"], "failed")
        self.assertIn("bootstatus", device["error"])
        self.assertNotIn("shutdown", device["error"])
        self.assertIn("shutdown", device["shutdownErrors"][0])
        boot_waits = [call for call in self.runner.run.call_args_list if call.args[1] == "ready-iPhone"]
        self.assertEqual(len(boot_waits), 1)
        self.assertEqual(boot_waits[0].kwargs["timeout"], 360)
        self.assertFalse(any(call.args[1] == "test-iPhone" for call in self.runner.run.call_args_list))

    def test_shutdown_without_confirmed_stopped_state_blocks_the_next_device(self):
        self.runner.run = Mock(return_value=(0, ""))
        self.runner.device_state = Mock(return_value="Booted")
        device = {"family": "iPhone", "udid": PHONE_ID, "status": "passed"}
        self.assertFalse(self.runner.stop_device(device))
        self.assertEqual(device["status"], "failed")
        self.assertIn("did not reach Shutdown", device["error"])

    def test_unexpected_evidence_failure_does_not_replace_primary_boot_error(self):
        def run(_args, label, **_kwargs):
            if label == "ready-iPhone":
                raise smoke.SmokeFailure("Original boot failure")
            return 0, ""
        self.runner.run = Mock(side_effect=run)
        self.runner.device_state = Mock(return_value="Shutdown")
        self.runner.evidence = Mock(side_effect=OSError("fixture evidence error"))
        device = {"family": "iPhone", "udid": PHONE_ID}
        self.assertTrue(self.runner.exercise(device, self.root / "test.xctestrun"))
        self.assertEqual(device["error"], "Original boot failure")
        self.assertEqual(device["evidenceErrors"], ["fixture evidence error"])
        self.assertEqual(device["status"], "failed")

    def test_a_successful_command_with_no_tests_still_fails_the_device(self):
        self.runner.run = Mock(return_value=(0, ""))
        self.runner.capture = Mock(return_value=json.dumps({**PASSED, "totalTestCount": 0, "passedTests": 0}))
        self.runner.evidence = Mock()
        self.runner.device_state = Mock(return_value="Shutdown")
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
        self.runner.deadline = started + 1
        with self.assertRaises(subprocess.TimeoutExpired):
            self.runner.run([sys.executable, "-c", "import time; print('boot progress', flush=True); time.sleep(10)"],
                            "timeout", timeout=10)
        self.assertLess(time.monotonic() - started, 4)
        entry = json.loads((self.runner.artifacts / "commands.jsonl").read_text())
        self.assertEqual(entry["errorType"], "TimeoutExpired")
        self.assertEqual(entry["requestedTimeoutSeconds"], 10)
        self.assertLessEqual(entry["timeoutSeconds"], 1)
        self.assertIn("boot progress", (self.runner.artifacts / entry["output"]).read_text())

    def test_exhausted_shared_budget_does_not_start_another_command(self):
        self.runner.deadline = time.monotonic() - 1
        with patch.object(smoke.subprocess, "Popen") as popen:
            with self.assertRaisesRegex(smoke.SmokeFailure, "budget exhausted"):
                self.runner.run(["xcrun", "simctl", "boot", PHONE_ID], "no-budget")
        popen.assert_not_called()
        entry = json.loads((self.runner.artifacts / "commands.jsonl").read_text())
        self.assertEqual(entry["timeoutSeconds"], 0)
        self.assertIsNone(entry["exitCode"])

    def test_process_cleanup_error_does_not_replace_original_timeout(self):
        command = ["fixture-command"]
        process = Mock(pid=12345)
        process.wait.side_effect = subprocess.TimeoutExpired(command, 1)
        process.poll.return_value = None
        with patch.object(smoke.subprocess, "Popen", return_value=process), \
                patch.object(smoke.os, "killpg", side_effect=OSError("fixture kill error")):
            with self.assertRaises(subprocess.TimeoutExpired):
                self.runner.run(command, "termination-failure", timeout=1)
        entry = json.loads((self.runner.artifacts / "commands.jsonl").read_text())
        self.assertEqual(entry["errorType"], "TimeoutExpired")
        self.assertEqual(entry["terminationError"], "fixture kill error")


if __name__ == "__main__":
    unittest.main()
