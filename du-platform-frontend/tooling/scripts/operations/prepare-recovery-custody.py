#!/usr/bin/env python3
"""Prepare separate private archive/key packages without network transfers.

A local run does not establish off-host recovery. Transfer packages only to
separately approved custodians and verify recovery independently of Oracle.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tarfile
import tempfile


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["archive", "passphrase-file", "runtime-key-file", "key-recipient",
                 "archive-directory", "key-directory"]:
        parser.add_argument("--" + name, required=True, type=pathlib.Path)
    args = parser.parse_args()
    archive_dir = args.archive_directory.resolve()
    key_dir = args.key_directory.resolve()
    if (archive_dir == key_dir or archive_dir in key_dir.parents
            or key_dir in archive_dir.parents):
        parser.error("Archive/key directories must be separate, not nested.")
    for target in [archive_dir, key_dir]:
        target.mkdir(parents=True, exist_ok=True, mode=0o700)
        if target.stat().st_mode & 0o077:
            parser.error("Custody directories must have mode 0700.")
    runtime = json.loads(args.runtime_key_file.read_text())
    if set(runtime) != {"JWT_SECRET"} or len(runtime["JWT_SECRET"]) < 32:
        parser.error("Supply only the retained JWT_SECRET, at least 32 characters.")
    for secret in [args.passphrase_file, args.runtime_key_file]:
        if secret.stat().st_mode & 0o077:
            parser.error("Secret files must have mode 0600 or stricter.")
    digest = hashlib.sha256(args.archive.read_bytes()).hexdigest()
    backup = archive_dir / (digest + ".sql.gpg")
    keys = key_dir / (digest + ".keys.tar.gpg")
    if backup.exists() or keys.exists():
        parser.error("Custody output exists; do not overwrite evidence.")
    with tempfile.TemporaryDirectory(prefix="du-custody-") as temporary:
        work = pathlib.Path(temporary)
        os.chmod(work, 0o700)
        home = work / "gnupg"
        home.mkdir(mode=0o700)
        gpg = ["gpg", "--homedir", str(home), "--batch"]
        try:
            preview = subprocess.check_output(
                gpg + ["--with-colons", "--import-options", "show-only", "--import",
                       str(args.key_recipient)], stderr=subprocess.DEVNULL).decode()
            if "sec:" in preview or sum(line.startswith("pub:")
                                        for line in preview.splitlines()) != 1:
                parser.error("Supply exactly one custodian public key, no private key.")
            run(gpg + ["--import", str(args.key_recipient)])
            listing = subprocess.check_output(
                gpg + ["--with-colons", "--list-keys"],
                stderr=subprocess.DEVNULL).decode()
            fingerprint = next(line.split(":")[9] for line in listing.splitlines()
                               if line.startswith("fpr:"))
            # Verify before packaging. Plaintext remains private and temporary.
            run(gpg + ["--no-symkey-cache", "--pinentry-mode", "loopback", "--passphrase-file",
                       str(args.passphrase_file), "--output", str(work / "verified.sql"),
                       "--decrypt", str(args.archive)])
            with tarfile.open(work / "keys.tar", "w") as tar:
                tar.add(args.passphrase_file, arcname="backup-passphrase", recursive=False)
                tar.add(args.runtime_key_file, arcname="runtime-keys.json", recursive=False)
            run(gpg + ["--trust-model", "always", "--recipient", fingerprint,
                       "--output", str(work / "keys.gpg"), "--encrypt",
                       str(work / "keys.tar")])
            shutil.copyfile(args.archive, backup)
            os.chmod(backup, 0o600)
            shutil.copyfile(work / "keys.gpg", keys)
            os.chmod(keys, 0o600)
        finally:
            subprocess.run(["gpgconf", "--homedir", str(home), "--kill", "gpg-agent"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           check=False)
    manifest = {
        "archiveSha256": digest,
        "keyPackageSha256": hashlib.sha256(keys.read_bytes()).hexdigest(),
        "keyRecipientFingerprint": fingerprint,
        "requiredRuntimeKeys": ["JWT_SECRET"],
        "workersMustRemainPaused": True,
        "independentTransferVerified": False,
    }
    for target in [archive_dir, key_dir]:
        file = target / (digest + ".manifest.json")
        file.write_text(json.dumps(manifest, indent=2) + "\n")
        os.chmod(file, 0o600)
    print(json.dumps({"packagesPrepared": True, "archiveSha256": digest,
                      "independentTransferVerified": False}))


if __name__ == "__main__":
    main()
