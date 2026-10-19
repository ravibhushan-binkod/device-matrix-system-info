import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type Options = {
  /** Interval between ticks in milliseconds. */
  intervalMs: number;
  /** Set false to pause polling without unmounting. */
  enabled?: boolean;
  /** Run once right away when polling becomes active (default true). */
  immediate?: boolean;
};

/**
 * The one shared polling hook: ticks on an interval, pauses while the screen
 * is not focused and stops while the app is in the background.
 */
export function usePolling(callback: () => void, options: Options) {
  const { intervalMs, enabled = true, immediate = true } = options;

  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const isPolling = enabled && isFocused && appState === 'active';

  useEffect(() => {
    if (!isPolling || intervalMs <= 0) return;

    let cancelled = false;
    const tick = () => {
      if (!cancelled) callbackRef.current();
    };

    if (immediate) tick();
    const id = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isPolling, intervalMs, immediate]);

  return { isPolling, isFocused, appState };
}
