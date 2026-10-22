import { useCallback, useEffect, useState } from 'react';

import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';
import { readTodayUsage } from '@/features/dashboard/services/dashboard-service';
import type { TodayUsage } from '@/features/dashboard/types';

/**
 * "Most used today". Usage Access is a special permission, so the read is
 * async and only runs while Home is actually visible. Returning from system
 * Settings refreshes it automatically.
 */
export function useTodayUsage() {
  const focused = useScreenFocused();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<{ key: number; usage: TodayUsage } | null>(null);

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const key = reloadKey;
    readTodayUsage()
      .then((next) => {
        if (!cancelled) setState({ key, usage: next });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            key,
            usage: {
              granted: true,
              apps: [],
              totalTimeMs: null,
              reason: 'Android did not return today’s usage.',
            },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [focused, reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    usage: state?.usage ?? null,
    loading: focused && state?.key !== reloadKey,
    refresh,
  };
}
