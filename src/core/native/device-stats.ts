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
  /** Swap space total from /proc/meminfo; `null` when the kernel hides it. */
  swapTotalBytes: number | null;
  swapFreeBytes: number | null;
  swapCachedBytes: number | null;
};

export type StorageVolumeInfo = {
  description: string | null;
  isPrimary: boolean;
  isRemovable: boolean;
  state: string;
  uuid: string | null;
  path: string | null;
  /** File system type from the kernel mount table; `null` when unreadable. */
  fsType: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
};

export type StorageInfo = {
  internal: { totalBytes: number; freeBytes: number; fsType: string | null } | null;
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

export type ThermalZone = {
  /** Zone name from /sys/class/thermal/thermal_zoneN/type. */
  name: string;
  /** Degrees Celsius; `null` when only the name was readable. */
  temperatureC: number | null;
};

export type OsInfo = {
  /** `System.getProperty("os.version")`; `null` when unavailable. */
  kernel: string | null;
  /** `Settings.Global.DEVELOPMENT_SETTINGS_ENABLED`; `null` when the OS blocks the read. */
  developerOptions: boolean | null;
  /** Installed Google Play services version; `null` when the package is hidden. */
  playServicesVersion: string | null;
  /** "enforcing" | "permissive"; `null` when unavailable. */
  selinuxMode: 'enforcing' | 'permissive' | null;
};

export type BuildInfo = {
  brand: string | null;
  model: string | null;
  manufacturer: string | null;
  board: string | null;
  product: string | null;
  device: string | null;
  hardware: string | null;
  bootloader: string | null;
  buildId: string | null;
  fingerprint: string | null;
  /** `Build.VERSION.SECURITY_PATCH`; `null` when the ROM does not set it. */
  securityPatch: string | null;
  /** `Build.TIME` — when the build was produced, in milliseconds. */
  buildTimeMillis: number | null;
  androidVersion: string | null;
  apiLevel: number | null;
  /** First API level the device shipped with; `null` when the property is hidden. */
  firstApiLevel: number | null;
};

export type DeveloperSettings = {
  developerOptions: boolean | null;
  usbDebugging: boolean | null;
  /** The largest of the three animation scales; 1 is the Android default. */
  animationScale: number | null;
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

/** `"unknown"` and blank strings mean "not reported" — never shown as a value. */
function text(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === 'unknown') return null;
  return trimmed;
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
      swapTotalBytes: raw.swapTotalBytes,
      swapFreeBytes: raw.swapFreeBytes,
      swapCachedBytes: raw.swapCachedBytes,
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
        fsType: volume.fsType,
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

/**
 * Thermal zones from /sys/class/thermal. Many builds deny these reads to
 * apps; an empty result is honest (nothing readable), `unavailable` means the
 * zone directory itself is blocked on this device.
 */
export function getThermalZones(): Result<ThermalZone[]> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getThermalZones();
    if (!raw) return unavailable('This device does not expose thermal zones to apps.');
    return ok(
      raw.map((zone) => ({ name: text(zone.name) ?? 'thermal zone', temperatureC: zone.temperatureC })),
    );
  } catch {
    return unavailable('Reading the thermal zones failed.');
  }
}

export function getOsInfo(): Result<OsInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getOsInfo();
    if (!raw) return unavailable('Android did not return the OS details.');
    if (
      raw.kernel == null &&
      raw.developerOptions == null &&
      raw.playServicesVersion == null &&
      raw.selinuxMode == null
    ) {
      return unavailable('Android did not expose the OS details.');
    }
    const selinuxMode =
      raw.selinuxMode === 'enforcing' || raw.selinuxMode === 'permissive' ? raw.selinuxMode : null;
    return ok({
      kernel: text(raw.kernel),
      developerOptions: raw.developerOptions,
      playServicesVersion: text(raw.playServicesVersion),
      selinuxMode,
    });
  } catch {
    return unavailable('Reading the OS details failed.');
  }
}

/** Device identity and build facts straight from `Build` (never guessed). */
export function getBuildInfo(): Result<BuildInfo> {
  const module = getModule();
  if (!module) return unavailable('The DeviceStats native module is not in this build.');
  try {
    const raw = module.getBuildInfo();
    if (!raw) return unavailable('Android did not return the build information.');
    const firstApiLevel =
      raw.firstApiLevel != null && raw.firstApiLevel > 0 ? raw.firstApiLevel : null;
    return ok({
      brand: text(raw.brand),
      model: text(raw.model),
      manufacturer: text(raw.manufacturer),
      board: text(raw.board),
      product: text(raw.product),
      device: text(raw.device),
      hardware: text(raw.hardware),
      bootloader: text(raw.bootloader),
      buildId: text(raw.buildId),
      fingerprint: text(raw.fingerprint),
      securityPatch: text(raw.securityPatch),
      buildTimeMillis:
        raw.buildTimeMillis != null && raw.buildTimeMillis > 0 ? raw.buildTimeMillis : null,
      androidVersion: text(raw.androidVersion),
      apiLevel: raw.apiLevel > 0 ? raw.apiLevel : null,
      firstApiLevel,
    });
  } catch {
    return unavailable('Reading the build information failed.');
  }
}

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
