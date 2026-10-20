import type { WifiNetwork } from '@/core/native';
import {
  channelGraphBars,
  channelGraphDomain,
  describeSecurity,
  enrichNetwork,
  estimateDistanceMeters,
  filterNetworks,
  formatDistance,
  heightRatioFromRssi,
  scanAgeLabel,
  shortenBssid,
  sortNetworks,
  type AnalyzerNetwork,
} from '@/features/network/services/wifi-analyzer-service';

jest.mock('@/core/native', () => ({
  getBluetoothInfo: jest.fn(),
  getConnectivityCapabilities: jest.fn(),
  getConnectivityInfo: jest.fn(),
  getDataUsage: jest.fn(),
  getDataUsageTopApps: jest.fn(),
  getNfcInfo: jest.fn(),
  getWifiInfo: jest.fn(),
  hasUsageAccess: jest.fn(),
}));

function network(overrides: Partial<AnalyzerNetwork> = {}): AnalyzerNetwork {
  return {
    ssid: 'Home',
    bssid: 'AA:BB:CC:DD:EE:FF',
    rssiDbm: -50,
    frequencyMhz: 2437,
    channelWidthCode: 0,
    standardCode: 4,
    securityTypes: [2, 4],
    capabilities: '[WPA2-PSK-CCMP][WPA3-SAE][ESS]',
    ageMs: 1_000,
    channel: 6,
    band: '2.4',
    bars: 4,
    security: 'WPA2/WPA3',
    standard: 'Wi-Fi 4 (n)',
    channelWidth: '20 MHz',
    distanceMeters: 3.1,
    ...overrides,
  };
}

describe('describeSecurity', () => {
  it('uses the Android 14+ security codes first', () => {
    expect(describeSecurity([0], '')).toBe('Open');
    expect(describeSecurity([1], '')).toBe('WEP');
    expect(describeSecurity([2], '')).toBe('WPA2');
    expect(describeSecurity([4], '')).toBe('WPA3');
    expect(describeSecurity([6], '')).toBe('Enhanced Open');
    expect(describeSecurity([13], '')).toBe('WPA3 (DPP)');
    expect(describeSecurity([2, 4], '')).toBe('WPA2/WPA3');
    expect(describeSecurity([2, 2], '')).toBe('WPA2');
  });

  it('prefers the codes over the capability text', () => {
    expect(describeSecurity([0], '[WPA2-PSK-CCMP][ESS]')).toBe('Open');
  });

  it('parses the classic capability strings when codes are missing', () => {
    expect(describeSecurity([], '[WPA2-PSK-CCMP][ESS]')).toBe('WPA2');
    expect(describeSecurity([], '[WPA2-PSK-CCMP][WPA3-SAE-AES][ESS]')).toBe('WPA2/WPA3');
    expect(describeSecurity([], '[WPA3-SAE-AES][ESS]')).toBe('WPA3');
    expect(describeSecurity([], '[RSN-PSK-CCMP][ESS]')).toBe('WPA2');
    expect(describeSecurity([], '[WPA2-EAP-CCMP][ESS]')).toBe('WPA2 Enterprise');
    expect(describeSecurity([], '[WPA3-SAE-EAP][ESS]')).toBe('WPA3 Enterprise');
    expect(describeSecurity([], '[RSN-EAP-CCMP][ESS]')).toBe('WPA2 Enterprise');
    expect(describeSecurity([], '[OWE][ESS]')).toBe('Enhanced Open');
    expect(describeSecurity([], '[WEP][ESS]')).toBe('WEP');
    expect(describeSecurity([], '[ESS]')).toBe('Open');
  });

  it('reads "Unknown" when nothing decodes', () => {
    expect(describeSecurity([], '')).toBe('Unknown');
    expect(describeSecurity([], '   ')).toBe('Unknown');
    expect(describeSecurity([99], '[FOO]')).toBe('Unknown');
  });
});

