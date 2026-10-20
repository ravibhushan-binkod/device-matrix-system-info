import { useEffect } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

import { adUnitIds } from '@/core/ads/config';
import { features, isEnabled } from '@/core/features';
import { useAdsStore } from '@/state/ads-store';

/**
 * The interstitial controller, built now but gated by the `interstitialAds`
 * feature flag (set to `off`). With the flag off — or before consent settles
 * — the hook gets no ad unit at all, so no ad instance exists and no request
 * is ever made. Flip the flag to `'v1'` to arm it at a chosen placement.
 */
export function useAppInterstitial() {
  const ready = useAdsStore((state) => state.status === 'ready');
  const enabled = isEnabled(features.interstitialAds) && ready;

  const { status, show, error } = useInterstitialAd({
    adUnitId: enabled ? adUnitIds.interstitial : null,
    autoLoad: enabled,
  });

  useEffect(() => {
    if (__DEV__ && error != null) {
      console.warn('[ads] interstitial', error.phase, error.reason ?? error.code, error.message);
    }
  }, [error]);

  return {
    /** True when the flag is on and consent allows requests. */
    isEnabled: enabled,
    isLoaded: status === 'loaded',
    status,
    show,
  };
}
