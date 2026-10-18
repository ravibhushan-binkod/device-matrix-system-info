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

One shared polling hook (added with the feature phases) drives live readings such as the CPU graph, and pauses whenever its screen is not focused.

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

| Path                  | Contents                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`             | Expo Router routes only: the `(tabs)` shell, `settings`, dev-only `gallery`. Thin wrappers around feature screens.                                                                           |
| `src/features/<name>` | `components/`, `hooks/`, `services/`, `types.ts` — one folder per feature (dashboard, battery, memory, storage, cpu, thermal, display, camera, sensors, network, apps, tools, tips, report). |
| `src/design-system`   | `tokens.ts` (colors, spacing, radius), `theme.ts` (`useAppTheme`), `components/`, `animations/`, `icons.ts`.                                                                                 |
| `src/core`            | `result.ts`, `features.ts`, and the cross-cutting areas: `native/`, `permissions/`, `system-settings/`, `storage/`, `ads/`, `utils/`.                                                        |
| `src/state`           | Zustand stores (small, local-only settings first).                                                                                                                                           |
| `modules/`            | Local Kotlin Expo Modules (added with the native phases).                                                                                                                                    |
| `assets/images`       | App icon, adaptive icon, splash. Only what ships.                                                                                                                                            |

## Adding a feature (checklist)

1. Create/complete `src/features/<name>/`, starting from `types.ts`.
2. Native wrapper in `src/core/native` — or a Kotlin module in `modules/` for what the wrappers cannot reach.
3. Service that returns `Result<T>`; keep pure logic unit-tested.
4. Hook that wires focus/polling.
5. Components, plus a thin route (or a section inside the right tab's screen).
