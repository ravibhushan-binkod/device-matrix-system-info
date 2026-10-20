import { getCpuInfo, getGpuInfo } from '@/core/native';
import type { CpuFrequency, CpuInfo, GpuInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { chipsetLabel } from '@/core/utils/chipset';
import { formatFrequencyKhz } from '@/core/utils/format-frequency';
import type { CpuCluster, CpuCoreRow, CpuFrequencyBar, CpuScreenData } from '@/features/cpu/types';

export function readCpuInfo(): { cpu: Result<CpuInfo>; gpu: Result<GpuInfo> } {
  return { cpu: getCpuInfo(), gpu: getGpuInfo() };
}

/** One bar per core that reports a live frequency; blocked cores are left out. */
export function buildCoreBars(cpu: CpuInfo): CpuFrequencyBar[] {
  const bars: CpuFrequencyBar[] = [];
  for (const core of cpu.frequencies) {
    if (core.currentKhz == null || core.currentKhz <= 0) continue;
    bars.push({
      label: String(core.index),
      value: core.currentKhz / 1000,
      text: formatFrequencyKhz(core.currentKhz),
    });
  }
  return bars;
}

/** Highest readable frequency in MHz — scales the bars to the chip's own top. */
export function coreBarMaxMhz(cpu: CpuInfo): number {
  let max = 0;
  for (const core of cpu.frequencies) {
    const candidate = core.maxKhz ?? core.currentKhz ?? 0;
    if (candidate > max) max = candidate;
  }
  return max > 0 ? max / 1000 : 100;
}

export function formatAbiList(abis: string[]): string | null {
  const cleaned = abis.filter((abi) => abi.length > 0);
  return cleaned.length > 0 ? cleaned.join(' · ') : null;
}

/** Little / mid / big names for a given number of clusters, by max frequency. */
function clusterLabels(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ['Cluster 1'];
  if (count === 2) return ['Little', 'Big'];
  if (count === 3) return ['Little', 'Mid', 'Big'];
  const labels = ['Little'];
  for (let index = 1; index < count - 1; index += 1) labels.push(`Mid ${index}`);
  labels.push('Big');
  return labels;
}

/**
 * Groups the cores by their highest readable frequency — the classic
 * little / mid / big layout. Cores whose maximum is blocked are kept in a
 * separate "Unknown" group instead of being guessed into a cluster.
 */
export function groupCoreClusters(frequencies: CpuFrequency[]): CpuCluster[] {
  if (frequencies.length === 0) return [];

  const byMaxKhz = new Map<number, number[]>();
  const unknown: number[] = [];
  for (const core of frequencies) {
    if (core.maxKhz != null && core.maxKhz > 0) {
      const list = byMaxKhz.get(core.maxKhz) ?? [];
      list.push(core.index);
      byMaxKhz.set(core.maxKhz, list);
    } else {
      unknown.push(core.index);
    }
  }

  const sortedMaxKhz = [...byMaxKhz.keys()].sort((a, b) => a - b);
  const labels = clusterLabels(sortedMaxKhz.length);
  const clusters: CpuCluster[] = sortedMaxKhz.map((maxKhz, index) => ({
    key: `cluster-${maxKhz}`,
    label: labels[index] ?? `Cluster ${index + 1}`,
    cores: (byMaxKhz.get(maxKhz) ?? []).sort((a, b) => a - b),
    maxKhz,
  }));

  if (unknown.length > 0) {
    clusters.push({
      key: 'cluster-unknown',
      label: 'Unknown',
      cores: unknown.sort((a, b) => a - b),
      maxKhz: null,
    });
  }

  // A single readable cluster that covers every core is simply "All cores".
  if (clusters.length === 1) {
    const only = clusters[0];
    if (only) only.label = 'All cores';
  }
  return clusters;
}

/** "0.30 GHz – 2.84 GHz" from whatever bounds the device reports. */
export function frequencyRange(minKhz: number | null, maxKhz: number | null): string | null {
  const min = minKhz != null && minKhz > 0 ? minKhz : null;
  const max = maxKhz != null && maxKhz > 0 ? maxKhz : null;
  if (min == null && max == null) return null;
  if (min == null) return `up to ${formatFrequencyKhz(max as number)}`;
  if (max == null) return `from ${formatFrequencyKhz(min)}`;
  if (min === max) return formatFrequencyKhz(min);
  return `${formatFrequencyKhz(min)} – ${formatFrequencyKhz(max)}`;
}

/** Per-core rows for the cluster list. */
export function buildCoreRows(
  frequencies: CpuFrequency[],
  clusters: CpuCluster[],
): CpuCoreRow[] {
  const clusterOf = new Map<number, string>();
  for (const cluster of clusters) {
    for (const core of cluster.cores) clusterOf.set(core, cluster.label);
  }

  return frequencies.map((core) => ({
    key: String(core.index),
    core: `Core ${core.index}`,
    cluster: clusterOf.get(core.index) ?? null,
    current:
      core.currentKhz != null && core.currentKhz > 0 ? formatFrequencyKhz(core.currentKhz) : null,
    range: frequencyRange(core.minKhz, core.maxKhz),
    governor: core.governor,
  }));
}

/** The distinct governors in use, e.g. "schedutil" or "schedutil · performance". */
export function governorSummary(rows: CpuCoreRow[]): string | null {
  const unique: string[] = [];
  for (const row of rows) {
    if (row.governor != null && !unique.includes(row.governor)) unique.push(row.governor);
  }
  return unique.length > 0 ? unique.join(' · ') : null;
}

/** Maps the raw results into the strings the CPU & GPU screen renders. */
export function buildCpuScreenData(cpu: Result<CpuInfo>, gpu: Result<GpuInfo>): CpuScreenData {
  const cpuInfo = cpu.status === 'ok' ? cpu.value : null;
  const gpuInfo = gpu.status === 'ok' ? gpu.value : null;

  const clusters = cpuInfo ? groupCoreClusters(cpuInfo.frequencies) : [];
  const coreRows = cpuInfo ? buildCoreRows(cpuInfo.frequencies, clusters) : [];

  return {
    chipset: cpuInfo ? chipsetLabel(cpuInfo) : null,
    socManufacturer: cpuInfo?.socManufacturer ?? null,
    socModel: cpuInfo?.socModel ?? null,
    cores: cpuInfo ? cpuInfo.cores : null,
    abis: cpuInfo ? formatAbiList(cpuInfo.abis) : null,
    governor: governorSummary(coreRows),
    bars: cpuInfo ? buildCoreBars(cpuInfo) : [],
    barsMaxMhz: cpuInfo ? coreBarMaxMhz(cpuInfo) : 100,
    clusters,
    coreRows,
    gpuRenderer: gpuInfo?.renderer ?? null,
    gpuVendor: gpuInfo?.vendor ?? null,
    glVersion: gpuInfo?.glVersion ?? null,
    glEsVersion: gpuInfo?.glEsVersion ?? null,
    vulkanVersion: gpuInfo?.vulkanVersion ?? null,
    vulkanLevel: gpuInfo?.vulkanLevel ?? null,
    vulkanCompute: gpuInfo?.vulkanCompute ?? null,
  };
}
