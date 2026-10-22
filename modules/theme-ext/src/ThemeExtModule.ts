import { NativeModule, requireNativeModule } from 'expo';

import type { NativeSystemAccentPalette } from './ThemeExt.types';

declare class ThemeExtModule extends NativeModule<Record<string, never>> {
  /** Dynamic colours on Android 12+; `null` when the platform has no palette. */
  getSystemAccentPalette(): NativeSystemAccentPalette | null;
}

export default requireNativeModule<ThemeExtModule>('ThemeExt');
