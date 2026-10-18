import { requireOptionalNativeModule } from 'expo';
import type BatteryExtModule from '@modules/battery-ext/src/BatteryExtModule';
import type { NativeBatteryInfo } from '@modules/battery-ext/src/BatteryExt.types';

import { ok, unavailable, type Result } from '@/core/result';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeBatteryExtModule = typeof BatteryExtModule;

export type BatteryStatus = 'charging' | 'discharging' | 'full' | 'not-charging' | 'unknown';
export type BatteryPlug = 'ac' | 'usb' | 'wireless' | 'dock' | 'none' | 'unknown';
export type BatteryHealth =
  'good' | 'overheat' | 'dead' | 'over-voltage' | 'failure' | 'cold' | 'unknown';

export type BatteryReading = {
  level: number;
  /** Level as a percentage; `null` when Android sends no scale. */
  percent: number | null;
  status: BatteryStatus;
  plugged: BatteryPlug;
  health: BatteryHealth;
  temperatureC: number | null;
  voltageMv: number | null;
  technology: string | null;
  /** Instantaneous current in µA; positive = charging, negative = discharging. */
  currentNowUa: number | null;
  /** Remaining charge in µAh; `null` when the device does not expose it. */
  chargeCounterUah: number | null;
  /** `null` when the device does not expose a cycle count. */
  cycleCount: number | null;
  powerSave: boolean;
};

export type BatterySubscription = {
  remove: () => void;
};

let cached: NativeBatteryExtModule | null | undefined;

function getModule(): NativeBatteryExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeBatteryExtModule>('BatteryExt');
  } catch {
    cached = null;
  }
  return cached;
}

const STATUSES = ['charging', 'discharging', 'full', 'not-charging', 'unknown'] as const;
const PLUGS = ['ac', 'usb', 'wireless', 'dock', 'none', 'unknown'] as const;
const HEALTHS = ['good', 'overheat', 'dead', 'over-voltage', 'failure', 'cold', 'unknown'] as const;

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function toReading(raw: NativeBatteryInfo): BatteryReading {
  return {
    level: raw.level,
    percent: raw.percent,
    status: pick(raw.status, STATUSES, 'unknown'),
    plugged: pick(raw.plugged, PLUGS, 'unknown'),
    health: pick(raw.health, HEALTHS, 'unknown'),
    temperatureC: raw.temperatureC,
    voltageMv: raw.voltageMv,
    technology: raw.technology,
    currentNowUa: raw.currentNowUa,
    chargeCounterUah: raw.chargeCounterUah,
    cycleCount: raw.cycleCount,
    powerSave: raw.powerSave,
  };
}

export function getBatteryInfo(): Result<BatteryReading> {
  const module = getModule();
  if (!module) return unavailable('The BatteryExt native module is not in this build.');
  try {
    const raw = module.getBatteryInfo();
    if (!raw) return unavailable('Android did not return battery information.');
    return ok(toReading(raw));
  } catch {
    return unavailable('Reading battery information failed.');
  }
}

/**
 * Live battery updates from ACTION_BATTERY_CHANGED. Returns a subscription
 * whose `remove()` unregisters the listener on both sides.
 */
export function subscribeToBattery(
  onReading: (reading: BatteryReading) => void,
): Result<BatterySubscription> {
  const module = getModule();
  if (!module) return unavailable('The BatteryExt native module is not in this build.');
  try {
    const subscription = module.addListener('onBatteryChanged', (raw) => onReading(toReading(raw)));
    const started = module.startBatteryListener();
    if (!started) {
      subscription.remove();
      return unavailable('The battery listener could not be registered.');
    }
    let removed = false;
    return ok({
      remove: () => {
        if (removed) return;
        removed = true;
        try {
          subscription.remove();
        } catch {
          // Subscription already gone.
        }
        try {
          module.stopBatteryListener();
        } catch {
          // Listener already stopped.
        }
      },
    });
  } catch {
    return unavailable('Subscribing to battery updates failed.');
  }
}
