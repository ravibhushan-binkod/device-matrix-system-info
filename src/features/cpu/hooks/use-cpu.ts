import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import type { CpuInfo, GpuInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { readCpuInfo } from '@/features/cpu/services/cpu-service';

/** Core frequencies move constantly; 3 s keeps the bars alive but cheap. */
const POLL_MS = 3_000;

/**
 * CPU & GPU data: one read on focus and every poll tick, plus pull-to-refresh.
 * Both results are `null` until the first read lands — the screen shows
 * skeletons until then.
 */
export function useCpu() {
  const [cpu, setCpu] = useState<Result<CpuInfo> | null>(null);
  const [gpu, setGpu] = useState<Result<GpuInfo> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const result = readCpuInfo();
    setCpu(result.cpu);
    setGpu(result.gpu);
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  return { cpu, gpu, refreshing, refresh, isPolling };
}
