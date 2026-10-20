import { requireOptionalNativeModule } from 'expo';
import type AppsExtModule from '@modules/apps-ext/src/AppsExtModule';
import type {
  NativeAnalyzerPermission,
  NativeAppAnalyzer,
  NativeAppOverview,
  NativeAppStorage,
  NativeAppUsageTotal,
  NativeLauncherApp,
  NativePermissionApp,
  NativeScreenTime,
} from '@modules/apps-ext/src/AppsExt.types';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeAppsExtModule = typeof AppsExtModule;

let cached: NativeAppsExtModule | null | undefined;

function getModule(): NativeAppsExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeAppsExtModule>('AppsExt');
  } catch {
    cached = null;
  }
  return cached;
}

/** One launcher app in the shape the features use. */
export type InstalledApp = {
  packageName: string;
  label: string;
  versionName: string | null;
  versionCode: number | null;
  firstInstallTimeMs: number | null;
  lastUpdateTimeMs: number | null;
  /** The target API level the app was built for, when Android reports it. */
  targetSdk: number | null;
  /** The minimum API level the app supports, when Android reports it. */
  minSdk: number | null;
  /** True for apps that shipped with the system image. */
  system: boolean;
  /** `data:image/png;base64,…` icon, or null when it could not be read. */
  icon: string | null;
  /** Package that installed or updated the app, when Android reports it. */
  installerPackage: string | null;
  /** The installer's own app label, when Android can resolve it. */
  installerLabel: string | null;
};

export type AppUsageTotal = {
  packageName: string;
  totalTimeMs: number;
};

export type AppStorageStats = {
  packageName: string;
  appBytes: number;
  dataBytes: number;
  cacheBytes: number;
};

/** Lightweight app metadata for the analyzer charts. */
export type AppOverview = {
  packageName: string;
  label: string;
  targetSdk: number | null;
  installerPackage: string | null;
  installerLabel: string | null;
  firstInstallTimeMs: number | null;
  dangerousPermissionCount: number;
  system: boolean;
};

export type PermissionApp = {
  packageName: string;
  requested: string[];
  granted: string[];
};

export type PermissionProtection = 'dangerous' | 'normal' | 'signature' | 'other';

export type AnalyzerPermission = {
  name: string;
  protection: PermissionProtection;
  granted: boolean;
};

export type AppAnalyzer = {
  packageName: string;
  minSdk: number | null;
  targetSdk: number | null;
  installerPackage: string | null;
  installerLabel: string | null;
  debuggable: boolean;
  signerSha256: string[];
  abis: string[];
  permissions: AnalyzerPermission[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
  appBytes: number | null;
  dataBytes: number | null;
  cacheBytes: number | null;
};

export type ScreenTimeApp = {
  packageName: string;
  totalTimeMs: number;
  lastUsedMs: number;
};

export type ScreenTimeBucket = {
  startMs: number;
  totalTimeMs: number;
};

export type ScreenTime = {
  totalTimeMs: number;
  daily: ScreenTimeBucket[];
  apps: ScreenTimeApp[];
};

export type ApkExport = {
  uri: string;
  fileName: string;
  sizeBytes: number;
};

const MISSING_INDEX = 'The installed-app list is not available on this device.';

function toInstalledApp(raw: NativeLauncherApp): InstalledApp {
  return {
    packageName: raw.packageName,
    label: raw.label,
    versionName: raw.versionName ?? null,
    versionCode: raw.versionCode ?? null,
    firstInstallTimeMs: raw.firstInstallTimeMs ?? null,
    lastUpdateTimeMs: raw.lastUpdateTimeMs ?? null,
    targetSdk: raw.targetSdk ?? null,
    minSdk: raw.minSdk ?? null,
    system: raw.system === true,
    icon: raw.icon ?? null,
    installerPackage: raw.installerPackage ?? null,
    installerLabel: raw.installerLabel ?? null,
  };
}

function toOverview(raw: NativeAppOverview): AppOverview {
  return {
    packageName: raw.packageName,
    label: raw.label,
    targetSdk: raw.targetSdk ?? null,
    installerPackage: raw.installerPackage ?? null,
    installerLabel: raw.installerLabel ?? null,
    firstInstallTimeMs: raw.firstInstallTimeMs ?? null,
    dangerousPermissionCount: raw.dangerousPermissionCount ?? 0,
    system: raw.system === true,
  };
}

function toPermission(raw: NativeAnalyzerPermission): AnalyzerPermission {
  const protection: PermissionProtection =
    raw.protection === 'dangerous' || raw.protection === 'normal' || raw.protection === 'signature'
      ? raw.protection
      : 'other';
  return { name: raw.name, protection, granted: raw.granted === true };
}

function toAnalyzer(raw: NativeAppAnalyzer): AppAnalyzer {
  return {
    packageName: raw.packageName,
    minSdk: raw.minSdk ?? null,
    targetSdk: raw.targetSdk ?? null,
    installerPackage: raw.installerPackage ?? null,
    installerLabel: raw.installerLabel ?? null,
    debuggable: raw.debuggable === true,
    signerSha256: raw.signerSha256 ?? [],
    abis: raw.abis ?? [],
    permissions: (raw.permissions ?? []).map(toPermission),
    activities: raw.activities ?? [],
    services: raw.services ?? [],
    receivers: raw.receivers ?? [],
    providers: raw.providers ?? [],
    appBytes: raw.appBytes ?? null,
    dataBytes: raw.dataBytes ?? null,
    cacheBytes: raw.cacheBytes ?? null,
  };
}

/**
 * Every launcher app with a small PNG icon. The reading runs on the module's
 * background queue, so a long list never blocks the UI thread.
 */
export async function getLauncherApps(iconSizePx: number): Promise<Result<InstalledApp[]>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw = await module.getLauncherApps(iconSizePx);
    return ok(raw.map(toInstalledApp));
  } catch {
    return unavailable('Android did not return the installed-app list.');
  }
}

