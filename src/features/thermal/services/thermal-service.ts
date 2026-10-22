import { getBatteryInfo, getThermalStatus, getThermalZones } from '@/core/native';
import type { ThermalStatusName, ThermalZone } from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import { getActiveUnits } from '@/core/units/active';
import { formatTemperature } from '@/core/units/format';
import type { ResolvedUnits } from '@/core/units/types';
import { thermalStatusLabel } from '@/core/utils/thermal-status';
import { clamp01, type StatusTone } from '@/design-system/status';
import type { ThermalInfo, ThermalZoneRow } from '@/features/thermal/types';

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

/** One row per readable zone; the zone name is the kernel's own label. */
export function buildZoneRows(zones: ThermalZone[], units: ResolvedUnits): ThermalZoneRow[] {
  return zones.map((zone, index) => ({
    key: `${zone.name}-${index}`,
    name: zone.name,
    temperature:
      zone.temperatureC == null || !Number.isFinite(zone.temperatureC)
        ? null
        : formatTemperature(zone.temperatureC, units.temperature, 0),
  }));
}

/**
 * Thermal screen data; the battery temperature and the sysfs zones are
 * optional and never block the Android thermal-status read. Pass the units the
 * caller shows so tests and services agree on the same choices.
 */
export function readThermalInfo(units: ResolvedUnits = getActiveUnits()): Result<ThermalInfo> {
  const thermal = getThermalStatus();
  if (thermal.status === 'unavailable') return unavailable(thermal.reason);
  if (thermal.status === 'denied') return denied(thermal.permission);

  const battery = getBatteryInfo();
  const zones = getThermalZones();
  const headroom = thermal.value.headroom;

  return ok({
    statusLabel: thermalStatusLabel(thermal.value.status),
    tone: thermalStatusTone(thermal.value.status),
    loadPercent: thermalLoadPercent(headroom),
    headroomPercent: headroom == null ? null : Math.round(clamp01(headroom) * 100),
    batteryTemperatureC: battery.status === 'ok' ? battery.value.temperatureC : null,
    zones: zones.status === 'ok' ? buildZoneRows(zones.value, units) : [],
    zonesNote:
      zones.status === 'ok'
        ? zones.value.length === 0
          ? 'This device does not let apps read any thermal zone.'
          : null
        : zones.status === 'unavailable'
          ? zones.reason
          : `Permission needed: ${zones.permission}`,
  });
}
