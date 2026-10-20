import { requireOptionalNativeModule } from 'expo';
import type NetworkExtModule from '@modules/network-ext/src/NetworkExtModule';

import { denied, ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeNetworkExtModule = typeof NetworkExtModule;

export type ConnectionType =
  'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'bluetooth' | 'usb' | 'other' | 'none';

export type PrivateDnsMode = 'off' | 'opportunistic' | 'hostname';

export type ConnectivityInfo = {
  type: ConnectionType;
  metered: boolean;
  vpnActive: boolean;
  /** `null` when Android does not report the Data Saver toggle. */
  dataSaver: boolean | null;
  airplaneMode: boolean | null;
  privateDnsMode: PrivateDnsMode | null;
  /** The hostname when Private DNS is set to a specific server. */
  privateDnsHost: string | null;
  operatorName: string | null;
  /** Only reported for the cellular network (API 28+); null otherwise. */
  roaming: boolean | null;
  /** Current IPv4 address of the active connection. */
  ipv4: string | null;
  /** Current IPv6 address of the active connection (no link-local). */
  ipv6: string | null;
  /** IPv4 subnet prefix length, e.g. 24 for 255.255.255.0. */
  subnetPrefix: number | null;
  gateway: string | null;
  dnsServers: string[];
  /** A manually configured proxy host, or the PAC URL; both null when off. */
  proxyHost: string | null;
  proxyPort: number | null;
  proxyPacUrl: string | null;
};

export type WifiInfo = {
  enabled: boolean | null;
  /** Whether the radio can use the 5 GHz band at all; `null` when undefined. */
  fiveGhzSupported: boolean | null;
  connected: boolean;
  /** `null` while Android redacts the name (no location permission, not connected). */
  ssid: string | null;
  linkSpeedMbps: number | null;
  /** Android 11+ TX/RX link speeds; null on older builds or when idle. */
  txLinkSpeedMbps: number | null;
  rxLinkSpeedMbps: number | null;
  frequencyMhz: number | null;
  rssiDbm: number | null;
  /** `ScanResult.WIFI_STANDARD_*` code: 1 legacy, 4 = n, 5 = ac, 6 = ax, 7 = ad, 8 = be. */
  standardCode: number | null;
  /** `ScanResult.CHANNEL_WIDTH_*` code; needs scan access, null otherwise. */
  channelWidthCode: number | null;
};

export type BluetoothInfo = {
  present: boolean;
  enabled: boolean | null;
  /** The radio supports Bluetooth Low Energy. */
  leSupported: boolean;
};

export type NfcInfo = {
  present: boolean;
  enabled: boolean | null;
};

export type WifiScanStart = {
  started: boolean;
  /** `true` when Android refused to start the scan (throttle, radio off). */
  throttled: boolean;
  scanThrottleEnabled: boolean | null;
};

export type WifiNetwork = {
  /** `null` when the name is hidden or Android redacts it. */
  ssid: string | null;
  /** `null` when the address is hidden or Android redacts it. */
  bssid: string | null;
  rssiDbm: number;
  frequencyMhz: number;
  /** `ScanResult.CHANNEL_WIDTH_*` code. */
  channelWidthCode: number;
  standardCode: number | null;
  /** Security codes (Android 14+); empty when the OS does not report them. */
  securityTypes: number[];
  /** Raw capability string, e.g. `[WPA2-PSK-CCMP][WPA3-SAE][ESS]`. */
  capabilities: string;
  /** Milliseconds since this result was seen. */
  ageMs: number;
};

export type WifiScanResults = {
  networks: WifiNetwork[];
  scanThrottleEnabled: boolean | null;
  /** Age of the newest result; null when the cache is empty. */
  lastScanAgeMs: number | null;
};

export type WifiCapabilities = {
  fiveGhz: boolean | null;
  sixGhz: boolean | null;
  wifi6: boolean | null;
  wifi7: boolean | null;
  scanThrottleEnabled: boolean | null;
};

export type BluetoothCapabilities = {
  leAudio: boolean | null;
  le2mPhy: boolean | null;
  leCodedPhy: boolean | null;
  leExtendedAdvertising: boolean | null;
  lePeriodicAdvertising: boolean | null;
  multipleAdvertisement: boolean | null;
  offloadedScanBatching: boolean | null;
};

export type ConnectivityCapabilities = {
  /** Every feature the OS reports (`PackageManager.getSystemAvailableFeatures`). */
  systemFeatures: string[];
  wifi: WifiCapabilities;
  bluetooth: BluetoothCapabilities;
};

export type UsageBucket = {
  startMs: number;
  endMs: number;
  rxBytes: number;
  txBytes: number;
};

export type UsageSeries = {
  buckets: UsageBucket[];
  rxBytes: number;
  txBytes: number;
};

export type DataUsage = {
  wifi: UsageSeries | null;
  mobile: UsageSeries | null;
  /** Android withheld the mobile figures (the app never requests READ_PHONE_STATE). */
  mobileBlocked: boolean;
};

export type AppNetworkUsage = {
  uid: number;
  packageName: string | null;
  label: string | null;
  wifiRxBytes: number;
  wifiTxBytes: number;
  mobileRxBytes: number;
  mobileTxBytes: number;
};

export type DataUsageTopApps = {
  apps: AppNetworkUsage[];
  mobileBlocked: boolean;
};

export const USAGE_ACCESS_PERMISSION = 'android.permission.PACKAGE_USAGE_STATS';
export const WIFI_SCAN_PERMISSION = 'android.permission.NEARBY_WIFI_DEVICES';

let cached: NativeNetworkExtModule | null | undefined;

function getModule(): NativeNetworkExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeNetworkExtModule>('NetworkExt');
  } catch {
    cached = null;
  }
  return cached;
}

