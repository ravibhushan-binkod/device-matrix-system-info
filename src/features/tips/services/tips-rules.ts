import { formatTimeout, formatUptime } from '@/core/utils/format-duration';
import { formatTemperature } from '@/core/utils/format-temperature';
import { batteryHealthLabel } from '@/features/battery/services/battery-stats';
import { brightnessPercent } from '@/features/display/services/display-service';
import { tipsConfig } from '@/features/tips/tips-config';
import type { Tip, TipSeverity, TipsInput } from '@/features/tips/types';

const MS_PER_DAY = 86_400_000;

const SEVERITY_ORDER: Record<TipSeverity, number> = {
  critical: 0,
  warning: 1,
  tip: 2,
};

/** Free-storage percentage clamped to 0–100; `null` when the read is unusable. */
export function storageFreePercent(
  totalBytes: number | null,
  freeBytes: number | null,
): number | null {
  if (totalBytes == null || freeBytes == null || !(totalBytes > 0)) return null;
  const free = Math.min(Math.max(0, freeBytes), totalBytes);
  return (free / totalBytes) * 100;
}

/** Used-memory percentage; `null` when the read is unusable. */
export function memoryUsedPercent(
  totalBytes: number | null,
  availableBytes: number | null,
): number | null {
  if (totalBytes == null || availableBytes == null || !(totalBytes > 0)) return null;
  const available = Math.min(Math.max(0, availableBytes), totalBytes);
  return ((totalBytes - available) / totalBytes) * 100;
}

/**
 * True when the date-only security patch string ("2026-09-05") is older than
 * `months`. `null` when the string cannot be read as a date — an unreadable
 * patch date never becomes a tip.
 */
export function isPatchOlderThanMonths(
  patch: string | null,
  months: number,
  now: Date,
): boolean | null {
  if (patch == null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(patch.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const patchDate = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    patchDate.getUTCFullYear() === year &&
    patchDate.getUTCMonth() === month - 1 &&
    patchDate.getUTCDate() === day;
  if (!isRealDate) return null;
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()),
  );
  return patchDate.getTime() < cutoff.getTime();
}

/** Whether a centre frequency is in the 2.4 GHz band. `null` when there is no reading. */
export function isWifi24Ghz(frequencyMhz: number | null): boolean | null {
  if (frequencyMhz == null || !(frequencyMhz > 0)) return null;
  return frequencyMhz >= 2400 && frequencyMhz < 2500;
}

type Rule = (input: TipsInput, now: Date) => Tip | null;

function storageRule(input: TipsInput): Tip | null {
  const free = storageFreePercent(input.storageTotalBytes, input.storageFreeBytes);
  if (free == null) return null;
  const percent = Math.floor(free);
  if (free < tipsConfig.storage.criticalFreePercent) {
    return {
      id: 'storage',
      severity: 'critical',
      title: 'Storage is almost full',
      body: `Only ${percent}% of the storage is free. Android needs room for updates, photos and app data.`,
      fix: 'storage-manager',
    };
  }
  if (free < tipsConfig.storage.warnFreePercent) {
    return {
      id: 'storage',
      severity: 'warning',
      title: 'Storage is filling up',
      body: `Only ${percent}% of the storage is free. Freeing some space keeps updates and apps working.`,
      fix: 'storage-manager',
    };
  }
  return null;
}

function memoryRule(input: TipsInput): Tip | null {
  const used = memoryUsedPercent(input.memoryTotalBytes, input.memoryAvailableBytes);
  if (used != null && used > tipsConfig.memory.usedPercent) {
    return {
      id: 'memory',
      severity: 'warning',
      title: 'Memory is nearly full',
      body: `RAM is ${Math.round(used)}% in use. Closing apps you are done with frees memory until the next restart.`,
      fix: null,
    };
  }
  if (input.memoryLow === true) {
    return {
      id: 'memory',
      severity: 'warning',
      title: 'Memory is low right now',
      body: 'Android reports that free memory is low. Restarting the phone frees memory until apps fill it again.',
      fix: null,
    };
  }
  return null;
}

function uptimeRule(input: TipsInput): Tip | null {
  const uptime = input.uptimeMillis;
  if (uptime == null || uptime <= tipsConfig.uptime.days * MS_PER_DAY) return null;
  return {
    id: 'uptime',
    severity: 'tip',
    title: 'Long time since the last restart',
    body: `The phone has been running for ${formatUptime(uptime)}. A restart clears temporary issues.`,
    fix: null,
  };
}

function batteryTemperatureRule(input: TipsInput): Tip | null {
  const temperature = input.batteryTemperatureC;
  if (temperature == null || temperature <= tipsConfig.battery.temperatureC) return null;
  return {
    id: 'battery-temperature',
    severity: 'warning',
    title: 'Battery is warm',
    body: `The battery is at ${formatTemperature(temperature, 'C', 1)}. Charging and heavy use add heat — a short break helps it cool down.`,
    fix: null,
  };
}

function batteryHealthRule(input: TipsInput): Tip | null {
  const health = input.batteryHealth;
  if (health == null || health === 'good' || health === 'unknown') return null;
  const label = batteryHealthLabel(health) ?? health;
  return {
    id: 'battery-health',
    severity: 'critical',
    title: 'Battery health is not good',
    body: `Android reports the battery health as "${label}".`,
    fix: null,
  };
}

