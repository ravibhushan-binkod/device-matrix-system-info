import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeCameraInfo,
  NativeCpuInfo,
  NativeDisplayInfo,
  NativeGpuInfo,
} from './HardwareExt.types';

declare class HardwareExtModule extends NativeModule<Record<string, never>> {
  getCpuInfo(): NativeCpuInfo | null;
  getGpuInfo(): NativeGpuInfo | null;
  getDisplayInfo(): NativeDisplayInfo | null;
  getCameraInfo(): NativeCameraInfo | null;
}

export default requireNativeModule<HardwareExtModule>('HardwareExt');
