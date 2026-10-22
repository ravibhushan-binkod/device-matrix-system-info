import * as Application from 'expo-application';

import {
  getBatteryInfo,
  getConnectivityInfo,
  getCpuInfo,
  getGpuInfo,
  getSensors,
  getStorageInfo,
  getWifiInfo,
} from '@/core/native';
import { chipsetLabel } from '@/core/utils/chipset';
import { formatByteSize } from '@/core/utils/format-bytes';
import { formatTimeout } from '@/core/utils/format-duration';
import { formatFrequencyKhz } from '@/core/utils/format-frequency';
import { formatTemperature } from '@/core/utils/format-temperature';
import { buildReportText, type ReportEntry, type ReportSection } from '@/core/utils/report-text';
import { batteryStatusLabel, buildBatteryStats } from '@/features/battery/services/battery-stats';
import { HARDWARE_TESTS } from '@/features/hardware-tests/services/test-catalog';
import {
  readTestResults,
  reportLine,
  summarizeResults,
} from '@/features/hardware-tests/services/results-service';
import { readDeviceInfo } from '@/features/device/services/device-service';
import {
  brightnessModeLabel,
  brightnessPercent,
  buildModeRows,
  cutoutLabel,
  diagonalInches,
  formatInches,
  formatRefreshRate,
  formatResolution,
  hdrLabel,
  readDisplay,
  wideGamutLabel,
} from '@/features/display/services/display-service';
import { readMemoryStats } from '@/features/memory/services/memory-service';
import { buildCameraEntries, readCameras } from '@/features/camera/services/camera-service';
import { buildCapabilityGroups } from '@/features/network/services/connectivity-service';
import {
  connectionTypeLabel,
  formatDnsServers,
  formatIp,
  formatLinkSpeed,
  formatSubnet,
  formatTxRxSpeeds,
  onOffLabel,
  privateDnsLabel,
  proxyLabel,
  readBluetooth,
  readConnectivityCapabilities,
  readNfc,
  roamingLabel,
  signalBarsFromDbm,
  signalSummary,
  vpnLabel,
  wifiBandAndChannelLabel,
  wifiChannelWidthLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';
import { buildVolumeRows, toStorageOverview } from '@/features/storage/services/storage-service';
import { readThermalInfo } from '@/features/thermal/services/thermal-service';
import {
  appsByDangerousPermissions,
  appsByInstaller,
  appsByTargetSdk,
  readAppOverview,
} from '@/features/apps/services/apps-service';
import type { ReportGroup, ReportGroupId } from '@/features/report/types';

export const REPORT_NAME = 'Device Matrix: System Info';

/** Honest wording used in both exports and the picker preview. */
export const REPORT_UNAVAILABLE_NOTE =
  '"Not available on this device" means Android did not report the value.';
export const REPORT_ESTIMATE_NOTE = 'Values marked ≈ are estimates.';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** A group Android could not read — honest, never a guessed value. */
function unavailableSection(title: string): ReportSection {
  return { title, entries: [{ label: 'Reading', value: null }] };
}

function percentLabel(value: number | null): string | null {
  return value === null ? null : `${Math.round(value)}%`;
}

function appCount(value: number): string {
  return value === 1 ? '1 app' : `${value} apps`;
}

function deviceSections(): ReportSection[] {
  const sections = readDeviceInfo().sections.filter(
    (section) => section.key === 'device' || section.key === 'kernel',
  );
  return sections.map((section) => ({
    title: section.title,
    entries: section.entries.map((entry) => ({ label: entry.label, value: entry.value })),
  }));
}

function systemSections(): ReportSection[] {
  const sections = readDeviceInfo().sections.filter(
    (section) => section.key === 'android' || section.key === 'system',
  );
  return sections.map((section) => ({
    title: section.title,
    entries: section.entries.map((entry) => ({ label: entry.label, value: entry.value })),
  }));
}

function batterySections(): ReportSection[] {
  const result = getBatteryInfo();
  if (result.status !== 'ok') return [unavailableSection('Battery')];
  const info = result.value;
  const entries: ReportEntry[] = [
    { label: 'Level', value: info.percent === null ? null : `${Math.round(info.percent)}%` },
    { label: 'Status', value: batteryStatusLabel(info.status) },
    ...buildBatteryStats(info).map((stat) => ({ label: stat.label, value: stat.value })),
    { label: 'Battery saver', value: info.powerSave ? 'On' : 'Off' },
  ];
  return [{ title: 'Battery', entries }];
}

function memorySections(): ReportSection[] {
  const result = readMemoryStats();
  if (result.status !== 'ok') return [unavailableSection('Memory')];
  const info = result.value;
  const entries: ReportEntry[] = [
    { label: 'Usage', value: `${Math.round(info.usedPercent)}%` },
    {
      label: 'Used RAM',
      value: `${formatByteSize(info.usedBytes)} of ${formatByteSize(info.totalBytes)}`,
    },
    { label: 'Available', value: formatByteSize(info.availableBytes) },
    { label: 'Low memory', value: info.lowMemory ? 'Yes' : 'No' },
  ];
  if (info.swapTotalBytes != null) {
    const used = info.swapUsedBytes == null ? null : formatByteSize(info.swapUsedBytes);
    entries.push({
      label: 'Swap',
      value:
        used == null
          ? formatByteSize(info.swapTotalBytes)
          : `${used} of ${formatByteSize(info.swapTotalBytes)}`,
    });
  }
  return [{ title: 'Memory', entries }];
}

function storageSections(): ReportSection[] {
  const result = getStorageInfo();
  if (result.status !== 'ok') return [unavailableSection('Storage')];
  const entries: ReportEntry[] = [];
  const overview = toStorageOverview(result.value);
  if (overview.status === 'ok') {
    entries.push({
      label: 'Internal used',
      value: `${Math.round(overview.value.percent)}% · ${formatByteSize(
        overview.value.usedBytes,
      )} of ${formatByteSize(overview.value.totalBytes)}`,
    });
    if (overview.value.fsType) {
      entries.push({ label: 'File system', value: overview.value.fsType });
    }
  }
  for (const row of buildVolumeRows(result.value)) {
    entries.push({ label: row.label, value: row.value });
  }
  return [
    {
      title: 'Storage',
      entries: entries.length > 0 ? entries : [{ label: 'Reading', value: null }],
    },
  ];
}

function brightnessEntry(brightness: number | null, mode: 'auto' | 'manual' | null): string | null {
  const percent = brightnessPercent(brightness);
  if (percent === null) return null;
  const modeLabel = brightnessModeLabel(mode);
  return modeLabel ? `${percent}% · ${modeLabel}` : `${percent}%`;
}

function displaySections(): ReportSection[] {
  const result = readDisplay();
  if (result.status !== 'ok') return [unavailableSection('Display')];
  const info = result.value;
  const entries: ReportEntry[] = [
    { label: 'Resolution', value: formatResolution(info.widthPx, info.heightPx) },
    {
      label: 'Diagonal',
      value: formatInches(diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi)),
    },
    { label: 'Density', value: `${info.densityDpi} dpi` },
    { label: 'Refresh rate', value: formatRefreshRate(info.refreshRateHz) },
    { label: 'HDR', value: hdrLabel(info.isHdr, info.hdrTypes) },
    { label: 'Colour gamut', value: wideGamutLabel(info.isWideColorGamut) },
    { label: 'Cutout', value: cutoutLabel(info.cutout) },
    {
      label: 'Screen timeout',
      value: info.screenTimeoutMs === null ? null : formatTimeout(info.screenTimeoutMs),
    },
    { label: 'Brightness', value: brightnessEntry(info.brightness, info.brightnessMode) },
  ];

  const modes = buildModeRows(info, 8);
  modes.rows.forEach((row, index) => {
    entries.push({ label: `Mode ${index + 1}`, value: row.label });
  });
  if (modes.hiddenCount > 0) {
    entries.push({ label: 'More modes', value: `+${modes.hiddenCount} more` });
  }

  return [{ title: 'Display', entries }];
}

