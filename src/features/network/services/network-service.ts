import {
  getBluetoothInfo,
  getConnectivityInfo,
  getNfcInfo,
  getWifiInfo,
  type BluetoothInfo,
  type ConnectionType,
  type ConnectivityInfo,
  type NfcInfo,
  type PrivateDnsMode,
  type WifiInfo,
} from '@/core/native';
import type { Result } from '@/core/result';

/** Reads the active connection through the native wrapper. */
export function readConnectivity(): Result<ConnectivityInfo> {
  return getConnectivityInfo();
}

export function readWifi(): Result<WifiInfo> {
  return getWifiInfo();
}

export function readBluetooth(): Result<BluetoothInfo> {
  return getBluetoothInfo();
}

export function readNfc(): Result<NfcInfo> {
  return getNfcInfo();
}

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Mobile data',
  ethernet: 'Ethernet',
  vpn: 'VPN',
  bluetooth: 'Bluetooth',
  usb: 'USB',
  other: 'Other',
  none: 'No connection',
};

/** Plain-language label for the transport Android reports. */
export function connectionTypeLabel(type: ConnectionType): string {
  return CONNECTION_LABELS[type];
}

/** On/Off text for a reported toggle; `null` = the OS does not report it. */
export function onOffLabel(value: boolean | null): string | null {
  if (value === null) return null;
  return value ? 'On' : 'Off';
}

/** VPN wording — "Active" reads better than "On" for a tunnel. */
export function vpnLabel(active: boolean): string {
  return active ? 'Active' : 'Not active';
}

/** Private DNS: off / automatic (opportunistic) / a specific hostname. */
export function privateDnsLabel(mode: PrivateDnsMode | null, host: string | null): string | null {
  switch (mode) {
    case 'off':
      return 'Off';
    case 'opportunistic':
      return 'Automatic';
    case 'hostname':
      return host ?? 'On';
    default:
      return null;
  }
}

/** Prefers the IPv4 address, falls back to IPv6. */
export function formatIp(ipv4: string | null, ipv6: string | null): string | null {
  if (ipv4) return ipv4;
  return ipv6;
}

export function formatDnsServers(servers: readonly string[]): string | null {
  const list = servers.map((server) => server.trim()).filter((server) => server.length > 0);
  return list.length > 0 ? list.join(' · ') : null;
}

export function formatLinkSpeed(mbps: number | null): string | null {
  if (mbps === null || mbps <= 0) return null;
  return `${mbps} Mbps`;
}

/** 2.4 / 5 / 6 GHz label for a Wi-Fi centre frequency. */
export function wifiBandLabel(frequencyMhz: number | null): string | null {
  if (frequencyMhz === null || frequencyMhz <= 0) return null;
  if (frequencyMhz >= 2400 && frequencyMhz < 2500) return '2.4 GHz';
  if (frequencyMhz >= 4900 && frequencyMhz < 5925) return '5 GHz';
  if (frequencyMhz >= 5925 && frequencyMhz <= 7125) return '6 GHz';
  return null;
}

/** Wi-Fi channel number for a centre frequency (2.4/5/6 GHz rules). */
export function wifiChannel(frequencyMhz: number | null): number | null {
  if (frequencyMhz === null || frequencyMhz <= 0) return null;
  if (frequencyMhz === 2484) return 14;
  if (frequencyMhz >= 2412 && frequencyMhz < 2500) return Math.round((frequencyMhz - 2407) / 5);
  if (frequencyMhz >= 5000 && frequencyMhz < 5925) return Math.round((frequencyMhz - 5000) / 5);
  if (frequencyMhz >= 5925 && frequencyMhz <= 7125) return Math.round((frequencyMhz - 5950) / 5);
  return null;
}

/** e.g. "5 GHz · channel 44"; the band alone when the channel is unknown. */
export function wifiBandAndChannelLabel(frequencyMhz: number | null): string | null {
  const band = wifiBandLabel(frequencyMhz);
  if (band === null) return null;
  const channel = wifiChannel(frequencyMhz);
  return channel === null ? band : `${band} · channel ${channel}`;
}

const WIFI_STANDARDS: Record<number, string> = {
  1: 'Legacy (a/b/g)',
  4: 'Wi-Fi 4 (n)',
  5: 'Wi-Fi 5 (ac)',
  6: 'Wi-Fi 6 (ax)',
  7: 'WiGig (ad)',
  8: 'Wi-Fi 7 (be)',
};

/** `WifiInfo.getWifiStandard()` code → name. */
export function wifiStandardLabel(code: number | null): string | null {
  if (code === null) return null;
  return WIFI_STANDARDS[code] ?? null;
}

/** Standard 4-bar Wi-Fi mapping from RSSI dBm. */
export function signalBarsFromDbm(dbm: number | null): number | null {
  if (dbm === null) return null;
  if (dbm >= -50) return 4;
  if (dbm >= -60) return 3;
  if (dbm >= -70) return 2;
  if (dbm >= -80) return 1;
  return 0;
}

export function signalQualityLabel(bars: number | null): string | null {
  switch (bars) {
    case 4:
      return 'Excellent';
    case 3:
      return 'Good';
    case 2:
      return 'Fair';
    case 1:
      return 'Weak';
    case 0:
      return 'Very weak';
    default:
      return null;
  }
}

/** "−55 dBm · Excellent"; plain dBm when the quality cannot be named. */
export function signalSummary(dbm: number | null, bars: number | null): string | null {
  if (dbm === null) return null;
  const quality = signalQualityLabel(bars);
  return quality === null ? `${dbm} dBm` : `${dbm} dBm · ${quality}`;
}

/** "Supported"/"No" for capability flags (e.g. Bluetooth LE). */
export function supportLabel(supported: boolean): string {
  return supported ? 'Supported' : 'No';
}
