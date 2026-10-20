import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';

type Props = {
  color: string;
  size?: number;
  /** Turn off for a static dot (e.g. no live data). */
  active?: boolean;
};

/**
 * Small "live" indicator: a solid dot with a breathing halo. The halo only
 * loops while the screen is visible, the app is active and motion is Full.
 */
export function LivePulse({ color, size = 8, active = true }: Props) {
  const { loops } = useMotionPreference();
  const focused = useScreenFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active || !loops || !focused) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: durations.pulse, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [active, focused, loops, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.45 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.8 }],
  }));

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          haloStyle,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
  },
});
