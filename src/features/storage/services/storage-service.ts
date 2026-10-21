import { getStorageInfo } from '@/core/native';
import type { AppStorageStats, StorageInfo } from '@/core/native';
import { denied, ok, unavailable, type Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import type { StorageBreakdown, StorageOverview, StorageVolumeRow } from '@/features/storage/types';

export function readStorage(): Result<StorageInfo> {
  return getStorageInfo();
}

/** Internal-volume usage in used bytes and percent. */
export function toStorageOverview(info: StorageInfo): Result<StorageOverview> {
  const internal = info.internal;
  if (!internal || !(internal.totalBytes > 0)) {
    return unavailable('Android did not report the internal storage size.');
  }
  const freeBytes = Math.min(Math.max(0, internal.freeBytes), internal.totalBytes);
  const usedBytes = internal.totalBytes - freeBytes;
  return ok({
    usedBytes,
    totalBytes: internal.totalBytes,
    percent: (usedBytes / internal.totalBytes) * 100,
    fsType: internal.fsType,
  });
}

export function readStorageOverview(): Result<StorageOverview> {
  const result = getStorageInfo();
  if (result.status === 'unavailable') return unavailable(result.reason);
  if (result.status === 'denied') return denied(result.permission);
  return toStorageOverview(result.value);
}

/** One row per volume Android reports; mount states are shown raw, never guessed. */
export function buildVolumeRows(info: StorageInfo): StorageVolumeRow[] {
  return info.volumes.map((volume, index) => {
    const label =
      volume.description ?? (volume.isRemovable ? 'Removable storage' : 'Internal storage');

    let value: string | null = null;
    if (volume.totalBytes != null && volume.freeBytes != null && volume.totalBytes > 0) {
      value = `${formatByteSize(volume.freeBytes)} free of ${formatByteSize(volume.totalBytes)}`;
      if (volume.state !== 'mounted') value = `${value} · ${volume.state}`;
    } else if (volume.state !== '' && volume.state !== 'mounted') {
      value = volume.state;
    }
    if (volume.fsType) value = value == null ? volume.fsType : `${value} · ${volume.fsType}`;

    return {
      key: volume.uuid ?? `${label}-${index}`,
      label,
      value,
      removable: volume.isRemovable,
    };
  });
}

/**
 * Sum of what Android reports per app: code + data. The cache is *inside*
 * the data bytes (per the StorageStats docs), so it is never added again.
 */
export function sumAppBytes(stats: AppStorageStats[]): number {
  let total = 0;
  for (const entry of stats) {
    total += Math.max(0, entry.appBytes) + Math.max(0, entry.dataBytes);
  }
  return total;
}

/**
 * apps / other / free split. `null` when the inputs cannot produce an honest
 * answer (no total, no app figure). App bytes are clamped into the used space
 * so a rounding difference can never push "other" below zero.
 */
export function buildStorageBreakdown(
  totalBytes: number,
  freeBytes: number,
  appsBytes: number | null,
): StorageBreakdown | null {
  if (!(totalBytes > 0)) return null;
  if (appsBytes == null || !Number.isFinite(appsBytes) || appsBytes < 0) return null;
  const free = Math.min(Math.max(0, freeBytes), totalBytes);
  const used = totalBytes - free;
  const apps = Math.min(appsBytes, used);
  return {
    appsBytes: apps,
    freeBytes: free,
    otherBytes: used - apps,
    totalBytes,
  };
}
