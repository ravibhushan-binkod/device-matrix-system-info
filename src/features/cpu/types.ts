export type CpuFrequencyBar = {
  /** "0" … "7" — the CPU number as on the device. */
  label: string;
  /** Current frequency in MHz, for the bar ratio. */
  value: number;
  /** Formatted frequency, e.g. "2.20 GHz". */
  text: string;
};

export type CpuCluster = {
  key: string;
  /** "All cores", "Little", "Mid", "Big" or "Unknown" (frequency not readable). */
  label: string;
  /** Core indices in this cluster, ascending. */
  cores: number[];
  /** Highest max frequency in the cluster; `null` when unreadable. */
  maxKhz: number | null;
};

export type CpuCoreRow = {
  key: string;
  /** "Core 0". */
  core: string;
  /** Cluster label, e.g. "Little"; `null` before clustering. */
  cluster: string | null;
  /** Live frequency, e.g. "1.20 GHz"; `null` when blocked. */
  current: string | null;
  /** "0.30 GHz – 2.84 GHz" (or the readable bound); `null` when both are blocked. */
  range: string | null;
  /** cpufreq governor, e.g. "schedutil"; `null` when blocked. */
  governor: string | null;
};

export type CpuScreenData = {
  /** Chipset name, e.g. "MediaTek Dimensity 7200 Pro". */
  chipset: string | null;
  socManufacturer: string | null;
  socModel: string | null;
  cores: number | null;
  abis: string | null;
  /** Distinct governors across the cores, e.g. "schedutil". */
  governor: string | null;
  bars: CpuFrequencyBar[];
  /** Highest readable frequency in MHz, used to scale the bars. */
  barsMaxMhz: number;
  clusters: CpuCluster[];
  coreRows: CpuCoreRow[];
  gpuRenderer: string | null;
  gpuVendor: string | null;
  glVersion: string | null;
  glEsVersion: string | null;
  vulkanVersion: string | null;
  /** Vulkan hardware level from the system feature; `null` without Vulkan. */
  vulkanLevel: number | null;
  /** `android.hardware.vulkan.compute`; `null` without Vulkan. */
  vulkanCompute: boolean | null;
};
