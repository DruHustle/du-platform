#!/usr/bin/env python3
r"""Bounded Android development-build smoke test; Python stdlib and adb only.

Run inside an already booted emulator, after npm ci and assembleDebug:
  python3 du-platform-frontend/tooling/scripts/tests/android-native-smoke.py \
    --mobile-dir du-platform-frontend/mobile \
    --apk du-platform-frontend/mobile/android/app/build/outputs/apk/debug/app-debug.apk \
    --artifacts /tmp/du-native-android-smoke

This clears only the installed test app on an emulator. It submits no forms and
requires .invalid API/website origins. Taps use labels and bounds from the current
uiautomator hierarchy, never device-specific coordinates. Tablet, landscape,
large-text and real keyboard cases retain screenshots and native bounds.
Display and keyboard settings are restored during cleanup, including after a
failed assertion. The working deadline is 9 minutes; diagnostics and restoration
are separately bounded.

Launch/diagnostic references:
https://docs.expo.dev/more/expo-cli/#server-url
https://docs.expo.dev/more/qr-codes/
https://docs.expo.dev/develop/development-builds/development-workflows/#app-specific-deep-links
https://developer.android.com/tools/adb
https://developer.android.com/develop/ui/views/layout/sw-keyboard
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


def display_setting(output, kind):
    """Read the effective wm value and retain any override for exact cleanup."""
    pattern = r"\d+x\d+" if kind == "size" else r"\d+"
    physical = re.search(r"Physical " + kind + r": (" + pattern + r")", output)
    override = re.search(r"Override " + kind + r": (" + pattern + r")", output)
    if not physical:
        raise SmokeFailure(f"Could not read Android display {kind}: {output!r}")
    return {"physical": physical.group(1), "override": override.group(1) if override else None,
            "effective": (override or physical).group(1)}


def png_size(data):
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise SmokeFailure("adb screencap did not return a PNG with dimensions")
    width, height = int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    if not width or not height:
        raise SmokeFailure("adb screencap returned an empty display")
    return width, height


def navigation_bounds(tree, package, size, density):
    """Verify real visible targets, not only that tab labels exist in the tree."""
    width, height = size
    minimum = 44 * density / 160
    targets = {}
    for label in ("Home", "Shop", "Travel", "Assistant", "Account"):
        target = find_target(tree, label, package, tab=True)
        if target is None:
            raise SmokeFailure(f"No visible, enabled {label} tab in this display configuration")
        area = bounds(target)
        x1, y1, x2, y2 = area
        if x2 > width or y2 > height:
            raise SmokeFailure(f"{label} tab extends outside the {width}x{height} display: {area}")
        if x2 - x1 < minimum - 1 or y2 - y1 < minimum - 1:
            raise SmokeFailure(f"{label} tab is smaller than 44dp at density {density}: {area}")
        for previous, (a1, b1, a2, b2) in targets.items():
            if min(x2, a2) > max(x1, a1) and min(y2, b2) > max(y1, b1):
                raise SmokeFailure(f"{label} and {previous} tabs overlap")
        targets[label] = area
    return targets


def ime_bounds(output):
    """Read the actual visible IME inset on the emulator's default display.

    Android 16's `dumpsys window displays` prints InsetsSource.dump(), including
    `type=ime frame=[...][...] visible=true`. A show request, input-method history
    entry or a visible keyboard on another display is not sufficient evidence.
    """
    displays = re.split(r"(?m)^\s*Display: mDisplayId=(\d+)[^\n]*\n", output)
    default = next((displays[i + 1] for i in range(1, len(displays), 2) if displays[i] == "0"), None)
    if default is None:
        raise SmokeFailure("WindowManager did not report the default display's insets")
    frames = set()
    for line in default.splitlines():
        if not re.match(r"\s*InsetsSource id=\S+ type=ime\s", line):
            continue
        if not re.search(r"\bvisible=true\b", line):
            continue
        match = re.search(r"\bframe=(\[\d+,\d+\]\[\d+,\d+\])", line)
        area = bounds({"bounds": match.group(1)}) if match else None
        if area is None:
            raise SmokeFailure(f"Visible IME has invalid bounds: {line.strip()}")
        frames.add(area)
    if len(frames) > 1:
        raise SmokeFailure(f"Ambiguous visible IME bounds: {sorted(frames)}")
    return next(iter(frames), None)


def editable_field(tree, label, package):
    matches = [node for node in tree.iter("node") if node.get("package") == package
               and node.get("class") == "android.widget.EditText" and label in labels(node)
               and node.get("enabled") == "true" and bounds(node)]
    if len(matches) != 1:
        raise SmokeFailure(f"Expected one visible, enabled editable {label!r}; found {len(matches)}")
    return matches[0]


def keyboard_observation(tree, package, label, value, frame, size, density, action=None):
    """Require focused app text and usable controls above a visible real IME."""
    if frame is None:
        raise SmokeFailure("The software keyboard is not visibly open")
    width, height = size
    if frame[2] > width or frame[3] > height:
        raise SmokeFailure(f"IME extends outside the {width}x{height} display: {frame}")
    field = editable_field(tree, label, package)
    if field.get("focused") != "true" or field.get("text", "") != value:
        raise SmokeFailure(f"{label!r} does not hold the expected focused text")
    minimum = 44 * density / 160 - 1

    def visible_area(target, description):
        area = bounds(target) if target is not None else None
        if (area is None or area[2] > width or area[3] > frame[1]
                or area[2] - area[0] < minimum or area[3] - area[1] < minimum):
            raise SmokeFailure(f"{description} is not a full 44dp target above the keyboard: {area}")
        return area

    observation = {"field": label, "value": value, "fieldBounds": visible_area(field, label),
                   "imeBounds": frame}
    if action is not None:
        target = find_target(tree, action, package)
        observation.update({"action": action, "actionBounds": visible_area(target, action)})
    return observation


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
        self.last_screen_size = None
        self.current_density = 160
        self.display_state = None
        self.display_changed = False
        self.keyboard_changed = False
        self.layout_cases = []
        self.keyboard_cases = []
        self.dismissals = {"Continue": 0, "Close": 0, "Back": 0}
        self.pending_dismissal = None
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
        self.last_screen_size = png_size(png)
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
        # Expo and React Native expose different development menus. The native
        # AlertDialog observed in run 41751015388 has no Close button; Android
        # Back cancels that dialog. Never send Back for an ordinary app screen.
        native_menu = {"React Native Dev Menu", "Reload", "Change Bundle Location"} <= visible and any(
            node.get("package") == self.package
            and node.get("resource-id") == "android:id/select_dialog_listview"
            for node in tree.iter("node")
        )
        onboarding = any("This is the developer menu." in value for value in visible)
        expo_menu = onboarding or ("Reload" in visible and any(
            value.startswith(("Runtime version: ", "SDK version: ")) for value in visible
        ))
        # The onboarding sheet also offers Close. Use it directly when present
        # instead of opening more development tools with Continue.
        label = "Back" if native_menu else "Close" if expo_menu and "Close" in visible else "Continue" if onboarding else None
        if label is None:
            self.pending_dismissal = None
            return False
        signature = (label, tuple(sorted(visible)))
        if signature == self.pending_dismissal:
            # UIAutomator can repeat the pre-transition hierarchy. A second tap
            # at the old Continue coordinates can select a different menu item.
            # Keep observing; wait_screen's deadline still fails a stuck menu.
            return True
        if self.dismissals[label] >= 2:
            raise SmokeFailure(f"Developer menu required more than two {label} dismissals")
        self.capture(f"developer-menu-{label.lower()}-{self.dismissals[label]}", self.last_xml)
        if native_menu:
            self.note("Dismiss observed React Native developer dialog with Android Back")
            self.shell("input", "keyevent", "KEYCODE_BACK")
        elif not self.tap(tree, label):
            raise SmokeFailure(f"Observed developer menu without an enabled {label} button")
        self.dismissals[label] += 1
        self.pending_dismissal = signature
        return True

    def wait_screen(self, name, expected, timeout=45, orientation=None, required_tabs=(),
                    recover_boot_dialog=False):
        description = [*expected, *(label + " tab" for label in required_tabs)]
        self.note(f"Wait for {name}: {', '.join(description)}")
        end = min(self.deadline, time.monotonic() + timeout)
        waited_for_system_ui = False
        last_error = "No hierarchy returned"
        while time.monotonic() < end:
            if self.metro and self.metro.poll() is not None:
                raise SmokeFailure("Metro exited; see metro.log")
            try:
                tree = self.hierarchy()
            except (SmokeFailure, ET.ParseError, subprocess.TimeoutExpired) as error:
                last_error = str(error)
            else:
                # A cold emulator can leave its own System UI ANR over the app.
                # Use Wait once, then require the normal Home assertions.
                title = tree.find(".//node[@package='android'][@resource-id='android:id/alertTitle']")
                if recover_boot_dialog and title is not None and title.get("text") == "System UI isn't responding":
                    if not waited_for_system_ui:
                        wait = find_target(tree, "Wait", "android")
                        if wait is None or wait.get("resource-id") != "android:id/aerr_wait":
                            raise SmokeFailure("System UI cold-start dialog has no enabled Wait button")
                        x1, y1, x2, y2 = bounds(wait)
                        self.capture("cold-start-system-ui", self.last_xml)
                        self.note("Tap Wait on the emulator's System UI cold-start dialog")
                        self.shell("input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)
                        waited_for_system_ui = True
                    last_error = "System UI cold-start dialog still blocks the app"
                    time.sleep(1)
                    continue
                visible = self.visible_labels(tree)
                if self.dismiss_developer_menu(tree, visible):
                    last_error = f"Developer menu is still visible: {sorted(visible)}"
                    time.sleep(1)
                    continue
                if all(text in visible for text in expected) and all(
                    find_target(tree, label, self.package, tab=True) is not None for label in required_tabs
                ):
                    self.capture(name, self.last_xml)
                    width, height = self.last_screen_size
                    if orientation and (width > height) != (orientation == "landscape"):
                        last_error = f"Display has not reached {orientation}: {width}x{height}"
                        continue
                    self.steps.append({"screen": name, "expected": expected,
                                       "requiredTabs": list(required_tabs),
                                       "displayPixels": {"width": width, "height": height},
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

    def remember_display(self):
        state = {kind: display_setting(self.shell("wm", kind).decode().strip(), kind)
                 for kind in ("size", "density")}
        state["settings"] = {key: self.shell("settings", "get", "system", key).decode().strip()
                             for key in ("font_scale", "accelerometer_rotation", "user_rotation")}
        state["secureSettings"] = {
            "show_ime_with_hard_keyboard": self.shell("settings", "get", "secure",
                                                      "show_ime_with_hard_keyboard").decode().strip()
        }
        self.display_state = state
        self.current_density = int(state["density"]["effective"])
        (self.artifacts / "original-display.json").write_text(json.dumps(state, indent=2) + "\n")

    def enable_soft_keyboard(self):
        if not self.device_ready or not self.display_state or "secureSettings" not in self.display_state:
            raise SmokeFailure("Keyboard changes require a verified emulator and saved original setting")
        # The CI emulator exposes a hardware keyboard. Explicitly render its
        # real IME, then restore the prior value even if the first phone case fails.
        self.keyboard_changed = True
        self.shell("settings", "put", "secure", "show_ime_with_hard_keyboard", "1")

    def configure_display(self, rotation, font_scale):
        if self.display_state is None or not self.device_ready:
            raise SmokeFailure("Display changes require a verified emulator and saved original settings")
        # 1200x1920 at 240dpi gives an 800x1280dp tablet window. Rotation uses
        # Android's real configuration change rather than a mocked JS width.
        self.display_changed = True
        self.shell("wm", "size", "1200x1920")
        self.shell("wm", "density", "240")
        self.shell("settings", "put", "system", "font_scale", str(font_scale))
        self.shell("settings", "put", "system", "accelerometer_rotation", "0")
        self.shell("settings", "put", "system", "user_rotation", str(rotation))

    def reveal_control(self, label, name, forward=True):
        """Reach an off-screen action by scrolling the observed app ScrollView."""
        previous_content = None
        reversed_direction = False
        for attempt in range(7):
            tree = self.hierarchy()
            target = find_target(tree, label, self.package)
            area = bounds(target) if target is not None else None
            # UIAutomator clips an off-screen button's bounds. Keep scrolling
            # until a full usable touch target is visible, not just its label.
            minimum = 44 * self.current_density / 160 - 1
            if area and area[2] - area[0] >= minimum and area[3] - area[1] >= minimum:
                self.capture(name, self.last_xml)
                self.steps.append({"screen": name, "expected": [label], "bounds": bounds(target),
                                   "elapsedSeconds": round(time.monotonic() - self.started, 2)})
                return tree
            if attempt == 6:
                break
            scroll_views = [node for node in tree.iter("node") if node.get("package") == self.package
                            and node.get("scrollable") == "true" and bounds(node)]
            if not scroll_views:
                raise SmokeFailure(f"No observed scrollable content can reveal {label!r}")
            view = max(scroll_views, key=lambda node: (bounds(node)[2] - bounds(node)[0]) *
                                                     (bounds(node)[3] - bounds(node)[1]))
            content = tuple((tuple(labels(node)), bounds(node)) for node in view.iter("node")
                            if bounds(node) and any(labels(node)))
            if content == previous_content:
                # A first field can move below the fold at large font sizes.
                # If the preferred upward search is already at the top (or a
                # downward search at the bottom), use observed lack of movement
                # to reverse once. Never turn a missing/clipped target into a pass.
                if reversed_direction:
                    break
                forward = not forward
                reversed_direction = True
                self.note(f"Scroll boundary reached while finding {label!r}; reverse direction once")
            previous_content = content
            x1, y1, x2, y2 = bounds(view)
            margin = max(1, (y2 - y1) // 5)
            start, finish = (y2 - margin, y1 + margin) if forward else (y1 + margin, y2 - margin)
            self.shell("input", "swipe", (x1 + x2) // 2, start, (x1 + x2) // 2, finish, "400")
        raise SmokeFailure(f"Could not reach {label!r} within six bounded scroll gestures")

    def keyboard_state(self):
        output = self.shell("dumpsys", "window", "displays", timeout=6).decode(errors="replace")
        (self.artifacts / "latest-window-displays.txt").write_text(output)
        return ime_bounds(output), output

    def wait_keyboard(self, name, label, value, shown=True, action=None, timeout=30):
        end = min(self.deadline, time.monotonic() + timeout)
        last_error = "No keyboard observation returned"
        while time.monotonic() < end:
            try:
                tree = self.hierarchy()
                frame, window_dump = self.keyboard_state()
                if shown:
                    observation = keyboard_observation(tree, self.package, label, value, frame,
                                                       self.last_screen_size, self.current_density, action)
                else:
                    if frame is not None:
                        raise SmokeFailure("The software keyboard has not closed")
                    field = editable_field(tree, label, self.package)
                    if field.get("text", "") != value:
                        raise SmokeFailure(f"{label!r} lost its typed value after closing the keyboard")
                    observation = {"field": label, "value": value, "imeBounds": None,
                                   "tabs": navigation_bounds(tree, self.package, self.last_screen_size,
                                                             self.current_density)}
                self.capture(name, self.last_xml)
                (self.artifacts / f"{name}-window-displays.txt").write_text(window_dump)
                (self.artifacts / f"{name}-input-method.txt").write_bytes(
                    self.shell("dumpsys", "input_method", timeout=6))
                self.steps.append({"screen": name, "keyboardVisible": shown, **observation,
                                   "elapsedSeconds": round(time.monotonic() - self.started, 2)})
                return tree, observation
            except (SmokeFailure, ET.ParseError, subprocess.TimeoutExpired) as error:
                last_error = str(error)
            time.sleep(0.5)
        raise SmokeFailure(f"Timed out waiting for {name}. {last_error}")

    def close_keyboard(self, name, label, value):
        # Never send Back based only on a previous focus or stale screenshot.
        # If a gesture already dismissed the IME, do not navigate out of the app.
        if self.keyboard_state()[0] is not None:
            self.shell("input", "keyevent", "KEYCODE_BACK")
        return self.wait_keyboard(name, label, value, shown=False)

    def reveal_keyboard_action(self, name, label, value, action):
        # The large-text Assistant in run 41765883784 had Send at y695..772
        # behind an IME beginning at y720. Its expanded, keyboard-closed content
        # had no scroll range. Exercise the actual open-IME viewport instead.
        for attempt in range(7):
            tree = self.hierarchy()
            frame, _ = self.keyboard_state()
            field = keyboard_observation(tree, self.package, label, value, frame,
                                         self.last_screen_size, self.current_density)
            try:
                keyboard_observation(tree, self.package, label, value, frame,
                                     self.last_screen_size, self.current_density, action)
            except SmokeFailure:
                if attempt == 6:
                    break
            else:
                tree, observed = self.wait_keyboard(name, label, value, action=action)
                observed["scrollGestures"] = attempt
                self.steps[-1]["scrollGestures"] = attempt
                return tree, observed
            scroll_views = [node for node in tree.iter("node") if node.get("package") == self.package
                            and node.get("scrollable") == "true" and bounds(node)]
            if not scroll_views:
                raise SmokeFailure(f"No observed app scroll area can reveal {action!r} above the keyboard")
            view = max(scroll_views, key=lambda node: (bounds(node)[2] - bounds(node)[0]) *
                                                     (bounds(node)[3] - bounds(node)[1]))
            x1, y1, x2, view_bottom = bounds(view)
            y2 = min(view_bottom, frame[1])
            margin = max(1, (y2 - y1) // 5)
            start, limit = y2 - margin, y1 + margin
            field_area = field["fieldBounds"]
            available = min(start - limit, field_area[1] - y1 - 8 * self.current_density / 160)
            if available <= 0:
                raise SmokeFailure(f"Cannot reveal {action!r} while retaining the focused field above the keyboard")
            target = find_target(tree, action, self.package)
            area = bounds(target) if target is not None else None
            distance = max(64 * self.current_density / 160,
                           (area[3] - y2 if area else 0) + 12 * self.current_density / 160)
            finish = start - max(1, round(min(available, distance)))
            # Use observed gutter space when available, so a multiline editor
            # cannot consume this gesture as selection or internal text scrolling.
            x = (x1 + field_area[0]) // 2 if field_area[0] > x1 else (x1 + x2) // 2
            self.note(f"Scroll observed {action!r} above visible IME, attempt={attempt + 1}, ime={frame}")
            self.shell("input", "swipe", x, start, x, finish, "400")
        raise SmokeFailure(f"Could not reveal {action!r} above the open keyboard within six scroll gestures")

    def keyboard_case(self, name, label, value, action):
        # Fixed, non-secret fixtures only. No Enter/action/submit key is sent.
        if not re.fullmatch(r"[A-Za-z0-9@._-]+", value):
            raise SmokeFailure("Keyboard fixture must be plain ASCII text without control characters")
        tree = self.reveal_control(label, name + "-field", forward=False)
        before = editable_field(tree, label, self.package).get("text", "")
        if before:
            raise SmokeFailure(f"{label!r} must start empty in the isolated keyboard check")
        if not self.tap(self.hierarchy(), label):
            raise SmokeFailure(f"Could not focus {label!r}")
        self.wait_keyboard(name + "-opened", label, "")
        self.shell("input", "text", value)
        self.wait_keyboard(name + "-typed", label, value)
        _, observed = self.reveal_keyboard_action(name + "-action", label, value, action)
        _, restored = self.close_keyboard(name + "-closed", label, value)
        self.keyboard_cases.append({"name": name, "density": self.current_density,
                                    "displayPixels": self.last_screen_size, **observed,
                                    "restoredTabs": restored["tabs"]})

    def assistant_case(self, name, keyboard=False):
        tree = self.navigate_tab("Assistant", ["Onesa assistant", "Your message", "Send message"], name)
        send = [node for node in tree.iter("node") if node.get("package") == self.package
                and node.get("class") == "android.widget.Button" and "Send message" in labels(node)]
        if len(send) != 1 or send[0].get("enabled") != "false":
            raise SmokeFailure("Assistant must expose one disabled Send message button for an empty composer")
        self.reveal_control("Your message", name + "-composer")
        tree = self.reveal_control("Contact the team", name + "-contact")
        navigation_bounds(tree, self.package, self.last_screen_size, self.current_density)
        if keyboard:
            self.keyboard_case(name + "-keyboard", "Your message", "NativeInputCheck", "Send message")

    def responsive_case(self, name, rotation, font_scale):
        self.note(f"Tablet case {name}, rotation={rotation}, font_scale={font_scale}")
        self.configure_display(rotation, font_scale)
        orientation = "landscape" if rotation else "portrait"
        # Size, density and font changes may recreate the activity. Wait for an
        # actual enabled tab in the new orientation, handling observed developer
        # overlays, before deriving tap coordinates from a fresh hierarchy.
        self.wait_screen(name + "-display-ready", [], orientation=orientation, required_tabs=("Home",))
        if not self.tap(self.hierarchy(), "Home", tab=True):
            raise SmokeFailure("Home tab is unavailable after the display change")
        tree = self.wait_screen(name + "-home", ["Explore what connects us"], orientation=orientation)
        density = int(display_setting(self.shell("wm", "density").decode(), "density")["effective"])
        self.current_density = density
        tabs = navigation_bounds(tree, self.package, self.last_screen_size, density)
        self.layout_cases.append({"name": name, "orientation": orientation, "fontScale": font_scale,
                                  "displayPixels": self.last_screen_size, "density": density, "tabs": tabs})
        self.reveal_control("Search Diaspora Unlocked", name + "-home-search")
        self.navigate_tab("Travel", ["Travel"], name + "-travel")
        self.reveal_control("From airport code (e.g. FRA)", name + "-travel-form", forward=False)
        tree = self.reveal_control("Search providers", name + "-travel-action")
        navigation_bounds(tree, self.package, self.last_screen_size, density)
        tree = self.navigate_tab("Shop", ["Search products", "Filter by category"], name + "-shop")
        navigation_bounds(tree, self.package, self.last_screen_size, density)
        self.assistant_case(name + "-assistant", keyboard=font_scale > 1)
        tree = self.navigate_tab("Account", ["Account"], name + "-account")
        navigation_bounds(tree, self.package, self.last_screen_size, density)
        self.reveal_control("Email address", name + "-account-form", forward=False)
        self.reveal_control("Sign in", name + "-account-action")

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
        self.remember_display()
        self.enable_soft_keyboard()
        self.adb("logcat", "-c")
        self.start_metro()
        self.adb("reverse", "tcp:8081", "tcp:8081")
        self.reversed = True
        self.adb("install", "-r", str(self.apk), timeout=70)
        if self.shell("pm", "clear", self.package).decode().strip() != "Success":
            raise SmokeFailure("Could not clear test app data before launch")
        server = urllib.parse.quote("http://127.0.0.1:8081", safe="")
        # SDK58's ExpoLauncherUrl applies these reserved outer query params to
        # the development tools only. Keep their overlays from reopening when
        # Android recreates the activity for tablet density or font changes.
        self.launch(f"exp+{config['slug']}://expo-development-client/?url={server}"
                    "&__expo_disable_auto_launch=1&__expo_disable_fab=1&__expo_disable_onboarding=1")
        self.wait_screen("01-home", ["Explore what connects us", "Search Diaspora Unlocked"],
                         timeout=180, recover_boot_dialog=True)
        self.navigate_tab("Travel", ["Find options", "From airport code (e.g. FRA)"], "02-travel")
        self.navigate_tab("Shop", ["Search products", "Filter by category"], "03-shop")
        self.assistant_case("03-assistant")
        self.navigate_tab("Account", ["Welcome back", "Email address"], "04-account")
        self.keyboard_case("04-account-keyboard", "Email address", "keyboard-check@example.invalid", "Sign in")

        # Expo dev-client supports app-specific links only after the project is
        # open. Real cold email-link launch remains a release/device check.
        # The deliberately invalid token is never submitted to an API.
        self.launch(f"{config['scheme']}://reset-password?token=invalid-ci-smoke-token")
        self.wait_screen("05-reset-link", ["Choose a new password", "Back to sign in"])
        if not self.tap(self.hierarchy(), "Back to sign in"):
            raise SmokeFailure("Reset screen has no enabled Back to sign in action")
        self.wait_screen("06-reset-return", ["Welcome back", "Email address"])
        self.navigate_tab("Home", ["Explore what connects us"], "07-home-after-reset")
        self.responsive_case("08-tablet-portrait", rotation=0, font_scale=1.0)
        self.responsive_case("09-tablet-landscape", rotation=1, font_scale=1.0)
        self.responsive_case("10-tablet-large-text", rotation=1, font_scale=1.8)
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
        restore_errors = []
        commands = []
        if self.display_changed and self.display_state is not None:
            commands = [("wm", kind, self.display_state[kind]["override"] or "reset")
                        for kind in ("size", "density")]
            commands.extend(("settings", "delete", "system", key) if value == "null" else
                            ("settings", "put", "system", key, value)
                            for key, value in self.display_state["settings"].items())
        if self.keyboard_changed and self.display_state is not None:
            value = self.display_state["secureSettings"]["show_ime_with_hard_keyboard"]
            commands.append(("settings", "delete", "secure", "show_ime_with_hard_keyboard") if value == "null" else
                            ("settings", "put", "secure", "show_ime_with_hard_keyboard", value))
        for command in commands:
            try:
                self.shell(*command, timeout=5, diagnostic=True)
            except Exception as error:
                restore_errors.append(f"{shlex.join(command)}: {error}")
        if commands:
            (self.artifacts / "display-restoration.json").write_text(
                json.dumps({"restored": not restore_errors, "errors": restore_errors,
                            "keyboardSetting": self.display_state.get("secureSettings") if self.keyboard_changed else None},
                           indent=2) + "\n")
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
        return "Could not restore emulator display/keyboard settings: " + "; ".join(restore_errors) if restore_errors else None


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
        cleanup_error = runner.cleanup()
        error = error or cleanup_error
        result = {"passed": error is None, "error": error, "steps": runner.steps, "layoutCases": runner.layout_cases,
                  "keyboardCases": runner.keyboard_cases,
                  "elapsedSeconds": round(time.monotonic() - runner.started, 2),
                  "scope": "Android debug launch, all tab screens, warm reset link, tablet portrait/landscape, large text, form-action reachability and real keyboard focus/typing/action visibility; no submissions/cold standalone link/authenticated/provider/commerce journey"}
        (runner.artifacts / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    runner.note("PASS" if error is None else "FAIL; inspect Android smoke artifacts")
    return 0 if error is None else 1


if __name__ == "__main__":
    sys.exit(main())
