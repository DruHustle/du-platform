#!/usr/bin/env python3
"""Bounded real-app XCTest runs on one freshly owned iPhone and iPad simulator."""

import argparse
from contextlib import nullcontext
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shlex
import signal
import struct
import subprocess
import time
from urllib.parse import urlparse
from uuid import UUID
from xml.parsers.expat import ExpatError


class SmokeFailure(RuntimeError):
    pass


JOURNEY_BUDGET_SECONDS = 35 * 60
CLEANUP_BUDGET_SECONDS = 180
BOOT_TIMEOUT_SECONDS = 360
TEST_COMMAND_TIMEOUT_SECONDS = 600


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


def validate_simulator_signing(metadata, entitlements, bundle_identifier):
    if re.findall(r"(?m)^Signature=(.+)$", metadata) != ["adhoc"]:
        raise SmokeFailure("The runtime simulator app must have a local ad hoc signature")
    if re.findall(r"(?m)^Identifier=(.+)$", metadata) != [bundle_identifier]:
        raise SmokeFailure("The simulator signature has the wrong application identifier")
    identifier = entitlements.get("application-identifier") if isinstance(entitlements, dict) else None
    if (not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", identifier)
            or not (identifier == bundle_identifier or identifier.endswith("." + bundle_identifier))):
        raise SmokeFailure("The simulator app lacks its generated application-identifier entitlement for default keychain access")
    # Apple includes application-identifier in the app's keychain access groups.
    # A separate sharing group, team identity or provisioning profile is not needed.
    return identifier


