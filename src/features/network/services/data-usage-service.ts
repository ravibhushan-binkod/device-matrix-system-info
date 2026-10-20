import type { AppNetworkUsage, UsageSeries } from '@/core/native';
import { formatByteSize } from '@/core/utils/format-bytes';

export type DataUsageRange = 'today' | 'week' | 'month';

export const USAGE_RANGES: readonly { id: DataUsageRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 days' },
  { id: 'month', label: '30 days' },
];

export type UsageWindow = {
  startMs: number;
  endMs: number;
  /** Bucket size Android is asked to split the range into. */
  bucketMs: number;
};

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * The range the data usage screen queries: local midnight for "Today" split by
 * hour, the last 7 / 30 calendar days split by day.
 */
export function usageWindow(range: DataUsageRange, now: Date): UsageWindow {
  const endMs = now.getTime();
  const startOfToday = startOfLocalDay(now).getTime();
  switch (range) {
    case 'today':
      return { startMs: startOfToday, endMs, bucketMs: HOUR_MS };
    case 'week':
      return { startMs: startOfToday - 6 * DAY_MS, endMs, bucketMs: DAY_MS };
    case 'month':
      return { startMs: startOfToday - 29 * DAY_MS, endMs, bucketMs: DAY_MS };
  }
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Total bytes of one series (rx + tx), 0 when the series is missing. */
export function seriesTotalBytes(series: UsageSeries | null): number {
  if (!series) return 0;
  return series.rxBytes + series.txBytes;
}

/** Per-bucket totals for the chart; empty when the series is missing. */
export function seriesPoints(series: UsageSeries | null): number[] {
  if (!series) return [];
  return series.buckets.map((bucket) => bucket.rxBytes + bucket.txBytes);
}

/** A human size for a chart's summary line. */
export function formatUsageBytes(bytes: number): string {
  return formatByteSize(bytes, { digits: bytes >= 1024 ** 3 ? 2 : 1 });
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function shortTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
}

/** The two labels under the chart: where the range starts and when it ends. */
export function rangeEdgeLabels(
  range: DataUsageRange,
  window: UsageWindow,
  now: Date,
): { start: string; end: string } {
  if (range === 'today') {
    return { start: '00:00', end: shortTime(now) };
  }
  return { start: shortDate(new Date(window.startMs)), end: 'today' };
}

export type TopAppRow = {
  key: string;
  label: string;
  packageName: string | null;
  totalBytes: number;
  wifiBytes: number;
  mobileBytes: number;
  /** 0..1 against the top row, for the bar width. */
  share: number;
};

export type TopAppsRanking = {
  rows: TopAppRow[];
  /** Apps beyond the shown rows, and their combined traffic. */
  moreApps: number;
  moreBytes: number;
};

/** The busiest apps for the range; anything beyond `limit` is summarised. */
export function topAppsRanking(apps: AppNetworkUsage[], limit = 6): TopAppsRanking {
  const entries = apps
    .map((app) => {
      const wifiBytes = app.wifiRxBytes + app.wifiTxBytes;
      const mobileBytes = app.mobileRxBytes + app.mobileTxBytes;
      return {
        key: app.packageName ?? `uid:${app.uid}`,
        label: app.label ?? app.packageName ?? `UID ${app.uid}`,
        packageName: app.packageName,
        totalBytes: wifiBytes + mobileBytes,
        wifiBytes,
        mobileBytes,
      };
    })
    .filter((entry) => entry.totalBytes > 0)
    .sort((a, b) => b.totalBytes - a.totalBytes || a.label.localeCompare(b.label));

  const top = entries.slice(0, limit);
  const max = top[0]?.totalBytes ?? 0;
  const rest = entries.slice(limit);

  return {
    rows: top.map((entry) => ({
      ...entry,
      share: max > 0 ? entry.totalBytes / max : 0,
    })),
    moreApps: rest.length,
    moreBytes: rest.reduce((total, entry) => total + entry.totalBytes, 0),
  };
}

/** Caption splitting an app's traffic by network type. */
export function appUsageSplit(row: TopAppRow, mobileBlocked: boolean): string {
  const wifi = `${formatUsageBytes(row.wifiBytes)} Wi-Fi`;
  if (mobileBlocked) return wifi;
  return `${wifi} · ${formatUsageBytes(row.mobileBytes)} mobile`;
}
