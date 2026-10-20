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
  diagonalInches,
  formatInches,
  formatRefreshRate,
  formatResolution,
  hdrLabel,
  readDisplay,
} from '@/features/display/services/display-service';
import { readMemoryStats } from '@/features/memory/services/memory-service';
import {
  connectionTypeLabel,
  formatDnsServers,
  formatIp,
  formatLinkSpeed,
  onOffLabel,
  privateDnsLabel,
  signalBarsFromDbm,
  signalSummary,
  vpnLabel,
  wifiBandAndChannelLabel,
  wifiStandardLabel,
} from '@/features/network/services/network-service';
import { buildVolumeRows, toStorageOverview } from '@/features/storage/services/storage-service';
import { readThermalInfo } from '@/features/thermal/services/thermal-service';
import type { ReportGroup, ReportGroupId } from '@/features/report/types';

/** A group Android could not read — honest, never a guessed value. */
function unavailableSection(title: string): ReportSection {
  return { title, entries: [{ label: 'Reading', value: null }] };
}

function percentLabel(value: number | null): string | null {
  return value === null ? null : `${Math.round(value)}%`;
}

function deviceSections(): ReportSection[] {
  const info = readDeviceInfo();
  return info.sections.map((section) => ({
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
  if (info.cycleCount !== null) {
    entries.push({ label: 'Cycle count', value: String(info.cycleCount) });
  }
  return [{ title: 'Battery', entries }];
}

function memorySections(): ReportSection[] {
  const result = readMemoryStats();
  if (result.status !== 'ok') return [unavailableSection('Memory')];
  const info = result.value;
  return [
    {
      title: 'Memory',
      entries: [
        { label: 'Usage', value: `${Math.round(info.usedPercent)}%` },
        {
          label: 'Used RAM',
          value: `${formatByteSize(info.usedBytes)} of ${formatByteSize(info.totalBytes)}`,
        },
        { label: 'Available', value: formatByteSize(info.availableBytes) },
        { label: 'Low memory', value: info.lowMemory ? 'Yes' : 'No' },
      ],
    },
  ];
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
  return [
    {
      title: 'Display',
      entries: [
        { label: 'Resolution', value: formatResolution(info.widthPx, info.heightPx) },
        {
          label: 'Diagonal',
          value: formatInches(diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi)),
        },
        { label: 'Density', value: `${info.densityDpi} dpi` },
        { label: 'Refresh rate', value: formatRefreshRate(info.refreshRateHz) },
        { label: 'HDR', value: hdrLabel(info.isHdr, info.hdrTypes) },
        {
          label: 'Screen timeout',
          value: info.screenTimeoutMs === null ? null : formatTimeout(info.screenTimeoutMs),
        },
        { label: 'Brightness', value: brightnessEntry(info.brightness, info.brightnessMode) },
      ],
    },
  ];
}

function cpuSections(): ReportSection[] {
  const entries: ReportEntry[] = [];

  const cpu = getCpuInfo();
  if (cpu.status === 'ok') {
    const info = cpu.value;
    entries.push({ label: 'Chipset', value: chipsetLabel(info) });
    entries.push({ label: 'CPU cores', value: String(info.cores) });
    const maxKhz = info.frequencies.reduce(
      (max, frequency) => Math.max(max, frequency.maxKhz ?? 0),
      0,
    );
    if (maxKhz > 0) {
      entries.push({ label: 'Max frequency', value: formatFrequencyKhz(maxKhz) });
    }
    if (info.abis.length > 0) {
      entries.push({ label: 'ABIs', value: info.abis.join(', ') });
    }
  }

  const gpu = getGpuInfo();
  if (gpu.status === 'ok') {
    const info = gpu.value;
    if (info.renderer) entries.push({ label: 'GPU', value: info.renderer });
    if (info.vendor) entries.push({ label: 'GPU vendor', value: info.vendor });
    if (info.glEsVersion) entries.push({ label: 'OpenGL ES', value: info.glEsVersion });
    if (info.vulkanVersion) entries.push({ label: 'Vulkan', value: info.vulkanVersion });
  }

  return [
    {
      title: 'CPU & GPU',
      entries: entries.length > 0 ? entries : [{ label: 'Reading', value: null }],
    },
  ];
}

function networkSections(): ReportSection[] {
  const sections: ReportSection[] = [];

  const connectivity = getConnectivityInfo();
  if (connectivity.status === 'ok') {
    const info = connectivity.value;
    sections.push({
      title: 'Network',
      entries: [
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
        { label: 'Gateway', value: info.gateway },
        { label: 'DNS', value: formatDnsServers(info.dnsServers) },
      ],
    });
  }

  const wifi = getWifiInfo();
  if (wifi.status === 'ok') {
    const info = wifi.value;
    sections.push({
      title: 'Wi-Fi',
      entries: [
        { label: 'Wi-Fi', value: onOffLabel(info.enabled) },
        { label: 'Connected', value: info.connected ? 'Yes' : 'No' },
        ...(info.ssid ? [{ label: 'Network name', value: info.ssid }] : []),
        { label: 'Band', value: wifiBandAndChannelLabel(info.frequencyMhz) },
        { label: 'Link speed', value: formatLinkSpeed(info.linkSpeedMbps) },
        {
          label: 'Signal',
          value: signalSummary(info.rssiDbm, signalBarsFromDbm(info.rssiDbm)),
        },
        { label: 'Standard', value: wifiStandardLabel(info.standardCode) },
        {
          label: '5 GHz support',
          value: info.fiveGhzSupported === null ? null : info.fiveGhzSupported ? 'Yes' : 'No',
        },
      ],
    });
  }

  return sections.length > 0 ? sections : [unavailableSection('Network')];
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

function sensorSections(): ReportSection[] {
  const result = getSensors();
  if (result.status !== 'ok') return [unavailableSection('Sensors')];
  const sensors = result.value;
  const names = sensors.map((sensor) => sensor.name).filter((name) => name.length > 0);
  return [
    {
      title: 'Sensors',
      entries: [
        { label: 'Reported', value: String(sensors.length) },
        { label: 'Sensor list', value: names.length > 0 ? names.join(', ') : null },
      ],
    },
  ];
}

/** Guided checkup results saved on this phone, including optional tests. */
function hardwareTestSections(): ReportSection[] {
  const now = new Date();
  const results = readTestResults();
  const summary = summarizeResults(results);
  return [
    {
      title: 'Hardware tests',
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
 * only when the report is actually generated.
 */
export const REPORT_GROUPS: readonly ReportGroup[] = [
  { id: 'device', title: 'Device & OS', build: deviceSections },
  { id: 'battery', title: 'Battery', build: batterySections },
  { id: 'memory', title: 'Memory', build: memorySections },
  { id: 'storage', title: 'Storage', build: storageSections },
  { id: 'display', title: 'Display', build: displaySections },
  { id: 'cpu', title: 'CPU & GPU', build: cpuSections },
  { id: 'network', title: 'Network', build: networkSections },
  { id: 'thermal', title: 'Thermal', build: thermalSections },
  { id: 'sensors', title: 'Sensors', build: sensorSections },
  { id: 'hardwareTests', title: 'Hardware tests', build: hardwareTestSections },
];

/** Selected groups in catalog order (not in tap order). */
export function selectedReportGroups(selected: readonly ReportGroupId[]): ReportGroup[] {
  const wanted = new Set(selected);
  return REPORT_GROUPS.filter((group) => wanted.has(group.id));
}

/** "Device Matrix: System info — 2026-10-19 07:05" in local time. */
export function reportHeader(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `Device Matrix: System info — ${date} ${time}`;
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

/** A printable one-page document around the plain-text report. */
export function buildReportHtml(text: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Roboto, Arial, sans-serif; color: #111; padding: 24px; }
  pre { font-family: inherit; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin: 0; }
</style>
</head>
<body>
<pre>${escapeHtml(text)}</pre>
</body>
</html>`;
}

/** Builds the plain-text report for the picked groups. */
export function buildReport(selected: readonly ReportGroupId[], now: Date = new Date()): string {
  const sections = selectedReportGroups(selected).flatMap((group) => group.build());
  return buildReportText(sections, reportHeader(now));
}
