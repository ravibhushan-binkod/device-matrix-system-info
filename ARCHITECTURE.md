# Architecture

Device Matrix is a thin Expo Router shell over feature modules. One rule decides where code lives: **the layering rule**.

## Layering: screen → hook → service → native wrapper

```
screen              src/app/**  (thin routes)  +  src/features/<feature>/components/**
  ↓ uses
hook                src/features/<feature>/hooks/**      (reads, polling, state wiring)
  ↓ uses
service             src/features/<feature>/services/**   (aggregation, formatting, no React)
  ↓ uses
native wrapper      src/core/native/**  +  /modules (local Kotlin Expo Modules, with the native phases)
```

- A **screen** renders UI and calls hooks. A route file in `src/app` stays thin: it renders a feature component and nothing else.
- A **hook** owns the React lifecycle — focus, polling, memoized derivations — and returns `Result<T>`-based state to the screen.
- A **service** talks to the native side through the wrappers, shapes the data and formats values. No React imports.
- A **native wrapper** is the only place that imports native modules (`expo-*`, `react-native-device-info`, MMKV, `modules/*`) and the only place that catches their platform errors.
- UI never imports a native module directly. A feature never imports another feature's internals — shared code moves to `src/design-system`, `src/core` or `src/state`.

One shared polling hook (`src/core/hooks/use-polling.ts`) drives every live reading: it ticks on an interval, pauses while its screen is not focused and stops while the app is in the background. Native event streams follow the same rule through their hooks (`useSensorStream` subscribes only while the sensor detail screen is focused and unregisters the listener on exit).

## `Result<T>` — honesty as a type

Every reading the app shows is a `Result<T>` (see `src/core/result.ts`):

```ts
type Result<T> =
  | { status: 'ok'; value: T }
  | { status: 'unavailable'; reason: string }
  | { status: 'denied'; permission: string };
```

- `ok` — the value was read through a normal Android API.
- `unavailable` — the OS, the device or the manufacturer does not expose it; the UI shows **"Not available on this device"**.
- `denied` — a runtime permission the reading needs was denied; the screen offers the right path to grant it.

Helpers: `ok()`, `unavailable()`, `denied()`, `mapResult()`, `getOrElse()`, `describeResult()`.

Services and native wrappers never throw across layers and never fake a value: a reading is either real, or one of the non-ok states above. Anything the app cannot do through public Android APIs is not shown at all.

## Folder map

| Path                  | Contents                                                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`             | Expo Router routes only: the `(tabs)` shell, `settings`, `battery`, the hardware detail routes (`device`, `cpu`, `thermal`, `memory`, `storage`, `display`, `camera`, `sensors`, `sensors/[type]`), dev-only `dev/gallery`. Thin wrappers around feature screens.   |
| `src/features/<name>` | `components/`, `hooks/`, `services/`, `types.ts` — one folder per feature (dashboard, battery, memory, storage, cpu, thermal, display, camera, sensors, network, apps, tools, tips, report).                                                                         |
| `src/design-system`   | `tokens.ts` (palette, 4 dp spacing, radius, type scale), `theme.tsx` (`ThemeProvider`, `useTheme`), `icon.tsx` (`<Icon>`), `status.ts` + `color.ts` helpers, `components/`, `visuals/` (Skia gauges), `animations/`.                                                 |
| `src/core`            | `result.ts`, `features.ts`, `hooks/` (shared polling + system-settings launcher), and the cross-cutting areas: `native/` (Result-based wrappers over the Kotlin modules), `permissions/`, `system-settings/`, `storage/`, `ads/`, `utils/` (unit-tested formatters). |
| `src/state`           | Zustand stores (small, local-only settings first).                                                                                                                                                                                                                   |
| `modules/`            | Local Kotlin Expo Modules: `device-stats` (memory, storage, uptime, thermal, OS/kernel info), `battery-ext` (detailed battery readings + live listener), `hardware-ext` (CPU cores/frequencies, GPU identity, display panel/modes/brightness, camera characteristics — all read-only, no permissions) and `sensor-ext` (full sensor list + one live stream). |
| `assets/images`       | App icon, adaptive icon, splash. Only what ships.                                                                                                                                                                                                                    |

### Theming, motion and feedback (rules for every phase)

- Screens never hardcode colours or sizes: they use `useTheme().colors` and the tokens. The five text styles (`display`, `title`, `body`, `caption`, `mono`) are the only type scale.
- `ThemeProvider` (in `src/app/_layout.tsx`) receives `mode` (system/dark/light) and `accent` from `src/state/settings-store.ts`; both persist in MMKV.
- Every animation checks `useReducedMotion()` and only animates transform/opacity/paths. Press feedback comes from `PressableScale` (scale + haptic); list entrances from `StaggerItem`.
- Availability wording is fixed: unavailable data renders "Not available on this device" (`EmptyState`).

## Adding a feature (checklist)

1. Create/complete `src/features/<name>/`, starting from `types.ts`.
2. Native wrapper in `src/core/native` — or a Kotlin module in `modules/` for what the wrappers cannot reach.
3. Service that returns `Result<T>`; keep pure logic unit-tested.
4. Hook that wires focus/polling.
5. Components, plus a thin route (or a section inside the right tab's screen).
