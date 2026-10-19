import { useIsFocused } from 'expo-router';

/**
 * True while the screen that rendered this component is focused.
 *
 * Looping visuals (gauge waves, shimmer placeholders) use it to stop their
 * animation loop as soon as their screen is covered or left, so no frame
 * callback keeps ticking behind the current screen.
 */
export function useScreenFocused(): boolean {
  return useIsFocused();
}
