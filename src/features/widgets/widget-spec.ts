import { formatClockTime } from '@/core/units/format';
import type { BatteryStatus } from '@/core/native';
import type { ResolvedUnits } from '@/core/units';

/** One entry in the launcher's widget picker, mirrored from the native enum. */
export type WidgetMetric = 'ram' | 'storage' | 'battery' | 'health';
export type WidgetTier = 'compact' | 'standard' | 'detailed' | 'hero';

export type WidgetSpec = {
  id: string;
  metric: WidgetMetric;
  tier: WidgetTier;
  /** The launcher picker label, identical to the native strings. */
  title: string;
  /** Short metric name used inside the preview. */
  metricLabel: string;
  description: string;
  widthCells: number;
  heightCells: number;
  /** Width ÷ height, used to keep the preview at the true widget shape. */
  aspectRatio: number;
};

/**
 * Single source for the ten widget labels, order, sizes and formatting rules.
 * The native layouts use the same strings; parity tests cover the formatters.
 */
export const WIDGET_SPECS: readonly WidgetSpec[] = [
  {
    id: 'ram-compact',
    metric: 'ram',
    tier: 'compact',
    title: 'RAM Compact',
    metricLabel: 'RAM',
    description: 'Used and total RAM with usage percentage.',
    widthCells: 2,
    heightCells: 1,
    aspectRatio: 2,
  },
  {
    id: 'storage-compact',
    metric: 'storage',
    tier: 'compact',
    title: 'Storage Compact',
    metricLabel: 'Storage',
    description: 'Used and total internal storage with usage percentage.',
    widthCells: 2,
    heightCells: 1,
    aspectRatio: 2,
  },
  {
    id: 'battery-compact',
    metric: 'battery',
    tier: 'compact',
    title: 'Battery Compact',
    metricLabel: 'Battery',
    description: 'Battery percentage and charging status.',
    widthCells: 2,
    heightCells: 1,
    aspectRatio: 2,
  },
  {
    id: 'ram-standard',
    metric: 'ram',
    tier: 'standard',
    title: 'RAM Standard',
    metricLabel: 'RAM',
    description: 'RAM usage ring with used and total memory.',
    widthCells: 2,
    heightCells: 2,
    aspectRatio: 1,
  },
  {
    id: 'storage-standard',
    metric: 'storage',
    tier: 'standard',
    title: 'Storage Standard',
    metricLabel: 'Storage',
    description: 'Storage usage ring with used and total capacity.',
    widthCells: 2,
    heightCells: 2,
    aspectRatio: 1,
  },
  {
    id: 'battery-standard',
    metric: 'battery',
    tier: 'standard',
    title: 'Battery Standard',
    metricLabel: 'Battery',
    description: 'Battery charge ring and charging status.',
    widthCells: 2,
    heightCells: 2,
    aspectRatio: 1,
  },
  {
    id: 'ram-detailed',
    metric: 'ram',
    tier: 'detailed',
    title: 'RAM Detailed',
    metricLabel: 'RAM',
    description: 'Used, total and available RAM with a progress bar.',
    widthCells: 4,
    heightCells: 1,
    aspectRatio: 4,
  },
  {
    id: 'storage-detailed',
    metric: 'storage',
    tier: 'detailed',
    title: 'Storage Detailed',
    metricLabel: 'Storage',
    description: 'Used, total and available storage with a progress bar.',
    widthCells: 4,
    heightCells: 1,
    aspectRatio: 4,
  },
  {
    id: 'battery-detailed',
    metric: 'battery',
    tier: 'detailed',
    title: 'Battery Detailed',
    metricLabel: 'Battery',
    description: 'Battery percentage, charging status and charge bar.',
    widthCells: 4,
    heightCells: 1,
    aspectRatio: 4,
  },
  {
    id: 'health-hero',
    metric: 'health',
    tier: 'hero',
    title: 'Device Health Check',
    metricLabel: 'Device health',
    description:
      'Health score, local time, device name and compact RAM, storage and battery summaries.',
    widthCells: 4,
    heightCells: 2,
    aspectRatio: 2,
  },
];

