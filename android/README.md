# Android app (TWA)

The Android app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/): an APK that opens the live site in Chrome with no URL bar. It has no code of its own. Every Vercel deploy updates it.

Built with Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) CLI. Only `twa-manifest.json` and this README are committed. The generated Gradle project, the signing key and the APKs are ignored (`.gitignore`).

Current app: package `app.elvipdemm.twa`, host `www.elvipdemm.com`, signing key alias `android`.

## One-time setup (done; kept for rebuilding on a new machine)

1. Install the CLI: `npm i -g @bubblewrap/cli`
2. In this folder: `bubblewrap init --manifest https://www.elvipdemm.com/manifest.webmanifest`
   - On first run it offers to download a JDK and the Android SDK. Say yes.
   - Package ID: `app.elvipdemm.twa` (must match `public/.well-known/assetlinks.json`; **it can never change** once people install it).
   - It creates a signing key (`android.keystore`). **Back up the keystore and its passwords outside the repo** (e.g. a password manager). If it's lost, installed copies can't be updated, and everyone has to uninstall and reinstall.
   - On a new machine, restore the backed-up `android.keystore` here instead of creating a new key. A new key needs a new fingerprint in `assetlinks.json`, and installed apps can't update to it.
3. Apply the two fixes under **Troubleshooting** (Bubblewrap regenerates those files on `init` / `update`).
4. `bubblewrap build` (asks for both passwords) → `app-release-signed.apk`.
5. The key's SHA-256 is in `public/.well-known/assetlinks.json`. To read it again from a built APK (no password needed):
   `<android_sdk>/build-tools/<version>/apksigner verify --print-certs app-release-signed.apk`
   Check the live file at `https://www.elvipdemm.com/.well-known/assetlinks.json`.

## Sharing it

Send `app-release-signed.apk` (Drive, Telegram…). On the phone, allow "install unknown apps" for the app used to open it, then install.

If a URL bar shows at the top of the app, the asset-links check failed: the fingerprint or package name in `assetlinks.json` doesn't match the APK, or the file isn't deployed yet. Android caches the check, so after fixing it, reinstall the app or clear its data.

## When to rebuild

Only when the name, icon, colors, start URL or package settings change. Bump `appVersionCode` in `twa-manifest.json` (`bubblewrap update` does it), re-apply the Troubleshooting fixes if `update` regenerated the project, then run `bubblewrap build` and share the new APK. Site changes never need a rebuild.

## Troubleshooting

- **`Could not reserve enough space for 1572864KB object heap`**: the JDK Bubblewrap downloads on Windows is 32-bit and can't reserve 1.5 GB. In `gradle.properties` set `org.gradle.jvmargs=-Xmx1024m`.
- **`minSdkVersion 21 cannot be smaller than version 24 declared in library androidbrowserhelper`**: set `"minSdkVersion": 24` in `twa-manifest.json` and `minSdkVersion 24` in `app/build.gradle`. If you edit `twa-manifest.json` by hand, write its SHA-1 into `manifest-checksum.txt` (`sha1sum twa-manifest.json`), or `bubblewrap build` regenerates the project and undoes the `gradle.properties` fix.
- **`"gradlew.bat" no se reconoce como un comando…`** in the Claude app's terminal: that terminal sets `NoDefaultCurrentDirectoryInExePath=1`. Run `$env:NoDefaultCurrentDirectoryInExePath = $null` first, or use a normal Windows terminal.
