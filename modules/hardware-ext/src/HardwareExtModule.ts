import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeAudioOutput,
  NativeCameraInfo,
  NativeCpuInfo,
  NativeDisplayInfo,
  NativeGpuInfo,
  NativeToneResult,
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
  getAudioOutput(): NativeAudioOutput | null;
  startTone(route: string, channel: string, durationMs: number): NativeToneResult | null;
  stopTone(): boolean;
}

export default requireNativeModule<HardwareExtModule>('HardwareExt');
