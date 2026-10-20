export type NativeCpuFrequency = {
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

export type NativeCpuInfo = {
  cores: number;
  abis: string[];
  socModel: string | null;
  socManufacturer: string | null;
  hardware: string;
  frequencies: NativeCpuFrequency[];
};

export type NativeGpuInfo = {
  renderer: string | null;
  vendor: string | null;
  glVersion: string | null;
  glEsVersion: string | null;
  vulkanVersion: string | null;
  /** Vulkan hardware level from the system feature; `null` without Vulkan. */
  vulkanLevel: number | null;
  /** `android.hardware.vulkan.compute`; `null` without Vulkan. */
  vulkanCompute: boolean | null;
};

export type NativeDisplayMode = {
  widthPx: number;
  heightPx: number;
  refreshRateHz: number;
};

export type NativeDisplayCutout = {
  hasCutout: boolean;
  safeInsetTopPx: number;
  safeInsetBottomPx: number;
  safeInsetLeftPx: number;
  safeInsetRightPx: number;
};

export type NativeDisplayInfo = {
  widthPx: number | null;
  heightPx: number | null;
  densityDpi: number;
  density: number;
  xdpi: number;
  ydpi: number;
  refreshRateHz: number | null;
  supportedModes: NativeDisplayMode[];
  isHdr: boolean | null;
  hdrTypes: string[];
  isWideColorGamut: boolean | null;
  /** `null` below Android 10 or when the platform blocks the read. */
  cutout: NativeDisplayCutout | null;
  brightness: number | null;
  brightnessMode: string | null;
  screenTimeoutMs: number | null;
};

export type NativeVideoSize = {
  widthPx: number;
  heightPx: number;
};

export type NativeFpsRange = {
  minFps: number;
  maxFps: number;
};

export type NativeCameraDescriptor = {
  id: string;
  facing: string;
  megapixels: number | null;
  sensorWidthPx: number | null;
  sensorHeightPx: number | null;
  sensorPhysicalWidthMm: number | null;
  sensorPhysicalHeightMm: number | null;
  aperture: number | null;
  apertures: number[] | null;
  focalLengthMm: number | null;
  focalLengthsMm: number[] | null;
  isoMin: number | null;
  isoMax: number | null;
  exposureMinNs: number | null;
  exposureMaxNs: number | null;
  /** Diopters; 0 means fixed focus. `null` when the camera hides it. */
  minFocusDistance: number | null;
  maxDigitalZoom: number | null;
  rawSupport: boolean | null;
  /** Video output sizes; `null` when the camera hides the stream map. */
  videoSizes: NativeVideoSize[] | null;
  fpsRanges: NativeFpsRange[] | null;
  /** "legacy" | "limited" | "full" | "level3" | "external" | null. */
  hardwareLevel: string | null;
  /** Physical lenses behind a logical camera (Android 9+); `null` below. */
  physicalCameraIds: string[] | null;
  flash: boolean;
  /** `null` when the camera did not report any optical stabilisation list. */
  opticalStabilization: boolean | null;
  /** `null` when the camera did not report any video stabilisation list. */
  videoStabilization: boolean | null;
};

export type NativeCameraInfo = {
  cameras: NativeCameraDescriptor[];
};

export type NativeTorchInfo = {
  available: boolean;
  /** `null` while the system has not reported a state yet. */
  enabled: boolean | null;
};

export type NativeTorchResult = {
  ok: boolean;
  /** 'unavailable' | 'blocked' | 'failed' | null */
  reason: string | null;
};

export type NativeVibrationInfo = {
  hasVibrator: boolean;
};
