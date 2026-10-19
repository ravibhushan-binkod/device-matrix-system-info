import { requireOptionalNativeModule } from 'expo';
import type DeviceStatsModule from '@modules/device-stats/src/DeviceStatsModule';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeDeviceStatsModule = typeof DeviceStatsModule;

export type MemoryInfo = {
  totalBytes: number;
  availableBytes: number;
  thresholdBytes: number;
  lowMemory: boolean;
};

export type StorageVolumeInfo = {
  description: string | null;
  isPrimary: boolean;
  isRemovable: boolean;
  state: string;
  uuid: string | null;
  path: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
};

export type StorageInfo = {
  internal: { totalBytes: number; freeBytes: number } | null;
  volumes: StorageVolumeInfo[];
};

export type UptimeInfo = {
  /** Milliseconds since boot, including deep sleep. */
  uptimeMillis: number;
};

export type ThermalStatusName =
  'none' | 'light' | 'moderate' | 'severe' | 'critical' | 'emergency' | 'shutdown' | 'unknown';

export type ThermalStatus = {
  /** `null` below Android 10. */
  status: ThermalStatusName | null;
  statusCode: number | null;
  /** 0..1+ forecast headroom; `null` below Android 11 or when unavailable. */
  headroom: number | null;
  headroomForecastSeconds: number;
};

export type OsInfo = {
  /** `System.getProperty("os.version")`; `null` when unavailable. */
  kernel: string | null;
  /** `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED`; `null` when the OS blocks the read. */
  developerOptions: boolean | null;
};

let cached: NativeDeviceStatsModule | null | undefined;

function getModule(): NativeDeviceStatsModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeDeviceStatsModule>('DeviceStats');
  } catch {
    cached = null;
  }
  return cached;
}

export function getMemoryInfo(): Result<MemoryInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getMemoryInfo();
    if (!raw) return unavailable('Android did not return memory information.');
    return ok({
      totalBytes: raw.totalBytes,
      availableBytes: raw.availBytes,
      thresholdBytes: raw.thresholdBytes,
      lowMemory: raw.lowMemory,
    });
  } catch {
    return unavailable('Reading memory information failed.');
  }
}

export function getStorageInfo(): Result<StorageInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getStorageInfo();
    if (!raw) return unavailable('Android did not return storage information.');
    return ok({
      internal: raw.internal,
      volumes: raw.volumes.map((volume) => ({
        description: volume.description,
        isPrimary: volume.isPrimary,
        isRemovable: volume.isRemovable,
        state: volume.state,
        uuid: volume.uuid,
        path: volume.path,
        totalBytes: volume.totalBytes,
        freeBytes: volume.freeBytes,
      })),
    });
  } catch {
    return unavailable('Reading storage information failed.');
  }
}

export function getUptime(): Result<UptimeInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getUptime();
    if (!raw) return unavailable('Android did not return the uptime.');
    return ok({ uptimeMillis: raw.uptimeMillis });
  } catch {
    return unavailable('Reading the uptime failed.');
  }
}

const THERMAL_NAMES: readonly ThermalStatusName[] = [
  'none',
  'light',
  'moderate',
  'severe',
  'critical',
  'emergency',
  'shutdown',
  'unknown',
];

export function getThermalStatus(): Result<ThermalStatus> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getThermalStatus();
    if (!raw) return unavailable('Android did not return the thermal status.');
    if (raw.statusCode == null && raw.headroom == null) {
      return unavailable('Thermal status needs Android 10 or newer.');
    }
    const status =
      raw.status != null && (THERMAL_NAMES as readonly string[]).includes(raw.status)
        ? (raw.status as ThermalStatusName)
        : raw.status != null
          ? 'unknown'
          : null;
    return ok({
      status,
      statusCode: raw.statusCode,
      headroom: raw.headroom,
      headroomForecastSeconds: raw.headroomForecastSeconds,
    });
  } catch {
    return unavailable('Reading the thermal status failed.');
  }
}

export function getOsInfo(): Result<OsInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getOsInfo();
    if (!raw) return unavailable('Android did not return the OS details.');
    if (raw.kernel == null && raw.developerOptions == null) {
      return unavailable('Android did not expose the OS details.');
    }
    return ok({ kernel: raw.kernel, developerOptions: raw.developerOptions });
  } catch {
    return unavailable('Reading the OS details failed.');
  }
}

export type DeveloperSettings = {
  developerOptions: boolean | null;
  usbDebugging: boolean | null;
  /** The largest of the three animation scales; 1 is the Android default. */
  animationScale: number | null;
};

/** Settings.Global developer switches for the tips engine (normal reads only). */
export function getDeveloperSettings(): Result<DeveloperSettings> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getDeveloperSettings();
    if (!raw) return unavailable('Android did not return the developer settings.');
    if (raw.developerOptions == null && raw.usbDebugging == null && raw.animationScale == null) {
      return unavailable('This build does not expose the developer settings.');
    }
    return ok({
      developerOptions: raw.developerOptions,
      usbDebugging: raw.usbDebugging,
      animationScale: raw.animationScale,
    });
  } catch {
    return unavailable('Reading the developer settings failed.');
  }
}
