import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { failureMessage } from '@/core/result';
import { readTorch, switchTorch } from '@/features/hardware-tests/services/hardware-test-service';

/**
 * Auto-starts the flashlight for the check and always turns it off again on
 * blur, unmount or background. This intentionally does not remember a torch
 * that was already on: leaving a test must never leave a light running.
 */
export function useTorchTest() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const turnOff = useCallback(() => {
    switchTorch(false);
    setOn(false);
  }, []);

  const turnOn = useCallback(() => {
    setNotice(null);
    const info = readTorch();
    if (info.status !== 'ok' || !info.value.available) {
      setAvailable(false);
      setNotice(
        info.status === 'ok' ? 'This device does not report a flashlight.' : failureMessage(info),
      );
      return false;
    }
    setAvailable(true);
    const result = switchTorch(true);
    if (result.status !== 'ok') {
      setOn(false);
      setNotice(failureMessage(result));
      return false;
    }
    setOn(true);
    return true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      turnOn();
      return () => {
        turnOff();
      };
    }, [turnOff, turnOn]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') turnOff();
    });
    return () => subscription.remove();
  }, [turnOff]);

  return { available, on, notice, turnOn, turnOff };
}
