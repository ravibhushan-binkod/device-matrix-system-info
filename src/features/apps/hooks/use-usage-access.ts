import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { readUsageAccess } from '@/features/apps/services/apps-service';

/** The app-op check is tiny; 1.5 s catches the grant right after the user returns. */
const POLL_MS = 1500;

/**
 * Usage Access state. The check runs while this screen is focused — it is
 * paused while the app sits in the background (the user is in Settings), so
 * the grant is picked up immediately after they come back. `granted` stays
 * null until the first answer.
 */
export function useUsageAccess() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const { notice, open } = useSystemSettings();

  const check = useCallback(() => {
    const result = readUsageAccess();
    setGranted(result.status === 'ok' ? result.value : false);
  }, []);

  usePolling(check, { intervalMs: POLL_MS });

  const openSettings = useCallback(() => open('usage-access'), [open]);

  return { granted, notice, openSettings };
}
