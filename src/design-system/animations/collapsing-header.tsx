import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  scrollY: SharedValue<number>;
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  /** Safe-area inset above the bar. */
  topInset?: number;
  /** Bar height without the inset at rest and after collapsing. */
  restHeight?: number;
  collapsedHeight?: number;
  /** Distance over which the collapse happens. */
  collapseDistance?: number;
};

/**
 * Scroll-driven header. The bar loses its extra height, fades the subtitle and
 * gains a surface background as the page scrolls. Heights/opacity only — no
 * layout work on the UI thread.
 */
export function CollapsingHeader({
  scrollY,
  title,
  subtitle,
  left,
  right,
  topInset = 0,
  restHeight = 88,
  collapsedHeight = 56,
  collapseDistance = 96,
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  // Compute colors on the JS side; only strings cross into the UI runtime.
  const transparentBackground = withAlpha(colors.background, 0);

  const rootStyle = useAnimatedStyle(() => {
    const progress = animate
      ? interpolate(scrollY.value, [0, collapseDistance], [0, 1], Extrapolation.CLAMP)
      : 0;
    return {
      height: topInset + restHeight + (collapsedHeight - restHeight) * progress,
      backgroundColor: interpolateColor(progress, [0, 1], [transparentBackground, colors.surface]),
    };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    const progress = animate
      ? interpolate(scrollY.value, [0, collapseDistance * 0.7], [0, 1], Extrapolation.CLAMP)
      : 0;
    return { opacity: 1 - progress };
  });

  const borderStyle = useAnimatedStyle(() => {
    const progress = animate
      ? interpolate(scrollY.value, [0, collapseDistance * 0.6], [0, 1], Extrapolation.CLAMP)
      : 0;
    return { opacity: progress };
  });

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <View style={[styles.row, { paddingTop: topInset }]}>
        {left}
        <View style={styles.center}>
          <Text numberOfLines={1} style={[typography.title, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle ? (
            <Animated.Text
              numberOfLines={1}
              style={[typography.caption, { color: colors.muted }, subtitleStyle]}
            >
              {subtitle}
            </Animated.Text>
          ) : null}
        </View>
        {right}
      </View>
      <Animated.View style={[styles.border, { backgroundColor: colors.border }, borderStyle]} />
    </Animated.View>
  );
}

/** Parallax offset for a background layer inside a scrolling card. */
export function useParallaxStyle(scrollY: SharedValue<number>, distance = 52) {
  const { animate } = useMotionPreference();

  return useAnimatedStyle(() => {
    const offset = animate
      ? interpolate(scrollY.value, [0, 340], [0, distance], Extrapolation.CLAMP)
      : 0;
    return { transform: [{ translateY: offset }] };
  });
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  center: {
    flex: 1,
    gap: 1,
  },
  border: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
