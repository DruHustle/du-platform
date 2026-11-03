# Diaspora Unlocked native app

This is a React Native / Expo development-build application, not a web wrapper.
It owns its dependencies, screens, API client and tests. It shares the existing
account system through the backend HTTP API; the opaque session token is stored
with Expo SecureStore and access tokens are held in memory.

Use Node 22.13 or newer, Android Studio/SDK for Android, and macOS, Xcode and
CocoaPods for iOS. Configure `EXPO_PUBLIC_API_URL` with a public API base ending
in `/api`. Current APIs serve catalogue images directly. Set `EXPO_PUBLIC_WEB_URL` to the
public web asset origin for older API versions that do not advertise image URLs;
do not put secrets in Expo public environment variables. For Android
emulators, the example uses `10.0.2.2` to reach a local backend. Local cleartext
HTTP is for development only.

```sh
npm ci
cp .env.example .env
npm run check
npm test
npm run build              # exports JavaScript bundles for both platforms
npm run android            # builds and installs an Android development build
npm run ios                # builds and installs an iOS simulator development build
npm start                  # Metro for an already installed development build
```

The `android/` and `ios/` projects are tracked. After changing `app.json`, Expo
plugins, or native dependencies, run `npm run native:generate`, review and commit
the resulting native changes. CI regenerates and checks for drift. Android
release builds intentionally do not use the template's public debug key; set up
release signing through the release environment. EAS profiles in `eas.json` are
configuration only, not evidence of a submitted or signed release.

Custom-scheme links use `diasporaunlocked://`; HTTPS app/universal link filters
are configured for account, Travel and Shop paths. Production verification still
requires hosting the correct Android assetlinks and Apple association documents
for the actual signing identity, then testing the signed applications. Recovery
links continue to work on the web if the app is not installed.

Travel results are research and provider handoffs, not bookings. Shop requests
are assisted orders and do not collect payment. Car hire, multi-traveller travel,
immersive experiences, administrative functions and some informational pages
open their web equivalents in the platform browser view. A website handoff can
require a separate sign-in; iOS browser views do not share Safari's cookies.
See `../docs/mobile-first-review.md` for the
feature matrix, verification results and remaining device/release checks.
