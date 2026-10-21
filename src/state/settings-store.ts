import { create } from 'zustand';

import { getString, setString } from '@/core/storage/mmkv';
import type { MotionMode } from '@/design-system/animations/motion';
import type { AccentChoice, ThemeMode } from '@/design-system/theme';
import { accents } from '@/design-system/tokens';

const THEME_KEY = 'settings.themeMode';
const ACCENT_KEY = 'settings.accent';
const ANIMATION_KEY = 'settings.animationMode';

function readThemeMode(): ThemeMode {
  const stored = getString(THEME_KEY);
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
}

function readAccent(): AccentChoice {
  const stored = getString(ACCENT_KEY);
  if (stored === 'system') return 'system';
  return stored != null && stored in accents ? (stored as AccentChoice) : 'cyan';
}

function readAnimationMode(): MotionMode {
  const stored = getString(ANIMATION_KEY);
  return stored === 'full' || stored === 'reduced' || stored === 'off' ? stored : 'full';
}

type SettingsState = {
  themeMode: ThemeMode;
  accent: AccentChoice;
  animationMode: MotionMode;
  /** Session-only: the low-end frame probe asked for Reduced. */
  autoReduced: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentChoice) => void;
  setAnimationMode: (mode: MotionMode) => void;
  markAutoReduced: () => void;
};

/** Lightweight app settings, persisted in MMKV. */
export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: readThemeMode(),
  accent: readAccent(),
  animationMode: readAnimationMode(),
  autoReduced: false,
  setThemeMode: (themeMode) => {
    setString(THEME_KEY, themeMode);
    set({ themeMode });
  },
  setAccent: (accent) => {
    setString(ACCENT_KEY, accent);
    set({ accent });
  },
  setAnimationMode: (animationMode) => {
    setString(ANIMATION_KEY, animationMode);
    set({ animationMode, autoReduced: false });
  },
  markAutoReduced: () => set({ autoReduced: true }),
}));
