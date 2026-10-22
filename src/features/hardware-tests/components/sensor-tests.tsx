import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

import { Card, Chip } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import {
  bubbleOffset,
  formatLux,
  luxToRatio,
  proximityState,
} from '@/features/hardware-tests/services/test-logic';
import { useSensorTest } from '@/features/hardware-tests/hooks/use-sensor-test';

type Props = { onUnavailable: (reason: string | null) => void };

export function ProximityTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { descriptor, reading, history, error, loading } = useSensorTest('proximity');
  const state = proximityState(reading?.values[0], descriptor?.maxRange ?? 0);
  const maxRange = descriptor?.maxRange ?? 0;
  const nearSeen = history.some((values) => proximityState(values[0], maxRange) === 'near');
  const farSeen = history.some((values) => proximityState(values[0], maxRange) === 'far');

  useEffect(() => {
    if (!loading && error) onUnavailable(error);
    else if (!loading && descriptor) onUnavailable(null);
  }, [descriptor, error, loading, onUnavailable]);

  const near = state === 'near';
  const activeColour = near ? colors.violet : state === 'far' ? colors.accent : colors.muted;

  return (
    <Card style={styles.card}>
      <View style={styles.sensorStage}>
        <View
          style={[
            styles.sensorHalo,
            {
              borderColor: withAlpha(activeColour, 0.3),
              backgroundColor: withAlpha(activeColour, 0.08),
            },
          ]}
        >
          <View style={[styles.sensorCircle, { backgroundColor: withAlpha(activeColour, 0.18) }]}>
            <Icon name="sensors" size={56} color={activeColour} />
          </View>
        </View>
        <Text style={[styles.bigState, { color: activeColour }]}>
          {state === 'near' ? 'Near' : state === 'far' ? 'Far' : 'Waiting'}
        </Text>
        <Text style={[styles.stateHint, { color: colors.muted }]}>
          {state === 'near'
            ? 'Covered — move your hand away'
            : state === 'far'
              ? 'Clear — cover the sensor again'
              : loading
                ? 'Reading the proximity sensor…'
                : 'Move your hand over the top of the phone'}
        </Text>
      </View>
      <View style={styles.seenRow}>
        <Chip label="Near seen" icon={nearSeen ? 'check' : 'minus'} selected={nearSeen} />
        <Chip label="Far seen" icon={farSeen ? 'check' : 'minus'} selected={farSeen} />
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        The sensor value is used only to show Near/Far. You still confirm the result.
      </Text>
    </Card>
  );
}

