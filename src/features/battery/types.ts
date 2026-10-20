/**
 * Types for the battery feature. Readings use the shared `Result<T>` model
 * from `@/core/result`.
 */

export type BatteryStatKey =
  | 'health'
  | 'temperature'
  | 'voltage'
  | 'technology'
  | 'plug'
  | 'current'
  | 'power'
  | 'capacity'
  | 'cycle-count'
  | 'time-to-full';

/** One tile in the battery stats grid — the value is already formatted. */
export type BatteryStat = {
  key: BatteryStatKey;
  label: string;
  value: string;
};

/** One graph sample: every metric the reading reported at that moment. */
export type BatteryGraphSample = {
  /** Signed instantaneous current in mA; `null` when the device hides it. */
  currentMa: number | null;
  /** Signed power in W (V × I); `null` when voltage or current is hidden. */
  watts: number | null;
  temperatureC: number | null;
};

export type BatteryGraphMetric = 'current' | 'power' | 'temperature';