function cpuSections(): ReportSection[] {
  const result = getCpuInfo();
  if (result.status !== 'ok') return [unavailableSection('CPU')];
  const info = result.value;
  const entries: ReportEntry[] = [
    { label: 'Chipset', value: chipsetLabel(info) },
    { label: 'CPU cores', value: String(info.cores) },
    { label: 'ABIs', value: info.abis.length > 0 ? info.abis.join(', ') : null },
  ];

  const maxKhz = info.frequencies.reduce(
    (max, frequency) => Math.max(max, frequency.maxKhz ?? 0),
    0,
  );
  if (maxKhz > 0) {
    entries.push({ label: 'Max frequency', value: formatFrequencyKhz(maxKhz) });
  }

  for (const core of info.frequencies) {
    const parts: string[] = [];
    if (core.currentKhz != null) parts.push(`now ${formatFrequencyKhz(core.currentKhz)}`);
    if (core.maxKhz != null) parts.push(`max ${formatFrequencyKhz(core.maxKhz)}`);
    if (core.governor) parts.push(core.governor);
    entries.push({
      label: `Core ${core.index}`,
      value: parts.length > 0 ? parts.join(' · ') : null,
    });
  }

  return [{ title: 'CPU', entries }];
}

function gpuSections(): ReportSection[] {
  const result = getGpuInfo();
  if (result.status !== 'ok') return [unavailableSection('GPU')];
  const info = result.value;
  return [
    {
      title: 'GPU',
      entries: [
        { label: 'Renderer', value: info.renderer },
        { label: 'Vendor', value: info.vendor },
        { label: 'OpenGL version', value: info.glVersion },
        { label: 'OpenGL ES', value: info.glEsVersion },
        { label: 'Vulkan', value: info.vulkanVersion },
        {
          label: 'Vulkan hardware level',
          value: info.vulkanLevel === null ? null : String(info.vulkanLevel),
        },
        {
          label: 'Vulkan compute',
          value: info.vulkanCompute === null ? null : info.vulkanCompute ? 'Yes' : 'No',
        },
      ],
    },
  ];
}

