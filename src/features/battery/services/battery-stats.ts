import type { BatteryHealth, BatteryPlug, BatteryReading, BatteryStatus } from '@/core/native';
import { formatTemperature } from '@/core/utils/format-temperature';
import type { BatteryGraphMetric, BatteryGraphSample, BatteryStat } from '@/features/battery/types';

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

/** Human label for a health reading ("Good", "Overheat", …); `null` when unknown. */
export function batteryHealthLabel(health: BatteryHealth): string | null {
  return HEALTH_LABELS[health];
}

/** Plug type label ("USB", "Wireless", …); `null` when unknown or unplugged. */
export function batteryPlugLabel(plugged: BatteryPlug): string | null {
  return plugged === 'none' || plugged === 'unknown' ? null : PLUG_LABELS[plugged];
}

/**
 * Power in watts from the battery-side current and voltage
 * (µA × mV = 10⁻⁹ W). Signed: positive while charging, negative while the
 * phone runs on battery. `null` when either reading is missing.
 */
export function powerWatts(currentNowUa: number | null, voltageMv: number | null): number | null {
  if (currentNowUa == null || voltageMv == null) return null;
  if (!Number.isFinite(currentNowUa) || !Number.isFinite(voltageMv)) return null;
  return (currentNowUa * voltageMv) / 1e9;
}

/**
 * Capacity estimate in mAh: the charge counter Android reports, scaled up by
 * the current percentage. An estimate by definition — `null` when either
 * value is missing or nonsensical.
 */
export function estimateCapacityMah(
  chargeCounterUah: number | null,
  percent: number | null,
): number | null {
  if (chargeCounterUah == null || percent == null) return null;
  if (!Number.isFinite(chargeCounterUah) || !Number.isFinite(percent)) return null;
  if (chargeCounterUah <= 0) return null;
  if (!(percent > 0) || percent > 100) return null;
  return chargeCounterUah / (percent / 100) / 1000;
}

/**
 * Hours-to-full estimate: the charge still missing (capacity minus the
 * charge counter) divided by the current charging current. Charging only.
 */
export function estimateTimeToFullMs(reading: BatteryReading): number | null {
  if (reading.status !== 'charging') return null;
  const capacityMah = estimateCapacityMah(reading.chargeCounterUah, reading.percent);
  if (capacityMah == null || reading.currentNowUa == null) return null;
  const currentUa = reading.currentNowUa;
  if (!(currentUa > 0)) return null;
  const chargeCounterUah = reading.chargeCounterUah;
  if (chargeCounterUah == null) return null;
  const remainingUah = capacityMah * 1000 - chargeCounterUah;
  if (!(remainingUah > 0)) return null;
  return (remainingUah / currentUa) * 3_600_000;
}

/** "≈ 4 h 31 min", "≈ 42 min"; `null` when there is nothing sensible to show. */
export function formatEstimateDuration(milliseconds: number | null): string | null {
  if (milliseconds == null || !Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  const totalMinutes = Math.round(milliseconds / 60_000);
  if (totalMinutes < 1) return '≈ <1 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `≈ ${totalMinutes} min`;
  if (minutes === 0) return `≈ ${hours} h`;
  return `≈ ${hours} h ${minutes} min`;
}

/** The numeric series for the chosen graph metric; samples lacking it are skipped. */
export function batterySeries(samples: BatteryGraphSample[], metric: BatteryGraphMetric): number[] {
  const key = metric === 'current' ? 'currentMa' : metric === 'power' ? 'watts' : 'temperatureC';
  const values: number[] = [];
  for (const sample of samples) {
    const value = sample[key];
    if (value != null && Number.isFinite(value)) values.push(value);
  }
  return values;
}

/** Formatted read-out for the live graph header. */
export function formatGraphValue(metric: BatteryGraphMetric, value: number): string {
  switch (metric) {
    case 'current':
      return `${Math.round(value)} mA`;
    case 'power':
      return `${value.toFixed(1)} W`;
    case 'temperature':
      return formatTemperature(value, 'C', 1);
  }
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

  const watts = powerWatts(reading.currentNowUa, reading.voltageMv);
  if (watts != null) {
    stats.push({ key: 'power', label: 'Power', value: `${watts.toFixed(1)} W` });
  }

  const capacityMah = estimateCapacityMah(reading.chargeCounterUah, reading.percent);
  if (capacityMah != null) {
    stats.push({
      key: 'capacity',
      label: 'Capacity (Estimated)',
      value: `≈ ${Math.round(capacityMah / 10) * 10} mAh`,
    });
  }

  if (reading.cycleCount != null && reading.cycleCount > 0) {
    stats.push({
      key: 'cycle-count',
      label: 'Cycle count',
      value: String(reading.cycleCount),
    });
  }

  const timeToFull = formatEstimateDuration(estimateTimeToFullMs(reading));
  if (timeToFull != null) {
    stats.push({ key: 'time-to-full', label: 'Time to full (Estimated)', value: timeToFull });
  }

  return stats;
}
