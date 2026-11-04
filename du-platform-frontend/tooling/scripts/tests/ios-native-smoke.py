#!/usr/bin/env python3
"""Bounded real-app XCTest runs on one freshly owned iPhone and iPad simulator."""

import argparse
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shlex
import signal
import subprocess
import time
from urllib.parse import urlparse
from uuid import UUID


class SmokeFailure(RuntimeError):
    pass


def validate_environment(environment):
    for name in ("EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_WEB_URL"):
        url = urlparse(environment.get(name, ""))
        if (url.scheme != "https" or not (url.hostname or "").endswith(".invalid")
                or url.username or url.password or url.query or url.fragment):
            raise SmokeFailure(f"{name} must use an isolated HTTPS .invalid origin")
    if environment.get("EXPO_NO_DOTENV") != "1":
        raise SmokeFailure("EXPO_NO_DOTENV=1 is required before building the fixture bundle")


def select_devices(inventory):
    """Use observed available device/runtime pairs; never download a runtime."""
    types = {item["identifier"]: item for item in inventory.get("devicetypes", [])}
    runtimes = [item for item in inventory.get("runtimes", [])
                if item.get("isAvailable") is True
                and item.get("identifier", "").startswith("com.apple.CoreSimulator.SimRuntime.iOS-")]
    runtimes.sort(key=lambda item: tuple(int(n) for n in re.findall(r"\d+", item.get("version", ""))), reverse=True)
    for runtime in runtimes:
        families = {"iPhone": [], "iPad": []}
        for device in inventory.get("devices", {}).get(runtime["identifier"], []):
            kind = types.get(device.get("deviceTypeIdentifier"), {})
            family = kind.get("productFamily")
            if device.get("isAvailable") is True and family in families:
                families[family].append(kind)
        if not all(families.values()):
            continue
        # Prefer compact/non-Max models among installed compatible devices.
        # The report names the actual model; this is not a claim to cover every size.
        def order(kind):
            name = kind.get("name", "")
            compact = "SE (" in name or "mini" in name.lower()
            large = any(word in name for word in ("Max", "Plus", "13-inch", "12.9"))
            return (not compact, large, name)
        return [{"family": family, "deviceType": sorted(candidates, key=order)[0]["identifier"],
                 "model": sorted(candidates, key=order)[0]["name"],
                 "runtime": runtime["identifier"], "runtimeVersion": runtime["version"]}
                for family, candidates in families.items()]
    raise SmokeFailure("No installed available iOS runtime has observed compatible iPhone and iPad devices")


def validate_test_summary(summary):
    expected = {"totalTestCount": 1, "passedTests": 1, "failedTests": 0, "skippedTests": 0}
    if any(type(summary.get(key)) is not int or summary[key] != value for key, value in expected.items()):
        raise SmokeFailure("XCTest must report exactly one passed, zero failed and zero skipped smoke test per device")


