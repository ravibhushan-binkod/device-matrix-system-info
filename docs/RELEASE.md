# Release build & signing

Everything here is reproducible after `npx expo prebuild --clean`, because the
`/android` folder is generated (CNG) and never committed.

## Versions

- `version` in `app.config.ts` → `versionName` (currently **1.0.0**)
- `android.versionCode` in `app.config.ts` → `versionCode` (currently **1**)

Bump `android.versionCode` by one for every Play upload; bump `version` for
user-visible releases.

## Upload key (keep it safe)

Create the upload key **outside** the repository and back it up (password
manager + offline copy). Losing it means the Play Console upload path needs a
key reset.

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore "C:\keys\device-matrix-upload.keystore" `
  -alias device-matrix-upload -keyalg RSA -keysize 4096 -validity 10000
```

Then put the four properties in `%USERPROFILE%\.gradle\gradle.properties`
(user-level, never committed). Use forward slashes in the path:

```properties
DEVICEMATRIX_UPLOAD_STORE_FILE=C:/keys/device-matrix-upload.keystore
DEVICEMATRIX_UPLOAD_STORE_PASSWORD=<store password>
DEVICEMATRIX_UPLOAD_KEY_ALIAS=device-matrix-upload
DEVICEMATRIX_UPLOAD_KEY_PASSWORD=<key password>
```

`plugins/with-release-signing.js` injects a `release` signing config that reads
exactly these properties, and release builds fall back to the debug key when
they are absent (so local size checks and smoke tests keep working). All four
must be present together.

## Build the Play bundle (AAB)

```powershell
npx expo prebuild --platform android --clean
cd android
.\gradlew :app:bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

The AAB contains `arm64-v8a` and `armeabi-v7a` (Play delivers a per-device
split, so the download is smaller than the `.aab` file).

Verify the signing certificate before uploading:

```powershell
jarsigner -verify -verbose -certs android\app\build\outputs\bundle\release\app-release.aab
```

Upload once to the Play Console and keep **Play App Signing** enabled (Google
re-signs the distributed APKs; the upload key above stays yours).

## Build a local release APK (smoke test on a device)

```powershell
cd android
.\gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Output: `android/app/build/outputs/apk/release/app-release.apk`
(signed with the debug key unless the upload properties above are set).

## AdMob IDs via environment

The ads **SDK is not bundled yet** — release 1.0.0 ships without it and the
reserved `AdSlot` placements render nothing. Production IDs are already plumbed
through the environment so no live ID is ever committed:

```powershell
$env:EXPO_PUBLIC_ADMOB_ANDROID_APP_ID="ca-app-pub-<publisher>~<app>"
$env:EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID="ca-app-pub-<publisher>/<banner>"
```

`app.config.ts` exposes them under `extra.admob` (null when unset). When the
ads phase lands:

1. Install `react-native-google-mobile-ads` (ask first — new dependency) and add
   the plugin with the app ID:
   ```ts
   [
     'react-native-google-mobile-ads',
     { androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID },
   ];
   ```
2. Read the unit IDs from `expo-constants` (`extra.admob`) in `src/core/ads`
   with Google's test IDs as the development default.
3. Keep the UMP consent flow: no ad requests before the consent decision.

Google test IDs stay in development; only `EXPO_PUBLIC_*` values set in the
release shell end up in the store build.

## app-ads.txt

The Play listing's developer website must serve `app-ads.txt` at its root
(`https://<your-domain>/app-ads.txt`). Template: `docs/app-ads.txt`. Fill in
the publisher ID from the AdMob console (Apps → app-ads.txt → the line it shows
you) and host it before the first ads-enabled release.

## R8 / ProGuard

`app.config.ts` (expo-build-properties) enables **R8 minification and resource
shrinking** for release builds. Library keep rules are merged automatically by
the Expo/RN Gradle plugins. The generated
`android/app/proguard-rules.pro` stays as the template writes it; if a rule is
ever needed, add it with a config plugin so `prebuild --clean` does not lose it
(do not edit the generated file by hand).

## Permissions audit

The merged manifest for a release build:

