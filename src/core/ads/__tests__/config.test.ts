import {
  ADMOB_ENV_VARS,
  GOOGLE_SAMPLE_ANDROID_APP_ID,
  hasAllLiveUnitIds,
  missingUnitEnvVars,
  resolveAdUnitIds,
  testDeviceIdentifiers,
  type AdEnv,
} from '../config';

jest.mock('react-native-google-mobile-ads', () => ({
  TestIds: {
    ADAPTIVE_BANNER: 'test-adaptive-banner',
    BANNER: 'test-banner',
    INTERSTITIAL: 'test-interstitial',
    NATIVE: 'test-native',
  },
  TestDeviceIds: { EMULATOR: 'EMULATOR' },
}));

const emptyEnv: AdEnv = {
  appId: null,
  bannerUnitId: null,
  interstitialUnitId: null,
  nativeUnitId: null,
  testDeviceIdentifiers: [],
};

const fullEnv: AdEnv = {
  appId: 'ca-app-pub-0000000000000000~1111111111',
  bannerUnitId: 'ca-app-pub-0000000000000000/1111111111',
  interstitialUnitId: 'ca-app-pub-0000000000000000/2222222222',
  nativeUnitId: 'ca-app-pub-0000000000000000/3333333333',
  testDeviceIdentifiers: ['AAAABBBBCCCC'],
};

describe('ads config', () => {
  it('ships Google demo units when no live IDs are configured', () => {
    const ids = resolveAdUnitIds(emptyEnv, false);
    expect(ids.usingTestIds).toBe(true);
    expect(ids.banner).toBe('test-adaptive-banner');
    expect(ids.interstitial).toBe('test-interstitial');
    expect(ids.native).toBe('test-native');
  });

  it('always uses demo units in development, even with live IDs', () => {
    const ids = resolveAdUnitIds(fullEnv, true);
    expect(ids.usingTestIds).toBe(true);
    expect(ids.banner).toBe('test-adaptive-banner');
  });

  it('uses the live IDs in a release build only when every unit is set', () => {
    const ids = resolveAdUnitIds(fullEnv, false);
    expect(ids.usingTestIds).toBe(false);
    expect(ids.banner).toBe(fullEnv.bannerUnitId);
    expect(ids.interstitial).toBe(fullEnv.interstitialUnitId);
    expect(ids.native).toBe(fullEnv.nativeUnitId);
  });

  it('is all-or-nothing: one missing unit falls back to demo units', () => {
    const ids = resolveAdUnitIds({ ...fullEnv, interstitialUnitId: null }, false);
    expect(ids.usingTestIds).toBe(true);
    expect(ids.banner).toBe('test-adaptive-banner');
  });

  it('reports which unit variables are missing', () => {
    expect(missingUnitEnvVars(emptyEnv)).toEqual([
      ADMOB_ENV_VARS.bannerUnitId,
      ADMOB_ENV_VARS.interstitialUnitId,
      ADMOB_ENV_VARS.nativeUnitId,
    ]);
    expect(missingUnitEnvVars(fullEnv)).toEqual([]);
    expect(hasAllLiveUnitIds(fullEnv)).toBe(true);
    expect(hasAllLiveUnitIds(emptyEnv)).toBe(false);
  });

  it('keeps the fallback app ID on the AdMob sample value', () => {
    expect(GOOGLE_SAMPLE_ANDROID_APP_ID).toBe('ca-app-pub-3940256099942544~3347511713');
  });

  it('always registers the emulator alias as a test device', () => {
    expect(testDeviceIdentifiers[0]).toBe('EMULATOR');
  });
});
