import { getMemoryInfo, type MemoryInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import { readMemoryStats, toMemoryStats } from '@/features/memory/services/memory-service';

jest.mock('@/core/native', () => ({
  getMemoryInfo: jest.fn(),
}));

const memoryMock = jest.mocked(getMemoryInfo);

function info(overrides: Partial<MemoryInfo> = {}): MemoryInfo {
  return {
    totalBytes: 8_000_000_000,
    availableBytes: 2_000_000_000,
    thresholdBytes: 300_000_000,
    lowMemory: false,
    swapTotalBytes: null,
    swapFreeBytes: null,
    swapCachedBytes: null,
    ...overrides,
  };
}

describe('toMemoryStats', () => {
  it('derives used bytes and percent', () => {
    const result = toMemoryStats(info());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedBytes).toBe(6_000_000_000);
    expect(result.value.usedPercent).toBe(75);
    expect(result.value.lowMemory).toBe(false);
    expect(result.value.swapTotalBytes).toBeNull();
    expect(result.value.swapUsedBytes).toBeNull();
  });

  it('clamps a nonsensical available value into the total', () => {
    const result = toMemoryStats(info({ availableBytes: 9_000_000_000 }));
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.availableBytes).toBe(8_000_000_000);
    expect(result.value.usedBytes).toBe(0);
  });

  it('derives swap use when both sides are readable', () => {
    const result = toMemoryStats(
      info({ swapTotalBytes: 2_000_000_000, swapFreeBytes: 500_000_000 }),
    );
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.swapUsedBytes).toBe(1_500_000_000);
  });

  it('keeps swap honest: clamped, partial or negative reads stay usable or null', () => {
    const clamped = toMemoryStats(
      info({ swapTotalBytes: 1_000, swapFreeBytes: 5_000 }),
    );
    expect(clamped.status).toBe('ok');
    if (clamped.status === 'ok') expect(clamped.value.swapUsedBytes).toBe(0);

    const partial = toMemoryStats(info({ swapTotalBytes: 1_000 }));
    expect(partial.status).toBe('ok');
    if (partial.status === 'ok') {
      expect(partial.value.swapTotalBytes).toBe(1_000);
      expect(partial.value.swapUsedBytes).toBeNull();
    }

    const negative = toMemoryStats(
      info({ swapTotalBytes: -5, swapFreeBytes: 1_000 }),
    );
    expect(negative.status).toBe('ok');
    if (negative.status === 'ok') {
      expect(negative.value.swapTotalBytes).toBeNull();
      expect(negative.value.swapUsedBytes).toBeNull();
    }
  });

  it('reports unavailable when the total is missing', () => {
    const result = toMemoryStats(info({ totalBytes: 0, availableBytes: 0, thresholdBytes: 0 }));
    expect(result.status).toBe('unavailable');
  });
});

describe('readMemoryStats', () => {
  it('passes unavailable readings through', () => {
    memoryMock.mockReturnValue(unavailable('No memory service on this device.'));
    expect(readMemoryStats()).toEqual(unavailable('No memory service on this device.'));
  });

  it('maps an ok reading into stats', () => {
    memoryMock.mockReturnValue(
      ok(info({ swapTotalBytes: 1_000_000, swapFreeBytes: 250_000 })),
    );
    const result = readMemoryStats();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedPercent).toBe(75);
    expect(result.value.thresholdBytes).toBe(300_000_000);
    expect(result.value.swapUsedBytes).toBe(750_000);
  });
});
