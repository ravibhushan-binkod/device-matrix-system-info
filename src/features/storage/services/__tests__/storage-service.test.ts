import { getStorageInfo, type StorageInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import {
  buildVolumeRows,
  readStorageOverview,
  toStorageOverview,
} from '@/features/storage/services/storage-service';

jest.mock('@/core/native', () => ({
  getStorageInfo: jest.fn(),
}));

const storageMock = jest.mocked(getStorageInfo);

function storage(overrides: Partial<StorageInfo> = {}): StorageInfo {
  return {
    internal: { totalBytes: 128_000_000_000, freeBytes: 59_000_000_000 },
    volumes: [
      {
        description: 'Internal shared storage',
        isPrimary: true,
        isRemovable: false,
        state: 'mounted',
        uuid: null,
        path: '/storage/emulated/0',
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
  });

  it('reports unavailable without an internal volume', () => {
    expect(toStorageOverview(storage({ internal: null })).status).toBe('unavailable');
    expect(toStorageOverview(storage({ internal: { totalBytes: 0, freeBytes: 0 } })).status).toBe(
      'unavailable',
    );
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
  it('formats size rows and keeps the mount state honest', () => {
    const rows = buildVolumeRows(storage());
    expect(rows[0]).toEqual({
      key: 'Internal shared storage-0',
      label: 'Internal shared storage',
      value: '59.0 GB free of 128.0 GB',
      removable: false,
    });
    expect(rows[1]).toEqual({
      key: '1234-5678',
      label: 'Removable storage',
      value: 'unmounted',
      removable: true,
    });
  });

  it('shows null when a mounted volume reports no sizes', () => {
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
