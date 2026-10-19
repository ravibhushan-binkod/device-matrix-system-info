import { Canvas, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';
import { withAlpha } from '@/design-system/color';
import { clamp01, statusColor } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  thickness?: number;
  /** Overrides the automatic good → warning → critical colour. */
  color?: string;
};

/**
 * Gradient ring that sweeps to the value on first view, with a count-up
 * number in the centre. Colour follows good → warning → critical as the
 * ratio climbs (higher = worse).
 */
export function Ring({ value, max = 100, label, size = 168, thickness = 14, color }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const ratio = clamp01(max === 0 ? 0 : value / max);
  const tint = color ?? statusColor(ratio, colors);

  const progress = useSharedValue(reduced ? ratio : 0);
  const mounted = useRef(false);

  useEffect(() => {
    if (reduced) {
      progress.value = ratio;
      return;
    }
    progress.value = withTiming(ratio, {
      duration: mounted.current ? durations.slow : durations.sweep,
      easing: Easing.out(Easing.cubic),
    });
    mounted.current = true;
  }, [progress, ratio, reduced]);

  const [display, setDisplay] = useState(reduced ? Math.round(value) : 0);

  useAnimatedReaction(
    () => Math.round(progress.value * max),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
    [max],
  );

  const arcRect = useMemo(() => {
    const inset = thickness / 2;
    return { x: inset, y: inset, width: size - thickness, height: size - thickness };
  }, [size, thickness]);

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc(arcRect, -90, 360);
    return path;
  }, [arcRect]);

  const arcPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (progress.value > 0.0001) {
      path.addArc(arcRect, -90, 360 * progress.value);
    }
    return path;
  });

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={thickness}
          color={withAlpha(colors.text, 0.08)}
        />
        <Path path={arcPath} style="stroke" strokeWidth={thickness} strokeCap="round">
          <SweepGradient c={vec(size / 2, size / 2)} colors={[tint, withAlpha(tint, 0.4), tint]} />
        </Path>
      </Canvas>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: colors.text }]}>{display}</Text>
        {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  value: {
    ...typography.display,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.caption,
  },
});
