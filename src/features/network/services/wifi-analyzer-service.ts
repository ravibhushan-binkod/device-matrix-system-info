import type { WifiNetwork } from '@/core/native';
import { getActiveUnits } from '@/core/units/active';
import type { ResolvedUnits } from '@/core/units/types';
import {
  signalBarsFromDbm,
  wifiBand,
  wifiChannel,
  wifiChannelWidthLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';

/** Which band a scan result belongs to; `other` covers anything unrecognised. */
export type WifiBandKey = '2.4' | '5' | '6' | 'other';

export type AnalyzerNetwork = WifiNetwork & {
  channel: number | null;
  band: WifiBandKey;
  bars: number | null;
  /** Human security summary, e.g. "WPA2/WPA3"; "Unknown" when nothing readable. */
  security: string;
  standard: string | null;
  channelWidth: string | null;
  /** Free-space estimate from RSSI; only ever shown with "≈" and "Estimated". */
  distanceMeters: number | null;
};

export type WifiBandFilter = 'all' | WifiBandKey;
export type WifiSort = 'signal' | 'name' | 'channel';

const SECURITY_BY_CODE: Record<number, string> = {
  0: 'Open',
  1: 'WEP',
  2: 'WPA2',
  3: 'WPA Enterprise',
  4: 'WPA3',
  5: 'WPA3 Enterprise 192-bit',
  6: 'Enhanced Open',
  7: 'WAPI PSK',
  8: 'WAPI certificate',
  9: 'WPA3 Enterprise',
  10: 'OSEN',
  11: 'Passpoint',
  12: 'Passpoint',
  13: 'WPA3 (DPP)',
};

/** Joins the security codes Android 14+ reports; null when none are known. */
function securityFromCodes(types: readonly number[]): string | null {
  const labels = [...new Set(types.map((type) => SECURITY_BY_CODE[type]).filter(Boolean))];
  if (labels.length === 0) return null;
  if (labels.includes('WPA2') && labels.includes('WPA3')) return 'WPA2/WPA3';
  return labels.join(' · ');
}

/** Parses the classic `[WPA2-PSK-CCMP][WPA3-SAE-AES]` capability string. */
function securityFromCapabilities(capabilities: string): string | null {
  const text = capabilities.toUpperCase();
  if (text.trim() === '') return null;
  const enterprise = text.includes('EAP');
  if (text.includes('SAE')) {
    if (enterprise) return 'WPA3 Enterprise';
    return text.includes('PSK') ? 'WPA2/WPA3' : 'WPA3';
  }
  if (text.includes('OWE')) return 'Enhanced Open';
  if (text.includes('WPA3')) return enterprise ? 'WPA3 Enterprise' : 'WPA3';
  if (text.includes('RSN')) return enterprise ? 'WPA2 Enterprise' : 'WPA2';
  if (text.includes('WPA2')) return enterprise ? 'WPA2 Enterprise' : 'WPA2';
  if (text.includes('WPA')) return enterprise ? 'WPA Enterprise' : 'WPA';
  if (text.includes('WEP')) return 'WEP';
  return text.includes('ESS') ? 'Open' : null;
}

/** Security summary for a scan result: the OS codes first, the capability text as fallback. */
export function describeSecurity(securityTypes: readonly number[], capabilities: string): string {
  return securityFromCodes(securityTypes) ?? securityFromCapabilities(capabilities) ?? 'Unknown';
}

/**
 * Rough distance in metres from RSSI, using the free-space path loss formula
 * `d = 10^((27.55 − 20·log10(f) + |RSSI|) / 20)` with f in MHz. Walls, bodies
 * and antenna direction make this an estimate only — the UI always says so.
 */
export function estimateDistanceMeters(frequencyMhz: number, rssiDbm: number): number | null {
  if (!Number.isFinite(frequencyMhz) || frequencyMhz <= 0) return null;
  if (!Number.isFinite(rssiDbm) || rssiDbm >= 0 || rssiDbm <= -127) return null;
  const exponent = (27.55 - 20 * Math.log10(frequencyMhz) + Math.abs(rssiDbm)) / 20;
  const meters = 10 ** exponent;
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

/** "≈ 5.2 m" / "≈ 43 m" / "> 1 km"; never a bare number. */
export function formatDistance(
  meters: number | null,
  units: ResolvedUnits = getActiveUnits(),
): string | null {
  if (meters === null) return null;
  if (units.distance === 'ft') {
    const feet = meters * 3.28084;
    if (feet < 3) return '≈ < 3 ft';
    if (feet < 10) return `≈ ${feet.toFixed(1)} ft`;
    if (feet < 100) return `≈ ${Math.round(feet)} ft`;
    if (feet < 1000) return `≈ ${Math.round(feet / 5) * 5} ft`;
    return '≈ > 1000 ft';
  }
  if (meters < 1) return '≈ < 1 m';
  if (meters < 10) return `≈ ${meters.toFixed(1)} m`;
  if (meters < 100) return `≈ ${Math.round(meters)} m`;
  if (meters < 1000) return `≈ ${Math.round(meters / 10) * 10} m`;
  return '≈ > 1 km';
}

/** Shortens a BSSID for display: "A4:7B:2C:…:9F". The full value stays copyable. */
export function shortenBssid(bssid: string | null): string {
  if (!bssid) return '—';
  const parts = bssid.toUpperCase().split(':');
  if (parts.length !== 6) return bssid.toUpperCase();
  return `${parts[0]}:${parts[1]}:${parts[2]}:…:${parts[5]}`;
}

/** The label used when the name is hidden or redacted. */
export const HIDDEN_SSID_LABEL = 'Hidden network';

function bandKey(frequencyMhz: number): WifiBandKey {
  return wifiBand(frequencyMhz) ?? 'other';
}

/** Adds the derived fields the screen shows. */
export function enrichNetwork(network: WifiNetwork): AnalyzerNetwork {
  return {
    ...network,
    channel: wifiChannel(network.frequencyMhz),
    band: bandKey(network.frequencyMhz),
    bars: signalBarsFromDbm(network.rssiDbm),
    security: describeSecurity(network.securityTypes, network.capabilities),
    standard: wifiStandardLabel(network.standardCode),
    channelWidth: wifiChannelWidthLabel(network.channelWidthCode),
    distanceMeters: estimateDistanceMeters(network.frequencyMhz, network.rssiDbm),
  };
}

export function enrichNetworks(networks: WifiNetwork[]): AnalyzerNetwork[] {
  return networks.map(enrichNetwork);
}

/** Sort order for the list; ties fall back to the signal, then the name. */
export function sortNetworks(networks: AnalyzerNetwork[], sort: WifiSort): AnalyzerNetwork[] {
  const copy = [...networks];
  if (sort === 'name') {
    copy.sort((a, b) => networkName(a).localeCompare(networkName(b)) || b.rssiDbm - a.rssiDbm);
  } else if (sort === 'channel') {
    copy.sort(
      (a, b) =>
        (a.channel ?? Number.POSITIVE_INFINITY) - (b.channel ?? Number.POSITIVE_INFINITY) ||
        b.rssiDbm - a.rssiDbm,
    );
  } else {
    copy.sort((a, b) => b.rssiDbm - a.rssiDbm || networkName(a).localeCompare(networkName(b)));
  }
  return copy;
}

function networkName(network: AnalyzerNetwork): string {
  return network.ssid ?? HIDDEN_SSID_LABEL;
}

/** Band filter; `all` keeps everything. */
export function filterNetworks(
  networks: AnalyzerNetwork[],
  band: WifiBandFilter,
): AnalyzerNetwork[] {
  if (band === 'all') return networks;
  return networks.filter((network) => network.band === band);
}

/** One row of the channel-overlap graph. */
export type ChannelGraphBar = {
  key: string;
  /** First channel unit the bar covers (centred on the network's channel). */
  channelStart: number;
  /** Width in channel units (5 MHz steps). */
  units: number;
  /** 0..1 bar height from RSSI. */
  heightRatio: number;
  label: string;
  channel: number;
};

export type ChannelGraphDomain = {
  min: number;
  max: number;
  ticks: number[];
};

const GRAPH_DOMAINS: Record<'2.4' | '5', ChannelGraphDomain> = {
  '2.4': { min: 1, max: 14, ticks: [1, 6, 11, 14] },
  '5': { min: 36, max: 177, ticks: [36, 64, 100, 149, 177] },
};

export function channelGraphDomain(band: '2.4' | '5'): ChannelGraphDomain {
  return GRAPH_DOMAINS[band];
}

/** Width in channel units for a channel-width code (each 5 MHz is one unit). */
function widthUnits(code: number): number {
  const mhz = [20, 40, 80, 160, 80, 320][code];
  return (mhz ?? 20) / 5;
}

/**
 * Bars for the channel graph: one per network, centred on its channel, with
 * the width from its channel width so overlapping channels are visible.
 */
export function channelGraphBars(
  networks: AnalyzerNetwork[],
  band: '2.4' | '5',
): ChannelGraphBar[] {
  const domain = GRAPH_DOMAINS[band];
  return networks
    .filter((network) => network.band === band && network.channel !== null)
    .map((network) => {
      const channel = network.channel as number;
      const units = widthUnits(network.channelWidthCode);
      const start = channel - units / 2;
      // Clip to the domain so a wide channel never draws outside the axis.
      const clippedStart = Math.max(domain.min, start);
      const clippedEnd = Math.min(domain.max, channel + units / 2);
      return {
        key: `${network.bssid ?? network.ssid ?? 'network'}:${channel}:${network.rssiDbm}`,
        channelStart: clippedStart,
        units: Math.max(0.5, clippedEnd - clippedStart),
        heightRatio: heightRatioFromRssi(network.rssiDbm),
        label: networkName(network),
        channel,
      };
    })
    .sort((a, b) => a.heightRatio - b.heightRatio);
}

/** RSSI → 0..1 bar height (−30 dBm full, −95 dBm the floor, minimum 8%). */
export function heightRatioFromRssi(rssiDbm: number): number {
  const ratio = (rssiDbm + 95) / 65;
  return Math.min(1, Math.max(0.08, ratio));
}

/** "just now" / "2 min ago" / "1 h ago" for the scan cache age. */
export function scanAgeLabel(ageMs: number | null): string | null {
  if (ageMs === null) return null;
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

/** The band-filter chips, in display order. */
export const BAND_FILTERS: readonly { id: WifiBandFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: '2.4', label: '2.4 GHz' },
  { id: '5', label: '5 GHz' },
  { id: '6', label: '6 GHz' },
];

export const SORT_OPTIONS: readonly { id: WifiSort; label: string }[] = [
  { id: 'signal', label: 'Signal' },
  { id: 'name', label: 'Name' },
  { id: 'channel', label: 'Channel' },
];
