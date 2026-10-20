import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AppStorageStats } from '@/core/native';
import type { Result } from '@/core/result';
import { readStorageStats } from '@/features/apps/services/apps-service';

/**
 * Per-app sizes for the installed-app list. Android reports one app at a time,
 * so the scan runs after the list is already on screen and only while Usage
 * Access is granted — without it the reading stays null and the rows say so.
 */
export function useInstalledSizes(granted: boolean | null) {
  const [storage, setStorage] = useState<Result<AppStorageStats[]> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (granted !== true) {
        setStorage(null);
        return;
      }
      let cancelled = false;
      readStorageStats().then((result) => {
        if (!cancelled) setStorage(result);
      });
      return () => {
        cancelled = true;
      };
    }, [granted]),
  );

  return storage;
}
