import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeMemoryInfo,
  NativeStorageInfo,
  NativeThermalStatus,
  NativeUptime,
} from './DeviceStats.types';

declare class DeviceStatsModule extends NativeModule<Record<string, never>> {
  getMemoryInfo(): NativeMemoryInfo | null;
  getStorageInfo(): NativeStorageInfo | null;
  getUptime(): NativeUptime | null;
  getThermalStatus(): NativeThermalStatus | null;
}

export default requireNativeModule<DeviceStatsModule>('DeviceStats');
