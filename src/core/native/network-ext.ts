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
  /** Current IPv4 address of the active connection. */
  ipv4: string | null;
  /** Current IPv6 address of the active connection (no link-local). */
  ipv6: string | null;
  gateway: string | null;
  dnsServers: string[];
};

export type WifiInfo = {
  enabled: boolean | null;
  /** Whether the radio can use the 5 GHz band at all; `null` when undefined. */
  fiveGhzSupported: boolean | null;
  connected: boolean;
  /** `null` while Android redacts the name (no location permission, not connected). */
  ssid: string | null;
  linkSpeedMbps: number | null;
  frequencyMhz: number | null;
  rssiDbm: number | null;
  /** `ScanResult.WIFI_STANDARD_*` code: 1 legacy, 4 = n, 5 = ac, 6 = ax, 7 = ad, 8 = be. */
  standardCode: number | null;
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
      ipv4: raw.ipv4,
      ipv6: raw.ipv6,
      gateway: raw.gateway,
      dnsServers: raw.dnsServers.filter((server) => server.length > 0),
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
      frequencyMhz: raw.frequencyMhz,
      rssiDbm: raw.rssiDbm,
      standardCode: raw.standardCode,
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
