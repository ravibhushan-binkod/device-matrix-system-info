import {
  getAppOverview,
  getBatteryInfo,
  getBluetoothInfo,
  getBuildInfo,
  getCameraInfo,
  getConnectivityCapabilities,
  getConnectivityInfo,
  getCpuInfo,
  getDeviceIdentity,
  getDisplayInfo,
  getMemoryInfo,
  getNfcInfo,
  getScreenTime,
  getSensors,
  getStorageInfo,
  getThermalStatus,
  getUptime,
  getWifiInfo,
  hasUsageAccess,
  type BatteryReading,
  type BluetoothInfo,
  type CameraInfo,
  type CpuInfo,
  type DisplayInfo,
  type MemoryInfo,
  type NfcInfo,
  type StorageInfo,
  type ThermalStatus,
  type UptimeInfo,
  type WifiInfo,
} from '@/core/native';
import { failureMessage, ok, unavailable, type Result } from '@/core/result';
import { chipsetLabel } from '@/core/utils/chipset';
import { formatUptime } from '@/core/utils/format-duration';
import { thermalStatusLabel } from '@/core/utils/thermal-status';
import type { AppColors } from '@/design-system/tokens';
import { clamp01 } from '@/design-system/status';
import { diagonalInches, formatResolution } from '@/features/display/services/display-service';
import { buildDeviceFacts } from '@/features/dashboard/services/device-facts';
import { computeHealthScore } from '@/features/dashboard/services/health-score';
import type {
  BatteryOverview,
  CameraOverview,
  ConnectivityOverview,
  ConnectivityState,
  CpuOverview,
  DashboardInventory,
  DashboardSummary,
  DisplayOverview,
  NetworkOverview,
  SensorsOverview,
  ThermalOverview,
  TodayUsage,
  UsageOverview,
} from '@/features/dashboard/types';

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

function toCpu(result: Result<CpuInfo>): Result<CpuOverview> {
  if (result.status !== 'ok') return result;
  const { frequencies, cores } = result.value;

  const live = frequencies
    .map((entry) => entry.currentKhz)
    .filter((khz): khz is number => khz != null && Number.isFinite(khz) && khz > 0)
    .map((khz) => khz / 1000);
  const averages = frequencies
    .map((entry) => entry.currentKhz)
    .filter((khz): khz is number => khz != null && Number.isFinite(khz) && khz > 0);
  const caps = frequencies
    .map((entry) => entry.maxKhz)
    .filter((khz): khz is number => khz != null && Number.isFinite(khz) && khz > 0);

  const averageMhz =
    averages.length > 0
      ? averages.reduce((sum, value) => sum + value, 0) / averages.length / 1000
      : null;
  const maxMhz =
    caps.length > 0 ? Math.max(...caps) / 1000 : live.length > 0 ? Math.max(...live) : null;
  const peakMhz = live.length > 0 ? Math.max(...live) : null;

  return ok({
    chipset: chipsetLabel({
      socManufacturer: result.value.socManufacturer,
      socModel: result.value.socModel,
      hardware: result.value.hardware,
    }),
    cores,
    averageMhz,
    maxMhz,
    liveCoresMhz: live,
    peakMhz,
  });
}

function toBattery(result: Result<BatteryReading>): Result<BatteryOverview> {
  if (result.status !== 'ok') return result;
  const reading = result.value;
  const watts =
    reading.currentNowUa != null && reading.voltageMv != null && reading.voltageMv > 0
      ? Math.round(((Math.abs(reading.currentNowUa) * reading.voltageMv) / 1_000_000_000) * 10) / 10
      : null;
  return ok({
    percent: reading.percent,
    charging: reading.status === 'charging',
    plugged:
      reading.plugged === 'ac' ||
      reading.plugged === 'usb' ||
      reading.plugged === 'wireless' ||
      reading.plugged === 'dock',
    watts,
    temperatureC: reading.temperatureC,
    health: reading.health,
    status: reading.status,
  });
}

function toThermal(
  statusResult: Result<ThermalStatus>,
  battery: Result<BatteryOverview>,
): Result<ThermalOverview> {
  const temperatureC = battery.status === 'ok' ? battery.value.temperatureC : null;
  if (statusResult.status !== 'ok') {
    if (temperatureC == null) return statusResult;
    return ok({
      status: null,
      statusLabel: null,
      loadPercent: null,
      headroomPercent: null,
      temperatureC,
    });
  }
  const { status, headroom } = statusResult.value;
  const headroomPercent =
    headroom != null && Number.isFinite(headroom) ? Math.round(clamp01(headroom) * 100) : null;
  const loadPercent = headroomPercent == null ? null : 100 - headroomPercent;
  return ok({
    status,
    statusLabel: thermalStatusLabel(status),
    loadPercent,
    headroomPercent,
    temperatureC,
  });
}

