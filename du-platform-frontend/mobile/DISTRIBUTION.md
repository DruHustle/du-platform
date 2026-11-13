# Distributing Diaspora Unlocked on phones

## Android

Build from the release commit in this mobile directory with the supported Node and Java versions and the Android SDK. Confirm the native version code increases for an update. The Android manifest must identify `com.diasporaunlocked.app`.

```sh
npm ci
export EXPO_PUBLIC_API_URL=https://www.diasporaunlocked.com/api
(cd android && bash gradlew :app:assembleRelease)
```

Use the owner’s app-signing keystore for direct downloads. Updates to an existing installation require the same signing identity. A Play upload key is appropriate for a Play submission and may differ from the app-signing certificate on customers’ devices. If Google controls that app-signing key, use an APK signed by Google for compatible direct distribution. For a first release, create the key on an owner-controlled system, keep a protected backup and record the public SHA-256 certificate fingerprint separately.

In the signing shell, set `ANDROID_RELEASE_KEYSTORE` to the private keystore path, `ANDROID_RELEASE_ALIAS` to the key alias and `ANDROID_RELEASE_CERT_SHA256` to the independently recorded public fingerprint. Supply `ANDROID_RELEASE_STORE_PASSWORD` and `ANDROID_RELEASE_KEY_PASSWORD` through the owner’s secret manager. The credentials are needed for signing only. `ANDROID_HOME` locates Android Build Tools 36.0.0. `ANDROID_BUILD_TOOLS` can point directly to a compatible installation.

```sh
release_dir=android/app/build/outputs/apk/release
scripts/sign-release-apk.sh sign "$release_dir/app-release-unsigned.apk" "diaspora-unlocked-1.0.0.apk"
scripts/sign-release-apk.sh verify "diaspora-unlocked-1.0.0.apk"
```

Choose the filename for the actual version. The helper checks the package, launcher, release manifest, page alignment, APK signatures and owner certificate, then prints the file SHA-256. QA signing identities and debug builds must stay out of customer distribution. A smoke test on a supported Android phone can confirm installation and behavior on that device. Diaspora Unlocked’s native journey and application readiness checks apply to the features and release claims they cover. An owner-signed preview can be published with its tested scope and known limitations identified in the public release notes. For Play use an Android App Bundle from `:app:bundleRelease`, sign it with the registered upload key and complete the relevant release track in Play Console.

Upload the verified APK to `https://www.diasporaunlocked.com/downloads/` or to a versioned GitHub Release asset in the product’s repository. Fetch it while signed out and compare the published bytes to the verified local file, then set the website’s `VITE_ANDROID_DOWNLOAD_URL` and `VITE_ANDROID_APK_SHA256` to the verified URL and digest. The direct button downloads the APK. Android handles the install confirmation and permission for this source.

```sh
curl --fail --location --proto '=https' --proto-redir '=https' "$PUBLIC_APK_URL" -o downloaded-release.apk
cmp "diaspora-unlocked-1.0.0.apk" downloaded-release.apk
scripts/sign-release-apk.sh verify downloaded-release.apk
```

With Android SDK Platform 36 and Build Tools 36.0.0 installed, run `python3 scripts/test-release-apk.py` to exercise signing and rejection of tampered, debuggable and incorrectly signed samples. The test deletes its temporary files and disposable key.

### Google Play App Bundle

In the existing listing for `com.diasporaunlocked.app`, check the highest version code across all tracks and the registered **upload certificate** fingerprint under App integrity. Use the release code approved for the next upload, update the Expo and tracked native versions together, and build the full release bundle. The Android release packaging workflow builds the full AAB and checks each configured ABI. Its manual “Retain the complete unsigned AAB” option saves the original bundle for owner signing for two days. The separate directly installable QA APK targets arm64.

```sh
export EXPO_PUBLIC_API_URL=https://www.diasporaunlocked.com/api
(cd android && bash gradlew :app:bundleRelease)
```

Use JDK 17 or later, Python 3.11 or later, and the Google bundletool JAR (`BUNDLETOOL_JAR`, version and SHA-256 pinned in the Android workflow). Set `PLAY_UPLOAD_KEYSTORE`, `PLAY_UPLOAD_ALIAS`, `PLAY_UPLOAD_STORE_PASSWORD`, `PLAY_UPLOAD_KEY_PASSWORD` and `PLAY_UPLOAD_CERT_SHA256` in the signing environment. Set `RELEASE_VERSION_CODE` to the intended numeric code. This verifies the package, manifest, version, JAR signature and selected upload certificate before recording the SHA-256. The certificate password stays in the environment.

