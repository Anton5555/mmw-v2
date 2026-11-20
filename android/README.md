# Android app (TWA)

The Android app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/): an APK that opens the live site in Chrome with no URL bar. It has no code of its own. Every Vercel deploy updates it.

Built with Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) CLI. Only `twa-manifest.json` and this README are committed. The generated Gradle project, the signing key and the APKs are ignored (`.gitignore`).

## One-time setup

1. Deploy this branch so `https://<prod-domain>/manifest.webmanifest` is live.
2. Install the CLI: `npm i -g @bubblewrap/cli`
3. In this folder: `bubblewrap init --manifest https://<prod-domain>/manifest.webmanifest`
   - On first run it offers to download a JDK and the Android SDK. Say yes.
   - Package ID: `app.elvipdemm.twa` (must match `public/.well-known/assetlinks.json`; **it can never change** once people install it).
   - It creates a signing key (`android.keystore`). **Back up the keystore and its passwords outside the repo** (e.g. a password manager). If it's lost, installed copies can't be updated, and everyone has to uninstall and reinstall.
4. `bubblewrap fingerprint list`, then copy the SHA-256 into `public/.well-known/assetlinks.json` (replace the placeholder) and deploy.
   Check it at `https://<prod-domain>/.well-known/assetlinks.json`.
5. `bubblewrap build` → `app-release-signed.apk`.

## Sharing it

Send the APK (Drive, Telegram…). On the phone, allow "install unknown apps" for the app used to open it, then install.

If a URL bar shows at the top of the app, the asset-links check failed: the fingerprint or package name in `assetlinks.json` doesn't match the APK, or the file isn't deployed yet.

## When to rebuild

Only when the name, icon, colors, start URL or package settings change. Bump `appVersionCode` in `twa-manifest.json` (`bubblewrap update` does it), then run `bubblewrap build` and share the new APK. Site changes never need a rebuild.
