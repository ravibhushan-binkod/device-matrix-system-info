import { TestDeviceIds, TestIds } from 'react-native-google-mobile-ads';

/**
 * Google's official sample AdMob app ID, copied from the AdMob quick-start
 * docs (`<!-- Sample AdMob app ID: ca-app-pub-3940256099942544~3347511713 -->`).
 * app.config.ts uses it whenever EXPO_PUBLIC_ADMOB_ANDROID_APP_ID is unset, so
 * a build can never crash at launch from a missing app ID. It is a demo ID,
 * not a live one.
 */
export const GOOGLE_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

/** Environment variables that configure live AdMob IDs (see docs/RELEASE.md). */
export const ADMOB_ENV_VARS = {
  appId: 'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
  bannerUnitId: 'EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID',
  interstitialUnitId: 'EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID',
  nativeUnitId: 'EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID',
  /** Comma-separated hashed test-device IDs (emulators are automatic). */
  testDevices: 'EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS',
} as const;

export type AdEnv = {
  appId: string | null;
  bannerUnitId: string | null;
  interstitialUnitId: string | null;
  nativeUnitId: string | null;
  /** Extra hashed test-device IDs; the emulator alias is added separately. */
  testDeviceIdentifiers: string[];
};

/** The unit-ID env vars that must all be set before live inventory is used. */
const UNIT_ENV_VARS = [
  ADMOB_ENV_VARS.bannerUnitId,
  ADMOB_ENV_VARS.interstitialUnitId,
  ADMOB_ENV_VARS.nativeUnitId,
] as const;

function clean(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function splitIds(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Reads the environment with explicit `process.env.EXPO_PUBLIC_*` member
 * access — Expo inlines exactly these at build time; dynamic lookups would be
 * `undefined` in a release bundle.
 */
export function readProcessAdEnv(): AdEnv {
  return {
    appId: clean(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID),
    bannerUnitId: clean(process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID),
    interstitialUnitId: clean(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID),
    nativeUnitId: clean(process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID),
    testDeviceIdentifiers: splitIds(process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS),
  };
}

/** True only when every live unit ID is present — all or nothing. */
export function hasAllLiveUnitIds(env: AdEnv): boolean {
  return env.bannerUnitId != null && env.interstitialUnitId != null && env.nativeUnitId != null;
}

/** Names of the unit-ID env vars that are missing (for warnings). */
export function missingUnitEnvVars(env: AdEnv): string[] {
  return UNIT_ENV_VARS.filter((name) => {
    if (name === ADMOB_ENV_VARS.bannerUnitId) return env.bannerUnitId == null;
    if (name === ADMOB_ENV_VARS.interstitialUnitId) return env.interstitialUnitId == null;
    return env.nativeUnitId == null;
  });
}

export type AdUnitIds = {
  /** True when Google's demo units are used instead of live units. */
  usingTestIds: boolean;
  /** Inline adaptive banner unit used by every banner placement. */
  banner: string;
  interstitial: string;
  native: string;
};

/**
 * Development builds, and any build missing even one live unit ID, use the
 * library's `TestIds` — a half-configured setup never mixes live and test
 * inventory. Live IDs are read from the environment; no live ID is hardcoded.
 */
export function resolveAdUnitIds(env: AdEnv, isDev: boolean): AdUnitIds {
  const usingTestIds = isDev || !hasAllLiveUnitIds(env);
  return {
    usingTestIds,
    banner: usingTestIds ? TestIds.ADAPTIVE_BANNER : (env.bannerUnitId as string),
    interstitial: usingTestIds ? TestIds.INTERSTITIAL : (env.interstitialUnitId as string),
    native: usingTestIds ? TestIds.NATIVE : (env.nativeUnitId as string),
  };
}

/** Read once per process — the environment never changes at runtime. */
export const adEnv: AdEnv = readProcessAdEnv();

/** Unit IDs for the current build (demo units unless fully configured). */
export const adUnitIds: AdUnitIds = resolveAdUnitIds(adEnv, __DEV__);

/** Banner grid size: screen width minus the 16 dp screen padding on each side. */
export const BANNER_HORIZONTAL_PADDING = 16;

/** Height reserved while a banner loads, so content does not jump. */
export const BANNER_MIN_HEIGHT = 64;

/** Inline adaptive banners are capped so a feed stays readable. */
export const BANNER_MAX_HEIGHT = 150;

/** A failed banner gets exactly one retry, this long after the failure. */
export const BANNER_RETRY_DELAY_MS = 60_000;

/**
 * The test-device allow-list for `setRequestConfiguration`: the classic
 * Android emulator alias plus every hashed id from the environment
 * (registered after the SDK logs it — see docs/RELEASE.md).
 */
export const testDeviceIdentifiers: string[] = [
  TestDeviceIds.EMULATOR,
  ...adEnv.testDeviceIdentifiers,
];