def simulator_entitlements(binary, architecture):
    """Read Xcode's simulated plist from the signed, thin 64-bit executable.

    Simulator entitlements live in __TEXT,__entitlements, separately from the
    host macOS signature's entitlement dictionary. SwiftBuild reads this section
    too: Sources/SWBUtil/MachO.swift, simulatedEntitlements().
    """
    cpu_types = {"arm64": 0x0100000C, "x86_64": 0x01000007}
    if len(binary) < 32 or binary[:4] != b"\xcf\xfa\xed\xfe":
        raise SmokeFailure("Expected a thin little-endian 64-bit simulator Mach-O executable")
    _, cpu, _, file_type, command_count, command_bytes, _, _ = struct.unpack_from("<8I", binary)
    if architecture not in cpu_types or cpu != cpu_types[architecture] or file_type != 2:
        raise SmokeFailure("Simulator Mach-O architecture or executable type does not match the runtime build")
    commands_end = 32 + command_bytes
    if not (0 < command_count <= 4096 and 8 * command_count <= command_bytes
            and command_bytes % 8 == 0 and commands_end <= len(binary)):
        raise SmokeFailure("Malformed simulator Mach-O load-command bounds")
    offset = 32
    matches = []
    for _ in range(command_count):
        if offset + 8 > commands_end:
            raise SmokeFailure("Truncated simulator Mach-O load command")
        command, size = struct.unpack_from("<II", binary, offset)
        if size < 8 or size % 8 or offset + size > commands_end:
            raise SmokeFailure("Malformed simulator Mach-O load-command size")
        if command == 0x19:  # LC_SEGMENT_64; segment_command_64 is 72 bytes.
            if size < 72:
                raise SmokeFailure("Truncated simulator Mach-O segment")
            segment = struct.unpack_from("<II16sQQQQiiII", binary, offset)
            name, file_offset, file_size, section_count = segment[2], segment[5], segment[6], segment[9]
            if size != 72 + 80 * section_count or file_offset + file_size > len(binary):
                raise SmokeFailure("Malformed simulator Mach-O segment bounds")
            for index in range(section_count):
                section = struct.unpack_from("<16s16sQQ8I", binary, offset + 72 + 80 * index)
                section_name, segment_name, _, section_size, section_offset = section[:5]
                if section_name.rstrip(b"\0") == b"__entitlements" and segment_name.rstrip(b"\0") == b"__TEXT":
                    if (name.rstrip(b"\0") != b"__TEXT" or not 0 < section_size <= 1_048_576
                            or section_offset < max(commands_end, file_offset)
                            or section_offset + section_size > file_offset + file_size):
                        raise SmokeFailure("Malformed simulator entitlement section bounds")
                    matches.append(binary[section_offset:section_offset + section_size])
        offset += size
    if offset != commands_end:
        raise SmokeFailure("Simulator Mach-O load-command count does not match its size")
    if len(matches) != 1:
        raise SmokeFailure("Expected exactly one simulator __TEXT,__entitlements section")
    try:
        entitlements = plistlib.loads(matches[0])
    except (plistlib.InvalidFileException, ValueError, ExpatError) as error:
        raise SmokeFailure("Simulator entitlement section is not a valid plist") from error
    if not isinstance(entitlements, dict):
        raise SmokeFailure("Simulator entitlement section must contain a dictionary")
    return entitlements, matches[0]


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
        self.deadline = None
        self.report = {"status": "running", "architecture": platform.machine(), "devices": []}

    def run(self, args, label, timeout=30, check=True, capture=False, separate_stderr=False):
        self.command_number += 1
        output_path = self.artifacts / f"{self.command_number:02d}-{label}.log"
        print(f"[{label}] {shlex.join(map(str, args))}", flush=True)
        started = time.monotonic()
        effective_timeout = timeout if self.deadline is None else min(timeout, self.deadline - started)
        entry = {"command": list(map(str, args)), "requestedTimeoutSeconds": timeout,
                 "timeoutSeconds": max(0, effective_timeout), "output": output_path.name}
        stderr_path = output_path.with_suffix(".stderr.log") if separate_stderr else None
        if stderr_path is not None:
            entry["stderr"] = stderr_path.name
        code = None
        try:
            with output_path.open("w") as output, \
                    (stderr_path.open("w") if stderr_path is not None else nullcontext(subprocess.STDOUT)) as stderr:
                if effective_timeout <= 0:
                    raise SmokeFailure(f"Simulator command budget exhausted before {label}")
                process = subprocess.Popen(list(map(str, args)), cwd=self.mobile, stdout=output,
                                           stderr=stderr, start_new_session=True)
                try:
                    code = process.wait(timeout=effective_timeout)
                except BaseException:
                    try:
                        try:
                            os.killpg(process.pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                        try:
                            process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            os.killpg(process.pid, signal.SIGKILL)
                            process.wait(timeout=5)
                    except Exception as error:
                        entry["terminationError"] = str(error)
                    # Preserve the original command failure if termination also fails.
                    raise
                finally:
                    code = process.poll()
        except BaseException as error:
            entry.update(error=str(error), errorType=type(error).__name__)
            raise
        finally:
            entry.update(exitCode=code, elapsedSeconds=round(time.monotonic() - started, 2))
            # Include failed/timed-out commands too; the referenced log keeps full stdout.
            with (self.artifacts / "commands.jsonl").open("a") as log:
                log.write(json.dumps(entry) + "\n")
        if check and code:
            tail = ""
            for path in (output_path, stderr_path):
                if path is not None:
                    with path.open("rb") as output:
                        output.seek(max(0, path.stat().st_size - 6000))
                        tail += output.read().decode(errors="replace")
            raise SmokeFailure(f"{label} exited {code}; see {output_path.name}\n{tail}")
        if capture and output_path.stat().st_size > 2_000_000:
            raise SmokeFailure(f"Unexpectedly large structured output from {label}")
        return code, output_path.read_text() if capture else ""

    def capture(self, args, label, timeout=30, separate_stderr=False):
        return self.run(args, label, timeout=timeout, capture=True, separate_stderr=separate_stderr)[1]

    def destination(self, udid):
        architecture = self.report["architecture"]
        if architecture not in ("arm64", "x86_64"):
            raise SmokeFailure(f"Unsupported simulator host architecture: {architecture}")
        return f"platform=iOS Simulator,id={udid},arch={architecture}"

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

    def verify_signing(self):
        bundle = self.derived / "Build/Products/Release-iphonesimulator/DiasporaUnlocked.app"
        self.run(["codesign", "--verify", "--strict", str(bundle)], "verify-app-signature")
        metadata = self.capture(["codesign", "--display", "--verbose=4", str(bundle)], "app-signature")
        # codesign writes its diagnostic header to stderr and machine-readable XML
        # to stdout. Keep these streams separate; do not parse mixed log output.
        xml = self.capture(["codesign", "--display", "--entitlements", "-", "--xml", str(bundle)],
                           "app-entitlements", separate_stderr=True)
        try:
            entitlements = plistlib.loads(xml.encode())
        except (plistlib.InvalidFileException, ValueError, ExpatError) as error:
            raise SmokeFailure("codesign did not produce a valid XML entitlement plist") from error
        if not isinstance(entitlements, dict):
            raise SmokeFailure("codesign host entitlements must contain a dictionary")
        simulated, actual_plist = simulator_entitlements((bundle / "DiasporaUnlocked").read_bytes(),
                                                        self.report["architecture"])
        evidence = self.artifacts / "app-simulated-entitlements.plist"
        evidence.write_bytes(actual_plist)
        identifier = validate_simulator_signing(metadata, simulated, "com.diasporaunlocked.app")
        self.report["signing"] = {"signature": "adhoc", "applicationIdentifier": identifier,
                                  "entitlementSource": "__TEXT,__entitlements", "entitlements": evidence.name,
                                  "keychainAccessGroups": simulated.get("keychain-access-groups", [])}

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
            (["xcrun", "simctl", "spawn", udid, "log", "show", "--last", "5m", "--style", "compact", "--predicate",
              '(process == "securityd" OR subsystem == "com.apple.securityd") AND '
              '(eventMessage CONTAINS[c] "DiasporaUnlocked" OR eventMessage CONTAINS[c] "com.diasporaunlocked.app")'],
             f"{family}-security"),
        ]:
            try:
                self.run(args, label, timeout=25, check=False)
            except Exception as error:
                device.setdefault("evidenceErrors", []).append(str(error))

    def device_state(self, device, phase):
        inventory = json.loads(self.capture(["xcrun", "simctl", "list", "devices", "--json"],
                                            f"{device['family']}-{phase}-state", timeout=15))
        matches = [item for group in inventory.get("devices", {}).values() for item in group
                   if item.get("udid") == device["udid"]]
        if len(matches) != 1 or not isinstance(matches[0].get("state"), str):
            raise SmokeFailure("Could not determine the owned simulator's state")
        state = matches[0]["state"]
        device.setdefault("observedStates", []).append({"phase": phase, "state": state})
        return state

    def stop_device(self, device):
        errors = []
        try:
            self.run(["xcrun", "simctl", "shutdown", device["udid"]],
                     f"stop-{device['family']}", timeout=60, check=False)
        except Exception as error:
            errors.append(str(error))
        stopped = False
        try:
            stopped = self.device_state(device, "after-stop") == "Shutdown"
            if not stopped:
                errors.append("Owned simulator did not reach Shutdown; next device will not be booted")
        except Exception as error:
            errors.append(str(error))
        if errors:
            device["status"] = "failed"
            device.setdefault("shutdownErrors", []).extend(errors)
            # A shutdown problem must not replace a boot or XCTest failure.
            device.setdefault("error", errors[0])
        return stopped

    def exercise(self, device, test_run):
        family, udid = device["family"], device["udid"]
        result = self.artifacts / f"{family}.xcresult"
        try:
            self.run(["xcrun", "simctl", "boot", udid], f"boot-{family}")
            # Fresh iOS 26 data migration exceeded 150s while still progressing.
            # Wait once with a bounded cold-boot budget; never retry a failed test.
            self.run(["xcrun", "simctl", "bootstatus", udid, "-b"], f"ready-{family}", timeout=BOOT_TIMEOUT_SECONDS)
            self.run(["xcodebuild", "test-without-building", "-xctestrun", str(test_run),
                      "-destination", self.destination(udid),
                      "-resultBundlePath", str(result), "-parallel-testing-enabled", "NO",
                      "-test-timeouts-enabled", "YES",
                      "-default-test-execution-time-allowance", "240",
                      "-maximum-test-execution-time-allowance", "300",
                      "-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/testResponsiveNavigationAndKeyboard"],
                     f"test-{family}", timeout=TEST_COMMAND_TIMEOUT_SECONDS)
            summary = json.loads(self.capture(["xcrun", "xcresulttool", "get", "test-results", "summary", "--path", str(result)],
                                              f"summary-{family}"))
            (self.artifacts / f"{family}-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            validate_test_summary(summary)
            device["status"] = "passed"
        except Exception as error:
            device.update(status="failed", error=str(error))
            try:
                self.device_state(device, "after-failure")
            except Exception as state_error:
                device.setdefault("diagnosticErrors", []).append(str(state_error))
        finally:
            try:
                self.evidence(device)
            except Exception as evidence_error:
                device["status"] = "failed"
                device.setdefault("evidenceErrors", []).append(str(evidence_error))
                device.setdefault("error", str(evidence_error))
        return self.stop_device(device)

    def execute(self):
        validate_environment(os.environ)
        if platform.system() != "Darwin":
            raise SmokeFailure("Xcode simulator execution requires macOS; host tests do not execute simulators")
        # Leave room in the 45-minute job for dependency setup, cleanup and upload.
        self.deadline = time.monotonic() + JOURNEY_BUDGET_SECONDS
        self.report["journeyBudgetSeconds"] = JOURNEY_BUDGET_SECONDS
        self.report["revision"] = self.capture(["git", "rev-parse", "HEAD"], "source-revision").strip()
        self.report["xcode"] = self.capture(["xcodebuild", "-version"], "xcode-version").strip()
        help_text = self.capture(["xcrun", "xcresulttool", "export", "attachments", "--help"], "xcresult-attachment-help")
        if "--path" not in help_text or "--output-path" not in help_text:
            raise SmokeFailure("Installed xcresulttool does not expose the required attachment export interface")
        # The first CoreSimulator inventory read exceeded the generic 30s limit
        # on a hosted Mac. Give this one read its own bounded allowance, not a retry.
        inventory = json.loads(self.capture(["xcrun", "simctl", "list", "--json"],
                                            "simulator-inventory", timeout=120))
        devices = select_devices(inventory)
        self.report["devices"] = devices
        self.set_software_keyboard()
        for device in devices:
            self.create_device(device)
        self.run(["xcodebuild", "build-for-testing", "-workspace", "ios/DiasporaUnlocked.xcworkspace",
                  "-scheme", "DUNativeSmoke", "-configuration", "Release", "-sdk", "iphonesimulator",
                  "-destination", self.destination(devices[0]["udid"]),
                  "-derivedDataPath", str(self.derived), "ONLY_ACTIVE_ARCH=YES",
                  "CODE_SIGN_IDENTITY=-", "CODE_SIGNING_ALLOWED=YES", "CODE_SIGNING_REQUIRED=YES"],
                 "build-for-testing", timeout=1200)
        test_run = self.verify_bundle()
        self.verify_signing()
        for device in devices:
            if self.exercise(device, test_run) is False:
                break
        if any(device["status"] != "passed" for device in devices):
            failures = "; ".join(f"{device['family']}: {device.get('error', device['status'])}"
                                 for device in devices if device["status"] != "passed")
            raise SmokeFailure(f"Both iPhone and iPad must pass the real-app XCTest journey; {failures}")

    def cleanup(self):
        errors = []
        self.deadline = time.monotonic() + CLEANUP_BUDGET_SECONDS
        # Restore shared preferences before a stuck device can consume cleanup's budget.
        if self.keyboard_changed:
            try:
                args = (["defaults", "delete", "com.apple.iphonesimulator", "ConnectHardwareKeyboard"]
                        if self.keyboard_previous is None else
                        ["defaults", "write", "com.apple.iphonesimulator", "ConnectHardwareKeyboard", "-bool",
                         str(self.keyboard_previous).lower()])
                self.run(args, "restore-keyboard-preference", timeout=10)
            except Exception as error:
                errors.append(str(error))
        for udid in self.owned:
            # Five cleanup commands total at most 110s, plus 10s TERM/KILL
            # grace each. Keep 20s headroom so the last owned delete can start.
            for command, timeout, check in (("shutdown", 30, False), ("delete", 20, True)):
                try:
                    self.run(["xcrun", "simctl", command, udid], f"cleanup-{command}",
                             timeout=timeout, check=check)
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
