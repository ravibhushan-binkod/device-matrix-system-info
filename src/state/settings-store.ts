import { create } from 'zustand';

import { getString, setString } from '@/core/storage/mmkv';
import type { ThemeMode } from '@/design-system/theme';
import { accents, type AccentName } from '@/design-system/tokens';

const THEME_KEY = 'settings.themeMode';
const ACCENT_KEY = 'settings.accent';

function readThemeMode(): ThemeMode {
  const stored = getString(THEME_KEY);
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
}

function readAccent(): AccentName {
  const stored = getString(ACCENT_KEY);
  return stored != null && stored in accents ? (stored as AccentName) : 'cyan';
}

type SettingsState = {
  themeMode: ThemeMode;
  accent: AccentName;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentName) => void;
};

/** Lightweight app settings, persisted in MMKV. */
export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: readThemeMode(),
  accent: readAccent(),
  setThemeMode: (themeMode) => {
    setString(THEME_KEY, themeMode);
    set({ themeMode });
  },
  setAccent: (accent) => {
    setString(ACCENT_KEY, accent);
    set({ accent });
  },
}));
