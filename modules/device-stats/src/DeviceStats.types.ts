export type NativeMemoryInfo = {
  totalBytes: number;
  availBytes: number;
  thresholdBytes: number;
  lowMemory: boolean;
  /** Swap space from /proc/meminfo; `null` when the kernel hides it. */
  swapTotalBytes: number | null;
  swapFreeBytes: number | null;
  swapCachedBytes: number | null;
};

export type NativeStorageVolume = {
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

export type NativeStorageInfo = {
  internal: { totalBytes: number; freeBytes: number; fsType: string | null } | null;
  volumes: NativeStorageVolume[];
};

export type NativeUptime = {
  uptimeMillis: number;
};

export type NativeThermalStatus = {
  statusCode: number | null;
  status: string | null;
  headroom: number | null;
  headroomForecastSeconds: number;
};

export type NativeThermalZone = {
  /** Zone name from /sys/class/thermal/thermal_zoneN/type. */
  name: string;
  /** Degrees Celsius; `null` when only the name was readable. */
  temperatureC: number | null;
};

export type NativeOsInfo = {
  kernel: string | null;
  developerOptions: boolean | null;
  playServicesVersion: string | null;
  /** "enforcing" | "permissive" | null when unreadable. */
  selinuxMode: string | null;
};

export type NativeBuildInfo = {
  brand: string;
  model: string;
  manufacturer: string;
  board: string;
  product: string;
  device: string;
  hardware: string;
  bootloader: string;
  buildId: string;
  fingerprint: string;
  /** `Build.VERSION.SECURITY_PATCH`; "unknown" when the ROM does not set it. */
  securityPatch: string;
  buildTimeMillis: number;
  androidVersion: string;
  apiLevel: number;
  /** First API level the device shipped with; `null` when the property is hidden. */
  firstApiLevel: number | null;
};

export type NativeDeveloperSettings = {
  developerOptions: boolean | null;
  usbDebugging: boolean | null;
  /** The largest of the three animation scales (1 = normal). */
  animationScale: number | null;
};