function toDisplay(result: Result<DisplayInfo>): Result<DisplayOverview> {
  if (result.status !== 'ok') return result;
  const info = result.value;
  return ok({
    resolution: formatResolution(info.widthPx, info.heightPx),
    refreshRateHz: info.refreshRateHz,
    diagonalInches:
      info.widthPx != null && info.heightPx != null
        ? diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi)
        : null,
  });
}

const TYPE_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Mobile',
  ethernet: 'Ethernet',
  vpn: 'VPN',
  bluetooth: 'Bluetooth',
  usb: 'USB',
  other: 'Connected',
  none: 'Offline',
};

function wifiBars(rssiDbm: number | null): number | null {
  if (rssiDbm == null) return null;
  if (rssiDbm >= -55) return 4;
  if (rssiDbm >= -65) return 3;
  if (rssiDbm >= -75) return 2;
  if (rssiDbm >= -88) return 1;
  return 0;
}

function toNetwork(
  connectivity: Awaited<ReturnType<typeof getConnectivityInfo>>,
  wifi: Result<WifiInfo>,
): Result<NetworkOverview> {
  const wifiInfo = wifi.status === 'ok' ? wifi.value : null;
  const connected = connectivity.status === 'ok' ? connectivity.value.type !== 'none' : false;
  const type = connectivity.status === 'ok' ? connectivity.value.type : 'none';

  if (!connected && !(wifiInfo?.connected ?? false)) {
    if (connectivity.status !== 'ok' && wifi.status !== 'ok') return connectivity;
    return ok({
      connected: false,
      typeLabel: 'Offline',
      name: null,
      detail: connectivity.status === 'ok' ? 'No active network' : null,
      linkSpeedMbps: null,
      signalBars: null,
      signalLabel: null,
    });
  }

  if (wifiInfo?.connected) {
    const speed =
      wifiInfo.linkSpeedMbps ??
      (wifiInfo.txLinkSpeedMbps != null || wifiInfo.rxLinkSpeedMbps != null
        ? Math.max(wifiInfo.txLinkSpeedMbps ?? 0, wifiInfo.rxLinkSpeedMbps ?? 0)
        : null);
    return ok({
      connected: true,
      typeLabel: 'Wi-Fi',
      name: wifiInfo.ssid,
      detail: wifiInfo.ssid == null ? 'Name hidden by Android' : null,
      linkSpeedMbps: speed != null && speed > 0 ? speed : null,
      signalBars: wifiBars(wifiInfo.rssiDbm),
      signalLabel: wifiInfo.rssiDbm != null ? `${wifiInfo.rssiDbm} dBm` : null,
    });
  }

  if (type === 'wifi') {
    // Connectivity says Wi-Fi, but WifiManager did not confirm a link (this is
    // common when Android redacts Wi-Fi details). Never borrow the cellular
    // operator name for a Wi-Fi network.
    return ok({
      connected: true,
      typeLabel: 'Wi-Fi',
      name: null,
      detail: 'Wi-Fi details unavailable',
      linkSpeedMbps: null,
      signalBars: null,
      signalLabel: null,
    });
  }

  return ok({
    connected,
    typeLabel: TYPE_LABELS[type] ?? 'Connected',
    name: connectivity.status === 'ok' ? connectivity.value.operatorName : null,
    detail: connectivity.status === 'ok' && connectivity.value.vpnActive ? 'VPN active' : null,
    linkSpeedMbps: null,
    signalBars: null,
    signalLabel: null,
  });
}

function toggleState(result: Result<BluetoothInfo | NfcInfo>): ConnectivityState {
  if (result.status === 'denied') return 'permission';
  if (result.status !== 'ok') return 'unavailable';
  if (!result.value.present) return 'unavailable';
  if (result.value.enabled == null) return 'unknown';
  return result.value.enabled ? 'on' : 'off';
}

const CAPABILITIES_TTL_MS = 60_000;
let capabilitiesCache: {
  at: number;
  result: Awaited<ReturnType<typeof getConnectivityCapabilities>>;
} | null = null;

function readCapabilitiesCached(): Awaited<ReturnType<typeof getConnectivityCapabilities>> {
  const now = Date.now();
  if (capabilitiesCache != null && now - capabilitiesCache.at < CAPABILITIES_TTL_MS) {
    return capabilitiesCache.result;
  }
  const result = getConnectivityCapabilities();
  capabilitiesCache = { at: now, result };
  return result;
}

function uwbState(): ConnectivityOverview['uwb'] {
  const capabilities = readCapabilitiesCached();
  if (capabilities.status !== 'ok') return 'unknown';
  return capabilities.value.systemFeatures.includes('android.hardware.uwb')
    ? 'supported'
    : 'unavailable';
}

function toConnectivity(
  bluetooth: Result<BluetoothInfo>,
  nfc: Result<NfcInfo>,
): Result<ConnectivityOverview> {
  return ok({
    bluetooth: toggleState(bluetooth),
    nfc: toggleState(nfc),
    uwb: uwbState(),
  });
}

