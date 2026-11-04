"""Host-only smoke-runner regression checks; these do not execute an emulator."""

import importlib.util
import json
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


class DeveloperMenuTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory.name, apk=directory.name,
                                                         artifacts=directory.name))
        self.runner.package = PACKAGE
        self.addCleanup(self.runner.cleanup)
        for name in ("capture", "shell", "note"):
            mocked = patch.object(self.runner, name)
            setattr(self, name, mocked.start())
            self.addCleanup(mocked.stop)

    def native_menu(self):
        # Essential nodes from run 41751015388's final.xml. This is RN's native
        # AlertDialog, whose options are not Expo's clickable Compose buttons.
        tree = ET.Element("hierarchy")
        tree.append(node(text="React Native Dev Menu", bounds="[93,911][1347,1037]"))
        options = node(**{"resource-id": "android:id/select_dialog_listview",
                          "class": "android.widget.ListView", "bounds": "[93,1065][1347,2269]"})
        for label in ("Reload", "Open DevTools", "Change Bundle Location", "Toggle Element Inspector",
                      "Disable Fast Refresh", "Show Perf Monitor", "Settings"):
            options.append(node(text=label))
        tree.append(options)
        return tree

    def expo_menu(self, close=True, onboarding=True):
        tree = ET.Element("hierarchy")
        tree.append(node(text="Runtime version: exposdk:58.0.0"))
        if onboarding:
            tree.append(node(text="This is the developer menu. It gives you access to useful tools in your development builds."))
            button = node(clickable="true", bounds="[140,2727][1300,2895]")
            button.append(node(text="Continue"))
            tree.append(button)
        else:
            tree.append(node(text="Reload"))
        if close:
            button = node(clickable="true", bounds="[1209,2160][1377,2328]")
            button.append(node(**{"content-desc": "Close"}))
            tree.append(button)
        return tree

    def dismiss(self, tree):
        return self.runner.dismiss_developer_menu(tree, self.runner.visible_labels(tree))

    def test_observed_native_dialog_without_close_is_dismissed_with_back(self):
        tree = self.native_menu()
        self.assertTrue(self.dismiss(tree))
        self.shell.assert_called_once_with("input", "keyevent", "KEYCODE_BACK")
        self.capture.assert_called_once_with("developer-menu-back-0", None)
        self.assertEqual(self.runner.dismissals["Back"], 1)

    def test_onboarding_uses_observed_close_instead_of_opening_more_tools(self):
        self.assertTrue(self.dismiss(self.expo_menu()))
        self.shell.assert_called_once_with("input", "tap", 1293, 2244)
        self.assertEqual(self.runner.dismissals, {"Continue": 0, "Close": 1, "Back": 0})

    def test_finished_expo_menu_retains_close_support(self):
        self.assertTrue(self.dismiss(self.expo_menu(onboarding=False)))
        self.shell.assert_called_once_with("input", "tap", 1293, 2244)

    def test_unchanged_hierarchy_cannot_trigger_a_second_stale_tap(self):
        tree = self.expo_menu(close=False)
        self.assertTrue(self.dismiss(tree))
        self.assertTrue(self.dismiss(tree))
        self.shell.assert_called_once_with("input", "tap", 720, 2811)
        self.assertEqual(self.runner.dismissals["Continue"], 1)
        # A newly observed native dialog can then be handled independently.
        self.assertTrue(self.dismiss(self.native_menu()))
        self.assertEqual(self.shell.call_count, 2)
        self.shell.assert_called_with("input", "keyevent", "KEYCODE_BACK")

    def test_menu_recognition_never_backs_out_of_ordinary_app_content(self):
        for text in ("Home", "Reload", "React Native Dev Menu", "Close"):
            tree = ET.Element("hierarchy")
            tree.append(node(text=text, clickable="true"))
            self.assertFalse(self.dismiss(tree))
        tree = self.native_menu()
        for item in tree.iter("node"):
            item.set("package", "com.android.settings")
        self.assertFalse(self.dismiss(tree))
        self.shell.assert_not_called()
        self.capture.assert_not_called()

    def test_repeated_menu_reappearance_remains_bounded(self):
        for _ in range(2):
            self.assertTrue(self.dismiss(self.native_menu()))
            self.assertFalse(self.dismiss(node(text="Explore what connects us")))
        with self.assertRaisesRegex(smoke.SmokeFailure, "more than two Back"):
            self.dismiss(self.native_menu())
        self.assertEqual(self.shell.call_count, 2)

    def test_display_wait_handles_recreated_menu_before_accepting_an_enabled_home_tab(self):
        # Run 41756008487 recreated Expo's onboarding sheet at tablet density.
        menu = self.expo_menu()
        smoke.find_target(menu, "Close", PACKAGE).set("bounds", "[1101,1548][1173,1620]")
        disabled = node(text="Home", clickable="true", enabled="false")
        ready = node(text="Home", clickable="true", bounds="[0,1800][240,1884]")
        self.capture.side_effect = lambda *args: setattr(self.runner, "last_screen_size", (1200, 1920))
        with patch.object(self.runner, "hierarchy", side_effect=[ET.Element("hierarchy"), disabled, menu, ready]), \
             patch.object(smoke.time, "sleep"):
            observed = self.runner.wait_screen("tablet-display-ready", [], orientation="portrait", required_tabs=("Home",))
        self.assertIs(observed, ready)
        self.shell.assert_called_once_with("input", "tap", 1137, 1584)
        self.assertEqual(self.runner.steps[-1]["requiredTabs"], ["Home"])


class ScrollReachabilityTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory.name, apk=directory.name,
                                                         artifacts=directory.name))
        self.runner.package = PACKAGE
        self.runner.current_density = 240
        self.addCleanup(self.runner.cleanup)
        for name in ("capture", "shell", "note"):
            mocked = patch.object(self.runner, name)
            setattr(self, name, mocked.start())
            self.addCleanup(mocked.stop)

    def scroll_view(self, marker_y=150, target_bounds=None):
        view = node(scrollable="true", bounds="[0,100][800,1100]", **{"class": "android.widget.ScrollView"})
        view.append(node(text="Find options", bounds=f"[20,{marker_y}][780,{marker_y + 50}]"))
        if target_bounds:
            view.append(node(clickable="true", bounds=target_bounds,
                             **{"content-desc": "From airport code (e.g. FRA)"}))
        return view

    def test_first_field_below_fold_is_found_after_reversing_at_observed_top_boundary(self):
        top = self.scroll_view()
        revealed = self.scroll_view(marker_y=100, target_bounds="[20,600][780,680]")
        with patch.object(self.runner, "hierarchy", side_effect=[top, top, revealed]):
            tree = self.runner.reveal_control("From airport code (e.g. FRA)", "large-text-form", forward=False)
        self.assertIs(tree, revealed)
        swipes = [call.args for call in self.shell.call_args_list]
        self.assertEqual(swipes, [("input", "swipe", 400, 300, 400, 900, "400"),
                                 ("input", "swipe", 400, 900, 400, 300, "400")])
        self.assertEqual(self.runner.steps[-1]["bounds"], (20, 600, 780, 680))

    def test_clipped_field_never_passes_and_scroll_search_stays_bounded(self):
        trees = [self.scroll_view(marker_y=150 + (index % 2) * 100, target_bounds="[20,1080][780,1100]")
                 for index in range(7)]
        with patch.object(self.runner, "hierarchy", side_effect=trees), \
             self.assertRaisesRegex(smoke.SmokeFailure, "within six bounded scroll gestures"):
            self.runner.reveal_control("From airport code (e.g. FRA)", "clipped-field", forward=False)
        self.assertEqual(self.shell.call_count, 6)
        self.capture.assert_not_called()
        self.assertEqual(self.runner.steps, [])

    def test_action_position_requires_the_observed_keyboard_clearance(self):
        covered = self.scroll_view(target_bounds="[20,900][780,980]")
        revealed = self.scroll_view(marker_y=100, target_bounds="[20,650][780,730]")
        with patch.object(self.runner, "hierarchy", side_effect=[covered, revealed]):
            self.runner.reveal_control("From airport code (e.g. FRA)", "position-before-ime", bottom_limit=800)
        swipe = self.shell.call_args.args
        self.assertEqual(swipe[:2], ("input", "swipe"))
        self.assertGreater(swipe[3], swipe[5])
        self.assertTrue(100 < swipe[5] < swipe[3] < 800)
        self.assertEqual(self.runner.steps[-1]["bounds"], (20, 650, 780, 730))


