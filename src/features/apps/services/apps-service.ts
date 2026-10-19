import { PixelRatio } from 'react-native';

import {
  getAppDetail,
  getLauncherApps,
  getStorageStats,
  getUsageTotals,
  hasUsageAccess,
  openAppInfo,
  type AppStorageStats,
  type AppUsageTotal,
  type InstalledApp,
} from '@/core/native';
import type { Result } from '@/core/result';
import type { AppFilter, AppSort, RankedApp, UsageRange } from '@/features/apps/types';

/** 40 dp launcher icons at the device density, capped so the list stays small. */
export const LAUNCHER_ICON_PX = Math.min(128, Math.round(40 * PixelRatio.get()));

/** Rows per ranking — enough to be useful, short enough to stay scannable. */
export const RANKING_LIMIT = 6;

export const USAGE_RANGES: readonly UsageRange[] = ['today', 'week'];

export const USAGE_RANGE_DAYS: Record<UsageRange, number> = {
  today: 1,
  week: 7,
};

/** Every launcher app with its icon. All the work happens off the JS thread. */
export function readInstalledApps(): Promise<Result<InstalledApp[]>> {
  return getLauncherApps(LAUNCHER_ICON_PX);
}

export function readAppDetail(packageName: string): Promise<Result<InstalledApp>> {
  return getAppDetail(packageName);
}

/** Whether the user granted Usage Access (Settings > Special access). */
export function readUsageAccess(): Result<boolean> {
  return hasUsageAccess();
}

export function readUsageTotals(range: UsageRange): Promise<Result<AppUsageTotal[]>> {
  return getUsageTotals(USAGE_RANGE_DAYS[range]);
}

/** Per-app sizes; needs Usage Access and can take a few seconds. */
export function readStorageStats(): Promise<Result<AppStorageStats[]>> {
  return getStorageStats();
}

/** Opens the system "App info" screen for one package. */
export function openAppInfoSettings(packageName: string): Result<boolean> {
  return openAppInfo(packageName);
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
export function selectApps(apps: InstalledApp[], selection: AppSelection): InstalledApp[] {
  const filtered = apps.filter((app) => {
    if (selection.filter === 'user' && app.system) return false;
    if (selection.filter === 'system' && !app.system) return false;
    return appMatchesQuery(app, selection.query);
  });
  return sortApps(filtered, selection.sort);
}

export function sortApps(apps: InstalledApp[], sort: AppSort): InstalledApp[] {
  const copy = [...apps];
  if (sort === 'name') {
    copy.sort(compareLabels);
  } else {
    const key = sort === 'installed' ? 'firstInstallTimeMs' : 'lastUpdateTimeMs';
    copy.sort((a, b) => compareTimeDesc(a[key], b[key]) || compareLabels(a, b));
  }
  return copy;
}

function compareLabels(a: InstalledApp, b: InstalledApp): number {
  const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  return byLabel !== 0 ? byLabel : a.packageName.localeCompare(b.packageName);
}

/** Newest first; apps without a timestamp sort last. */
function compareTimeDesc(a: number | null, b: number | null): number {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  if (left === right) return 0;
  return right > left ? 1 : -1;
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
    (entry) => entry.appBytes + entry.dataBytes,
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
