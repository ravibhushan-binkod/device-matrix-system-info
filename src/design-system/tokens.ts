export type ColorScheme = 'dark' | 'light';

export type AppColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
};

/**
 * Dark-first palette. The light palette is the same token set so every screen
 * can be themed without conditions in the components.
 */
export const palettes: Record<ColorScheme, AppColors> = {
  dark: {
    background: '#0B0F14',
    surface: '#121A22',
    surfaceRaised: '#18222C',
    border: '#22303F',
    text: '#E8EEF4',
    textMuted: '#93A1B0',
    accent: '#4C9AFF',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF2F6',
    border: '#DDE5ED',
    text: '#0B0F14',
    textMuted: '#5B6B7B',
    accent: '#1F6FEB',
    success: '#047857',
    warning: '#B45309',
    danger: '#DC2626',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
