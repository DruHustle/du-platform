#!/usr/bin/env python3
r"""Bounded Android development-build smoke test; Python stdlib and adb only.

Run inside an already booted emulator, after npm ci and assembleDebug:
  python3 du-platform-frontend/tooling/scripts/tests/android-native-smoke.py \
    --mobile-dir du-platform-frontend/mobile \
    --apk du-platform-frontend/mobile/android/app/build/outputs/apk/debug/app-debug.apk \
    --artifacts /tmp/du-native-android-smoke

This clears only the installed test app on an emulator. It submits no forms and
requires .invalid API/website origins. Taps use labels and bounds from the current
uiautomator hierarchy, never device-specific coordinates. The 9-minute working
deadline leaves at most one minute for diagnostics and process cleanup.

Launch/diagnostic references:
https://docs.expo.dev/more/expo-cli/#server-url
https://docs.expo.dev/more/qr-codes/
https://docs.expo.dev/develop/development-builds/development-workflows/#app-specific-deep-links
https://developer.android.com/tools/adb
"""

import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


class SmokeFailure(RuntimeError):
    pass


def labels(node):
    return [" ".join(node.get(key, "").split()) for key in ("text", "content-desc")]


def bounds(node):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
    if not match:
        return None
    x1, y1, x2, y2 = map(int, match.groups())
    return (x1, y1, x2, y2) if x2 > x1 and y2 > y1 else None


def find_target(tree, label, package, tab=False):
    """Return one observed, enabled click target, rejecting ambiguous matches."""
    parents = {child: parent for parent in tree.iter() for child in parent}
    candidates = {}
    for node in tree.iter("node"):
        if node.get("package") != package:
            continue
        values = labels(node)
        matches = any(value == label for value in values)
        if tab:
            matches = matches or any(
                re.fullmatch(r"\W+" + re.escape(label), value)
                or re.fullmatch(re.escape(label) + r", tab(?:, \d+ of \d+)?", value, re.I)
                for value in values
            )
        if not matches:
            continue
        target = node
        while target is not None and target.get("clickable") != "true":
            target = parents.get(target)
        if target is None or target.get("enabled") != "true" or target.get("package") != package:
            continue
        area = bounds(target)
        if area:
            candidates[area] = target
    if len(candidates) > 1:
        raise SmokeFailure(f"Ambiguous visible target {label!r}: {list(candidates)}")
    return next(iter(candidates.values()), None)


