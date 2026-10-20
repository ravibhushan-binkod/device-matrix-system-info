import { requireOptionalNativeModule } from 'expo';
import type SensorExtModule from '@modules/sensor-ext/src/SensorExtModule';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeSensorExtModule = typeof SensorExtModule;

export type SensorReportingMode = 'continuous' | 'on-change' | 'one-shot' | 'special';

export type SensorDescriptor = {
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
  reportingMode: SensorReportingMode | null;
};

export type SensorReading = {
  type: number;
  values: number[];
  accuracy: number;
};

export type SensorSubscription = {
  remove: () => void;
};

const REPORTING_MODES: readonly SensorReportingMode[] = [
  'continuous',
  'on-change',
  'one-shot',
  'special',
];

let cached: NativeSensorExtModule | null | undefined;

function getModule(): NativeSensorExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeSensorExtModule>('SensorExt');
  } catch {
    cached = null;
  }
  return cached;
}

export function getSensors(): Result<SensorDescriptor[]> {
  const module = getModule();
  if (!module) return unavailable('The SensorExt native module is not in this build.');
  try {
    const raw = module.getSensors();
    if (!raw) return unavailable('Android did not return the sensor list.');
    return ok(
      raw.map((sensor) => ({
        type: sensor.type,
        name: sensor.name,
        vendor: sensor.vendor,
        version: sensor.version,
        stringType: sensor.stringType,
        maxRange: sensor.maxRange,
        resolution: sensor.resolution,
        powerMa: sensor.powerMa,
        minDelayUs: sensor.minDelayUs,
        maxDelayUs: sensor.maxDelayUs,
        fifoMaxEventCount: sensor.fifoMaxEventCount,
        fifoReservedEventCount: sensor.fifoReservedEventCount,
        isWakeUp: sensor.isWakeUp,
        reportingMode:
          sensor.reportingMode != null &&
          (REPORTING_MODES as readonly string[]).includes(sensor.reportingMode)
            ? (sensor.reportingMode as SensorReportingMode)
            : null,
      })),
    );
  } catch {
    return unavailable('Reading the sensor list failed.');
  }
}

/**
 * Streams one sensor at UI rate; the subscription's `remove()` stops the
 * native listener on both sides. Sensors that need permissions this app does
 * not request (e.g. body sensors) stay unavailable.
 */
export function subscribeToSensor(
  type: number,
  onReading: (reading: SensorReading) => void,
): Result<SensorSubscription> {
  const module = getModule();
  if (!module) return unavailable('The SensorExt native module is not in this build.');
  try {
    const subscription = module.addListener('onSensorChanged', (event) => {
      if (event.type !== type) return;
      onReading({ type: event.type, values: event.values, accuracy: event.accuracy });
    });
    const started = module.startSensor(type);
    if (!started) {
      subscription.remove();
      return unavailable(
        'This sensor cannot be started — the device does not report it or Android blocks it.',
      );
    }
    let removed = false;
    return ok({
      remove: () => {
        if (removed) return;
        removed = true;
        try {
          subscription.remove();
        } catch {
          // Subscription already gone.
        }
        try {
          module.stopSensor();
        } catch {
          // Listener already stopped.
        }
      },
    });
  } catch {
    return unavailable('Subscribing to the sensor failed.');
  }
}
