/**
 * Types for the dashboard (Home) feature. Readings use the shared `Result<T>`
 * model from `@/core/result` — anything Android does not expose comes back as
 * `unavailable`, never as a made-up number.
 */
import type {
  BatteryHealth,
  BatteryStatus,
  DeviceIdentity,
  ThermalStatusName,
} from '@/core/native';
import type { Result } from '@/core/result';

export type UsageOverview = {
  usedBytes: number;
  totalBytes: number;
  /** Used fraction × 100 (0..100) — what the rings show. */
  percent: number;
};

export type CpuOverview = {
  /** Marketing chipset name, or `Build.HARDWARE` when that is all Android gives. */
  chipset: string | null;
  cores: number;
  /** Average of the current per-core clocks; `null` when the kernel hides them. */
  averageMhz: number | null;
  /** Highest scaling clock reported by any core; `null` when hidden. */
  maxMhz: number | null;
  /** Current clocks, core order, MHz; empty when the kernel hides them. */
  liveCoresMhz: number[];
  /** Highest current clock in MHz; `null` when hidden. */
  peakMhz: number | null;
};

export type BatteryOverview = {
  /** Battery level as a percentage; `null` when Android sends no scale. */
  percent: number | null;
  charging: boolean;
  /** True when a charger is connected, even if the battery is not charging yet. */
  plugged: boolean;
  /** Instantaneous power in watts when Android reports both current and voltage. */
  watts: number | null;
  temperatureC: number | null;
  health: BatteryHealth;
  status: BatteryStatus;
};

export type ThermalOverview = {
  status: ThermalStatusName | null;
  /** e.g. "Normal", "Moderate"; `null` when Android does not report a status. */
  statusLabel: string | null;
  /** 0–100 thermal load derived from the headroom; `null` when unavailable. */
  loadPercent: number | null;
  /** 0–100 headroom Android forecasts; `null` below Android 11. */
  headroomPercent: number | null;
  temperatureC: number | null;
};

export type DisplayOverview = {
  /** e.g. "1080 × 2400 px". */
  resolution: string | null;
  refreshRateHz: number | null;
  diagonalInches: number | null;
};

export type NetworkOverview = {
  connected: boolean;
  /** "Wi-Fi", "Mobile", "Ethernet", "Offline". */
  typeLabel: string;
  /** Wi-Fi SSID or mobile operator; `null` when Android redacts it. */
  name: string | null;
  /** Extra honest context, e.g. "Name hidden by Android". */
  detail: string | null;
  linkSpeedMbps: number | null;
  /** 0–4 filled bars when Wi-Fi RSSI is readable. */
  signalBars: number | null;
  signalLabel: string | null;
};

export type ConnectivityState = 'on' | 'off' | 'permission' | 'unavailable' | 'unknown';

export type ConnectivityOverview = {
  bluetooth: ConnectivityState;
  nfc: ConnectivityState;
  /** UWB is a capability, not a toggle we can read. */
  uwb: 'supported' | 'unavailable' | 'unknown';
};

export type DeviceFacts = {
  /** `Build.TIME` in epoch milliseconds. */
  buildDateMillis: number | null;
  /** e.g. "20 Oct 2026". */
  buildDateLabel: string | null;
  securityPatch: string | null;
  firstApiLevel: number | null;
  estimatedAgeYears: number | null;
  /** e.g. "~2 years". */
  estimatedAgeLabel: string | null;
};

export type HealthCheckId = 'security' | 'storage' | 'memory' | 'battery' | 'thermal';
export type HealthCheckState = 'good' | 'warning' | 'critical' | 'unavailable';

export type HealthCheck = {
  id: HealthCheckId;
  label: string;
  weight: number;
  earned: number;
  available: boolean;
  state: HealthCheckState;
};

export type HealthScore = {
  /** 0–100; `null` when no source could be read. */
  score: number | null;
  /** How many checks contributed. */
  availableChecks: number;
  totalChecks: number;
  checks: HealthCheck[];
};

export type SensorsOverview = {
  count: number;
  /** `Sensor.TYPE_ACCELEROMETER` when present. */
  accelerometerType: number | null;
};

export type CameraOverview = {
  lensCount: number;
  back: number;
  front: number;
  withFlash: number;
};

export type DashboardInventory = {
  sensors: Result<SensorsOverview>;
  cameras: Result<CameraOverview>;
  uwb: ConnectivityOverview['uwb'];
};

export type DashboardSummary = {
  identity: Result<DeviceIdentity>;
  /** Formatted uptime, e.g. "15d 14h 26m". */
  uptime: Result<string>;
  memory: Result<UsageOverview>;
  storage: Result<UsageOverview>;
  battery: Result<BatteryOverview>;
  cpu: Result<CpuOverview>;
  thermal: Result<ThermalOverview>;
  display: Result<DisplayOverview>;
  network: Result<NetworkOverview>;
  connectivity: Result<ConnectivityOverview>;
  facts: Result<DeviceFacts>;
  health: HealthScore;
  /** Epoch milliseconds of this read. */
  generatedAt: number;
};

/** One app row in the "Most used today" card. */
export type TodayApp = {
  packageName: string;
  label: string;
  totalTimeMs: number;
};

export type TodayUsage = {
  /** False when Usage Access has not been granted. */
  granted: boolean;
  apps: TodayApp[];
  /** Total foreground time across all apps today. */
  totalTimeMs: number | null;
  /** Why the list is empty; `null` when the read succeeded. */
  reason: string | null;
};
