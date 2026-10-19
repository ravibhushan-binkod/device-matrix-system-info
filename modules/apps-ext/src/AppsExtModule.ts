import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeAppStorage,
  NativeAppUsageTotal,
  NativeLaunch,
  NativeLauncherApp,
} from './AppsExt.types';

declare class AppsExtModule extends NativeModule<Record<string, never>> {
  /** Launcher apps with icons at `iconSizePx`; runs on a background queue. */
  getLauncherApps(iconSizePx: number): Promise<NativeLauncherApp[]>;
  /** One launcher app, or null when Android does not show it to this app. */
  getAppDetail(packageName: string): Promise<NativeLauncherApp | null>;
  /** True when the user granted Usage Access in system settings. */
  hasUsageAccess(): boolean;
  /** Per-app foreground time for the last `days` calendar days (today = 1). */
  getUsageTotals(days: number): Promise<NativeAppUsageTotal[]>;
  /** Per-app app/data/cache byte counts; needs Usage Access. */
  getStorageStats(): Promise<NativeAppStorage[]>;
  /** Opens the system "App info" screen for the package. */
  openAppInfo(packageName: string): NativeLaunch;
}

export default requireNativeModule<AppsExtModule>('AppsExt');
