import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeAnalyzerPermission,
  NativeApkExport,
  NativeAppAnalyzer,
  NativeAppOverview,
  NativeAppStorage,
  NativeAppUsageTotal,
  NativeLaunch,
  NativeLauncherApp,
  NativePermissionApp,
  NativeScreenTime,
} from './AppsExt.types';

declare class AppsExtModule extends NativeModule<Record<string, never>> {
  /** Launcher apps with icons at `iconSizePx`; runs on a background queue. */
  getLauncherApps(iconSizePx: number): Promise<NativeLauncherApp[]>;
  /** One launcher app, or null when Android does not show it to this app. */
  getAppDetail(packageName: string): Promise<NativeLauncherApp | null>;
  /** Metadata for the analyzer charts (no icons). */
  getAppOverview(): Promise<NativeAppOverview[]>;
  /** Apps whose manifest requests any of the comma-separated permissions. */
  getPermissionApps(permissionsCsv: string): Promise<NativePermissionApp[]>;
  /** One app's permissions, components, signer, native ABIs and sizes. */
  getAppAnalyzer(packageName: string): Promise<NativeAppAnalyzer | null>;
  /** True when the user granted Usage Access in system settings. */
  hasUsageAccess(): boolean;
  /** Per-app foreground time for the last `days` calendar days (today = 1). */
  getUsageTotals(days: number): Promise<NativeAppUsageTotal[]>;
  /** Screen time with a daily series and last-used times. */
  getScreenTime(days: number): Promise<NativeScreenTime>;
  /** Per-app app/data/cache byte counts; needs Usage Access. */
  getStorageStats(): Promise<NativeAppStorage[]>;
  /** Copies the base APK to the cache for the share sheet. */
  extractApk(packageName: string): Promise<NativeApkExport | null>;
  /** Opens the system "App info" screen for the package. */
  openAppInfo(packageName: string): NativeLaunch;
}

export type { NativeAnalyzerPermission };

export default requireNativeModule<AppsExtModule>('AppsExt');
