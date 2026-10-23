import { buildFormatters } from '@/core/units/formatters';
import { parseUnitPreferences } from '@/core/units/catalog';
import {
  formatAcceleration,
  formatByteSize,
  formatClockTime,
  formatDistance,
  formatFrequencyKhz,
  formatNetworkSpeed,
  formatPower,
  formatPressure,
  formatScreenSize,
  formatTemperature,
} from '@/core/units/format';
import { regionFromLocale, resolvedUnitLabel, resolveUnits } from '@/core/units/resolve';
import { DEFAULT_UNIT_PREFERENCES, type UnitPreferences } from '@/core/units/types';

describe('regionFromLocale', () => {
  it('reads the region subtag', () => {
    expect(regionFromLocale('en-US')).toBe('US');
    expect(regionFromLocale('en_GB')).toBe('GB');
    expect(regionFromLocale('zh-Hans-CN')).toBe('CN');
    expect(regionFromLocale('pt-BR')).toBe('BR');
  });

  it('returns null when there is no region', () => {
    expect(regionFromLocale('en')).toBeNull();
    expect(regionFromLocale('')).toBeNull();
  });
});

describe('resolveUnits', () => {
  it('resolves Fahrenheit, feet, inHg and 12-hour time for the US', () => {
    const units = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-US');
    expect(units.temperature).toBe('F');
    expect(units.distance).toBe('ft');
    expect(units.pressure).toBe('inHg');
    expect(units.timeFormat).toBe('12h');
  });

  it('resolves metric units for a metric region', () => {
    const units = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-GB');
    expect(units.temperature).toBe('C');
    expect(units.distance).toBe('m');
    expect(units.pressure).toBe('hPa');
    expect(units.timeFormat).toBe('24h');
    expect(units.storage).toBe('decimal');
    expect(units.screenSize).toBe('in');
  });

  it('honours explicit choices over the region', () => {
    const preferences: UnitPreferences = {
      ...DEFAULT_UNIT_PREFERENCES,
      temperature: 'celsius',
      storage: 'binary',
      frequency: 'mhz',
      networkSpeed: 'megabytes',
      screenSize: 'centimetres',
      distance: 'metres',
      acceleration: 'gforce',
      pressure: 'mmhg',
      timeFormat: '24h',
      power: 'milliwatts',
    };
    const units = resolveUnits(preferences, 'en-US');
    expect(units).toEqual({
      temperature: 'C',
      storage: 'binary',
      frequency: 'MHz',
      networkSpeed: 'MB/s',
      screenSize: 'cm',
      distance: 'm',
      acceleration: 'g',
      pressure: 'mmHg',
      timeFormat: '24h',
      power: 'mW',
    });
  });
});

describe('parseUnitPreferences', () => {
  it('keeps known choices and drops junk', () => {
    const parsed = parseUnitPreferences({
      temperature: 'fahrenheit',
      storage: 'nonsense',
      frequency: 'mhz',
      extra: 'ignored',
    });
    expect(parsed.temperature).toBe('fahrenheit');
    expect(parsed.frequency).toBe('mhz');
    expect(parsed.storage).toBe('system');
  });

  it('returns defaults for a non-object', () => {
    expect(parseUnitPreferences(null)).toEqual(DEFAULT_UNIT_PREFERENCES);
    expect(parseUnitPreferences('hello')).toEqual(DEFAULT_UNIT_PREFERENCES);
  });
});

describe('resolvedUnitLabel', () => {
  it('labels the resolved choices', () => {
    const units = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-US');
    expect(resolvedUnitLabel('temperature', units)).toBe('Fahrenheit');
    expect(resolvedUnitLabel('timeFormat', units)).toBe('12-hour');

    const metric = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'de-DE');
    expect(resolvedUnitLabel('temperature', metric)).toBe('Celsius');
    expect(resolvedUnitLabel('storage', metric)).toBe('GB (decimal)');
    expect(resolvedUnitLabel('frequency', metric)).toBe('Auto (GHz/MHz)');
  });
});

