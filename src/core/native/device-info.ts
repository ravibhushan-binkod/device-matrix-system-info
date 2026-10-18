import DeviceInfo from 'react-native-device-info';

import { ok, unavailable, type Result } from '@/core/result';

export type DeviceIdentity = {
  brand: string;
  model: string;
  androidVersion: string;
  /** `Build.VERSION.SDK_INT`; `null` when Android did not report it. */
  apiLevel: number | null;
};

/**
 * Device identity through react-native-device-info (normal Android APIs only).
 * Never throws — failures come back as `unavailable`.
 */
export function getDeviceIdentity(): Result<DeviceIdentity> {
  try {
    const brand = DeviceInfo.getBrand();
    const model = DeviceInfo.getModel();
    if (!brand && !model) {
      return unavailable('Android did not return the device model.');
    }
    const apiLevel = DeviceInfo.getApiLevelSync();
    return ok({
      brand,
      model,
      androidVersion: DeviceInfo.getSystemVersion(),
      apiLevel: Number.isFinite(apiLevel) ? apiLevel : null,
    });
  } catch {
    return unavailable('Reading device information failed.');
  }
}
