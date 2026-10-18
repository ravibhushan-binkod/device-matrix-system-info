import * as IntentLauncher from 'expo-intent-launcher';

import { ok, unavailable, type Result } from '@/core/result';

export type SystemSettingsTarget = 'storage' | 'battery-saver' | 'battery-usage' | 'wifi' | 'alarm';

type TargetConfig = {
  /** System activities to try in order (normal Android intents only). */
  actions: readonly string[];
  /** Shown when none of the actions resolve on this device. */
  unavailableReason: string;
};

const TARGETS: Record<SystemSettingsTarget, TargetConfig> = {
  storage: {
    actions: ['android.settings.INTERNAL_STORAGE_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the storage settings.',
  },
  'battery-saver': {
    actions: ['android.settings.BATTERY_SAVER_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the battery saver settings.',
  },
  'battery-usage': {
    actions: ['android.intent.action.POWER_USAGE_SUMMARY', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the battery usage screen.',
  },
  wifi: {
    actions: ['android.settings.WIFI_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the Wi-Fi settings.',
  },
  alarm: {
    actions: ['android.intent.action.SET_ALARM', 'android.intent.action.SHOW_ALARMS'],
    unavailableReason: 'No clock app on this device handles alarms.',
  },
};

export type SystemSettingsLaunch = {
  /** The intent action that actually launched. */
  action: string;
};

/**
 * Opens a system settings screen — or the alarm clock — through a normal
 * Android intent. The specific action is tried first, then its fallbacks.
 * Never throws: when nothing resolves it returns `unavailable`. The promise
 * resolves when the user comes back to the app.
 */
export async function openSystemSettings(
  target: SystemSettingsTarget,
): Promise<Result<SystemSettingsLaunch>> {
  const config = TARGETS[target];
  for (const action of config.actions) {
    try {
      await IntentLauncher.startActivityAsync(action);
      return ok({ action });
    } catch {
      // Not available on this device — try the next fallback.
    }
  }
  return unavailable(config.unavailableReason);
}
