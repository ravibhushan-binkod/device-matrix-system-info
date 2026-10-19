export type NativeCpuFrequency = {
  /** CPU number as on the device (cpu0 … cpuN). */
  index: number;
  /** Current scaling frequency in kHz; `null` when the device blocks the read. */
  currentKhz: number | null;
  /** Highest scaling frequency in kHz; `null` when the device blocks the read. */
  maxKhz: number | null;
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
};

export type NativeDisplayMode = {
  widthPx: number;
  heightPx: number;
  refreshRateHz: number;
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
  brightness: number | null;
  brightnessMode: string | null;
  screenTimeoutMs: number | null;
};

export type NativeCameraDescriptor = {
  id: string;
  facing: string;
  megapixels: number | null;
  aperture: number | null;
  focalLengthMm: number | null;
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
