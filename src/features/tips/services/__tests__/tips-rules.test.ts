import {
  countMissingReadings,
  evaluateTips,
  isPatchOlderThanMonths,
  isWifi24Ghz,
  memoryUsedPercent,
  storageFreePercent,
} from '@/features/tips/services/tips-rules';
import type { Tip, TipId, TipsInput } from '@/features/tips/types';

jest.mock('@/core/native', () => ({
  getDisplayInfo: jest.fn(),
}));

const NOW = new Date('2026-10-19T12:00:00.000Z');

/** A device where no rule fires. */
const healthy: TipsInput = {
  storageTotalBytes: 128_000_000_000,
  storageFreeBytes: 64_000_000_000,
  memoryTotalBytes: 8_000_000_000,
  memoryAvailableBytes: 4_000_000_000,
  memoryLow: false,
  uptimeMillis: 86_400_000,
  batteryPercent: 80,
  batteryTemperatureC: 30,
  batteryHealth: 'good',
  batterySaverOn: false,
  refreshRateHz: 60,
  screenTimeoutMs: 30_000,
  brightness: 100,
  brightnessMode: 'auto',
  developerOptions: false,
  usbDebugging: false,
  animationScale: 1,
  wifiConnected: true,
  wifiFrequencyMhz: 5180,
  wifiRssiDbm: -50,
  wifiFiveGhzSupported: true,
  securityPatch: '2026-09-05',
};

function withInput(overrides: Partial<TipsInput>): TipsInput {
  return { ...healthy, ...overrides };
}

function ids(tips: readonly Tip[]): TipId[] {
  return tips.map((tip) => tip.id);
}

function only(tips: readonly Tip[], id: TipId): Tip | undefined {
  const matches = tips.filter((tip) => tip.id === id);
  expect(matches.length).toBeLessThanOrEqual(1);
  return matches[0];
}

