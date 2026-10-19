import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Device Matrix',
  slug: 'device-matrix',
  version: '1.0.0',
  description:
    'Device Matrix: System Info — an Android device information app. Device, OS, CPU/GPU, memory, storage, battery, thermal, display, camera, sensors, network/Wi-Fi and app details, honestly reported.',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'devicematrix',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0B0F14',
  android: {
    package: 'com.binkod.devicematrix',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0B0F14',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.INTERNET',
      'android.permission.AD_ID',
      'android.permission.SET_ALARM',
      'android.permission.VIBRATE',
      'android.permission.NFC',
      // Runtime/optional — only requested when the matching feature is used.
      'android.permission.ACCESS_FINE_LOCATION', // Wi-Fi network name (SSID)
      'android.permission.BLUETOOTH_CONNECT', // Bluetooth state on Android 12+
      // Special access, granted by the user under Settings > Special access >
      // Usage access — only the Apps tab's usage insights read it, and the tab
      // shows a banner with the exact screen when it is missing.
      'android.permission.PACKAGE_USAGE_STATS',
    ],
    blockedPermissions: [
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.READ_PHONE_STATE',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0F14',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    'expo-font',
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          buildArchs: ['arm64-v8a'],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
