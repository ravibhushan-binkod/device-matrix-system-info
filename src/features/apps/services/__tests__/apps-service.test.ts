import type { AppOverview, InstalledApp, PermissionApp, ScreenTime } from '@/core/native';
import { getLauncherApps, getScreenTime, getUsageTotals } from '@/core/native';
import { ok } from '@/core/result';
import {
  LAUNCHER_ICON_PX,
  RANKING_LIMIT,
  appMatchesQuery,
  appsByDangerousPermissions,
  appsByInstaller,
  appsByInstallYear,
  appsBySizeBucket,
  appsByTargetSdk,
  formatAppDate,
  formatAppDateTime,
  installerDisplayName,
  mergePermissionApps,
  mergeStorageRanking,
  mergeUsageRanking,
  readInstalledApps,
  readScreenTime,
  readUsageTotals,
  screenTimeBars,
  screenTimeRanking,
  selectApps,
  sortApps,
} from '@/features/apps/services/apps-service';

jest.mock('@/core/native', () => ({
  extractApk: jest.fn(),
  getAppAnalyzer: jest.fn(),
  getAppDetail: jest.fn(),
  getAppOverview: jest.fn(),
  getLauncherApps: jest.fn(),
  getPermissionApps: jest.fn(),
  getScreenTime: jest.fn(),
  getStorageStats: jest.fn(),
  getUsageTotals: jest.fn(),
  hasUsageAccess: jest.fn(),
  openAppInfo: jest.fn(),
  shareFile: jest.fn(),
}));

const launcherMock = jest.mocked(getLauncherApps);
const usageMock = jest.mocked(getUsageTotals);
const screenTimeMock = jest.mocked(getScreenTime);

function app(overrides: Partial<InstalledApp> & { packageName: string }): InstalledApp {
  const { packageName, ...rest } = overrides;
  return {
    packageName,
    label: packageName,
    versionName: '1.0',
    versionCode: 1,
    firstInstallTimeMs: null,
    lastUpdateTimeMs: null,
    targetSdk: 36,
    minSdk: 26,
    system: false,
    icon: null,
    installerPackage: null,
    installerLabel: null,
    ...rest,
  };
}

const whatsapp = app({
  packageName: 'com.whatsapp',
  label: 'WhatsApp',
  firstInstallTimeMs: 3_000,
  lastUpdateTimeMs: 9_000,
  installerPackage: 'com.android.vending',
  installerLabel: 'Google Play Store',
});
const files = app({
  packageName: 'com.android.files',
  label: 'Files',
  system: true,
  firstInstallTimeMs: 2_000,
  lastUpdateTimeMs: null,
});
const chrome = app({
  packageName: 'com.android.chrome',
  label: 'chrome',
  firstInstallTimeMs: 1_000,
  lastUpdateTimeMs: 5_000,
});
const noDates = app({ packageName: 'com.example.plain', label: 'Plain' });

const apps = [whatsapp, files, chrome, noDates];

function overview(overrides: Partial<AppOverview> & { packageName: string }): AppOverview {
  const { packageName, ...rest } = overrides;
  return {
    packageName,
    label: packageName,
    targetSdk: 36,
    installerPackage: null,
    installerLabel: null,
    firstInstallTimeMs: null,
    dangerousPermissionCount: 0,
    system: false,
    ...rest,
  };
}

describe('appMatchesQuery', () => {
  it('matches labels case-insensitively and ignores surrounding spaces', () => {
    expect(appMatchesQuery(whatsapp, 'whats')).toBe(true);
    expect(appMatchesQuery(whatsapp, '  WHATSAPP  ')).toBe(true);
  });

  it('matches package names', () => {
    expect(appMatchesQuery(whatsapp, 'com.whats')).toBe(true);
    expect(appMatchesQuery(whatsapp, 'zzz')).toBe(false);
  });

  it('keeps everything for an empty query', () => {
    expect(appMatchesQuery(whatsapp, '   ')).toBe(true);
  });
});

