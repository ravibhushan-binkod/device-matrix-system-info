export type StorageOverview = {
  usedBytes: number;
  totalBytes: number;
  /** 0–100. */
  percent: number;
  /** File-system type of the internal volume; `null` when the mount table was unreadable. */
  fsType: string | null;
};

export type StorageVolumeRow = {
  key: string;
  label: string;
  /** e.g. "59.0 GB free of 128.0 GB · f2fs"; `null` when the sizes are unavailable. */
  value: string | null;
  removable: boolean;
};

/** apps / other / free split of the internal volume (apps needs Usage Access). */
export type StorageBreakdown = {
  /** Sum of the app + data bytes Android reports for every installed app. */
  appsBytes: number;
  freeBytes: number;
  /** Everything else: system, media, and data Android does not attribute to an app. */
  otherBytes: number;
  totalBytes: number;
};
