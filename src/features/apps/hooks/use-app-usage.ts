import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { AppStorageStats, AppUsageTotal } from '@/core/native';
import type { Result } from '@/core/result';
import { readStorageStats, readUsageTotals } from '@/features/apps/services/apps-service';
import type { UsageRange } from '@/features/apps/types';

/** One screen-time reading tagged with the range it was taken for. */
export type UsageReading = {
  range: UsageRange;
  result: Result<AppUsageTotal[]>;
};

/**
 * Screen-time and app-size readings. Nothing is read without Usage Access.
 * Screen time reloads for the focused range (and again on every focus); the
 * size scan runs once and can be repeated from the screen, because Android
 * reports sizes one app at a time.
 */
export function useAppUsage(granted: boolean | null) {
  const [range, setRange] = useState<UsageRange>('today');
  const [usage, setUsage] = useState<UsageReading | null>(null);
  const [storage, setStorage] = useState<Result<AppStorageStats[]> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (granted !== true) return;
      let cancelled = false;
      readUsageTotals(range).then((result) => {
        if (!cancelled) setUsage({ range, result });
      });
      return () => {
        cancelled = true;
      };
    }, [granted, range]),
  );

  useEffect(() => {
    if (granted !== true || storage !== null) return;
    let cancelled = false;
    readStorageStats().then((result) => {
      if (!cancelled) setStorage(result);
    });
    return () => {
      cancelled = true;
    };
  }, [granted, storage]);

  /** Clears the reading so the effect scans again (and the screen shows it). */
  const scanStorage = useCallback(() => setStorage(null), []);

  return { usage, range, setRange, storage, scanStorage };
}
