import { Canvas, Circle, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { clamp01, statusColor } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  unit?: string;
  /** Spoken label for TalkBack. */
  accessibilityLabel?: string;
};

/**
 * Semicircle gauge with an animated needle. Colour interpolates
 * good → warning → critical as the value approaches the maximum.
 */
export function ThermalGauge({
  value,
  min = 30,
  max = 90,
  size = 200,
  thickness = 14,
  unit = '°C',
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const { animate } = useMotionPreference();
  const ratio = clamp01(max === min ? 0 : (value - min) / (max - min));
  const tint = statusColor(ratio, colors, 0.5, 0.8);

  const canvasHeight = size / 2 + 16;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - thickness / 2;
  const needleLength = radius - 10;

  const position = useSharedValue(animate ? 0 : ratio);

  useEffect(() => {
    position.value = animate
      ? withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) })
      : ratio;
  }, [animate, position, ratio]);

  const arcRect = useMemo(
    () => ({
      x: thickness / 2,
      y: thickness / 2,
      width: size - thickness,
      height: size - thickness,
    }),
    [size, thickness],
  );

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc(arcRect, 180, 180);
    return path;
  }, [arcRect]);

  const valuePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (position.value > 0.0001) {
      path.addArc(arcRect, 180, 180 * position.value);
    }
    return path;
  });

  const needlePath = useDerivedValue(() => {
    const angle = Math.PI * (1 + position.value);
    const path = Skia.Path.Make();
    path.moveTo(centerX, centerY);
    path.lineTo(centerX + Math.cos(angle) * needleLength, centerY + Math.sin(angle) * needleLength);
    return path;
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Temperature'}
      accessibilityValue={{
        text:
          unit === '°C' ? `${Math.round(value)} degrees Celsius` : `${Math.round(value)} ${unit}`,
      }}
      style={{ width: size }}
    >
      <View>
        <Canvas style={{ width: size, height: canvasHeight }}>
          <Path
            path={trackPath}
            style="stroke"
            strokeWidth={thickness}
            strokeCap="round"
            color={withAlpha(colors.text, 0.09)}
          />
          <Path path={valuePath} style="stroke" strokeWidth={thickness} strokeCap="round">
            <LinearGradient
              start={vec(0, centerY)}
              end={vec(size, centerY)}
              colors={[withAlpha(tint, 0.5), tint]}
            />
          </Path>
          <Path
            path={needlePath}
            style="stroke"
            strokeWidth={3}
            strokeCap="round"
            color={colors.text}
          />
          <Circle cx={centerX} cy={centerY} r={7} color={colors.text} />
          <Circle cx={centerX} cy={centerY} r={3} color={colors.surface} />
        </Canvas>
        <Text style={[styles.edge, styles.edgeLeft, { color: colors.muted }]}>
          {min}
          {unit}
        </Text>
        <Text style={[styles.edge, styles.edgeRight, { color: colors.muted }]}>
          {max}
          {unit}
        </Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>
        {Math.round(value)}
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    ...typography.caption,
    position: 'absolute',
    bottom: 0,
  },
  edgeLeft: {
    left: spacing.xs,
  },
  edgeRight: {
    right: spacing.xs,
  },
  value: {
    ...typography.title,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
});
