import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * True while the screen that rendered this component is focused *and* the app
 * is in the foreground. Looping visuals use it to stop their animation clock
 * as soon as the screen is covered, left, or the app goes to the background.
 */
export function useScreenFocused(): boolean {
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  return isFocused && appState === 'active';
}
