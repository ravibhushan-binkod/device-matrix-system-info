import { PermissionsAndroid } from 'react-native';

export {
  openAppSettings,
  usePermission,
  type PermissionState,
  type UsePermission,
} from './use-permission';

/** The location permission Android requires before an app may read the Wi-Fi name. */
export const WIFI_NAME_PERMISSION = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;

/** Android 13+ permission to scan for nearby Wi-Fi networks (missing on older releases). */
export const NEARBY_WIFI_DEVICES_PERMISSION = PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES;

/** The Android 12+ "Nearby devices" permission required to read the Bluetooth state. */
export const BLUETOOTH_STATE_PERMISSION = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;

/** Runtime permission for the microphone check. Audio is only metered, never kept. */
export const MICROPHONE_PERMISSION = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
