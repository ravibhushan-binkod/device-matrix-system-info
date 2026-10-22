# Privacy audit — identifiers the app must never read

> DRAFT - needs legal review. This is an engineering audit of the app's own
> code, not a legal opinion and not a compliance claim.

Checked on **2026-10-21** against the working tree at Phase 13K. The audit
covers `src/` (TypeScript) and `modules/` (the Kotlin Expo Modules).

## Result

| Identifier                                | Read by the app? | Evidence                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IMEI / MEID                               | No               | No `getDeviceId`, `TelephonyManager`, `imei` or `getImei` reference in `src/` or `modules/`.                                                                                                                                                              |
| Hardware serial number                    | No               | No `getSerial`, `Build.getSerial` or `serialNumber` reference.                                                                                                                                                                                            |
| Android ID (`Settings.Secure.ANDROID_ID`) | No               | No `getAndroidId`, `ANDROID_ID` or `Settings.Secure` reference.                                                                                                                                                                                           |
| Advertising ID                            | No (app code)    | No `advertisingId`, `getAdId`, `IDFA` or `trackingAuthorization` reference. The Google Mobile Ads SDK may access it natively for ads — see the Privacy policy's Advertising section.                                                                      |
| Phone number                              | No               | No `phoneNumber`, `line1Number` or `getPhoneNumber` reference.                                                                                                                                                                                            |
| Wi-Fi / Bluetooth MAC address             | No               | No `macAddress`, `getMacAddress`, `wifiMac` or `NetworkInterface` reference.                                                                                                                                                                              |
| Precise location                          | No               | No `getCurrentPosition`, `Geolocation` or `watchPosition` call. `ACCESS_FINE_LOCATION` appears only as a _permission request_ needed so Android will return the connected Wi-Fi network name (`src/core/permissions/index.ts`), never as a location read. |
| Installed app list                        | Yes, on request  | `QUERY_ALL_PACKAGES` is not declared; the launcher list uses `queryIntentActivities` for launcher intents only.                                                                                                                                           |

The Android manifest allow-list in `app.config.ts` keeps `QUERY_ALL_PACKAGES`,
`READ_PHONE_STATE`, `CAMERA`, `RECORD_AUDIO`, contacts, SMS and
`SYSTEM_ALERT_WINDOW` blocked outright.

## What the app does read that can identify a network

- Connected Wi-Fi SSID and, where Android reports it, BSSID, IP addresses,
  gateway and DNS servers.
- Nearby Wi-Fi network names (Wi-Fi analyzer), which Android classifies as
  location data.
- The Android build fingerprint.

All of these are masked by default — see `Settings → Privacy → Hide sensitive
values` — revealed per value for ten seconds on tap, and excluded from text and
PDF reports unless “Include identifying details” is turned on for a single
export.

## Reproduce

```powershell
rg -n "imei|getDeviceId|getSerialNumber|getAndroidId|serialNumber|androidId|phoneNumber|line1Number" src modules
rg -n "macAddress|getMacAddress|wifiMac|getCurrentPosition|Geolocation|watchPosition" src modules
rg -n "advertisingId|getAdId|IDFA|trackingAuthorization" src modules
```

Each command must return no matches (the first also matching the unrelated
`getDeviceIdentity` helper, which reads brand/model/API level only).
