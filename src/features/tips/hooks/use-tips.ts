import { useCallback, useEffect, useRef, useState } from 'react';

import { describeResult } from '@/core/result';
import { openSystemSettings, type SystemSettingsTarget } from '@/core/system-settings';
import { runCheckUp } from '@/features/tips/services/tips-service';
import type { TipsReport } from '@/features/tips/types';

/** The reads take milliseconds; the scan animation needs a moment to read. */
const ANIMATION_MS = 900;

export type CheckUpStatus = 'idle' | 'running' | 'done';

/**
 * The Tips screen state: run the check-up (with a short scan animation) and
 * open the system screen behind a "Fix it" button.
 */
export function useTips() {
  const [status, setStatus] = useState<CheckUpStatus>('idle');
  const [report, setReport] = useState<TipsReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setNotice(null);
    setStatus('running');
    const next = runCheckUp();
    timer.current = setTimeout(() => {
      timer.current = null;
      setReport(next);
      setStatus('done');
    }, ANIMATION_MS);
  }, []);

  const openFix = useCallback((target: SystemSettingsTarget) => {
    setNotice(null);
    openSystemSettings(target)
      .then((result) => {
        if (result.status === 'unavailable') {
          setNotice(result.reason);
        } else if (result.status === 'denied') {
          setNotice(describeResult(result));
        }
      })
      .catch(() => setNotice('That settings screen could not be opened.'));
  }, []);

  return { status, report, notice, run, openFix };
}
