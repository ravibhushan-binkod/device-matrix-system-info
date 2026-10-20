import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeBuildInfo,
  NativeDeveloperSettings,
  NativeMemoryInfo,
  NativeOsInfo,
  NativeStorageInfo,
  NativeThermalStatus,
  NativeThermalZone,
  NativeUptime,
} from './DeviceStats.types';

declare class DeviceStatsModule extends NativeModule<Record<string, never>> {
  getMemoryInfo(): NativeMemoryInfo | null;
  getStorageInfo(): NativeStorageInfo | null;
  getUptime(): NativeUptime | null;
  getThermalStatus(): NativeThermalStatus | null;
  getThermalZones(): NativeThermalZone[] | null;
  getOsInfo(): NativeOsInfo | null;
  getBuildInfo(): NativeBuildInfo | null;
  getDeveloperSettings(): NativeDeveloperSettings | null;
}

export default requireNativeModule<DeviceStatsModule>('DeviceStats');
