import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeCameraInfo,
  NativeCpuInfo,
  NativeDisplayInfo,
  NativeGpuInfo,
  NativeTorchInfo,
  NativeTorchResult,
  NativeVibrationInfo,
} from './HardwareExt.types';

declare class HardwareExtModule extends NativeModule<Record<string, never>> {
  getCpuInfo(): NativeCpuInfo | null;
  getGpuInfo(): NativeGpuInfo | null;
  getDisplayInfo(): NativeDisplayInfo | null;
  getCameraInfo(): NativeCameraInfo | null;
  getTorchInfo(): NativeTorchInfo | null;
  setTorch(enabled: boolean): NativeTorchResult | null;
  getVibrationInfo(): NativeVibrationInfo | null;
}

export default requireNativeModule<HardwareExtModule>('HardwareExt');
