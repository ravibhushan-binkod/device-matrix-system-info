import type { BatteryHealth, BatteryPlug, BatteryReading, BatteryStatus } from '@/core/native';
import { formatTemperature } from '@/core/utils/format-temperature';
import type { BatteryStat } from '@/features/battery/types';

const HEALTH_LABELS: Record<BatteryHealth, string | null> = {
  good: 'Good',
  overheat: 'Overheat',
  dead: 'Dead',
  'over-voltage': 'Over voltage',
  failure: 'Failure',
  cold: 'Cold',
  unknown: null,
};

const PLUG_LABELS: Record<BatteryPlug, string | null> = {
  ac: 'AC charger',
  usb: 'USB',
  wireless: 'Wireless',
  dock: 'Dock',
  none: 'Unplugged',
  unknown: null,
};

const STATUS_LABELS: Record<BatteryStatus, string> = {
  charging: 'Charging',
  discharging: 'On battery',
  full: 'Full',
  'not-charging': 'Not charging',
  unknown: 'Status unknown',
};

/** Short human label for the charging state, e.g. "Charging". */
export function batteryStatusLabel(status: BatteryStatus): string {
  return STATUS_LABELS[status];
}

/** Plug type label ("USB", "Wireless", …); `null` when unknown or unplugged. */
export function batteryPlugLabel(plugged: BatteryPlug): string | null {
  return plugged === 'none' || plugged === 'unknown' ? null : PLUG_LABELS[plugged];
}

/**
 * Charger power in watts from the battery-side current and voltage
 * (µA × mV = 10⁻⁹ W). `null` when either reading is missing.
 */
export function chargingWatts(
  currentNowUa: number | null,
  voltageMv: number | null,
): number | null {
  if (currentNowUa == null || voltageMv == null) return null;
  if (!Number.isFinite(currentNowUa) || !Number.isFinite(voltageMv)) return null;
  return (currentNowUa * voltageMv) / 1e9;
}

/** Rows for the stats grid — anything Android did not report is left out. */
export function buildBatteryStats(reading: BatteryReading): BatteryStat[] {
  const stats: BatteryStat[] = [];

  const health = HEALTH_LABELS[reading.health];
  if (health) stats.push({ key: 'health', label: 'Health', value: health });

  if (reading.temperatureC != null) {
    stats.push({
      key: 'temperature',
      label: 'Temperature',
      value: formatTemperature(reading.temperatureC, 'C', 1),
    });
  }

  if (reading.voltageMv != null) {
    stats.push({ key: 'voltage', label: 'Voltage', value: `${reading.voltageMv} mV` });
  }

  if (reading.technology) {
    stats.push({ key: 'technology', label: 'Technology', value: reading.technology });
  }

  const plug = PLUG_LABELS[reading.plugged];
  if (plug) stats.push({ key: 'plug', label: 'Plug type', value: plug });

  if (reading.currentNowUa != null) {
    stats.push({
      key: 'current',
      label: 'Current',
      value: `${Math.round(reading.currentNowUa / 1000)} mA`,
    });
  }

  const watts =
    reading.status === 'charging' ? chargingWatts(reading.currentNowUa, reading.voltageMv) : null;
  if (watts != null && watts > 0) {
    stats.push({
      key: 'charging-speed',
      label: 'Charging speed',
      value: `${watts.toFixed(1)} W`,
    });
  }

  return stats;
}
