# Device Matrix: System Info

Android-only device information app ("Device Matrix" on the launcher). Shows device, OS, CPU/GPU, memory, storage, battery, thermal, display, camera, sensors, network/Wi-Fi, apps and tips. Every value is honestly reported: when Android or the manufacturer does not expose something, the app says **"Not available on this device"** instead of guessing.

- App id / package: `com.binkod.devicematrix`
- Expo slug: `device-matrix` · URL scheme: `devicematrix`
- Stack: Expo SDK 57 (RN 0.86), Expo Router, Reanimated, Gesture Handler, Skia, react-native-svg, Zustand, MMKV, lucide-react-native, custom Kotlin Expo Modules under `/modules`
- No backend, no accounts, no analytics. Network is used only for ads (AdMob, planned); settings are stored locally with MMKV.

## Requirements

- Node.js 20+ and npm
- JDK 17 and the Android SDK (build-tools 36+, platform 36+) for local development builds
- A physical Android device or emulator — the app runs as a **development build**, never in Expo Go

## Getting started

```sh
npm install
npm run android   # prebuild + build + install the development build, then start Metro
npm start         # later runs: start Metro for the installed development build
```

## Scripts

| Command             | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run android`   | Prebuild + build + install the debug development build |
| `npm start`         | Start Metro for the installed development build        |
| `npm run typecheck` | `tsc --noEmit`                                         |
| `npm run lint`      | ESLint (`eslint-config-expo`, Prettier-compatible)     |
| `npm run format`    | Prettier write                                         |
| `npm test`          | Jest unit tests (pure logic)                           |
| `npx expo-doctor`   | Project health check                                   |

## Project rules (short version)

1. **Architecture**: screen → hook → service → native wrapper. UI never calls native code directly.
2. **Every reading returns `Result<T>`** = `ok | unavailable | denied` (see `src/core/result.ts`). Nothing is faked or silently estimated.
3. **Feature flags** live in `src/core/features.ts` (V1/V2).
4. **Permissions allow-list only** — enforced in `app.json` via `android.permissions` and `android.blockedPermissions`.
5. **Size budget**: Hermes + R8 minification + resource shrinking in release; APK testing on `arm64-v8a` and `armeabi-v7a`; production is an AAB. No Lottie, no large images, no unused packages.

## Project layout

```
src/app       Expo Router routes (file-based)
src/core      Result<T>, feature flags (pure logic, unit-tested)
src/theme     color tokens, spacing, dark-first useAppTheme hook
assets/images app icon, adaptive icon and splash assets
modules/      local Kotlin Expo Modules (added with the native phases)
```

## Status

**Phase 1 — foundation** complete: project shell on Expo SDK 57, Expo Router, strict TypeScript, ESLint + Prettier, Jest, `Result<T>` core model with tests, feature flags, dark-first theme tokens, permission allow-list, development-build workflow.

The system information sections land phase by phase.

## License

MIT — see [LICENSE](./LICENSE).
