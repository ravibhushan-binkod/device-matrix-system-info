import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import type { BluetoothInfo, ConnectivityInfo, NfcInfo, WifiInfo } from '@/core/native';
import {
  BLUETOOTH_STATE_PERMISSION,
  WIFI_NAME_PERMISSION,
  usePermission,
} from '@/core/permissions';
import type { Result } from '@/core/result';
import {
  readBluetooth,
  readConnectivity,
  readNfc,
  readWifi,
} from '@/features/network/services/network-service';

/** Network state changes slowly except the signal; 5 s keeps the dBm fresh. */
const POLL_MS = 5_000;

/**
 * Every network reading plus the two permission flows the screen drives:
 * location for the Wi-Fi name and Nearby devices for the Bluetooth state.
 * All other readings keep working when either permission is denied.
 */
export function useNetwork() {
  const [connectivity, setConnectivity] = useState<Result<ConnectivityInfo> | null>(null);
  const [wifi, setWifi] = useState<Result<WifiInfo> | null>(null);
  const [bluetooth, setBluetooth] = useState<Result<BluetoothInfo> | null>(null);
  const [nfc, setNfc] = useState<Result<NfcInfo> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const location = usePermission(WIFI_NAME_PERMISSION);
  const bluetoothPermission = usePermission(BLUETOOTH_STATE_PERMISSION);

  const load = useCallback(() => {
    setConnectivity(readConnectivity());
    setWifi(readWifi());
    setBluetooth(readBluetooth());
    setNfc(readNfc());
  }, []);

  const { isPolling } = usePolling(load, { intervalMs: POLL_MS });

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  const { notice, open } = useSystemSettings();

  return {
    connectivity,
    wifi,
    bluetooth,
    nfc,
    location,
    bluetoothPermission,
    notice,
    openSettings: open,
    refreshing,
    refresh,
    isPolling,
  };
}
