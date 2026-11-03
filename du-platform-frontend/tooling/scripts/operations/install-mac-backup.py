#!/usr/bin/env python3
"""Install/update the owner-authorized, user-level daily Mac backup pull."""
import argparse
import json
import os
from pathlib import Path
import platform
import plistlib
import shutil
import subprocess
import sys


def launch_agent(python, script, config):
    return {'Label': 'com.diasporaunlocked.backup-pull',
            'ProgramArguments': [python, str(script), '--config', str(config)],
            'RunAtLoad': True, 'StartInterval': 3600,
            'StartCalendarInterval': {'Hour': 3, 'Minute': 15},
            'ProcessType': 'Background', 'LowPriorityIO': True,
            'StandardOutPath': str(script.parent/'launchd.log'),
            'StandardErrorPath': str(script.parent/'launchd.log')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path,
                        default=Path('/Users/andrewgotora/Software Development/Backups/DiasporaUnlocked'))
    parser.add_argument('--ssh-host', default='ubuntu@152.70.22.84')
    parser.add_argument('--interval-hours', type=float, default=24)
    args = parser.parse_args()
    if platform.system() != 'Darwin' or not Path('/Users/andrewgotora').is_dir():
        raise SystemExit('Install on the actual approved Mac only')
    if not 1 <= args.interval_hours <= 168:
        raise SystemExit('Interval must be 1–168 hours')
    os.umask(0o077)
    root = args.destination
    if not root.is_absolute() or root.resolve() != root or not root.parent.is_dir():
        raise SystemExit('Use the approved real local destination')
    root.mkdir(mode=0o700, exist_ok=True)
    state = root/'.mac-pull'
    if state.is_symlink():
        raise SystemExit('Unsafe state path')
    state.mkdir(mode=0o700, exist_ok=True)
    script = state/'mac-backup-pull.py'
    config = state/'config.json'
    log = state/'launchd.log'
    status = root/'BACKUP-STATUS.json'
    if status.is_symlink():
        raise SystemExit('Unsafe status file')
    previous = state/'status.json'
    if not status.exists() and previous.is_file() and not previous.is_symlink():
        os.replace(previous, status)
    for path in [script, config, log]:
        if path.is_symlink():
            raise SystemExit('Unsafe agent file')
    shutil.copyfile(Path(__file__).with_name('mac-backup-pull.py'), script)
    config.write_text(json.dumps({'destination': str(root), 'sshHost': args.ssh_host,
                                 'intervalHours': args.interval_hours}, indent=2)+'\n')
    # The agent prints only redacted status, never subprocess errors or dumps.
    log.touch(exist_ok=True)
    for path in [script, config, log]:
        os.chmod(path, 0o600)
    agents = Path.home()/'Library/LaunchAgents'
    agents.mkdir(parents=True, exist_ok=True)
    plist = agents/'com.diasporaunlocked.backup-pull.plist'
    if plist.is_symlink():
        raise SystemExit('Unsafe launch agent path')
    plist.write_bytes(plistlib.dumps(launch_agent(sys.executable, script, config)))
    os.chmod(plist, 0o600)
    domain = 'gui/'+str(os.getuid())
    subprocess.run(['/bin/launchctl', 'bootout', domain+'/com.diasporaunlocked.backup-pull'],
                   capture_output=True)
    subprocess.run(['/bin/launchctl', 'bootstrap', domain, str(plist)], check=True)
    print(json.dumps({'agent': str(plist), 'config': str(config),
                      'status': str(status), 'intervalHours': args.interval_hours,
                      'catchUp': 'RunAtLoad and hourly due checks; offline failures retry next check'}))


if __name__ == '__main__':
    main()
