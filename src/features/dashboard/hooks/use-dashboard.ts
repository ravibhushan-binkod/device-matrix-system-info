import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { readDashboardSummary } from '@/features/dashboard/services/dashboard-service';
import type { DashboardSummary } from '@/features/dashboard/types';

/** RAM, storage and battery move slowly; 5 s keeps the screen honest and cheap. */
const POLL_MS = 5_000;

/**
 * Dashboard data for the Home screen: one summary read on focus and every
 * poll tick, pull-to-refresh, and the quick-action launcher. `summary` is
 * `null` until the first read lands — the screen shows skeletons until then.
 */
export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { notice, open } = useSystemSettings();

  const load = useCallback(() => {
    setSummary(readDashboardSummary());
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { summary, refreshing, refresh, notice, openSettings: open };
}