describe('formatTemperature', () => {
  it('converts Celsius to Fahrenheit', () => {
    expect(formatTemperature(0, 'F')).toBe('32 °F');
    expect(formatTemperature(20, 'C')).toBe('20 °C');
    expect(formatTemperature(36.24, 'F', 1)).toBe('97.2 °F');
  });
});

describe('byte formatting', () => {
  it('scales decimal and binary', () => {
    expect(formatByteSize(1_000_000_000, 'decimal')).toBe('1.0 GB');
    expect(formatByteSize(1024 ** 3, 'binary')).toBe('1.0 GiB');
  });
});

describe('formatFrequencyKhz', () => {
  it('auto-scales', () => {
    expect(formatFrequencyKhz(2_200_000, 'auto')).toBe('2.20 GHz');
    expect(formatFrequencyKhz(300_000, 'auto')).toBe('300 MHz');
    expect(formatFrequencyKhz(500, 'auto')).toBe('500 kHz');
  });

  it('forces GHz or MHz', () => {
    expect(formatFrequencyKhz(2_200_000, 'GHz')).toBe('2.20 GHz');
    expect(formatFrequencyKhz(2_200_000, 'MHz')).toBe('2200 MHz');
    expect(formatFrequencyKhz(300_000, 'GHz')).toBe('0.30 GHz');
  });

  it('returns a dash for non-positive input', () => {
    expect(formatFrequencyKhz(0, 'auto')).toBe('—');
    expect(formatFrequencyKhz(Number.NaN, 'auto')).toBe('—');
  });
});

describe('other conversions', () => {
  it('network speed', () => {
    expect(formatNetworkSpeed(866, 'Mbps')).toBe('866 Mbps');
    expect(formatNetworkSpeed(866, 'MB/s')).toBe('108.3 MB/s');
  });

  it('screen size', () => {
    expect(formatScreenSize(6.7, 'in')).toBe('6.7 in');
    expect(formatScreenSize(6.7, 'cm')).toBe('17.0 cm');
  });

  it('distance', () => {
    expect(formatDistance(3.5, 'm')).toBe('3.5 m');
    expect(formatDistance(3.5, 'ft')).toBe('11 ft');
    expect(formatDistance(42.4, 'm')).toBe('42 m');
  });

  it('acceleration', () => {
    expect(formatAcceleration(9.80665, 'm/s²')).toBe('9.81 m/s²');
    expect(formatAcceleration(9.80665, 'g')).toBe('1.00 g');
  });

  it('pressure', () => {
    expect(formatPressure(1013.25, 'hPa')).toBe('1013 hPa');
    expect(formatPressure(1013.25, 'kPa')).toBe('101.3 kPa');
    expect(formatPressure(1013.25, 'mmHg')).toBe('760 mmHg');
    expect(formatPressure(1013.25, 'inHg')).toBe('29.92 inHg');
  });

  it('power', () => {
    expect(formatPower(4.92, 'W')).toBe('4.92 W');
    expect(formatPower(4.92, 'mW')).toBe('4920.00 mW');
  });

  it('clock time', () => {
    expect(formatClockTime(7, 5, '24h')).toBe('07:05');
    expect(formatClockTime(7, 5, '12h')).toBe('7:05 AM');
    expect(formatClockTime(0, 30, '12h')).toBe('12:30 AM');
    expect(formatClockTime(12, 0, '12h')).toBe('12:00 PM');
    expect(formatClockTime(13, 45, '12h')).toBe('1:45 PM');
  });
});

describe('buildFormatters', () => {
  it('binds every formatter to the resolved units', () => {
    const formatters = buildFormatters(resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-US'));
    expect(formatters.temperature(20)).toBe('68 °F');
    expect(formatters.bytes(1_000_000_000)).toBe('1.0 GB');
    expect(formatters.distance(3.5)).toBe('11 ft');
    expect(formatters.pressure(1013.25)).toBe('29.92 inHg');
    expect(formatters.units.timeFormat).toBe('12h');
  });
});
