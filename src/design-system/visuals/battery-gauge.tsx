import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ChargingParticles } from '@/design-system/animations/charging-particles';
import { useMotionPreference } from '@/design-system/animations/use-motion-preference';
import { withAlpha } from '@/design-system/color';
import { useScreenFocused } from '@/design-system/hooks/use-screen-focused';
import { Icon } from '@/design-system/icon';
import { clamp01 } from '@/design-system/status';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

type Props = {
  /** Battery level 0..100. */
  value: number;
  charging?: boolean;
  width?: number;
  height?: number;
  /** Smaller centre text and charge icon for a half-width dashboard tile. */
  compact?: boolean;
  /** Rising bubbles in the liquid while charging. */
  particles?: boolean;
  /** Spoken label for TalkBack. */
  accessibilityLabel?: string;
};

const WALL = 3;
const PAD = 7;

/**
 * Battery shape with a liquid wave fill, percentage and a charging pulse.
 * Colour follows the level (critical → warning → good as the battery fills).
 * The wave and pulse loops stop while the screen is not focused.
 */
export function BatteryGauge({
  value,
  charging = false,
  width = 220,
  height = 96,
  compact = false,
  particles = false,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const { animate, loops } = useMotionPreference();
  const focused = useScreenFocused();
  const ratio = clamp01(value / 100);
  const tint = ratio < 0.15 ? colors.critical : ratio < 0.3 ? colors.warning : colors.good;

  const bodyW = width - 16;
  const innerX = PAD;
  const innerY = PAD;
  const innerW = bodyW - PAD * 2;
  const innerH = height - PAD * 2;

  const level = useSharedValue(animate ? 0 : ratio);
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      level.value = ratio;
      return;
    }
    level.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [animate, level, ratio]);

  useEffect(() => {
    if (!loops || !focused) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [focused, loops, wave]);

  const [display, setDisplay] = useState(animate ? 0 : Math.round(value));

  useAnimatedReaction(
    () => Math.round(level.value * 100),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
    [],
  );

  const liquidPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const lvl = level.value;
    if (lvl <= 0.001) return path;

    const top = innerY + innerH * (1 - lvl);
    const phase = wave.value * Math.PI * 2;
    const amplitude = 3;

    path.moveTo(innerX, innerY + innerH);
    path.lineTo(innerX, top + amplitude * Math.sin(phase));
    for (let x = 0; x <= innerW; x += 3) {
      path.lineTo(innerX + x, top + amplitude * Math.sin((x / innerW) * Math.PI * 4 + phase));
    }
    path.lineTo(innerX + innerW, innerY + innerH);
    path.close();
    return path;
  });

  const innerClip = useMemo(
    () => rrect(rect(innerX, innerY, innerW, innerH), 12, 12),
    [innerX, innerY, innerW, innerH],
  );

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!charging || !loops || !focused) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [charging, focused, loops, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Battery'}
      accessibilityValue={{
        text: `${Math.round(value)} percent${charging ? ', charging' : ''}`,
      }}
      style={{ width, height }}
    >
      <Canvas style={{ width, height }}>
        <Group clip={innerClip}>
          <Path path={liquidPath}>
            <LinearGradient
              start={vec(0, innerY)}
              end={vec(0, innerY + innerH)}
              colors={[withAlpha(tint, 0.65), tint]}
            />
          </Path>
          {particles && charging && loops && focused ? (
            <ChargingParticles
              x={innerX}
              y={innerY}
              width={innerW}
              height={innerH}
              progress={wave}
              level={level}
              color={withAlpha(colors.text, 0.85)}
            />
          ) : null}
        </Group>
        <RoundedRect
          x={WALL / 2}
          y={WALL / 2}
          width={bodyW - WALL}
          height={height - WALL}
          r={18}
          style="stroke"
          strokeWidth={WALL}
          color={withAlpha(colors.text, 0.14)}
        />
        <RoundedRect
          x={bodyW + 4}
          y={height * 0.32}
          width={10}
          height={height * 0.36}
          r={3}
          color={withAlpha(colors.text, 0.14)}
        />
      </Canvas>
      <View style={[styles.center, { width: bodyW }]} pointerEvents="none">
        <Text style={[compact ? styles.valueCompact : styles.value, { color: colors.text }]}>
          {display}%
        </Text>
        {charging ? (
          <View style={compact ? styles.chargeRowCompact : styles.chargeRow}>
            <Animated.View
              style={[
                compact ? styles.pulseCompact : styles.pulse,
                { backgroundColor: withAlpha(colors.good, 0.3) },
                pulseStyle,
              ]}
            />
            <Icon name="zap" size={compact ? 16 : 20} color={colors.good} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  valueCompact: {
    ...typography.title,
    fontVariant: ['tabular-nums'],
  },
  chargeRow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeRowCompact: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  pulseCompact: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
