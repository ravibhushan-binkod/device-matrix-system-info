export type MemoryStats = {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  /** 0–100. */
  usedPercent: number;
  /** The OS "low memory" threshold reported by ActivityManager. */
  thresholdBytes: number;
  lowMemory: boolean;
};
