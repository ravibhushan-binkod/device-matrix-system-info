import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { subscribeToSensor, type SensorReading } from '@/core/native';
import { vectorMagnitude } from '@/features/sensors/services/sensor-service';

/** Graph window: 60 points ≈ a few seconds at the UI sensor rate. */
const GRAPH_POINTS = 60;

/**
 * Live stream for one sensor type. The native listener runs only while the
 * screen is focused and is unregistered on blur/unmount through the
 * subscription's `remove()`. Start failures (missing sensor, blocked by the
 * OS) come back as `error` instead of a fake reading. State resets every time
 * the screen gains focus so a re-entry always starts from a fresh stream.
 */
export function useSensorStream(type: number | null) {
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (type == null) return;

      setReading(null);
      setSamples([]);
      setError(null);

      const subscription = subscribeToSensor(type, (next) => {
        setReading(next);
        const magnitude = vectorMagnitude(next.values);
        if (magnitude == null || !Number.isFinite(magnitude)) return;
        setSamples((previous) => [...previous, magnitude].slice(-GRAPH_POINTS));
      });

      if (subscription.status !== 'ok') {
        setError(
          subscription.status === 'denied'
            ? `Permission needed: ${subscription.permission}`
            : subscription.reason,
        );
        setStreaming(false);
        return;
      }

      setStreaming(true);
      const active = subscription.value;
      return () => {
        setStreaming(false);
        active.remove();
      };
    }, [type]),
  );

  return { reading, samples, streaming, error };
}
