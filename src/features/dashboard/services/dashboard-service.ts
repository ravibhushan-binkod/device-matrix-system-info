import {
  getBatteryInfo,
  getDeviceIdentity,
  getMemoryInfo,
  getStorageInfo,
  getUptime,
} from '@/core/native';
import type { BatteryReading, MemoryInfo, StorageInfo, UptimeInfo } from '@/core/native';
import { ok, unavailable, type Result } from '@/core/result';
import { formatUptime } from '@/core/utils/format-duration';
import type { AppColors } from '@/design-system/tokens';
import type { BatteryOverview, DashboardSummary, UsageOverview } from '@/features/dashboard/types';

function usage(usedBytes: number, totalBytes: number): UsageOverview {
  return { usedBytes, totalBytes, percent: (usedBytes / totalBytes) * 100 };
}

function toUptime(result: Result<UptimeInfo>): Result<string> {
  if (result.status !== 'ok') return result;
  return ok(formatUptime(result.value.uptimeMillis));
}

function toMemory(result: Result<MemoryInfo>): Result<UsageOverview> {
  if (result.status !== 'ok') return result;
  const { totalBytes, availableBytes } = result.value;
  if (!(totalBytes > 0)) return unavailable('Android did not return the total memory.');
  return ok(usage(totalBytes - availableBytes, totalBytes));
}

function toStorage(result: Result<StorageInfo>): Result<UsageOverview> {
  if (result.status !== 'ok') return result;
  const internal = result.value.internal;
  if (!internal || !(internal.totalBytes > 0)) {
    return unavailable('Android did not return the internal storage size.');
  }
  return ok(usage(internal.totalBytes - internal.freeBytes, internal.totalBytes));
}

function toBattery(result: Result<BatteryReading>): Result<BatteryOverview> {
  if (result.status !== 'ok') return result;
  const { percent, status, plugged } = result.value;
  return ok({
    percent,
    charging: status === 'charging',
    plugged: plugged === 'ac' || plugged === 'usb' || plugged === 'wireless' || plugged === 'dock',
  });
}

/** The whole dashboard in one synchronous read; every section is independent. */
export function readDashboardSummary(): DashboardSummary {
  return {
    identity: getDeviceIdentity(),
    uptime: toUptime(getUptime()),
    memory: toMemory(getMemoryInfo()),
    storage: toStorage(getStorageInfo()),
    battery: toBattery(getBatteryInfo()),
  };
}

/**
 * Ring colour for the battery — inverted thresholds, because a low battery is
 * the bad case (unlike memory/storage, where high usage is bad). Charging
 * always reads good.
 */
export function batteryRingColor(percent: number, charging: boolean, colors: AppColors): string {
  if (charging) return colors.good;
  if (percent <= 15) return colors.critical;
  if (percent <= 30) return colors.warning;
  return colors.good;
}
