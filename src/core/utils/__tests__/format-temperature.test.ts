import { celsiusToFahrenheit, formatTemperature } from '@/core/utils/format-temperature';

describe('celsiusToFahrenheit', () => {
  it('converts known points', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
});

describe('formatTemperature', () => {
  it('formats Celsius rounded to whole degrees by default', () => {
    expect(formatTemperature(38.4)).toBe('38 °C');
    expect(formatTemperature(38.6)).toBe('39 °C');
  });

  it('formats Fahrenheit', () => {
    expect(formatTemperature(20, 'F')).toBe('68 °F');
  });

  it('honours digits', () => {
    expect(formatTemperature(36.24, 'C', 1)).toBe('36.2 °C');
    expect(formatTemperature(36.26, 'C', 1)).toBe('36.3 °C');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatTemperature(Number.NaN)).toBe('—');
  });
});
