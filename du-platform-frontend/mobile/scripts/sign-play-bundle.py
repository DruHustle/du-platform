#!/usr/bin/env python3
"""Sign a release AAB with the registered Play upload key and verify the result."""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from xml.etree import ElementTree
from zipfile import ZipFile


PACKAGE = 'com.diasporaunlocked.app'
ANDROID = '{http://schemas.android.com/apk/res/android}'


def run(*args, capture=False):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE if capture else None).stdout


def check_bundle(bundle, version_code):
    tool = ('java', '-jar', os.environ['BUNDLETOOL_JAR'])
    run(*tool, 'validate', f'--bundle={bundle}', capture=True)
    manifest = ElementTree.fromstring(run(*tool, 'dump', 'manifest', f'--bundle={bundle}', capture=True))
    if manifest.get('package') != PACKAGE or manifest.get(ANDROID + 'versionCode') != str(version_code):
        raise ValueError('Bundle package or version code does not match the intended release.')
    app = manifest.find('application')
    if app is None or any(app.get(ANDROID + flag, 'false') != 'false' for flag in ('debuggable', 'testOnly')):
        raise ValueError('A production bundle must contain a release application.')


def confirm_upload_key():
    keystore = os.environ['PLAY_UPLOAD_KEYSTORE']
    alias = os.environ['PLAY_UPLOAD_ALIAS']
    expected = os.environ['PLAY_UPLOAD_CERT_SHA256'].replace(':', '').strip().lower()
    cert = run('keytool', '-exportcert', '-keystore', keystore, '-alias', alias,
               '-storepass:env', 'PLAY_UPLOAD_STORE_PASSWORD', capture=True)
    if hashlib.sha256(cert).hexdigest() != expected:
        raise ValueError('The selected key does not match the Play Console upload certificate.')
    return keystore, alias


def verify_signature(bundle, keystore, alias):
    run('jarsigner', '-verify', '-strict', '-keystore', keystore, '-storepass:env',
        'PLAY_UPLOAD_STORE_PASSWORD', str(bundle), alias)


def sign(bundle, output, keystore, alias):
    with ZipFile(bundle) as archive:
        for name in archive.namelist():
            directory, _, basename = name.upper().rpartition('/')
            if directory == 'META-INF' and (basename.startswith('SIG-') or basename.endswith(('.SF', '.RSA', '.EC', '.DSA'))):
                raise ValueError('Choose the original unsigned release AAB.')
    with tempfile.TemporaryDirectory(dir=output.parent) as staging:
        signed = Path(staging) / 'signed.aab'
        run('jarsigner', '-keystore', keystore, '-storepass:env', 'PLAY_UPLOAD_STORE_PASSWORD',
            '-keypass:env', 'PLAY_UPLOAD_KEY_PASSWORD', '-signedjar', str(signed), str(bundle), alias)
        verify_signature(signed, keystore, alias)
        os.link(signed, output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('sign', 'verify'))
    parser.add_argument('bundle', type=Path)
    parser.add_argument('output', type=Path, nargs='?')
    parser.add_argument('--version-code', required=True, type=int, help='Expected version code from your release plan')
    args = parser.parse_args()
    if (args.mode == 'sign') != (args.output is not None):
        parser.error('Supply an output path only in sign mode.')
    if args.version_code <= 0:
        parser.error('Version code must be a positive integer.')
    target = args.output or args.bundle
    if args.output is not None and args.output.exists():
        raise ValueError('Output already exists.')
    check_bundle(args.bundle, args.version_code)
    keystore, alias = confirm_upload_key()
    if args.mode == 'sign':
        sign(args.bundle, target, keystore, alias)
    else:
        verify_signature(target, keystore, alias)
    with target.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    print(f'{PACKAGE} versionCode={args.version_code} SHA-256={digest} {target}')


if __name__ == '__main__':
    try:
        main()
    except (KeyError, ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f'Play bundle check failed: {error}')
