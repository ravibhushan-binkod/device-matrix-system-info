import {
  getBluetoothInfo,
  getConnectivityCapabilities,
  getConnectivityInfo,
  getDataUsage,
  getDataUsageTopApps,
  getNfcInfo,
  getWifiInfo,
  hasUsageAccess,
  type BluetoothInfo,
  type ConnectionType,
  type ConnectivityCapabilities,
  type ConnectivityInfo,
  type DataUsage,
  type DataUsageTopApps,
  type NfcInfo,
  type PrivateDnsMode,
  type WifiInfo,
} from '@/core/native';
import type { Result } from '@/core/result';
import { getActiveUnits } from '@/core/units/active';
import { formatNetworkSpeed } from '@/core/units/format';
import type { ResolvedUnits } from '@/core/units/types';

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

/** The Wi-Fi/Bluetooth capability flags plus the full system feature list. */
export function readConnectivityCapabilities(): Result<ConnectivityCapabilities> {
  return getConnectivityCapabilities();
}

/** Whether Usage Access is granted (Settings > Special app access). */
export function readUsageAccess(): Result<boolean> {
  return hasUsageAccess();
}

/** Wi-Fi/mobile traffic per bucket for a range; needs Usage Access. */
export function readDataUsage(
  startMs: number,
  endMs: number,
  bucketMs: number,
): Promise<Result<DataUsage>> {
  return getDataUsage(startMs, endMs, bucketMs);
}

/** Per-app traffic totals for a range; needs Usage Access. */
export function readTopApps(startMs: number, endMs: number): Promise<Result<DataUsageTopApps>> {
  return getDataUsageTopApps(startMs, endMs);
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

/** The IPv4 subnet mask for a prefix length, e.g. 24 → "255.255.255.0 (/24)". */
export function formatSubnet(prefixLength: number | null): string | null {
  if (prefixLength === null || !Number.isInteger(prefixLength)) return null;
  if (prefixLength < 0 || prefixLength > 32) return null;
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  const text = [24, 16, 8, 0].map((shift) => (mask >>> shift) & 0xff).join('.');
  return `${text} (/ ${prefixLength})`;
}

/** A manually set proxy; PAC takes precedence in the string when both exist. */
export function proxyLabel(
  host: string | null,
  port: number | null,
  pacUrl: string | null,
): string | null {
  if (pacUrl) return `PAC · ${pacUrl}`;
  if (!host) return null;
  return port ? `${host}:${port}` : host;
}

/** "866 / 866 Mbps" (TX / RX); a missing side reads "—". */
export function formatTxRxSpeeds(
  tx: number | null,
  rx: number | null,
  units: ResolvedUnits = getActiveUnits(),
): string | null {
  if (tx === null && rx === null) return null;
  const suffix = ` ${units.networkSpeed}`;
  // The unit is printed once at the end, so strip it from each side.
  const number = (mbps: number): string => {
    const formatted = formatNetworkSpeed(mbps, units.networkSpeed);
    return formatted.endsWith(suffix) ? formatted.slice(0, -suffix.length) : formatted;
  };
  const left = tx === null ? '—' : number(tx);
  const right = rx === null ? '—' : number(rx);
  return `${left} / ${right}${suffix}`;
}

/** `ScanResult.CHANNEL_WIDTH_*` code → label. */
export function wifiChannelWidthLabel(code: number | null): string | null {
  if (code === null) return null;
  switch (code) {
    case 0:
      return '20 MHz';
    case 1:
      return '40 MHz';
    case 2:
      return '80 MHz';
    case 3:
      return '160 MHz';
    case 4:
      return '80 + 80 MHz';
    case 5:
      return '320 MHz';
    default:
      return null;
  }
}

/** Roaming wording for a cellular connection. */
export function roamingLabel(roaming: boolean | null): string | null {
  if (roaming === null) return null;
  return roaming ? 'Roaming' : 'Not roaming';
}

export function formatDnsServers(servers: readonly string[]): string | null {
  const list = servers.map((server) => server.trim()).filter((server) => server.length > 0);
  return list.length > 0 ? list.join(' · ') : null;
}

export function formatLinkSpeed(
  mbps: number | null,
  units: ResolvedUnits = getActiveUnits(),
): string | null {
  if (mbps === null || mbps <= 0) return null;
  return formatNetworkSpeed(mbps, units.networkSpeed);
}

/** 2.4 / 5 / 6 GHz discriminant for a Wi-Fi centre frequency. */
export function wifiBand(frequencyMhz: number | null): '2.4' | '5' | '6' | null {
  if (frequencyMhz === null || frequencyMhz <= 0) return null;
  if (frequencyMhz >= 2400 && frequencyMhz < 2500) return '2.4';
  if (frequencyMhz >= 4900 && frequencyMhz < 5925) return '5';
  if (frequencyMhz >= 5925 && frequencyMhz <= 7125) return '6';
  return null;
}

/** 2.4 / 5 / 6 GHz label for a Wi-Fi centre frequency. */
export function wifiBandLabel(frequencyMhz: number | null): string | null {
  const band = wifiBand(frequencyMhz);
  return band === null ? null : `${band} GHz`;
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
