import { requireOptionalNativeModule } from 'expo';
import type ThemeExtModule from '@modules/theme-ext/src/ThemeExtModule';
import type { NativeSystemAccentPalette } from '@modules/theme-ext/src/ThemeExt.types';

/** Instance type of the native module class (`import type` keeps the require erased). */
type NativeThemeExtModule = typeof ThemeExtModule;

export type SystemAccentPalette = {
  accentDark: string;
  accentLight: string;
  secondaryDark: string;
  secondaryLight: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

let cached: NativeThemeExtModule | null | undefined;

function getModule(): NativeThemeExtModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeThemeExtModule>('ThemeExt');
  } catch {
    cached = null;
  }
  return cached;
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

/**
 * Android 12+ system accent tones. `null` on older Android, in a JS-only
 * build, or when an OEM omits the tonal resources — the caller then keeps the
 * app's default accent.
 */
export function getSystemAccentPalette(): SystemAccentPalette | null {
  const module = getModule();
  if (!module) return null;
  try {
    const raw: NativeSystemAccentPalette | null = module.getSystemAccentPalette();
    if (!raw) return null;
    if (
      !isHex(raw.accentDark) ||
      !isHex(raw.accentLight) ||
      !isHex(raw.secondaryDark) ||
      !isHex(raw.secondaryLight)
    ) {
      return null;
    }
    return {
      accentDark: raw.accentDark,
      accentLight: raw.accentLight,
      secondaryDark: raw.secondaryDark,
      secondaryLight: raw.secondaryLight,
    };
  } catch {
    return null;
  }
}

/** Whether this device can supply a system accent palette. */
export function systemAccentSupported(): boolean {
  return getSystemAccentPalette() != null;
}
