import mobileAds, {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import { adEnv, testDeviceIdentifiers } from '@/core/ads/config';
import { features, isEnabled } from '@/core/features';
import { getString, setString } from '@/core/storage/mmkv';
import { useAdsStore } from '@/state/ads-store';

const DEBUG_GEOGRAPHY_KEY = 'ads.debugGeography';

function isEeaDebugEnabled(): boolean {
  return getString(DEBUG_GEOGRAPHY_KEY) === 'eea';
}

function setEeaDebugEnabled(enabled: boolean): void {
  setString(DEBUG_GEOGRAPHY_KEY, enabled ? 'eea' : 'disabled');
}

function consentOptions() {
  return {
    debugGeography: isEeaDebugEnabled()
      ? AdsConsentDebugGeography.EEA
      : AdsConsentDebugGeography.DISABLED,
    tagForUnderAgeOfConsent: false,
    // UMP's own test-device list (hashed ids, no emulator alias).
    testDeviceIdentifiers: adEnv.testDeviceIdentifiers,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Consent allows ad requests → apply the global request configuration and
 * initialise the Mobile Ads SDK. Order matters: configuration first (it must
 * be set before initialisation, ads may preload on init), and both only after
 * `canRequestAds` is true.
 */
async function finishStartup(info: AdsConsentInfo): Promise<void> {
  const { setStatus } = useAdsStore.getState();

  if (!info.canRequestAds) {
    setStatus('blocked');
    return;
  }

  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    testDeviceIdentifiers,
  });

  await mobileAds().initialize();
  setStatus('ready');
}

async function runBootstrap(): Promise<void> {
  const { setStatus } = useAdsStore.getState();

  if (!isEnabled(features.ads)) {
    setStatus('disabled');
    return;
  }

  setStatus('running');

  try {
    // Requests consent info and shows the Google-rendered form if required.
    const info = await AdsConsent.gatherConsent(consentOptions());
    await finishStartup(info);
  } catch (error) {
    if (__DEV__) console.warn('[ads] consent gathering failed', describeError(error));
    // UMP errors must not block ads that a previous session's consent allows.
    try {
      const info = await AdsConsent.getConsentInfo();
      await finishStartup(info);
    } catch (fallbackError) {
      if (__DEV__) console.warn('[ads] consent state unavailable', describeError(fallbackError));
      useAdsStore.getState().setStatus('error', describeError(fallbackError));
    }
  }
}

let inFlight: Promise<void> | null = null;

/**
 * Runs (or re-runs) the consent → configuration → initialisation sequence.
 * Called once at launch and again after the Settings developer actions.
 */
export function bootstrapAds(): Promise<void> {
  if (inFlight == null) {
    inFlight = runBootstrap().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/**
 * Developer tool: clear UMP state and re-run startup with the debug geography
 * disabled, so the real (not forced) consent flow applies again.
 */
export async function resetConsent(): Promise<void> {
  setEeaDebugEnabled(false);
  AdsConsent.reset();
  await bootstrapAds();
}

/**
 * Developer tool: pretend the device is in the EEA for the next consent flow.
 * Only affects registered UMP test devices (emulators are automatic).
 */
export async function forceEeaConsentTest(): Promise<void> {
  setEeaDebugEnabled(true);
  AdsConsent.reset();
  await bootstrapAds();
}

/** Opens Google's privacy options form when the region requires one. */
export async function showPrivacyOptions(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}

/**
 * True only when Google's consent information says the privacy-options form
 * is required in this region. The Privacy screen uses this to decide whether
 * to show its "Manage ad choices" button.
 */
export async function privacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** Opens Google's in-app Ad Inspector (test devices only). */
export async function openAdInspector(): Promise<void> {
  await mobileAds().openAdInspector();
}
