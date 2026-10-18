import { useColorScheme } from 'react-native';

import { palettes, type AppColors, type ColorScheme } from '@/theme/tokens';

/**
 * Dark-first: when the system has no preference yet, dark is the default.
 * A user-facing theme override arrives with the settings feature (V1).
 */
export function useAppTheme(): { scheme: ColorScheme; colors: AppColors } {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'light' ? 'light' : 'dark';

  return { scheme, colors: palettes[scheme] };
}
