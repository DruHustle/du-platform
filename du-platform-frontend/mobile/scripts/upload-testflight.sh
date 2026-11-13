#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 1 || ! -f "$1" ]]; then
  echo "Usage: scripts/upload-testflight.sh <App-Store-distribution.ipa>" >&2
  exit 2
fi
: "${ASC_API_KEY_JSON:?Set a local path to the App Store Connect API key JSON for Fastlane}"
: "${IOS_RELEASE_VERSION:?Set the marketing version checked in App Store Connect}"
: "${IOS_RELEASE_BUILD:?Set the build number checked in App Store Connect}"
: "${IOS_APP_ID_PREFIX:?Set the application identifier prefix from the distribution profile}"
[[ -r "$ASC_API_KEY_JSON" ]] || { echo "Cannot read the App Store Connect credential file." >&2; exit 2; }
ipa=$1
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
unzip -q "$ipa" 'Payload/*' -d "$work"
apps=("$work"/Payload/*.app)
[[ ${#apps[@]} == 1 && -d "${apps[0]}" ]] || { echo "Expected exactly one application in the IPA." >&2; exit 2; }
app=${apps[0]}
codesign --verify --deep --strict "$app"
codesign --display --entitlements - "$app" > "$work/signed-entitlements.plist"
security cms -D -i "$app/embedded.mobileprovision" > "$work/profile.plist"
python3 - "$app/Info.plist" "$work/signed-entitlements.plist" "$work/profile.plist" <<'PY'
import os, plistlib, sys
from pathlib import Path

def read(name):
    return plistlib.loads(Path(name).read_bytes())

info, entitlements, profile = map(read, sys.argv[1:])
package = 'com.diasporaunlocked.app'
identifier = os.environ['IOS_APP_ID_PREFIX'] + '.' + package
signed = profile['Entitlements']
if (info.get('CFBundleIdentifier') != package
        or info.get('CFBundleShortVersionString') != os.environ['IOS_RELEASE_VERSION']
        or info.get('CFBundleVersion') != os.environ['IOS_RELEASE_BUILD']
        or set(info.get('CFBundleSupportedPlatforms', [])) != {'iPhoneOS'}
        or signed.get('application-identifier') != identifier
        or entitlements.get('application-identifier') != identifier
        or entitlements.get('get-task-allow') or signed.get('get-task-allow')
        or 'ProvisionedDevices' in profile or profile.get('ProvisionsAllDevices')
        or signed.get('beta-reports-active') is not True):
    sys.exit('IPA identity, version or App Store distribution profile does not match this release.')
PY
fastlane pilot upload --ipa "$ipa" --api_key_path "$ASC_API_KEY_JSON" \
  --app_identifier com.diasporaunlocked.app --skip_submission true
printf 'Check TestFlight processing and tester access for version %s, build %s.\n' "$IOS_RELEASE_VERSION" "$IOS_RELEASE_BUILD"
