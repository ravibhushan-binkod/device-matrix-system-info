import type { ResolvedUnits, UnitPreferences } from './types';

/**
 * Regions whose ordinary display units are not the metric default. Only these
 * flip a `system` choice; everything else resolves to the metric/SI value.
 * Fahrenheit is used by the US and a small set of US-associated regions.
 */
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'PR', 'GU', 'VI']);

/** Imperial short distances (feet) are the everyday unit in these regions. */
const FEET_REGIONS = new Set(['US', 'LR', 'MM']);

/** Inches of mercury is the weather unit in these regions. */
const INHG_REGIONS = new Set(['US']);

const TWELVE_HOUR_REGIONS = new Set(['US', 'CA', 'AU', 'NZ', 'PH', 'IN', 'PK', 'BD', 'EG', 'SA']);

/** The device locale, e.g. "en-US". Never throws. */
export function deviceLocale(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale && locale.length > 0 ? locale : 'en-US';
  } catch {
    return 'en-US';
  }
}

/** The region subtag of a BCP-47 locale, e.g. "en-GB" → "GB"; `null` when absent. */
export function regionFromLocale(locale: string): string | null {
  const parts = locale.replace(/_/g, '-').split('-');
  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index];
    if (part != null && /^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
  }
  return null;
}

/**
 * Resolves the `system` choices from the device locale. Used once per app
 * start and whenever the stored preferences change; the result is cached in
 * the units store so the pure formatters can stay synchronous.
 */
export function resolveUnits(
  preferences: UnitPreferences,
  locale: string = deviceLocale(),
): ResolvedUnits {
  const region = regionFromLocale(locale);
  const fahrenheit = region != null && FAHRENHEIT_REGIONS.has(region);
  const feet = region != null && FEET_REGIONS.has(region);
  const inHg = region != null && INHG_REGIONS.has(region);
  const twelveHour = region != null && TWELVE_HOUR_REGIONS.has(region);

  return {
    temperature:
      preferences.temperature === 'system'
        ? fahrenheit
          ? 'F'
          : 'C'
        : preferences.temperature === 'fahrenheit'
          ? 'F'
          : 'C',
    storage:
      preferences.storage === 'system'
        ? 'decimal'
        : preferences.storage === 'binary'
          ? 'binary'
          : 'decimal',
    frequency:
      preferences.frequency === 'system'
        ? 'auto'
        : preferences.frequency === 'ghz'
          ? 'GHz'
          : preferences.frequency === 'mhz'
            ? 'MHz'
            : 'auto',
    networkSpeed:
      preferences.networkSpeed === 'system'
        ? 'Mbps'
        : preferences.networkSpeed === 'megabytes'
          ? 'MB/s'
          : 'Mbps',
    screenSize:
      preferences.screenSize === 'system'
        ? 'in'
        : preferences.screenSize === 'centimetres'
          ? 'cm'
          : 'in',
    distance:
      preferences.distance === 'system'
        ? feet
          ? 'ft'
          : 'm'
        : preferences.distance === 'feet'
          ? 'ft'
          : 'm',
    acceleration:
      preferences.acceleration === 'system'
        ? 'm/s²'
        : preferences.acceleration === 'gforce'
          ? 'g'
          : 'm/s²',
    pressure:
      preferences.pressure === 'system'
        ? inHg
          ? 'inHg'
          : 'hPa'
        : preferences.pressure === 'kilopascals'
          ? 'kPa'
          : preferences.pressure === 'mmhg'
            ? 'mmHg'
            : preferences.pressure === 'inhg'
              ? 'inHg'
              : 'hPa',
    timeFormat:
      preferences.timeFormat === 'system'
        ? twelveHour
          ? '12h'
          : '24h'
        : preferences.timeFormat === '12h'
          ? '12h'
          : '24h',
    power: preferences.power === 'system' ? 'W' : preferences.power === 'milliwatts' ? 'mW' : 'W',
  };
}

/** Short human label for the resolved value, e.g. "Celsius", "GB (decimal)". */
export function resolvedUnitLabel(category: keyof ResolvedUnits, units: ResolvedUnits): string {
  switch (category) {
    case 'temperature':
      return units.temperature === 'C' ? 'Celsius' : 'Fahrenheit';
    case 'storage':
      return units.storage === 'binary' ? 'GiB (binary)' : 'GB (decimal)';
    case 'frequency':
      return units.frequency === 'auto' ? 'Auto (GHz/MHz)' : units.frequency;
    case 'networkSpeed':
      return units.networkSpeed;
    case 'screenSize':
      return units.screenSize === 'in' ? 'Inches' : 'Centimetres';
    case 'distance':
      return units.distance === 'm' ? 'Metres' : 'Feet';
    case 'acceleration':
      return units.acceleration === 'g' ? 'Standard gravity (g)' : 'm/s²';
    case 'pressure':
      return units.pressure;
    case 'timeFormat':
      return units.timeFormat === '12h' ? '12-hour' : '24-hour';
    case 'power':
      return units.power === 'W' ? 'Watts' : 'Milliwatts';
  }
}
