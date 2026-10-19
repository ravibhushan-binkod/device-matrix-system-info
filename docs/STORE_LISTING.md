# Store listing — Google Play

## App title (26 characters)

```
Device Matrix: System Info
```

## Short description (77 characters, 80 max)

```
Device info, phone specs, CPU monitor and battery health — all on your phone.
```

## Full description

```
Device Matrix: System Info shows what your phone is actually doing — and only what Android really reports. Every value comes from public Android APIs. When the OS or the manufacturer does not expose a reading, the app says "Not available on this device" instead of guessing or estimating.

DEVICE INFO AND SYSTEM INFO AT A GLANCE
• Device and OS: model, manufacturer, build number, kernel, Android version, security patch
• CPU monitor: each core's current and maximum frequency, core count, SoC and GPU identity
• Memory: total and available RAM, low-memory state, live available-memory graph
• Storage: internal capacity, used and free space with a clear breakdown
• Battery health and charging: level, charge state, current, voltage, temperature, battery technology, live current graph
• Thermal: temperature zones and thermal status
• Display: resolution, density, refresh rate, HDR capabilities
• Camera and sensors: the hardware list the OS exposes, with live sensor graphs
• Network: Wi-Fi link details, cellular state, Bluetooth and NFC status

A DEVICE INFO APP WITHOUT THE HYPE
No boosters, no "free up memory" buttons, no fake numbers. Where Android does not let an app change a setting — like switching Wi-Fi — Device Matrix opens the right system Settings screen instead.

HARDWARE TEST TOOLS
• Screen test: step through full-screen colours to check for stuck pixels
• Touch test: drag across the grid to verify every screen zone responds
• Ring, vibration and alarm/time handoff to your clock app

PHONE SPECS AND APP DETAILS
• Searchable, sortable list of installed apps
• App details: version, target SDK, install and update dates, one-tap App info
• Optional Usage Access unlocks per-app sizes (largest apps) and screen-time ranking

PRIVATE BY DESIGN
• No account, no sign-in, no cloud storage, no analytics
• Your readings stay on your phone
• Unavailable values are labelled honestly, never invented

Device Matrix is free to use and supported by ads shown away from live graphs, tests and settings screens.
```

Character count is well under Play's 4 000 limit. The natural search words —
device info, system info, phone specs, CPU monitor, battery health, hardware
test — appear in headings and body copy.

## Data safety answers

The form must match the shipped build. Answer it in two steps:

### Step 1 — while no ad SDK is bundled (release 1.0.0 as built today)

| Question                                                               | Answer                           |
| ---------------------------------------------------------------------- | -------------------------------- |
| Does your app collect or share any of the required user data types?    | **No**                           |
| Is all of the user data collected by your app encrypted in transit?    | N/A (nothing collected)          |
| Do you provide a way for users to request that their data is deleted?  | N/A (no account, no stored data) |
| Has your app been independently validated against a security standard? | No                               |

All readings (device, battery, storage, apps) are read on-device and never
leave it. There is no account, no analytics SDK, no crash reporter and no
cloud storage.

### Step 2 — required before shipping the AdMob integration

When `react-native-google-mobile-ads` is added, the Google Mobile Ads SDK
collects data for advertising. Declare:

| Data type                              | Collected | Shared | Purposes                            | Notes                                                            |
| -------------------------------------- | --------- | ------ | ----------------------------------- | ---------------------------------------------------------------- |
| Device or other IDs                    | Yes       | Yes    | Advertising or marketing            | Advertising ID (the `AD_ID` permission is declared for this)     |
| Location → Approximate location        | Yes       | Yes    | Advertising or marketing            | Only as permitted by Google's current AdMob Data safety guidance |
| App info and performance → Diagnostics | Yes       | Yes    | Advertising or marketing, Analytics | The SDK's own diagnostics, as described in the AdMob guidance    |

These answers must be re-checked against Google's current AdMob Data safety
table at submission time — Google updates it as the SDK changes. Also add the
privacy-policy URL (the app has no account system, so no "account deletion"
flow is required).

## Assets checklist

- Feature graphic 1024 × 500
- Phone screenshots (min 2, up to 8): Home, CPU, Battery, Storage, Apps, Screen test
- App icon: already at `assets/images/icon.png` (1024 × 1024), adaptive icon included
- Privacy policy URL (required by Play even without an account)
