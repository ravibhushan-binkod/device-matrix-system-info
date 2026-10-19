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
  /** Longest sampling delay in µs (Android 8+); `null` when hidden. */
  maxDelayUs: number | null;
  /** Hardware FIFO capacity in events; `null` when hidden. */
  fifoMaxEventCount: number | null;
  fifoReservedEventCount: number | null;
  isWakeUp: boolean;
  reportingMode: string | null;
};

export type NativeSensorChangedEvent = {
  type: number;
  values: number[];
  accuracy: number;
};
