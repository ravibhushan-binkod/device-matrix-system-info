import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';
import { useTheme } from '@/design-system/theme';
import { radius } from '@/design-system/tokens';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  round?: boolean;
};

const STRIPE_WIDTH = 120;

/** Shimmering placeholder. The sweep stops off-screen, in the background or under Reduced. */
export function Shimmer({ width = '100%', height = 16, round = false }: Props) {
  const { colors } = useTheme();
  const { loops } = useMotionPreference();
  const focused = useScreenFocused();
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!loops || !focused || trackWidth <= 0) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: durations.sweep, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [focused, loops, progress, trackWidth]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -STRIPE_WIDTH + progress.value * (trackWidth + STRIPE_WIDTH) }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        {
          width,
          height,
          borderRadius: round ? height / 2 : radius.button / 2,
          backgroundColor: withAlpha(colors.text, 0.07),
        },
      ]}
    >
      {loops && focused ? (
        <Animated.View style={[styles.stripe, { width: STRIPE_WIDTH }, stripeStyle]}>
          <LinearGradient
            colors={[
              withAlpha(colors.text, 0.02),
              withAlpha(colors.text, 0.12),
              withAlpha(colors.text, 0.02),
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
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
    right: 0,
    bottom: 0,
    left: 0,
  },
});
