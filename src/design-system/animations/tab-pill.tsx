import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';

type Props = {
  index: number;
  count: number;
  itemWidth: number;
  height?: number;
  top?: number;
  horizontalInset?: number;
};

/**
 * The moving tab highlight. It springs between items and briefly stretches
 * while travelling, so the change reads as one shape morphing rather than a
 * hard cut. Static under Reduced/Off.
 */
export function TabPill({
  index,
  count,
  itemWidth,
  height = 36,
  top = 6,
  horizontalInset = 12,
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const safeCount = Math.max(1, count);
  const targetWidth = Math.max(24, itemWidth - horizontalInset * 2);
  const targetLeft = index * itemWidth + horizontalInset;
  const left = useSharedValue(targetLeft);
  const width = useSharedValue(targetWidth);

  useEffect(() => {
    if (!animate) {
      left.value = targetLeft;
      width.value = targetWidth;
      return;
    }
    left.value = withSpring(targetLeft, springs.tab);
    width.value = withSequence(
      withTiming(targetWidth * 1.14, { duration: durations.fast }),
      withSpring(targetWidth, springs.tab),
    );
  }, [animate, index, left, targetLeft, targetWidth, width]);

  const style = useAnimatedStyle(() => ({
    left: left.value,
    width: width.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          top,
          height,
          borderRadius: height / 2,
          backgroundColor: withAlpha(colors.accent, 0.14),
          borderColor: withAlpha(colors.accent, 0.28),
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...(safeCount > 0 ? {} : {})}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    borderWidth: 1,
  },
});
