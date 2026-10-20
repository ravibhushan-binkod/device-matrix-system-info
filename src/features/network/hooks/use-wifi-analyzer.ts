import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { usePolling } from '@/core/hooks/use-polling';
import { getWifiScanResults, startWifiScan } from '@/core/native';
import {
  NEARBY_WIFI_DEVICES_PERMISSION,
  WIFI_NAME_PERMISSION,
  usePermission,
} from '@/core/permissions';
import {
  enrichNetworks,
  type AnalyzerNetwork,
} from '@/features/network/services/wifi-analyzer-service';

/** Reading the scan cache is cheap (no radio work); 30 s keeps the ages honest. */
const POLL_MS = 30_000;

/** The scan has to land in the cache before it can be read back. */
const FIRST_READ_MS = 1_500;
const SECOND_READ_MS = 4_000;

/**
 * The Wi-Fi analyzer: the cached scan list plus the two permission flows it
 * needs. Android 13+ needs Nearby devices before a scan, and the location
 * permission before network names appear (Android treats them as location).
 */
export function useWifiAnalyzer() {
  const [results, setResults] = useState<{
    networks: AnalyzerNetwork[];
    lastScanAgeMs: number | null;
    scanThrottleEnabled: boolean | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const location = usePermission(WIFI_NAME_PERMISSION);
  const nearby = usePermission(NEARBY_WIFI_DEVICES_PERMISSION);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const readCache = useCallback(() => {
    const result = getWifiScanResults();
    if (result.status === 'ok') {
      setResults({
        networks: enrichNetworks(result.value.networks),
        lastScanAgeMs: result.value.lastScanAgeMs,
        scanThrottleEnabled: result.value.scanThrottleEnabled,
      });
      setError(null);
    } else if (result.status === 'denied') {
      // The permission went away — the banners explain the way back.
      setResults(null);
      setError(null);
    } else {
      setError(result.reason);
    }
  }, []);

  usePolling(readCache, { intervalMs: POLL_MS });

  const scan = useCallback(() => {
    setNotice(null);
    const started = startWifiScan();
    if (started.status === 'denied') {
      setNotice('Android did not allow a scan. Allow Wi-Fi scanning, then try again.');
      readCache();
      return;
    }
    if (started.status !== 'ok') {
      setNotice(started.reason);
      return;
    }
    if (!started.value.started) {
      setNotice(
        'Android limits Wi-Fi scans (about four every two minutes). Showing the results from the last scan.',
      );
      readCache();
      return;
    }
    setScanning(true);
    const first = setTimeout(() => {
      readCache();
      setScanning(false);
    }, FIRST_READ_MS);
    // Some devices take a little longer to fill the cache; read once more
    // without keeping the spinner up.
    const second = setTimeout(readCache, SECOND_READ_MS);
    timers.current.push(first, second);
  }, [readCache]);

  const networks = useMemo(() => results?.networks ?? [], [results]);

  /** Android 13+ requires Nearby devices before a scan will start. */
  const needsNearbyPermission = typeof Platform.Version === 'number' && Platform.Version >= 33;
  const scanPermissionGranted = needsNearbyPermission ? nearby.granted : location.granted;
  /** Network names and addresses stay hidden without the location permission. */
  const namesGranted = location.granted;

  return {
    networks,
    lastScanAgeMs: results?.lastScanAgeMs ?? null,
    scanThrottleEnabled: results?.scanThrottleEnabled ?? null,
    error,
    notice,
    scanning,
    location,
    nearby,
    needsNearbyPermission,
    scanPermissionGranted,
    namesGranted,
    scan,
    refresh: readCache,
  };
}