describe('evaluateTips', () => {
  it('finds nothing on a healthy device', () => {
    expect(evaluateTips(healthy, NOW)).toEqual([]);
  });

  it('skips rules whose readings are missing', () => {
    const input = withInput({ storageTotalBytes: null, storageFreeBytes: 100 });
    expect(evaluateTips(input, NOW)).toEqual([]);
  });

  it('never fires when every reading is missing', () => {
    const allNull = Object.fromEntries(
      Object.keys(healthy).map((key) => [key, null]),
    ) as unknown as TipsInput;
    expect(evaluateTips(allNull, NOW)).toEqual([]);
    expect(countMissingReadings(allNull)).toBe(Object.keys(healthy).length);
  });

  it('counts missing readings in a full pass', () => {
    expect(countMissingReadings(healthy)).toBe(0);
    expect(countMissingReadings(withInput({ batteryPercent: null, wifiRssiDbm: null }))).toBe(2);
  });

  describe('storage', () => {
    it('warns below 15 % free', () => {
      const free = 0.14 * 128_000_000_000;
      const tips = evaluateTips(withInput({ storageFreeBytes: free }), NOW);
      const tip = only(tips, 'storage');
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBe('storage-manager');
      expect(tip?.body).toContain('14%');
    });

    it('turns critical below 8 % free', () => {
      const free = 0.07 * 128_000_000_000;
      const tip = only(evaluateTips(withInput({ storageFreeBytes: free }), NOW), 'storage');
      expect(tip?.severity).toBe('critical');
      expect(tip?.fix).toBe('storage-manager');
    });

    it('stays quiet at exactly 15 % and keeps 8 % a warning', () => {
      expect(
        only(evaluateTips(withInput({ storageFreeBytes: 0.15 * 128_000_000_000 }), NOW), 'storage'),
      ).toBeUndefined();
      const atBoundary = only(
        evaluateTips(withInput({ storageFreeBytes: 0.08 * 128_000_000_000 }), NOW),
        'storage',
      );
      expect(atBoundary?.severity).toBe('warning');
    });

    it('reports the percentage rounded down, never up', () => {
      const tip = only(
        evaluateTips(withInput({ storageTotalBytes: 100, storageFreeBytes: 7.9 }), NOW),
        'storage',
      );
      expect(tip?.severity).toBe('critical');
      expect(tip?.body).toContain('Only 7% of the storage is free');
    });
  });

  describe('memory', () => {
    it('warns above 85 % used', () => {
      const tip = only(
        evaluateTips(withInput({ memoryAvailableBytes: 0.1 * 8_000_000_000 }), NOW),
        'memory',
      );
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBeNull();
      expect(tip?.body).toContain('90%');
    });

    it('stays quiet at exactly 85 % used', () => {
      expect(
        only(
          evaluateTips(withInput({ memoryAvailableBytes: 0.15 * 8_000_000_000 }), NOW),
          'memory',
        ),
      ).toBeUndefined();
    });

    it('fires on the low-memory flag even when RAM looks free', () => {
      const tip = only(evaluateTips(withInput({ memoryLow: true }), NOW), 'memory');
      expect(tip?.severity).toBe('warning');
      expect(tip?.body).toContain('low');
    });

    it('emits a single memory tip when both signals fire', () => {
      const tips = evaluateTips(
        withInput({ memoryLow: true, memoryAvailableBytes: 0.05 * 8_000_000_000 }),
        NOW,
      );
      expect(ids(tips).filter((id) => id === 'memory')).toHaveLength(1);
    });
  });

  describe('uptime', () => {
    it('tips past 7 days', () => {
      const tip = only(evaluateTips(withInput({ uptimeMillis: 8 * 86_400_000 }), NOW), 'uptime');
      expect(tip?.severity).toBe('tip');
      expect(tip?.fix).toBeNull();
    });

    it('stays quiet at exactly 7 days', () => {
      expect(
        only(evaluateTips(withInput({ uptimeMillis: 7 * 86_400_000 }), NOW), 'uptime'),
      ).toBeUndefined();
    });
  });

  describe('battery', () => {
    it('warns above 40 °C', () => {
      const tip = only(
        evaluateTips(withInput({ batteryTemperatureC: 41 }), NOW),
        'battery-temperature',
      );
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBeNull();
    });

    it('stays quiet at exactly 40 °C', () => {
      expect(
        only(evaluateTips(withInput({ batteryTemperatureC: 40 }), NOW), 'battery-temperature'),
      ).toBeUndefined();
    });

    it('flags unhealthy batteries with the reported label', () => {
      const tip = only(
        evaluateTips(withInput({ batteryHealth: 'overheat' }), NOW),
        'battery-health',
      );
      expect(tip?.severity).toBe('critical');
      expect(tip?.body).toContain('Overheat');
    });

    it('ignores an unknown health reading', () => {
      expect(
        only(evaluateTips(withInput({ batteryHealth: 'unknown' }), NOW), 'battery-health'),
      ).toBeUndefined();
    });

    it('warns below 20 % only when Battery Saver is off', () => {
      const tip = only(
        evaluateTips(withInput({ batteryPercent: 19, batterySaverOn: false }), NOW),
        'battery-low',
      );
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBe('battery-saver');

      expect(
        only(
          evaluateTips(withInput({ batteryPercent: 19, batterySaverOn: true }), NOW),
          'battery-low',
        ),
      ).toBeUndefined();
      expect(
        only(
          evaluateTips(withInput({ batteryPercent: 20, batterySaverOn: false }), NOW),
          'battery-low',
        ),
      ).toBeUndefined();
    });
  });

  describe('display', () => {
    it('tips at 90 Hz and above', () => {
      const tip = only(evaluateTips(withInput({ refreshRateHz: 90 }), NOW), 'display-refresh-rate');
      expect(tip?.severity).toBe('tip');
      expect(tip?.fix).toBe('display');
      expect(
        only(evaluateTips(withInput({ refreshRateHz: 89.9 }), NOW), 'display-refresh-rate'),
      ).toBeUndefined();
    });

    it('tips for timeouts longer than a minute', () => {
      const tip = only(
        evaluateTips(withInput({ screenTimeoutMs: 120_000 }), NOW),
        'display-timeout',
      );
      expect(tip?.fix).toBe('display');
      expect(
        only(evaluateTips(withInput({ screenTimeoutMs: 60_000 }), NOW), 'display-timeout'),
      ).toBeUndefined();
    });

    it('tips for high manual brightness without adaptive brightness', () => {
      const tip = only(
        evaluateTips(withInput({ brightness: 255, brightnessMode: 'manual' }), NOW),
        'display-brightness',
      );
      expect(tip?.severity).toBe('tip');
      expect(tip?.body).toContain('100%');

      expect(
        only(
          evaluateTips(withInput({ brightness: 255, brightnessMode: 'auto' }), NOW),
          'display-brightness',
        ),
      ).toBeUndefined();
      expect(
        only(
          evaluateTips(withInput({ brightness: 128, brightnessMode: 'manual' }), NOW),
          'display-brightness',
        ),
      ).toBeUndefined();
    });
  });

  describe('developer settings', () => {
    it('tips when the animation scale is above 1×', () => {
      const tip = only(
        evaluateTips(withInput({ animationScale: 1.5 }), NOW),
        'developer-animation',
      );
      expect(tip?.severity).toBe('tip');
      expect(tip?.fix).toBe('developer-options');
      expect(tip?.body).toContain('1.5×');
      expect(
        only(evaluateTips(withInput({ animationScale: 0.5 }), NOW), 'developer-animation'),
      ).toBeUndefined();
    });

    it('warns when USB debugging is on', () => {
      const tip = only(evaluateTips(withInput({ usbDebugging: true }), NOW), 'developer-usb');
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBe('developer-options');
      expect(
        only(evaluateTips(withInput({ usbDebugging: false }), NOW), 'developer-usb'),
      ).toBeUndefined();
    });
  });

  describe('Wi-Fi', () => {
    it('tips for 2.4 GHz when the phone supports 5 GHz', () => {
      const tip = only(evaluateTips(withInput({ wifiFrequencyMhz: 2437 }), NOW), 'wifi-band');
      expect(tip?.severity).toBe('tip');
      expect(tip?.fix).toBeNull();
    });

    it('stays quiet when the phone has no 5 GHz support', () => {
      expect(
        only(
          evaluateTips(withInput({ wifiFrequencyMhz: 2437, wifiFiveGhzSupported: false }), NOW),
          'wifi-band',
        ),
      ).toBeUndefined();
    });

    it('warns below -75 dBm and needs a connection', () => {
      const tip = only(evaluateTips(withInput({ wifiRssiDbm: -80 }), NOW), 'wifi-signal');
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBeNull();

      expect(
        only(evaluateTips(withInput({ wifiRssiDbm: -75 }), NOW), 'wifi-signal'),
      ).toBeUndefined();
      expect(
        only(
          evaluateTips(withInput({ wifiConnected: false, wifiRssiDbm: -80 }), NOW),
          'wifi-signal',
        ),
      ).toBeUndefined();
    });
  });

  describe('security patch', () => {
    it('warns when the patch is older than 12 months', () => {
      const tip = only(
        evaluateTips(withInput({ securityPatch: '2025-09-01' }), NOW),
        'security-patch',
      );
      expect(tip?.severity).toBe('warning');
      expect(tip?.fix).toBe('system-update');
    });

    it('stays quiet at exactly 12 months and for unreadable values', () => {
      expect(
        only(evaluateTips(withInput({ securityPatch: '2025-10-19' }), NOW), 'security-patch'),
      ).toBeUndefined();
      expect(
        only(evaluateTips(withInput({ securityPatch: 'not-a-date' }), NOW), 'security-patch'),
      ).toBeUndefined();
    });
  });

  it('sorts findings critical → warning → tip, stable inside a severity', () => {
    const tips = evaluateTips(
      withInput({
        storageFreeBytes: 0.01 * 128_000_000_000,
        usbDebugging: true,
        batteryTemperatureC: 45,
        refreshRateHz: 120,
      }),
      NOW,
    );
    expect(ids(tips)).toEqual([
      'storage',
      'battery-temperature',
      'developer-usb',
      'display-refresh-rate',
    ]);
    expect(tips[0]?.severity).toBe('critical');
  });
});

