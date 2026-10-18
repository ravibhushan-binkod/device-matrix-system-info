import { getMemoryInfo } from '@/core/native';
import { ok, unavailable } from '@/core/result';
import { readMemoryStats, toMemoryStats } from '@/features/memory/services/memory-service';

jest.mock('@/core/native', () => ({
  getMemoryInfo: jest.fn(),
}));

const memoryMock = jest.mocked(getMemoryInfo);

describe('toMemoryStats', () => {
  it('derives used bytes and percent', () => {
    const result = toMemoryStats({
      totalBytes: 8_000_000_000,
      availableBytes: 2_000_000_000,
      thresholdBytes: 300_000_000,
      lowMemory: false,
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedBytes).toBe(6_000_000_000);
    expect(result.value.usedPercent).toBe(75);
    expect(result.value.lowMemory).toBe(false);
  });

  it('clamps a nonsensical available value into the total', () => {
    const result = toMemoryStats({
      totalBytes: 8_000_000_000,
      availableBytes: 9_000_000_000,
      thresholdBytes: 300_000_000,
      lowMemory: false,
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.availableBytes).toBe(8_000_000_000);
    expect(result.value.usedBytes).toBe(0);
  });

  it('reports unavailable when the total is missing', () => {
    const result = toMemoryStats({
      totalBytes: 0,
      availableBytes: 0,
      thresholdBytes: 0,
      lowMemory: false,
    });
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
      ok({
        totalBytes: 8_000_000_000,
        availableBytes: 2_000_000_000,
        thresholdBytes: 300_000_000,
        lowMemory: false,
      }),
    );
    const result = readMemoryStats();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.value.usedPercent).toBe(75);
    expect(result.value.thresholdBytes).toBe(300_000_000);
  });
});
