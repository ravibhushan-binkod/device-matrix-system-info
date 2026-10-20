import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { InstalledApp } from '@/core/native';
import type { Result } from '@/core/result';
import { readInstalledApps } from '@/features/apps/services/apps-service';

/**
 * The installed-app list: loads on focus, refreshes on demand. Icons make one
 * reading cost a few hundred milliseconds, so there is deliberately no polling.
 */
export function useApps() {
  const [apps, setApps] = useState<Result<InstalledApp[]> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);

  const load = useCallback(() => {
    const id = ++request.current;
    return readInstalledApps().then((result) => {
      if (request.current === id) setApps(result);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return { apps, refreshing, refresh };
}
