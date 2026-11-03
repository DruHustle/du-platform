import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

MANAGER = Path("deploy/oracle/manage-images.py").resolve()
SOURCE = "https://github.com/DruHustle/du-platform"
CURRENT = "sha256:" + "a" * 64
PREVIOUS = "sha256:" + "b" * 64
OLD = "sha256:" + "c" * 64
NEW = "sha256:" + "d" * 64
DANGLING = "sha256:" + "e" * 64
FOREIGN = "sha256:" + "f" * 64

# Stateful Docker fixture: exercise the real CLI and image/tag lifecycle without
# access to any real daemon. Inspect/list failures and removal conflicts are real
# subprocess failures, so fail-closed behavior is covered too.
DOCKER = r'''
import json, os, sys
from pathlib import Path
path = Path(os.environ["DOCKER_FIXTURE"])
state = json.loads(path.read_text())
args = sys.argv[1:]
state.setdefault("commands", []).append(args)
def save(): path.write_text(json.dumps(state))
def finish(code=0): save(); sys.exit(code)
def resolve(ref):
    for identity, image in state["images"].items():
        if ref == identity or ref in image["tags"]: return identity
    finish(1)
if state.get("fail") and args[:len(state["fail"])] == state["fail"]: finish(1)
if args[:2] == ["image", "inspect"]:
    print(resolve(args[-1])); finish()
if args[:2] == ["container", "ls"]:
    print("\n".join(state.get("containers", {}))); finish()
if args[:2] == ["container", "inspect"]:
    print("\n".join(state["containers"][ref] for ref in args[4:])); finish()
if args[:2] == ["image", "ls"]:
    if "--format" in args:
        for identity, image in state["images"].items():
            for tag in image["tags"] or ["<none>:<none>"]:
                repo, tag = tag.rsplit(":", 1)
                print(json.dumps(dict(ID=identity, Repository=repo, Tag=tag)))
    elif "--filter" in args:
        assert args[-1] == "label=org.opencontainers.image.source=" + os.environ["DU_SOURCE"]
        print("\n".join(identity for identity, image in state["images"].items() if image.get("owned")))
    else:
        for identity, image in state["images"].items():
            if args[-1] in image["tags"]: print(identity)
    finish()
if args[:2] == ["image", "rm"]:
    assert args[2] == "--no-prune" and len(args) == 4
    identity = resolve(args[-1])
    assert identity not in state.get("containers", {}).values()
    if args[-1] == identity:
        assert not state["images"][identity]["tags"]
        del state["images"][identity]
    else:
        state["images"][identity]["tags"].remove(args[-1])
        if not state["images"][identity]["tags"]: del state["images"][identity]
    finish()
if args[:2] == ["image", "tag"]:
    identity = resolve(args[2])
    for image in state["images"].values():
        if args[3] in image["tags"]: image["tags"].remove(args[3])
    state["images"][identity]["tags"].append(args[3]); finish()
if args[0] == "build":
    tag = args[args.index("-t") + 1]
    identity = state["build_id"]
    for image in state["images"].values():
        if tag in image["tags"]: image["tags"].remove(tag)
    state["images"].setdefault(identity, dict(tags=[], owned=True))["tags"].append(tag)
    finish()
raise AssertionError(args)
'''


class ImageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="du-images-")
        self.root = Path(self.temporary.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.manager = self.root / "deploy/oracle/manage-images.py"
        self.manager.parent.mkdir(parents=True)
        shutil.copyfile(MANAGER, self.manager)
        docker = self.bin / "docker"
        docker.write_text("#!" + sys.executable + "\n" + DOCKER)
        docker.chmod(0o755)
        git = self.bin / "git"
        git.write_text("#!/bin/sh\nprintf '%s\\n' '" + "a" * 40 + "'\n")
        git.chmod(0o755)
        self.path = self.root / "state.json"
        self.state = dict(images={}, containers={}, build_id=NEW)
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"], DOCKER_FIXTURE=str(self.path), DU_SOURCE=SOURCE)

    def tearDown(self):
        self.temporary.cleanup()

    def image(self, identity, *tags, owned=True):
        self.state["images"][identity] = dict(tags=list(tags), owned=owned)

    def run_cli(self, *args, expected=0):
        self.path.write_text(json.dumps(self.state))
        result = subprocess.run([sys.executable, str(self.manager), *args], env=self.env, capture_output=True, text=True)
        self.state = json.loads(self.path.read_text())
        self.assertEqual(result.returncode, expected, result.stderr)
        return result

    def removed(self):
        return [command[-1] for command in self.state.get("commands", []) if command[:2] == ["image", "rm"]]

    def test_cleanup_preserves_current_previous_and_all_container_images(self):
        self.image(CURRENT, "du-platform:current", "du-platform:alias")
        self.image(PREVIOUS, "du-platform:previous")
        self.image(OLD, "du-platform:old", owned=False)  # Legacy tagged release.
        self.image(NEW, "du-platform:running")
        self.image(DANGLING, "du-platform:stopped")
        self.state["containers"] = dict(running=NEW, stopped=DANGLING)
        self.run_cli("cleanup", "--keep", "du-platform:current", "--keep", "du-platform:previous")
        self.assertEqual(self.removed(), ["du-platform:old"])
        self.assertEqual(set(self.state["images"]), {CURRENT, PREVIOUS, NEW, DANGLING})

    def test_only_owned_dangling_and_exact_du_tags_are_removed(self):
        self.image(CURRENT, "du-platform:current")
        self.image(OLD, "du-platform:old", "sibling:shared", owned=False)
        self.image(DANGLING)
        self.image(FOREIGN, owned=False)
        self.image(NEW, "du-platform-other:old", owned=True)
        self.run_cli("cleanup", "--keep", "du-platform:current")
        self.assertEqual(set(self.removed()), {"du-platform:old", DANGLING})
        self.assertEqual(self.state["images"][OLD]["tags"], ["sibling:shared"])
        self.assertIn(FOREIGN, self.state["images"])
        self.assertIn(NEW, self.state["images"])

    def test_retained_image_identity_is_protected_when_untagged(self):
        self.image(CURRENT, "du-platform:current")
        self.image(PREVIOUS)
        self.image(DANGLING)
        self.run_cli("cleanup", "--keep", "du-platform:current", "--keep", PREVIOUS)
        self.assertEqual(self.removed(), [DANGLING])

    def test_missing_keep_or_failed_inventory_never_removes_images(self):
        self.image(CURRENT, "du-platform:current")
        self.image(OLD, "du-platform:old")
        self.run_cli("cleanup", "--keep", "du-platform:missing", expected=1)
        self.assertEqual(self.removed(), [])
        for command in [["container", "ls"], ["container", "inspect"], ["image", "ls"]]:
            self.state["fail"] = command
            self.state["containers"] = dict(stopped=CURRENT)
            self.run_cli("cleanup", "--keep", "du-platform:current", expected=1)
            self.assertEqual(self.removed(), [])
        self.run_cli("cleanup", expected=2)
        self.assertEqual(self.removed(), [])

    def test_dry_run_and_repeated_cleanup(self):
        self.image(CURRENT, "du-platform:current")
        self.image(OLD, "du-platform:old")
        result = self.run_cli("cleanup", "--keep", "du-platform:current", "--dry-run")
        self.assertIn("Would remove du-platform:old", result.stdout)
        self.assertEqual(self.removed(), [])
        self.run_cli("cleanup", "--keep", "du-platform:current")
        self.state["commands"] = []
        self.run_cli("cleanup", "--keep", "du-platform:current")
        self.assertEqual(self.removed(), [])

    def test_removal_failure_reports_failure_and_preserves_image(self):
        self.image(CURRENT, "du-platform:current")
        self.image(OLD, "du-platform:old")
        self.state["fail"] = ["image", "rm"]
        result = self.run_cli("cleanup", "--keep", "du-platform:current", expected=1)
        self.assertIn("could not be removed", result.stderr)
        self.assertIn(OLD, self.state["images"])

    def test_local_build_rotates_previous_and_removes_superseded_images(self):
        self.image(CURRENT, "du-platform:local")
        self.image(PREVIOUS, "du-platform:local-previous")
        self.run_cli("build-local")
        self.assertEqual(self.state["images"][NEW]["tags"], ["du-platform:local"])
        self.assertEqual(self.state["images"][CURRENT]["tags"], ["du-platform:local-previous"])
        self.assertNotIn(PREVIOUS, self.state["images"])
        build = next(command for command in self.state["commands"] if command[0] == "build")
        self.assertIn("APP_REVISION=" + "a" * 40, build)
        self.state["commands"] = []
        self.run_cli("build-local")  # Cached/repeated build must keep rollback.
        self.assertIn(CURRENT, self.state["images"])
        self.assertEqual(self.removed(), [])

    def test_first_local_build_does_not_require_a_previous_image(self):
        self.run_cli("build-local")
        self.assertEqual(set(self.state["images"]), {NEW})

    def test_failed_build_does_not_rotate_or_clean_any_images(self):
        self.image(CURRENT, "du-platform:local")
        self.image(PREVIOUS, "du-platform:local-previous")
        self.state["fail"] = ["build"]
        self.run_cli("build-local", expected=1)
        self.assertEqual(self.removed(), [])
        self.assertFalse(any(command[:2] == ["image", "tag"] for command in self.state["commands"]))
        self.assertEqual(self.state["images"][PREVIOUS]["tags"], ["du-platform:local-previous"])

    def test_local_maintenance_failure_keeps_successful_build(self):
        self.image(CURRENT, "du-platform:local")
        self.state["fail"] = ["image", "tag"]
        result = self.run_cli("build-local")
        self.assertIn("WARNING: Local image built", result.stderr)
        self.assertIn(CURRENT, self.state["images"])
        self.assertIn(NEW, self.state["images"])
        self.assertEqual(self.removed(), [])


if __name__ == "__main__":
    unittest.main()
