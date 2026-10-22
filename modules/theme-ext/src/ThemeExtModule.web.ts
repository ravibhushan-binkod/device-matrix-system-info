import { registerWebModule, NativeModule } from 'expo';

import type { NativeSystemAccentPalette } from './ThemeExt.types';

class ThemeExtModule extends NativeModule<Record<string, never>> {
  getSystemAccentPalette(): NativeSystemAccentPalette | null {
    return null;
  }
}

export default registerWebModule(ThemeExtModule, 'ThemeExt');