function toSensors(result: ReturnType<typeof getSensors>): DashboardInventory['sensors'] {
  if (result.status !== 'ok') return result;
  const sensors = result.value;
  const accelerometer = sensors.find(
    (sensor) =>
      sensor.stringType === 'android.sensor.accelerometer' ||
      sensor.name.toLowerCase().includes('accelerometer'),
  );
  const overview: SensorsOverview = {
    count: sensors.length,
    accelerometerType: accelerometer?.type ?? null,
  };
  return ok(overview);
}

function toCameras(result: Result<CameraInfo>): DashboardInventory['cameras'] {
  if (result.status !== 'ok') return result;
  const cameras = result.value.cameras;
  const overview: CameraOverview = {
    lensCount: cameras.length,
    back: cameras.filter((camera) => camera.facing === 'back').length,
    front: cameras.filter((camera) => camera.facing === 'front').length,
    withFlash: cameras.filter((camera) => camera.flash).length,
  };
  return ok(overview);
}

/** The whole dashboard in one synchronous read; every section is independent. */
export function readDashboardSummary(): DashboardSummary {
  const now = Date.now();
  const memoryResult = getMemoryInfo();
  const storageResult = getStorageInfo();
  const batteryResult = toBattery(getBatteryInfo());
  const thermalStatusResult = getThermalStatus();
  const buildResult = getBuildInfo();
  const connectivityResult = getConnectivityInfo();

  const memory = toMemory(memoryResult);
  const storage = toStorage(storageResult);
  const battery = batteryResult;
  const thermal = toThermal(thermalStatusResult, battery);

  const storageFreeRatio =
    storage.status === 'ok' && storage.value.totalBytes > 0
      ? 1 - storage.value.usedBytes / storage.value.totalBytes
      : null;
  const memoryUsedRatio =
    memory.status === 'ok' && memory.value.totalBytes > 0
      ? memory.value.usedBytes / memory.value.totalBytes
      : null;
  const health = computeHealthScore({
    storageFreeRatio,
    memoryUsedRatio,
    batteryHealth: battery.status === 'ok' ? battery.value.health : null,
    batteryTemperatureC: battery.status === 'ok' ? battery.value.temperatureC : null,
    thermalStatus: thermal.status === 'ok' ? thermal.value.status : null,
    thermalHeadroom:
      thermalStatusResult.status === 'ok' ? thermalStatusResult.value.headroom : null,
    securityPatch: buildResult.status === 'ok' ? buildResult.value.securityPatch : null,
    now,
  });

  return {
    identity: getDeviceIdentity(),
    uptime: toUptime(getUptime()),
    memory,
    storage,
    battery,
    cpu: toCpu(getCpuInfo()),
    thermal,
    display: toDisplay(getDisplayInfo()),
    network: toNetwork(connectivityResult, getWifiInfo()),
    connectivity: toConnectivity(getBluetoothInfo(), getNfcInfo()),
    facts: buildResult.status === 'ok' ? ok(buildDeviceFacts(buildResult.value, now)) : buildResult,
    health,
    generatedAt: now,
  };
}

/** Readings that change only when hardware does: sensor/camera counts and UWB. */
export function readDashboardInventory(): DashboardInventory {
  return {
    sensors: toSensors(getSensors()),
    cameras: toCameras(getCameraInfo()),
    uwb: uwbState(),
  };
}

/**
 * The most-used apps today, with foreground time. Usage Access is checked
 * first so the UI can show its "Enable to see" card without reading anything.
 */
export async function readTodayUsage(): Promise<TodayUsage> {
  const access = hasUsageAccess();
  if (access.status !== 'ok') {
    return { granted: false, apps: [], totalTimeMs: null, reason: failureMessage(access) };
  }
  if (!access.value) {
    return {
      granted: false,
      apps: [],
      totalTimeMs: null,
      reason: 'Usage Access is needed to see today’s app time.',
    };
  }

  const [screen, overview] = await Promise.all([getScreenTime(1), getAppOverview()]);
  if (screen.status !== 'ok') {
    return { granted: true, apps: [], totalTimeMs: null, reason: failureMessage(screen) };
  }

  const labels = new Map<string, string>();
  if (overview.status === 'ok') {
    for (const app of overview.value) labels.set(app.packageName, app.label);
  }

  const apps = screen.value.apps
    .filter((entry) => entry.totalTimeMs > 0)
    .flatMap((entry) => {
      const label = labels.get(entry.packageName);
      // Packages Android hides from us (launcher, permission controller) have
      // no label. Never show a raw package name as if it were an app name.
      return label == null
        ? []
        : [{ packageName: entry.packageName, label, totalTimeMs: entry.totalTimeMs }];
    })
    .sort((a, b) => b.totalTimeMs - a.totalTimeMs)
    .slice(0, 4);

  return {
    granted: true,
    apps,
    totalTimeMs: screen.value.totalTimeMs,
    reason: apps.length === 0 ? 'No foreground time recorded yet today.' : null,
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
