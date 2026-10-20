import type { StyleProp, ViewStyle } from 'react-native';

import { BannerAd } from '@/core/ads/components/banner-ad';
import type { BannerPlacement } from '@/core/ads/placements';

type Props = {
  /** Which slot this is — see `BannerPlacement` for the placement rules. */
  placement: BannerPlacement;
  style?: StyleProp<ViewStyle>;
};

/**
 * A banner slot between information sections. Ads stay off until consent
 * allows ad requests (the banner renders nothing before that), so screens can
 * keep the slot in place unconditionally and the layout simply has no gap
 * while ads are unavailable. Never place this on splash, permission sheets,
 * settings, full-screen tests or live graphs.
 */
export function AdSlot({ placement, style }: Props) {
  return <BannerAd placement={placement} style={style} />;
}
