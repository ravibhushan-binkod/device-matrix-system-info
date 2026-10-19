import { useCallback, useEffect, useState } from 'react';

import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';
import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { getBatteryInfo, subscribeToBattery, type BatteryReading } from '@/core/native';
import { ok, type Result } from '@/core/result';

/** Android broadcasts battery changes; a 2 s poll keeps the graph steady. */
const POLL_MS = 2_000;
/** Graph window: 45 points ≈ 90 seconds at 2 s per point. */
const GRAPH_POINTS = 45;

/**
 * Live battery state for the Battery screen: instant updates from
 * ACTION_BATTERY_CHANGED, plus a steady poll that samples the live graph.
 * Both pause when the screen is not focused: the poll stops through
 * `usePolling` and the broadcast listener is registered only while focused.
 * `reading` is `null` until the first result lands — the screen shows
 * skeletons until then.
 */
export function useBattery() {
  const [reading, setReading] = useState<Result<BatteryReading> | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const focused = useScreenFocused();
  const { notice, open } = useSystemSettings();

  const sample = useCallback((result: Result<BatteryReading>) => {
    setReading(result);
    if (result.status === 'ok' && result.value.currentNowUa != null) {
      const milliamps = Math.round(result.value.currentNowUa / 1000);
      setSamples((previous) => [...previous, milliamps].slice(-GRAPH_POINTS));
    }
  }, []);

  const { isPolling } = usePolling(() => sample(getBatteryInfo()), { intervalMs: POLL_MS });

  // Push updates the moment Android broadcasts, only while the screen is focused.
  useEffect(() => {
    if (!focused) return;
    const subscription = subscribeToBattery((next) => setReading(ok(next)));
    return () => {
      if (subscription.status === 'ok') subscription.value.remove();
    };
  }, [focused]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    sample(getBatteryInfo());
    setRefreshing(false);
  }, [sample]);

  return { reading, samples, isPolling, refreshing, refresh, notice, openSettings: open };
}
