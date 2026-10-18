import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import type { Result } from '@/core/result';
import { readMemoryStats } from '@/features/memory/services/memory-service';
import type { MemoryStats } from '@/features/memory/types';

/** RAM moves quickly; 3 s keeps the graph honest and stays cheap. */
const POLL_MS = 3_000;
/** Graph window: 45 points ≈ 135 s at 3 s per point. */
const GRAPH_POINTS = 45;

/**
 * Memory data: stats plus a live "available RAM" series (rounded MB). Polling
 * pauses on the shared hook rules and additionally while the user pauses the
 * graph; the samples freeze with it.
 */
export function useMemory() {
  const [stats, setStats] = useState<Result<MemoryStats> | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sample = useCallback(() => {
    const result = readMemoryStats();
    setStats(result);
    if (result.status === 'ok') {
      const megabytes = Math.round(result.value.availableBytes / 1_000_000);
      setSamples((previous) => [...previous, megabytes].slice(-GRAPH_POINTS));
    }
  }, []);

  const { isPolling } = usePolling(sample, { intervalMs: POLL_MS, enabled: !paused });

  const togglePause = useCallback(() => {
    setPaused((value) => !value);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    sample();
    setRefreshing(false);
  }, [sample]);

  return { stats, samples, paused, togglePause, isPolling, refreshing, refresh };
}
