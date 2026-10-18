import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design-system/theme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
};

const STRIPE_WIDTH = 140;

/** Shimmer placeholder for loading content. Static when reduce-motion is on. */
export function Skeleton({ width = '100%', height = 16, round = false, style }: Props) {
  const { scheme, colors } = useTheme();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced || trackWidth === 0) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduced, progress, trackWidth]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -STRIPE_WIDTH + progress.value * (trackWidth + STRIPE_WIDTH) }],
  }));

  const shimmer = scheme === 'dark' ? 'rgba(232,238,245,0.07)' : 'rgba(17,24,39,0.06)';

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[
        styles.track,
        {
          width,
          height,
          borderRadius: round ? height / 2 : 6,
          backgroundColor: colors.surface2,
        },
        style,
      ]}
    >
      {!reduced ? (
        <Animated.View style={[styles.stripe, stripeStyle]}>
          <LinearGradient
            colors={['transparent', shimmer, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: STRIPE_WIDTH,
  },
});
