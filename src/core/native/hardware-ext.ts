import { requireOptionalNativeModule } from 'expo';
import type HardwareExtModule from '@modules/hardware-ext/src/HardwareExtModule';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeHardwareExtModule = typeof HardwareExtModule;

export type CpuFrequency = {
  /** CPU number as on the device (cpu0 … cpuN). */
  index: number;
  /** Current scaling frequency in kHz; `null` when the device blocks the read. */
  currentKhz: number | null;
  /** Highest scaling frequency in kHz; `null` when the device blocks the read. */
  maxKhz: number | null;
};

export type CpuInfo = {
  cores: number;
  abis: string[];
  socModel: string | null;
  socManufacturer: string | null;
  /** `Build.HARDWARE` — the chipset fallback on older Android versions. */
  hardware: string;
  frequencies: CpuFrequency[];
};

export type GpuInfo = {
  renderer: string | null;
  vendor: string | null;
  glVersion: string | null;
  glEsVersion: string | null;
  vulkanVersion: string | null;
};

export type DisplayMode = {
  widthPx: number;
  heightPx: number;
  refreshRateHz: number;
};

export type DisplayInfo = {
  widthPx: number | null;
  heightPx: number | null;
  densityDpi: number;
  density: number;
  xdpi: number;
  ydpi: number;
  refreshRateHz: number | null;
  supportedModes: DisplayMode[];
  isHdr: boolean | null;
  hdrTypes: string[];
  brightness: number | null;
  brightnessMode: 'auto' | 'manual' | null;
  screenTimeoutMs: number | null;
};

export type CameraFacing = 'front' | 'back' | 'external' | 'unknown';

export type CameraDescriptor = {
  id: string;
  facing: CameraFacing;
  megapixels: number | null;
  aperture: number | null;
  focalLengthMm: number | null;
  flash: boolean;
  /** `null` when the camera did not report any optical stabilisation list. */
  opticalStabilization: boolean | null;
  /** `null` when the camera did not report any video stabilisation list. */
  videoStabilization: boolean | null;
};

export type CameraInfo = {
  cameras: CameraDescriptor[];
};

let cached: NativeHardwareExtModule | null | undefined;

function getModule(): NativeHardwareExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeHardwareExtModule>('HardwareExt');
  } catch {
    cached = null;
  }
  return cached;
}

export function getCpuInfo(): Result<CpuInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getCpuInfo();
    if (!raw) return unavailable('Android did not return CPU information.');
    return ok({
      cores: raw.cores,
      abis: raw.abis,
      socModel: raw.socModel,
      socManufacturer: raw.socManufacturer,
      hardware: raw.hardware,
      frequencies: raw.frequencies.map((entry) => ({
        index: entry.index,
        currentKhz: entry.currentKhz,
        maxKhz: entry.maxKhz,
      })),
    });
  } catch {
    return unavailable('Reading CPU information failed.');
  }
}

const HAS_GPU_VALUE = (info: {
  renderer: string | null;
  vendor: string | null;
  glVersion: string | null;
  glEsVersion: string | null;
  vulkanVersion: string | null;
}) =>
  info.renderer != null ||
  info.vendor != null ||
  info.glVersion != null ||
  info.glEsVersion != null ||
  info.vulkanVersion != null;

export function getGpuInfo(): Result<GpuInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getGpuInfo();
    if (!raw) return unavailable('Android did not return GPU information.');
    const info: GpuInfo = {
      renderer: raw.renderer,
      vendor: raw.vendor,
      glVersion: raw.glVersion,
      glEsVersion: raw.glEsVersion,
      vulkanVersion: raw.vulkanVersion,
    };
    if (!HAS_GPU_VALUE(info)) return unavailable('Android did not return GPU information.');
    return ok(info);
  } catch {
    return unavailable('Reading GPU information failed.');
  }
}

export function getDisplayInfo(): Result<DisplayInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getDisplayInfo();
    if (!raw) return unavailable('Android did not return display information.');
    const brightnessMode =
      raw.brightnessMode === 'auto' || raw.brightnessMode === 'manual' ? raw.brightnessMode : null;
    return ok({
      widthPx: raw.widthPx,
      heightPx: raw.heightPx,
      densityDpi: raw.densityDpi,
      density: raw.density,
      xdpi: raw.xdpi,
      ydpi: raw.ydpi,
      refreshRateHz: raw.refreshRateHz,
      supportedModes: raw.supportedModes.map((mode) => ({
        widthPx: mode.widthPx,
        heightPx: mode.heightPx,
        refreshRateHz: mode.refreshRateHz,
      })),
      isHdr: raw.isHdr,
      hdrTypes: raw.hdrTypes,
      brightness: raw.brightness,
      brightnessMode,
      screenTimeoutMs: raw.screenTimeoutMs,
    });
  } catch {
    return unavailable('Reading display information failed.');
  }
}

const FACINGS: readonly CameraFacing[] = ['front', 'back', 'external', 'unknown'];

export function getCameraInfo(): Result<CameraInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getCameraInfo();
    if (!raw) return unavailable('Android did not return camera information.');
    if (raw.cameras.length === 0) {
      return unavailable('Android did not report any cameras.');
    }
    return ok({
      cameras: raw.cameras.map((camera) => ({
        id: camera.id,
        facing: (FACINGS as readonly string[]).includes(camera.facing)
          ? (camera.facing as CameraFacing)
          : 'unknown',
        megapixels: camera.megapixels,
        aperture: camera.aperture,
        focalLengthMm: camera.focalLengthMm,
        flash: camera.flash,
        opticalStabilization: camera.opticalStabilization,
        videoStabilization: camera.videoStabilization,
      })),
    });
  } catch {
    return unavailable('Reading camera information failed.');
  }
}