function thermalSections(): ReportSection[] {
  const result = readThermalInfo();
  if (result.status !== 'ok') return [unavailableSection('Thermal')];
  const info = result.value;
  return [
    {
      title: 'Thermal',
      entries: [
        { label: 'Status', value: info.statusLabel },
        { label: 'Thermal load', value: percentLabel(info.loadPercent) },
        { label: 'Headroom', value: percentLabel(info.headroomPercent) },
        {
          label: 'Battery temperature',
          value:
            info.batteryTemperatureC === null
              ? null
              : formatTemperature(info.batteryTemperatureC, 'C', 1),
        },
      ],
    },
  ];
}

function cameraSections(): ReportSection[] {
  const result = readCameras();
  if (result.status !== 'ok') return [unavailableSection('Camera')];
  const cameras = buildCameraEntries(result.value);
  if (cameras.length === 0) return [unavailableSection('Camera')];

  return cameras.map((camera) => {
    const entries: ReportEntry[] = [];
    if (camera.chips.length > 0) {
      entries.push({ label: 'Summary', value: camera.chips.join(' · ') });
    }
    entries.push(...camera.specs.map((spec) => ({ label: spec.label, value: spec.value })));
    return { title: camera.title, entries };
  });
}

function sensorSections(): ReportSection[] {
  const result = getSensors();
  if (result.status !== 'ok') return [unavailableSection('Sensors')];
  const sensors = result.value;
  const names = sensors.map((sensor) => sensor.name).filter((name) => name.length > 0);
  const wakeUp = sensors.filter((sensor) => sensor.isWakeUp).length;
  return [
    {
      title: 'Sensors',
      entries: [
        { label: 'Reported', value: String(sensors.length) },
        { label: 'Wake-up sensors', value: String(wakeUp) },
        { label: 'Sensor list', value: names.length > 0 ? names.join(', ') : null },
      ],
    },
  ];
}

