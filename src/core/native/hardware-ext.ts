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
  /** Lowest scaling frequency in kHz; `null` when the device blocks the read. */
  minKhz: number | null;
  /** Highest scaling frequency in kHz; `null` when the device blocks the read. */
  maxKhz: number | null;
  /** Chosen cpufreq governor (e.g. "schedutil"); `null` when blocked. */
  governor: string | null;
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
  /** Vulkan hardware level (system feature version); `null` without Vulkan. */
  vulkanLevel: number | null;
  /** `android.hardware.vulkan.compute`; `null` without Vulkan. */
  vulkanCompute: boolean | null;
};

export type DisplayMode = {
  widthPx: number;
  heightPx: number;
  refreshRateHz: number;
};

export type DisplayCutout = {
  hasCutout: boolean;
  safeInsetTopPx: number;
  safeInsetBottomPx: number;
  safeInsetLeftPx: number;
  safeInsetRightPx: number;
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
  isWideColorGamut: boolean | null;
  /** `null` below Android 10 or when the platform blocks the read. */
  cutout: DisplayCutout | null;
  brightness: number | null;
  brightnessMode: 'auto' | 'manual' | null;
  screenTimeoutMs: number | null;
};

export type CameraFacing = 'front' | 'back' | 'external' | 'unknown';

export type CameraVideoSize = {
  widthPx: number;
  heightPx: number;
};

export type CameraFpsRange = {
  minFps: number;
  maxFps: number;
};

export type CameraHardwareLevel = 'legacy' | 'limited' | 'full' | 'level3' | 'external';

export type CameraDescriptor = {
  id: string;
  facing: CameraFacing;
  megapixels: number | null;
  sensorWidthPx: number | null;
  sensorHeightPx: number | null;
  /** Physical sensor width in millimetres; `null` when the camera hides it. */
  sensorPhysicalWidthMm: number | null;
  sensorPhysicalHeightMm: number | null;
  aperture: number | null;
  /** Every aperture the lens reports, e.g. ["1.8", "2.4"] on dual-aperture lenses. */
  apertures: number[] | null;
  focalLengthMm: number | null;
  focalLengthsMm: number[] | null;
  isoMin: number | null;
  isoMax: number | null;
  /** Shutter bounds in nanoseconds (min = fastest). */
  exposureMinNs: number | null;
  exposureMaxNs: number | null;
  /** Diopters; 0 means fixed focus. `null` when the camera hides it. */
  minFocusDistance: number | null;
  maxDigitalZoom: number | null;
  rawSupport: boolean | null;
  /** Video output sizes; `null` when the camera hides the stream map. */
  videoSizes: CameraVideoSize[] | null;
  fpsRanges: CameraFpsRange[] | null;
  hardwareLevel: CameraHardwareLevel | null;
  /** Physical lenses behind a logical camera (Android 9+); `null` below. */
  physicalCameraIds: string[] | null;
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
        minKhz: entry.minKhz,
        maxKhz: entry.maxKhz,
        governor: entry.governor,
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

const CAMERA_HARDWARE_LEVELS: readonly CameraHardwareLevel[] = [
  'legacy',
  'limited',
  'full',
  'level3',
  'external',
];

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
      vulkanLevel: raw.vulkanLevel,
      vulkanCompute: raw.vulkanCompute,
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
      isWideColorGamut: raw.isWideColorGamut,
      cutout: raw.cutout,
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
        sensorWidthPx: camera.sensorWidthPx,
        sensorHeightPx: camera.sensorHeightPx,
        sensorPhysicalWidthMm: camera.sensorPhysicalWidthMm,
        sensorPhysicalHeightMm: camera.sensorPhysicalHeightMm,
        aperture: camera.aperture,
        apertures: camera.apertures,
        focalLengthMm: camera.focalLengthMm,
        focalLengthsMm: camera.focalLengthsMm,
        isoMin: camera.isoMin,
        isoMax: camera.isoMax,
        exposureMinNs: camera.exposureMinNs,
        exposureMaxNs: camera.exposureMaxNs,
        minFocusDistance: camera.minFocusDistance,
        maxDigitalZoom: camera.maxDigitalZoom,
        rawSupport: camera.rawSupport,
        videoSizes: camera.videoSizes,
        fpsRanges: camera.fpsRanges,
        hardwareLevel:
          camera.hardwareLevel != null &&
          (CAMERA_HARDWARE_LEVELS as readonly string[]).includes(camera.hardwareLevel)
            ? (camera.hardwareLevel as CameraHardwareLevel)
            : null,
        physicalCameraIds: camera.physicalCameraIds,
        flash: camera.flash,
        opticalStabilization: camera.opticalStabilization,
        videoStabilization: camera.videoStabilization,
      })),
    });
  } catch {
    return unavailable('Reading camera information failed.');
  }
}

export type TorchInfo = {
  available: boolean;
  /** `null` while the system has not reported a state yet — never guessed. */
  enabled: boolean | null;
};

/** Torch availability and the state Android last reported (no camera permission). */
export function getTorchInfo(): Result<TorchInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getTorchInfo();
    if (!raw) return unavailable('Android did not return the flashlight state.');
    return ok({ available: raw.available, enabled: raw.enabled });
  } catch {
    return unavailable('Reading the flashlight state failed.');
  }
}

/** Switches the torch; `unavailable` when Android or the hardware refuses. */
export function setTorch(enabled: boolean): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.setTorch(enabled);
    if (!raw || !raw.ok) {
      return unavailable(
        raw?.reason === 'unavailable'
          ? 'This device has no flashlight.'
          : 'Android blocked the flashlight on this device.',
      );
    }
    return ok(true);
  } catch {
    return unavailable('Switching the flashlight failed.');
  }
}

