#!/usr/bin/env python3
"""Outbound-only DU release worker. No webhook, inbound port or GitHub credential."""
import json
import re
import subprocess
import urllib.request
from pathlib import Path

REPOSITORY = "DruHustle/du-platform"
STATE = Path("/var/lib/du-platform-release")
WAIT_STEP = "Wait for verified Oracle release"


def github(path):
    request = urllib.request.Request(
        "https://api.github.com/repos/" + REPOSITORY + path,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "du-platform-release"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def eligible_release(runs, load_jobs):
    for run in runs:
        revision = run.get("head_sha", "")
        if not (
            re.fullmatch(r"[a-f0-9]{40}", revision)
            and run.get("event") == "push"
            and run.get("head_branch") == "main"
            and run.get("status") == "in_progress"
            and run.get("head_repository", {}).get("full_name") == REPOSITORY
            and run.get("path", "").split("@")[0] == ".github/workflows/ci-cd.yml"
        ):
            continue
        jobs = load_jobs(run["id"])
        checks = [job for job in jobs if job.get("name", "").startswith("Build and Test (")]
        waiting = any(
            job.get("name") == "Deploy to Oracle (Production)"
            and job.get("status") == "in_progress"
            and any(step.get("name") == WAIT_STEP and step.get("status") == "in_progress" for step in job.get("steps", []))
            for job in jobs
        )
        if checks and all(job.get("conclusion") == "success" for job in checks) and waiting:
            return revision
    return None


def published_revision():
    try:
        with urllib.request.urlopen("http://127.0.0.1:11000/api/ping", timeout=5) as response:
            return json.load(response).get("commit")
    except Exception:
        return None


def poll():
    runs = github("/actions/workflows/ci-cd.yml/runs?event=push&branch=main&status=in_progress&per_page=10")["workflow_runs"]
    revision = eligible_release(runs, lambda run_id: github(f"/actions/runs/{run_id}/jobs?per_page=100")["jobs"])
    if not revision or published_revision() == revision:
        print("No tested DU release is waiting.", flush=True)
        return
    source = STATE / "source.git"
    if not source.exists():
        subprocess.run(["git", "init", "--bare", str(source)], check=True)
    subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "-C", str(source), "fetch", "--no-tags", "--depth=1", "https://github.com/" + REPOSITORY + ".git", revision], check=True)
    fetched = subprocess.check_output(["git", "-C", str(source), "rev-parse", "FETCH_HEAD"], text=True).strip()
    if fetched != revision:
        raise RuntimeError("Fetched revision does not match the tested CI commit")
    print("Releasing tested main commit " + revision, flush=True)
    archive = subprocess.Popen(["git", "-C", str(source), "archive", "--format=tar.gz", revision], stdout=subprocess.PIPE)
    try:
        result = subprocess.run(["sudo", "-n", "/usr/local/sbin/du-platform-deploy", revision], stdin=archive.stdout)
    finally:
        archive.stdout.close()
    archive_code = archive.wait()
    if result.returncode or archive_code:
        raise RuntimeError("DU deployment failed; inspect the release log and rollback status")


if __name__ == "__main__":
    poll()
