# Agent notes — Device Matrix: System Info

Read this before changing code. It mirrors the project brief.

## What this is

Android-only device information app. Launcher label **"Device Matrix"**, store name "Device Matrix: System Info". `applicationId com.binkod.devicematrix`, Expo slug `device-matrix`, URL scheme `devicematrix`. **Never use the word "Intel" anywhere** (code, copy, docs).

## Stack (do not add libraries without asking)

Expo SDK 57 (development builds via prebuild/CNG — **never Expo Go**), React Native 0.86, TypeScript strict, Expo Router (routes in `src/app`), Reanimated + Worklets, Gesture Handler, Skia, react-native-svg, Zustand, MMKV, lucide-react-native, local Expo Modules written in Kotlin under `/modules`.

## Hard rules

1. **Size**: Hermes, R8 minification + resource shrinking in release. APK testing on `arm64-v8a` + `armeabi-v7a` only; production is an AAB. Load only fonts/icons actually used. No Lottie, no large images, no unused Expo packages. Report the measured size at the end of every phase that adds a dependency.
2. **No backend**: no Firebase, no database, no accounts, no cloud storage, no network calls except AdMob (and the optional speed test later). Only MMKV for small local settings.
3. **Ads**: Google AdMob (`react-native-google-mobile-ads`) + UMP consent. Google test IDs in development. Never on splash, permission sheets, settings, full-screen tests or live graphs, and never next to buttons.
4. **Permissions allow-list**: `ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, INTERNET, AD_ID, SET_ALARM, VIBRATE, NFC`. Runtime/optional only when the feature needs it: location (Wi-Fi name), `NEARBY_WIFI_DEVICES`, `BLUETOOTH_CONNECT`, Usage Access (special, opened via Settings). **Forbidden: `QUERY_ALL_PACKAGES, READ_PHONE_STATE, CAMERA, RECORD_AUDIO, contacts, SMS, SYSTEM_ALERT_WINDOW`** — already blocked in `app.json`.
5. **Honesty**: only APIs normal Android apps may use. If a value is unavailable (blocked by the OS or the brand), return an `unavailable` result and show **"Not available on this device"**. Never fake or estimate silently. No words like boost/clean/speed up/kill apps. Where Android does not let an app change a setting (e.g. switching Wi-Fi), open the correct system Settings screen.
6. **Architecture**: screen → hook → service → native wrapper (`src/app` → `src/hooks` → `src/services` → `src/native` + `/modules`). UI never calls native code directly. One shared polling hook that pauses when the screen is not focused. Feature flags in `src/core/features.ts`.
7. **Versions**: never guess versions. Install with `npx expo install`. Check the official Expo / React Native / Android docs and report what was chosen and why.
8. **Quality**: TypeScript strict, ESLint, Prettier, small commits, unit tests for pure logic (formatters, tips rules). Run `npm run typecheck`, `npm run lint`, `npm test` before finishing.
9. **Workflow**: do only the current phase. End with a short report (what was done, files changed, how to run it, problems, what the next phase needs), then stop and wait.

## Layout

- `src/app` — Expo Router routes (file-based)
- `src/core` — `Result<T>` model (ok | unavailable | denied) and feature flags; pure logic, unit-tested
- `src/theme` — color tokens, spacing, dark-first `useAppTheme`
- `src/hooks`, `src/services`, `src/native` — added with the feature phases
- `/modules` — Kotlin Expo Modules (added with the native phases)
- `app.json` — app config incl. the permissions allow-list / blocked list

## Commands

`npm run android` (build + install dev client) · `npm start` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm test` · `npx expo-doctor`

## Docs for this SDK

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Expo Router: https://docs.expo.dev/router/introduction/
- React Native 0.86: https://reactnative.dev/docs/0.86/getting-started
