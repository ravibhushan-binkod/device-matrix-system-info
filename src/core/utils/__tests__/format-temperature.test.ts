import { getActiveUnits, setActiveUnits } from '@/core/units/active';
import { resolveUnits } from '@/core/units/resolve';
import { DEFAULT_UNIT_PREFERENCES, type ResolvedUnits } from '@/core/units/types';
import { celsiusToFahrenheit, formatTemperature } from '@/core/utils/format-temperature';

const usUnits = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-US');
const metricUnits = resolveUnits(DEFAULT_UNIT_PREFERENCES, 'en-GB');

describe('celsiusToFahrenheit', () => {
  it('converts known points', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
});

describe('formatTemperature', () => {
  const previous: ResolvedUnits = getActiveUnits();

  afterEach(() => {
    setActiveUnits(previous);
  });

  it('formats Celsius rounded to whole degrees by default', () => {
    expect(formatTemperature(38.4, 'C')).toBe('38 °C');
    expect(formatTemperature(38.6, 'C')).toBe('39 °C');
  });

  it('formats Fahrenheit', () => {
    expect(formatTemperature(20, 'F')).toBe('68 °F');
  });

  it('honours digits', () => {
    expect(formatTemperature(36.24, 'C', 1)).toBe('36.2 °C');
    expect(formatTemperature(36.26, 'C', 1)).toBe('36.3 °C');
  });

  it('follows the active unit when none is passed', () => {
    setActiveUnits(usUnits);
    expect(formatTemperature(20)).toBe('68 °F');
    setActiveUnits(metricUnits);
    expect(formatTemperature(20)).toBe('20 °C');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatTemperature(Number.NaN, 'C')).toBe('—');
  });
});
