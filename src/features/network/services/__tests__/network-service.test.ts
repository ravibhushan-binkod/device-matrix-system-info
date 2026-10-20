import {
  connectionTypeLabel,
  formatDnsServers,
  formatIp,
  formatLinkSpeed,
  formatSubnet,
  formatTxRxSpeeds,
  onOffLabel,
  privateDnsLabel,
  proxyLabel,
  roamingLabel,
  signalBarsFromDbm,
  signalQualityLabel,
  signalSummary,
  supportLabel,
  vpnLabel,
  wifiBand,
  wifiBandAndChannelLabel,
  wifiBandLabel,
  wifiChannel,
  wifiChannelWidthLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';

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

describe('connection labels', () => {
  it('names every transport Android reports', () => {
    expect(connectionTypeLabel('wifi')).toBe('Wi-Fi');
    expect(connectionTypeLabel('cellular')).toBe('Mobile data');
    expect(connectionTypeLabel('ethernet')).toBe('Ethernet');
    expect(connectionTypeLabel('vpn')).toBe('VPN');
    expect(connectionTypeLabel('none')).toBe('No connection');
  });

  it('formats on/off toggles', () => {
    expect(onOffLabel(true)).toBe('On');
    expect(onOffLabel(false)).toBe('Off');
    expect(onOffLabel(null)).toBeNull();
  });

  it('formats the VPN state', () => {
    expect(vpnLabel(true)).toBe('Active');
    expect(vpnLabel(false)).toBe('Not active');
  });

  it('formats Private DNS', () => {
    expect(privateDnsLabel('off', null)).toBe('Off');
    expect(privateDnsLabel('opportunistic', null)).toBe('Automatic');
    expect(privateDnsLabel('hostname', 'dns.example')).toBe('dns.example');
    expect(privateDnsLabel(null, null)).toBeNull();
  });
});

describe('addresses', () => {
  it('prefers IPv4 and falls back to IPv6', () => {
    expect(formatIp('192.168.1.5', '2a00::1')).toBe('192.168.1.5');
    expect(formatIp(null, '2a00::1')).toBe('2a00::1');
    expect(formatIp(null, null)).toBeNull();
  });

  it('joins the DNS servers', () => {
    expect(formatDnsServers(['1.1.1.1', '8.8.8.8'])).toBe('1.1.1.1 · 8.8.8.8');
    expect(formatDnsServers([])).toBeNull();
    expect(formatDnsServers(['', '   '])).toBeNull();
  });
});

describe('Wi-Fi link details', () => {
  it('formats the link speed', () => {
    expect(formatLinkSpeed(866)).toBe('866 Mbps');
    expect(formatLinkSpeed(0)).toBeNull();
    expect(formatLinkSpeed(null)).toBeNull();
  });

  it('labels the frequency bands', () => {
    expect(wifiBandLabel(2437)).toBe('2.4 GHz');
    expect(wifiBandLabel(5180)).toBe('5 GHz');
    expect(wifiBandLabel(6115)).toBe('6 GHz');
    expect(wifiBandLabel(900)).toBeNull();
    expect(wifiBandLabel(null)).toBeNull();
  });

  it('computes channel numbers', () => {
    expect(wifiChannel(2412)).toBe(1);
    expect(wifiChannel(2437)).toBe(6);
    expect(wifiChannel(2484)).toBe(14);
    expect(wifiChannel(5180)).toBe(36);
    expect(wifiChannel(5955)).toBe(1);
    expect(wifiChannel(900)).toBeNull();
  });

  it('combines band and channel', () => {
    expect(wifiBandAndChannelLabel(5220)).toBe('5 GHz · channel 44');
    expect(wifiBandAndChannelLabel(null)).toBeNull();
  });

  it('names the Wi-Fi standards', () => {
    expect(wifiStandardLabel(4)).toBe('Wi-Fi 4 (n)');
    expect(wifiStandardLabel(6)).toBe('Wi-Fi 6 (ax)');
    expect(wifiStandardLabel(8)).toBe('Wi-Fi 7 (be)');
    expect(wifiStandardLabel(99)).toBeNull();
    expect(wifiStandardLabel(null)).toBeNull();
  });
});

describe('signal', () => {
  it('maps dBm to bars', () => {
    expect(signalBarsFromDbm(-45)).toBe(4);
    expect(signalBarsFromDbm(-55)).toBe(3);
    expect(signalBarsFromDbm(-65)).toBe(2);
    expect(signalBarsFromDbm(-75)).toBe(1);
    expect(signalBarsFromDbm(-90)).toBe(0);
    expect(signalBarsFromDbm(null)).toBeNull();
  });

  it('labels the quality', () => {
    expect(signalQualityLabel(4)).toBe('Excellent');
    expect(signalQualityLabel(0)).toBe('Very weak');
    expect(signalQualityLabel(null)).toBeNull();
  });

  it('summarises dBm and quality', () => {
    expect(signalSummary(-55, 3)).toBe('-55 dBm · Good');
    expect(signalSummary(-95, 0)).toBe('-95 dBm · Very weak');
    expect(signalSummary(null, null)).toBeNull();
  });
});

describe('supportLabel', () => {
  it('labels capability flags', () => {
    expect(supportLabel(true)).toBe('Supported');
    expect(supportLabel(false)).toBe('No');
  });
});

describe('phase 13D formatters', () => {
  it('turns a prefix length into a subnet mask', () => {
    expect(formatSubnet(24)).toBe('255.255.255.0 (/ 24)');
    expect(formatSubnet(16)).toBe('255.255.0.0 (/ 16)');
    expect(formatSubnet(0)).toBe('0.0.0.0 (/ 0)');
    expect(formatSubnet(32)).toBe('255.255.255.255 (/ 32)');
    expect(formatSubnet(33)).toBeNull();
    expect(formatSubnet(24.5)).toBeNull();
    expect(formatSubnet(null)).toBeNull();
  });

  it('labels a manual proxy and lets a PAC URL win', () => {
    expect(proxyLabel('10.0.0.2', 8080, null)).toBe('10.0.0.2:8080');
    expect(proxyLabel('10.0.0.2', null, null)).toBe('10.0.0.2');
    expect(proxyLabel(null, null, 'https://pac.example/proxy.pac')).toBe(
      'PAC · https://pac.example/proxy.pac',
    );
    expect(proxyLabel(null, null, null)).toBeNull();
  });

  it('formats the transmit and receive link speeds', () => {
    expect(formatTxRxSpeeds(866, 780)).toBe('866 / 780 Mbps');
    expect(formatTxRxSpeeds(null, 780)).toBe('— / 780 Mbps');
    expect(formatTxRxSpeeds(null, null)).toBeNull();
  });

  it('labels every ScanResult channel width', () => {
    expect(wifiChannelWidthLabel(0)).toBe('20 MHz');
    expect(wifiChannelWidthLabel(1)).toBe('40 MHz');
    expect(wifiChannelWidthLabel(2)).toBe('80 MHz');
    expect(wifiChannelWidthLabel(3)).toBe('160 MHz');
    expect(wifiChannelWidthLabel(4)).toBe('80 + 80 MHz');
    expect(wifiChannelWidthLabel(5)).toBe('320 MHz');
    expect(wifiChannelWidthLabel(9)).toBeNull();
    expect(wifiChannelWidthLabel(null)).toBeNull();
  });

  it('says whether a mobile connection is roaming', () => {
    expect(roamingLabel(true)).toBe('Roaming');
    expect(roamingLabel(false)).toBe('Not roaming');
    expect(roamingLabel(null)).toBeNull();
  });

  it('returns the band key for a frequency', () => {
    expect(wifiBand(2437)).toBe('2.4');
    expect(wifiBand(5180)).toBe('5');
    expect(wifiBand(6115)).toBe('6');
    expect(wifiBand(900)).toBeNull();
    expect(wifiBand(null)).toBeNull();
  });
});
