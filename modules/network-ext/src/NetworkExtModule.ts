import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeBluetoothInfo,
  NativeConnectivityInfo,
  NativeNfcInfo,
  NativeWifiInfo,
} from './NetworkExt.types';

declare class NetworkExtModule extends NativeModule<Record<string, never>> {
  getConnectivityInfo(): NativeConnectivityInfo | null;
  getWifiInfo(): NativeWifiInfo | null;
  getBluetoothInfo(): NativeBluetoothInfo | null;
  getNfcInfo(): NativeNfcInfo | null;
}

export default requireNativeModule<NetworkExtModule>('NetworkExt');
