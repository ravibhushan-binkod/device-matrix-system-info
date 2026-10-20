import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import type { TorchInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { readTorch, switchTorch } from '@/features/tools/services/tools-service';

/** The torch state changes rarely; 2 s is enough while the hub is visible. */
const POLL_MS = 2_000;

/** Flashlight state and toggle for the Tools hub (polls only while focused). */
export function useTorch() {
  const [info, setInfo] = useState<Result<TorchInfo> | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setInfo(readTorch());
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  const toggle = useCallback(
    (enabled: boolean) => {
      setBusy(true);
      setNotice(null);
      const result = switchTorch(enabled);
      if (result.status === 'unavailable') {
        setNotice(result.reason);
      } else if (result.status === 'denied') {
        setNotice('Permission denied');
      }
      load();
      setBusy(false);
    },
    [load],
  );

  return { info, busy, notice, toggle };
}
