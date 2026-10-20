import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  accents,
  palettes,
  type AccentName,
  type AppColors,
  type ColorScheme,
} from '@/design-system/tokens';

export type ThemeMode = 'system' | 'dark' | 'light';

export type ThemeValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  accent: AccentName;
  colors: AppColors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

type Props = {
  mode?: ThemeMode;
  accent?: AccentName;
  children: ReactNode;
};

/**
 * Dark-first theme. `mode` follows the system by default; `accent` replaces
 * the highlight colour (persisted in settings). Both are wired in the root
 * layout from the settings store.
 */
export function ThemeProvider({ mode = 'system', accent = 'cyan', children }: Props) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      scheme,
      accent,
      colors: { ...palettes[scheme], accent: accents[accent][scheme] },
    }),
    [mode, scheme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return value;
}