function networkSections(): ReportSection[] {
  const sections: ReportSection[] = [];

  const connectivity = getConnectivityInfo();
  if (connectivity.status === 'ok') {
    const info = connectivity.value;
    const entries: ReportEntry[] = [
      { label: 'Connection', value: connectionTypeLabel(info.type) },
      { label: 'Operator', value: info.operatorName },
      { label: 'Metered', value: info.metered ? 'Yes' : 'No' },
      { label: 'VPN', value: vpnLabel(info.vpnActive) },
      { label: 'Data Saver', value: onOffLabel(info.dataSaver) },
      { label: 'Airplane mode', value: onOffLabel(info.airplaneMode) },
      {
        label: 'Private DNS',
        value: privateDnsLabel(info.privateDnsMode, info.privateDnsHost),
      },
      { label: 'IP address', value: formatIp(info.ipv4, info.ipv6) },
      { label: 'Subnet', value: formatSubnet(info.subnetPrefix) },
      { label: 'Gateway', value: info.gateway },
      { label: 'DNS', value: formatDnsServers(info.dnsServers) },
      {
        label: 'Proxy',
        value: proxyLabel(info.proxyHost, info.proxyPort, info.proxyPacUrl),
      },
    ];
    if (info.roaming !== null) {
      entries.push({ label: 'Roaming', value: roamingLabel(info.roaming) });
    }
    sections.push({ title: 'Network', entries });
  }

  const wifi = getWifiInfo();
  if (wifi.status === 'ok') {
    const info = wifi.value;
    const entries: ReportEntry[] = [
      { label: 'Wi-Fi', value: onOffLabel(info.enabled) },
      { label: 'Connected', value: info.connected ? 'Yes' : 'No' },
    ];
    if (info.ssid) entries.push({ label: 'Network name', value: info.ssid });
    entries.push(
      { label: 'Band', value: wifiBandAndChannelLabel(info.frequencyMhz) },
      { label: 'Link speed', value: formatLinkSpeed(info.linkSpeedMbps) },
      {
        label: 'TX / RX speed',
        value: formatTxRxSpeeds(info.txLinkSpeedMbps, info.rxLinkSpeedMbps),
      },
      { label: 'Channel width', value: wifiChannelWidthLabel(info.channelWidthCode) },
      {
        label: 'Signal',
        value: signalSummary(info.rssiDbm, signalBarsFromDbm(info.rssiDbm)),
      },
      { label: 'Standard', value: wifiStandardLabel(info.standardCode) },
      {
        label: '5 GHz support',
        value: info.fiveGhzSupported === null ? null : info.fiveGhzSupported ? 'Yes' : 'No',
      },
    );
    sections.push({ title: 'Wi-Fi', entries });
  }

  if (sections.length === 0) return [unavailableSection('Network')];
  if (wifi.status !== 'ok') sections.push(unavailableSection('Wi-Fi'));
  return sections;
}

function bluetoothNfcSection(): ReportSection {
  const entries: ReportEntry[] = [];

  const bluetooth = readBluetooth();
  if (bluetooth.status === 'ok') {
    entries.push(
      { label: 'Bluetooth state', value: onOffLabel(bluetooth.value.enabled) },
      { label: 'Bluetooth LE', value: bluetooth.value.leSupported ? 'Supported' : 'No' },
    );
  } else if (bluetooth.status === 'denied') {
    entries.push({ label: 'Bluetooth state', value: 'Permission needed' });
  } else {
    entries.push({ label: 'Bluetooth state', value: null });
  }

  const nfc = readNfc();
  if (nfc.status === 'ok') {
    entries.push({ label: 'NFC state', value: onOffLabel(nfc.value.enabled) });
  } else if (nfc.status === 'denied') {
    entries.push({ label: 'NFC state', value: 'Permission needed' });
  } else {
    entries.push({ label: 'NFC state', value: null });
  }

  return { title: 'Bluetooth & NFC', entries };
}

function connectivitySections(): ReportSection[] {
  const result = readConnectivityCapabilities();
  if (result.status !== 'ok') return [unavailableSection('Connectivity')];
  const groups = buildCapabilityGroups({ capabilities: result.value });
  const sections: ReportSection[] = [
    {
      title: 'Connectivity',
      entries: [
        {
          label: 'Reported system features',
          value: String(result.value.systemFeatures.length),
        },
      ],
    },
    ...groups.map((group) => ({
      title: group.title,
      entries: group.rows.map((row) => ({
        label: row.label,
        value: row.supported === null ? null : row.supported ? 'Supported' : 'No',
      })),
    })),
  ];
  sections.push(bluetoothNfcSection());
  return sections;
}

/** Launcher-app metadata: counts, installers, target SDK and permission spread. */
async function appsSummarySections(): Promise<ReportSection[]> {
  const result = await readAppOverview();
  if (result.status !== 'ok') return [unavailableSection('Apps summary')];
  const apps = result.value;
  if (apps.length === 0) {
    return [{ title: 'Apps summary', entries: [{ label: 'Launcher apps', value: '0 apps' }] }];
  }

  const userApps = apps.filter((app) => !app.system).length;
  const entries: ReportEntry[] = [
    { label: 'Launcher apps', value: appCount(apps.length) },
    { label: 'User apps', value: appCount(userApps) },
    { label: 'System apps', value: appCount(apps.length - userApps) },
  ];

  const installerLabels: Record<string, string> = {
    'installer-play': 'Installed via Google Play',
    'installer-other': 'Installed by another app',
    'installer-unknown': 'Installer not reported',
  };
  for (const bar of appsByInstaller(apps)) {
    entries.push({
      label: installerLabels[bar.key] ?? bar.label,
      value: appCount(bar.count),
    });
  }
  for (const bar of appsByTargetSdk(apps)) {
    entries.push({ label: `Target ${bar.label}`, value: appCount(bar.count) });
  }
  for (const bar of appsByDangerousPermissions(apps)) {
    entries.push({
      label: `Dangerous permissions · ${bar.label}`,
      value: appCount(bar.count),
    });
  }

  return [{ title: 'Apps summary', entries }];
}

