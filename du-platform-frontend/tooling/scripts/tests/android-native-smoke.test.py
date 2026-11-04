"""Host-only smoke-runner regression checks; these do not execute an emulator."""

import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET


SPEC = importlib.util.spec_from_file_location("android_smoke", Path(__file__).with_name("android-native-smoke.py"))
smoke = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smoke)
PACKAGE = "com.diasporaunlocked.app"


def node(**attrs):
    return ET.Element("node", {"package": PACKAGE, "enabled": "true", "clickable": "false",
                               "bounds": "[0,0][100,40]", **attrs})


class SelectorTests(unittest.TestCase):
    def test_label_uses_observed_clickable_parent_and_ignores_heading(self):
        tree = ET.Element("hierarchy")
        tree.append(node(text="Travel"))
        button = node(clickable="true", bounds="[80,700][160,760]")
        button.append(node(text="Travel", bounds="[85,720][155,745]"))
        tree.append(button)
        self.assertIs(smoke.find_target(tree, "Travel", PACKAGE, tab=True), button)
        self.assertEqual(smoke.bounds(button), (80, 700, 160, 760))

    def test_merged_tab_accessibility_labels(self):
        for label in ("✈ Travel", "✈, Travel", "Travel, tab, 3 of 5"):
            with self.subTest(label=label):
                button = node(clickable="true", **{"content-desc": label})
                self.assertIs(smoke.find_target(button, "Travel", PACKAGE, tab=True), button)

    def test_travel_tab_does_not_match_observed_explore_travel_action(self):
        # Regression from the first rendered CI Home hierarchy: both labels end
        # in Travel, but only the tab has an icon/punctuation prefix.
        tree = ET.Element("hierarchy")
        action = node(clickable="true", bounds="[116,2241][1325,2409]",
                      **{"content-desc": "Explore Travel"})
        action.append(node(text="Explore Travel"))
        tree.append(action)
        tab = node(clickable="true", bounds="[576,2866][864,3036]",
                   **{"content-desc": "✈, Travel"})
        tab.append(node(text="Travel"))
        tree.append(tab)
        self.assertIs(smoke.find_target(tree, "Travel", PACKAGE, tab=True), tab)

    def test_duplicate_text_and_description_resolve_one_button(self):
        button = node(clickable="true", **{"content-desc": "Continue"})
        button.append(node(text="Continue"))
        self.assertIs(smoke.find_target(button, "Continue", PACKAGE), button)

    def test_ambiguous_buttons_fail_without_arbitrary_tap(self):
        tree = ET.Element("hierarchy")
        tree.append(node(text="Continue", clickable="true"))
        tree.append(node(text="Continue", clickable="true", bounds="[0,50][100,90]"))
        with self.assertRaisesRegex(smoke.SmokeFailure, "Ambiguous"):
            smoke.find_target(tree, "Continue", PACKAGE)

    def test_disabled_other_app_and_empty_bounds_cannot_be_tapped(self):
        for attrs in ({"enabled": "false"}, {"package": "com.android.settings"},
                      {"bounds": "[0,0][0,0]"}, {"bounds": "invalid"}):
            with self.subTest(attrs=attrs):
                button = node(text="Continue", clickable="true", **attrs)
                self.assertIsNone(smoke.find_target(button, "Continue", PACKAGE))


class EnvironmentTests(unittest.TestCase):
    def test_real_api_origin_is_rejected_before_metro_starts(self):
        with TemporaryDirectory() as directory:
            runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory, apk=directory,
                                                        artifacts=directory))
            try:
                with patch.dict(smoke.os.environ, {"EXPO_PUBLIC_API_URL": "https://example.com/api"}), \
                     patch.object(smoke.subprocess, "Popen") as start:
                    with self.assertRaisesRegex(smoke.SmokeFailure, r"\.invalid"):
                        runner.start_metro()
                    start.assert_not_called()
            finally:
                runner.cleanup()


