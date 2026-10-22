import { useCallback, useState } from 'react';

import { usePolling } from '@/core/hooks/use-polling';
import { useSystemSettings } from '@/core/hooks/use-system-settings';
import type { BluetoothInfo } from '@/core/native';
import { BLUETOOTH_STATE_PERMISSION, usePermission } from '@/core/permissions';
import type { Result } from '@/core/result';
import { readBluetooth } from '@/features/hardware-tests/services/hardware-test-service';

/**
 * Bluetooth state for the checkup. Reading the adapter needs the Android 12+
 * Nearby devices permission; polling only runs once it is granted.
 */
export function useBluetoothTest() {
  const permission = usePermission(BLUETOOTH_STATE_PERMISSION);
  const [info, setInfo] = useState<Result<BluetoothInfo> | null>(null);
  const settings = useSystemSettings();

  const load = useCallback(() => {
    setInfo(readBluetooth());
  }, []);

  usePolling(load, { intervalMs: 2_000, enabled: permission.granted });

  return {
    permission,
    info: permission.granted ? info : null,
    notice: settings.notice,
    openBluetoothSettings: () => settings.open('bluetooth'),
  };
}
