import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import type { Result } from '@/core/result';
import type { ResolvedUnits } from '@/core/units/types';
import { readThermalInfo } from '@/features/thermal/services/thermal-service';
import type { ThermalInfo } from '@/features/thermal/types';

/** Thermal headroom moves slowly; 5 s is enough and stays cheap. */
const POLL_MS = 5_000;

/**
 * Thermal data: one read on focus and every poll tick, plus pull-to-refresh.
 * `info` is `null` until the first read lands — the screen shows a skeleton
 * until then. The read re-runs when the unit choices change.
 */
export function useThermal(units: ResolvedUnits) {
  const [info, setInfo] = useState<Result<ThermalInfo> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setInfo(readThermalInfo(units));
  }, [units]);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { info, refreshing, refresh, isPolling };
}
