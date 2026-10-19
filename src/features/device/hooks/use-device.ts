import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { readDeviceInfo } from '@/features/device/services/device-service';
import type { DeviceInfo } from '@/features/device/types';

/** Uptime keeps ticking; 10 s keeps the screen fresh without burning cycles. */
const POLL_MS = 10_000;

/**
 * Device & OS data: one read on focus and every poll tick, plus
 * pull-to-refresh. `info` is `null` until the first read lands — the screen
 * shows skeletons until then.
 */
export function useDevice() {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setInfo(readDeviceInfo());
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { info, refreshing, refresh, isPolling };
}