const CONNECTION_TYPES: readonly ConnectionType[] = [
  'wifi',
  'cellular',
  'ethernet',
  'vpn',
  'bluetooth',
  'usb',
  'other',
  'none',
];

export function getConnectivityInfo(): Result<ConnectivityInfo> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getConnectivityInfo();
    if (!raw) return unavailable('Android did not return network information.');
    const privateDnsMode =
      raw.privateDnsMode === 'off' ||
      raw.privateDnsMode === 'opportunistic' ||
      raw.privateDnsMode === 'hostname'
        ? raw.privateDnsMode
        : null;
    return ok({
      type: (CONNECTION_TYPES as readonly string[]).includes(raw.type)
        ? (raw.type as ConnectionType)
        : 'other',
      metered: raw.metered,
      vpnActive: raw.vpn,
      dataSaver: raw.dataSaver,
      airplaneMode: raw.airplaneMode,
      privateDnsMode,
      privateDnsHost: raw.privateDnsHost?.trim() || null,
      operatorName: raw.operatorName?.trim() || null,
      roaming: raw.roaming,
      ipv4: raw.ipv4,
      ipv6: raw.ipv6,
      subnetPrefix: raw.subnetPrefix,
      gateway: raw.gateway,
      dnsServers: raw.dnsServers.filter((server) => server.length > 0),
      proxyHost: raw.proxyHost?.trim() || null,
      proxyPort: raw.proxyPort,
      proxyPacUrl: raw.proxyPacUrl?.trim() || null,
    });
  } catch {
    return unavailable('Reading network information failed.');
  }
}

export function getWifiInfo(): Result<WifiInfo> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getWifiInfo();
    if (!raw) return unavailable('Android did not return Wi-Fi information.');
    return ok({
      enabled: raw.enabled,
      fiveGhzSupported: raw.fiveGhzSupported,
      connected: raw.connected,
      ssid: raw.ssid,
      linkSpeedMbps: raw.linkSpeedMbps,
      txLinkSpeedMbps: raw.txLinkSpeedMbps ?? null,
      rxLinkSpeedMbps: raw.rxLinkSpeedMbps ?? null,
      frequencyMhz: raw.frequencyMhz,
      rssiDbm: raw.rssiDbm,
      standardCode: raw.standardCode,
      channelWidthCode: raw.channelWidth ?? null,
    });
  } catch {
    return unavailable('Reading Wi-Fi information failed.');
  }
}

export function getBluetoothInfo(): Result<BluetoothInfo> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getBluetoothInfo();
    if (!raw) return unavailable('Android did not return Bluetooth information.');
    if (!raw.present) return unavailable('This device has no Bluetooth hardware.');
    // Android 12+ blocks the state read without the Nearby devices permission.
    if (raw.enabled === null) return denied('android.permission.BLUETOOTH_CONNECT');
    return ok({
      present: raw.present,
      enabled: raw.enabled,
      leSupported: raw.leSupported,
    });
  } catch {
    return unavailable('Reading Bluetooth information failed.');
  }
}

export function getNfcInfo(): Result<NfcInfo> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getNfcInfo();
    if (!raw) return unavailable('Android did not return NFC information.');
    if (!raw.present) return unavailable('This device has no NFC hardware.');
    return ok({
      present: raw.present,
      enabled: raw.enabled,
    });
  } catch {
    return unavailable('Reading NFC information failed.');
  }
}

