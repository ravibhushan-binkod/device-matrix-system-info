import type { ResolvedUnits } from './types';

/**
 * Pure unit conversions and formatters. Nothing here reads global state: the
 * caller passes the resolved unit (from `useFormatters()` or `getActiveUnits()`)
 * so every conversion is deterministic and unit-testable.
 */

const NO_VALUE = '—';

function isNumber(value: number): boolean {
  return Number.isFinite(value);
}

export type ByteStyle = ResolvedUnits['storage'];

const BYTE_BASE: Record<ByteStyle, number> = { binary: 1024, decimal: 1000 };

const BYTE_UNITS: Record<ByteStyle, readonly string[]> = {
  binary: ['B', 'KiB', 'MiB', 'GiB', 'TiB'],
  decimal: ['B', 'KB', 'MB', 'GB', 'TB'],
};

/** Bytes → GiB (binary) or GB (decimal), the fixed-precision conversion. */
export function bytesToGigabytes(bytes: number, style: ByteStyle = 'decimal'): number {
  return bytes / (style === 'binary' ? 1024 ** 3 : 1000 ** 3);
}

/** Auto-scaled byte count, e.g. `12_400_000` → "12.4 MB" / "11.8 MiB". */
export function formatByteSize(bytes: number, style: ByteStyle = 'decimal', digits = 1): string {
  if (!isNumber(bytes)) return NO_VALUE;
  const base = BYTE_BASE[style];
  const units = BYTE_UNITS[style];
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }
  const text = unitIndex === 0 ? `${Math.round(value)}` : value.toFixed(digits);
  return `${sign}${text} ${units[unitIndex]}`;
}

/** Fixed-precision `formatByteSize` helper kept for existing call sites. */
export function formatBytes(bytes: number, style: ByteStyle = 'decimal', digits = 1): string {
  return formatByteSize(bytes, style, digits);
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** The numeric value in the chosen temperature unit. */
export function temperatureValue(celsius: number, unit: ResolvedUnits['temperature']): number {
  return unit === 'F' ? celsiusToFahrenheit(celsius) : celsius;
}

/** "38 °C" / "101 °F"; `—` for a missing reading. */
export function formatTemperature(
  celsius: number,
  unit: ResolvedUnits['temperature'] = 'C',
  digits = 0,
): string {
  if (!isNumber(celsius)) return NO_VALUE;
  return `${temperatureValue(celsius, unit).toFixed(digits)} °${unit}`;
}

/**
 * Human frequency for a kHz reading. `auto` scales like a normal read-out
 * (2.20 GHz / 300 MHz / 500 kHz); `GHz`/`MHz` force one unit so a chart axis
 * and its labels always agree.
 */
export function formatFrequencyKhz(
  khz: number,
  unit: ResolvedUnits['frequency'] = 'auto',
  digits = 2,
): string {
  if (!isNumber(khz) || khz <= 0) return NO_VALUE;
  if (unit === 'GHz') return `${(khz / 1_000_000).toFixed(digits)} GHz`;
  if (unit === 'MHz') return `${Math.round(khz / 1_000)} MHz`;
  if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(digits)} GHz`;
  if (khz >= 1_000) return `${Math.round(khz / 1_000)} MHz`;
  return `${Math.round(khz)} kHz`;
}

/** The numeric value in a forced frequency unit (used by bar charts). */
export function frequencyValueKhz(
  khz: number,
  unit: Exclude<ResolvedUnits['frequency'], 'auto'>,
): number {
  return unit === 'GHz' ? khz / 1_000_000 : khz / 1_000;
}

/** "866 Mbps" / "108.3 MB/s". */
export function formatNetworkSpeed(
  mbps: number,
  unit: ResolvedUnits['networkSpeed'],
  digits = 1,
): string {
  if (!isNumber(mbps)) return NO_VALUE;
  const value = unit === 'MB/s' ? mbps / 8 : mbps;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits);
  return `${text} ${unit}`;
}

/** Panel size: "6.7 in" / "17.0 cm". */
export function formatScreenSize(
  inches: number,
  unit: ResolvedUnits['screenSize'],
  digits = 1,
): string {
  if (!isNumber(inches)) return NO_VALUE;
  const value = unit === 'cm' ? inches * 2.54 : inches;
  return `${value.toFixed(digits)} ${unit}`;
}

/** Short distance: "12 m" / "39 ft". */
export function formatDistance(
  meters: number,
  unit: ResolvedUnits['distance'],
  digits = 1,
): string {
  if (!isNumber(meters)) return NO_VALUE;
  const value = unit === 'ft' ? meters * 3.28084 : meters;
  const text = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(digits);
  return `${text} ${unit}`;
}

/** Acceleration: "9.81 m/s²" / "1.00 g". */
export function formatAcceleration(
  metersPerSecondSquared: number,
  unit: ResolvedUnits['acceleration'],
  digits = 2,
): string {
  if (!isNumber(metersPerSecondSquared)) return NO_VALUE;
  const value = unit === 'g' ? metersPerSecondSquared / 9.80665 : metersPerSecondSquared;
  return `${value.toFixed(digits)} ${unit}`;
}

const PRESSURE_FROM_HPA: Record<ResolvedUnits['pressure'], number> = {
  hPa: 1,
  kPa: 0.1,
  mmHg: 0.750061683,
  inHg: 0.029529983,
};

const PRESSURE_DIGITS: Record<ResolvedUnits['pressure'], number> = {
  hPa: 0,
  kPa: 1,
  mmHg: 0,
  inHg: 2,
};

/** Atmospheric pressure: "1013 hPa" / "29.92 inHg". */
export function formatPressure(
  hectopascals: number,
  unit: ResolvedUnits['pressure'],
  digits: number = PRESSURE_DIGITS[unit],
): string {
  if (!isNumber(hectopascals)) return NO_VALUE;
  return `${(hectopascals * PRESSURE_FROM_HPA[unit]).toFixed(digits)} ${unit}`;
}

/** Battery/CPU power: "4.92 W" / "4920 mW". */
export function formatPower(watts: number, unit: ResolvedUnits['power'], digits = 2): string {
  if (!isNumber(watts)) return NO_VALUE;
  const value = unit === 'mW' ? watts * 1000 : watts;
  return `${value.toFixed(digits)} ${unit}`;
}

/** "07:05" (24-hour) or "7:05 AM" (12-hour). */
export function formatClockTime(
  hours: number,
  minutes: number,
  format: ResolvedUnits['timeFormat'],
): string {
  const hour = ((Math.floor(hours) % 24) + 24) % 24;
  const minute = ((Math.floor(minutes) % 60) + 60) % 60;
  const paddedMinute = String(minute).padStart(2, '0');
  if (format === '24h') return `${String(hour).padStart(2, '0')}:${paddedMinute}`;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${paddedMinute} ${suffix}`;
}

/** Local date + time for reports, honouring the chosen hour cycle. */
export function formatDateTime(
  epochMs: number,
  format: ResolvedUnits['timeFormat'],
  locale?: string,
): string {
  if (!isNumber(epochMs)) return NO_VALUE;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
    }).format(new Date(epochMs));
  } catch {
    const date = new Date(epochMs);
    return `${date.toDateString()} ${formatClockTime(date.getHours(), date.getMinutes(), format)}`;
  }
}