class KeyboardEvidenceTests(unittest.TestCase):
    @staticmethod
    def window_dump(visible="true", frame="[0,800][800,1200]"):
        # Format from Android 16 InsetsSource.dump(), the pinned emulator API.
        return ("WINDOW MANAGER DISPLAY CONTENTS\nDisplay: mDisplayId=0\n"
                "  WindowInsetsStateController\n  InsetsState\n"
                f"    InsetsSource id=3 type=ime frame={frame} visible={visible} flags= sideHint=BOTTOM\n")

    @staticmethod
    def app_tree(value="NativeInputCheck", focused="true", field_bounds="[20,420][780,500]",
                 action_bounds="[20,600][780,680]"):
        tree = ET.Element("hierarchy")
        tree.append(node(text="Your message", **{"class": "android.widget.TextView"}))
        tree.append(node(text=value, focused=focused, clickable="true", bounds=field_bounds,
                         **{"class": "android.widget.EditText", "content-desc": "Your message"}))
        tree.append(node(clickable="true", bounds=action_bounds,
                         **{"class": "android.widget.Button", "content-desc": "Send message"}))
        return tree

    def test_ime_requires_visible_insets_on_the_default_display(self):
        frame = (0, 800, 800, 1200)
        self.assertEqual(smoke.ime_bounds(self.window_dump()), frame)
        self.assertEqual(smoke.ime_bounds(self.window_dump().replace(" visible=", " visibleFrame=[0,800][800,1200] visible=")), frame)
        self.assertIsNone(smoke.ime_bounds(self.window_dump(visible="false")))
        history = "  mInputShown=true mRequestedVisibleTypes=ime\n  history: InsetsSource id=3 type=ime frame=[0,800][800,1200] visible=true\n"
        self.assertIsNone(smoke.ime_bounds("Display: mDisplayId=0\n" + history))
        other_display = self.window_dump().replace("mDisplayId=0", "mDisplayId=1")
        self.assertIsNone(smoke.ime_bounds(self.window_dump(visible="false") + other_display))

    def test_unknown_ambiguous_and_invalid_insets_cannot_claim_a_keyboard(self):
        with self.assertRaisesRegex(smoke.SmokeFailure, "default display"):
            smoke.ime_bounds("mInputShown=true")
        with self.assertRaisesRegex(smoke.SmokeFailure, "invalid bounds"):
            smoke.ime_bounds(self.window_dump(frame="[0,800][0,800]"))
        conflicting = self.window_dump() + "  InsetsSource id=4 type=ime frame=[0,700][800,1200] visible=true\n"
        with self.assertRaisesRegex(smoke.SmokeFailure, "Ambiguous"):
            smoke.ime_bounds(conflicting)

    def observe(self, tree=None, frame=(0, 800, 800, 1200)):
        return smoke.keyboard_observation(self.app_tree() if tree is None else tree, PACKAGE,
                                          "Your message", "NativeInputCheck", frame, (800, 1200), 240,
                                          "Send message")

    def test_keyboard_proof_requires_focused_typed_app_field_and_full_action(self):
        proof = self.observe()
        self.assertEqual(proof["fieldBounds"], (20, 420, 780, 500))
        self.assertEqual(proof["actionBounds"], (20, 600, 780, 680))
        for tree in (self.app_tree(value=""), self.app_tree(focused="false")):
            with self.subTest(tree=ET.tostring(tree)), self.assertRaisesRegex(smoke.SmokeFailure, "focused text"):
                self.observe(tree)
        with self.assertRaisesRegex(smoke.SmokeFailure, "not visibly open"):
            self.observe(frame=None)
        with self.assertRaisesRegex(smoke.SmokeFailure, "outside"):
            self.observe(frame=(0, 800, 900, 1200))

    def test_occluded_clipped_missing_and_disabled_controls_fail(self):
        bad = [self.app_tree(field_bounds="[20,780][780,860]"),
               self.app_tree(action_bounds="[20,740][780,820]"),
               self.app_tree(action_bounds="[20,740][780,770]")]
        disabled = self.app_tree()
        disabled[-1].set("enabled", "false")
        bad.append(disabled)
        missing = self.app_tree()
        missing.remove(missing[-1])
        bad.append(missing)
        for tree in bad:
            with self.subTest(tree=ET.tostring(tree)), self.assertRaisesRegex(smoke.SmokeFailure, "44dp target above"):
                self.observe(tree)
        wrong_package = self.app_tree()
        wrong_package[1].set("package", "com.android.inputmethod.latin")
        with self.assertRaisesRegex(smoke.SmokeFailure, "editable"):
            self.observe(wrong_package)

    def runner(self, directory):
        runner = smoke.AndroidSmoke(SimpleNamespace(mobile_dir=directory, apk=directory, artifacts=directory))
        runner.package = PACKAGE
        runner.current_density = 240
        runner.last_screen_size = (800, 1200)
        return runner

    def test_wait_does_not_accept_focus_and_typing_without_a_visible_keyboard(self):
        with TemporaryDirectory() as directory:
            runner = self.runner(directory)
            try:
                with patch.object(runner, "hierarchy", return_value=self.app_tree()), \
                     patch.object(runner, "keyboard_state", side_effect=[(None, "hidden"), ((0, 800, 800, 1200), "visible")]), \
                     patch.object(runner, "capture") as capture, patch.object(runner, "shell", return_value=b"IME details"), \
                     patch.object(smoke.time, "sleep"):
                    _, proof = runner.wait_keyboard("typed-ime", "Your message", "NativeInputCheck", action="Send message")
                capture.assert_called_once_with("typed-ime", None)
                self.assertEqual(proof["imeBounds"], (0, 800, 800, 1200))
                self.assertTrue(runner.steps[-1]["keyboardVisible"])
                self.assertEqual((Path(directory) / "typed-ime-window-displays.txt").read_text(), "visible")
            finally:
                runner.cleanup()

    def test_already_closed_keyboard_never_sends_back_into_navigation(self):
        with TemporaryDirectory() as directory:
            runner = self.runner(directory)
            try:
                with patch.object(runner, "keyboard_state", return_value=(None, "hidden")), \
                     patch.object(runner, "wait_keyboard") as wait, patch.object(runner, "shell") as shell:
                    runner.close_keyboard("closed", "Your message", "NativeInputCheck")
                shell.assert_not_called()
                wait.assert_called_once_with("closed", "Your message", "NativeInputCheck", shown=False)
            finally:
                runner.cleanup()

    def test_keyboard_case_types_fixture_without_submitting_and_records_real_action_proof(self):
        with TemporaryDirectory() as directory:
            runner = self.runner(directory)
            empty = self.app_tree(value="", focused="false")
            typed = self.app_tree()
            proof = self.observe(typed)
            try:
                with patch.object(runner, "reveal_control", return_value=empty), \
                     patch.object(runner, "hierarchy", return_value=empty), \
                     patch.object(runner, "tap", return_value=True), \
                     patch.object(runner, "wait_keyboard", side_effect=[(typed, {}), (typed, proof), (typed, proof)]), \
                     patch.object(runner, "close_keyboard", return_value=(typed, {"tabs": {"Home": (0, 1100, 160, 1180)}})), \
                     patch.object(runner, "shell", return_value=b"") as shell:
                    runner.keyboard_case("composer-ime", "Your message", "NativeInputCheck", "Send message")
                shell.assert_called_once_with("input", "text", "NativeInputCheck")
                self.assertEqual(runner.keyboard_cases[0]["actionBounds"], (20, 600, 780, 680))
            finally:
                runner.cleanup()

    def test_covered_action_positioning_cannot_pass_if_reopened_keyboard_is_hidden(self):
        with TemporaryDirectory() as directory:
            runner = self.runner(directory)
            empty = self.app_tree(value="", focused="false")
            covered = self.app_tree(action_bounds="[20,780][780,860]")
            field_proof = smoke.keyboard_observation(covered, PACKAGE, "Your message", "NativeInputCheck",
                                                     (0, 800, 800, 1200), (800, 1200), 240)
            try:
                with patch.object(runner, "reveal_control", return_value=empty) as reveal, \
                     patch.object(runner, "hierarchy", return_value=empty), \
                     patch.object(runner, "tap", return_value=True) as tap, \
                     patch.object(runner, "wait_keyboard", side_effect=[(covered, {}), (covered, field_proof),
                                 smoke.SmokeFailure("The software keyboard is not visibly open")]), \
                     patch.object(runner, "close_keyboard") as close, \
                     patch.object(runner, "shell", return_value=b"") as shell:
                    with self.assertRaisesRegex(smoke.SmokeFailure, "not visibly open"):
                        runner.keyboard_case("composer-ime", "Your message", "NativeInputCheck", "Send message")
                self.assertEqual(reveal.call_args.kwargs["bottom_limit"], 800)
                self.assertEqual([call.args[1] for call in tap.call_args_list], ["Your message", "Your message"])
                close.assert_called_once_with("composer-ime-positioning", "Your message", "NativeInputCheck")
                shell.assert_called_once_with("input", "text", "NativeInputCheck")
                self.assertEqual(runner.keyboard_cases, [])
            finally:
                runner.cleanup()

    def test_secure_keyboard_setting_restores_even_before_any_display_case(self):
        for original in ("null", "0", "1"):
            with self.subTest(original=original), TemporaryDirectory() as directory:
                runner = self.runner(directory)
                runner.keyboard_changed = True
                runner.display_state = {"secureSettings": {"show_ime_with_hard_keyboard": original}}
                with patch.object(runner, "shell", return_value=b"") as shell:
                    self.assertIsNone(runner.cleanup())
                expected = ("settings", "delete", "secure", "show_ime_with_hard_keyboard") if original == "null" else \
                           ("settings", "put", "secure", "show_ime_with_hard_keyboard", original)
                self.assertEqual(shell.call_args.args, expected)
                restored = json.loads((Path(directory) / "display-restoration.json").read_text())
                self.assertTrue(restored["restored"])
                self.assertEqual(restored["keyboardSetting"]["show_ime_with_hard_keyboard"], original)

    def test_failed_keyboard_enable_still_restores_the_saved_value(self):
        with TemporaryDirectory() as directory:
            runner = self.runner(directory)
            runner.device_ready = True
            runner.display_state = {"secureSettings": {"show_ime_with_hard_keyboard": "0"}}
            with patch.object(runner, "shell", side_effect=[RuntimeError("setting failed"), b""]) as shell:
                with self.assertRaisesRegex(RuntimeError, "setting failed"):
                    runner.enable_soft_keyboard()
                self.assertIsNone(runner.cleanup())
            self.assertEqual(shell.call_args.args, ("settings", "put", "secure", "show_ime_with_hard_keyboard", "0"))


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
            runner.keyboard_changed = True
            runner.display_state = {"size": {"override": None}, "density": {"override": None}, "settings": {"font_scale": "1"},
                                    "secureSettings": {"show_ime_with_hard_keyboard": "0"}}
            with patch.object(runner, "shell", side_effect=[RuntimeError("test failure"), b"", b"", b""]) as shell:
                self.assertIn("Could not restore", runner.cleanup())
            self.assertEqual(shell.call_count, 4)
            self.assertEqual(shell.call_args.args, ("settings", "put", "secure", "show_ime_with_hard_keyboard", "0"))


if __name__ == "__main__":
    unittest.main()