/** Asks Android to run a Wi-Fi scan; throttling is reported, never hidden. */
export function startWifiScan(): Result<WifiScanStart> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.startWifiScan();
    if (!raw) return denied(WIFI_SCAN_PERMISSION);
    return ok({
      started: raw.started === true,
      throttled: raw.throttled === true,
      scanThrottleEnabled: raw.scanThrottleEnabled ?? null,
    });
  } catch {
    return unavailable('Starting a Wi-Fi scan failed.');
  }
}

/** The scan cache; results are timestamped so the UI can show their age. */
export function getWifiScanResults(): Result<WifiScanResults> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getWifiScanResults();
    if (!raw) return denied(WIFI_SCAN_PERMISSION);
    return ok({
      networks: raw.networks.map((network) => ({
        ssid: network.ssid,
        bssid: network.bssid,
        rssiDbm: network.rssiDbm,
        frequencyMhz: network.frequencyMhz,
        channelWidthCode: network.channelWidth,
        standardCode: network.standardCode,
        securityTypes: network.securityTypes ?? [],
        capabilities: network.capabilities ?? '',
        ageMs: network.ageMs,
      })),
      scanThrottleEnabled: raw.scanThrottleEnabled ?? null,
      lastScanAgeMs: raw.lastScanAgeMs ?? null,
    });
  } catch {
    return unavailable('Reading the Wi-Fi scan list failed.');
  }
}

/** Radio capability flags and every system feature the OS reports. */
export function getConnectivityCapabilities(): Result<ConnectivityCapabilities> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = module.getConnectivityCapabilities();
    if (!raw) return unavailable('Android did not return connectivity capabilities.');
    return ok({
      systemFeatures: raw.systemFeatures.filter((name) => name.length > 0),
      wifi: {
        fiveGhz: raw.wifi.fiveGhzSupported,
        sixGhz: raw.wifi.sixGhzSupported,
        wifi6: raw.wifi.standard6Supported,
        wifi7: raw.wifi.standard7Supported,
        scanThrottleEnabled: raw.wifi.scanThrottleEnabled,
      },
      bluetooth: {
        leAudio: raw.bluetooth.leAudioSupported,
        le2mPhy: raw.bluetooth.le2mPhySupported,
        leCodedPhy: raw.bluetooth.leCodedPhySupported,
        leExtendedAdvertising: raw.bluetooth.leExtendedAdvertisingSupported,
        lePeriodicAdvertising: raw.bluetooth.lePeriodicAdvertisingSupported,
        multipleAdvertisement: raw.bluetooth.multipleAdvertisementSupported,
        offloadedScanBatching: raw.bluetooth.offloadedScanBatchingSupported,
      },
    });
  } catch {
    return unavailable('Reading connectivity capabilities failed.');
  }
}

/** Why data usage needs the special permission; shown with the settings button. */
export const USAGE_ACCESS_REASON =
  'Usage Access is needed to read data usage. Grant it in Settings.';

/** Wi-Fi/mobile traffic per bucket for a range; needs Usage Access. */
export async function getDataUsage(
  startMs: number,
  endMs: number,
  bucketMs: number,
): Promise<Result<DataUsage>> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = await module.getDataUsage(startMs, endMs, bucketMs);
    if (!raw || !raw.usageAccess) return denied(USAGE_ACCESS_PERMISSION);
    return ok({
      wifi: raw.wifi ?? null,
      mobile: raw.mobile ?? null,
      mobileBlocked: raw.mobileBlocked === true,
    });
  } catch {
    return unavailable('Android did not return data usage.');
  }
}

/** Per-app traffic totals for a range; needs Usage Access. */
export async function getDataUsageTopApps(
  startMs: number,
  endMs: number,
): Promise<Result<DataUsageTopApps>> {
  const module = getModule();
  if (!module) return unavailable('The NetworkExt native module is not in this build.');
  try {
    const raw = await module.getDataUsageTopApps(startMs, endMs);
    if (!raw || !raw.usageAccess) return denied(USAGE_ACCESS_PERMISSION);
    return ok({
      apps: raw.apps.map((app) => ({
        uid: app.uid,
        packageName: app.packageName ?? null,
        label: app.label ?? null,
        wifiRxBytes: app.wifiRxBytes ?? 0,
        wifiTxBytes: app.wifiTxBytes ?? 0,
        mobileRxBytes: app.mobileRxBytes ?? 0,
        mobileTxBytes: app.mobileTxBytes ?? 0,
      })),
      mobileBlocked: raw.mobileBlocked === true,
    });
  } catch {
    return unavailable('Android did not return per-app data usage.');
  }
}
