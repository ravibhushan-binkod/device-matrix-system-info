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

## Ads (Google AdMob + UMP consent)

`react-native-google-mobile-ads` **17.3.1** (bundles Google Mobile Ads SDK
25.5.0 and the UMP consent SDK) is integrated. Nothing is requested before UMP
reports `canRequestAds`.

**Which IDs a build uses** (`src/core/ads/config.ts`):

- Development builds always use Google's demo units (`TestIds`), even when live
  IDs are set.
- Release builds use live units only when **all** unit variables are set. One
  missing value keeps the whole build on demo units — never a mix.
- Without `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` the plugin falls back to Google's
  sample app ID from the AdMob quick-start docs
  (`ca-app-pub-3940256099942544~3347511713`), so the native SDK can never crash
  at launch from a missing ID.

```powershell
$env:EXPO_PUBLIC_ADMOB_ANDROID_APP_ID="ca-app-pub-<publisher>~<app>"
$env:EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID="ca-app-pub-<publisher>/<banner>"
$env:EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID="ca-app-pub-<publisher>/<interstitial>"
$env:EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID="ca-app-pub-<publisher>/<native>"
npm run build:release
```

`npm run build:release` prints a loud **"THIS RELEASE BUILD WILL SHIP GOOGLE
TEST ADS"** warning that lists every missing variable
(`scripts/check-admob-env.mjs`). The build continues on purpose — it is a
pre-flight warning, not a gate.

**Consent and startup order** (`src/core/ads/consent.ts`):

1. `AdsConsent.gatherConsent()` — requests consent info and shows the Google
   form when required.
2. If `canRequestAds` is false: status `blocked`, banners render nothing.
3. `mobileAds().setRequestConfiguration(...)` — `maxAdContentRating: PG`,
   `tagForChildDirectedTreatment: false`, `tagForUnderAgeOfConsent: false`,
   `testDeviceIdentifiers`.
4. `mobileAds().initialize()` → status `ready`; banners mount.

UMP or SDK failures (e.g. offline) leave ads off; the app itself never depends
on them.

**Test devices.** Emulators are treated as test devices automatically. For a
real phone: connect it, launch the app so it requests one ad, then read the
hashed ID the SDK prints:

```powershell
adb logcat -d | Select-String "setTestDeviceIds"
```

Put the ID in `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` (comma-separated for several)
and rebuild. Registered test devices always receive demo creatives ("Test Ad")
and never count as invalid traffic.

**Settings → Developer** (gated by `features.adDebugTools`): _Reset consent_,
_Ad Inspector_ (Google's in-app inspector; test devices only) and _Force EEA
consent test_ (sets the UMP debug geography to EEA, resets consent state and
runs the flow again). While the form is unanswered no ad request is made; after
_Do not consent_, UMP still reports that non-personalized ads may be served, so
the SDK keeps loading banners without personalization. The forced geography is
stored in MMKV (`ads.debugGeography`) until _Reset consent_ turns it off.

**Placement rules.** Banners sit between information sections only: max 2 per
screen, at least a screen-height apart, 16 dp clear space from buttons, and
never on splash, permission sheets, Settings, full-screen tests or live graphs.
Current placements: Home (1), Hardware hub mid-grid (1), Network (2), Apps
(header + after item 9), Sensors (after items 9 and 18), and one each on Device,
CPU, Memory, Storage, Battery, Thermal, Display and Camera. App detail, Report,
the Tips check-up, Tools, Settings and sensor live graphs carry none.
Interstitials are built but gated behind `features.interstitialAds = 'off'`.

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

Verified against the current release APK (`aapt2 dump permissions
app-release.apk`) and the merged manifest:

`ACCESS_FINE_LOCATION, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE,
BLUETOOTH_CONNECT, INTERNET, NFC, PACKAGE_USAGE_STATS, SET_ALARM, VIBRATE`

`ACCESS_FINE_LOCATION` and `BLUETOOTH_CONNECT` are runtime/optional and only
requested when the matching feature is used.

The AdMob integration adds exactly four permissions, all framework level and
with no user prompt:

- `com.google.android.gms.permission.AD_ID` — the advertising-ID permission the
  Google Mobile Ads SDK uses (`android.permission.AD_ID` is not a permission
  Android defines, so the manifest declares the real name).
- `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION` and
  `ACCESS_ADSERVICES_TOPICS` — the SDK's Privacy Sandbox declarations (normal
  protection level). Keeping them preserves the SDK's default data handling; to
  opt out of Privacy Sandbox entirely, add them to `blockedPermissions`.

Two permissions injected by the ads dependency chain are **blocked** because
this app never uses them: `android.permission.WAKE_LOCK` (declared by the
`react-native-google-mobile-ads` manifest and the Play measurement library) and
`android.permission.FOREGROUND_SERVICE` (from the `androidx.work` runtime that
`play-services-ads` bundles). Banner ads need neither and the app runs no
foreground service. Re-allow them only if a future video ad format needs them.

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

### 13B — AdMob integration (same 1.0.0 version, October 2026)

Bundling the Google Mobile Ads SDK 25.5.0 + UMP grows the shipping artifacts:

| Artifact                         | Before  | With ads | Delta            |
| -------------------------------- | ------- | -------- | ---------------- |
| `.aab`                           | 59.5 MB | 63.8 MB  | +4.3 MB          |
| universal arm64 APK              | 47.8 MB | 50.9 MB  | +3.1 MB (+6.6 %) |
| per-device download, arm64-v8a   | 21.8 MB | 24.4 MB  | +2.6 MB (+12 %)  |
| per-device download, armeabi-v7a | 20.1 MB | 21.6 MB  | +1.5 MB          |

New per-device ranges, same `bundletool get-size total --dimensions=ABI`
command: arm64-v8a 24,352,218 – 24,479,884 bytes, armeabi-v7a 22,667,980 –
22,795,646 bytes. Emulator x86_64 APK: 51.9 MB.

R8 already strips the SDK's unused classes; what remains is a few
`play-services-*` dexes (ads, measurement, ads-identifier) plus the UMP
messaging layer. Verified on the x86_64 API 36 emulator: "Test Ad" banners on
Home, the hardware hub and CPU detail; no ad requests while the forced-EEA
consent form is unanswered; offline failure collapses the banner and the retry
loads it 60 s after connectivity returns.

## Release checklist

1. `npm run typecheck && npm run lint && npm test`
2. Bump `android.versionCode` (and `version` when needed)
3. Set every AdMob env var (or accept the loud test-ads warning printed by
   `npm run build:release`); check the consent flow and that a banner shows
   "Test Ad"
4. `npx expo prebuild --platform android --clean`
5. `.\gradlew :app:bundleRelease` → `app-release.aab`
6. Verify signing (`jarsigner -verify`) and permissions (merged manifest)
7. Install the release APK on at least one real phone and one emulator (build
   the emulator APK with `-PreactNativeArchitectures=x86_64`); smoke test Home,
   a live screen, a hardware test and the Apps tab
8. Upload the AAB to the Play Console (internal testing first)
9. Update the Data safety form (`docs/STORE_LISTING.md`) to match the build
10. Keep the upload key and its passwords in two safe places
