import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import {
  readDashboardInventory,
  readDashboardSummary,
} from '@/features/dashboard/services/dashboard-service';
import type { DashboardInventory, DashboardSummary } from '@/features/dashboard/types';

/** RAM, storage and battery move slowly; 5 s keeps the screen honest and cheap. */
const POLL_MS = 5_000;
/** Sparkline window: 24 samples at five seconds = two minutes. */
const HISTORY_LIMIT = 24;

/**
 * Dashboard data for the Home screen. The live summary polls every five
 * seconds and pauses when Home loses focus or the app backgrounds. The
 * sensor/camera inventory and the CPU/RAM sparkline history are separate so a
 * slow hardware read never delays the live tiles.
 */
export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [inventory, setInventory] = useState<DashboardInventory | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInventory = useCallback(() => {
    setInventory(readDashboardInventory());
  }, []);

  const load = useCallback(() => {
    const next = readDashboardSummary();
    setSummary(next);

    const cpu = next.cpu.status === 'ok' ? next.cpu.value.averageMhz : null;
    if (cpu != null) {
      setCpuHistory((history) => [...history, cpu].slice(-HISTORY_LIMIT));
    }
    const memory = next.memory.status === 'ok' ? next.memory.value.percent : null;
    if (memory != null) {
      setMemoryHistory((history) => [...history, memory].slice(-HISTORY_LIMIT));
    }
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory]),
  );

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setRefreshing(true);
    load();
    loadInventory();
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      setRefreshing(false);
    }, 260);
  }, [load, loadInventory]);

  return {
    summary,
    inventory,
    cpuHistory,
    memoryHistory,
    refreshing,
    refresh,
    refreshInventory: loadInventory,
  };
}
