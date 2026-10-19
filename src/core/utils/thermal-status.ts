import type { ThermalStatusName } from '@/core/native';

const LABELS: Record<ThermalStatusName, string | null> = {
  none: 'Normal',
  light: 'Light',
  moderate: 'Moderate',
  severe: 'Severe',
  critical: 'Critical',
  emergency: 'Emergency',
  shutdown: 'Shutdown',
  unknown: null,
};

/** Human label for Android's thermal status; `null` when the status is unknown. */
export function thermalStatusLabel(status: ThermalStatusName | null): string | null {
  return status == null ? null : LABELS[status];
}
