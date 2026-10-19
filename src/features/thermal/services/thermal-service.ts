import { getBatteryInfo, getThermalStatus } from '@/core/native';
import type { ThermalStatusName } from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import { thermalStatusLabel } from '@/core/utils/thermal-status';
import { clamp01, type StatusTone } from '@/design-system/status';
import type { ThermalInfo } from '@/features/thermal/types';

/**
 * 0 % = full headroom (cool), 100 % = the system reports no headroom left.
 * Headroom values above 1 are clamped to 0 %.
 */
export function thermalLoadPercent(headroom: number | null): number | null {
  if (headroom == null || !Number.isFinite(headroom)) return null;
  return Math.round(clamp01(1 - headroom) * 100);
}

/** Android's thermal status mapped to the design-system tones. */
export function thermalStatusTone(status: ThermalStatusName | null): StatusTone {
  switch (status) {
    case 'moderate':
    case 'severe':
      return 'warning';
    case 'critical':
    case 'emergency':
    case 'shutdown':
      return 'critical';
    default:
      return 'good';
  }
}

/** Thermal screen data; the battery temperature is optional and never blocks the read. */
export function readThermalInfo(): Result<ThermalInfo> {
  const thermal = getThermalStatus();
  if (thermal.status === 'unavailable') return unavailable(thermal.reason);
  if (thermal.status === 'denied') return denied(thermal.permission);

  const battery = getBatteryInfo();
  const headroom = thermal.value.headroom;

  return ok({
    statusLabel: thermalStatusLabel(thermal.value.status),
    tone: thermalStatusTone(thermal.value.status),
    loadPercent: thermalLoadPercent(headroom),
    headroomPercent: headroom == null ? null : Math.round(clamp01(headroom) * 100),
    batteryTemperatureC: battery.status === 'ok' ? battery.value.temperatureC : null,
  });
}
