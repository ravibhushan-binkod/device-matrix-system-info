import { Canvas, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/design-system/animations/motion';
import { PressableScale } from '@/design-system/animations/pressable-scale';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
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
  /** Replaces the counted number in the centre (e.g. "—" when unavailable). */
  displayValue?: string;
  /** Spoken label for TalkBack; defaults to `label`. */
  accessibilityLabel?: string;
  /** Optional long-press action (e.g. copy the numeric reading). */
  onLongPress?: () => void;
};

/**
 * Gradient ring that sweeps to the value on first view, with a count-up
 * number in the centre. Colour follows good → warning → critical as the
 * ratio climbs (higher = worse).
 */
export function Ring({
  value,
  max = 100,
  label,
  size = 168,
  thickness = 14,
  color,
  displayValue,
  accessibilityLabel,
  onLongPress,
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const ratio = clamp01(max === 0 ? 0 : value / max);
  const tint = color ?? statusColor(ratio, colors);

  const progress = useSharedValue(animate ? 0 : ratio);
  const mounted = useRef(false);

  useEffect(() => {
    if (!animate) {
      progress.value = ratio;
      return;
    }
    progress.value = withTiming(ratio, {
      duration: mounted.current ? durations.slow : durations.sweep,
      easing: Easing.out(Easing.cubic),
    });
    mounted.current = true;
  }, [animate, progress, ratio]);

  const [display, setDisplay] = useState(animate ? 0 : Math.round(value));

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

  const body = (
    <>
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
        <Text style={[styles.value, { color: colors.text }]}>{displayValue ?? display}</Text>
        {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
      </View>
    </>
  );
  const accessibilityValueText =
    max === 100 ? `${Math.round(value)} percent` : `${Math.round(value)} of ${max}`;

  if (onLongPress) {
    return (
      <PressableScale
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Gauge'}
        accessibilityValue={{ text: accessibilityValueText }}
        accessibilityHint="Long press to copy this value"
        haptic={false}
        onLongPress={onLongPress}
        delayLongPress={320}
        style={[styles.root, { width: size, height: size }]}
      >
        {body}
      </PressableScale>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Gauge'}
      accessibilityValue={{ text: accessibilityValueText }}
      style={[styles.root, { width: size, height: size }]}
    >
      {body}
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
