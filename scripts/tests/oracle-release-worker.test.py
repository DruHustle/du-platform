import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker", Path(__file__).resolve().parents[2] / "deploy/oracle/poll-release.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.run = dict(id=1, head_sha="a" * 40, event="push", head_branch="main", status="in_progress", head_repository=dict(full_name=worker.REPOSITORY), path=".github/workflows/ci-cd.yml")
        self.jobs = [dict(name="Build and Test (22.x)", conclusion="success"), dict(name="Deploy to Oracle (Production)", status="in_progress", steps=[dict(name=worker.WAIT_STEP, status="in_progress")])]

    def eligible(self):
        return worker.eligible_release([self.run], lambda _: self.jobs)

    def test_accepts_only_tested_main_release_waiting_in_ci(self):
        self.assertEqual(self.eligible(), "a" * 40)

    def test_rejects_forks_pull_requests_wrong_branch_and_completed_runs(self):
        original = copy.deepcopy(self.run)
        for key, value in [("head_repository", dict(full_name="attacker/du-platform")), ("event", "pull_request"), ("head_branch", "feature"), ("status", "completed"), ("head_sha", "main; id"), ("path", ".github/workflows/other.yml")]:
            self.run = {**original, key: value}
            self.assertIsNone(self.eligible())

    def test_never_releases_failed_or_unfinished_checks(self):
        for result in [None, "failure", "cancelled", "skipped"]:
            self.jobs[0]["conclusion"] = result
            self.assertIsNone(self.eligible())
        self.jobs = self.jobs[1:]
        self.assertIsNone(self.eligible())

    def test_does_not_release_without_an_active_oracle_wait_step(self):
        self.jobs[1]["steps"][0]["status"] = "completed"
        self.assertIsNone(self.eligible())
        self.jobs[1]["steps"] = []
        self.assertIsNone(self.eligible())


if __name__ == "__main__":
    unittest.main()
