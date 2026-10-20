import {
  getBatteryInfo,
  getDeveloperSettings,
  getDeviceBuildInfo,
  getDisplayInfo,
  getMemoryInfo,
  getStorageInfo,
  getUptime,
  getWifiInfo,
} from '@/core/native';
import { countMissingReadings, evaluateTips } from '@/features/tips/services/tips-rules';
import type { TipsInput, TipsReport } from '@/features/tips/types';

/**
 * One reading pass for the tips engine. Every source is guarded on its own:
 * a blocked read becomes `null` (its rule is skipped) and never hides the
 * other readings or turns into a guessed value.
 */
export function readTipsInput(): TipsInput {
  const storage = getStorageInfo();
  const memory = getMemoryInfo();
  const uptime = getUptime();
  const battery = getBatteryInfo();
  const display = getDisplayInfo();
  const developer = getDeveloperSettings();
  const wifi = getWifiInfo();
  const build = getDeviceBuildInfo();

  return {
    storageTotalBytes:
      storage.status === 'ok' ? (storage.value.internal?.totalBytes ?? null) : null,
    storageFreeBytes: storage.status === 'ok' ? (storage.value.internal?.freeBytes ?? null) : null,
    memoryTotalBytes: memory.status === 'ok' ? memory.value.totalBytes : null,
    memoryAvailableBytes: memory.status === 'ok' ? memory.value.availableBytes : null,
    memoryLow: memory.status === 'ok' ? memory.value.lowMemory : null,
    uptimeMillis: uptime.status === 'ok' ? uptime.value.uptimeMillis : null,
    batteryPercent: battery.status === 'ok' ? battery.value.percent : null,
    batteryTemperatureC: battery.status === 'ok' ? battery.value.temperatureC : null,
    batteryHealth: battery.status === 'ok' ? battery.value.health : null,
    batterySaverOn: battery.status === 'ok' ? battery.value.powerSave : null,
    refreshRateHz: display.status === 'ok' ? display.value.refreshRateHz : null,
    screenTimeoutMs: display.status === 'ok' ? display.value.screenTimeoutMs : null,
    brightness: display.status === 'ok' ? display.value.brightness : null,
    brightnessMode: display.status === 'ok' ? display.value.brightnessMode : null,
    developerOptions: developer.status === 'ok' ? developer.value.developerOptions : null,
    usbDebugging: developer.status === 'ok' ? developer.value.usbDebugging : null,
    animationScale: developer.status === 'ok' ? developer.value.animationScale : null,
    wifiConnected: wifi.status === 'ok' ? wifi.value.connected : null,
    wifiFrequencyMhz: wifi.status === 'ok' ? wifi.value.frequencyMhz : null,
    wifiRssiDbm: wifi.status === 'ok' ? wifi.value.rssiDbm : null,
    wifiFiveGhzSupported: wifi.status === 'ok' ? wifi.value.fiveGhzSupported : null,
    securityPatch: build.status === 'ok' ? build.value.securityPatch : null,
  };
}

/** Reads the device once and runs every rule against that pass. */
export function runCheckUp(now: Date = new Date()): TipsReport {
  const input = readTipsInput();
  return {
    tips: evaluateTips(input, now),
    checkedAt: now.getTime(),
    missingReadings: countMissingReadings(input),
  };
}
