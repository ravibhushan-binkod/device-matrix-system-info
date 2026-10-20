import { useCallback, useEffect, useRef, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { clearAppCache, getAppCacheSize } from '@/core/native';
import type { StorageInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import { readStorageStats, readUsageAccess } from '@/features/apps/services/apps-service';
import {
  buildStorageBreakdown,
  readStorage,
  sumAppBytes,
  toStorageOverview,
} from '@/features/storage/services/storage-service';
import type { StorageBreakdown } from '@/features/storage/types';

/** Storage sizes change slowly; 10 s keeps it fresh and cheap. */
const POLL_MS = 10_000;
const NOTICE_MS = 5_000;

/**
 * Storage data plus the app-cache tools: sizes refresh on focus and every
 * poll tick, "clear cache" only ever touches this app's own cache directory,
 * and a short-lived notice reports the outcome.
 *
 * The apps / other / free breakdown needs Usage Access. The (cheap) app-op
 * check runs on every tick, while the (heavier) per-app storage query only
 * runs when the grant flips on or the user pulls to refresh.
 */
export function useStorage() {
  const [info, setInfo] = useState<Result<StorageInfo> | null>(null);
  const [cacheSize, setCacheSize] = useState<Result<number> | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [usageAccess, setUsageAccess] = useState<boolean | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const lastGranted = useRef<boolean | null>(null);
  const { notice: settingsNotice, open } = useSystemSettings();

  useEffect(
    () => () => {
      alive.current = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const showCacheNotice = useCallback((message: string) => {
    setCacheNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      setCacheNotice(null);
      noticeTimer.current = null;
    }, NOTICE_MS);
  }, []);

  const loadBreakdown = useCallback(async () => {
    const access = readUsageAccess();
    const granted = access.status === 'ok' ? access.value : false;
    if (!alive.current) return;
    setUsageAccess(granted);
    if (!granted) {
      setBreakdown(null);
      setBreakdownLoading(false);
      return;
    }

    setBreakdownLoading(true);
    try {
      const stats = await readStorageStats();
      const storage = readStorage();
      if (!alive.current) return;
      const overview = storage.status === 'ok' ? toStorageOverview(storage.value) : null;
      if (stats.status === 'ok' && overview != null && overview.status === 'ok') {
        setBreakdown(
          buildStorageBreakdown(
            overview.value.totalBytes,
            overview.value.totalBytes - overview.value.usedBytes,
            sumAppBytes(stats.value),
          ),
        );
      } else {
        setBreakdown(null);
      }
    } catch {
      if (alive.current) setBreakdown(null);
    } finally {
      if (alive.current) setBreakdownLoading(false);
    }
  }, []);

  const checkAccess = useCallback(() => {
    const access = readUsageAccess();
    const granted = access.status === 'ok' ? access.value : false;
    setUsageAccess(granted);
    if (granted && lastGranted.current !== true) {
      lastGranted.current = true;
      void loadBreakdown();
    } else if (!granted) {
      lastGranted.current = false;
      setBreakdown(null);
    }
  }, [loadBreakdown]);

  const load = useCallback(() => {
    setInfo(readStorage());
    setCacheSize(getAppCacheSize());
    checkAccess();
  }, [checkAccess]);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    if (lastGranted.current === true) void loadBreakdown();
    setRefreshing(false);
  }, [load, loadBreakdown]);

  const clearCache = useCallback(() => {
    setClearing(true);
    const result = clearAppCache();
    if (result.status === 'ok') {
      const { freedBytes, failedEntries } = result.value;
      if (freedBytes <= 0 && failedEntries === 0) {
        showCacheNotice('The app cache was already empty.');
      } else if (failedEntries > 0) {
        showCacheNotice(
          `Cleared ${formatByteSize(freedBytes)} · ${failedEntries} item(s) could not be removed.`,
        );
      } else {
        showCacheNotice(`Cleared ${formatByteSize(freedBytes)}.`);
      }
    } else if (result.status === 'unavailable') {
      showCacheNotice(result.reason);
    } else {
      showCacheNotice(`Permission needed: ${result.permission}`);
    }
    setCacheSize(getAppCacheSize());
    setClearing(false);
  }, [showCacheNotice]);

  return {
    info,
    cacheSize,
    clearing,
    clearCache,
    notice: cacheNotice ?? settingsNotice,
    openSettings: open,
    refreshing,
    refresh,
    isPolling,
    usageAccess,
    breakdown,
    breakdownLoading,
  };
}