/** Guided checkup results saved on this phone, including optional tests. */
function testResultSections(): ReportSection[] {
  const now = new Date();
  const results = readTestResults();
  const summary = summarizeResults(results);
  return [
    {
      title: 'Test results',
      entries: [
        { label: 'Guided checks passed', value: `${summary.passed} of ${summary.total}` },
        { label: 'Failed', value: String(summary.failed) },
        { label: 'Untested', value: String(summary.untested) },
        ...HARDWARE_TESTS.map((definition) => ({
          label: definition.title,
          value: reportLine(results, definition.id, now),
        })),
      ],
    },
  ];
}

/**
 * The pickable report sections in display order. Each `build` reads Android
 * only when the report is actually generated; only Apps summary is async.
 */
export const REPORT_GROUPS: readonly ReportGroup[] = [
  {
    id: 'device',
    title: 'Device',
    description: 'Brand, model and hardware identity',
    build: deviceSections,
  },
  {
    id: 'system',
    title: 'System',
    description: 'Android version, build, kernel and runtime',
    build: systemSections,
  },
  {
    id: 'cpu',
    title: 'CPU',
    description: 'Chipset, cores, frequencies and ABIs',
    build: cpuSections,
  },
  {
    id: 'gpu',
    title: 'GPU',
    description: 'Renderer and graphics API versions',
    build: gpuSections,
  },
  {
    id: 'memory',
    title: 'Memory',
    description: 'RAM use, availability and swap',
    build: memorySections,
  },
  {
    id: 'storage',
    title: 'Storage',
    description: 'Internal space and mounted volumes',
    build: storageSections,
  },
  {
    id: 'battery',
    title: 'Battery',
    description: 'Level, health, current and charging estimates',
    build: batterySections,
  },
  {
    id: 'thermal',
    title: 'Thermal',
    description: 'Thermal status, load and headroom',
    build: thermalSections,
  },
  {
    id: 'display',
    title: 'Display',
    description: 'Resolution, refresh rate, HDR and modes',
    build: displaySections,
  },
  {
    id: 'camera',
    title: 'Camera',
    description: 'Every camera the OS reports',
    build: cameraSections,
  },
  {
    id: 'sensors',
    title: 'Sensors',
    description: 'Sensor list and wake-up count',
    build: sensorSections,
  },
  {
    id: 'network',
    title: 'Network',
    description: 'Active connection and Wi-Fi link',
    build: networkSections,
  },
  {
    id: 'connectivity',
    title: 'Connectivity',
    description: 'Radios, Wi-Fi and telephony capabilities',
    build: connectivitySections,
  },
  {
    id: 'apps',
    title: 'Apps summary',
    description: 'Launcher app counts and target API spread',
    build: appsSummarySections,
  },
  {
    id: 'testResults',
    title: 'Test results',
    description: 'Saved hardware checkup outcomes',
    build: testResultSections,
  },
];

