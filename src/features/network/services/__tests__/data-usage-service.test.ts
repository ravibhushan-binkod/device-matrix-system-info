import type { AppNetworkUsage, UsageSeries } from '@/core/native';
import {
  appUsageSplit,
  formatUsageBytes,
  rangeEdgeLabels,
  seriesPoints,
  seriesTotalBytes,
  topAppsRanking,
  usageWindow,
} from '@/features/network/services/data-usage-service';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function series(
  rxBytes: number,
  txBytes: number,
  buckets: { rx: number; tx: number }[] = [],
): UsageSeries {
  return {
    rxBytes,
    txBytes,
    buckets: buckets.map((bucket, index) => ({
      startMs: index * DAY_MS,
      endMs: (index + 1) * DAY_MS,
      rxBytes: bucket.rx,
      txBytes: bucket.tx,
    })),
  };
}

function app(overrides: Partial<AppNetworkUsage> = {}): AppNetworkUsage {
  return {
    uid: 1,
    packageName: 'com.example',
    label: 'Example',
    wifiRxBytes: 0,
    wifiTxBytes: 0,
    mobileRxBytes: 0,
    mobileTxBytes: 0,
    ...overrides,
  };
}

describe('usageWindow', () => {
  const now = new Date(2026, 9, 19, 14, 30, 0);
  const midnight = new Date(2026, 9, 19).getTime();

  it('starts today at local midnight and buckets by hour', () => {
    const window = usageWindow('today', now);
    expect(window.startMs).toBe(midnight);
    expect(window.endMs).toBe(now.getTime());
    expect(window.bucketMs).toBe(HOUR_MS);
  });

  it('covers the last 7 calendar days, today included', () => {
    const window = usageWindow('week', now);
    expect(window.startMs).toBe(new Date(2026, 9, 13).getTime());
    expect(window.endMs).toBe(now.getTime());
    expect(window.bucketMs).toBe(DAY_MS);
  });

  it('covers the last 30 calendar days, today included', () => {
    const window = usageWindow('month', now);
    expect(window.startMs).toBe(new Date(2026, 8, 20).getTime());
    expect(window.bucketMs).toBe(DAY_MS);
  });
});

describe('series helpers', () => {
  it('adds receive and transmit bytes', () => {
    expect(seriesTotalBytes(series(120, 30))).toBe(150);
    expect(seriesTotalBytes(null)).toBe(0);
  });

  it('maps the buckets to chart points', () => {
    expect(
      seriesPoints(
        series(0, 0, [
          { rx: 1, tx: 2 },
          { rx: 3, tx: 4 },
        ]),
      ),
    ).toEqual([3, 7]);
    expect(seriesPoints(null)).toEqual([]);
  });

  it('formats sizes with sensible units', () => {
    expect(formatUsageBytes(0)).toBe('0 B');
    expect(formatUsageBytes(1536)).toBe('1.5 KB');
    expect(formatUsageBytes(12_400_000)).toBe('12.4 MB');
    expect(formatUsageBytes(2 * 1024 ** 3)).toBe('2.15 GB');
    expect(formatUsageBytes(Number.NaN)).toBe('—');
  });
});

describe('rangeEdgeLabels', () => {
  it('uses the clock for today', () => {
    const now = new Date(2026, 9, 19, 14, 30, 0);
    expect(rangeEdgeLabels('today', usageWindow('today', now), now)).toEqual({
      start: '00:00',
      end: '14:30',
    });
  });

  it('uses dates for the multi-day ranges', () => {
    const now = new Date(2026, 9, 19, 14, 30, 0);
    expect(rangeEdgeLabels('week', usageWindow('week', now), now)).toEqual({
      start: '13 Oct',
      end: 'today',
    });
    expect(rangeEdgeLabels('month', usageWindow('month', now), now)).toEqual({
      start: '20 Sep',
      end: 'today',
    });
  });
});

describe('topAppsRanking', () => {
  const apps: AppNetworkUsage[] = [
    app({
      uid: 1,
      packageName: 'com.alpha',
      label: 'Alpha',
      wifiRxBytes: 100,
      wifiTxBytes: 50,
      mobileRxBytes: 10,
    }),
    app({ uid: 2, packageName: 'com.beta', label: 'Beta', wifiRxBytes: 200, mobileTxBytes: 100 }),
    app({ uid: 3, packageName: null, label: null }),
    app({ uid: 4, packageName: 'com.gamma', label: null, wifiRxBytes: 25, wifiTxBytes: 25 }),
    app({ uid: 5, packageName: null, label: null, wifiRxBytes: 5 }),
  ];

  it('ranks by combined Wi-Fi and mobile traffic', () => {
    const ranking = topAppsRanking(apps, 2);
    expect(ranking.rows.map((row) => row.label)).toEqual(['Beta', 'Alpha']);
    expect(ranking.rows[0]).toMatchObject({
      totalBytes: 300,
      wifiBytes: 200,
      mobileBytes: 100,
      share: 1,
    });
    expect(ranking.rows[1]?.share).toBeCloseTo(160 / 300, 5);
    expect(ranking.moreApps).toBe(2);
    expect(ranking.moreBytes).toBe(55);
  });

  it('falls back to the package name, then the UID', () => {
    const ranking = topAppsRanking(apps, 10);
    expect(ranking.rows.map((row) => row.label)).toEqual(['Beta', 'Alpha', 'com.gamma', 'UID 5']);
    expect(ranking.rows[3]?.key).toBe('uid:5');
  });

  it('drops apps with no traffic', () => {
    const ranking = topAppsRanking(apps, 10);
    expect(ranking.rows).toHaveLength(4);
    expect(ranking.rows.some((row) => row.totalBytes === 0)).toBe(false);
  });

  it('handles an empty list', () => {
    expect(topAppsRanking([], 6)).toEqual({ rows: [], moreApps: 0, moreBytes: 0 });
  });
});

describe('appUsageSplit', () => {
  const row = {
    key: 'com.example',
    label: 'Example',
    packageName: 'com.example',
    totalBytes: 12_740_000,
    wifiBytes: 12_400_000,
    mobileBytes: 340_000,
    share: 1,
  };

  it('splits the traffic by network type', () => {
    expect(appUsageSplit(row, false)).toBe('12.4 MB Wi-Fi · 340.0 KB mobile');
  });

  it('shows Wi-Fi only when Android withheld mobile data', () => {
    expect(appUsageSplit(row, true)).toBe('12.4 MB Wi-Fi');
  });
});