describe('selectApps', () => {
  it('filters user and system apps', () => {
    const user = selectApps(apps, { query: '', filter: 'user', sort: 'name' });
    const system = selectApps(apps, { query: '', filter: 'system', sort: 'name' });
    expect(user.map((entry) => entry.packageName)).not.toContain('com.android.files');
    expect(system.map((entry) => entry.packageName)).toEqual(['com.android.files']);
  });

  it('combines the search with the filter', () => {
    const found = selectApps(apps, { query: 'chr', filter: 'all', sort: 'name' });
    expect(found.map((entry) => entry.packageName)).toEqual(['com.android.chrome']);
  });

  it('sorts newest installs first and keeps missing dates last', () => {
    const sorted = selectApps(apps, { query: '', filter: 'all', sort: 'installed' });
    expect(sorted.map((entry) => entry.packageName)).toEqual([
      'com.whatsapp',
      'com.android.files',
      'com.android.chrome',
      'com.example.plain',
    ]);
  });

  it('sorts by last update, with never-updated apps last', () => {
    const sorted = selectApps(apps, { query: '', filter: 'all', sort: 'updated' });
    expect(sorted.map((entry) => entry.packageName)).toEqual([
      'com.whatsapp',
      'com.android.chrome',
      'com.android.files',
      'com.example.plain',
    ]);
  });

  it('sorts by reported size, largest first, with unknown sizes last', () => {
    const sizes = new Map([
      ['com.whatsapp', 500],
      ['com.android.files', 100],
    ]);
    const sorted = selectApps(apps, { query: '', filter: 'all', sort: 'size' }, sizes);
    expect(sorted.map((entry) => entry.packageName)).toEqual([
      'com.whatsapp',
      'com.android.files',
      'com.android.chrome',
      'com.example.plain',
    ]);
  });

  it('sorts by target SDK, highest first', () => {
    const custom = [
      app({ packageName: 'old', label: 'Old', targetSdk: 28 }),
      app({ packageName: 'new', label: 'New', targetSdk: 36 }),
      app({ packageName: 'unknown', label: 'Unknown', targetSdk: null }),
    ];
    const sorted = sortApps(custom, 'targetSdk');
    expect(sorted.map((entry) => entry.packageName)).toEqual(['new', 'old', 'unknown']);
  });
});

describe('sortApps', () => {
  it('sorts by label without case, then by package', () => {
    const sorted = sortApps(apps, 'name');
    expect(sorted.map((entry) => entry.label)).toEqual(['chrome', 'Files', 'Plain', 'WhatsApp']);
  });
});

describe('installerDisplayName', () => {
  it('names the Play Store even when Android reports a longer label', () => {
    expect(installerDisplayName(whatsapp)).toBe('Google Play');
  });

  it('uses the reported label or package, then falls back honestly', () => {
    expect(
      installerDisplayName({
        installerPackage: 'com.amazon.venezia',
        installerLabel: 'Amazon Appstore',
      }),
    ).toBe('Amazon Appstore');
    expect(
      installerDisplayName({ installerPackage: 'com.example.store', installerLabel: null }),
    ).toBe('com.example.store');
    expect(installerDisplayName({ installerPackage: null, installerLabel: null })).toBe(
      'Not reported',
    );
  });
});

describe('date formatting', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(formatAppDate(new Date(2025, 0, 5).getTime())).toBe('2025-01-05');
  });

  it('returns null when the timestamp is missing or zero', () => {
    expect(formatAppDate(null)).toBeNull();
    expect(formatAppDate(0)).toBeNull();
  });

  it('formats the local date and time as YYYY-MM-DD HH:mm', () => {
    expect(formatAppDateTime(new Date(2025, 0, 5, 9, 7).getTime())).toBe('2025-01-05 09:07');
  });
});

