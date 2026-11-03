#!/usr/bin/env python3
"""Build local DU images and remove only obsolete, unused DU images."""
import argparse
import fcntl
import json
import subprocess
import sys
from pathlib import Path

SOURCE = "https://github.com/DruHustle/du-platform"
LOCAL_IMAGE = "du-platform:local"
LOCAL_PREVIOUS = "du-platform:local-previous"


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def image_id(reference):
    result = docker("image", "inspect", "--format", "{{.Id}}", reference)
    if not result:
        raise RuntimeError("Could not resolve retained image: " + reference)
    return result


def find_image(reference):
    # Unlike inspect, an exact ls returns no output (not an error) for a missing tag.
    return docker("image", "ls", "--no-trunc", "--quiet", reference)


def cleanup(keep, dry_run=False):
    if not keep:
        raise ValueError("At least one retained image is required")
    # Resolve every retained reference and container before making any changes.
    # Images used by stopped containers are protected too, including sibling apps.
    protected = {image_id(reference) for reference in keep}
    containers = docker("container", "ls", "--all", "--quiet").split()
    if containers:
        protected.update(docker(
            "container", "inspect", "--format", "{{.Image}}", *containers,
        ).split())
    images = [json.loads(line) for line in docker(
        "image", "ls", "--all", "--no-trunc", "--format", "{{json .}}",
    ).splitlines()]
    owned = set(docker(
        "image", "ls", "--all", "--no-trunc", "--quiet", "--filter",
        "label=org.opencontainers.image.source=" + SOURCE,
    ).split())
    candidates = set()
    for image in images:
        identity, repository, tag = image["ID"], image["Repository"], image["Tag"]
        if identity in protected:
            continue
        if repository == "du-platform" and tag != "<none>":
            # Exact repository also covers releases made before the source label.
            candidates.add(repository + ":" + tag)
        elif repository == tag == "<none>" and identity in owned:
            candidates.add(identity)
    failed = False
    for reference in sorted(candidates):
        print(("Would remove " if dry_run else "Removing ") + reference, flush=True)
        if not dry_run:
            # Never force deletion or prune parents on the shared Docker host.
            result = subprocess.run(["docker", "image", "rm", "--no-prune", reference])
            failed = failed or result.returncode != 0
    if failed:
        raise RuntimeError("Some obsolete DU images could not be removed; retry cleanup")


def build_local():
    root = Path(__file__).resolve().parents[2]
    # Serialize local builds as well as the tag rotation and cleanup (macOS/Linux).
    with (root / ".docker-build.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = find_image(LOCAL_IMAGE)
        revision = subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", "HEAD"], text=True,
        ).strip()
        subprocess.run([
            "docker", "build", "--build-arg", "APP_REVISION=" + revision,
            "-f", "deploy/oracle/Dockerfile", "-t", LOCAL_IMAGE, ".",
        ], cwd=root, check=True)
        try:
            current = image_id(LOCAL_IMAGE)
            if previous and previous != current:
                subprocess.run(
                    ["docker", "image", "tag", previous, LOCAL_PREVIOUS], check=True,
                )
            keep = [LOCAL_IMAGE]
            if find_image(LOCAL_PREVIOUS):
                keep.append(LOCAL_PREVIOUS)
            cleanup(keep)
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
            print("WARNING: Local image built, but image maintenance failed: " + str(error),
                  file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    clean = commands.add_parser(
        "cleanup", help="Keep explicit images and all container images; remove older DU images",
    )
    clean.add_argument("--keep", action="append", required=True, metavar="IMAGE")
    clean.add_argument("--dry-run", action="store_true")
    commands.add_parser(
        "build-local", help="Build du-platform:local, retain local-previous and clean up",
    )
    args = parser.parse_args()
    try:
        if args.command == "build-local":
            build_local()
        else:
            cleanup(args.keep, args.dry_run)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print("DU image maintenance failed: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
