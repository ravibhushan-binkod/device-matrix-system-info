import * as IntentLauncher from 'expo-intent-launcher';

import { ok, unavailable, type Result } from '@/core/result';

export type SystemSettingsTarget =
  | 'storage'
  | 'storage-manager'
  | 'display'
  | 'battery-saver'
  | 'battery-usage'
  | 'wifi'
  | 'internet-panel'
  | 'bluetooth'
  | 'mobile-data'
  | 'nfc'
  | 'airplane'
  | 'alarm'
  | 'show-alarms'
  | 'developer-options'
  | 'system-update';

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
  'storage-manager': {
    // The system storage manager with its "free up space" / cached-data dialog.
    actions: [
      'android.os.storage.action.MANAGE_STORAGE',
      'android.settings.INTERNAL_STORAGE_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the storage manager.',
  },
  display: {
    actions: ['android.settings.DISPLAY_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the display settings.',
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
  'internet-panel': {
    // The Android 10+ quick panel that can actually switch Wi-Fi, with the
    // Wi-Fi settings screen as the fallback on older or stripped-down builds.
    actions: [
      'android.settings.panel.action.INTERNET_CONNECTIVITY',
      'android.settings.WIFI_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the internet panel.',
  },
  bluetooth: {
    actions: ['android.settings.BLUETOOTH_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the Bluetooth settings.',
  },
  'mobile-data': {
    actions: [
      'android.settings.DATA_USAGE_SETTINGS',
      'android.settings.WIRELESS_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the mobile data settings.',
  },
  nfc: {
    actions: [
      'android.settings.NFC_SETTINGS',
      'android.settings.WIRELESS_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the NFC settings.',
  },
  airplane: {
    actions: [
      'android.settings.AIRPLANE_MODE_SETTINGS',
      'android.settings.WIRELESS_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the airplane mode settings.',
  },
  alarm: {
    actions: ['android.intent.action.SET_ALARM', 'android.intent.action.SHOW_ALARMS'],
    unavailableReason: 'No clock app on this device handles alarms.',
  },
  'show-alarms': {
    actions: ['android.intent.action.SHOW_ALARMS'],
    unavailableReason: 'No clock app on this device shows alarms.',
  },
  'developer-options': {
    actions: ['android.settings.APPLICATION_DEVELOPMENT_SETTINGS', 'android.settings.SETTINGS'],
    unavailableReason: 'No app on this device can open the developer options.',
  },
  'system-update': {
    actions: [
      'android.settings.SYSTEM_UPDATE_SETTINGS',
      'android.settings.DEVICE_INFO_SETTINGS',
      'android.settings.SETTINGS',
    ],
    unavailableReason: 'No app on this device can open the system update screen.',
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
