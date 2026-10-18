import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeMemoryInfo,
  NativeOsInfo,
  NativeStorageInfo,
  NativeThermalStatus,
  NativeUptime,
} from './DeviceStats.types';

declare class DeviceStatsModule extends NativeModule<Record<string, never>> {
  getMemoryInfo(): NativeMemoryInfo | null;
  getStorageInfo(): NativeStorageInfo | null;
  getUptime(): NativeUptime | null;
  getThermalStatus(): NativeThermalStatus | null;
  getOsInfo(): NativeOsInfo | null;
}

export default requireNativeModule<DeviceStatsModule>('DeviceStats');
