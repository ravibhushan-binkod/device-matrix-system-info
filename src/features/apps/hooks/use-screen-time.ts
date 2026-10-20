import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { ScreenTime } from '@/core/native';
import type { Result } from '@/core/result';
import { useApps } from '@/features/apps/hooks/use-apps';
import { useUsageAccess } from '@/features/apps/hooks/use-usage-access';
import {
  readScreenTime,
  screenTimeBars,
  screenTimeRanking,
} from '@/features/apps/services/apps-service';
import type { ScreenTimeRange } from '@/features/apps/types';

type Reading = {
  range: ScreenTimeRange;
  result: Result<ScreenTime>;
};

/**
 * Screen time for the selected range. Nothing is read without Usage Access;
 * the reading reloads on focus and for the focused range, so coming back from
 * the system settings screen picks up a fresh grant.
 */
export function useScreenTime() {
  const { apps } = useApps();
  const { granted, notice, openSettings } = useUsageAccess();
  const [range, setRange] = useState<ScreenTimeRange>('today');
  const [reading, setReading] = useState<Reading | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);

  const load = useCallback((nextRange: ScreenTimeRange) => {
    const id = ++request.current;
    return readScreenTime(nextRange).then((result) => {
      if (request.current === id) setReading({ range: nextRange, result });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (granted !== true) return;
      void load(range);
    }, [granted, range, load]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load(range).finally(() => setRefreshing(false));
  }, [load, range]);

  const all = useMemo(() => (apps?.status === 'ok' ? apps.value : []), [apps]);
  const current = reading != null && reading.range === range ? reading.result : null;
  const data = current?.status === 'ok' ? current.value : null;
  const ranking = useMemo(
    () => (data ? screenTimeRanking(all, data) : { rows: [], moreApps: 0, moreTimeMs: 0 }),
    [all, data],
  );
  const bars = useMemo(() => (data ? screenTimeBars(data) : []), [data]);

  return {
    granted,
    notice,
    openSettings,
    range,
    setRange,
    reading: current,
    ranking,
    bars,
    refresh,
    refreshing,
  };
}