```powershell
npx expo prebuild --platform android --clean
cd android
.\gradlew :app:processReleaseMainManifest
Get-Content app\build\intermediates\merged_manifest\release\processReleaseMainManifest\AndroidManifest.xml |
  Select-String "uses-permission"
```

Verified against the 1.0.0 release APK (`aapt2 dump permissions app-release.apk`):
exactly the allow-list, nothing else.

`ACCESS_FINE_LOCATION, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, AD_ID,
BLUETOOTH_CONNECT, INTERNET, NFC, PACKAGE_USAGE_STATS, SET_ALARM, VIBRATE`

The first two after `NFC` are runtime/optional and only requested when the
matching feature is used.

Two further entries are framework/service level and never shown to the user:
`com.binkod.devicematrix.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (React
Native's own signature permission) and
`com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`
(Play Install Referrer, signature level).

`QUERY_ALL_PACKAGES`, `READ_PHONE_STATE`, `CAMERA`, `RECORD_AUDIO`, contacts,
SMS and `SYSTEM_ALERT_WINDOW` are blocked in `app.config.ts`. The legacy
`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` pair that the
expo-file-system plugin adds for Android 12 and below is blocked there too. If a
dependency ever injects a new permission it appears in this dump — block it or
justify it before shipping.

## Measured results (1.0.0, October 2026)

Release build with R8, resource shrinking and the arm64/armv7 split
(`bundleRelease` + `assembleRelease`; verified on a Nothing A142 running
Android 16 and on an x86_64 API 36 emulator).

**Download size** (`bundletool get-size total --dimensions=ABI` on `app-release.aab`):

| ABI         | per-device download                     |
| ----------- | --------------------------------------- |
| arm64-v8a   | 21.8 MB (21,764,041 – 21,850,953 bytes) |
| armeabi-v7a | 20.1 MB (20,084,835 – 20,171,747 bytes) |

The `.aab` file itself is 59.5 MB and a universal arm64 APK is 47.8 MB — neither
is what Play delivers, so always quote the per-device figure above.

Largest contributors (arm64 split, uncompressed): `librnskia.so` 10.8 MB (the
Skia visuals), `libreactnative.so` 6.7 MB, ~14.4 MB of app dex before
compression, the Hermes JS bundle 5.5 MB, fonts 2.0 MB.

Fonts: import Google-font weights from their per-weight subpaths
(`@expo-google-fonts/inter/400Regular`). Importing from the package root bundles
every weight and italic — measured 8.6 MB instead of 1.1 MB. The one remaining
unused font is `MaterialSymbols_400Regular` (0.9 MB), pulled in by
`expo-router → expo-symbols`, which the app never renders.

**Startup and frames** (Nothing A142, release build):

- Cold start (`am start -W` after one warm-up): 826 ms median (813 / 853 / 826).
- Home, Memory, Battery and the apps list (scroll + live screens): 6,272 frames,
  3 janky (0.05 %), 50th percentile 12 ms, 99th 28 ms, 0 missed vsyncs.
- Focus gating: a mounted but unfocused screen renders 0 frames in 10 s; the
  same screen focused renders ~10 fps of live-update frames. Polling, the
  battery receiver and every looping animation stop on blur.

Emulator builds need `-PreactNativeArchitectures=x86_64` (the AVD is x86_64; the
Play AAB keeps arm64-v8a and armeabi-v7a).

## Release checklist

1. `npm run typecheck && npm run lint && npm test`
2. Bump `android.versionCode` (and `version` when needed)
3. Set the AdMob env vars if shipping ads; check consent flow
4. `npx expo prebuild --platform android --clean`
5. `.\gradlew :app:bundleRelease` → `app-release.aab`
6. Verify signing (`jarsigner -verify`) and permissions (merged manifest)
7. Install the release APK on at least one real phone and one emulator (build
   the emulator APK with `-PreactNativeArchitectures=x86_64`); smoke test Home,
   a live screen, a hardware test and the Apps tab
8. Upload the AAB to the Play Console (internal testing first)
9. Update the Data safety form (`docs/STORE_LISTING.md`) to match the build
10. Keep the upload key and its passwords in two safe places
