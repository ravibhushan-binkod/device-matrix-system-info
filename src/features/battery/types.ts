/**
 * Types for the battery feature. Readings use the shared `Result<T>` model
 * from `@/core/result`.
 */

export type BatteryStatKey =
  'health' | 'temperature' | 'voltage' | 'technology' | 'plug' | 'current' | 'charging-speed';

/** One tile in the battery stats grid — the value is already formatted. */
export type BatteryStat = {
  key: BatteryStatKey;
  label: string;
  value: string;
};
