export type ColorScheme = 'dark' | 'light';

export type AppColors = {
  background: string;
  surface: string;
  surface2: string;
  border: string;
  glassFrom: string;
  glassTo: string;
  primary: string;
  onPrimary: string;
  accent: string;
  violet: string;
  good: string;
  warning: string;
  critical: string;
  text: string;
  muted: string;
};

/**
 * Dark-first palette (base colours per the design brief).
 * `border`, `glassFrom`, `glassTo` and `onPrimary` are derived helper tokens
 * used by the glass cards, hairline dividers and coloured buttons.
 */
export const palettes: Record<ColorScheme, AppColors> = {
  dark: {
    background: '#0B0F14',
    surface: '#131A22',
    surface2: '#1A232D',
    border: 'rgba(232,238,245,0.09)',
    glassFrom: 'rgba(232,238,245,0.055)',
    glassTo: 'rgba(232,238,245,0.02)',
    primary: '#4F8CFF',
    onPrimary: '#FFFFFF',
    accent: '#22D3EE',
    violet: '#8B5CF6',
    good: '#22C55E',
    warning: '#F59E0B',
    critical: '#EF4444',
    text: '#E8EEF5',
    muted: '#8A98A8',
  },
  light: {
    background: '#F6F8FC',
    surface: '#FFFFFF',
    surface2: '#EEF2F7',
    border: 'rgba(17,24,39,0.10)',
    glassFrom: 'rgba(255,255,255,0.92)',
    glassTo: 'rgba(255,255,255,0.55)',
    primary: '#4F8CFF',
    onPrimary: '#FFFFFF',
    accent: '#22D3EE',
    violet: '#8B5CF6',
    good: '#22C55E',
    warning: '#F59E0B',
    critical: '#EF4444',
    text: '#111827',
    muted: '#667085',
  },
};

/** Accent colours the user can pick in settings (default: cyan). */
export type AccentName = 'cyan' | 'blue' | 'violet' | 'green';

export const accents: Record<AccentName, string> = {
  cyan: '#22D3EE',
  blue: '#4F8CFF',
  violet: '#8B5CF6',
  green: '#22C55E',
};

/** Spacing on a 4 dp grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  card: 20,
  button: 14,
  chip: 999,
} as const;

/** The five text styles — nothing else may invent a size. */
export const typography = {
  display: { fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 40 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 26 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, lineHeight: 18 },
} as const;
