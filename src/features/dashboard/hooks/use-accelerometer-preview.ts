import { useEffect, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { subscribeToSensor } from '@/core/native';
import { failureMessage } from '@/core/result';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';

export type AccelerometerPreview = {
  available: boolean;
  streaming: boolean;
  /** Tilt on the X axis, -1..1. */
  x: SharedValue<number>;
  /** Tilt on the Y axis, -1..1. */
  y: SharedValue<number>;
  reason: string | null;
};

function clampTilt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value / 9.81));
}

/**
 * Live accelerometer for the Sensors tile. The native callback writes directly
 * to shared values, so the 50 Hz stream never re-renders the dashboard. The
 * subscription is removed on blur, app background, Reduced/Off or unmount.
 */
export function useAccelerometerPreview(type: number | null): AccelerometerPreview {
  const focused = useScreenFocused();
  const { loops } = useMotionPreference();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [streaming, setStreaming] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (type == null) {
      x.value = 0;
      y.value = 0;
      return;
    }
    if (!focused || !loops) {
      x.value = 0;
      y.value = 0;
      return;
    }

    let active = true;
    const subscription = subscribeToSensor(type, (reading) => {
      const [rawX = 0, rawY = 0] = reading.values;
      x.value = clampTilt(rawX);
      y.value = clampTilt(rawY);
    });

    const timer = setTimeout(() => {
      if (!active) return;
      if (subscription.status === 'ok') {
        setStreaming(true);
        setReason(null);
      } else {
        setStreaming(false);
        setReason(failureMessage(subscription));
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      if (subscription.status === 'ok') subscription.value.remove();
    };
  }, [focused, loops, type, x, y]);

  const paused = type == null || !focused || !loops;

  return {
    available: type != null,
    streaming: !paused && streaming,
    x,
    y,
    reason: paused ? null : reason,
  };
}
