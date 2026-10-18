import DeviceInfo from 'react-native-device-info';

import { ok, unavailable, type Result } from '@/core/result';

export type DeviceIdentity = {
  brand: string;
  model: string;
  androidVersion: string;
  /** `Build.VERSION.SDK_INT`; `null` when Android did not report it. */
  apiLevel: number | null;
};

export type DeviceBuildInfo = {
  buildId: string | null;
  securityPatch: string | null;
  fingerprint: string | null;
  bootloader: string | null;
  hardware: string | null;
};

/**
 * Device identity through react-native-device-info (normal Android APIs only).
 * Never throws — failures come back as `unavailable`.
 */
export function getDeviceIdentity(): Result<DeviceIdentity> {
  try {
    const brand = DeviceInfo.getBrand();
    const model = DeviceInfo.getModel();
    if (!brand && !model) {
      return unavailable('Android did not return the device model.');
    }
    const apiLevel = DeviceInfo.getApiLevelSync();
    return ok({
      brand,
      model,
      androidVersion: DeviceInfo.getSystemVersion(),
      apiLevel: Number.isFinite(apiLevel) ? apiLevel : null,
    });
  } catch {
    return unavailable('Reading device information failed.');
  }
}

/** `"unknown"` and empty strings are treated as "not reported". */
function text(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === 'unknown') return null;
  return trimmed;
}

function readText(getter: () => string): string | null {
  try {
    return text(getter());
  } catch {
    return null;
  }
}

/** Build-level identity from react-native-device-info (normal Android APIs only). */
export function getDeviceBuildInfo(): Result<DeviceBuildInfo> {
  const info: DeviceBuildInfo = {
    buildId: readText(() => DeviceInfo.getBuildIdSync()),
    securityPatch: readText(() => DeviceInfo.getSecurityPatchSync()),
    fingerprint: readText(() => DeviceInfo.getFingerprintSync()),
    bootloader: readText(() => DeviceInfo.getBootloaderSync()),
    hardware: readText(() => DeviceInfo.getHardwareSync()),
  };

  const hasValue =
    info.buildId != null ||
    info.securityPatch != null ||
    info.fingerprint != null ||
    info.bootloader != null ||
    info.hardware != null;

  return hasValue ? ok(info) : unavailable('Android did not return the build details.');
}
