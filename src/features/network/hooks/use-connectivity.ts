import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { usePolling } from '@/core/hooks/use-polling';
import type { BluetoothInfo, ConnectivityCapabilities, NfcInfo } from '@/core/native';
import { BLUETOOTH_STATE_PERMISSION, usePermission } from '@/core/permissions';
import type { Result } from '@/core/result';
import {
  readBluetooth,
  readConnectivityCapabilities,
  readNfc,
} from '@/features/network/services/network-service';

/** Bluetooth on/off changes rarely; polling keeps it fresh without cost. */
const POLL_MS = 5_000;

/**
 * Everything the Connectivity screen shows: the static capability list (read
 * once per screen visit), the radio states (polled) and the Nearby devices
 * permission flow for the Bluetooth state.
 */
export function useConnectivity() {
  const [capabilities, setCapabilities] = useState<Result<ConnectivityCapabilities> | null>(null);
  const [bluetooth, setBluetooth] = useState<Result<BluetoothInfo> | null>(null);
  const [nfc, setNfc] = useState<Result<NfcInfo> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bluetoothPermission = usePermission(BLUETOOTH_STATE_PERMISSION);

  const loadStates = useCallback(() => {
    setBluetooth(readBluetooth());
    setNfc(readNfc());
  }, []);

  const loadCapabilities = useCallback(() => {
    setCapabilities(readConnectivityCapabilities());
  }, []);

  usePolling(loadStates, { intervalMs: POLL_MS });

  // The feature list is static; a fresh read per visit is enough.
  useFocusEffect(useCallback(() => loadCapabilities(), [loadCapabilities]));

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadCapabilities();
    loadStates();
    setRefreshing(false);
  }, [loadCapabilities, loadStates]);

  return {
    capabilities,
    bluetooth,
    nfc,
    bluetoothPermission,
    refreshing,
    refresh,
  };
}
