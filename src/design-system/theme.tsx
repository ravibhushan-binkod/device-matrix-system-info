import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getSystemAccentPalette } from '@/core/native/theme-ext';
import {
  accentSecondaries,
  accents,
  palettes,
  type AccentName,
  type AppColors,
  type ColorScheme,
} from '@/design-system/tokens';

export type ThemeMode = 'system' | 'dark' | 'light';

/** 'system' follows Android 12's dynamic-colour tones; older Android falls back to Cyan. */
export type AccentChoice = AccentName | 'system';

export type ThemeValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  accent: AccentChoice;
  colors: AppColors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

type Props = {
  mode?: ThemeMode;
  accent?: AccentChoice;
  children: ReactNode;
};

/**
 * Dark-first theme. `mode` follows the system by default; `accent` replaces
 * the highlight colour and its companion gradient tone (persisted in
 * settings). Both are wired in the root layout from the settings store.
 */
export function ThemeProvider({ mode = 'system', accent = 'cyan', children }: Props) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const systemPalette = useMemo(
    () => (accent === 'system' ? getSystemAccentPalette() : null),
    [accent],
  );

  const value = useMemo<ThemeValue>(() => {
    const base = palettes[scheme];
    if (accent === 'system' && systemPalette) {
      return {
        mode,
        scheme,
        accent,
        colors: {
          ...base,
          accent: scheme === 'dark' ? systemPalette.accentDark : systemPalette.accentLight,
          violet: scheme === 'dark' ? systemPalette.secondaryDark : systemPalette.secondaryLight,
        },
      };
    }

    const name: AccentName = accent === 'system' ? 'cyan' : accent;
    return {
      mode,
      scheme,
      accent,
      colors: {
        ...base,
        accent: accents[name][scheme],
        violet: accentSecondaries[name][scheme],
      },
    };
  }, [mode, scheme, accent, systemPalette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return value;
}