describe('estimateDistanceMeters', () => {
  it('applies the free-space path loss formula', () => {
    // 2.437 GHz at −50 dBm ≈ 3.1 m; 5.18 GHz at −60 dBm ≈ 4.6 m.
    expect(estimateDistanceMeters(2437, -50)).toBeCloseTo(3.1, 1);
    expect(estimateDistanceMeters(5180, -60)).toBeCloseTo(4.6, 1);
  });

  it('refuses values that cannot be a real reading', () => {
    expect(estimateDistanceMeters(0, -50)).toBeNull();
    expect(estimateDistanceMeters(-1, -50)).toBeNull();
    expect(estimateDistanceMeters(Number.NaN, -50)).toBeNull();
    expect(estimateDistanceMeters(2437, 0)).toBeNull();
    expect(estimateDistanceMeters(2437, -127)).toBeNull();
    expect(estimateDistanceMeters(2437, Number.NaN)).toBeNull();
  });
});

describe('formatDistance', () => {
  it('always marks the value as an estimate', () => {
    expect(formatDistance(0.4)).toBe('≈ < 1 m');
    expect(formatDistance(3.14)).toBe('≈ 3.1 m');
    expect(formatDistance(43.4)).toBe('≈ 43 m');
    expect(formatDistance(234)).toBe('≈ 230 m');
    expect(formatDistance(1500)).toBe('≈ > 1 km');
    expect(formatDistance(null)).toBeNull();
  });
});

describe('shortenBssid', () => {
  it('keeps the first three and last octets', () => {
    expect(shortenBssid('a4:7b:2c:11:22:9f')).toBe('A4:7B:2C:…:9F');
  });

  it('handles missing and malformed addresses', () => {
    expect(shortenBssid(null)).toBe('—');
    expect(shortenBssid('')).toBe('—');
    expect(shortenBssid('not-a-mac')).toBe('NOT-A-MAC');
  });
});

describe('enrichNetwork', () => {
  it('derives every display field', () => {
    const raw: WifiNetwork = {
      ssid: 'Cafe',
      bssid: 'aa:bb:cc:dd:ee:ff',
      rssiDbm: -60,
      frequencyMhz: 5220,
      channelWidthCode: 2,
      standardCode: 6,
      securityTypes: [],
      capabilities: '[WPA2-PSK-CCMP][ESS]',
      ageMs: 500,
    };

    expect(enrichNetwork(raw)).toMatchObject({
      channel: 44,
      band: '5',
      bars: 3,
      security: 'WPA2',
      standard: 'Wi-Fi 6 (ax)',
      channelWidth: '80 MHz',
    });
    expect(enrichNetwork(raw).distanceMeters).toBeGreaterThan(0);
  });

  it('marks unreadable values as null instead of guessing', () => {
    const raw: WifiNetwork = {
      ssid: null,
      bssid: null,
      rssiDbm: -200,
      frequencyMhz: 900,
      channelWidthCode: 99,
      standardCode: 99,
      securityTypes: [],
      capabilities: '',
      ageMs: 0,
    };

    expect(enrichNetwork(raw)).toMatchObject({
      channel: null,
      band: 'other',
      bars: 0,
      security: 'Unknown',
      standard: null,
      channelWidth: null,
      distanceMeters: null,
    });
  });
});

describe('sortNetworks', () => {
  const weak = network({ ssid: 'Zulu', rssiDbm: -80, channel: 11 });
  const strong = network({ ssid: 'Alpha', rssiDbm: -40, channel: 1, bssid: '11:22:33:44:55:66' });
  const hidden = network({
    ssid: null,
    bssid: '22:33:44:55:66:77',
    rssiDbm: -60,
    channel: null,
  });

  it('sorts by signal, strongest first', () => {
    expect(sortNetworks([weak, hidden, strong], 'signal').map((entry) => entry.ssid)).toEqual([
      'Alpha',
      null,
      'Zulu',
    ]);
  });

  it('sorts by name and uses the hidden-network label', () => {
    expect(sortNetworks([weak, hidden, strong], 'name').map((entry) => entry.ssid)).toEqual([
      'Alpha',
      null,
      'Zulu',
    ]);
  });

  it('sorts by channel and puts unknown channels last', () => {
    expect(sortNetworks([weak, hidden, strong], 'channel').map((entry) => entry.channel)).toEqual([
      1,
      11,
      null,
    ]);
  });

  it('does not mutate the input', () => {
    const input = [weak, strong];
    sortNetworks(input, 'signal');
    expect(input[0]).toBe(weak);
  });
});

