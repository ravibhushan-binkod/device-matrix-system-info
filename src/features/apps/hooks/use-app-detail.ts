import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { InstalledApp } from '@/core/native';
import { describeResult, type Result } from '@/core/result';
import { openAppInfoSettings, readAppDetail } from '@/features/apps/services/apps-service';

/** One app's metadata plus the hand-off to the system "App info" screen. */
export function useAppDetail(packageName: string) {
  const [app, setApp] = useState<Result<InstalledApp> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readAppDetail(packageName).then((result) => {
        if (!cancelled) setApp(result);
      });
      return () => {
        cancelled = true;
      };
    }, [packageName]),
  );

  const openInfo = useCallback(() => {
    const result = openAppInfoSettings(packageName);
    if (result.status !== 'ok') {
      setNotice(result.status === 'unavailable' ? result.reason : describeResult(result));
    }
  }, [packageName]);

  return { app, notice, openInfo };
}