export type VibrationInfo = {
  hasVibrator: boolean;
};

export type AudioOutputRoute =
  'wired-headset' | 'usb-audio' | 'bluetooth' | 'earpiece' | 'speaker' | 'unknown';

export type AudioOutput = {
  route: AudioOutputRoute;
  headsetConnected: boolean;
  usbAudioConnected: boolean;
  /** Android reports a built-in earpiece output. */
  earpieceAvailable: boolean;
  /** Raw output-device labels, useful when the route is not obvious. */
  devices: string[];
};

export type ToneRoute = 'speaker' | 'earpiece';
export type ToneChannel = 'left' | 'right' | 'both';

const AUDIO_ROUTES: readonly AudioOutputRoute[] = [
  'wired-headset',
  'usb-audio',
  'bluetooth',
  'earpiece',
  'speaker',
  'unknown',
];

/** Connected audio outputs and the current route, from AudioManager. */
export function getAudioOutput(): Result<AudioOutput> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getAudioOutput();
    if (!raw) return unavailable('Android did not return the audio outputs.');
    return ok({
      route: (AUDIO_ROUTES as readonly string[]).includes(raw.route)
        ? (raw.route as AudioOutputRoute)
        : 'unknown',
      headsetConnected: raw.headsetConnected,
      usbAudioConnected: raw.usbAudioConnected,
      earpieceAvailable: raw.earpieceAvailable,
      devices: raw.devices.filter((device) => device.length > 0),
    });
  } catch {
    return unavailable('Reading the audio outputs failed.');
  }
}

/**
 * Plays a short test tone for `durationMs` and stops. `earpiece` switches
 * Android to communication mode for the duration and restores it when
 * stopped. No recording permission is involved; the normal
 * MODIFY_AUDIO_SETTINGS permission covers the route.
 */
export function startTone(
  route: ToneRoute,
  channel: ToneChannel,
  durationMs: number = 10_000,
): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.startTone(route, channel, durationMs);
    if (!raw || !raw.ok) {
      if (raw?.reason === 'no-earpiece') {
        return unavailable('This device does not report a built-in earpiece.');
      }
      if (raw?.reason === 'blocked') {
        return unavailable('Android blocked audio routing on this device.');
      }
      return unavailable('The tone could not be played.');
    }
    return ok(true);
  } catch {
    return unavailable('The tone could not be played.');
  }
}

/** Stops and releases the tone; safe to call when nothing is playing. */
export function stopTone(): void {
  const module = getModule();
  if (!module) return;
  try {
    module.stopTone();
  } catch {
    // Already stopped or the module is going away.
  }
}

export type SoundLevelReading = {
  /** 0 (silence at -60 dBFS) … 1 (0 dBFS). */
  level: number;
  db: number;
  peak: number;
};

/**
 * Starts the native microphone level meter. The permission must be granted
 * first; no audio is recorded, kept or sent. Stop it when the screen pauses.
 */
export function startSoundLevel(): Result<true> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.startSoundLevel();
    if (raw?.ok) return ok(true);
    if (raw?.reason === 'blocked') {
      return unavailable('Microphone access was denied. Allow it in system Settings.');
    }
    if (raw?.reason === 'unavailable') {
      return unavailable('This device does not provide a usable microphone input.');
    }
    return unavailable('The microphone level meter could not start.');
  } catch {
    return unavailable('The microphone level meter could not start.');
  }
}

/** Stops and releases the microphone immediately. Safe to call repeatedly. */
export function stopSoundLevel(): void {
  const module = getModule();
  if (!module) return;
  try {
    module.stopSoundLevel();
  } catch {
    // Already stopped or the module is going away.
  }
}

export function addSoundLevelListener(listener: (reading: SoundLevelReading) => void): () => void {
  const module = getModule();
  if (!module) return () => undefined;
  try {
    const subscription = module.addListener('onSoundLevel', (event) => {
      listener({
        level: Number.isFinite(event.level) ? event.level : 0,
        db: Number.isFinite(event.db) ? event.db : -60,
        peak: Number.isFinite(event.peak) ? event.peak : 0,
      });
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}

export type VolumeKeyDirection = 'up' | 'down';

/** Watches volume keys while the checkup screen is active; never consumes them. */
export function startVolumeKeyCapture(): Result<true> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.startVolumeKeyCapture();
    if (raw?.ok) return ok(true);
    return unavailable('Volume buttons cannot be watched on this screen.');
  } catch {
    return unavailable('Volume buttons cannot be watched on this screen.');
  }
}

export function stopVolumeKeyCapture(): void {
  const module = getModule();
  if (!module) return;
  try {
    module.stopVolumeKeyCapture();
  } catch {
    // Already stopped or the module is going away.
  }
}

export function addVolumeKeyListener(
  listener: (direction: VolumeKeyDirection) => void,
): () => void {
  const module = getModule();
  if (!module) return () => undefined;
  try {
    const subscription = module.addListener('onVolumeKey', (event) => {
      if (event.direction === 'up' || event.direction === 'down') listener(event.direction);
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}

export function getVibrationInfo(): Result<VibrationInfo> {
  const module = getModule();
  if (!module) return unavailable('The HardwareExt native module is not in this build.');
  try {
    const raw = module.getVibrationInfo();
    if (!raw) return unavailable('Android did not return the vibration details.');
    return ok({ hasVibrator: raw.hasVibrator });
  } catch {
    return unavailable('Reading the vibration details failed.');
  }
}
