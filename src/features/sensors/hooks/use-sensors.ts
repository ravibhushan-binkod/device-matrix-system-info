import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { SensorDescriptor } from '@/core/native';
import type { Result } from '@/core/result';
import { readSensors } from '@/features/sensors/services/sensor-service';

/**
 * The sensor list only changes when the hardware does, so this reads once per
 * focus instead of polling. `sensors` is `null` until the first read lands.
 */
export function useSensors() {
  const [sensors, setSensors] = useState<Result<SensorDescriptor[]> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSensors(readSensors());
    }, []),
  );

  return { sensors };
}
