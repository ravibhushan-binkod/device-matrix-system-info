import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AppOverview, AppStorageStats } from '@/core/native';
import { ok, type Result } from '@/core/result';
import {
  readAppOverview,
  readStorageStats,
  readUsageAccess,
} from '@/features/apps/services/apps-service';

/**
 * The analyzer's data: one lightweight pass over every launcher app plus the
 * per-app sizes when Usage Access allows them. The size scan is skipped — and
 * an empty list recorded — when the grant is missing, so the size chart can
 * say why instead of pretending there are no apps.
 */
export function useAppOverview() {
  const [overview, setOverview] = useState<Result<AppOverview[]> | null>(null);
  const [storage, setStorage] = useState<Result<AppStorageStats[]> | null>(null);
  const [usageAccess, setUsageAccess] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readAppOverview().then((result) => {
        if (cancelled) return;
        setOverview(result);
        const access = readUsageAccess();
        const granted = access.status === 'ok' ? access.value : false;
        setUsageAccess(granted);
        if (!granted) {
          setStorage(ok([]));
          return;
        }
        readStorageStats().then((storageResult) => {
          if (!cancelled) setStorage(storageResult);
        });
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { overview, storage, usageAccess };
}
