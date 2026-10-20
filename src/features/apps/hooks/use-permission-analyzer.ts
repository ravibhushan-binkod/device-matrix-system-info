import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import type { PermissionApp } from '@/core/native';
import type { Result } from '@/core/result';
import { useApps } from '@/features/apps/hooks/use-apps';
import {
  mergePermissionApps,
  PERMISSION_GROUPS,
  readPermissionApps,
} from '@/features/apps/services/apps-service';
import type { PermissionAppRow, PermissionGroupKey } from '@/features/apps/types';

type Reading = {
  key: PermissionGroupKey;
  result: Result<PermissionApp[]>;
};

/** The selected permission group and the launcher apps that request it. */
export function usePermissionAnalyzer() {
  const { apps } = useApps();
  const [groupKey, setGroupKey] = useState<PermissionGroupKey>('camera');
  const [reading, setReading] = useState<Reading | null>(null);

  const group = PERMISSION_GROUPS.find((entry) => entry.key === groupKey) ?? PERMISSION_GROUPS[0];

  useFocusEffect(
    useCallback(() => {
      if (!group) return;
      let cancelled = false;
      readPermissionApps(group).then((result) => {
        if (!cancelled) setReading({ key: group.key, result });
      });
      return () => {
        cancelled = true;
      };
    }, [group]),
  );

  const all = useMemo(() => (apps?.status === 'ok' ? apps.value : []), [apps]);
  const current = reading != null && reading.key === groupKey ? reading.result : null;
  const rows = useMemo<PermissionAppRow[]>(
    () => (current?.status === 'ok' ? mergePermissionApps(all, current.value) : []),
    [all, current],
  );

  return { apps, group, groupKey, setGroupKey, reading: current, rows };
}
