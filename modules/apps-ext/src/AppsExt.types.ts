/** One launcher app exactly as the OS reports it. Byte counts stay well below 2^53. */
export type NativeLauncherApp = {
  packageName: string;
  label: string;
  versionName: string | null;
  versionCode: number | null;
  firstInstallTimeMs: number | null;
  lastUpdateTimeMs: number | null;
  targetSdk: number | null;
  minSdk: number | null;
  system: boolean;
  /** `data:image/png;base64,…` at the requested size, or null when unreadable. */
  icon: string | null;
  /** Package that installed or updated the app, when Android reports it. */
  installerPackage: string | null;
  /** The installer's own app label, when Android can resolve it. */
  installerLabel: string | null;
};

/** Minimal per-app metadata for the analyzer charts. */
export type NativeAppOverview = {
  packageName: string;
  label: string;
  targetSdk: number | null;
  installerPackage: string | null;
  installerLabel: string | null;
  firstInstallTimeMs: number | null;
  dangerousPermissionCount: number;
  system: boolean;
};

/** Apps whose manifest requests one of the permissions the analyzer asked for. */
export type NativePermissionApp = {
  packageName: string;
  /** Matching permissions declared in the manifest. */
  requested: string[];
  /** Matching permissions Android currently grants. */
  granted: string[];
};

export type NativePermissionProtection = 'dangerous' | 'normal' | 'signature' | 'other';

export type NativeAnalyzerPermission = {
  name: string;
  protection: NativePermissionProtection;
  granted: boolean;
};

/** Everything the App detail screen needs beyond the launcher list. */
export type NativeAppAnalyzer = {
  packageName: string;
  minSdk: number | null;
  targetSdk: number | null;
  installerPackage: string | null;
  installerLabel: string | null;
  debuggable: boolean;
  /** SHA-256 fingerprints of the APK signers, colon-separated uppercase hex. */
  signerSha256: string[];
  /** ABI directory names found in the APK (`arm64-v8a`, `armeabi-v7a`, …). */
  abis: string[];
  permissions: NativeAnalyzerPermission[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
  /** Per-app sizes; null without Usage Access or when Android refuses them. */
  appBytes: number | null;
  dataBytes: number | null;
  cacheBytes: number | null;
};

/** Foreground time for one app over the requested range. */
export type NativeScreenTimeApp = {
  packageName: string;
  totalTimeMs: number;
  /** Android's lastTimeUsed reading, or 0 when it did not report one. */
  lastUsedMs: number;
};

/** One day in the screen-time chart. */
export type NativeScreenTimeBucket = {
  /** Local midnight of the day, in epoch milliseconds. */
  startMs: number;
  totalTimeMs: number;
};

export type NativeScreenTime = {
  totalTimeMs: number;
  daily: NativeScreenTimeBucket[];
  apps: NativeScreenTimeApp[];
};

/** A copied APK in this app's cache, ready for the system share sheet. */
export type NativeApkExport = {
  uri: string;
  fileName: string;
  sizeBytes: number;
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