```sh
bundle=android/app/build/outputs/bundle/release/app-release.aab
python3 scripts/sign-play-bundle.py sign "$bundle" play-upload.aab --version-code "$RELEASE_VERSION_CODE"
python3 scripts/sign-play-bundle.py verify play-upload.aab --version-code "$RELEASE_VERSION_CODE"
```

Upload the checked AAB to the existing testing track. Record the version code and processing outcome. Install from that track and verify sign-in, itinerary handoff and the account-deletion request with a disposable reviewer account. Promote the same tested bundle using the existing release settings and retain the Publishing overview submission status. The separate packaging workflow only uses a temporary QA key.

## iOS

Select the owner’s existing App Store Connect record for `com.diasporaunlocked.app`. Match the team, registered identifier, version history and next available build number before archiving. Select that team in Xcode and configure the app’s release signing and distribution profile. Enable Associated Domains for the registered app ID if the app uses universal links. Its entitlement names `applinks:www.diasporaunlocked.com`. Publish the AASA configuration for the actual team and bundle identifier to enable those links. The repository’s EAS production profile has no linked Expo project ID or Apple credentials. The checked-in native Xcode project can be archived independently. CI simulator apps cannot be installed through TestFlight or the App Store.

On a Mac with the supported Xcode and a signed-in owner account, set `APPLE_TEAM_ID` to the team identifier. From this mobile directory create a Release archive for a physical iOS destination.

```sh
npm ci
export EXPO_PUBLIC_API_URL=https://www.diasporaunlocked.com/api
(cd ios && pod install)
xcodebuild -workspace ios/DiasporaUnlocked.xcworkspace -scheme DiasporaUnlocked \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/diaspora-unlocked.xcarchive" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic archive
```

In Xcode Organizer, validate the archive and distribute to App Store Connect with the owner’s distribution signing. For public beta installs, complete external TestFlight review and enable a public invitation. For general availability, complete App Review and release the listing. Open the actual link from a signed-out iPhone and verify it identifies Diaspora Unlocked before setting the website’s `VITE_IOS_DOWNLOAD_URL` to its public TestFlight or App Store URL. The current native projects use the same product identifier for preview and release.

### HTTPS links from email and the website

Set the public identifiers in the Vercel web project's Production environment and rebuild the website. Each platform can be activated independently.

| Variable | Value from the registered app |
| --- | --- |
| `IOS_APP_ID_PREFIX` | The ten-character prefix before `.com.diasporaunlocked.app` in the signed app’s `application-identifier` entitlement. Confirm it on the distribution build. |
| `PLAY_APP_SIGNING_CERT_SHA256` | The colon-separated SHA-256 fingerprint under Play Console → App integrity → App signing key certificate. If Play serves multiple signing certificates after rotation, enter their fingerprints separated by commas. The upload certificate signs the submitted bundle and belongs in the separate upload verification step. |

After deployment, fetch `https://www.diasporaunlocked.com/.well-known/apple-app-site-association` and `https://www.diasporaunlocked.com/.well-known/assetlinks.json` directly. Compare each 200 JSON response with the signed app or Play Console. On a TestFlight install and a Play-track install, follow a reset link from a controlled mailbox, a product link and a Travel link. Record which app opened and whether the intended task was restored.

### Upload the signed build for store testing

The same signed files can be uploaded from an authorised release workstation using Fastlane. Keep credential files outside the repository. Read the version and track from the existing listing before choosing the file.

- **TestFlight.** Export the App Store distribution IPA from the archive in Organizer. On macOS, set `ASC_API_KEY_JSON` to the local Fastlane App Store Connect API key JSON, and set `IOS_APP_ID_PREFIX`, `IOS_RELEASE_VERSION` and `IOS_RELEASE_BUILD` to the approved values. Run `scripts/upload-testflight.sh path/to/DiasporaUnlocked.ipa`. The helper verifies the signed app and its distribution profile and uploads to the existing bundle ID. Select the processed build in TestFlight and use the existing test group.
- **Google Play testing.** Set `PLAY_SERVICE_ACCOUNT_JSON` to the registered publisher service account JSON and `PLAY_TEST_TRACK` to the existing active testing track. With the same signing-verification environment used above, run `scripts/upload-play-test.sh path/to/play-upload.aab`. It validates the signed AAB and sends the release to that track without changing listing text or screenshots. After an interrupted upload, first check the build or version code in the store before retrying.

Record both the console’s processing status and the installation through its testing service. Once the installed sign-in and Travel checks pass, use App Review or Play Publishing overview to submit the verified release with the listing’s existing settings.
