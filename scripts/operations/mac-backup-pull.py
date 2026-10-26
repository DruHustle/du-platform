#!/usr/bin/env python3
"""Daily actual-Mac snapshot/pull. No decryption, secrets or destructive mirroring."""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shlex
import shutil
import subprocess
import tempfile

UTC = dt.timezone.utc


def utcnow():
    return dt.datetime.now(UTC)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def atomic_json(path, value):
    if path.is_symlink():
        raise ValueError('Unsafe metadata path')
    handle, temporary = tempfile.mkstemp(prefix='.metadata-', dir=path.parent)
    try:
        with os.fdopen(handle, 'w') as stream:
            json.dump(value, stream, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


class Remote:
    def __init__(self, config):
        host = config['sshHost']
        if not re.fullmatch(r'[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+', host):
            raise ValueError('Invalid SSH host')
        self.args = ['/usr/bin/ssh', '-o', 'BatchMode=yes', '-o',
                     'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
                     '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3', host]

    def metadata(self, command):
        result = subprocess.run(self.args + ['sudo -n /usr/local/sbin/du-platform-mac-backup ' + command],
                                capture_output=True, check=True, timeout=600)
        return json.loads(result.stdout)

    def download(self, name, output):
        if not re.fullmatch(r'\d{8}T\d{6}Z\.sql\.gpg', name):
            raise ValueError('Unexpected archive name')
        subprocess.run(self.args + ['sudo -n /usr/local/sbin/du-platform-mac-backup read ' + name],
                       stdout=output, stderr=subprocess.PIPE, check=True, timeout=600)


def pull(config, force=False, remote=None, now=None):
    if platform.system() != 'Darwin':
        raise ValueError('This operation must run on the actual approved Mac')
    os.umask(0o077)
    root = Path(config['destination'])
    if not root.is_absolute() or root.resolve() != root or not root.is_dir():
        raise ValueError('Destination must be an existing real Mac directory')
    os.chmod(root, 0o700)
    state_dir = root / '.mac-pull'
    state_dir.mkdir(mode=0o700, exist_ok=True)
    if state_dir.is_symlink():
        raise ValueError('Unsafe state directory')
    status_path = root / 'BACKUP-STATUS.json'
    if status_path.is_symlink():
        raise ValueError('Unsafe status path')
    lock = os.open(state_dir / 'pull.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    staging = None
    try:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'result': 'already_running'}
        status = json.loads(status_path.read_text()) if status_path.exists() else {}
        now = now or utcnow()
        interval = float(config.get('intervalHours', 24))
        if not 1 <= interval <= 168:
            raise ValueError('intervalHours must be between 1 and 168')
        last = dt.datetime.fromisoformat(status['lastSuccessUtc']) if status.get('lastSuccessUtc') else None
        if not force and last and dt.timedelta(0) <= now-last < dt.timedelta(hours=interval):
            return {'result': 'not_due', 'lastSuccessUtc': status['lastSuccessUtc']}
        stage = 'snapshot'
        status.update(lastAttemptUtc=now.isoformat(), state='running', stage=stage)
        atomic_json(status_path, status)
        try:
            remote = remote or Remote(config)
            inventory = remote.metadata('create')
            if not isinstance(inventory, list) or not inventory:
                raise ValueError('Empty inventory')
            item = sorted(inventory, key=lambda row: row['name'])[-1]
            if not re.fullmatch(r'\d{8}T\d{6}Z\.sql\.gpg', item['name']):
                raise ValueError('Unsafe source name')
            evidence = item.get('recoveryEvidence') or {}
            stamp = dt.datetime.strptime(item['name'][:16], '%Y%m%dT%H%M%SZ').replace(tzinfo=UTC)
            if stamp < now-dt.timedelta(minutes=5) or stamp > utcnow()+dt.timedelta(minutes=5):
                raise ValueError('Fresh snapshot missing')
            if not all(evidence.get(k) is True for k in ['sourceStableDuringDump', 'schemaAndRowHashesMatch',
                       'encryptedArchiveRoundTrip', 'applicationRecoveryTested']):
                raise ValueError('Restore evidence missing')
            if evidence.get('plaintextDumpWritten') is not False or evidence.get('liveWrites') is not False:
                raise ValueError('Snapshot policy not satisfied')
            if item['sha256'] != evidence.get('archiveSha256') or item['size'] != evidence.get('archiveBytes'):
                raise ValueError('Snapshot receipt mismatch')
            stage = 'download'
            staging = Path(tempfile.mkdtemp(prefix='.download-', dir=root))
            archive = staging / item['name']
            with archive.open('xb') as output:
                remote.download(item['name'], output)
                output.flush()
                os.fsync(output.fileno())
            stage = 'verification'
            if archive.stat().st_size != item['size'] or digest(archive) != item['sha256']:
                raise ValueError('Downloaded checksum/size mismatch')
            current = next((r for r in remote.metadata('inventory') if r['name'] == item['name']), None)
            if current != item:
                raise ValueError('Source changed during transfer')
            (staging / 'SHA256SUMS').write_text(f"{item['sha256']}  {item['name']}\n")
            subprocess.run(['/usr/bin/shasum', '-a', '256', '-c', 'SHA256SUMS'], cwd=staging,
                           capture_output=True, check=True)
            target = root / stamp.strftime('%Y%m%dT%H%M%SZ')
            if target.exists():
                raise ValueError('Preserving existing destination; refusing overwrite')
            manifest = {'downloadedAtUtc': utcnow().isoformat(), 'actualLocalSystem': platform.system(),
                        'destination': str(target), 'custodian': 'Andrew Gotora', 'archive': item,
                        'sha256Verified': True, 'sourceRetained': True, 'keysTransferred': False,
                        'independentKeyRecovery': 'pending encrypted USB and verified recipient'}
            atomic_json(staging / 'transfer-manifest.json', manifest)
            atomic_json(staging / 'snapshot-recovery-report.json', evidence)
            (staging / 'RECOVERY-INSTRUCTIONS.txt').write_text(
                'Encrypted archive only. Oracle source retained. No private key, password or runtime secret is included.\n'
                f'Archive saved on actual Mac: {target}\n'
                f'Recheck: cd {shlex.quote(str(target))} && shasum -a 256 -c SHA256SUMS\n'
                'Snapshot creation, encrypted transfer and checksum verification passed. The Oracle isolated restore\n'
                'evidence is in snapshot-recovery-report.json. Independent key recovery is NOT complete.\n'
                'Andrew Gotora must identify a separate encrypted USB/secure custody location and independent unlock\n'
                'method, provide a public GPG key location and full fingerprint, and verify that fingerprint directly.\n'
                'Then separately package the retained SQL passphrase and JWT runtime key with the repository custody\n'
                'tool for that recipient; never put recovery material in this archive folder, chat, Git or logs.\n'
                'Prove USB unlock and recipient decryption without Oracle, then perform an approved isolated restore\n'
                'with RECOVERY_MODE=true and OUTBOUND_MESSAGES_PAUSED=true; reconcile before releasing holds.\n'
                'Preserve retained runtime key(s) for existing encrypted grants/payloads. Do not rotate them here.\n'
                'No provider PITR or complete host-loss recovery is claimed. See docs/assisted-order-operations.md.\n')
            for path in staging.iterdir():
                os.chmod(path, 0o600)
            staging.rename(target)
            staging = None
            status.update(state='success', stage='complete', lastSuccessUtc=utcnow().isoformat(),
                          archiveTimestampUtc=stamp.isoformat(), savedDirectory=str(target),
                          archiveName=item['name'], sha256=item['sha256'], bytes=item['size'])
            status.pop('failureCode', None)
            atomic_json(status_path, status)
            return status
        except Exception:
            # Never serialize provider/SSH/database exceptions: they may include sensitive context.
            status.update(state='failed', stage=stage, lastFailureUtc=utcnow().isoformat(),
                          failureCode=stage+'_failed')
            atomic_json(status_path, status)
            raise RuntimeError('Backup '+stage+' failed; previous good copies retained') from None
        finally:
            if staging:
                shutil.rmtree(staging)
    finally:
        os.close(lock)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    if args.status:
        path = Path(config['destination'])/'BACKUP-STATUS.json'
        print(path.read_text() if path.exists() else '{"state":"never_run"}')
    else:
        try:
            print(json.dumps(pull(config, args.force)))
        except Exception:
            print('DU backup pull failed; inspect the non-secret BACKUP-STATUS.json; no secrets logged.')
            return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
