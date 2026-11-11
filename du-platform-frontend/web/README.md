# Diaspora Unlocked web

React, Vite and TypeScript. This application owns its browser assets, routes,
client types and dependencies. It calls the backend over HTTP; no backend source
or root installation is needed.

Use Node 22.13 or newer and pnpm 10.4.1 (via Corepack), as in CI.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
pnpm check
pnpm test
pnpm build
```

The Vite development server proxies `/api` to `BACKEND_URL`. Production uses the
same-origin `/api` proxy in the repository's Vercel configuration. `VITE_API_URL`
is public configuration and must never contain secrets. The build generates
route documents, sitemap and robots policy into `dist`; Local and preview builds omit product-specific prerendered documents without
contacting the API. Production builds try the published public catalogue and
continue with generic product routing if it is unavailable. Product pages load
their data at runtime. Set `DU_CATALOGUE_STRATEGY=published` to require the
published snapshot or `DU_CATALOGUE_STRATEGY=omit` to skip it. Run the repository browser tests
against a controlled API fixture as described in `../docs/mobile-first-review.md`.

## Mobile app downloads

The website footer shows iOS and Android availability independently. Leave each
public build variable empty until its destination has been verified from a
signed-out browser. Set `VITE_IOS_DOWNLOAD_URL` to this app's App Store listing
or public TestFlight invitation. Set `VITE_ANDROID_DOWNLOAD_URL` to the Google
Play details URL for `com.diasporaunlocked.app`. Rebuild the website after changing either
value. Internal builds, simulator artifacts and debug APKs are not public releases.

For a direct Android install, publish the signed `diaspora-unlocked-<version>.apk` under `https://www.diasporaunlocked.com/downloads/` or as a versioned GitHub Release asset in `DruHustle/du-platform`. Verify its public bytes and owner certificate as described in [mobile distribution](../mobile/DISTRIBUTION.md), then set `VITE_ANDROID_DOWNLOAD_URL` and `VITE_ANDROID_APK_SHA256` and rebuild. Android asks the user to approve installation after downloading the file.
