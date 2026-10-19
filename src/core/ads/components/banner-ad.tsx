import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  type BannerAdProps,
} from 'react-native-google-mobile-ads';

import { Skeleton } from '@/design-system/components/skeleton';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { useAdsStore } from '@/state/ads-store';
import {
  BANNER_HORIZONTAL_PADDING,
  BANNER_MAX_HEIGHT,
  BANNER_MIN_HEIGHT,
  BANNER_RETRY_DELAY_MS,
  adUnitIds,
} from '@/core/ads/config';
import type { BannerPlacement } from '@/core/ads/placements';

type Props = {
  placement: BannerPlacement;
  style?: StyleProp<ViewStyle>;
};

const FADE_IN_MS = 250;
const RESIZE_MS = 220;
const EASE = Easing.out(Easing.quad);

/**
 * An inline adaptive banner, sized to the screen width minus padding.
 *
 * - Renders nothing until consent allows ad requests (the store is `ready`),
 *   so no request can happen before consent.
 * - Reserves a minimum height while loading with a shimmer.
 * - Fades in on load.
 * - On failure it collapses smoothly and retries once after 60 s.
 *
 * Failure codes are logged in development only.
 */
export function BannerAd({ placement, style }: Props) {
  const ready = useAdsStore((state) => state.status === 'ready');

  if (!ready) return null;

  return <ReadyBannerAd placement={placement} style={style} />;
}

function ReadyBannerAd({ placement, style }: Props) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(1, Math.round(windowWidth - BANNER_HORIZONTAL_PADDING * 2));

  const bannerRef = useRef<GoogleBannerAd | null>(null);
  const retryUsed = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const height = useSharedValue(BANNER_MIN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const growTo = (adHeight: number) => {
    height.value = withTiming(Math.min(adHeight, BANNER_MAX_HEIGHT), {
      duration: RESIZE_MS,
      easing: EASE,
    });
  };

  const onAdLoaded: BannerAdProps['onAdLoaded'] = ({ height: adHeight }) => {
    setPhase('loaded');
    if (adHeight > 0) growTo(adHeight);
    opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: EASE });
  };

  const onSizeChange: BannerAdProps['onSizeChange'] = ({ height: adHeight }) => {
    if (adHeight > 0) growTo(adHeight);
  };

  const onAdFailedToLoad: BannerAdProps['onAdFailedToLoad'] = (error) => {
    if (__DEV__) {
      console.warn(
        `[ads] banner "${placement}" failed to load`,
        error.reason ?? error.code,
        error.message,
      );
    }

    setPhase('failed');
    opacity.value = 0;
    height.value = withTiming(0, { duration: RESIZE_MS, easing: EASE });

    if (!retryUsed.current) {
      retryUsed.current = true;
      retryTimer.current = setTimeout(() => {
        setPhase('loading');
        height.value = BANNER_MIN_HEIGHT;
        bannerRef.current?.load();
      }, BANNER_RETRY_DELAY_MS);
    }
  };

  const containerStyle = useAnimatedStyle(() => ({ height: height.value }));
  const adStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.container,
        phase !== 'loaded' && { backgroundColor: colors.surface2 },
        containerStyle,
        style,
      ]}
    >
      <Animated.View style={adStyle}>
        <GoogleBannerAd
          ref={bannerRef}
          unitId={adUnitIds.banner}
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          width={width}
          maxHeight={BANNER_MAX_HEIGHT}
          onAdLoaded={onAdLoaded}
          onSizeChange={onSizeChange}
          onAdFailedToLoad={onAdFailedToLoad}
        />
      </Animated.View>

      {phase === 'loading' ? (
        <View pointerEvents="none" style={styles.shimmer}>
          <Skeleton height={BANNER_MIN_HEIGHT - spacing.sm} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: spacing.xs,
    justifyContent: 'center',
  },
});
