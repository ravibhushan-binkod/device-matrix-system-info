import {
  getAudioOutput as getNativeAudioOutput,
  getBluetoothInfo,
  getBatteryInfo,
  getSensors,
  getTorchInfo,
  getVibrationInfo,
  setTorch,
  startTone,
  stopTone,
  subscribeToBattery,
  subscribeToSensor,
  type AudioOutput,
  type BatteryReading,
  type BluetoothInfo,
  type SensorDescriptor,
  type SensorReading,
  type SensorSubscription,
  type TorchInfo,
  type ToneChannel,
  type ToneRoute,
} from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import { Vibration } from 'react-native';

/** Android `Sensor.TYPE_*` values used by the checkup. */
export const SENSOR_TYPES = {
  accelerometer: 1,
  light: 5,
  proximity: 8,
} as const;

export function readTorch(): Result<TorchInfo> {
  return getTorchInfo();
}

export function switchTorch(enabled: boolean): Result<boolean> {
  return setTorch(enabled);
}

export function readVibrationSupport(): Result<boolean> {
  const result = getVibrationInfo();
  if (result.status === 'unavailable') return unavailable(result.reason);
  if (result.status === 'denied') return denied(result.permission);
  return ok(result.value.hasVibrator);
}

export function readAudioOutput(): Result<AudioOutput> {
  return getNativeAudioOutput();
}

export function playTone(
  route: ToneRoute,
  channel: ToneChannel,
  durationMs: number = 10_000,
): Result<boolean> {
  return startTone(route, channel, durationMs);
}

export function stopTestTone(): void {
  stopTone();
}

export function readSensors(): Result<SensorDescriptor[]> {
  return getSensors();
}

export function subscribeToTestSensor(
  type: number,
  onReading: (reading: SensorReading) => void,
): Result<SensorSubscription> {
  return subscribeToSensor(type, onReading);
}

export function readBattery(): Result<BatteryReading> {
  return getBatteryInfo();
}

export function subscribeToTestBattery(
  onReading: (reading: BatteryReading) => void,
): ReturnType<typeof subscribeToBattery> {
  return subscribeToBattery(onReading);
}

export function readBluetooth(): Result<BluetoothInfo> {
  return getBluetoothInfo();
}

/** Short, strong pattern for the guided vibration check (VIBRATE permission). */
export function playTestVibration(): void {
  try {
    Vibration.vibrate([0, 320, 140, 320]);
  } catch {
    // The check-up reports when the device has no motor.
  }
}

/** Stops any test pattern; safe to call repeatedly. */
export function stopTestVibration(): void {
  try {
    Vibration.cancel();
  } catch {
    // Nothing was running.
  }
}