export const WIDGET_TEXT = {
  ram: 'RAM',
  storage: 'Storage',
  battery: 'Battery',
  health: 'Device Health Check',
  healthShort: 'Health score',
  updated: 'Updated',
  calculatedLocally: 'Calculated locally',
  batteryTemperature: 'Battery temperature',
  notAvailable: 'Not available on this device',
  used: 'used',
  free: 'free',
  checksRead: 'checks read',
} as const;

const DECIMAL_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'] as const;

/**
 * Mirrors `formatWidgetBytes` in WidgetModel.kt. Decimal is the widget default;
 * the Settings storage choice is passed through by the preview.
 */
export function formatWidgetBytes(bytes: number, binary: boolean, decimals = 0): string {
  const units = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const base = binary ? 1024 : 1000;
  let value = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  let unit = 0;
  while (value >= base && unit < units.length - 1) {
    value /= base;
    unit += 1;
  }
  if (unit === 0) return `${Math.round(value)} ${units[unit]}`;
  return `${value.toFixed(decimals)} ${units[unit]}`;
}

/**
 * Mirrors `formatWidgetBytesPair` in WidgetModel.kt: the unit is chosen from
 * the total, and pairs never show less than MB.
 */
export function formatWidgetBytesPair(
  usedBytes: number,
  totalBytes: number,
  binary: boolean,
): string {
  const units = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const base = binary ? 1024 : 1000;
  let unit = 0;
  let total = Math.max(0, Number.isFinite(totalBytes) ? totalBytes : 0);
  while (total >= base && unit < units.length - 1) {
    total /= base;
    unit += 1;
  }
  if (unit < 2) unit = 2;
  const factor = base ** unit;
  const used = Math.max(0, Number.isFinite(usedBytes) ? usedBytes : 0) / factor;
  const whole = Math.max(0, Number.isFinite(totalBytes) ? totalBytes : 0) / factor;
  return `${used.toFixed(1)} / ${whole.toFixed(1)} ${units[unit]}`;
}

/** Native widgets store integer percentages. */
export function formatWidgetPercent(percent: number | null): string {
  if (percent == null || !Number.isFinite(percent)) return WIDGET_TEXT.notAvailable;
  return `${Math.round(percent)}%`;
}

export function formatWidgetUpdated(
  epochMs: number | null,
  timeFormat: ResolvedUnits['timeFormat'],
): string {
  if (epochMs == null || !Number.isFinite(epochMs)) {
    return `${WIDGET_TEXT.updated}: ${WIDGET_TEXT.notAvailable}`;
  }
  const date = new Date(epochMs);
  return `${WIDGET_TEXT.updated} ${formatClockTime(date.getHours(), date.getMinutes(), timeFormat)}`;
}

export function formatWidgetTemperature(
  celsius: number | null,
  unit: ResolvedUnits['temperature'],
): string {
  if (celsius == null || !Number.isFinite(celsius)) return WIDGET_TEXT.notAvailable;
  const value = unit === 'F' ? celsius * 1.8 + 32 : celsius;
  return `${value.toFixed(1)} °${unit}`;
}

export function batteryStatusLabel(status: BatteryStatus): string {
  switch (status) {
    case 'charging':
      return 'Charging';
    case 'discharging':
      return 'On battery';
    case 'full':
      return 'Full';
    case 'not-charging':
      return 'Not charging';
    default:
      return 'Status unknown';
  }
}

export function formatWidgetHealth(score: number | null, checksAvailable: number): string {
  if (score == null || !Number.isFinite(score)) return WIDGET_TEXT.notAvailable;
  return `${Math.round(score)} · ${checksAvailable}/5 ${WIDGET_TEXT.checksRead}`;
}
