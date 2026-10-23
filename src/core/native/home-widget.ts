import { requireOptionalNativeModule } from 'expo';

import { ok, unavailable, type Result } from '@/core/result';

export type WidgetThemeChoice = 'system' | 'light' | 'dark';
export type WidgetAccentName =
  'cyan' | 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'teal' | 'indigo';

export type WidgetAppearance = {
  theme: WidgetThemeChoice;
  /** `match` follows the app's accent; otherwise one of the eight swatches. */
  accent: WidgetAccentName | 'match';
  /** Only present when `accent` is `match`. */
  accentLight: string | null;
  accentDark: string | null;
};

type NativeAppearance = {
  theme: string | null;
  accent: string | null;
  matchApp: boolean;
  accentLight: number | null;
  accentDark: number | null;
};

type NativeHomeWidgetModule = {
  getAppearance(): NativeAppearance | null;
  setAppearance(
    theme: string,
    accent: string,
    accentLight: string | null,
    accentDark: string | null,
  ): number | null;
  setUnitPreferences(temperature: string, storage: string): void;
};

let cached: NativeHomeWidgetModule | null | undefined;

function getModule(): NativeHomeWidgetModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireOptionalNativeModule<NativeHomeWidgetModule>('HomeWidget');
  } catch {
    cached = null;
  }
  return cached;
}

function themeOrSystem(value: string | null): WidgetThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function accentOrCyan(value: string | null): WidgetAccentName {
  return value === 'blue' ||
    value === 'violet' ||
    value === 'green' ||
    value === 'amber' ||
    value === 'rose' ||
    value === 'teal' ||
    value === 'indigo'
    ? value
    : 'cyan';
}

function color(value: number | null): string | null {
  if (value == null) return null;
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Reads the theme/accent last saved for the home-screen widgets. */
export function getWidgetAppearance(): Result<WidgetAppearance> {
  const module = getModule();
  if (!module) return unavailable('Home-screen widgets are not in this build.');
  try {
    const raw = module.getAppearance();
    if (!raw) return unavailable('The widget appearance could not be read.');
    const accent = accentOrCyan(raw.accent);
    return ok({
      theme: themeOrSystem(raw.theme),
      accent: raw.matchApp ? 'match' : accent,
      accentLight: color(raw.accentLight),
      accentDark: color(raw.accentDark),
    });
  } catch {
    return unavailable('The widget appearance could not be read.');
  }
}

/**
 * Saves the chosen theme/accent for every placed widget and refreshes their
 * RemoteViews. Per-instance transparency and motion are preserved natively.
 */
export function setWidgetAppearance(appearance: WidgetAppearance): Result<number> {
  const module = getModule();
  if (!module) return unavailable('Home-screen widgets are not in this build.');
  const fallback = appearance.accent === 'match' ? 'cyan' : appearance.accent;
  try {
    const updated = module.setAppearance(
      appearance.theme,
      fallback,
      appearance.accent === 'match' ? appearance.accentLight : null,
      appearance.accent === 'match' ? appearance.accentDark : null,
    );
    return ok(updated ?? 0);
  } catch {
    return unavailable('The widget appearance could not be saved.');
  }
}
