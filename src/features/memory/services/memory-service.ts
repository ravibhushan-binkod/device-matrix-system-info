import { getMemoryInfo } from '@/core/native';
import type { MemoryInfo } from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import type { MemoryStats } from '@/features/memory/types';

/** Negative or nonsensical byte counts are treated as "not reported". */
function sanitizeBytes(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Turns ActivityManager's numbers into used/percent stats for the screen. */
export function toMemoryStats(info: MemoryInfo): Result<MemoryStats> {
  if (!(info.totalBytes > 0)) return unavailable('Android did not report the total RAM.');
  const availableBytes = Math.min(Math.max(0, info.availableBytes), info.totalBytes);
  const usedBytes = info.totalBytes - availableBytes;

  const swapTotalBytes = sanitizeBytes(info.swapTotalBytes);
  const swapFreeBytes = sanitizeBytes(info.swapFreeBytes);
  const swapUsedBytes =
    swapTotalBytes != null && swapFreeBytes != null
      ? Math.max(0, swapTotalBytes - Math.min(swapFreeBytes, swapTotalBytes))
      : null;

  return ok({
    totalBytes: info.totalBytes,
    availableBytes,
    usedBytes,
    usedPercent: (usedBytes / info.totalBytes) * 100,
    thresholdBytes: Math.max(0, info.thresholdBytes),
    lowMemory: info.lowMemory,
    swapTotalBytes,
    swapFreeBytes,
    swapUsedBytes,
  });
}

export function readMemoryStats(): Result<MemoryStats> {
  const result = getMemoryInfo();
  if (result.status === 'unavailable') return unavailable(result.reason);
  if (result.status === 'denied') return denied(result.permission);
  return toMemoryStats(result.value);
}
