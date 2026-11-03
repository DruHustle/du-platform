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
        for label in ("✈ Travel", "Travel, tab, 3 of 5"):
            with self.subTest(label=label):
                button = node(clickable="true", **{"content-desc": label})
                self.assertIs(smoke.find_target(button, "Travel", PACKAGE, tab=True), button)

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


if __name__ == "__main__":
    unittest.main()
