"""Install the Release app on two simulators; export only named XCTest screenshots."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def simulator(inventory, model):
    ordered = sorted((k for k in inventory if '.iOS-' in k),
                     key=lambda k: tuple(map(int, re.findall(r'\d+', k.split('.iOS-')[-1]))), reverse=True)
    for runtime in ordered:
        for device in inventory[runtime]:
            if device.get('isAvailable') and model.fullmatch(device['name']):
                return device
    raise RuntimeError(f'No available simulator matching {model.pattern}')


def extract(folder, out, device_id):
    tests = json.loads((folder / 'manifest.json').read_text())
    found = set()
    for test in tests:
        for attachment in test['attachments']:
            if attachment.get('deviceId') != device_id:
                continue
            name = attachment.get('suggestedHumanReadableName', '')
            match = re.match(r'^DU-(Home|Travel)(?:\b|_)', name)
            if not match:
                continue
            source = folder / attachment['exportedFileName']
            if source.resolve().parent != folder.resolve() or source.read_bytes()[:8] != b'\x89PNG\r\n\x1a\n':
                raise ValueError(f'Invalid screenshot: {source.name}')
            view = match[1]
            if view in found:
                raise ValueError(f'Duplicate {view} capture')
            shutil.copyfile(source, out / f'{view}.png')
            found.add(view)
    if found != {'Home', 'Travel'}:
        raise ValueError(f'Missing named captures, found: {found}')


def main():
    root = Path(sys.argv[1]).resolve()
    work = root / 'work'
    work.mkdir(parents=True)
    data = work / 'derived'
    base = ['xcodebuild', '-workspace', 'ios/DiasporaUnlocked.xcworkspace', '-scheme', 'DUNativeSmoke', '-configuration', 'Release', '-derivedDataPath', str(data), '-parallel-testing-enabled', 'NO', 'CODE_SIGNING_ALLOWED=NO']
    run(*base, '-destination', 'generic/platform=iOS Simulator', 'build-for-testing')
    inventory = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json', capture_output=True).stdout)['devices']
    for family, model in [('iPhone', re.compile(r'iPhone .*Pro Max')), ('iPad', re.compile(r'iPad Pro .*13-inch.*'))]:
        device = simulator(inventory, model)
        udid = device['udid']
        print(f'{family}: {device["name"]}', flush=True)
        if device['state'] != 'Booted':
            run('xcrun', 'simctl', 'boot', udid)
        run('xcrun', 'simctl', 'bootstatus', udid, '-b')
        out = root / 'screens' / family
        out.mkdir(parents=True)
        try:
            run('xcrun', 'simctl', 'status_bar', udid, 'override', '--time', '9:41')
            result = work / f'{family}.xcresult'
            run(*base, '-destination', f'id={udid}', '-resultBundlePath', str(result), 'test-without-building')
            folder = work / f'{family}-attachments'
            run('xcrun', 'xcresulttool', 'export', 'attachments', '--path', str(result), '--output-path', str(folder))
            extract(folder, out, udid)
        finally:
            run('xcrun', 'simctl', 'shutdown', udid)


if __name__ == '__main__':
    main()