class ResponsiveEvidenceTests(unittest.TestCase):
    def test_display_overrides_are_read_without_losing_original_values(self):
        self.assertEqual(smoke.display_setting("Physical size: 1440x3120\nOverride size: 1200x1920", "size"),
                         {"physical": "1440x3120", "override": "1200x1920", "effective": "1200x1920"})
        self.assertEqual(smoke.display_setting("Physical density: 560", "density"),
                         {"physical": "560", "override": None, "effective": "560"})
        with self.assertRaisesRegex(smoke.SmokeFailure, "Could not read"):
            smoke.display_setting("Error: display unavailable", "size")

    def test_screenshot_dimensions_use_real_png_header(self):
        data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR" + (1920).to_bytes(4, "big") + (1200).to_bytes(4, "big")
        self.assertEqual(smoke.png_size(data), (1920, 1200))
        for invalid in (b"not an image", data[:20], data[:16] + b"\x00" * 8):
            with self.subTest(invalid=invalid), self.assertRaises(smoke.SmokeFailure):
                smoke.png_size(invalid)

    def tabs(self, height=80):
        tree = ET.Element("hierarchy")
        for index, label in enumerate(("Home", "Shop", "Travel", "Assistant", "Account")):
            tree.append(node(text=label, clickable="true",
                             bounds=f"[{index * 160},1120][{(index + 1) * 160},{1120 + height}]"))
        return tree

    def test_real_bounds_require_visible_nonoverlapping_large_enough_tabs(self):
        self.assertEqual(len(smoke.navigation_bounds(self.tabs(), PACKAGE, (800, 1200), 240)), 5)
        with self.assertRaisesRegex(smoke.SmokeFailure, "44dp"):
            smoke.navigation_bounds(self.tabs(height=50), PACKAGE, (800, 1200), 240)
        with self.assertRaisesRegex(smoke.SmokeFailure, "outside"):
            smoke.navigation_bounds(self.tabs(), PACKAGE, (799, 1200), 240)
        overlapping = self.tabs()
        overlapping[1].set("bounds", "[140,1120][320,1200]")
        with self.assertRaisesRegex(smoke.SmokeFailure, "overlap"):
            smoke.navigation_bounds(overlapping, PACKAGE, (800, 1200), 240)
        missing = self.tabs()
        missing.remove(missing[-1])
        with self.assertRaisesRegex(smoke.SmokeFailure, "Account"):
            smoke.navigation_bounds(missing, PACKAGE, (800, 1200), 240)

    def test_cleanup_restores_saved_display_and_settings_after_a_failure(self):
        with TemporaryDirectory() as directory:
            runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory, apk=directory, artifacts=directory))
            runner.display_changed = True
            runner.display_state = {"size": {"override": "1080x1920"}, "density": {"override": None},
                                    "settings": {"font_scale": "1.15", "accelerometer_rotation": "1", "user_rotation": "null"}}
            with patch.object(runner, "shell", return_value=b"") as shell:
                self.assertIsNone(runner.cleanup())
            commands = [call.args for call in shell.call_args_list]
            self.assertEqual(commands, [("wm", "size", "1080x1920"), ("wm", "density", "reset"),
                                        ("settings", "put", "system", "font_scale", "1.15"),
                                        ("settings", "put", "system", "accelerometer_rotation", "1"),
                                        ("settings", "delete", "system", "user_rotation")])

    def test_failed_restoration_is_reported_and_remaining_settings_still_restore(self):
        with TemporaryDirectory() as directory:
            runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory, apk=directory, artifacts=directory))
            runner.display_changed = True
            runner.display_state = {"size": {"override": None}, "density": {"override": None}, "settings": {"font_scale": "1"}}
            with patch.object(runner, "shell", side_effect=[RuntimeError("test failure"), b"", b""]) as shell:
                self.assertIn("Could not restore", runner.cleanup())
            self.assertEqual(shell.call_count, 3)


if __name__ == "__main__":
    unittest.main()
