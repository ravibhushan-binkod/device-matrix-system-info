export type MemoryStats = {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  /** 0–100. */
  usedPercent: number;
  /** The OS "low memory" threshold reported by ActivityManager. */
  thresholdBytes: number;
  lowMemory: boolean;
  /** Swap space total from /proc/meminfo; `null` when the kernel hides it. */
  swapTotalBytes: number | null;
  swapFreeBytes: number | null;
  /** Swap in use (total − free); `null` unless both sides are known. */
  swapUsedBytes: number | null;
};
