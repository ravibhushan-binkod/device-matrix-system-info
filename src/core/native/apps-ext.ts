import { requireOptionalNativeModule } from 'expo';
import type AppsExtModule from '@modules/apps-ext/src/AppsExtModule';
import type {
  NativeAppStorage,
  NativeAppUsageTotal,
  NativeLauncherApp,
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
  /** True for apps that shipped with the system image. */
  system: boolean;
  /** `data:image/png;base64,…` icon, or null when it could not be read. */
  icon: string | null;
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
    system: raw.system === true,
    icon: raw.icon ?? null,
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
    return ok(raw.map((entry) => ({ packageName: entry.packageName, totalTimeMs: entry.totalTimeMs ?? 0 })));
  } catch {
    return unavailable('Android did not return the usage figures.');
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
