import { getSensors } from '@/core/native';
import type { SensorDescriptor, SensorReportingMode } from '@/core/native';
import type { Result } from '@/core/result';
import type { SensorRow, SensorValue } from '@/features/sensors/types';

export function readSensors(): Result<SensorDescriptor[]> {
  return getSensors();
}

/** `Sensor.getStringType()` suffixes mapped to human labels. */
const TYPE_LABELS: Record<string, string> = {
  accelerometer: 'Accelerometer',
  accelerometer_uncalibrated: 'Accelerometer (uncalibrated)',
  accelerometer_limited_axes: 'Accelerometer (limited axes)',
  accelerometer_limited_axes_uncalibrated: 'Accelerometer (limited axes, uncalibrated)',
  gyroscope: 'Gyroscope',
  gyroscope_uncalibrated: 'Gyroscope (uncalibrated)',
  gyroscope_limited_axes: 'Gyroscope (limited axes)',
  gyroscope_limited_axes_uncalibrated: 'Gyroscope (limited axes, uncalibrated)',
  magnetic_field: 'Magnetometer',
  magnetic_field_uncalibrated: 'Magnetometer (uncalibrated)',
  light: 'Light',
  pressure: 'Pressure',
  proximity: 'Proximity',
  gravity: 'Gravity',
  linear_acceleration: 'Linear acceleration',
  rotation_vector: 'Rotation vector',
  game_rotation_vector: 'Game rotation vector',
  geomagnetic_rotation_vector: 'Geomagnetic rotation vector',
  relative_humidity: 'Relative humidity',
  ambient_temperature: 'Ambient temperature',
  significant_motion: 'Significant motion',
  step_detector: 'Step detector',
  step_counter: 'Step counter',
  heart_rate: 'Heart rate',
  heart_beat: 'Heart beat',
  pose_6dof: 'Pose (6 DOF)',
  stationary_detect: 'Stationary detect',
  motion_detect: 'Motion detect',
  low_latency_offbody_detect: 'Off-body detect',
  hinge_angle: 'Hinge angle',
  heading: 'Heading',
  head_tracker: 'Head tracker',
};

const STRING_TYPE_PREFIX = 'android.sensor.';

/** Friendly type name from `stringType`; falls back to the device sensor name. */
export function sensorLabel(sensor: SensorDescriptor): string {
  const stringType = sensor.stringType;
  if (stringType != null && stringType.length > 0) {
    const suffix = stringType.startsWith(STRING_TYPE_PREFIX)
      ? stringType.slice(STRING_TYPE_PREFIX.length)
      : stringType;
    const label = TYPE_LABELS[suffix];
    if (label) return label;
  }
  return sensor.name;
}

export function toSensorRows(sensors: SensorDescriptor[]): SensorRow[] {
  return sensors.map((sensor, index) => {
    const label = sensorLabel(sensor);
    return {
      key: `${sensor.type}-${index}`,
      type: sensor.type,
      label,
      name: sensor.name,
      vendor: sensor.vendor,
      wakeUp: sensor.isWakeUp,
      searchText: `${label} ${sensor.name} ${sensor.vendor} ${sensor.stringType ?? ''}`
        .toLowerCase()
        .trim(),
    };
  });
}

export function filterSensorRows(rows: SensorRow[], query: string): SensorRow[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return rows;
  return rows.filter((row) => row.searchText.includes(needle));
}

/** Compact number for live sensor values; precision follows the magnitude. */
export function formatSensorValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1000) return String(Math.round(value));
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

const AXES = ['X', 'Y', 'Z'];

/** Value rows for the live card: X/Y/Z for three values, otherwise V1…Vn. */
export function sensorDetailValues(values: number[]): SensorValue[] {
  if (values.length === 0) {
    return [{ key: 'value', label: 'Value', value: '—' }];
  }
  if (values.length === 1) {
    return [{ key: 'value', label: 'Value', value: formatSensorValue(values[0]!) }];
  }
  if (values.length === 3) {
    return values.map((value, index) => ({
      key: `axis-${index}`,
      label: AXES[index]!,
      value: formatSensorValue(value),
    }));
  }
  return values.map((value, index) => ({
    key: `v-${index}`,
    label: `V${index + 1}`,
    value: formatSensorValue(value),
  }));
}

/**
 * Graph series value: the vector magnitude for multi-axis sensors, the value
 * itself for single-value sensors. `null` when there is nothing to plot.
 */
export function vectorMagnitude(values: number[]): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) {
    const only = values[0]!;
    return Number.isFinite(only) ? Math.abs(only) : null;
  }
  let sum = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    sum += value * value;
  }
  return Math.sqrt(sum);
}

/** Shortest sampling delay in µs → sampling rate in Hz. */
export function sensorFrequencyHz(minDelayUs: number): number | null {
  if (!(minDelayUs > 0)) return null;
  return Math.round(1_000_000 / minDelayUs);
}

/**
 * Sampling-rate range from the shortest and longest delays, e.g.
 * "5 – 200 Hz". Falls back to the readable bound only.
 */
export function samplingRateLabel(minDelayUs: number, maxDelayUs: number | null): string | null {
  const fastest = sensorFrequencyHz(minDelayUs);
  const slowestRaw =
    maxDelayUs != null && maxDelayUs > 0 ? Math.round(1_000_000 / maxDelayUs) : null;
  const slowest = slowestRaw != null && slowestRaw > 0 ? slowestRaw : null;
  if (fastest == null && slowest == null) return null;
  if (fastest == null) return `from ${slowest} Hz`;
  if (slowest == null) return `up to ${fastest} Hz`;
  return slowest === fastest ? `${fastest} Hz` : `${slowest} – ${fastest} Hz`;
}

/** Hardware FIFO depth, e.g. "3000 events · 1500 reserved"; `null` when hidden. */
export function fifoLabel(maxEvents: number | null, reservedEvents: number | null): string | null {
  const max = maxEvents != null && maxEvents > 0 ? Math.round(maxEvents) : null;
  const reserved = reservedEvents != null && reservedEvents > 0 ? Math.round(reservedEvents) : null;
  if (max == null && reserved == null) return null;
  if (max == null) return `${reserved} reserved`;
  if (reserved == null) return `${max} events`;
  return `${max} events · ${reserved} reserved`;
}

/** Typical power draw in mA, e.g. "0.15 mA"; `null` when not reported. */
export function formatSensorPower(powerMa: number): string | null {
  if (!(powerMa > 0)) return null;
  return `${Math.round(powerMa * 100) / 100} mA`;
}

const MODE_LABELS: Record<SensorReportingMode, string> = {
  continuous: 'Continuous',
  'on-change': 'On change',
  'one-shot': 'One-shot',
  special: 'Special',
};

export function reportingModeLabel(mode: SensorReportingMode | null): string | null {
  return mode == null ? null : MODE_LABELS[mode];
}