/** Selected groups in catalog order (not in tap order). */
export function selectedReportGroups(selected: readonly ReportGroupId[]): ReportGroup[] {
  const wanted = new Set(selected);
  return REPORT_GROUPS.filter((group) => wanted.has(group.id));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "2026-10-19 07:05" in local time. */
export function reportTimestamp(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${date} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** "19 Oct 2026, 07:05" — the PDF's human date line. */
export function reportDateLabel(now: Date): string {
  return `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}

/** App version from the installed build, e.g. "1.0.0 (1)"; `null` when hidden. */
export function appVersionLabel(): string | null {
  try {
    const version = Application.nativeApplicationVersion?.trim();
    const build = Application.nativeBuildVersion?.trim();
    if (!version && !build) return null;
    if (version && build) return `${version} (${build})`;
    return version ?? `build ${build}`;
  } catch {
    return null;
  }
}

/**
 * Three-line text header: app name + timestamp, the installed version, then
 * the honesty notes shared by the preview and both export formats.
 */
export function reportHeader(now: Date, version: string | null = appVersionLabel()): string {
  const lines = [`${REPORT_NAME} — ${reportTimestamp(now)}`];
  if (version) lines.push(`App version ${version}`);
  lines.push(`${REPORT_UNAVAILABLE_NOTE} ${REPORT_ESTIMATE_NOTE}`);
  return lines.join('\n');
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character] ?? character);
}

function htmlValue(entry: ReportEntry): string {
  if (entry.value == null) {
    return '<td class="na">Not available on this device</td>';
  }
  const estimated = entry.value.startsWith('≈');
  const tag = estimated ? ' <span class="tag">Estimated</span>' : '';
  return `<td>${escapeHtml(entry.value)}${tag}</td>`;
}

function htmlSection(section: ReportSection): string {
  const rows = section.entries
    .map((entry) => `<tr><th scope="row">${escapeHtml(entry.label)}</th>${htmlValue(entry)}</tr>`)
    .join('\n');
  return `<section class="card"><h2>${escapeHtml(section.title)}</h2><table>${rows}</table></section>`;
}

/**
 * Branded, light-on-white printable document. Values starting with "≈" carry
 * an "Estimated" tag; missing readings keep the exact app wording.
 */
export function buildReportHtml(
  sections: ReportSection[],
  now: Date = new Date(),
  version: string | null = appVersionLabel(),
): string {
  const body = sections.map(htmlSection).join('\n');
  const versionLine = version == null ? 'Version not reported' : `Version ${escapeHtml(version)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Device Matrix report</title>
<style>
  @page { margin: 32px; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #ffffff; color: #111827; font-family: Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
  .brand { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 2px solid #0B0F14; }
  .mark { width: 42px; height: 42px; border-radius: 12px; background: #0B0F14; color: #22D3EE; font-family: Roboto, Arial, sans-serif; font-size: 16px; font-weight: 700; line-height: 42px; text-align: center; letter-spacing: -0.5px; }
  h1 { margin: 0; font-size: 20px; letter-spacing: -0.3px; }
  .sub { margin: 2px 0 0; color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; }
  .meta { display: flex; justify-content: space-between; gap: 12px; margin: 12px 0 6px; color: #374151; font-size: 11px; }
  .note { margin: 0 0 14px; color: #6B7280; font-size: 10px; }
  .card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 8px 12px 4px; margin: 0 0 10px; page-break-inside: avoid; }
  h2 { margin: 2px 0 6px; font-size: 10px; letter-spacing: 1.3px; color: #0E7490; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  tr + tr th, tr + tr td { border-top: 1px solid #F1F5F9; }
  th { width: 38%; padding: 5px 8px 5px 0; text-align: left; vertical-align: top; color: #6B7280; font-weight: 400; }
  td { padding: 5px 0; vertical-align: top; word-break: break-word; }
  td.na { color: #9CA3AF; font-style: italic; }
  .tag { display: inline-block; margin-left: 4px; padding: 0 4px; border-radius: 3px; background: #ECFEFF; color: #0E7490; font-size: 8px; font-style: normal; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; vertical-align: 1px; }
  footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 9px; }
</style>
</head>
<body>
<header class="brand">
  <div class="mark">DM</div>
  <div><h1>Device Matrix</h1><p class="sub">System info report</p></div>
</header>
<div class="meta"><span>${versionLine}</span><span>${escapeHtml(reportDateLabel(now))}</span></div>
<p class="note">Generated on this phone. Nothing was uploaded. ${escapeHtml(
    REPORT_ESTIMATE_NOTE,
  )} ${escapeHtml(REPORT_UNAVAILABLE_NOTE)}</p>
${body}
<footer>${escapeHtml(REPORT_NAME)} · every reading comes from public Android APIs.</footer>
</body>
</html>`;
}

export type ReportDocument = {
  generatedAt: Date;
  version: string | null;
  sections: ReportSection[];
  /** Plain text for clipboard and text sharing. */
  text: string;
  /** Light-on-white HTML for expo-print. */
  html: string;
};

/** Reads the picked groups in catalog order; only Apps summary is async. */
export async function buildReportSections(
  selected: readonly ReportGroupId[],
  now: Date = new Date(),
): Promise<ReportSection[]> {
  const sections: ReportSection[] = [];
  for (const group of selectedReportGroups(selected)) {
    sections.push(...(await group.build()));
  }
  return sections;
}

/** Builds the text and PDF sources from the same reading, once. */
export async function buildReport(
  selected: readonly ReportGroupId[],
  now: Date = new Date(),
): Promise<ReportDocument> {
  const sections = await buildReportSections(selected, now);
  const version = appVersionLabel();
  return {
    generatedAt: now,
    version,
    sections,
    text: buildReportText(sections, reportHeader(now, version)),
    html: buildReportHtml(sections, now, version),
  };
}
