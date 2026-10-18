export type CpuFrequencyBar = {
  /** "0" … "7" — the CPU number as on the device. */
  label: string;
  /** Current frequency in MHz, for the bar ratio. */
  value: number;
  /** Formatted frequency, e.g. "2.20 GHz". */
  text: string;
};

export type CpuScreenData = {
  /** Chipset name, e.g. "MediaTek Dimensity 7200 Pro". */
  chipset: string | null;
  cores: number | null;
  abis: string | null;
  bars: CpuFrequencyBar[];
  /** Highest readable frequency in MHz, used to scale the bars. */
  barsMaxMhz: number;
  gpuRenderer: string | null;
  gpuVendor: string | null;
  glVersion: string | null;
  glEsVersion: string | null;
  vulkanVersion: string | null;
};
