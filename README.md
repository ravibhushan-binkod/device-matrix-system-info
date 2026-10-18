# Device Matrix: System Info

Android-only device information app ("Device Matrix" on the launcher). Shows device, OS, CPU/GPU, memory, storage, battery, thermal, display, camera, sensors, network/Wi-Fi, apps and tips. Every value is honestly reported: when Android or the manufacturer does not expose something, the app says **"Not available on this device"** instead of guessing.

- App id / package: `com.binkod.devicematrix`
- Expo slug: `device-matrix` · URL scheme: `devicematrix`
- Stack: Expo SDK 57 (RN 0.86), Expo Router, Reanimated, Gesture Handler, Skia, react-native-svg, Zustand, MMKV, lucide-react-native, custom Kotlin Expo Modules under `/modules`
- No backend, no accounts, no analytics. Network is used only for ads (AdMob, planned); settings are stored locally with MMKV.

## Requirements

- Node.js 20+ and npm
- JDK 17 and the Android SDK (build-tools 36+, platform 36+) for local development builds
- A physical Android device (arm64) with USB debugging enabled — the app runs as a **development build**, never in Expo Go

## Getting started

```sh
npm install
npm run android          # prebuild + build + install the development build on the connected device, then start Metro
npm start                # later runs: start Metro for the installed development build
```

`npm run android` needs the device connected via USB with USB debugging allowed. The debug build loads JavaScript from Metro, so keep Metro running (`npm start`) while you use the app.

## Scripts

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run android`       | Prebuild + build + install the **debug** development build    |
| `npm start`             | Start Metro for the installed development build               |
| `npm run build:release` | Build + install the **release** APK (R8-minified, arm64-only) |
| `npm run typecheck`     | `tsc --noEmit`                                                |
| `npm run lint`          | ESLint (`eslint-config-expo`, Prettier-compatible)            |
| `npm run format`        | Prettier write                                                |
| `npm test`              | Jest unit tests (pure logic)                                  |
| `npx expo-doctor`       | Project health check                                          |

## Project rules (short version)

1. **Architecture**: screen → hook → service → native wrapper (see [ARCHITECTURE.md](./ARCHITECTURE.md)). UI never calls native code directly.
2. **Every reading returns `Result<T>`** = `ok | unavailable | denied` (see `src/core/result.ts`). Nothing is faked or silently estimated.
3. **Feature flags** live in `src/core/features.ts` (V1/V2).
4. **Permissions allow-list only** — enforced in `app.config.ts` via `android.permissions` and `android.blockedPermissions`.
5. **Size budget**: Hermes + R8 minification + resource shrinking in release; APK testing on `arm64-v8a` (+ `armeabi-v7a` when needed); production is an AAB. No Lottie, no large images, no unused packages.

## Project layout

```
src/app             Expo Router routes only (thin, file-based)
src/features/<x>    one folder per feature: components/, hooks/, services/, types.ts
src/design-system   tokens, theme hook, shared components, animations, icons
src/core            Result<T>, feature flags, native, permissions, system-settings, storage, ads, utils
src/state           Zustand stores
modules/            local Kotlin Expo Modules (added with the native phases)
assets/images       app icon, adaptive icon and splash assets
```

Routes: five bottom tabs (Home, Hardware, Network, Apps, Tools), `settings` behind the gear icon in the header, and a dev-only `/gallery` route (redirects home in production builds).

## Status

**Phase 1 — foundation**: project shell on Expo SDK 57, Expo Router, strict TypeScript, ESLint + Prettier, Jest, `Result<T>` core model with tests, feature flags, dark-first theme tokens, permission allow-list, development-build workflow.

**Phase 2 — config & dependencies**: `app.config.ts` (minSdk 26, compile/target 36, R8 + resource shrinking, arm64-only APKs), planned libraries installed, placeholder icon and splash, branded home screen.

**Phase 3 — structure & tooling**: tab shell with settings + dev gallery routes, feature-folder skeleton (14 features), design system, core sub-areas, state folder, `build:release` script, `.env.example`, `ARCHITECTURE.md`.

The system information sections land phase by phase.

## License

MIT — see [LICENSE](./LICENSE).
