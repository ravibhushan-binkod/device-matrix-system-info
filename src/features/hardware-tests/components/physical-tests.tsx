import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotionPreference } from '@/design-system/animations/use-motion-preference';

import { Button, Card } from '@/design-system/components';
import { withAlpha } from '@/design-system/color';
import { Icon } from '@/design-system/icon';
import { useTheme } from '@/design-system/theme';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useTorchTest } from '@/features/hardware-tests/hooks/use-torch-test';
import { useVibrationTest } from '@/features/hardware-tests/hooks/use-vibration-test';

type Props = { onUnavailable: (reason: string | null) => void };

export function TorchTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { available, on, notice, turnOn, turnOff } = useTorchTest();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    if (available === false) {
      onUnavailable(notice ?? 'This device does not report a flashlight.');
      return;
    }
    onUnavailable(null);
  }, [available, notice, onUnavailable]);

  useEffect(() => {
    if (!on) {
      cancelAnimation(pulse);
      pulse.value = 0.25;
      return;
    }
    if (reduced) {
      pulse.value = 0.6;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1_100 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [on, pulse, reduced]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.32,
    transform: [{ scale: 0.9 + pulse.value * 0.22 }],
  }));

  return (
    <Card style={styles.card}>
      <View style={styles.torchStage}>
        <Animated.View
          style={[styles.glow, { backgroundColor: withAlpha(colors.warning, 0.5) }, glowStyle]}
        />
        <LinearGradient
          colors={
            on
              ? [withAlpha(colors.warning, 0.9), withAlpha(colors.critical, 0.7)]
              : [colors.surface2, colors.surface]
          }
          style={[styles.torchLens, { borderColor: colors.border }]}
        >
          <Icon name="flashlight" size={60} color={on ? '#FFFFFF' : colors.muted} />
        </LinearGradient>
      </View>

      <View style={styles.stateRow}>
        <View
          style={[
            styles.statePill,
            { backgroundColor: on ? withAlpha(colors.good, 0.14) : colors.surface2 },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: on ? colors.good : colors.muted }]} />
          <Text style={[styles.stateText, { color: on ? colors.good : colors.muted }]}>
            {on ? 'Flashlight on' : 'Flashlight off'}
          </Text>
        </View>
        <Button
          title={on ? 'Turn off' : 'Turn on'}
          variant="secondary"
          icon="flashlight"
          onPress={on ? turnOff : turnOn}
          disabled={available === false}
          style={styles.toggle}
        />
      </View>

      {notice ? (
        <Text style={[styles.notice, { color: colors.warning }]}>{notice}</Text>
      ) : (
        <Text style={[styles.note, { color: colors.muted }]}>
          The light turns off automatically when you leave this screen.
        </Text>
      )}
    </Card>
  );
}

export function VibrationTest({ onUnavailable }: Props) {
  const { colors } = useTheme();
  const { hasVibrator, error, playing, run } = useVibrationTest();
  const { animate } = useMotionPreference();
  const reduced = !animate;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (hasVibrator === false) {
      onUnavailable(error ?? 'This device does not report a vibration motor.');
      return;
    }
    onUnavailable(null);
  }, [error, hasVibrator, onUnavailable]);

  useEffect(() => {
    if (!playing || reduced) {
      cancelAnimation(pulse);
      pulse.value = 0.4;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 420 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [playing, pulse, reduced]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.4,
    transform: [{ scale: 0.82 + pulse.value * 0.3 }],
  }));

  return (
    <Card style={styles.card}>
      <View style={styles.vibrationStage}>
        <Animated.View
          style={[styles.vibrationRing, { borderColor: withAlpha(colors.violet, 0.6) }, ringStyle]}
        />
        <View style={[styles.vibrationInner, { backgroundColor: withAlpha(colors.violet, 0.16) }]}>
          <Icon name="vibrate" size={48} color={colors.violet} />
        </View>
      </View>
      <Button
        title={playing ? 'Vibrating…' : 'Play vibration'}
        icon="vibrate"
        onPress={run}
        disabled={hasVibrator === false}
      />
      {error ? (
        <Text style={[styles.notice, { color: colors.warning }]}>{error}</Text>
      ) : (
        <Text style={[styles.note, { color: colors.muted }]}>
          The pattern stops automatically. A case can make a good motor feel weak.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  torchStage: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  torchLens: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.chip,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
  },
  toggle: {
    flex: 1,
  },
  note: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  notice: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  vibrationStage: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibrationRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  vibrationInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
