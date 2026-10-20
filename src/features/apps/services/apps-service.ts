import { PixelRatio } from 'react-native';

import {
  extractApk,
  getAppAnalyzer,
  getAppDetail,
  getAppOverview,
  getLauncherApps,
  getPermissionApps,
  getScreenTime,
  getStorageStats,
  getUsageTotals,
  hasUsageAccess,
  openAppInfo,
  shareFile,
  type AppAnalyzer,
  type AppOverview,
  type AppStorageStats,
  type AppUsageTotal,
  type InstalledApp,
  type PermissionApp,
  type ScreenTime,
} from '@/core/native';
import type { Result } from '@/core/result';
import type {
  AppChartBar,
  AppFilter,
  AppSort,
  PermissionGroup,
  PermissionAppRow,
  RankedApp,
  ScreenTimeAppRow,
  ScreenTimeBar,
  ScreenTimeRange,
  ScreenTimeRanking,
  UsageRange,
} from '@/features/apps/types';

/** 40 dp launcher icons at the device density, capped so the list stays small. */
export const LAUNCHER_ICON_PX = Math.min(128, Math.round(40 * PixelRatio.get()));

/** Rows per ranking — enough to be useful, short enough to stay scannable. */
export const RANKING_LIMIT = 6;

/** Apps in the screen-time ranking before the "more apps" summary. */
export const SCREEN_TIME_LIMIT = 8;

export const USAGE_RANGES: readonly UsageRange[] = ['today', 'week'];

export const USAGE_RANGE_DAYS: Record<UsageRange, number> = {
  today: 1,
  week: 7,
};

export const SCREEN_TIME_RANGES: readonly { id: ScreenTimeRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 days' },
];

export const SCREEN_TIME_RANGE_DAYS: Record<ScreenTimeRange, number> = {
  today: 1,
  week: 7,
};

/** The permission groups the analyzer offers, in menu order. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  { key: 'camera', label: 'Camera', permissions: ['android.permission.CAMERA'] },
  { key: 'microphone', label: 'Microphone', permissions: ['android.permission.RECORD_AUDIO'] },
  {
    key: 'location',
    label: 'Location',
    permissions: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  {
    key: 'contacts',
    label: 'Contacts',
    permissions: ['android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS'],
  },
  {
    key: 'sms',
    label: 'SMS',
    permissions: [
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.RECEIVE_MMS',
    ],
  },
  {
    key: 'storage',
    label: 'Storage & media',
    permissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
    ],
  },
  {
    key: 'calendar',
    label: 'Calendar',
    permissions: ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'],
  },
  {
    key: 'phone',
    label: 'Phone & calls',
    permissions: [
      'android.permission.READ_PHONE_STATE',
      'android.permission.CALL_PHONE',
      'android.permission.READ_CALL_LOG',
      'android.permission.WRITE_CALL_LOG',
    ],
  },
  {
    key: 'nearby',
    label: 'Nearby devices',
    permissions: [
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.NEARBY_WIFI_DEVICES',
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    permissions: ['android.permission.POST_NOTIFICATIONS'],
  },
  {
    key: 'activity',
    label: 'Activity & body sensors',
    permissions: ['android.permission.ACTIVITY_RECOGNITION', 'android.permission.BODY_SENSORS'],
  },
];

/** Every launcher app with its icon. All the work happens off the JS thread. */
export function readInstalledApps(): Promise<Result<InstalledApp[]>> {
  return getLauncherApps(LAUNCHER_ICON_PX);
}

export function readAppDetail(packageName: string): Promise<Result<InstalledApp>> {
  return getAppDetail(packageName);
}

/** Permission groups, components, signer and sizes for one app. */
export function readAppAnalyzer(packageName: string): Promise<Result<AppAnalyzer>> {
  return getAppAnalyzer(packageName);
}

/** Lightweight metadata for every launcher app (analyzer charts). */
export function readAppOverview(): Promise<Result<AppOverview[]>> {
  return getAppOverview();
}