function batteryLowRule(input: TipsInput): Tip | null {
  const percent = input.batteryPercent;
  if (percent == null || input.batterySaverOn !== false) return null;
  if (percent >= tipsConfig.battery.lowPercent) return null;
  return {
    id: 'battery-low',
    severity: 'warning',
    title: 'Battery low and Battery Saver is off',
    body: `The battery is at ${Math.round(percent)}%. Battery Saver limits background work to stretch the remaining charge.`,
    fix: 'battery-saver',
  };
}

function refreshRateRule(input: TipsInput): Tip | null {
  const hz = input.refreshRateHz;
  if (hz == null || hz < tipsConfig.display.refreshRateHz) return null;
  return {
    id: 'display-refresh-rate',
    severity: 'tip',
    title: 'The display runs at a high refresh rate',
    body: `The screen is running at ${Math.round(hz)} Hz. A lower rate in Display settings saves battery.`,
    fix: 'display',
  };
}

function screenTimeoutRule(input: TipsInput): Tip | null {
  const timeout = input.screenTimeoutMs;
  if (timeout == null || timeout <= tipsConfig.display.screenTimeoutMs) return null;
  return {
    id: 'display-timeout',
    severity: 'tip',
    title: 'The screen stays on longer than a minute',
    body: `The screen turns off after ${formatTimeout(timeout)}. A shorter timeout in Display settings saves battery.`,
    fix: 'display',
  };
}

function brightnessRule(input: TipsInput): Tip | null {
  if (input.brightnessMode !== 'manual') return null;
  const percent = brightnessPercent(input.brightness);
  if (percent == null || percent < tipsConfig.display.brightnessPercent) return null;
  return {
    id: 'display-brightness',
    severity: 'tip',
    title: 'Brightness is high without Adaptive Brightness',
    body: `Manual brightness is at about ${percent}%. Adaptive Brightness follows the light around you and saves battery.`,
    fix: 'display',
  };
}

function animationScaleRule(input: TipsInput): Tip | null {
  const scale = input.animationScale;
  if (scale == null || scale <= tipsConfig.developer.animationScale) return null;
  const rounded = Math.round(scale * 100) / 100;
  return {
    id: 'developer-animation',
    severity: 'tip',
    title: 'Animations are slower than 1×',
    body: `Animation scale is ${rounded}×, so every transition takes longer. The default is 1×.`,
    fix: 'developer-options',
  };
}

function usbDebuggingRule(input: TipsInput): Tip | null {
  if (input.usbDebugging !== true) return null;
  return {
    id: 'developer-usb',
    severity: 'warning',
    title: 'USB debugging is on',
    body: 'USB debugging lets a connected computer control this phone. Turn it off when you are not using it.',
    fix: 'developer-options',
  };
}

function wifiBandRule(input: TipsInput): Tip | null {
  if (input.wifiConnected !== true) return null;
  if (isWifi24Ghz(input.wifiFrequencyMhz) !== true) return null;
  if (input.wifiFiveGhzSupported !== true) return null;
  return {
    id: 'wifi-band',
    severity: 'tip',
    title: 'Wi-Fi is on the 2.4 GHz band',
    body: 'This phone supports 5 GHz, which is usually faster near the router. The band is chosen by the router, not by the phone.',
    fix: null,
  };
}

function wifiSignalRule(input: TipsInput): Tip | null {
  if (input.wifiConnected !== true) return null;
  const rssi = input.wifiRssiDbm;
  if (rssi == null || rssi >= tipsConfig.wifi.weakRssiDbm) return null;
  return {
    id: 'wifi-signal',
    severity: 'warning',
    title: 'Weak Wi-Fi signal',
    body: `Wi-Fi signal is ${rssi} dBm. Moving closer to the router usually helps.`,
    fix: null,
  };
}

function securityPatchRule(input: TipsInput, now: Date): Tip | null {
  const old = isPatchOlderThanMonths(input.securityPatch, tipsConfig.security.patchMonths, now);
  if (old !== true) return null;
  return {
    id: 'security-patch',
    severity: 'warning',
    title: 'Security patch is over a year old',
    body: `The last security patch was ${input.securityPatch}, more than ${tipsConfig.security.patchMonths} months ago. Check for system updates.`,
    fix: 'system-update',
  };
}

const RULES: readonly Rule[] = [
  storageRule,
  memoryRule,
  uptimeRule,
  batteryTemperatureRule,
  batteryHealthRule,
  batteryLowRule,
  refreshRateRule,
  screenTimeoutRule,
  brightnessRule,
  animationScaleRule,
  usbDebuggingRule,
  wifiBandRule,
  wifiSignalRule,
  securityPatchRule,
];

/**
 * Runs every rule against one reading pass. The result is severity-sorted
 * (critical → warning → tip, stable within a severity), so the first item is
 * the top tip. Readings Android did not provide simply skip their rule.
 */
export function evaluateTips(input: TipsInput, now: Date = new Date()): Tip[] {
  const tips: Tip[] = [];
  for (const rule of RULES) {
    const tip = rule(input, now);
    if (tip) tips.push(tip);
  }
  return tips.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** How many readings in the pass are `null` (i.e. Android did not report them). */
export function countMissingReadings(input: TipsInput): number {
  return Object.values(input).filter((value) => value == null).length;
}
