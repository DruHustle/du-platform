#!/usr/bin/env bash
set -euo pipefail

# Accept a bundle already signed by the registered upload key. The testing
# track must use the name configured in the existing Play Console record.
if [[ $# != 1 || ! -f "$1" ]]; then
  echo "Usage: scripts/upload-play-test.sh <signed.aab>" >&2
  exit 2
fi
: "${PLAY_TEST_TRACK:?Set the existing Play testing track name}"
: "${PLAY_SERVICE_ACCOUNT_JSON:?Set a local path to the publisher service-account JSON}"
: "${RELEASE_VERSION_CODE:?Set the version code checked in Play Console}"
[[ -r "$PLAY_SERVICE_ACCOUNT_JSON" ]] || { echo "Cannot read the publisher credential file." >&2; exit 2; }
case "$PLAY_TEST_TRACK" in
  production|*:production) echo "Select a testing track for the installed-build checks." >&2; exit 2 ;;
esac
base=$(cd "$(dirname "$0")" && pwd)
python3 "$base/sign-play-bundle.py" verify "$1" --version-code "$RELEASE_VERSION_CODE"
fastlane supply --package_name com.diasporaunlocked.app --json_key "$PLAY_SERVICE_ACCOUNT_JSON" \
  --aab "$1" --track "$PLAY_TEST_TRACK" --release_status completed \
  --skip_upload_metadata true --skip_upload_images true --skip_upload_screenshots true --skip_upload_changelogs true
printf 'Play accepted the edit for %s, version code %s. Check processing and tester availability in Play Console.\n' "$PLAY_TEST_TRACK" "$RELEASE_VERSION_CODE"
