import type { InstalledApp } from '@/core/native';
import { getLauncherApps, getUsageTotals } from '@/core/native';
import { ok } from '@/core/result';
import {
  LAUNCHER_ICON_PX,
  RANKING_LIMIT,
  appMatchesQuery,
  formatAppDate,
  formatAppDateTime,
  mergeStorageRanking,
  mergeUsageRanking,
  readInstalledApps,
  readUsageTotals,
  selectApps,
  sortApps,
} from '@/features/apps/services/apps-service';

jest.mock('@/core/native', () => ({
  getAppDetail: jest.fn(),
  getLauncherApps: jest.fn(),
  getStorageStats: jest.fn(),
  getUsageTotals: jest.fn(),
  hasUsageAccess: jest.fn(),
  openAppInfo: jest.fn(),
}));

const launcherMock = jest.mocked(getLauncherApps);
const usageMock = jest.mocked(getUsageTotals);

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
    system: false,
    icon: null,
    ...rest,
  };
}

const whatsapp = app({
  packageName: 'com.whatsapp',
  label: 'WhatsApp',
  firstInstallTimeMs: 3_000,
  lastUpdateTimeMs: 9_000,
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
});

describe('sortApps', () => {
  it('sorts by label without case, then by package', () => {
    const sorted = sortApps(apps, 'name');
    expect(sorted.map((entry) => entry.label)).toEqual(['chrome', 'Files', 'Plain', 'WhatsApp']);
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
});