class AndroidSmoke:
    def __init__(self, args):
        self.mobile = Path(args.mobile_dir).resolve()
        self.apk = Path(args.apk).resolve()
        self.artifacts = Path(args.artifacts).resolve()
        self.artifacts.mkdir(parents=True, exist_ok=True)
        self.started = time.monotonic()
        self.deadline = self.started + 540
        self.metro = None
        self.metro_log = None
        self.reversed = False
        self.device_ready = False
        self.package = ""
        self.steps = []
        self.last_xml = None
        self.dismissals = {"Continue": 0, "Close": 0}
        self.command_log = (self.artifacts / "commands.log").open("w", encoding="utf-8")

    def note(self, message):
        print(f"[{time.monotonic() - self.started:.1f}s] {message}", flush=True)

    def run(self, command, timeout=25, diagnostic=False):
        if not diagnostic:
            timeout = min(timeout, self.deadline - time.monotonic())
            if timeout <= 0:
                raise SmokeFailure("Android smoke exceeded its 9-minute working deadline")
        self.command_log.write(shlex.join(map(str, command)) + "\n")
        self.command_log.flush()
        result = subprocess.run(command, capture_output=True, timeout=timeout, check=False)
        if result.returncode:
            detail = (result.stdout + result.stderr).decode("utf-8", errors="replace")[-1500:]
            raise SmokeFailure(f"Command failed ({result.returncode}): {shlex.join(map(str, command))}\n{detail}")
        return result.stdout

    def adb(self, *args, **kwargs):
        return self.run(["adb", *args], **kwargs)

    def shell(self, *args, **kwargs):
        # adb shell uses a remote shell; quote each argument, including link URIs.
        return self.adb("shell", shlex.join(map(str, args)), **kwargs)

    def hierarchy(self, diagnostic=False):
        remote = "/sdcard/du-native-smoke.xml"
        self.shell("uiautomator", "dump", remote, timeout=12 if not diagnostic else 6, diagnostic=diagnostic)
        data = self.adb("exec-out", "cat", remote, timeout=6, diagnostic=diagnostic)
        tree = ET.fromstring(data)
        self.last_xml = data
        (self.artifacts / "latest.xml").write_bytes(data)
        return tree

    def visible_labels(self, tree):
        return {value for node in tree.iter("node") if node.get("package") == self.package
                for value in labels(node) if value}

    def capture(self, name, xml=None, diagnostic=False):
        if xml is not None:
            (self.artifacts / f"{name}.xml").write_bytes(xml)
        png = self.adb("exec-out", "screencap", "-p", timeout=15, diagnostic=diagnostic)
        if not png.startswith(b"\x89PNG\r\n\x1a\n"):
            raise SmokeFailure("adb screencap did not return a PNG")
        (self.artifacts / f"{name}.png").write_bytes(png)

    def tap(self, tree, label, tab=False):
        target = find_target(tree, label, self.package, tab=tab)
        if target is None:
            return False
        x1, y1, x2, y2 = bounds(target)
        self.note(f"Tap observed {label!r}, bounds={(x1, y1, x2, y2)}")
        self.shell("input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)
        return True

    def dismiss_developer_menu(self, tree, visible):
        # SDK58's Continue reveals the menu; Close then returns to the app.
        onboarding = any("This is the developer menu." in value for value in visible)
        label = "Continue" if onboarding else "Close" if "Reload" in visible and "Close" in visible else None
        if label is None:
            return False
        if self.dismissals[label] >= 2:
            raise SmokeFailure(f"Developer menu remained open after two {label} taps")
        self.capture(f"developer-menu-{label.lower()}-{self.dismissals[label]}", self.last_xml)
        if not self.tap(tree, label):
            raise SmokeFailure(f"Observed developer menu without an enabled {label} button")
        self.dismissals[label] += 1
        return True

    def wait_screen(self, name, expected, timeout=45):
        self.note(f"Wait for {name}: {', '.join(expected)}")
        end = min(self.deadline, time.monotonic() + timeout)
        last_error = "No hierarchy returned"
        while time.monotonic() < end:
            if self.metro and self.metro.poll() is not None:
                raise SmokeFailure("Metro exited; see metro.log")
            try:
                tree = self.hierarchy()
            except (SmokeFailure, ET.ParseError, subprocess.TimeoutExpired) as error:
                last_error = str(error)
            else:
                visible = self.visible_labels(tree)
                if self.dismiss_developer_menu(tree, visible):
                    continue
                if all(text in visible for text in expected):
                    self.capture(name, self.last_xml)
                    self.steps.append({"screen": name, "expected": expected,
                                       "elapsedSeconds": round(time.monotonic() - self.started, 2)})
                    return tree
                last_error = f"Observed labels: {sorted(visible)}"
            time.sleep(1)
        raise SmokeFailure(f"Timed out waiting for {name}. {last_error}")

    def navigate_tab(self, label, expected, name):
        # Refresh the hierarchy immediately before deriving the tap location.
        if not self.tap(self.hierarchy(), label, tab=True):
            raise SmokeFailure(f"No visible, enabled {label} tab")
        return self.wait_screen(name, expected)

    def launch(self, uri):
        output = self.shell("am", "start", "-W", "-a", "android.intent.action.VIEW",
                            "-d", uri, "-p", self.package, timeout=35)
        with (self.artifacts / "launches.log").open("ab") as log:
            log.write(output + b"\n")
        if b"Error:" in output or b"Exception" in output:
            raise SmokeFailure(f"Android could not open {uri}: {output.decode(errors='replace')}")

    def start_metro(self):
        env = os.environ.copy()
        defaults = {"EXPO_PUBLIC_API_URL": "https://api.android-ci.invalid/api",
                    "EXPO_PUBLIC_WEB_URL": "https://web.android-ci.invalid"}
        for key, default in defaults.items():
            value = env.get(key, default)
            parsed = urllib.parse.urlsplit(value)
            if parsed.scheme != "https" or not (parsed.hostname or "").endswith(".invalid") or parsed.username or parsed.password:
                raise SmokeFailure(f"{key} must use an HTTPS .invalid test origin")
            env[key] = value
        # --offline is a host-selection flag that conflicts with --localhost.
        # EXPO_OFFLINE disables CLI network requests without changing the host.
        env.update({"CI": "1", "EXPO_NO_DOTENV": "1", "EXPO_NO_TELEMETRY": "1", "EXPO_OFFLINE": "1"})
        env.pop("EXPO_NO_CLIENT_ENV_VARS", None)
        # Never attach this test to somebody else's Metro/environment.
        try:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", 8081))
        except OSError as error:
            raise SmokeFailure("localhost:8081 must be free before starting test Metro") from error
        (self.artifacts / "test-origins.json").write_text(json.dumps({key: env[key] for key in defaults}, indent=2) + "\n")
        self.metro_log = (self.artifacts / "metro.log").open("wb")
        self.metro = subprocess.Popen(
            [str(self.mobile / "node_modules/.bin/expo"), "start", "--dev-client", "--localhost", "--port", "8081"],
            cwd=self.mobile, env=env, stdin=subprocess.DEVNULL,
            stdout=self.metro_log, stderr=subprocess.STDOUT, start_new_session=True,
        )
        end = min(self.deadline, time.monotonic() + 70)
        while time.monotonic() < end:
            if self.metro.poll() is not None:
                raise SmokeFailure("Metro failed to start; see metro.log")
            try:
                with urllib.request.urlopen("http://127.0.0.1:8081/status", timeout=2) as response:
                    if response.read() == b"packager-status:running":
                        return
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(1)
        raise SmokeFailure("Metro did not become ready on localhost:8081")

    def execute(self):
        if not shutil.which("adb") or not self.apk.is_file():
            raise SmokeFailure("Requires adb and an existing debug APK")
        config = json.loads((self.mobile / "app.json").read_text())["expo"]
        self.package = config["android"]["package"]
        self.adb("wait-for-device", timeout=45)
        emulator = self.shell("getprop", "ro.kernel.qemu").decode().strip()
        if emulator != "1":
            raise SmokeFailure("This test clears app data and may run only on an Android emulator")
        self.device_ready = True
        self.adb("logcat", "-c")
        self.start_metro()
        self.adb("reverse", "tcp:8081", "tcp:8081")
        self.reversed = True
        self.adb("install", "-r", str(self.apk), timeout=70)
        if self.shell("pm", "clear", self.package).decode().strip() != "Success":
            raise SmokeFailure("Could not clear test app data before launch")
        server = urllib.parse.quote("http://127.0.0.1:8081", safe="")
        self.launch(f"exp+{config['slug']}://expo-development-client/?url={server}")
        self.wait_screen("01-home", ["Explore what connects us", "Search Diaspora Unlocked"], timeout=180)
        self.navigate_tab("Travel", ["Find options", "From airport code (e.g. FRA)"], "02-travel")
        self.navigate_tab("Shop", ["Search products", "Filter by category"], "03-shop")
        self.navigate_tab("Account", ["Welcome back", "Email address"], "04-account")

        # Expo dev-client supports app-specific links only after the project is
        # open. Real cold email-link launch remains a release/device check.
        # The deliberately invalid token is never submitted to an API.
        self.launch(f"{config['scheme']}://reset-password?token=invalid-ci-smoke-token")
        self.wait_screen("05-reset-link", ["Choose a new password", "Back to sign in"])
        if not self.tap(self.hierarchy(), "Back to sign in"):
            raise SmokeFailure("Reset screen has no enabled Back to sign in action")
        self.wait_screen("06-reset-return", ["Welcome back", "Email address"])
        self.navigate_tab("Home", ["Explore what connects us"], "07-home-after-reset")
        if not self.shell("pidof", self.package).strip():
            raise SmokeFailure("App process did not survive the completed navigation")

    def diagnostics(self):
        if not self.device_ready:
            return None
        diagnostic_error = None
        commands = [
            ("logcat.txt", ["adb", "logcat", "-d", "-v", "threadtime"]),
            ("activity.txt", ["adb", "shell", "dumpsys activity activities"]),
            ("process.txt", ["adb", "shell", shlex.join(["pidof", self.package])]),
        ]
        for name, command in commands:
            try:
                data = self.run(command, timeout=6, diagnostic=True)
                (self.artifacts / name).write_bytes(data)
                if name == "logcat.txt" and re.search(
                    r"AndroidRuntime\s*:\s*Process: " + re.escape(self.package) + r"(?:,|\s|$)",
                    data.decode("utf-8", errors="replace"),
                ):
                    diagnostic_error = "AndroidRuntime recorded a crash in the app; see logcat.txt"
            except Exception as error:
                (self.artifacts / f"{name}.error").write_text(str(error))
                if name in ("logcat.txt", "process.txt"):
                    diagnostic_error = diagnostic_error or f"Could not verify {name}: {error}"
        try:
            self.hierarchy(diagnostic=True)
        except Exception as error:
            (self.artifacts / "final-ui.error").write_text(str(error))
        try:
            self.capture("final", self.last_xml, diagnostic=True)
        except Exception as error:
            (self.artifacts / "final-screen.error").write_text(str(error))
        return diagnostic_error

    def cleanup(self):
        if self.metro is not None:
            try:
                os.killpg(self.metro.pid, signal.SIGTERM)
                self.metro.wait(timeout=5)
            except (ProcessLookupError, subprocess.TimeoutExpired):
                try:
                    os.killpg(self.metro.pid, signal.SIGKILL)
                    self.metro.wait(timeout=2)
                except (ProcessLookupError, subprocess.TimeoutExpired):
                    pass
        if self.metro_log:
            self.metro_log.close()
        if self.reversed:
            try:
                self.adb("reverse", "--remove", "tcp:8081", timeout=5, diagnostic=True)
            except Exception as error:
                self.note(f"adb reverse cleanup: {error}")
        self.command_log.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mobile-dir", required=True)
    parser.add_argument("--apk", required=True)
    parser.add_argument("--artifacts", required=True)
    runner = AndroidSmoke(parser.parse_args())
    error = None
    try:
        runner.execute()
    except (Exception, KeyboardInterrupt) as failure:
        error = f"{type(failure).__name__}: {failure}"
        runner.note(error)
    finally:
        diagnostic_error = runner.diagnostics()
        error = error or diagnostic_error
        runner.cleanup()
        result = {"passed": error is None, "error": error, "steps": runner.steps,
                  "elapsedSeconds": round(time.monotonic() - runner.started, 2),
                  "scope": "Android debug launch, native tabs, warm reset link and return; no cold standalone link/authenticated/provider/commerce journey"}
        (runner.artifacts / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    runner.note("PASS" if error is None else "FAIL; inspect Android smoke artifacts")
    return 0 if error is None else 1


if __name__ == "__main__":
    sys.exit(main())