describe('rankings', () => {
  it('ranks screen time, joining labels and ignoring unknown packages', () => {
    const ranked = mergeUsageRanking(apps, [
      { packageName: 'com.whatsapp', totalTimeMs: 30 * 60_000 },
      { packageName: 'com.android.files', totalTimeMs: 10 * 60_000 },
      { packageName: 'com.android.chrome', totalTimeMs: 60 * 60_000 },
      { packageName: 'android', totalTimeMs: 99 * 60_000 },
      { packageName: 'com.example.plain', totalTimeMs: 0 },
    ]);
    expect(ranked.map((row) => row.packageName)).toEqual([
      'com.android.chrome',
      'com.whatsapp',
      'com.android.files',
    ]);
    expect(ranked[0]?.share).toBe(1);
    expect(ranked[1]?.share).toBeCloseTo(0.5);
    expect(ranked[1]?.label).toBe('WhatsApp');
  });

  it('keeps the ranking to the configured limit', () => {
    const many = Array.from({ length: RANKING_LIMIT + 3 }, (_, index) =>
      app({ packageName: `com.example.app${index}`, label: `App ${index}` }),
    );
    const usage = many.map((entry, index) => ({
      packageName: entry.packageName,
      totalTimeMs: (index + 1) * 60_000,
    }));
    const ranked = mergeUsageRanking(many, usage);
    expect(ranked).toHaveLength(RANKING_LIMIT);
    expect(ranked[0]?.packageName).toBe('com.example.app8');
  });

  it('ranks app + data size (the cache is already part of data)', () => {
    const ranked = mergeStorageRanking(apps, [
      { packageName: 'com.whatsapp', appBytes: 200, dataBytes: 300, cacheBytes: 500 },
      { packageName: 'com.android.files', appBytes: 100, dataBytes: 0, cacheBytes: 0 },
      { packageName: 'com.android.chrome', appBytes: 0, dataBytes: 0, cacheBytes: 0 },
      { packageName: 'android', appBytes: 9_999, dataBytes: 0, cacheBytes: 0 },
    ]);
    expect(ranked.map((row) => row.packageName)).toEqual(['com.whatsapp', 'com.android.files']);
    expect(ranked[0]?.totalBytes).toBe(500);
    expect(ranked[0]?.cacheBytes).toBe(500);
    expect(ranked[1]?.share).toBeCloseTo(0.2, 3);
  });
});

describe('analyzer charts', () => {
  const chartApps = [
    overview({ packageName: 'a', targetSdk: 36, installerPackage: 'com.android.vending' }),
    overview({
      packageName: 'b',
      targetSdk: 36,
      installerPackage: 'com.android.vending',
      firstInstallTimeMs: new Date(2025, 4, 1).getTime(),
      dangerousPermissionCount: 2,
    }),
    overview({
      packageName: 'c',
      targetSdk: 34,
      installerPackage: 'com.amazon.venezia',
      firstInstallTimeMs: new Date(2020, 4, 1).getTime(),
      dangerousPermissionCount: 4,
    }),
    overview({ packageName: 'd', targetSdk: null, dangerousPermissionCount: 6 }),
  ];

  it('groups target SDKs newest first and keeps missing values visible', () => {
    const bars = appsByTargetSdk(chartApps);
    expect(bars.map((bar) => bar.label)).toEqual(['API 36', 'API 34', 'Not reported']);
    expect(bars.map((bar) => bar.count)).toEqual([2, 1, 1]);
    expect(bars[0]?.share).toBe(1);
  });

  it('groups installers into Play, other and not reported', () => {
    const bars = appsByInstaller(chartApps);
    expect(bars.map((bar) => bar.count)).toEqual([2, 1, 1]);
    expect(bars[0]?.label).toBe('Google Play');
  });

  it('groups install years, merging old years only when needed', () => {
    const bars = appsByInstallYear(chartApps, 2026);
    expect(bars.map((bar) => bar.label)).toEqual(['2025', '2020', 'Not reported']);
    expect(bars.map((bar) => bar.count)).toEqual([1, 1, 2]);
  });

  it('buckets sizes and reports apps without a size', () => {
    const storage = [
      { packageName: 'a', appBytes: 5_000_000, dataBytes: 0, cacheBytes: 0 },
      { packageName: 'b', appBytes: 20_000_000, dataBytes: 0, cacheBytes: 0 },
      { packageName: 'c', appBytes: 2_000_000_000, dataBytes: 0, cacheBytes: 0 },
    ];
    const bars = appsBySizeBucket(chartApps, storage);
    expect(bars.find((bar) => bar.label === 'Under 10 MB')?.count).toBe(1);
    expect(bars.find((bar) => bar.label === '10–50 MB')?.count).toBe(1);
    expect(bars.find((bar) => bar.label === '1 GB or more')?.count).toBe(1);
    expect(bars.find((bar) => bar.label === 'Not reported')?.count).toBe(1);
  });

  it('returns no size chart without a size reading', () => {
    expect(appsBySizeBucket(chartApps, null)).toEqual([]);
  });

  it('buckets dangerous-permission counts', () => {
    const bars = appsByDangerousPermissions(chartApps);
    expect(bars.map((bar) => bar.count)).toEqual([1, 1, 1, 1]);
    expect(bars.map((bar) => bar.label)).toEqual(['None', '1–2', '3–5', '6 or more']);
  });
});

