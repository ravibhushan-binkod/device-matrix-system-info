import type { BatteryHealth } from '@/core/native';
import type { SystemSettingsTarget } from '@/core/system-settings';

/** Severity drives the sort order on the Tips screen and the card colours. */
export type TipSeverity = 'critical' | 'warning' | 'tip';

export type TipId =
  | 'storage'
  | 'memory'
  | 'uptime'
  | 'battery-temperature'
  | 'battery-health'
  | 'battery-low'
  | 'display-refresh-rate'
  | 'display-timeout'
  | 'display-brightness'
  | 'developer-animation'
  | 'developer-usb'
  | 'wifi-band'
  | 'wifi-signal'
  | 'security-patch';

export type Tip = {
  id: TipId;
  severity: TipSeverity;
  /** Short headline, e.g. "Storage is almost full". */
  title: string;
  /** One sentence with the measured value in it — nothing is guessed. */
  body: string;
  /** The system screen the "Fix it" button opens; `null` when nothing can be opened. */
  fix: SystemSettingsTarget | null;
};

/** Everything the rules read — `null` means Android did not report the value. */
export type TipsInput = {
  storageTotalBytes: number | null;
  storageFreeBytes: number | null;
  memoryTotalBytes: number | null;
  memoryAvailableBytes: number | null;
  memoryLow: boolean | null;
  uptimeMillis: number | null;
  batteryPercent: number | null;
  batteryTemperatureC: number | null;
  batteryHealth: BatteryHealth | null;
  batterySaverOn: boolean | null;
  refreshRateHz: number | null;
  screenTimeoutMs: number | null;
  brightness: number | null;
  brightnessMode: 'auto' | 'manual' | null;
  developerOptions: boolean | null;
  usbDebugging: boolean | null;
  animationScale: number | null;
  wifiConnected: boolean | null;
  wifiFrequencyMhz: number | null;
  wifiRssiDbm: number | null;
  wifiFiveGhzSupported: boolean | null;
  securityPatch: string | null;
};

export type TipsReport = {
  /** Severity-sorted; the first one is the top tip shown on Home. */
  tips: Tip[];
  /** Epoch milliseconds of the run. */
  checkedAt: number;
  /** How many readings Android did not provide in this run — those checks were skipped. */
  missingReadings: number;
};
