import type { ConnectivityCapabilities } from '@/core/native';
import {
  buildCapabilityGroups,
  capabilityLabel,
  countSystemFeatures,
  FEATURES,
  filterSystemFeatures,
  groupSystemFeatures,
  type CapabilityGroup,
} from '@/features/network/services/connectivity-service';

const ALL_FEATURES = Object.values(FEATURES);

function capabilitiesWith(
  overrides: Partial<ConnectivityCapabilities> = {},
): ConnectivityCapabilities {
  return {
    systemFeatures: ALL_FEATURES,
    wifi: { fiveGhz: true, sixGhz: false, wifi6: true, wifi7: null, scanThrottleEnabled: true },
    bluetooth: {
      leAudio: true,
      le2mPhy: true,
      leCodedPhy: false,
      leExtendedAdvertising: true,
      lePeriodicAdvertising: false,
      multipleAdvertisement: true,
      offloadedScanBatching: null,
    },
    ...overrides,
  };
}

function row(groups: CapabilityGroup[], id: string) {
  return groups.flatMap((group) => group.rows).find((entry) => entry.id === id);
}

describe('buildCapabilityGroups', () => {
  it('keeps the four sections in display order', () => {
    const groups = buildCapabilityGroups({ capabilities: capabilitiesWith() });
    expect(groups.map((group) => group.id)).toEqual(['radios', 'wifi', 'wired', 'telephony']);
  });

  it('maps reported features and radio capabilities', () => {
    const groups = buildCapabilityGroups({ capabilities: capabilitiesWith() });

    expect(row(groups, 'bluetooth')?.supported).toBe(true);
    expect(row(groups, 'bluetooth-le')?.supported).toBe(true);
    expect(row(groups, 'bluetooth-le-audio')?.supported).toBe(true);
    expect(row(groups, 'bluetooth-le-2m')?.supported).toBe(true);
    expect(row(groups, 'bluetooth-le-coded')?.supported).toBe(false);
    expect(row(groups, 'bluetooth-le-ext-adv')?.supported).toBe(true);
    expect(row(groups, 'bluetooth-le-periodic-adv')?.supported).toBe(false);
    expect(row(groups, 'bluetooth-multi-adv')?.supported).toBe(true);
    expect(row(groups, 'nfc')?.supported).toBe(true);
    expect(row(groups, 'nfc-hce')?.supported).toBe(true);
    expect(row(groups, 'uwb')?.supported).toBe(true);

    expect(row(groups, 'wifi')?.supported).toBe(true);
    expect(row(groups, 'wifi-5ghz')?.supported).toBe(true);
    expect(row(groups, 'wifi-6ghz')?.supported).toBe(false);
    expect(row(groups, 'wifi-6')?.supported).toBe(true);
    expect(row(groups, 'wifi-7')?.supported).toBeNull();
    expect(row(groups, 'wifi-direct')?.supported).toBe(true);
    expect(row(groups, 'wifi-aware')?.supported).toBe(true);
    expect(row(groups, 'wifi-rtt')?.supported).toBe(true);
    expect(row(groups, 'wifi-passpoint')?.supported).toBe(true);

    expect(row(groups, 'usb-host')?.supported).toBe(true);
    expect(row(groups, 'usb-accessory')?.supported).toBe(true);
    expect(row(groups, 'gps')?.supported).toBe(true);
    expect(row(groups, 'network-location')?.supported).toBe(true);
    expect(row(groups, 'infrared')?.supported).toBe(true);

    expect(row(groups, 'telephony')?.supported).toBe(true);
    expect(row(groups, 'telephony-calling')?.supported).toBe(true);
    expect(row(groups, 'telephony-data')?.supported).toBe(true);
    expect(row(groups, 'telephony-messaging')?.supported).toBe(true);
    expect(row(groups, 'telephony-euicc')?.supported).toBe(true);
    expect(row(groups, 'telephony-ims')?.supported).toBe(true);
    expect(row(groups, 'telephony-cdma')?.supported).toBe(true);
    expect(row(groups, 'telephony-gsm')?.supported).toBe(true);
  });

  it('reports false when the feature list exists but lacks a feature', () => {
    const groups = buildCapabilityGroups({
      capabilities: capabilitiesWith({ systemFeatures: [FEATURES.wifi] }),
    });

    expect(row(groups, 'wifi')?.supported).toBe(true);
    expect(row(groups, 'bluetooth')?.supported).toBe(false);
    expect(row(groups, 'nfc')?.supported).toBe(false);
    expect(row(groups, 'usb-host')?.supported).toBe(false);
    expect(row(groups, 'telephony')?.supported).toBe(false);
  });

  it('reports null for everything when Android returns no capabilities', () => {
    const groups = buildCapabilityGroups({ capabilities: null });
    for (const group of groups) {
      for (const entry of group.rows) {
        expect(entry.supported).toBeNull();
      }
    }
  });
});

describe('capabilityLabel', () => {
  it('never turns a missing answer into a guess', () => {
    expect(capabilityLabel(true)).toBe('Supported');
    expect(capabilityLabel(false)).toBe('No');
    expect(capabilityLabel(null)).toBe('Not reported');
  });
});

describe('groupSystemFeatures', () => {
  const features = [
    'android.hardware.wifi',
    'android.hardware.wifi.direct',
    'android.hardware.wifi',
    'android.hardware.sensor.accelerometer',
    'android.software.webview',
    'com.google.android.feature.PIXEL_EXPERIENCE',
  ];

  it('groups by prefix, sorted, without duplicates', () => {
    const groups = groupSystemFeatures(features);
    expect(groups.map((group) => group.id)).toEqual([
      'com.google',
      'hardware.sensor',
      'hardware.wifi',
      'software.webview',
    ]);
    expect(groups[2]?.features).toEqual(['android.hardware.wifi', 'android.hardware.wifi.direct']);
  });

  it('keeps short vendor features and bare names whole', () => {
    expect(groupSystemFeatures(['com.example', 'foo']).map((group) => group.id)).toEqual([
      'com.example',
      'foo',
    ]);
  });

  it('handles an empty list', () => {
    expect(groupSystemFeatures([])).toEqual([]);
  });
});

describe('filterSystemFeatures', () => {
  const groups = groupSystemFeatures([
    'android.hardware.wifi',
    'android.hardware.wifi.direct',
    'android.hardware.sensor.accelerometer',
  ]);

  it('matches case-insensitively across the full name', () => {
    const filtered = filterSystemFeatures(groups, 'WIFI');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.features).toEqual([
      'android.hardware.wifi',
      'android.hardware.wifi.direct',
    ]);

    const direct = filterSystemFeatures(groups, 'direct');
    expect(direct[0]?.features).toEqual(['android.hardware.wifi.direct']);
  });

  it('returns every group for an empty query', () => {
    expect(filterSystemFeatures(groups, '   ')).toBe(groups);
  });

  it('returns nothing when there is no match', () => {
    expect(filterSystemFeatures(groups, 'nfc')).toEqual([]);
  });
});

describe('countSystemFeatures', () => {
  it('sums the rows and handles an empty list', () => {
    expect(
      countSystemFeatures([
        { id: 'a', features: ['a', 'b'] },
        { id: 'c', features: ['c'] },
      ]),
    ).toBe(3);
    expect(countSystemFeatures([])).toBe(0);
  });
});
