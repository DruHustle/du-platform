"""One release-only account per platform; register through UI and always request cleanup."""
import importlib.util
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import secrets
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API = 'https://www.diasporaunlocked.com/api'
ROOT = Path(__file__).resolve().parent


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def call(path, body, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = Request(API + path, data=json.dumps(body).encode(), headers=headers, method='POST')
    try:
        with urlopen(req, timeout=25) as result:
            payload = json.load(result)
            return result.status, payload.get('data', payload)
    except HTTPError as error:
        return error.code, {}


def field(screen, label):
    # Text and input share a label, select only editable controls.
    return next(n for n in screen.tree().iter('node')
                if n.get('class') == 'android.widget.EditText' and n.get('content-desc') == label)


def android(email, password):
    live = module('live-android')
    screen = live.screen
    screen.adb('install', '-r', os.environ['DU_SMOKE_APK'])
    screen.adb('shell', 'am', 'start', '-W', '-n', screen.PACKAGE + '/.MainActivity')
    screen.wait_for_label('Explore what connects us')
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://login', screen.PACKAGE)
    screen.wait_for_label('Welcome back')
    live.tap(live.find('Create an account', True))

    def enter(label, value):
        node = field(screen, label)
        if node.get('text') != value:
            live.tap(node)
            screen.adb('shell', 'input', 'text', value)
            screen.adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')

    enter('Full name', 'Diaspora%sAndroid%sQA')
    enter('Email address', email)
    enter('Password', password)
    live.tap(live.find('Create account', True))
    live.find('Signed in as ' + email)
    live.tap(live.find('Sign out', True))
    live.find('Welcome back')
    enter('Email address', email)
    enter('Password', password)
    live.tap(live.find('Sign in', True))
    live.find('Signed in as ' + email)
    print('PASS Android installed registration, sign-out and sign-in', flush=True)
    live.tap(live.find('Request account deletion', True))
    live.find('Current password', True)
    enter('Current password', password)
    live.tap(live.find('Confirm deletion request', True))
    import time
    for _ in range(12):
        if any('Deletion request received. Reference:' in n.get('text', '') for n in screen.tree().iter('node')):
            print('PASS Android installed deletion receipt', flush=True)
            return
        time.sleep(1)
    raise RuntimeError('Android did not show its deletion receipt')


def ios(email, password):
    capture = module('capture-ios')
    temp = Path(os.environ['RUNNER_TEMP']) / 'du-account-ios'
    temp.mkdir(mode=0o700)
    inventory = json.loads(subprocess.check_output(['xcrun','simctl','list','devices','available','--json']))['devices']
    device = capture.simulator(inventory, re.compile(r'iPhone .*Pro Max'))
    udid = device['udid']
    subprocess.run(['xcodebuild','build-for-testing','-workspace','ios/DiasporaUnlocked.xcworkspace',
        '-scheme','DUNativeSmoke','-configuration','Release','-sdk','iphonesimulator',
        '-destination','id='+udid,'-derivedDataPath',str(temp/'derived'),'ONLY_ACTIVE_ARCH=YES',
        'CODE_SIGN_IDENTITY=-','CODE_SIGNING_ALLOWED=YES','CODE_SIGNING_REQUIRED=YES'], check=True,
        stdout=subprocess.DEVNULL)
    runfile, = (temp/'derived'/'Build'/'Products').glob('*.xctestrun')
    with runfile.open('rb') as f:
        config = plistlib.load(f)
    targets = [t for group in config.get('TestConfigurations', []) for t in group['TestTargets']]
    if not targets:
        targets = [t for t in config.values() if isinstance(t, dict) and 'TestBundlePath' in t]
    if len(targets) != 1:
        raise RuntimeError('Expected one XCTest runner')
    targets[0].setdefault('EnvironmentVariables',{}).update({'DU_QA_EMAIL':email, 'DU_QA_PASSWORD':password})
    runfile.chmod(0o600)
    with runfile.open('wb') as f:
        plistlib.dump(config, f)
    try:
        # XCTest can log keyboard input. Keep all UI-test logs and the result private to this runner.
        with subprocess.Popen(['xcodebuild', 'test-without-building', '-xctestrun', str(runfile),
            '-parallel-testing-enabled', 'NO', '-destination', 'id=' + udid,
            '-only-testing:DUNativeSmokeUITests/DUNativeSmokeTests/testOneAccountCycle'],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) as process:
            stages = set()
            for line in process.stdout:
                for stage in ('account-form', 'email-entered', 'first-sign-in', 'signed-out', 'second-sign-in', 'deletion-receipt'):
                    if ('DU_STAGE ' + stage) in line and stage not in stages:
                        print('Installed iPhone: ' + stage, flush=True)
                        stages.add(stage)
            if process.wait() or 'deletion-receipt' not in stages:
                raise RuntimeError('The installed iPhone did not complete all six UI stages')
    finally:
        runfile.unlink(missing_ok=True)


def main():
    family = sys.argv[1]
    expected_ref='refs/heads/validation/native-accounts-20261113'
    if (os.getenv('GITHUB_REPOSITORY') != 'DruHustle/du-platform' or os.getenv('GITHUB_REF') != expected_ref
        or os.getenv('GITHUB_RUN_ATTEMPT') != '1' or os.getenv('DU_ACCOUNT_ACTIVATED') != 'yes'):
        raise SystemExit('One-off mobile account run was not explicitly activated')
    if family not in ('ios','android'):
        raise ValueError('A specific platform is required')
    email = 'qa-native-20261113-' + family + '@example.test'
    # Fixed emails prevent a retry or future run from registering another account.
    password = 'Qa-' + secrets.token_hex(12) + '7'
    print('::add-mask::' + password, flush=True)
    status, _ = call('/auth/deletion-request', {'confirm':True})
    if status != 401:
        raise RuntimeError('Production did not expose authenticated cleanup; no account was created')
    try:
        if family == 'ios':
            status, owned = call('/auth/native/register', {
                'email': email, 'password': password, 'confirmPassword': password,
                'fullName': 'Diaspora iOS QA'})
            if status == 409:
                raise RuntimeError('The reserved iOS QA address already exists. Operator recovery is required.')
            if status != 201 or owned.get('user', {}).get('email') != email:
                raise RuntimeError(f'Could not provision the reserved iOS QA identity (HTTP {status})')
            call('/auth/logout', {}, owned['sessionToken'])
            print('The reserved iOS QA identity was provisioned for UI sign-in.', flush=True)
            ios(email, password)
        else:
            android(email, password)
    finally:
        # If UI failed after registration, still enqueue cleanup for this exact test-owned account.
        # The API request is idempotent if the UI already enqueued it.
        status, login = call('/auth/native/login', {'email':email,'password':password})
        if status != 200 or login.get('user', {}).get('email') != email:
            print('No owned session for ' + email + '; no other identity was modified.', flush=True)
        else:
            try:
                status, deletion = call('/auth/deletion-request',
                    {'accountId':login['user']['id'],'password':password,'confirm':True}, login['accessToken'])
                ref = deletion.get('requestId', '')
                if status not in (200,201,202) or not re.fullmatch(r'[0-9a-fA-F-]{36}', ref):
                    raise RuntimeError('Operator must locate the owned QA identity for cleanup: ' + email)
                print('Operator deletion queue: ' + email + ' reference ' + ref, flush=True)
                with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
                    print('Operator deletion queue: ' + email + ' reference ' + ref, file=summary)
            finally:
                call('/auth/logout', {}, login['sessionToken'])


if __name__ == '__main__':
    main()
