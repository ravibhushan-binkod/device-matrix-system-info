import {
  WIDGET_SPECS,
  WIDGET_TEXT,
  batteryStatusLabel,
  formatWidgetBytes,
  formatWidgetBytesPair,
  formatWidgetHealth,
  formatWidgetPercent,
  formatWidgetTemperature,
  formatWidgetUpdated,
} from '@/features/widgets/widget-spec';

describe('widget spec', () => {
  it('lists the ten widgets in launcher order and sizes', () => {
    expect(WIDGET_SPECS.map((spec) => spec.id)).toEqual([
      'ram-compact',
      'storage-compact',
      'battery-compact',
      'ram-standard',
      'storage-standard',
      'battery-standard',
      'ram-detailed',
      'storage-detailed',
      'battery-detailed',
      'health-hero',
    ]);
    expect(WIDGET_SPECS.map((spec) => [spec.widthCells, spec.heightCells])).toEqual([
      [2, 1],
      [2, 1],
      [2, 1],
      [2, 2],
      [2, 2],
      [2, 2],
      [4, 1],
      [4, 1],
      [4, 1],
      [4, 2],
    ]);
    expect(
      WIDGET_SPECS.every((spec) => spec.aspectRatio === spec.widthCells / spec.heightCells),
    ).toBe(true);
  });

  it('formats bytes exactly like the native widget', () => {
    expect(formatWidgetBytes(999, false)).toBe('999 B');
    expect(formatWidgetBytes(1500, false)).toBe('2 KB');
    expect(formatWidgetBytes(1_500_000_000, false, 1)).toBe('1.5 GB');
    expect(formatWidgetBytes(1024, true)).toBe('1 KiB');
    expect(formatWidgetBytes(-8, false)).toBe('0 B');
  });

  it('formats used / total pairs with the total choosing the unit', () => {
    expect(formatWidgetBytesPair(1_700_000_000, 3_100_000_000, false)).toBe('1.7 / 3.1 GB');
    expect(formatWidgetBytesPair(500_000, 4_000_000, false)).toBe('0.5 / 4.0 MB');
    expect(formatWidgetBytesPair(1_700_000_000, 3_100_000_000, true)).toBe('1.6 / 2.9 GiB');
    expect(formatWidgetBytesPair(0, 0, false)).toBe('0.0 / 0.0 MB');
  });

  it('changes byte pairs with the Settings storage unit', () => {
    const decimal = formatWidgetBytesPair(1_000_000_000, 2_000_000_000, false);
    const binary = formatWidgetBytesPair(1_000_000_000, 2_000_000_000, true);
    expect(decimal).toBe('1.0 / 2.0 GB');
    expect(binary).toBe('0.9 / 1.9 GiB');
    expect(decimal).not.toBe(binary);
  });

  it('formats percentages and explicit battery temperature labels', () => {
    expect(formatWidgetPercent(42.6)).toBe('43%');
    expect(formatWidgetPercent(null)).toBe(WIDGET_TEXT.notAvailable);
    expect(formatWidgetTemperature(31.2, 'C')).toBe('31.2 °C');
    expect(formatWidgetTemperature(31.2, 'F')).toBe('88.2 °F');
    expect(formatWidgetTemperature(null, 'C')).toBe(WIDGET_TEXT.notAvailable);
    expect(WIDGET_TEXT.batteryTemperature).toBe('Battery temperature');
  });

  it('formats the updated clock with the Settings time format', () => {
    const at7 = new Date(2026, 9, 22, 7, 5, 0).getTime();
    expect(formatWidgetUpdated(at7, '12h')).toBe('Updated 7:05 AM');
    expect(formatWidgetUpdated(at7, '24h')).toBe('Updated 07:05');
    expect(formatWidgetUpdated(null, '24h')).toBe(`Updated: ${WIDGET_TEXT.notAvailable}`);
  });

  it('formats health and battery status labels', () => {
    expect(formatWidgetHealth(80, 5)).toBe('80 · 5/5 checks read');
    expect(formatWidgetHealth(null, 0)).toBe(WIDGET_TEXT.notAvailable);
    expect(batteryStatusLabel('charging')).toBe('Charging');
    expect(batteryStatusLabel('discharging')).toBe('On battery');
    expect(batteryStatusLabel('full')).toBe('Full');
    expect(batteryStatusLabel('not-charging')).toBe('Not charging');
    expect(batteryStatusLabel('unknown')).toBe('Status unknown');
  });
});
