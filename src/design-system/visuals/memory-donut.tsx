import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/design-system/color';
import { clamp01 } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  thickness?: number;
};

/** Usage donut with a gentle "breathing" loop and a count-up centre number. */
export function MemoryDonut({ value, max = 100, label, size = 168, thickness = 16 }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const ratio = clamp01(max === 0 ? 0 : value / max);

  const progress = useSharedValue(reduced ? ratio : 0);
  const breath = useSharedValue(1);

  useEffect(() => {
    progress.value = reduced
      ? ratio
      : withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, ratio, reduced]);

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(1.015, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breath, reduced]);

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

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Animated.View style={breathStyle}>
        <Canvas style={{ width: size, height: size }}>
          <Path
            path={trackPath}
            style="stroke"
            strokeWidth={thickness}
            color={withAlpha(colors.text, 0.08)}
          />
          <Path path={arcPath} style="stroke" strokeWidth={thickness} strokeCap="round">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size, size)}
              colors={[colors.primary, colors.accent]}
            />
          </Path>
        </Canvas>
      </Animated.View>
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