export function LightTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { reading, history, error, loading } = useSensorTest('light');
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const level = useSharedValue(0);
  const lux = reading?.values[0] ?? null;
  const ratio = luxToRatio(lux);
  const luxValues = history
    .map((values) => values[0])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const range =
    luxValues.length > 0 ? { min: Math.min(...luxValues), max: Math.max(...luxValues) } : null;

  useEffect(() => {
    if (!loading && error) onUnavailable(error);
    else if (!loading && !error) onUnavailable(null);
  }, [error, loading, onUnavailable]);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(level);
      level.value = ratio;
      return;
    }
    level.value = withTiming(ratio, { duration: 220 });
  }, [level, ratio, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(2, level.value * 100)}%`,
  }));

  return (
    <Card style={styles.card}>
      <View style={styles.lightStage}>
        <View style={[styles.sunHalo, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
          <Icon
            name="sun"
            size={60}
            color={lux != null && lux > 10 ? colors.warning : colors.muted}
          />
        </View>
        <Text style={[styles.luxValue, { color: colors.text }]}>
          {formatLux(lux) ?? (loading ? 'Reading…' : 'Waiting for a reading')}
        </Text>
        <Text style={[styles.stateHint, { color: colors.muted }]}>
          {range
            ? `Range on this screen: ${formatLux(range.min)} – ${formatLux(range.max)}`
            : 'Cover the sensor, then shine a light on it'}
        </Text>
      </View>
      <View style={[styles.meterTrack, { backgroundColor: colors.surface2 }]}>
        <Animated.View style={[styles.meterFill, { backgroundColor: colors.warning }, fillStyle]} />
      </View>
      <View style={styles.meterLabels}>
        <Text style={[styles.meterLabel, { color: colors.muted }]}>Dark</Text>
        <Text style={[styles.meterLabel, { color: colors.muted }]}>Bright</Text>
      </View>
      {error ? (
        <Text style={[styles.hint, { color: colors.warning }]}>{error}</Text>
      ) : (
        <Text style={[styles.hint, { color: colors.muted }]}>
          Lux is reported by Android’s light sensor. It changes with the sensor’s placement and the
          light around it.
        </Text>
      )}
    </Card>
  );
}

export function AccelerometerTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { reading, error, loading } = useSensorTest('accelerometer');
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const values = reading?.values ?? [];
  const target = bubbleOffset(values, 78);

  useEffect(() => {
    if (!loading && error) onUnavailable(error);
    else if (!loading && !error) onUnavailable(null);
  }, [error, loading, onUnavailable]);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(x);
      cancelAnimation(y);
      x.value = target.x;
      y.value = target.y;
      return;
    }
    x.value = withSpring(target.x, { damping: 18, stiffness: 150, mass: 0.7 });
    y.value = withSpring(target.y, { damping: 18, stiffness: 150, mass: 0.7 });
  }, [reduced, target.x, target.y, x, y]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Card style={styles.card}>
      <View style={[styles.arena, { borderColor: colors.border }]}>
        <View style={[styles.arenaRing, { borderColor: withAlpha(colors.accent, 0.2) }]} />
        <View style={[styles.arenaCross, styles.arenaCrossV, { backgroundColor: colors.border }]} />
        <View style={[styles.arenaCross, styles.arenaCrossH, { backgroundColor: colors.border }]} />
        <Animated.View style={[styles.bubbleWrap, bubbleStyle]}>
          <LinearGradient
            colors={[withAlpha(colors.accent, 0.95), withAlpha(colors.primary, 0.95)]}
            style={styles.bubble}
          >
            <View style={styles.bubbleShine} />
          </LinearGradient>
        </Animated.View>
      </View>
      <View style={styles.axisRow}>
        {[
          ['X', values[0]],
          ['Y', values[1]],
          ['Z', values[2]],
        ].map(([axis, value]) => (
          <View key={axis as string} style={[styles.axis, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.axisLabel, { color: colors.muted }]}>{axis}</Text>
            <Text style={[styles.axisValue, { color: colors.text }]}>
              {typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        {loading
          ? 'Starting the accelerometer…'
          : 'Tilt slowly in each direction. Values are in m/s².'}
      </Text>
      {error ? <Text style={[styles.hint, { color: colors.warning }]}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  sensorStage: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sensorHalo: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sensorCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigState: {
    ...typography.display,
    fontSize: 30,
    lineHeight: 36,
  },
  stateHint: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 270,
    lineHeight: 18,
  },
  seenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    lineHeight: 18,
  },
  lightStage: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sunHalo: {
    width: 134,
    height: 134,
    borderRadius: 67,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luxValue: {
    ...typography.title,
  },
  meterTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterLabel: {
    ...typography.caption,
  },
  arena: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arenaRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
  },
  arenaCross: {
    position: 'absolute',
  },
  arenaCrossV: {
    width: StyleSheet.hairlineWidth,
    top: 12,
    bottom: 12,
  },
  arenaCrossH: {
    height: StyleSheet.hairlineWidth,
    left: 12,
    right: 12,
  },
  bubbleWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bubble: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden',
  },
  bubbleShine: {
    position: 'absolute',
    left: 15,
    top: 10,
    width: 22,
    height: 13,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '-24deg' }],
  },
  axisRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  axis: {
    flex: 1,
    borderRadius: radius.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  axisLabel: {
    ...typography.caption,
  },
  axisValue: {
    ...typography.mono,
  },
});
