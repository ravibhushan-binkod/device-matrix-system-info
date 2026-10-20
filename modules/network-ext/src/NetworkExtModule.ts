import { NativeModule, requireNativeModule } from 'expo';

import type {
  NativeBluetoothInfo,
  NativeConnectivityCapabilities,
  NativeConnectivityInfo,
  NativeDataUsage,
  NativeDataUsageTopApps,
  NativeNfcInfo,
  NativeWifiInfo,
  NativeWifiScanResults,
  NativeWifiScanStart,
} from './NetworkExt.types';

declare class NetworkExtModule extends NativeModule<Record<string, never>> {
  getConnectivityInfo(): NativeConnectivityInfo | null;
  getWifiInfo(): NativeWifiInfo | null;
  getBluetoothInfo(): NativeBluetoothInfo | null;
  getNfcInfo(): NativeNfcInfo | null;
  startWifiScan(): NativeWifiScanStart | null;
  getWifiScanResults(): NativeWifiScanResults | null;
  getConnectivityCapabilities(): NativeConnectivityCapabilities | null;
  getDataUsage(startMs: number, endMs: number, bucketMs: number): Promise<NativeDataUsage>;
  getDataUsageTopApps(startMs: number, endMs: number): Promise<NativeDataUsageTopApps>;
}

export default requireNativeModule<NetworkExtModule>('NetworkExt');
