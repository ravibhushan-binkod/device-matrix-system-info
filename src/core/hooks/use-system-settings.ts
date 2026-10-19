import { useCallback, useEffect, useRef, useState } from 'react';

import { openSystemSettings, type SystemSettingsTarget } from '@/core/system-settings';

const NOTICE_MS = 5000;

/**
 * Launches system settings screens and exposes a short-lived notice when the
 * device cannot handle the request. UI code never talks to intents directly.
 */
export function useSystemSettings() {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const showNotice = useCallback(
    (message: string) => {
      clearTimer();
      setNotice(message);
      timer.current = setTimeout(() => {
        setNotice(null);
        timer.current = null;
      }, NOTICE_MS);
    },
    [clearTimer],
  );

  const open = useCallback(
    (target: SystemSettingsTarget) => {
      void openSystemSettings(target)
        .then((result) => {
          if (result.status === 'ok') return;
          showNotice(
            result.status === 'denied' ? `Permission needed: ${result.permission}` : result.reason,
          );
        })
        .catch(() => showNotice('That screen could not be opened on this device.'));
    },
    [showNotice],
  );

  return { notice, open };
}
