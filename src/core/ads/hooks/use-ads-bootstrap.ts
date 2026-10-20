import { useEffect } from 'react';

import { bootstrapAds } from '@/core/ads/consent';

/**
 * Starts the ads stack once per app launch: consent first, then request
 * configuration and SDK initialisation. Banners only mount after the store
 * reports `ready`, so nothing can request an ad before consent allows it.
 */
export function useAdsBootstrap(): void {
  useEffect(() => {
    void bootstrapAds();
  }, []);
}
