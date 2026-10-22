import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { SensorDescriptor, SensorReading, SensorSubscription } from '@/core/native';
import type { Result } from '@/core/result';
import { failureMessage } from '@/core/result';
import {
  readSensors,
  subscribeToTestSensor,
  SENSOR_TYPES,
} from '@/features/hardware-tests/services/hardware-test-service';

type SensorName = keyof typeof SENSOR_TYPES;

const LABELS: Record<SensorName, string> = {
  accelerometer: 'accelerometer',
  light: 'light sensor',
  proximity: 'proximity sensor',
};

/**
 * Descriptor and live stream for one Android sensor. Both are refreshed on
 * focus and the native listener is removed on blur/unmount.
 */
export function useSensorTest(name: SensorName) {
  const type = SENSOR_TYPES[name];
  const [descriptor, setDescriptor] = useState<SensorDescriptor | null>(null);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setReading(null);
      setHistory([]);
      setError(null);
      setLoading(true);
      let subscription: Result<SensorSubscription> | null = null;

      const sensors = readSensors();
      if (sensors.status !== 'ok') {
        setDescriptor(null);
        setError(failureMessage(sensors));
        setLoading(false);
        return () => undefined;
      }

      const found = sensors.value.find((sensor) => sensor.type === type) ?? null;
      setDescriptor(found);
      if (!found) {
        setError(`This device does not report a ${LABELS[name]}.`);
        setLoading(false);
        return () => undefined;
      }

      subscription = subscribeToTestSensor(type, (next) => {
        setReading(next);
        setHistory((current) => [...current.slice(-59), [...next.values]]);
      });
      if (subscription.status !== 'ok') {
        setError(failureMessage(subscription));
      }
      setLoading(false);

      return () => {
        if (subscription?.status === 'ok') subscription.value.remove();
      };
    }, [name, type]),
  );

  return {
    descriptor,
    reading,
    history,
    error,
    loading,
    available: descriptor != null && error == null,
  };
}
