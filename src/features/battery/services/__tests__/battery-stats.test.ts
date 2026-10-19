import type { BatteryReading } from '@/core/native';
import {
  batteryPlugLabel,
  batterySeries,
  batteryStatusLabel,
  buildBatteryStats,
  estimateCapacityMah,
  estimateTimeToFullMs,
  formatEstimateDuration,
  formatGraphValue,
  powerWatts,
} from '@/features/battery/services/battery-stats';
import type { BatteryGraphSample } from '@/features/battery/types';

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

describe('powerWatts', () => {
  it('converts µA × mV to watts', () => {
    expect(powerWatts(500_000, 4000)).toBe(2);
  });

  it('keeps the sign of the current', () => {
    expect(powerWatts(-500_000, 4000)).toBe(-2);
  });

  it('returns null when a side is missing', () => {
    expect(powerWatts(null, 4000)).toBeNull();
    expect(powerWatts(500_000, null)).toBeNull();
  });
});

describe('estimateCapacityMah', () => {
  it('scales the charge counter by the reported level', () => {
    expect(estimateCapacityMah(1_949_220, 39)).toBe(4998);
  });

  it('returns null when a side is missing or nonsensical', () => {
    expect(estimateCapacityMah(null, 39)).toBeNull();
    expect(estimateCapacityMah(1_949_220, null)).toBeNull();
    expect(estimateCapacityMah(0, 39)).toBeNull();
    expect(estimateCapacityMah(1_949_220, 0)).toBeNull();
    expect(estimateCapacityMah(1_949_220, 101)).toBeNull();
  });
});

describe('estimateTimeToFullMs', () => {
  it('divides the missing charge by the charging current', () => {
    const result = estimateTimeToFullMs(reading());
    expect(result).not.toBeNull();
    expect((result as number) / 3_600_000).toBeCloseTo(4.5094, 3);
  });

  it('stays unavailable while not charging or without data', () => {
    expect(estimateTimeToFullMs(reading({ status: 'discharging' }))).toBeNull();
    expect(estimateTimeToFullMs(reading({ currentNowUa: null }))).toBeNull();
    expect(estimateTimeToFullMs(reading({ currentNowUa: -100_000 }))).toBeNull();
    expect(estimateTimeToFullMs(reading({ chargeCounterUah: null }))).toBeNull();
  });
});

describe('formatEstimateDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatEstimateDuration(2_520_000)).toBe('≈ 42 min');
    expect(formatEstimateDuration(7_200_000)).toBe('≈ 2 h');
    expect(formatEstimateDuration(16_260_000)).toBe('≈ 4 h 31 min');
  });

  it('handles under a minute and invalid input', () => {
    expect(formatEstimateDuration(20_000)).toBe('≈ <1 min');
    expect(formatEstimateDuration(0)).toBeNull();
    expect(formatEstimateDuration(null)).toBeNull();
    expect(formatEstimateDuration(Number.NaN)).toBeNull();
  });
});

describe('batterySeries', () => {
  const samples: BatteryGraphSample[] = [
    { currentMa: 10, watts: 0.04, temperatureC: 38 },
    { currentMa: null, watts: null, temperatureC: 39 },
  ];

  it('picks the chosen metric and skips missing samples', () => {
    expect(batterySeries(samples, 'current')).toEqual([10]);
    expect(batterySeries(samples, 'power')).toEqual([0.04]);
    expect(batterySeries(samples, 'temperature')).toEqual([38, 39]);
  });

  it('formats the latest value per metric', () => {
    expect(formatGraphValue('current', 676.4)).toBe('676 mA');
    expect(formatGraphValue('power', 2.62)).toBe('2.6 W');
    expect(formatGraphValue('temperature', 38.44)).toBe('38.4 °C');
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
      { key: 'power', label: 'Power', value: '2.6 W' },
      { key: 'capacity', label: 'Capacity (Estimated)', value: '≈ 5000 mAh' },
      { key: 'cycle-count', label: 'Cycle count', value: '787' },
      { key: 'time-to-full', label: 'Time to full (Estimated)', value: '≈ 4 h 31 min' },
    ]);
  });

  it('shows a negative power while discharging and no time to full', () => {
    const stats = buildBatteryStats(
      reading({ status: 'discharging', plugged: 'none', currentNowUa: -220_400 }),
    );
    expect(stats).toContainEqual({ key: 'plug', label: 'Plug type', value: 'Unplugged' });
    expect(stats).toContainEqual({ key: 'current', label: 'Current', value: '-220 mA' });
    expect(stats).toContainEqual({ key: 'power', label: 'Power', value: '-0.9 W' });
    expect(stats.some((stat) => stat.key === 'time-to-full')).toBe(false);
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
        chargeCounterUah: null,
        percent: null,
        cycleCount: null,
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
