/**
 * Types for the dashboard (Home) feature. Readings use the shared `Result<T>`
 * model from `@/core/result` — anything Android does not expose comes back as
 * `unavailable`, never as a made-up number.
 */
import type { DeviceIdentity } from '@/core/native';
import type { Result } from '@/core/result';

export type UsageOverview = {
  usedBytes: number;
  totalBytes: number;
  /** Used fraction × 100 (0..100) — what the rings show. */
  percent: number;
};

export type BatteryOverview = {
  /** Battery level as a percentage; `null` when Android sends no scale. */
  percent: number | null;
  charging: boolean;
  /** True when a charger is connected, even if the battery is not charging yet. */
  plugged: boolean;
};

export type DashboardSummary = {
  identity: Result<DeviceIdentity>;
  /** Formatted uptime, e.g. "15d 14h 26m". */
  uptime: Result<string>;
  memory: Result<UsageOverview>;
  storage: Result<UsageOverview>;
  battery: Result<BatteryOverview>;
};
