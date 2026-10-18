import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import {
  readHardwareSummary,
  type HardwareSummary,
} from '@/features/hardware/services/hardware-service';

/** The hub values move slowly; 5 s matches the Home dashboard. */
const POLL_MS = 5_000;

/**
 * Hardware hub data: one summary read on focus and every poll tick, plus
 * pull-to-refresh. `summary` is `null` until the first read lands — the hub
 * shows skeletons until then.
 */
export function useHardware() {
  const [summary, setSummary] = useState<HardwareSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setSummary(readHardwareSummary());
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { summary, refreshing, refresh, isPolling };
}
