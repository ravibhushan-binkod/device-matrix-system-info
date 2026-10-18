export type NativeMemoryInfo = {
  totalBytes: number;
  availBytes: number;
  thresholdBytes: number;
  lowMemory: boolean;
};

export type NativeStorageVolume = {
  description: string | null;
  isPrimary: boolean;
  isRemovable: boolean;
  state: string;
  uuid: string | null;
  path: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
};

export type NativeStorageInfo = {
  internal: { totalBytes: number; freeBytes: number } | null;
  volumes: NativeStorageVolume[];
};

export type NativeUptime = {
  uptimeMillis: number;
};

export type NativeThermalStatus = {
  statusCode: number | null;
  status: string | null;
  headroom: number | null;
  headroomForecastSeconds: number;
};
