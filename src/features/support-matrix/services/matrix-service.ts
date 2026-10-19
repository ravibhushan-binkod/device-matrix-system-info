import { getBatteryInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import { formatTimeout } from '@/core/utils/format-duration';
import { formatTemperature } from '@/core/utils/format-temperature';
import { readStorageStats, readUsageAccess } from '@/features/apps/services/apps-service';
import {
  batteryHealthLabel,
  batteryPlugLabel,
  batteryStatusLabel,
  buildBatteryStats,
} from '@/features/battery/services/battery-stats';
import { buildCameraEntries, readCameras } from '@/features/camera/services/camera-service';
import { buildCpuScreenData, readCpuInfo } from '@/features/cpu/services/cpu-service';
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
import {
  fifoLabel,
  formatSensorPower,
  formatSensorValue,
  readSensors,
  samplingRateLabel,
  sensorLabel,
} from '@/features/sensors/services/sensor-service';
import {
  buildStorageBreakdown,
  buildVolumeRows,
  readStorage,
  sumAppBytes,
  toStorageOverview,
} from '@/features/storage/services/storage-service';
import { readThermalInfo } from '@/features/thermal/services/thermal-service';
import type { MatrixEntry, MatrixSection, MatrixSummary } from '@/features/support-matrix/types';

const NOT_REPORTED = 'Not reported by this device';

/** A reading row: a missing value keeps its reason so the matrix stays honest. */
function entry(key: string, label: string, value: string | null, note = NOT_REPORTED): MatrixEntry {
  return { key, label, value, note: value == null ? note : null };
}

function resultNote(result: Result<unknown>): string {
  if (result.status === 'unavailable') return result.reason;
  if (result.status === 'denied') return `Permission needed: ${result.permission}`;
  return NOT_REPORTED;
}

function failureSection(key: string, title: string, reason: string): MatrixSection {
  return { key, title, entries: [entry(`${key}-root`, `${title} · all readings`, null, reason)] };
}

function deviceSection(): MatrixSection {
  const info = readDeviceInfo();
  const entries = info.sections.flatMap((section) =>
    section.entries.map((item) =>
      entry(`${section.key}-${item.key}`, `${section.title} · ${item.label}`, item.value),
    ),
  );
  return { key: 'device', title: 'Device & OS', entries };
}

function cpuSection(): MatrixSection {
  const { cpu, gpu } = readCpuInfo();
  const data = buildCpuScreenData(cpu, gpu);
  const entries: MatrixEntry[] = [];

  if (cpu.status !== 'ok') entries.push(entry('cpu-root', 'CPU · all readings', null, resultNote(cpu)));
  if (gpu.status !== 'ok') entries.push(entry('gpu-root', 'GPU · all readings', null, resultNote(gpu)));

  entries.push(
    entry('cpu-chipset', 'CPU · Chipset', data.chipset),
    entry('cpu-soc-manufacturer', 'CPU · SoC manufacturer', data.socManufacturer),
    entry('cpu-soc-model', 'CPU · SoC model', data.socModel),
    entry('cpu-cores', 'CPU · Cores', data.cores == null ? null : String(data.cores)),
    entry('cpu-abis', 'CPU · ABIs', data.abis),
    entry('cpu-governor', 'CPU · Governor', data.governor),
    entry('gpu-renderer', 'GPU · Renderer', data.gpuRenderer),
    entry('gpu-vendor', 'GPU · Vendor', data.gpuVendor),
    entry('gpu-gl', 'GPU · OpenGL version', data.glVersion),
    entry('gpu-gles', 'GPU · OpenGL ES', data.glEsVersion),
    entry('gpu-vulkan', 'GPU · Vulkan version', data.vulkanVersion),
    entry(
      'gpu-vulkan-level',
      'GPU · Vulkan level',
      data.vulkanLevel == null ? null : String(data.vulkanLevel),
    ),
    entry(
      'gpu-vulkan-compute',
      'GPU · Vulkan compute',
      data.vulkanCompute == null ? null : data.vulkanCompute ? 'Yes' : 'No',
    ),
  );

  for (const row of data.coreRows) {
    entries.push(
      entry(`cpu-core-${row.key}-current`, `${row.core} · Current frequency`, row.current),
      entry(`cpu-core-${row.key}-range`, `${row.core} · Frequency range`, row.range),
      entry(`cpu-core-${row.key}-governor`, `${row.core} · Governor`, row.governor),
    );
  }

  return { key: 'cpu', title: 'CPU & GPU', entries };
}

function thermalSection(): MatrixSection {
  const result = readThermalInfo();
  if (result.status !== 'ok') {
    return failureSection('thermal', 'Thermal', resultNote(result));
  }

  const info = result.value;
  const entries: MatrixEntry[] = [
    entry('thermal-status', 'Thermal · Status', info.statusLabel),
    entry(
      'thermal-headroom',
      'Thermal · Headroom',
      info.headroomPercent == null ? null : `${info.headroomPercent}%`,
    ),
    entry(
      'thermal-battery-temp',
      'Thermal · Battery temperature',
      info.batteryTemperatureC == null ? null : formatTemperature(info.batteryTemperatureC, 'C', 1),
    ),
  ];

  if (info.zones.length > 0) {
    for (const zone of info.zones) {
      entries.push(entry(`thermal-zone-${zone.key}`, `Thermal zone · ${zone.name}`, zone.temperature));
    }
  } else {
    entries.push(
      entry(
        'thermal-zones',
        'Thermal · Zones',
        null,
        info.zonesNote ?? 'No thermal zone is readable on this device.',
      ),
    );
  }

  return { key: 'thermal', title: 'Thermal', entries };
}

function batterySection(): MatrixSection {
  const result = getBatteryInfo();
  if (result.status !== 'ok') {
    return failureSection('battery', 'Battery', resultNote(result));
  }

  const reading = result.value;
  const stats = new Map(buildBatteryStats(reading).map((stat) => [stat.key, stat.value]));

  const entries: MatrixEntry[] = [
    entry('battery-level', 'Battery · Level', reading.percent == null ? null : `${reading.percent}%`),
    entry('battery-status', 'Battery · Status', batteryStatusLabel(reading.status)),
    entry('battery-plug', 'Battery · Plug', batteryPlugLabel(reading.plugged)),
    entry('battery-health', 'Battery · Health', batteryHealthLabel(reading.health)),
    entry('battery-temperature', 'Battery · Temperature', stats.get('temperature') ?? null),
    entry('battery-voltage', 'Battery · Voltage', stats.get('voltage') ?? null),
    entry('battery-current', 'Battery · Current', stats.get('current') ?? null),
    entry('battery-power', 'Battery · Power', stats.get('power') ?? null),
    entry(
      'battery-capacity',
      'Battery · Capacity estimate',
      stats.get('capacity') ?? null,
      'Needs the charge-counter reading.',
    ),
    entry(
      'battery-cycles',
      'Battery · Cycle count',
      stats.get('cycle-count') ?? null,
      'Android reports cycle counts from Android 14.',
    ),
    entry(
      'battery-time-to-full',
      'Battery · Time to full',
      stats.get('time-to-full') ?? null,
      'Only computable while charging.',
    ),
  ];

  return { key: 'battery', title: 'Battery', entries };
}

function memorySection(): MatrixSection {
  const result = readMemoryStats();
  if (result.status !== 'ok') {
    return failureSection('memory', 'Memory', resultNote(result));
  }

  const stats = result.value;
  const entries: MatrixEntry[] = [
    entry('memory-total', 'Memory · Total', formatByteSize(stats.totalBytes)),
    entry('memory-used', 'Memory · Used', formatByteSize(stats.usedBytes)),
    entry('memory-available', 'Memory · Available', formatByteSize(stats.availableBytes)),
    entry('memory-percent', 'Memory · Used percent', `${Math.round(stats.usedPercent)}%`),
    entry('memory-threshold', 'Memory · Threshold', formatByteSize(stats.thresholdBytes)),
    entry('memory-low', 'Memory · Low-memory flag', stats.lowMemory ? 'Yes' : 'No'),
    entry(
      'memory-swap-total',
      'Memory · Swap total',
      stats.swapTotalBytes == null ? null : formatByteSize(stats.swapTotalBytes),
      'The kernel hides swap on this build.',
    ),
    entry(
      'memory-swap-used',
      'Memory · Swap used',
      stats.swapUsedBytes == null ? null : formatByteSize(stats.swapUsedBytes),
      'The kernel hides swap on this build.',
    ),
  ];

  return { key: 'memory', title: 'Memory', entries };
}

async function storageSection(): Promise<MatrixSection> {
  const entries: MatrixEntry[] = [];
  const storage = readStorage();

  if (storage.status === 'ok') {
    const overview = toStorageOverview(storage.value);
    if (overview.status === 'ok') {
      entries.push(
        entry('storage-total', 'Storage · Total', formatByteSize(overview.value.totalBytes)),
        entry('storage-used', 'Storage · Used', formatByteSize(overview.value.usedBytes)),
        entry(
          'storage-free',
          'Storage · Free',
          formatByteSize(overview.value.totalBytes - overview.value.usedBytes),
        ),
        entry('storage-fs', 'Storage · File system', overview.value.fsType),
      );
    } else {
      const reason =
        overview.status === 'unavailable' ? overview.reason : `Permission needed: ${overview.permission}`;
      entries.push(entry('storage-overview', 'Storage · Overview', null, reason));
    }

    for (const [index, volume] of buildVolumeRows(storage.value).entries()) {
      entries.push(entry(`storage-volume-${index}`, `Volume · ${volume.label}`, volume.value));
    }
  } else {
    entries.push(entry('storage-root', 'Storage · all readings', null, resultNote(storage)));
  }

  const access = readUsageAccess();
  const granted = access.status === 'ok' ? access.value : false;
  entries.push(
    access.status !== 'ok'
      ? entry('storage-usage-access', 'Storage · Usage access', null, resultNote(access))
      : entry('storage-usage-access', 'Storage · Usage access', granted ? 'Granted' : 'Not granted'),
  );

  if (!granted) {
    entries.push(
      entry(
        'storage-breakdown',
        'Storage · Apps / other split',
        null,
        'Grant Usage Access to read per-app sizes.',
      ),
    );
    return { key: 'storage', title: 'Storage', entries };
  }

  const stats = await readStorageStats();
  const overview = storage.status === 'ok' ? toStorageOverview(storage.value) : null;

  if (stats.status !== 'ok') {
    entries.push(
      entry('storage-breakdown', 'Storage · Apps / other split', null, resultNote(stats)),
    );
  } else if (overview == null) {
    entries.push(
      entry('storage-breakdown', 'Storage · Apps / other split', null, NOT_REPORTED),
    );
  } else if (overview.status !== 'ok') {
    const reason =
      overview.status === 'unavailable'
        ? overview.reason
        : `Permission needed: ${overview.permission}`;
    entries.push(
      entry('storage-breakdown', 'Storage · Apps / other split', null, reason),
    );
  } else {
    const breakdown = buildStorageBreakdown(
      overview.value.totalBytes,
      overview.value.totalBytes - overview.value.usedBytes,
      sumAppBytes(stats.value),
    );
    if (breakdown != null) {
      entries.push(
        entry('storage-apps', 'Storage · Apps', formatByteSize(breakdown.appsBytes)),
        entry('storage-other', 'Storage · Other', formatByteSize(breakdown.otherBytes)),
      );
    } else {
      entries.push(
        entry('storage-breakdown', 'Storage · Apps / other split', null, NOT_REPORTED),
      );
    }
  }

  return { key: 'storage', title: 'Storage', entries };
}

function displaySection(): MatrixSection {
  const result = readDisplay();
  if (result.status !== 'ok') {
    return failureSection('display', 'Display', resultNote(result));
  }

  const info = result.value;
  const modes = buildModeRows(info, 12);
  const entries: MatrixEntry[] = [
    entry('display-resolution', 'Display · Resolution', formatResolution(info.widthPx, info.heightPx)),
    entry(
      'display-size',
      'Display · Physical size',
      formatInches(diagonalInches(info.widthPx, info.heightPx, info.xdpi, info.ydpi)),
    ),
    entry('display-density', 'Display · Density', `${info.densityDpi} dpi · ${info.density.toFixed(2)}×`),
    entry('display-refresh', 'Display · Refresh rate', formatRefreshRate(info.refreshRateHz)),
    entry(
      'display-modes',
      'Display · Refresh modes',
      modes.rows.length > 0 ? `${info.supportedModes.length} modes` : null,
    ),
    entry('display-hdr', 'Display · HDR', hdrLabel(info.isHdr, info.hdrTypes)),
    entry('display-wide-gamut', 'Display · Wide color gamut', wideGamutLabel(info.isWideColorGamut)),
    entry('display-cutout', 'Display · Cutout', cutoutLabel(info.cutout)),
    entry(
      'display-brightness',
      'Display · Brightness',
      brightnessPercent(info.brightness) == null ? null : `${brightnessPercent(info.brightness)}%`,
    ),
    entry('display-brightness-mode', 'Display · Brightness mode', brightnessModeLabel(info.brightnessMode)),
    entry(
      'display-timeout',
      'Display · Screen timeout',
      info.screenTimeoutMs == null ? null : formatTimeout(info.screenTimeoutMs),
    ),
  ];

  return { key: 'display', title: 'Display', entries };
}

function cameraSection(): MatrixSection {
  const result = readCameras();
  if (result.status !== 'ok') {
    return failureSection('camera', 'Camera', resultNote(result));
  }

  const entries = buildCameraEntries(result.value).flatMap((camera) =>
    camera.specs.map((spec) =>
      entry(`camera-${camera.key}-${spec.key}`, `${camera.title} · ${spec.label}`, spec.value),
    ),
  );

  if (entries.length === 0) {
    entries.push(entry('camera-none', 'Camera · all readings', null, 'Android did not report any cameras.'));
  }

  return { key: 'camera', title: 'Camera', entries };
}

function sensorsSection(): MatrixSection {
  const result = readSensors();
  if (result.status !== 'ok') {
    return failureSection('sensors', 'Sensors', resultNote(result));
  }

  const entries: MatrixEntry[] = [];
  for (const sensor of result.value) {
    const label = sensorLabel(sensor);
    entries.push(
      entry(`sensor-${sensor.type}-name`, `${label} · Name`, sensor.name),
      entry(
        `sensor-${sensor.type}-vendor`,
        `${label} · Vendor`,
        sensor.vendor.length > 0 ? sensor.vendor : null,
      ),
      entry(
        `sensor-${sensor.type}-range`,
        `${label} · Range`,
        sensor.maxRange > 0 ? formatSensorValue(sensor.maxRange) : null,
      ),
      entry(
        `sensor-${sensor.type}-resolution`,
        `${label} · Resolution`,
        sensor.resolution > 0 ? formatSensorValue(sensor.resolution) : null,
      ),
      entry(`sensor-${sensor.type}-power`, `${label} · Power`, formatSensorPower(sensor.powerMa)),
      entry(
        `sensor-${sensor.type}-rate`,
        `${label} · Sampling rate`,
        samplingRateLabel(sensor.minDelayUs, sensor.maxDelayUs),
      ),
      entry(
        `sensor-${sensor.type}-fifo`,
        `${label} · FIFO`,
        fifoLabel(sensor.fifoMaxEventCount, sensor.fifoReservedEventCount),
      ),
    );
  }

  return { key: 'sensors', title: 'Sensors', entries };
}

/** Readings Android genuinely does not expose to normal apps — never guessed. */
function knownGapsSection(): MatrixSection {
  return {
    key: 'gaps',
    title: 'Known gaps',
    entries: [
      entry('gap-ram-type', 'RAM type & speed', null, 'No public Android API reports RAM type or speed.'),
      entry('gap-treble', 'Treble support', null, 'Only shell/adb can read it; no public API exposes it.'),
      entry('gap-dynamic', 'Dynamic partitions', null, 'Only shell/adb can read it; no public API exposes it.'),
      entry('gap-seamless', 'Seamless updates', null, 'Only shell/adb can read it; no public API exposes it.'),
    ],
  };
}

/** Every reading this app can produce, grouped per screen, with ok/unavailable state. */
export async function buildSupportMatrix(): Promise<MatrixSection[]> {
  return [
    deviceSection(),
    cpuSection(),
    thermalSection(),
    batterySection(),
    memorySection(),
    await storageSection(),
    displaySection(),
    cameraSection(),
    sensorsSection(),
    knownGapsSection(),
  ];
}

export function summarizeMatrix(sections: MatrixSection[]): MatrixSummary {
  let ok = 0;
  let unavailable = 0;
  for (const section of sections) {
    for (const item of section.entries) {
      if (item.value == null) unavailable += 1;
      else ok += 1;
    }
  }
  return { ok, unavailable };
}
