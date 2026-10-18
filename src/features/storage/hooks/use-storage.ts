import { useCallback, useEffect, useRef, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import { clearAppCache, getAppCacheSize } from '@/core/native';
import type { StorageInfo } from '@/core/native';
import type { Result } from '@/core/result';
import { formatByteSize } from '@/core/utils/format-bytes';
import { readStorage } from '@/features/storage/services/storage-service';

/** Storage sizes change slowly; 10 s keeps it fresh and cheap. */
const POLL_MS = 10_000;
const NOTICE_MS = 5_000;

/**
 * Storage data plus the app-cache tools: sizes refresh on focus and every
 * poll tick, "clear cache" only ever touches this app's own cache directory,
 * and a short-lived notice reports the outcome.
 */
export function useStorage() {
  const [info, setInfo] = useState<Result<StorageInfo> | null>(null);
  const [cacheSize, setCacheSize] = useState<Result<number> | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notice: settingsNotice, open } = useSystemSettings();

  useEffect(
    () => () => {
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

  const load = useCallback(() => {
    setInfo(readStorage());
    setCacheSize(getAppCacheSize());
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

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
  };
}
