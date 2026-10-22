import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

import { springs } from '@/design-system/animations/motion';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { clamp01 } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

export type CoreBar = {
  label: string;
  value: number;
};

type Props = {
  bars: CoreBar[];
  max?: number;
  height?: number;
  barWidth?: number;
  color?: string;
  /** Spoken label for TalkBack; the summary lists the value range. */
  accessibilityLabel?: string;
};

type BarProps = {
  ratio: number;
  height: number;
  barWidth: number;
  color: string;
  reduced: boolean;
};

function Bar({ ratio, height, barWidth, color, reduced }: BarProps) {
  const spring = useSharedValue(reduced ? ratio : 0);

  useEffect(() => {
    spring.value = reduced ? ratio : withSpring(ratio, springs.bar);
  }, [ratio, reduced, spring]);

  const barHeight = useDerivedValue(() => Math.max(2, spring.value * height));
  const y = useDerivedValue(() => height - barHeight.value);

  return (
    <Canvas style={{ width: barWidth, height }}>
      <RoundedRect x={0} y={y} width={barWidth} height={barHeight} r={barWidth / 2}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[color, withAlpha(color, 0.35)]}
        />
      </RoundedRect>
    </Canvas>
  );
}

/** Per-core vertical bars; each bar springs to its frequency ratio. */
export function CoreBars({
  bars,
  max = 100,
  height = 88,
  barWidth = 16,
  color,
  accessibilityLabel = 'Cores',
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const tint = color ?? colors.accent;

  const values = bars.map((bar) => bar.value);
  const spoken =
    values.length === 0
      ? `${accessibilityLabel}: no data`
      : `${accessibilityLabel}: ${bars.length} cores, ${Math.round(Math.min(...values))} to ${Math.round(Math.max(...values))} of ${Math.round(max)}`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.root}>
      <View style={styles.row}>
        {bars.map((bar, index) => (
          <View key={`${bar.label}-${index}`} style={styles.column}>
            <Bar
              ratio={max === 0 ? 0 : clamp01(bar.value / max)}
              height={height}
              barWidth={barWidth}
              color={tint}
              reduced={reduced}
            />
            <Text numberOfLines={1} style={[styles.label, { color: colors.muted }]}>
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
  },
});
