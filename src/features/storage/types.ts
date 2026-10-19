export type StorageOverview = {
  usedBytes: number;
  totalBytes: number;
  /** 0–100. */
  percent: number;
};

export type StorageVolumeRow = {
  key: string;
  label: string;
  /** e.g. "59.0 GB free of 128.0 GB"; `null` when the sizes are unavailable. */
  value: string | null;
  removable: boolean;
};