describe('permission analyzer', () => {
  it('joins labels and icons and marks a row granted when any permission is granted', () => {
    const entries: PermissionApp[] = [
      {
        packageName: 'com.whatsapp',
        requested: ['android.permission.CAMERA'],
        granted: ['android.permission.CAMERA'],
      },
      {
        packageName: 'com.android.chrome',
        requested: ['android.permission.CAMERA'],
        granted: [],
      },
      {
        packageName: 'com.example.missing',
        requested: ['android.permission.CAMERA'],
        granted: [],
      },
    ];
    const rows = mergePermissionApps(apps, entries);
    expect(rows.map((row) => row.label)).toEqual(['chrome', 'com.example.missing', 'WhatsApp']);
    expect(rows.find((row) => row.packageName === 'com.whatsapp')?.granted).toBe(true);
    expect(rows.find((row) => row.packageName === 'com.android.chrome')?.granted).toBe(false);
    expect(rows.find((row) => row.packageName === 'com.android.chrome')?.requestedCount).toBe(1);
  });
});

describe('screen time', () => {
  const data: ScreenTime = {
    totalTimeMs: 100 * 60_000,
    daily: [
      { startMs: new Date(2026, 9, 19).getTime(), totalTimeMs: 40 * 60_000 },
      { startMs: new Date(2026, 9, 20).getTime(), totalTimeMs: 60 * 60_000 },
    ],
    apps: [
      { packageName: 'com.android.chrome', totalTimeMs: 60 * 60_000, lastUsedMs: 9_000 },
      { packageName: 'com.whatsapp', totalTimeMs: 30 * 60_000, lastUsedMs: 8_000 },
      { packageName: 'android', totalTimeMs: 10 * 60_000, lastUsedMs: 0 },
    ],
  };

  it('ranks apps with last-used times and labels unknown packages honestly', () => {
    const ranking = screenTimeRanking(apps, data);
    expect(ranking.rows.map((row) => row.packageName)).toEqual([
      'com.android.chrome',
      'com.whatsapp',
      'android',
    ]);
    expect(ranking.rows[0]?.share).toBe(1);
    expect(ranking.rows[1]?.share).toBeCloseTo(0.5);
    expect(ranking.rows[2]?.label).toBe('android');
    expect(ranking.rows[2]?.lastUsedMs).toBe(0);
    expect(ranking.moreApps).toBe(0);
  });

  it('reports the tail beyond the top rows', () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      packageName: `com.example.app${index}`,
      totalTimeMs: (index + 1) * 60_000,
      lastUsedMs: 0,
    }));
    const ranking = screenTimeRanking([], { totalTimeMs: 55 * 60_000, daily: [], apps: many });
    expect(ranking.rows).toHaveLength(8);
    expect(ranking.moreApps).toBe(2);
    expect(ranking.moreTimeMs).toBe(3 * 60_000);
  });

  it('turns daily totals into bars with a single Today bar for one day', () => {
    const week = screenTimeBars(data);
    expect(week).toHaveLength(2);
    expect(week.map((bar) => bar.label).every((label) => label.length > 0)).toBe(true);
    expect(week[0]?.share).toBeCloseTo(40 / 60);
    expect(week[1]?.share).toBe(1);

    const today = screenTimeBars({
      totalTimeMs: 5_000,
      daily: [{ startMs: new Date(2026, 9, 20).getTime(), totalTimeMs: 5_000 }],
      apps: [],
    });
    expect(today).toEqual([
      {
        key: String(new Date(2026, 9, 20).getTime()),
        label: 'Today',
        totalTimeMs: 5_000,
        share: 1,
      },
    ]);
  });
});

describe('readings', () => {
  it('reads the launcher list at the icon size the service picked', async () => {
    launcherMock.mockResolvedValue(ok([]));
    await expect(readInstalledApps()).resolves.toEqual(ok([]));
    expect(launcherMock).toHaveBeenCalledWith(LAUNCHER_ICON_PX);
  });

  it('maps the screen-time range to its day span', async () => {
    usageMock.mockResolvedValue(ok([]));
    await readUsageTotals('today');
    expect(usageMock).toHaveBeenLastCalledWith(1);
    await readUsageTotals('week');
    expect(usageMock).toHaveBeenLastCalledWith(7);
  });

  it('reads today and the last seven days for the screen-time screen', async () => {
    screenTimeMock.mockResolvedValue(ok({ totalTimeMs: 0, daily: [], apps: [] }));
    await readScreenTime('today');
    expect(screenTimeMock).toHaveBeenLastCalledWith(1);
    await readScreenTime('week');
    expect(screenTimeMock).toHaveBeenLastCalledWith(7);
  });
});
