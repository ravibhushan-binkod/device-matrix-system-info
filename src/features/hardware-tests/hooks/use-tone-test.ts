import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { AudioOutput, ToneChannel, ToneRoute } from '@/core/native';
import type { Result } from '@/core/result';
import { failureMessage } from '@/core/result';
import {
  playTone,
  readAudioOutput,
  stopTestTone,
} from '@/features/hardware-tests/services/hardware-test-service';

const TONE_MS = 10_000;

/**
 * One tone test at a time. Native playback is stopped when the screen loses
 * focus, on unmount and when the app goes to the background, so no sound can
 * keep playing behind another screen.
 */
export function useToneTest(route: ToneRoute) {
  const [playing, setPlaying] = useState(false);
  const [channel, setChannel] = useState<ToneChannel>('both');
  const [output, setOutput] = useState<Result<AudioOutput> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    stopTestTone();
    setPlaying(false);
  }, [clearTimer]);

  const play = useCallback(
    (nextChannel: ToneChannel) => {
      clearTimer();
      setNotice(null);
      setChannel(nextChannel);
      const result = playTone(route, nextChannel, TONE_MS);
      if (result.status !== 'ok') {
        setPlaying(false);
        setNotice(failureMessage(result));
        return result;
      }
      setOutput(readAudioOutput());
      setPlaying(true);
      timer.current = setTimeout(() => {
        stopTestTone();
        setPlaying(false);
        timer.current = null;
      }, TONE_MS);
      return result;
    },
    [clearTimer, route],
  );

  useFocusEffect(
    useCallback(() => {
      setOutput(readAudioOutput());
      return () => {
        stop();
      };
    }, [stop]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => subscription.remove();
  }, [stop]);

  useEffect(() => clearTimer, [clearTimer]);

  return { playing, channel, output, notice, play, stop };
}
