import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { clamp01 } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';

type Props = {
  /** Signal level from 0 to `max`; `null` renders every bar empty. */
  level: number | null;
  /** Number of bars (default 4). */
  max?: number;
  height?: number;
  barWidth?: number;
  color?: string;
};

type BarProps = {
  index: number;
  max: number;
  /** Continuous 0…max strength; each bar fills once it is passed. */
  strength: SharedValue<number>;
  height: number;
  barWidth: number;
  color: string;
};

function SignalBar({ index, max, strength, height, barWidth, color }: BarProps) {
  const fullHeight = height * (0.45 + (0.55 * (index + 1)) / max);
  const animated = useAnimatedStyle(() => {
    const progress = clamp01(strength.value - index);
    return {
      height: fullHeight * (0.5 + 0.5 * progress),
      opacity: 0.35 + 0.65 * progress,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        { width: barWidth, borderRadius: barWidth / 2, backgroundColor: color },
        animated,
      ]}
    />
  );
}

/** Stepped signal bars; the level animates softly when the strength changes. */
export function SignalBars({ level, max = 4, height = 20, barWidth = 4, color }: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const strength = useSharedValue(level ?? 0);

  useEffect(() => {
    const next = level ?? 0;
    strength.value = animate ? withTiming(next, { duration: durations.normal }) : next;
  }, [animate, level, strength]);

  const tint = color ?? colors.accent;

  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel={level == null ? 'Signal unknown' : `Signal ${level} of ${max} bars`}
    >
      {Array.from({ length: max }, (_, index) => (
        <SignalBar
          key={index}
          index={index}
          max={max}
          strength={strength}
          height={height}
          barWidth={barWidth}
          color={tint}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  bar: {
    opacity: 0.35,
  },
});