/** Launcher apps whose manifest requests any of the group's permissions. */
export function readPermissionApps(group: PermissionGroup): Promise<Result<PermissionApp[]>> {
  return getPermissionApps(group.permissions);
}

/** Whether the user granted Usage Access (Settings > Special access). */
export function readUsageAccess(): Result<boolean> {
  return hasUsageAccess();
}

export function readUsageTotals(range: UsageRange): Promise<Result<AppUsageTotal[]>> {
  return getUsageTotals(USAGE_RANGE_DAYS[range]);
}

/** Screen time for the selected range, with a daily series and last-used times. */
export function readScreenTime(range: ScreenTimeRange): Promise<Result<ScreenTime>> {
  return getScreenTime(SCREEN_TIME_RANGE_DAYS[range]);
}

/** Per-app sizes; needs Usage Access and can take a few seconds. */
export function readStorageStats(): Promise<Result<AppStorageStats[]>> {
  return getStorageStats();
}

/** Opens the system "App info" screen for one package. */
export function openAppInfoSettings(packageName: string): Result<boolean> {
  return openAppInfo(packageName);
}

/**
 * Copies one app's base APK to this app's cache and hands it to the system
 * share sheet. Used only behind the `apkExtraction` feature flag.
 */
export async function exportApk(packageName: string, label: string): Promise<Result<boolean>> {
  const copy = await extractApk(packageName);
  if (copy.status !== 'ok') return copy;
  return shareFile(copy.value.uri, 'application/vnd.android.package-archive', `Save ${label}`);
}

export type AppSelection = {
  query: string;
  filter: AppFilter;
  sort: AppSort;
};

export function appMatchesQuery(app: InstalledApp, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return app.label.toLowerCase().includes(needle) || app.packageName.toLowerCase().includes(needle);
}

/** Search + filter + sort in one pass; returns a new array. */
export function selectApps(
  apps: InstalledApp[],
  selection: AppSelection,
  sizesByPackage?: Map<string, number> | null,
): InstalledApp[] {
  const filtered = apps.filter((app) => {
    if (selection.filter === 'user' && app.system) return false;
    if (selection.filter === 'system' && !app.system) return false;
    return appMatchesQuery(app, selection.query);
  });
  return sortApps(filtered, selection.sort, sizesByPackage);
}

/** Total bytes Android reports for an app (app + data; data includes the cache). */
export function storageTotalBytes(stats: AppStorageStats): number {
  return stats.appBytes + stats.dataBytes;
}

/** `package → total bytes` for the app list's size column and size sorting. */
export function storageSizesMap(storage: AppStorageStats[] | null): Map<string, number> | null {
  if (storage == null) return null;
  return new Map(storage.map((entry) => [entry.packageName, storageTotalBytes(entry)]));
}

function compareLabels(a: InstalledApp, b: InstalledApp): number {
  const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  return byLabel !== 0 ? byLabel : a.packageName.localeCompare(b.packageName);
}

/** Newest / largest / highest first; apps without the value sort last. */
function compareValueDesc(a: number | null, b: number | null): number {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  if (left === right) return 0;
  return right > left ? 1 : -1;
}

export function sortApps(
  apps: InstalledApp[],
  sort: AppSort,
  sizesByPackage?: Map<string, number> | null,
): InstalledApp[] {
  const copy = [...apps];
  switch (sort) {
    case 'name':
      copy.sort(compareLabels);
      break;
    case 'size':
      copy.sort(
        (a, b) =>
          compareValueDesc(
            sizesByPackage?.get(a.packageName) ?? null,
            sizesByPackage?.get(b.packageName) ?? null,
          ) || compareLabels(a, b),
      );
      break;
    case 'installed':
      copy.sort(
        (a, b) =>
          compareValueDesc(a.firstInstallTimeMs, b.firstInstallTimeMs) || compareLabels(a, b),
      );
      break;
    case 'updated':
      copy.sort(
        (a, b) => compareValueDesc(a.lastUpdateTimeMs, b.lastUpdateTimeMs) || compareLabels(a, b),
      );
      break;
    case 'targetSdk':
      copy.sort((a, b) => compareValueDesc(a.targetSdk, b.targetSdk) || compareLabels(a, b));
      break;
  }
  return copy;
}

