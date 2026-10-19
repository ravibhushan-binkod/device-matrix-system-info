import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import type { DisplayInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { readDisplay } from '@/features/display/services/display-service';

/** Adaptive refresh and brightness move on their own; 5 s keeps them fresh. */
const POLL_MS = 5_000;

/**
 * Display data: one read on focus and every poll tick, plus pull-to-refresh
 * and the display-settings shortcut. `info` is `null` until the first read
 * lands — the screen shows a skeleton until then.
 */
export function useDisplay() {
  const [info, setInfo] = useState<Result<DisplayInfo> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { notice, open } = useSystemSettings();

  const load = useCallback(() => {
    setInfo(readDisplay());
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { info, refreshing, refresh, isPolling, notice, openSettings: open };
}
