"""Build a miniature Android App Bundle and verify Play signing and retry behavior."""
import hashlib
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile


class PlayBundleTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.helper = Path(__file__).with_name('sign-play-bundle.py')
        password = secrets.token_urlsafe(24)
        self.key = self.folder / 'upload.p12'
        self.env = dict(os.environ, PLAY_UPLOAD_ALIAS='qa', PLAY_UPLOAD_KEYSTORE=str(self.key),
                        PLAY_UPLOAD_STORE_PASSWORD=password, PLAY_UPLOAD_KEY_PASSWORD=password)
        self.run_tool('keytool', '-genkeypair', '-keystore', self.key, '-alias', 'qa', '-keyalg', 'RSA',
                      '-keysize', '2048', '-validity', '365', '-dname', 'CN=Temporary bundle QA',
                      '-storepass:env', 'PLAY_UPLOAD_STORE_PASSWORD', '-keypass:env', 'PLAY_UPLOAD_KEY_PASSWORD')
        cert = self.run_tool('keytool', '-exportcert', '-keystore', self.key, '-alias', 'qa',
                             '-storepass:env', 'PLAY_UPLOAD_STORE_PASSWORD')
        self.env['PLAY_UPLOAD_CERT_SHA256'] = hashlib.sha256(cert).hexdigest()

    def run_tool(self, *args, success=True):
        result = subprocess.run(args, env=self.env, cwd=self.folder, capture_output=True)
        self.assertEqual(result.returncode == 0, success, (result.stdout + result.stderr).decode(errors='replace'))
        return result.stdout

    def create_bundle(self, name, package='com.diasporaunlocked.app', debug=False):
        manifest = self.folder / 'AndroidManifest.xml'
        manifest.write_text(f'''<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="{package}"
          android:versionCode="42" android:versionName="1.0.0"><uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36"/>
          <application android:label="QA" android:hasCode="false" android:debuggable="{str(debug).lower()}"/></manifest>''')
        sdk = Path(self.env['ANDROID_HOME'])
        aapt = Path(self.env.get('ANDROID_BUILD_TOOLS', sdk / 'build-tools/36.0.0')) / 'aapt2'
        self.run_tool(aapt, 'link', '--proto-format', '-I', sdk / 'platforms/android-36/android.jar',
                      '--manifest', manifest, '-o', 'linked.zip')
        with ZipFile(self.folder / 'linked.zip') as linked, ZipFile(self.folder / 'base.zip', 'w') as module:
            for path in linked.namelist():
                module.writestr('manifest/' + path if path == 'AndroidManifest.xml' else path, linked.read(path))
        self.run_tool('java', '-jar', self.env['BUNDLETOOL_JAR'], 'build-bundle', '--modules=base.zip', '--output=' + name)
        return self.folder / name

    def helper_call(self, *args, code=42, success=True):
        return self.run_tool(sys.executable, self.helper.resolve(), *args, '--version-code', str(code), success=success)

    def test_sign_and_reject(self):
        original = self.create_bundle('unsigned.aab')
        signed = self.folder / 'signed.aab'
        rejected = self.folder / 'rejected.aab'
        self.helper_call('sign', original, signed)
        self.helper_call('verify', signed)
        self.helper_call('sign', original, signed, success=False)
        self.helper_call('sign', signed, rejected, success=False)
        self.helper_call('sign', original, rejected, code=43, success=False)
        self.helper_call('sign', self.create_bundle('other.aab', package='com.example.other'), rejected, success=False)
        self.helper_call('sign', self.create_bundle('debug.aab', debug=True), rejected, success=False)
        self.env['PLAY_UPLOAD_CERT_SHA256'] = '0' * 64
        self.helper_call('sign', original, rejected, success=False)
        self.assertFalse(rejected.exists())


if __name__ == '__main__':
    unittest.main()
