import { useCallback, useRef, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import {
  getDataUsage,
  getDataUsageTopApps,
  hasUsageAccess,
  type DataUsage,
  type DataUsageTopApps,
} from '@/core/native';
import type { Result } from '@/core/result';
import { usageWindow, type DataUsageRange } from '@/features/network/services/data-usage-service';

/** The app-op check is tiny; 1.5 s catches the grant right after the user returns. */
const POLL_MS = 1_500;

/**
 * Data usage behind Usage Access: the selected range's Wi-Fi/mobile series,
 * the per-app totals behind it and the special-permission flow in between.
 * The range query runs off the JS thread in the native module.
 */
export function useDataUsage() {
  const [usageAccess, setUsageAccess] = useState<boolean | null>(null);
  const [range, setRange] = useState<DataUsageRange>('today');
  const [usage, setUsage] = useState<Result<DataUsage> | null>(null);
  const [topApps, setTopApps] = useState<Result<DataUsageTopApps> | null>(null);
  const [loading, setLoading] = useState(false);

  const requestId = useRef(0);
  const rangeRef = useRef<DataUsageRange>('today');
  const wasGranted = useRef(false);
  const { notice, open } = useSystemSettings();

  const loadRange = useCallback(async (nextRange: DataUsageRange) => {
    const id = ++requestId.current;
    setLoading(true);
    const window = usageWindow(nextRange, new Date());
    const [usageResult, appsResult] = await Promise.all([
      getDataUsage(window.startMs, window.endMs, window.bucketMs),
      getDataUsageTopApps(window.startMs, window.endMs),
    ]);
    // A newer request (range switch) or a stale poll response loses.
    if (requestId.current !== id) return;
    setUsage(usageResult);
    setTopApps(appsResult);
    setLoading(false);
  }, []);

  /**
   * The grant check runs on the shared poll, which already pauses off-screen.
   * Loading only on the denied→granted edge also keeps the 1.5 s poll cheap.
   */
  const check = useCallback(() => {
    const result = hasUsageAccess();
    const granted = result.status === 'ok' && result.value;
    setUsageAccess(granted);
    if (granted && !wasGranted.current) {
      wasGranted.current = true;
      void loadRange(rangeRef.current);
    } else if (!granted) {
      wasGranted.current = false;
    }
  }, [loadRange]);

  usePolling(check, { intervalMs: POLL_MS });

  const changeRange = useCallback(
    (next: DataUsageRange) => {
      rangeRef.current = next;
      setRange(next);
      void loadRange(next);
    },
    [loadRange],
  );

  const refresh = useCallback(() => {
    void loadRange(rangeRef.current);
  }, [loadRange]);

  const openSettings = useCallback(() => open('usage-access'), [open]);

  return {
    usageAccess,
    range,
    setRange: changeRange,
    usage,
    topApps,
    loading,
    refresh,
    notice,
    openSettings,
  };
}
