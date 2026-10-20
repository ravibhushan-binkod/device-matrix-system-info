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
      // The advertising-ID permission the Google Mobile Ads SDK actually uses
      // (`android.permission.AD_ID` is not a permission Android defines).
      // Only the ads SDK reads it; nothing else in the app touches it.
      'com.google.android.gms.permission.AD_ID',
      'android.permission.SET_ALARM',
      'android.permission.VIBRATE',
      'android.permission.NFC',
      // Runtime/optional — only requested when the matching feature is used.
      'android.permission.ACCESS_FINE_LOCATION', // Wi-Fi name (SSID) + nearby-network scan
      'android.permission.NEARBY_WIFI_DEVICES', // Wi-Fi scan list on Android 13+
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
      // Legacy storage permissions the expo-file-system plugin adds for
      // Android 12 and below. The app stores everything in MMKV and never
      // touches shared storage, so they must not appear.
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      // Injected by the ads dependency chain, not needed by this app:
      // WAKE_LOCK comes from the react-native-google-mobile-ads manifest and
      // FOREGROUND_SERVICE from the androidx.work the Google Mobile Ads SDK
      // bundles. Banner ads need neither, and the app runs no foreground
      // service. Re-allow these only if a future video ad format needs them.
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
    ],
  },
  plugins: [
    'expo-router',
    './plugins/with-release-signing',
    // Makes the launcher apps visible on Android 11+ through a `<queries>`
    // intent entry (not a permission — see the plugin file). This is what the
    // Apps tab can list; QUERY_ALL_PACKAGES is never used.
    './plugins/with-launcher-queries',
    // Makes the installed Play services version readable on Android 11+
    // (a `<queries>` entry, not a permission — see the plugin file).
    './plugins/with-gms-queries',
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
      'react-native-google-mobile-ads',
      {
        // Live ID from the environment; Google's official sample app ID from
        // the AdMob quick-start docs (`ca-app-pub-3940256099942544~3347511713`,
        // same value as src/core/ads/config.ts) otherwise, so the native SDK
        // can never crash at launch from a missing app ID.
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
        // EEA best practice: don't measure or preload until consent is done.
        delayAppMeasurementInit: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          buildArchs: ['arm64-v8a', 'armeabi-v7a'],
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
  extra: {
    // AdMob IDs as seen at build time. The runtime reads the same
    // EXPO_PUBLIC_ADMOB_* variables directly (Metro inlines them into the
    // bundle) — see src/core/ads/config.ts. No live ID is ever committed.
    admob: {
      androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? null,
      bannerUnitId: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ?? null,
      interstitialUnitId: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID ?? null,
      nativeUnitId: process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID ?? null,
    },
  },
};

export default config;
