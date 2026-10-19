import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeDeveloperSettings,
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
  getDeveloperSettings(): NativeDeveloperSettings | null;
}

export default requireNativeModule<DeviceStatsModule>('DeviceStats');
