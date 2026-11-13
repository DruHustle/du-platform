"""Install the Release app on two simulators; export only named XCTest screenshots."""
import json
from pathlib import Path
import re
import os
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


def extract(folder, out, device_id, expected):
    tests = json.loads((folder / 'manifest.json').read_text())
    found = set()
    for test in tests:
        for attachment in test['attachments']:
            if attachment.get('deviceId') != device_id:
                continue
            name = attachment.get('suggestedHumanReadableName', '')
            match = re.match(r'^DU-(Home|Travel|Product)(?:\b|_)', name)
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
    if found != expected:
        raise ValueError(f'Missing named captures, found: {found}')


def main():
    root = Path(sys.argv[1]).resolve()
    work = root / 'work'
    work.mkdir(parents=True)
    data = work / 'derived'
    inventory = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json', capture_output=True).stdout)['devices']
    devices = {'iPhone': simulator(inventory, re.compile(r'iPhone .*Pro Max')),
               'iPad': simulator(inventory, re.compile(r'iPad Pro .*13-inch.*'))}
    run('xcodebuild', 'build-for-testing', '-workspace', 'ios/DiasporaUnlocked.xcworkspace',
        '-scheme', 'DUNativeSmoke', '-configuration', 'Release', '-sdk', 'iphonesimulator',
        '-destination', 'id=' + devices['iPhone']['udid'], '-derivedDataPath', str(data),
        'ONLY_ACTIVE_ARCH=YES', 'CODE_SIGN_IDENTITY=-', 'CODE_SIGNING_ALLOWED=YES', 'CODE_SIGNING_REQUIRED=YES')
    test_runs = list((data / 'Build' / 'Products').glob('*.xctestrun'))
    if len(test_runs) != 1:
        raise RuntimeError(f'Expected one simulator test configuration, got {test_runs}')
    live_outcomes = []
    for family, device in devices.items():
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
            run('xcodebuild', 'test-without-building', '-xctestrun', str(test_runs[0]), '-parallel-testing-enabled', 'NO',
                '-destination', f'id={udid}', '-resultBundlePath', str(result),
                '-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/testOpenTravelFromHome')
            folder = work / f'{family}-attachments'
            run('xcrun', 'xcresulttool', 'export', 'attachments', '--path', str(result), '--output-path', str(folder))
            extract(folder, out, udid, {'Home', 'Travel'})
            shop_result = work / f'{family}-Shop.xcresult'
            shop = subprocess.run(['xcodebuild', 'test-without-building', '-xctestrun', str(test_runs[0]),
                '-parallel-testing-enabled', 'NO', '-destination', 'id=' + udid, '-resultBundlePath', str(shop_result),
                '-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/testOpenProductFromHome'])
            live_outcomes.append((family + ' product detail', shop.returncode))
            if shop.returncode == 0:
                shop_folder = work / f'{family}-shop-attachments'
                run('xcrun', 'xcresulttool', 'export', 'attachments', '--path', str(shop_result), '--output-path', str(shop_folder))
                extract(shop_folder, out, udid, {'Product'})
            if family == 'iPhone':
                for name in ('testDirectFlightHandoff', 'testRejectedSignInCanRetry'):
                    status = subprocess.run(['xcodebuild', 'test-without-building', '-xctestrun', str(test_runs[0]),
                        '-parallel-testing-enabled', 'NO', '-destination', f'id={udid}',
                        '-resultBundlePath', str(work / (name + '.xcresult')),
                        '-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/' + name]).returncode
                    live_outcomes.append((name, status))
        finally:
            run('xcrun', 'simctl', 'shutdown', udid)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as report:
        for name, status in live_outcomes:
            print(f'{name}: {"passed" if status == 0 else "not verified; see XCTest output"}', file=report)
    if any(status for _, status in live_outcomes):
        raise RuntimeError('One or more live iPhone journeys did not pass; independent screenshots were retained.')


if __name__ == '__main__':
    main()
