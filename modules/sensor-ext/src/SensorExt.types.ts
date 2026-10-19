export type NativeSensorDescriptor = {
  /** `Sensor.TYPE_*` constant. */
  type: number;
  name: string;
  vendor: string;
  version: number;
  /** `Sensor.getStringType()`, e.g. `"android.sensor.accelerometer"`. */
  stringType: string | null;
  maxRange: number;
  resolution: number;
  /** Power draw in mA. */
  powerMa: number;
  /** Shortest sampling delay in µs; 0 for one-shot sensors. */
  minDelayUs: number;
  isWakeUp: boolean;
  reportingMode: string | null;
};

export type NativeSensorChangedEvent = {
  type: number;
  values: number[];
  accuracy: number;
};