class IOSSmoke:
    def __init__(self, mobile_dir, derived_data, artifacts):
        self.mobile = Path(mobile_dir).resolve()
        self.derived = Path(derived_data).resolve()
        self.artifacts = Path(artifacts).resolve()
        self.artifacts.mkdir(parents=True, exist_ok=True)
        self.owned = []
        self.keyboard_changed = False
        self.keyboard_previous = None
        self.command_number = 0
        self.report = {"status": "running", "architecture": platform.machine(), "devices": []}

    def run(self, args, label, timeout=30, check=True, capture=False):
        self.command_number += 1
        output_path = self.artifacts / f"{self.command_number:02d}-{label}.log"
        print(f"[{label}] {shlex.join(map(str, args))}", flush=True)
        started = time.monotonic()
        with output_path.open("w") as output:
            process = subprocess.Popen(list(map(str, args)), cwd=self.mobile, stdout=output,
                                       stderr=subprocess.STDOUT, start_new_session=True)
            try:
                code = process.wait(timeout=timeout)
            except BaseException:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)
                raise
        with (self.artifacts / "commands.jsonl").open("a") as log:
            log.write(json.dumps({"command": list(map(str, args)), "exitCode": code,
                                  "elapsedSeconds": round(time.monotonic() - started, 2),
                                  "output": output_path.name}) + "\n")
        if check and code:
            with output_path.open("rb") as output:
                output.seek(max(0, output_path.stat().st_size - 6000))
                tail = output.read().decode(errors="replace")
            raise SmokeFailure(f"{label} exited {code}; see {output_path.name}\n{tail}")
        if capture and output_path.stat().st_size > 2_000_000:
            raise SmokeFailure(f"Unexpectedly large structured output from {label}")
        return code, output_path.read_text() if capture else ""

    def capture(self, args, label, timeout=30):
        return self.run(args, label, timeout=timeout, capture=True)[1]

    def set_software_keyboard(self):
        command = ["defaults", "read", "com.apple.iphonesimulator", "ConnectHardwareKeyboard"]
        code, previous = self.run(command, "keyboard-preference", check=False, capture=True)
        if code:
            if "does not exist" not in previous:
                raise SmokeFailure("Could not safely read the existing simulator keyboard preference")
            self.keyboard_previous = None
        elif previous.strip() in ("0", "1"):
            self.keyboard_previous = previous.strip() == "1"
        else:
            raise SmokeFailure("Unexpected simulator hardware-keyboard preference type")
        self.keyboard_changed = True
        self.run(["defaults", "write", "com.apple.iphonesimulator", "ConnectHardwareKeyboard", "-bool", "false"],
                 "software-keyboard")

    def create_device(self, device):
        name = f"du-ios-smoke-{os.getpid()}-{device['family']}"
        value = self.capture(["xcrun", "simctl", "create", name, device["deviceType"], device["runtime"]],
                             f"create-{device['family']}").strip()
        try:
            UUID(value)
        except ValueError as error:
            raise SmokeFailure("simctl create did not return a simulator UUID") from error
        self.owned.append(value)
        device["udid"] = value
        device["status"] = "not-run"
        return value

    def verify_bundle(self):
        bundle = self.derived / "Build/Products/Release-iphonesimulator/DiasporaUnlocked.app"
        with (bundle / "Info.plist").open("rb") as source:
            info = plistlib.load(source)
        if info.get("CFBundleIdentifier") != "com.diasporaunlocked.app":
            raise SmokeFailure("The built simulator application has the wrong bundle identifier")
        if "iPhoneSimulator" not in info.get("CFBundleSupportedPlatforms", []):
            raise SmokeFailure("Runtime validation requires a simulator application")
        javascript = (bundle / "main.jsbundle").read_bytes()
        if b"api.example.invalid" not in javascript:
            raise SmokeFailure("The Release JS bundle does not contain the isolated API fixture")
        paths = list((self.derived / "Build/Products").glob("*.xctestrun"))
        if len(paths) != 1:
            raise SmokeFailure("Expected one generated XCTest run configuration")
        return paths[0]

    def evidence(self, device):
        family, udid = device["family"], device["udid"]
        result = self.artifacts / f"{family}.xcresult"
        if result.exists():
            try:
                self.run(["xcrun", "xcresulttool", "export", "attachments", "--path", str(result),
                          "--output-path", str(self.artifacts / f"{family}-attachments")],
                         f"{family}-attachments", timeout=60)
            except Exception as error:
                device.setdefault("evidenceErrors", []).append(str(error))
                # Native screenshots/trees must be inspectable off the Mac too.
                device["status"] = "failed"
        for args, label in [
            (["xcrun", "simctl", "io", udid, "screenshot", str(self.artifacts / f"{family}-final.png")], f"{family}-screenshot"),
            (["xcrun", "simctl", "spawn", udid, "log", "show", "--last", "5m", "--style", "compact", "--predicate",
              'process == "DiasporaUnlocked" OR process == "DUNativeSmokeUITests-Runner"'], f"{family}-console"),
        ]:
            try:
                self.run(args, label, timeout=25, check=False)
            except Exception as error:
                device.setdefault("evidenceErrors", []).append(str(error))

    def exercise(self, device, test_run):
        family, udid = device["family"], device["udid"]
        result = self.artifacts / f"{family}.xcresult"
        try:
            self.run(["xcrun", "simctl", "boot", udid], f"boot-{family}")
            self.run(["xcrun", "simctl", "bootstatus", udid, "-b"], f"ready-{family}", timeout=150)
            self.run(["xcodebuild", "test-without-building", "-xctestrun", str(test_run),
                      "-destination", f"platform=iOS Simulator,id={udid}",
                      "-resultBundlePath", str(result), "-parallel-testing-enabled", "NO",
                      "-test-iterations", "1", "-test-timeouts-enabled", "YES",
                      "-default-test-execution-time-allowance", "240",
                      "-maximum-test-execution-time-allowance", "300",
                      "-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/testResponsiveNavigationAndKeyboard"],
                     f"test-{family}", timeout=360)
            summary = json.loads(self.capture(["xcrun", "xcresulttool", "get", "test-results", "summary", "--path", str(result)],
                                              f"summary-{family}"))
            (self.artifacts / f"{family}-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            validate_test_summary(summary)
            device["status"] = "passed"
        except Exception as error:
            device.update(status="failed", error=str(error))
        finally:
            self.evidence(device)
            self.run(["xcrun", "simctl", "shutdown", udid], f"stop-{family}", check=False)

    def execute(self):
        validate_environment(os.environ)
        if platform.system() != "Darwin":
            raise SmokeFailure("Xcode simulator execution requires macOS; host tests do not execute simulators")
        self.report["revision"] = self.capture(["git", "rev-parse", "HEAD"], "source-revision").strip()
        self.report["xcode"] = self.capture(["xcodebuild", "-version"], "xcode-version").strip()
        help_text = self.capture(["xcrun", "xcresulttool", "export", "attachments", "--help"], "xcresult-attachment-help")
        if "--path" not in help_text or "--output-path" not in help_text:
            raise SmokeFailure("Installed xcresulttool does not expose the required attachment export interface")
        inventory = json.loads(self.capture(["xcrun", "simctl", "list", "--json"], "simulator-inventory"))
        devices = select_devices(inventory)
        self.report["devices"] = devices
        self.set_software_keyboard()
        for device in devices:
            self.create_device(device)
        self.run(["xcodebuild", "build-for-testing", "-workspace", "ios/DiasporaUnlocked.xcworkspace",
                  "-scheme", "DUNativeSmoke", "-configuration", "Release", "-sdk", "iphonesimulator",
                  "-destination", f"platform=iOS Simulator,id={devices[0]['udid']}",
                  "-derivedDataPath", str(self.derived), "CODE_SIGNING_ALLOWED=NO", "CODE_SIGNING_REQUIRED=NO"],
                 "build-for-testing", timeout=1200)
        test_run = self.verify_bundle()
        for device in devices:
            self.exercise(device, test_run)
        if any(device["status"] != "passed" for device in devices):
            raise SmokeFailure("Both iPhone and iPad must pass the real-app XCTest journey; see per-device evidence")

    def cleanup(self):
        errors = []
        for udid in self.owned:
            try:
                self.run(["xcrun", "simctl", "shutdown", udid], "cleanup-shutdown", check=False)
                self.run(["xcrun", "simctl", "delete", udid], "cleanup-delete")
            except Exception as error:
                errors.append(str(error))
        if self.keyboard_changed:
            try:
                args = (["defaults", "delete", "com.apple.iphonesimulator", "ConnectHardwareKeyboard"]
                        if self.keyboard_previous is None else
                        ["defaults", "write", "com.apple.iphonesimulator", "ConnectHardwareKeyboard", "-bool",
                         str(self.keyboard_previous).lower()])
                self.run(args, "restore-keyboard-preference")
            except Exception as error:
                errors.append(str(error))
        return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mobile-dir", required=True)
    parser.add_argument("--derived-data", required=True)
    parser.add_argument("--artifacts", required=True)
    args = parser.parse_args()
    runner = IOSSmoke(args.mobile_dir, args.derived_data, args.artifacts)

    def interrupted(_signum, _frame):
        raise InterruptedError("Simulator smoke was interrupted")

    signal.signal(signal.SIGTERM, interrupted)
    try:
        runner.execute()
        runner.report["status"] = "passed"
    except (Exception, KeyboardInterrupt) as error:
        runner.report.update(status="failed", error=str(error))
    finally:
        errors = runner.cleanup()
        if errors:
            runner.report.update(status="failed", cleanupErrors=errors)
        (runner.artifacts / "report.json").write_text(json.dumps(runner.report, indent=2) + "\n")
    print(json.dumps(runner.report, indent=2), flush=True)
    return 0 if runner.report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
