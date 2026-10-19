/** One launcher app exactly as the OS reports it. Byte counts stay well below 2^53. */
export type NativeLauncherApp = {
  packageName: string;
  label: string;
  versionName: string | null;
  versionCode: number | null;
  firstInstallTimeMs: number | null;
  lastUpdateTimeMs: number | null;
  targetSdk: number | null;
  system: boolean;
  /** `data:image/png;base64,…` at the requested size, or null when unreadable. */
  icon: string | null;
};

/** Foreground time for one app over the requested day span. */
export type NativeAppUsageTotal = {
  packageName: string;
  totalTimeMs: number;
};

/** App, data and cache bytes for one app (needs Usage Access). */
export type NativeAppStorage = {
  packageName: string;
  appBytes: number;
  dataBytes: number;
  cacheBytes: number;
};

export type NativeLaunch = {
  launched: boolean;
  reason: string | null;
};
