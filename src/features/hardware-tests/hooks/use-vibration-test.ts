import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  playTestVibration,
  readVibrationSupport,
  stopTestVibration,
} from '@/features/hardware-tests/services/hardware-test-service';

const PATTERN_MS = 1_000;

/**
 * Vibration motor support plus a short pattern. `cancel()` runs on blur,
 * unmount and background so a pattern never outlives the screen.
 */
export function useVibrationTest() {
  const [hasVibrator, setHasVibrator] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    stopTestVibration();
    setPlaying(false);
  }, [clearTimer]);

  const run = useCallback(() => {
    clearTimer();
    playTestVibration();
    setPlaying(true);
    timer.current = setTimeout(() => {
      stopTestVibration();
      setPlaying(false);
      timer.current = null;
    }, PATTERN_MS);
  }, [clearTimer]);

  useFocusEffect(
    useCallback(() => {
      const support = readVibrationSupport();
      setHasVibrator(support.status === 'ok' ? support.value : false);
      setError(
        support.status === 'ok'
          ? null
          : support.status === 'denied'
            ? `Permission needed: ${support.permission}`
            : support.reason,
      );
      return () => stop();
    }, [stop]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => subscription.remove();
  }, [stop]);

  useEffect(() => clearTimer, [clearTimer]);

  return { hasVibrator, error, playing, run, stop };
}