describe('derivations', () => {
  it('clamps free-storage percentages', () => {
    expect(storageFreePercent(100, 50)).toBe(50);
    expect(storageFreePercent(100, 150)).toBe(100);
    expect(storageFreePercent(100, -5)).toBe(0);
    expect(storageFreePercent(0, 10)).toBeNull();
    expect(storageFreePercent(null, 10)).toBeNull();
  });

  it('computes used-memory percentages', () => {
    expect(memoryUsedPercent(100, 25)).toBe(75);
    expect(memoryUsedPercent(100, 200)).toBe(0);
    expect(memoryUsedPercent(100, -1)).toBe(100);
    expect(memoryUsedPercent(null, 1)).toBeNull();
  });

  it('reads 2.4 GHz centre frequencies only', () => {
    expect(isWifi24Ghz(2412)).toBe(true);
    expect(isWifi24Ghz(2484)).toBe(true);
    expect(isWifi24Ghz(5180)).toBe(false);
    expect(isWifi24Ghz(null)).toBeNull();
    expect(isWifi24Ghz(0)).toBeNull();
  });

  it('parses the security patch date strictly', () => {
    expect(isPatchOlderThanMonths('2025-09-01', 12, NOW)).toBe(true);
    expect(isPatchOlderThanMonths('2025-10-19', 12, NOW)).toBe(false);
    expect(isPatchOlderThanMonths('2025-13-01', 12, NOW)).toBeNull();
    expect(isPatchOlderThanMonths('2025-02-30', 12, NOW)).toBeNull();
    expect(isPatchOlderThanMonths('nope', 12, NOW)).toBeNull();
    expect(isPatchOlderThanMonths(null, 12, NOW)).toBeNull();
  });
});
