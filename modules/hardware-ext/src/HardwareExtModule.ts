import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeAudioOutput,
  NativeCameraInfo,
  NativeCpuInfo,
  NativeDisplayInfo,
  NativeGpuInfo,
  NativeSoundLevelEvent,
  NativeSoundLevelResult,
  NativeToneResult,
  NativeTorchInfo,
  NativeTorchResult,
  NativeVibrationInfo,
  NativeVolumeKeyEvent,
  NativeVolumeKeyResult,
} from './HardwareExt.types';

type HardwareExtEvents = {
  onSoundLevel: (event: NativeSoundLevelEvent) => void;
  onVolumeKey: (event: NativeVolumeKeyEvent) => void;
};

declare class HardwareExtModule extends NativeModule<HardwareExtEvents> {
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
  startSoundLevel(): NativeSoundLevelResult | null;
  stopSoundLevel(): boolean;
  startVolumeKeyCapture(): NativeVolumeKeyResult | null;
  stopVolumeKeyCapture(): boolean;
}

export default requireNativeModule<HardwareExtModule>('HardwareExt');