/** Human name for an app's installer; never guesses beyond Android's report. */
export function installerDisplayName(app: {
  installerPackage: string | null;
  installerLabel: string | null;
}): string {
  if (app.installerPackage === 'com.android.vending') return 'Google Play';
  const label = app.installerLabel?.trim();
  if (label) return label;
  return app.installerPackage ?? 'Not reported';
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function reportedDate(milliseconds: number | null): Date | null {
  if (milliseconds == null || !Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  return new Date(milliseconds);
}

/** Local date as `YYYY-MM-DD`; null when Android did not report one. */
export function formatAppDate(milliseconds: number | null): string | null {
  const date = reportedDate(milliseconds);
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local date and time as `YYYY-MM-DD HH:mm`; null when not reported. */
export function formatAppDateTime(milliseconds: number | null): string | null {
  const date = reportedDate(milliseconds);
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Android's last-used time; null when it reported none. */
export function formatLastUsed(milliseconds: number | null): string | null {
  return formatAppDateTime(milliseconds);
}

type RankedSource = { packageName: string };

function rankApps<T extends RankedSource>(
  apps: InstalledApp[],
  entries: T[],
  valueOf: (entry: T) => number,
  toRanked: (entry: T, app: InstalledApp, value: number, share: number) => RankedApp,
): RankedApp[] {
  const byPackage = new Map(apps.map((app) => [app.packageName, app]));
  const rows: { app: InstalledApp; entry: T; value: number }[] = [];
  for (const entry of entries) {
    const app = byPackage.get(entry.packageName);
    if (!app) continue; // Only launcher apps — anything else is not this screen's business.
    const value = valueOf(entry);
    if (!(value > 0)) continue; // Nothing recorded — keep it out, never guess.
    rows.push({ app, entry, value });
  }
  rows.sort((a, b) => b.value - a.value || compareLabels(a.app, b.app));
  const top = rows.slice(0, RANKING_LIMIT);
  const max = top[0]?.value ?? 0;
  return top.map(({ app, entry, value }) => toRanked(entry, app, value, max > 0 ? value / max : 0));
}

/** Apps ranked by foreground time; packages outside the launcher are ignored. */
export function mergeUsageRanking(apps: InstalledApp[], usage: AppUsageTotal[]): RankedApp[] {
  return rankApps(
    apps,
    usage,
    (entry) => entry.totalTimeMs,
    (_entry, app, value, share) => ({
      packageName: app.packageName,
      label: app.label,
      icon: app.icon,
      totalTimeMs: value,
      totalBytes: 0,
      cacheBytes: 0,
      share,
    }),
  );
}

/** Apps ranked by size on disk (app + data — Android's data bytes include the cache). */
export function mergeStorageRanking(apps: InstalledApp[], storage: AppStorageStats[]): RankedApp[] {
  return rankApps(
    apps,
    storage,
    (entry) => storageTotalBytes(entry),
    (entry, app, value, share) => ({
      packageName: app.packageName,
      label: app.label,
      icon: app.icon,
      totalTimeMs: 0,
      totalBytes: value,
      cacheBytes: entry.cacheBytes,
      share,
    }),
  );
}

/** Counts → chart bars with the tallest bar as 1. */
function toChartBars(bars: { key: string; label: string; count: number }[]): AppChartBar[] {
  const max = bars.reduce((highest, bar) => Math.max(highest, bar.count), 0);
  return bars.map((bar) => ({ ...bar, share: max > 0 ? bar.count / max : 0 }));
}

/** Apps grouped by their target SDK, newest API level first. */
export function appsByTargetSdk(apps: AppOverview[]): AppChartBar[] {
  const levels = new Map<number, number>();
  let unknown = 0;
  for (const app of apps) {
    if (app.targetSdk != null && app.targetSdk > 0) {
      levels.set(app.targetSdk, (levels.get(app.targetSdk) ?? 0) + 1);
    } else {
      unknown += 1;
    }
  }
  const sorted = [...levels.entries()].sort((a, b) => b[0] - a[0]);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const bars = top.map(([level, count]) => ({
    key: `sdk-${level}`,
    label: `API ${level}`,
    count,
  }));
  if (rest.length > 0) {
    bars.push({
      key: 'sdk-other',
      label: 'Other API levels',
      count: rest.reduce((sum, [, count]) => sum + count, 0),
    });
  }
  if (unknown > 0) bars.push({ key: 'sdk-unknown', label: 'Not reported', count: unknown });
  return toChartBars(bars);
}

/** Apps grouped by who installed them: Google Play, another installer, unknown. */
export function appsByInstaller(apps: AppOverview[]): AppChartBar[] {
  let play = 0;
  let other = 0;
  let unknown = 0;
  for (const app of apps) {
    if (app.installerPackage === 'com.android.vending') play += 1;
    else if (app.installerPackage) other += 1;
    else unknown += 1;
  }
  return toChartBars([
    { key: 'installer-play', label: 'Google Play', count: play },
    { key: 'installer-other', label: 'Other installer', count: other },
    { key: 'installer-unknown', label: 'Not reported', count: unknown },
  ]);
}

/** Apps grouped by the year Android first installed them. */
export function appsByInstallYear(
  apps: AppOverview[],
  currentYear: number = new Date().getFullYear(),
): AppChartBar[] {
  const years = new Map<number, number>();
  let unknown = 0;
  for (const app of apps) {
    const date = reportedDate(app.firstInstallTimeMs);
    const year = date?.getFullYear() ?? null;
    if (year == null || year < 2000 || year > currentYear + 1) {
      unknown += 1;
    } else {
      years.set(year, (years.get(year) ?? 0) + 1);
    }
  }
  const sorted = [...years.entries()].sort((a, b) => b[0] - a[0]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const bars = top.map(([year, count]) => ({ key: `year-${year}`, label: `${year}`, count }));
  if (rest.length > 0) {
    bars.push({
      key: 'year-older',
      label: 'Older',
      count: rest.reduce((sum, [, count]) => sum + count, 0),
    });
  }
  if (unknown > 0) bars.push({ key: 'year-unknown', label: 'Not reported', count: unknown });
  return toChartBars(bars);
}

const SIZE_BUCKETS = [
  { key: 'size-smaller-10', label: 'Under 10 MB', test: (bytes: number) => bytes < 10_000_000 },
  {
    key: 'size-10-50',
    label: '10–50 MB',
    test: (bytes: number) => bytes >= 10_000_000 && bytes < 50_000_000,
  },
  {
    key: 'size-50-200',
    label: '50–200 MB',
    test: (bytes: number) => bytes >= 50_000_000 && bytes < 200_000_000,
  },
  {
    key: 'size-200-1000',
    label: '200 MB–1 GB',
    test: (bytes: number) => bytes >= 200_000_000 && bytes < 1_000_000_000,
  },
  { key: 'size-1g-plus', label: '1 GB or more', test: (bytes: number) => bytes >= 1_000_000_000 },
] as const;

/** Apps grouped by their total size; needs the Usage-Access size scan. */
export function appsBySizeBucket(
  apps: AppOverview[],
  storage: AppStorageStats[] | null,
): AppChartBar[] {
  if (storage == null) return [];
  const sizes = new Map(storage.map((entry) => [entry.packageName, storageTotalBytes(entry)]));
  const counts = new Map<string, number>(SIZE_BUCKETS.map((bucket) => [bucket.key, 0]));
  let unknown = 0;
  for (const app of apps) {
    const bytes = sizes.get(app.packageName);
    if (bytes == null) {
      unknown += 1;
      continue;
    }
    const bucket = SIZE_BUCKETS.find((candidate) => candidate.test(bytes));
    if (bucket) counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }
  const bars: { key: string; label: string; count: number }[] = SIZE_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: counts.get(bucket.key) ?? 0,
  }));
  if (unknown > 0) bars.push({ key: 'size-unknown', label: 'Not reported', count: unknown });
  return toChartBars(bars);
}

/** Apps grouped by how many dangerous permissions they declare. */
export function appsByDangerousPermissions(apps: AppOverview[]): AppChartBar[] {
  let none = 0;
  let few = 0;
  let some = 0;
  let many = 0;
  for (const app of apps) {
    const count = app.dangerousPermissionCount;
    if (count <= 0) none += 1;
    else if (count <= 2) few += 1;
    else if (count <= 5) some += 1;
    else many += 1;
  }
  return toChartBars([
    { key: 'danger-0', label: 'None', count: none },
    { key: 'danger-1-2', label: '1–2', count: few },
    { key: 'danger-3-5', label: '3–5', count: some },
    { key: 'danger-6-plus', label: '6 or more', count: many },
  ]);
}

/** Join the native permission reading with the launcher list for labels and icons. */
export function mergePermissionApps(
  apps: InstalledApp[],
  entries: PermissionApp[],
): PermissionAppRow[] {
  const byPackage = new Map(apps.map((app) => [app.packageName, app]));
  return entries
    .map((entry) => {
      const app = byPackage.get(entry.packageName);
      return {
        packageName: entry.packageName,
        label: app?.label ?? entry.packageName,
        icon: app?.icon ?? null,
        granted: entry.granted.length > 0,
        requestedCount: entry.requested.length,
        grantedCount: entry.granted.length,
        requested: entry.requested,
      };
    })
    .sort((a, b) => {
      const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
      return byLabel !== 0 ? byLabel : a.packageName.localeCompare(b.packageName);
    });
}

/** Top apps by foreground time, plus the tail that did not fit the ranking. */
export function screenTimeRanking(apps: InstalledApp[], data: ScreenTime): ScreenTimeRanking {
  const byPackage = new Map(apps.map((app) => [app.packageName, app]));
  const rows = data.apps
    .filter((entry) => entry.totalTimeMs > 0)
    .map((entry) => {
      const app = byPackage.get(entry.packageName);
      return {
        packageName: entry.packageName,
        label: app?.label ?? entry.packageName,
        icon: app?.icon ?? null,
        totalTimeMs: entry.totalTimeMs,
        lastUsedMs: entry.lastUsedMs,
      };
    })
    .sort((a, b) => {
      if (b.totalTimeMs !== a.totalTimeMs) return b.totalTimeMs - a.totalTimeMs;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  const top = rows.slice(0, SCREEN_TIME_LIMIT);
  const rest = rows.slice(SCREEN_TIME_LIMIT);
  const max = top[0]?.totalTimeMs ?? 0;
  return {
    rows: top.map<ScreenTimeAppRow>((row) => ({
      ...row,
      share: max > 0 ? row.totalTimeMs / max : 0,
    })),
    moreApps: rest.length,
    moreTimeMs: rest.reduce((sum, row) => sum + row.totalTimeMs, 0),
  };
}

/** Daily totals → bars; the weekday label comes from the phone's own clock. */
export function screenTimeBars(data: ScreenTime): ScreenTimeBar[] {
  const max = data.daily.reduce((highest, bucket) => Math.max(highest, bucket.totalTimeMs), 0);
  return data.daily.map((bucket) => ({
    key: String(bucket.startMs),
    label:
      data.daily.length === 1
        ? 'Today'
        : new Date(bucket.startMs).toLocaleDateString(undefined, { weekday: 'short' }),
    totalTimeMs: bucket.totalTimeMs,
    share: max > 0 ? bucket.totalTimeMs / max : 0,
  }));
}
