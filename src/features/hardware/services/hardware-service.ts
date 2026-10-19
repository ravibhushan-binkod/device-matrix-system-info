import {
  getBatteryInfo,
  getCameraInfo,
  getCpuInfo,
  getDeviceIdentity,
  getDisplayInfo,
  getMemoryInfo,
  getSensors,
  getStorageInfo,
  getThermalStatus,
} from '@/core/native';
import type {
  BatteryReading,
  CameraInfo,
  CpuInfo,
  DeviceIdentity,
  DisplayInfo,
  MemoryInfo,
  SensorDescriptor,
  StorageInfo,
  ThermalStatus,
} from '@/core/native';
import type { Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import { chipsetLabel } from '@/core/utils/chipset';
import { thermalStatusLabel } from '@/core/utils/thermal-status';
import type { HubEntry } from '@/features/hardware/types';

export type HardwareSummary = {
  identity: Result<DeviceIdentity>;
  cpu: Result<CpuInfo>;
  thermal: Result<ThermalStatus>;
  memory: Result<MemoryInfo>;
  storage: Result<StorageInfo>;
  battery: Result<BatteryReading>;
  display: Result<DisplayInfo>;
  camera: Result<CameraInfo>;
  sensors: Result<SensorDescriptor[]>;
};

const DASH = '—';

/** Every hub reading in one synchronous pass; each card stays independent. */
export function readHardwareSummary(): HardwareSummary {
  return {
    identity: getDeviceIdentity(),
    cpu: getCpuInfo(),
    thermal: getThermalStatus(),
    memory: getMemoryInfo(),
    storage: getStorageInfo(),
    battery: getBatteryInfo(),
    display: getDisplayInfo(),
    camera: getCameraInfo(),
    sensors: getSensors(),
  };
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function percentValue(usedBytes: number, totalBytes: number): string | null {
  if (!(totalBytes > 0)) return null;
  return `${Math.round((usedBytes / totalBytes) * 100)}%`;
}

function cameraCaptionOf(info: CameraInfo): string | null {
  const count = (facing: string) =>
    info.cameras.filter((camera) => camera.facing === facing).length;
  const back = count('back');
  const front = count('front');
  const external = count('external');
  const parts: string[] = [];
  if (back > 0) parts.push(`${back} back`);
  if (front > 0) parts.push(`${front} front`);
  if (external > 0) parts.push(`${external} external`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** One card per area; unavailable readings show "—" and never a guessed value. */
export function buildHubEntries(summary: HardwareSummary): HubEntry[] {
  const { identity, cpu, thermal, memory, storage, battery, display, camera, sensors } = summary;

  const deviceValue =
    identity.status === 'ok'
      ? [capitalize(identity.value.brand), identity.value.model].filter(Boolean).join(' ')
      : null;
  const deviceCaption =
    identity.status === 'ok' ? `Android ${identity.value.androidVersion}` : null;

  const cpuValue = cpu.status === 'ok' ? `${cpu.value.cores} cores` : null;
  const cpuCaption = cpu.status === 'ok' ? chipsetLabel(cpu.value) : null;

  const thermalValue = thermal.status === 'ok' ? thermalStatusLabel(thermal.value.status) : null;
  const thermalCaption =
    thermal.status === 'ok' && thermal.value.headroom != null
      ? `Headroom ${Math.round(Math.max(0, Math.min(1, thermal.value.headroom)) * 100)}%`
      : null;

  const memValue =
    memory.status === 'ok'
      ? percentValue(memory.value.totalBytes - memory.value.availableBytes, memory.value.totalBytes)
      : null;
  const memCaption =
    memory.status === 'ok' ? `${formatByteSize(memory.value.availableBytes)} free` : null;

  const internal = storage.status === 'ok' ? storage.value.internal : null;
  const storageValue = internal
    ? percentValue(internal.totalBytes - internal.freeBytes, internal.totalBytes)
    : null;
  const storageCaption = internal ? `${formatByteSize(internal.freeBytes)} free` : null;

  const batteryValue =
    battery.status === 'ok' && battery.value.percent != null
      ? `${Math.round(battery.value.percent)}%`
      : null;
  const batteryCaption =
    battery.status === 'ok'
      ? battery.value.status === 'charging'
        ? 'Charging'
        : battery.value.plugged !== 'none' && battery.value.plugged !== 'unknown'
          ? 'Plugged in'
          : 'On battery'
      : null;

  const displayValue =
    display.status === 'ok' && display.value.widthPx != null && display.value.heightPx != null
      ? `${display.value.widthPx} × ${display.value.heightPx}`
      : null;
  const displayCaption =
    display.status === 'ok' && display.value.refreshRateHz != null
      ? `${Math.round(display.value.refreshRateHz)} Hz`
      : null;

  const cameraCount = camera.status === 'ok' ? camera.value.cameras.length : 0;
  const cameraValue =
    camera.status === 'ok' ? (cameraCount === 1 ? '1 camera' : `${cameraCount} cameras`) : null;
  const cameraCaption = camera.status === 'ok' ? cameraCaptionOf(camera.value) : null;

  const sensorCount = sensors.status === 'ok' ? sensors.value.length : 0;
  const sensorValue =
    sensors.status === 'ok' ? (sensorCount === 1 ? '1 sensor' : `${sensorCount} sensors`) : null;

  return [
    { key: 'device', title: 'Device & OS', value: deviceValue ?? DASH, caption: deviceCaption },
    { key: 'cpu', title: 'CPU & GPU', value: cpuValue ?? DASH, caption: cpuCaption },
    { key: 'thermal', title: 'Thermal', value: thermalValue ?? DASH, caption: thermalCaption },
    { key: 'memory', title: 'Memory', value: memValue ?? DASH, caption: memCaption },
    { key: 'storage', title: 'Storage', value: storageValue ?? DASH, caption: storageCaption },
    { key: 'battery', title: 'Battery', value: batteryValue ?? DASH, caption: batteryCaption },
    { key: 'display', title: 'Display', value: displayValue ?? DASH, caption: displayCaption },
    { key: 'camera', title: 'Camera', value: cameraValue ?? DASH, caption: cameraCaption },
    { key: 'sensors', title: 'Sensors', value: sensorValue ?? DASH, caption: null },
  ];
}
