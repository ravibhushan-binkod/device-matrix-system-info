import type { BatteryReading } from '@/core/native';
import {
  batteryPlugLabel,
  batteryStatusLabel,
  buildBatteryStats,
  chargingWatts,
} from '@/features/battery/services/battery-stats';

function reading(overrides: Partial<BatteryReading> = {}): BatteryReading {
  return {
    level: 39,
    percent: 39,
    status: 'charging',
    plugged: 'usb',
    health: 'good',
    temperatureC: 38,
    voltageMv: 3881,
    technology: 'Li-ion',
    currentNowUa: 676_100,
    chargeCounterUah: 1_949_220,
    cycleCount: 787,
    powerSave: false,
    ...overrides,
  };
}

describe('chargingWatts', () => {
  it('converts µA × mV to watts', () => {
    expect(chargingWatts(500_000, 4000)).toBe(2);
  });

  it('returns null when a side is missing', () => {
    expect(chargingWatts(null, 4000)).toBeNull();
    expect(chargingWatts(500_000, null)).toBeNull();
  });
});

describe('buildBatteryStats', () => {
  it('builds every row for a charging reading', () => {
    const stats = buildBatteryStats(reading());
    expect(stats).toEqual([
      { key: 'health', label: 'Health', value: 'Good' },
      { key: 'temperature', label: 'Temperature', value: '38.0 °C' },
      { key: 'voltage', label: 'Voltage', value: '3881 mV' },
      { key: 'technology', label: 'Technology', value: 'Li-ion' },
      { key: 'plug', label: 'Plug type', value: 'USB' },
      { key: 'current', label: 'Current', value: '676 mA' },
      { key: 'charging-speed', label: 'Charging speed', value: '2.6 W' },
    ]);
  });

  it('shows a signed current while discharging and no charging speed', () => {
    const stats = buildBatteryStats(
      reading({ status: 'discharging', plugged: 'none', currentNowUa: -220_400 }),
    );
    expect(stats).toContainEqual({ key: 'plug', label: 'Plug type', value: 'Unplugged' });
    expect(stats).toContainEqual({ key: 'current', label: 'Current', value: '-220 mA' });
    expect(stats.some((stat) => stat.key === 'charging-speed')).toBe(false);
  });

  it('hides every row Android did not report', () => {
    const stats = buildBatteryStats(
      reading({
        health: 'unknown',
        temperatureC: null,
        voltageMv: null,
        technology: null,
        plugged: 'unknown',
        currentNowUa: null,
      }),
    );
    expect(stats).toEqual([]);
  });
});

describe('battery labels', () => {
  it('labels the charging state', () => {
    expect(batteryStatusLabel('charging')).toBe('Charging');
    expect(batteryStatusLabel('discharging')).toBe('On battery');
    expect(batteryStatusLabel('full')).toBe('Full');
  });

  it('only labels known, connected plug types', () => {
    expect(batteryPlugLabel('usb')).toBe('USB');
    expect(batteryPlugLabel('ac')).toBe('AC charger');
    expect(batteryPlugLabel('none')).toBeNull();
    expect(batteryPlugLabel('unknown')).toBeNull();
  });
});