describe('filterNetworks', () => {
  const networks = [
    network({ band: '2.4' }),
    network({ band: '5' }),
    network({ band: '6' }),
    network({ band: 'other' }),
  ];

  it('keeps everything for "all"', () => {
    expect(filterNetworks(networks, 'all')).toHaveLength(4);
  });

  it('filters one band at a time', () => {
    expect(filterNetworks(networks, '2.4')).toHaveLength(1);
    expect(filterNetworks(networks, '5')).toHaveLength(1);
    expect(filterNetworks(networks, '6')).toHaveLength(1);
    expect(filterNetworks(networks, 'other')).toHaveLength(1);
  });
});

describe('channel graph', () => {
  it('exposes the two band domains', () => {
    expect(channelGraphDomain('2.4')).toEqual({ min: 1, max: 14, ticks: [1, 6, 11, 14] });
    expect(channelGraphDomain('5').min).toBe(36);
    expect(channelGraphDomain('5').max).toBe(177);
  });

  it('uses the channel width so neighbours overlap', () => {
    const bars = channelGraphBars([network({ channel: 6, channelWidthCode: 0 })], '2.4');
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ channel: 6, channelStart: 4, units: 4 });
  });

  it('clips a wide bar to the graph domain', () => {
    const bars = channelGraphBars(
      [network({ band: '5', frequencyMhz: 5180, channel: 36, channelWidthCode: 2 })],
      '5',
    );
    expect(bars[0]).toMatchObject({ channelStart: 36, units: 8 });
  });

  it('skips other bands, unknown channels and 6 GHz', () => {
    const bars = channelGraphBars(
      [
        network({ band: '2.4', channel: 1 }),
        network({ band: '5', channel: 36 }),
        network({ band: '5', channel: null }),
        network({ band: '6', channel: 5 }),
      ],
      '2.4',
    );
    expect(bars).toHaveLength(1);
    expect(bars[0]?.channel).toBe(1);
  });

  it('sorts the bars so shorter ones draw first', () => {
    const bars = channelGraphBars(
      [
        network({ ssid: 'Strong', rssiDbm: -40, channel: 1, bssid: 'AA:AA:AA:AA:AA:01' }),
        network({ ssid: 'Weak', rssiDbm: -85, channel: 6, bssid: 'AA:AA:AA:AA:AA:02' }),
      ],
      '2.4',
    );
    expect(bars.map((bar) => bar.label)).toEqual(['Weak', 'Strong']);
  });
});

describe('heightRatioFromRssi', () => {
  it('maps the signal range to 0..1 with a floor', () => {
    expect(heightRatioFromRssi(-30)).toBe(1);
    expect(heightRatioFromRssi(-95)).toBe(0.08);
    expect(heightRatioFromRssi(-120)).toBe(0.08);
    expect(heightRatioFromRssi(-60)).toBeCloseTo(35 / 65, 5);
  });
});

describe('scanAgeLabel', () => {
  it('describes the scan age in words', () => {
    expect(scanAgeLabel(null)).toBeNull();
    expect(scanAgeLabel(2_000)).toBe('just now');
    expect(scanAgeLabel(30_000)).toBe('30 s ago');
    expect(scanAgeLabel(90_000)).toBe('2 min ago');
    expect(scanAgeLabel(3_600_000)).toBe('1 h ago');
    expect(scanAgeLabel(-5_000)).toBe('just now');
  });
});
