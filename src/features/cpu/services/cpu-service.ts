import { getCpuInfo, getGpuInfo } from '@/core/native';
import type { CpuInfo, GpuInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { chipsetLabel } from '@/core/utils/chipset';
import { formatFrequencyKhz } from '@/core/utils/format-frequency';
import type { CpuFrequencyBar, CpuScreenData } from '@/features/cpu/types';

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

/** Maps the raw results into the strings the CPU & GPU screen renders. */
export function buildCpuScreenData(cpu: Result<CpuInfo>, gpu: Result<GpuInfo>): CpuScreenData {
  const cpuInfo = cpu.status === 'ok' ? cpu.value : null;
  const gpuInfo = gpu.status === 'ok' ? gpu.value : null;

  return {
    chipset: cpuInfo ? chipsetLabel(cpuInfo) : null,
    cores: cpuInfo ? cpuInfo.cores : null,
    abis: cpuInfo ? formatAbiList(cpuInfo.abis) : null,
    bars: cpuInfo ? buildCoreBars(cpuInfo) : [],
    barsMaxMhz: cpuInfo ? coreBarMaxMhz(cpuInfo) : 100,
    gpuRenderer: gpuInfo?.renderer ?? null,
    gpuVendor: gpuInfo?.vendor ?? null,
    glVersion: gpuInfo?.glVersion ?? null,
    glEsVersion: gpuInfo?.glEsVersion ?? null,
    vulkanVersion: gpuInfo?.vulkanVersion ?? null,
  };
}
