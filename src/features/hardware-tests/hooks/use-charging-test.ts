import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { BatteryReading } from '@/core/native';
import type { Result } from '@/core/result';
import { ok } from '@/core/result';
import {
  readBattery,
  subscribeToTestBattery,
} from '@/features/hardware-tests/services/hardware-test-service';
import { isPlugged } from '@/features/hardware-tests/services/test-logic';

/**
 * Live charging state for the check. The battery broadcast subscription is
 * registered only while focused and removed on blur/unmount.
 */
export function useChargingTest() {
  const [reading, setReading] = useState<Result<BatteryReading> | null>(null);
  const [seenPlugged, setSeenPlugged] = useState(false);
  const [seenUnplugged, setSeenUnplugged] = useState(false);

  const apply = useCallback((result: Result<BatteryReading>) => {
    setReading(result);
    if (result.status !== 'ok') return;
    if (isPlugged(result.value.plugged)) {
      setSeenPlugged(true);
    } else {
      setSeenUnplugged(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      apply(readBattery());
      const subscription = subscribeToTestBattery((next) => apply(ok(next)));
      return () => {
        if (subscription.status === 'ok') subscription.value.remove();
      };
    }, [apply]),
  );

  return {
    reading,
    seenPlugged,
    seenUnplugged,
    plugged: reading?.status === 'ok' ? isPlugged(reading.value.plugged) : null,
  };
}