/** One app's metadata; `unavailable` when Android does not show the app to us. */
export async function getAppDetail(packageName: string): Promise<Result<InstalledApp>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw = await module.getAppDetail(packageName);
    if (!raw) return unavailable('Android does not show this app to Device Matrix.');
    return ok(toInstalledApp(raw));
  } catch {
    return unavailable('Android did not return this app.');
  }
}

/** Lightweight metadata for every launcher app; used by the analyzer charts. */
export async function getAppOverview(): Promise<Result<AppOverview[]>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw = await module.getAppOverview();
    return ok(raw.map(toOverview));
  } catch {
    return unavailable('Android did not return the app overview.');
  }
}

/** Launcher apps whose manifest requests any of `permissions`. */
export async function getPermissionApps(
  permissions: readonly string[],
): Promise<Result<PermissionApp[]>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  if (permissions.length === 0) return ok([]);
  try {
    const raw: NativePermissionApp[] = await module.getPermissionApps(permissions.join(','));
    return ok(
      raw.map((entry) => ({
        packageName: entry.packageName,
        requested: entry.requested ?? [],
        granted: entry.granted ?? [],
      })),
    );
  } catch {
    return unavailable('Android did not return the permission list.');
  }
}

/** Permissions, components, signer, native ABIs and sizes for one app. */
export async function getAppAnalyzer(packageName: string): Promise<Result<AppAnalyzer>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw = await module.getAppAnalyzer(packageName);
    if (!raw) return unavailable('Android does not show this app to Device Matrix.');
    return ok(toAnalyzer(raw));
  } catch {
    return unavailable('Android did not return the app analysis.');
  }
}

/** Whether the user granted Usage Access (Settings > Special access). */
export function hasUsageAccess(): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    return ok(module.hasUsageAccess() === true);
  } catch {
    return unavailable('The usage-access state could not be read.');
  }
}

/**
 * Per-app foreground time for the last `days` calendar days (today = 1).
 * Returns an empty list without Usage Access — Android withholds the records.
 */
export async function getUsageTotals(days: number): Promise<Result<AppUsageTotal[]>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw: NativeAppUsageTotal[] = await module.getUsageTotals(days);
    return ok(
      raw.map((entry) => ({ packageName: entry.packageName, totalTimeMs: entry.totalTimeMs ?? 0 })),
    );
  } catch {
    return unavailable('Android did not return the usage figures.');
  }
}

/** Screen time with a daily series and each app's last-used time. */
export async function getScreenTime(days: number): Promise<Result<ScreenTime>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw: NativeScreenTime = await module.getScreenTime(days);
    return ok({
      totalTimeMs: raw.totalTimeMs ?? 0,
      daily: (raw.daily ?? []).map((bucket) => ({
        startMs: bucket.startMs ?? 0,
        totalTimeMs: bucket.totalTimeMs ?? 0,
      })),
      apps: (raw.apps ?? []).map((entry) => ({
        packageName: entry.packageName,
        totalTimeMs: entry.totalTimeMs ?? 0,
        lastUsedMs: entry.lastUsedMs ?? 0,
      })),
    });
  } catch {
    return unavailable('Android did not return the screen-time figures.');
  }
}

/**
 * Per-app app, data and cache byte counts. Needs Usage Access and can take a
 * few seconds, because Android reports one app at a time.
 */
export async function getStorageStats(): Promise<Result<AppStorageStats[]>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw: NativeAppStorage[] = await module.getStorageStats();
    return ok(
      raw.map((entry) => ({
        packageName: entry.packageName,
        appBytes: entry.appBytes ?? 0,
        dataBytes: entry.dataBytes ?? 0,
        cacheBytes: entry.cacheBytes ?? 0,
      })),
    );
  } catch {
    return unavailable('Android did not return the app sizes.');
  }
}

/** Copies an installed app's base APK into the cache and returns its file URI. */
export async function extractApk(packageName: string): Promise<Result<ApkExport>> {
  const module = getModule();
  if (!module) return unavailable(MISSING_INDEX);
  try {
    const raw = await module.extractApk(packageName);
    if (!raw) return unavailable('Android could not copy this app’s APK.');
    return ok({ uri: raw.uri, fileName: raw.fileName, sizeBytes: raw.sizeBytes });
  } catch {
    return unavailable('Android could not copy this app’s APK.');
  }
}

/** Opens the system "App info" screen for a package. */
export function openAppInfo(packageName: string): Result<boolean> {
  const module = getModule();
  if (!module) return unavailable('No app on this device can open the App info screen.');
  try {
    const raw = module.openAppInfo(packageName);
    if (!raw || !raw.launched) {
      return unavailable(
        raw?.reason === 'no-handler'
          ? 'No app on this device can open the App info screen.'
          : 'The App info screen could not be opened.',
      );
    }
    return ok(true);
  } catch {
    return unavailable('The App info screen could not be opened.');
  }
}
