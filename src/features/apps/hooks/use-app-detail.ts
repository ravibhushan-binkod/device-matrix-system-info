import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AppAnalyzer, InstalledApp } from '@/core/native';
import { describeResult, type Result } from '@/core/result';
import {
  openAppInfoSettings,
  readAppAnalyzer,
  readAppDetail,
} from '@/features/apps/services/apps-service';

/** One app's metadata plus the analyzer reading and the system "App info" hand-off. */
export function useAppDetail(packageName: string) {
  const [app, setApp] = useState<Result<InstalledApp> | null>(null);
  const [analyzer, setAnalyzer] = useState<Result<AppAnalyzer> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readAppDetail(packageName).then((result) => {
        if (!cancelled) setApp(result);
      });
      readAppAnalyzer(packageName).then((result) => {
        if (!cancelled) setAnalyzer(result);
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

  return { app, analyzer, notice, openInfo };
}
