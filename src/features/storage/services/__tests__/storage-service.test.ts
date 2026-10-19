import { getStorageInfo, type StorageInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import {
  buildStorageBreakdown,
  buildVolumeRows,
  readStorageOverview,
  sumAppBytes,
  toStorageOverview,
} from '@/features/storage/services/storage-service';

jest.mock('@/core/native', () => ({
  getStorageInfo: jest.fn(),
}));

const storageMock = jest.mocked(getStorageInfo);

function storage(overrides: Partial<StorageInfo> = {}): StorageInfo {
  return {
    internal: { totalBytes: 128_000_000_000, freeBytes: 59_000_000_000, fsType: 'f2fs' },
    volumes: [
      {
        description: 'Internal shared storage',
        isPrimary: true,
        isRemovable: false,
        state: 'mounted',
        uuid: null,
        path: '/storage/emulated/0',
        fsType: 'f2fs',
        totalBytes: 128_000_000_000,
        freeBytes: 59_000_000_000,
      },
      {
        description: null,
        isPrimary: false,
        isRemovable: true,
        state: 'unmounted',
        uuid: '1234-5678',
        path: null,
        fsType: null,
        totalBytes: null,
        freeBytes: null,
      },
    ],
    ...overrides,
  };
}

describe('toStorageOverview', () => {
  it('derives used bytes and percent from the internal volume', () => {
    const result = toStorageOverview(storage());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedBytes).toBe(69_000_000_000);
    expect(result.value.percent).toBeCloseTo(53.9, 1);
    expect(result.value.fsType).toBe('f2fs');
  });

  it('keeps a blocked file system as null', () => {
    const result = toStorageOverview(
      storage({ internal: { totalBytes: 128_000_000_000, freeBytes: 59_000_000_000, fsType: null } }),
    );
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.fsType).toBeNull();
  });

  it('reports unavailable without an internal volume', () => {
    expect(toStorageOverview(storage({ internal: null })).status).toBe('unavailable');
    expect(
      toStorageOverview(storage({ internal: { totalBytes: 0, freeBytes: 0, fsType: null } })).status,
    ).toBe('unavailable');
  });
});

describe('readStorageOverview', () => {
  it('passes unavailable readings through', () => {
    storageMock.mockReturnValue(unavailable('No storage service on this device.'));
    expect(readStorageOverview()).toEqual(unavailable('No storage service on this device.'));
  });

  it('maps an ok reading', () => {
    storageMock.mockReturnValue(ok(storage()));
    const result = readStorageOverview();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedBytes).toBe(69_000_000_000);
  });
});

describe('buildVolumeRows', () => {
  it('formats size rows, keeps the mount state honest and adds the file system', () => {
    const rows = buildVolumeRows(storage());
    expect(rows[0]).toEqual({
      key: 'Internal shared storage-0',
      label: 'Internal shared storage',
      value: '59.0 GB free of 128.0 GB · f2fs',
      removable: false,
    });
    expect(rows[1]).toEqual({
      key: '1234-5678',
      label: 'Removable storage',
      value: 'unmounted',
      removable: true,
    });
  });

  it('shows a file system even when the sizes are unreadable', () => {
    const rows = buildVolumeRows(
      storage({
        volumes: [
          {
            description: 'USB drive',
            isPrimary: false,
            isRemovable: true,
            state: 'unmounted',
            uuid: null,
            path: null,
            fsType: 'exfat',
            totalBytes: null,
            freeBytes: null,
          },
        ],
      }),
    );
    expect(rows[0]?.value).toBe('unmounted · exfat');
  });

  it('shows null when a mounted volume reports no sizes and no file system', () => {
    const rows = buildVolumeRows(
      storage({
        volumes: [
          {
            description: 'Internal shared storage',
            isPrimary: true,
            isRemovable: false,
            state: 'mounted',
            uuid: null,
            path: '/storage/emulated/0',
            fsType: null,
            totalBytes: null,
            freeBytes: null,
          },
        ],
      }),
    );
    expect(rows[0]?.value).toBeNull();
  });

  it('returns nothing for an empty volume list', () => {
    expect(buildVolumeRows(storage({ volumes: [] }))).toEqual([]);
  });
});

describe('sumAppBytes', () => {
  it('adds app and data bytes only — the cache is already inside data', () => {
    expect(
      sumAppBytes([{ packageName: 'com.example', appBytes: 200, dataBytes: 300, cacheBytes: 500 }]),
    ).toBe(500);
  });

  it('sums across apps and ignores negative nonsense', () => {
    expect(
      sumAppBytes([
        { packageName: 'com.a', appBytes: 1_000, dataBytes: 2_000, cacheBytes: 100 },
        { packageName: 'com.b', appBytes: -5, dataBytes: 500, cacheBytes: 0 },
      ]),
    ).toBe(3_500);
  });
});

describe('buildStorageBreakdown', () => {
  it('splits used space into apps and other', () => {
    expect(buildStorageBreakdown(128_000_000_000, 59_000_000_000, 20_000_000_000)).toEqual({
      appsBytes: 20_000_000_000,
      freeBytes: 59_000_000_000,
      otherBytes: 49_000_000_000,
      totalBytes: 128_000_000_000,
    });
  });

  it('clamps app bytes into the used space so "other" never goes negative', () => {
    expect(buildStorageBreakdown(100, 40, 80)).toEqual({
      appsBytes: 60,
      freeBytes: 40,
      otherBytes: 0,
      totalBytes: 100,
    });
  });

  it('treats a negative free value as zero', () => {
    expect(buildStorageBreakdown(100, -10, 20)).toEqual({
      appsBytes: 20,
      freeBytes: 0,
      otherBytes: 80,
      totalBytes: 100,
    });
  });

  it('returns null without an honest app figure or total', () => {
    expect(buildStorageBreakdown(100, 40, null)).toBeNull();
    expect(buildStorageBreakdown(100, 40, Number.NaN)).toBeNull();
    expect(buildStorageBreakdown(100, 40, -1)).toBeNull();
    expect(buildStorageBreakdown(0, 0, 10)).toBeNull();
  });
});
